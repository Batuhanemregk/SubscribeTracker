// Deno unit tests for the extract-bank-statement pure helpers.
// Run: deno test supabase/functions/extract-bank-statement/
// No network / OpenAI calls — only the server-side validation/gating/grouping logic.

import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  processCharges,
  validateRow,
  isValidIsoDate,
  inferCycle,
  normalizeName,
  normalizeCurrency,
  withRetry,
  extractOutputText,
  extractRefusal,
  type GroupedSubscription,
} from "../lib.ts";

interface Fixture {
  description: string;
  now: string;
  input: { documentType: string; monthsCovered: number; charges: unknown[] };
  expected: any;
}

async function loadFixture(name: string): Promise<Fixture> {
  const url = new URL(`./fixtures/${name}.json`, import.meta.url);
  return JSON.parse(await Deno.readTextFile(url));
}

function byName(subs: GroupedSubscription[]): Record<string, GroupedSubscription> {
  return Object.fromEntries(subs.map((s) => [s.name, s]));
}

Deno.test("fixture: multi-month Netflix groups to 1 entry and does NOT merge with Notion", async () => {
  const f = await loadFixture("multi-month-netflix");
  const subs = processCharges(f.input.charges, new Date(f.now + "T00:00:00Z"));
  assertEquals(subs.length, f.expected.count);
  const map = byName(subs);
  assert(map["Netflix"], "Netflix should be present");
  assert(map["Notion"], "Notion should be present (not merged into Netflix)");
  assertEquals(map["Netflix"].occurrenceCount, 3);
  assertEquals(map["Netflix"].cycle, "monthly");
  assertEquals(map["Netflix"].cycleInferred, true);
  assertEquals(map["Netflix"].amount, 149.99);
  assertEquals(map["Notion"].occurrenceCount, 1);
});

Deno.test("fixture: mixed currencies are preserved and never merged", async () => {
  const f = await loadFixture("mixed-currency");
  const subs = processCharges(f.input.charges, new Date(f.now + "T00:00:00Z"));
  assertEquals(subs.length, f.expected.count);
  const map = byName(subs);
  for (const [name, currency] of Object.entries(f.expected.currenciesByName)) {
    assertEquals(map[name]?.currency, currency);
  }
});

Deno.test("fixture: one-time purchase (isLikelySubscription=false) is gated out", async () => {
  const f = await loadFixture("one-time-purchase");
  const subs = processCharges(f.input.charges, new Date(f.now + "T00:00:00Z"));
  assertEquals(subs.length, 0);
});

Deno.test("fixture: below-threshold confidence is dropped", async () => {
  const f = await loadFixture("low-confidence");
  const subs = processCharges(f.input.charges, new Date(f.now + "T00:00:00Z"));
  assertEquals(subs.length, 0);
});

Deno.test("fixture: cadence inferred as quarterly from ~90-day gaps", async () => {
  const f = await loadFixture("cadence-quarterly");
  const subs = processCharges(f.input.charges, new Date(f.now + "T00:00:00Z"));
  assertEquals(subs.length, 1);
  assertEquals(subs[0].cycle, "quarterly");
  assertEquals(subs[0].cycleInferred, true);
  assertEquals(subs[0].occurrenceCount, 3);
});

Deno.test("fixture: invalid rows are dropped without crashing", async () => {
  const f = await loadFixture("bad-rows");
  const subs = processCharges(f.input.charges, new Date(f.now + "T00:00:00Z"));
  assertEquals(subs.length, 1);
  assertEquals(subs[0].name, "YouTube Premium");
});

Deno.test("processCharges handles empty / non-array input", () => {
  assertEquals(processCharges([]).length, 0);
  assertEquals(processCharges(undefined).length, 0);
  assertEquals(processCharges(null).length, 0);
});

Deno.test("isValidIsoDate rejects future, too-old, and impossible dates", () => {
  const now = new Date("2026-06-08T00:00:00Z");
  assert(isValidIsoDate("2026-05-01", now));
  assert(!isValidIsoDate("2030-01-01", now), "future rejected");
  assert(!isValidIsoDate("2026-13-40", now), "impossible rejected");
  assert(!isValidIsoDate("2020-01-01", now), "too old rejected");
  assert(!isValidIsoDate("not-a-date", now));
  assert(!isValidIsoDate("2026/05/01", now), "wrong format rejected");
});

Deno.test("validateRow drops zero/negative amounts and empty names", () => {
  const now = new Date("2026-06-08T00:00:00Z");
  assertEquals(
    validateRow({ name: "X", merchantName: "X", amount: 0, currency: "TRY", chargeDate: "2026-05-01", cycleHint: "monthly", isLikelySubscription: true, confidence: 0.9 }, now),
    null,
  );
  assertEquals(
    validateRow({ name: "", merchantName: "", amount: 10, currency: "TRY", chargeDate: "2026-05-01", cycleHint: "monthly", isLikelySubscription: true, confidence: 0.9 }, now),
    null,
  );
  const ok = validateRow({ name: "Spotify", merchantName: "SPOTIFY AB", amount: 59.99, currency: "try", chargeDate: "2026-05-01", cycleHint: "weird", isLikelySubscription: true, confidence: 1.4 }, now);
  assert(ok);
  assertEquals(ok!.currency, "TRY");
  assertEquals(ok!.cycleHint, "unknown");
  assertEquals(ok!.confidence, 1); // clamped
});

Deno.test("normalizeName strips TLDs and symbols", () => {
  assertEquals(normalizeName("NETFLIX.COM"), "netflix");
  assertEquals(normalizeName("GOOGLE*YOUTUBEPREMIUM"), "googleyoutubepremium");
  assertEquals(normalizeName("Spotify AB"), "spotifyab");
});

Deno.test("normalizeCurrency maps symbols and codes", () => {
  assertEquals(normalizeCurrency("₺"), "TRY");
  assertEquals(normalizeCurrency("$"), "USD");
  assertEquals(normalizeCurrency("eur"), "EUR");
  assertEquals(normalizeCurrency("TRY"), "TRY");
});

Deno.test("inferCycle falls back to hint then monthly", () => {
  assertEquals(inferCycle([], "yearly"), { cycle: "yearly", cycleInferred: false });
  assertEquals(inferCycle(["2026-05-01"], "unknown"), { cycle: "monthly", cycleInferred: false });
  const monthly = inferCycle(["2026-03-15", "2026-04-15", "2026-05-15"], "unknown");
  assertEquals(monthly, { cycle: "monthly", cycleInferred: true });
});

Deno.test("withRetry retries on 429 then succeeds, without real sleeping", async () => {
  let calls = 0;
  const sleeps: number[] = [];
  const res = await withRetry(
    () => {
      calls++;
      const status = calls < 3 ? 429 : 200;
      return Promise.resolve(new Response("{}", { status }));
    },
    { sleep: (ms) => { sleeps.push(ms); return Promise.resolve(); } },
  );
  assertEquals(res.status, 200);
  assertEquals(calls, 3);
  assertEquals(sleeps.length, 2);
});

Deno.test("withRetry gives up after attempts on persistent 503", async () => {
  let calls = 0;
  const res = await withRetry(
    () => { calls++; return Promise.resolve(new Response("busy", { status: 503 })); },
    { attempts: 3, sleep: () => Promise.resolve() },
  );
  assertEquals(res.status, 503);
  assertEquals(calls, 3);
});

Deno.test("withRetry does not retry on 400", async () => {
  let calls = 0;
  const res = await withRetry(
    () => { calls++; return Promise.resolve(new Response("bad", { status: 400 })); },
    { sleep: () => Promise.resolve() },
  );
  assertEquals(res.status, 400);
  assertEquals(calls, 1);
});

Deno.test("withRetry retries on a THROWN network error then succeeds", async () => {
  let calls = 0;
  const sleeps: number[] = [];
  const res = await withRetry(
    () => {
      calls++;
      if (calls < 3) return Promise.reject(new Error("network down"));
      return Promise.resolve(new Response("{}", { status: 200 }));
    },
    { sleep: (ms) => { sleeps.push(ms); return Promise.resolve(); } },
  );
  assertEquals(res.status, 200);
  assertEquals(calls, 3);
  assertEquals(sleeps.length, 2);
});

Deno.test("withRetry rethrows after all attempts throw", async () => {
  let calls = 0;
  let threw = false;
  try {
    await withRetry(
      () => { calls++; return Promise.reject(new Error("network down")); },
      { attempts: 3, sleep: () => Promise.resolve() },
    );
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message, "network down");
  }
  assert(threw, "should have rethrown");
  assertEquals(calls, 3);
});

Deno.test("same service in two currencies does NOT merge", () => {
  const now = new Date("2026-06-08T00:00:00Z");
  const rows = [
    { name: "Spotify", merchantName: "SPOTIFY AB", amount: 5.99, currency: "EUR", chargeDate: "2026-05-10", cycleHint: "monthly", isLikelySubscription: true, confidence: 0.92 },
    { name: "Spotify", merchantName: "SPOTIFY AB", amount: 59.99, currency: "TRY", chargeDate: "2026-05-10", cycleHint: "monthly", isLikelySubscription: true, confidence: 0.92 },
  ];
  const subs = processCharges(rows, now);
  assertEquals(subs.length, 2);
  const eur = subs.find((s) => s.currency === "EUR");
  const tryy = subs.find((s) => s.currency === "TRY");
  assert(eur && eur.amount === 5.99, "EUR amount preserved");
  assert(tryy && tryy.amount === 59.99, "TRY amount preserved");
});

Deno.test("extractRefusal reads a refusal content item", () => {
  assertEquals(extractRefusal({ output_text: "{}" }), "");
  const refusal = extractRefusal({
    output: [
      { type: "message", content: [{ type: "refusal", refusal: "I can't help with that." }] },
    ],
  });
  assertEquals(refusal, "I can't help with that.");
  assertEquals(
    extractRefusal({ output: [{ type: "message", content: [{ type: "output_text", text: "{}" }] }] }),
    "",
  );
});

Deno.test("extractOutputText reads output_text and walks output[]", () => {
  assertEquals(extractOutputText({ output_text: "hello" }), "hello");
  const walked = extractOutputText({
    output: [
      { type: "reasoning", summary: [] },
      { type: "message", content: [{ type: "output_text", text: "{\"a\":1}" }] },
    ],
  });
  assertEquals(walked, "{\"a\":1}");
  assertEquals(extractOutputText({ output: [] }), "");
});
