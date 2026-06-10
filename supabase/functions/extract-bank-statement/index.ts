// Supabase Edge Function: extract-bank-statement
// Deploy: npx supabase functions deploy extract-bank-statement
// Secrets: supabase secrets set OPENAI_API_KEY=... [OPENAI_VISION_MODEL=gpt-5-mini]
//
// Reads a bank/card statement (PDF or image), extracts recurring subscription
// charges with the OpenAI Responses API using strict Structured Outputs, then
// validates / confidence-gates / groups them SERVER-SIDE. Always responds with a
// { ok: boolean, ... } envelope (HTTP 200) so the client can branch cleanly.
//
// Privacy: the base64 document is forwarded to OpenAI and discarded. Nothing raw
// is persisted; only derived subscription fields + confidence leave this function.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  extractOutputText,
  extractRefusal,
  processCharges,
  withRetry,
  type GroupedSubscription,
} from "./lib.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
// Swap the model with one env var. gpt-5-mini: cheap + accurate + strict outputs.
// gpt-5.4-mini (more accurate) or gpt-4o-2024-08-06 are drop-in alternatives.
const MODEL = Deno.env.get("OPENAI_VISION_MODEL") || "gpt-5-mini";

// Client caps files at 10MB; guard the base64 length defensively (~13MB of bytes).
const MAX_BASE64_LEN = 18_000_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ErrorCode =
  | "BAD_REQUEST"
  | "CONFIG"
  | "NOT_A_STATEMENT"
  | "UNREADABLE"
  | "PARSE"
  | "RATE_LIMITED"
  | "UPSTREAM_BUSY"
  | "UPSTREAM_ERROR";

function ok(body: {
  subscriptions: GroupedSubscription[];
  monthsCovered: number;
  documentType: string;
  tokensUsed: number;
  model: string;
}) {
  return new Response(JSON.stringify({ ok: true, ...body }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// Business failures are returned as HTTP 200 with { ok: false } so supabase-js
// always populates `data` and the client can map errorCode → a localized message.
function fail(errorCode: ErrorCode, error: string) {
  return new Response(JSON.stringify({ ok: false, errorCode, error }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

const SYSTEM_PROMPT =
  `You are a precise financial-statement analyst. The user gives you a bank or credit-card statement (PDF or image). Read every page and every transaction line, then extract ONLY genuine recurring subscription / membership charges.

PRINCIPLES
- Accuracy over recall. Only report a charge when there is real evidence it is a subscription. Do NOT pad the list or guess to be "helpful". A clean, correct list is the goal.
- Return EVERY occurrence of each charge as its OWN row in "charges" (one row per transaction line). Do NOT merge, group, or deduplicate — the server does that from the dates.
- Merchant strings are often cryptic and bilingual (Turkish + English). Map them to the real service using your knowledge. Examples: "GOOGLE*YOUTUBEPREMIUM" → YouTube Premium, "APPLE.COM/BILL" → Apple, "SPOTIFY AB" → Spotify, "NETFLIX.COM" → Netflix, "TRENDYOL", "BLUTV", "EXXEN", "GAIN", "TABII", "AMAZON PRIME". Put the clean service name in "name" and the raw line text in "merchantName" (strip card-mask digits and city tokens from "name", keep them only in "merchantName").

WHAT COUNTS
- Streaming, music, cloud storage, productivity/SaaS, gaming, fitness/health apps, VPNs, news, telecom/utility bills, insurance, and explicit memberships.

WHAT TO EXCLUDE (set isLikelySubscription:false, or omit)
- One-off retail purchases, money transfers (HAVALE / EFT / FAST / wire), ATM withdrawals, refunds and any negative/incoming amounts, salary or other credits, and fees.

CONFIDENCE RUBRIC (the "confidence" field, 0..1)
- 0.90-1.00: merchant clearly maps to a known recurring service AND amount + date are present.
- 0.70-0.89: probable subscription.
- 0.50-0.69: possible — needs user review.
- Below 0.50: set isLikelySubscription:false.

CYCLE
- Set "cycleHint" only when the statement states it or the merchant's standard cadence is unambiguous; otherwise use "unknown" (the server infers cadence from the dates). Never guess a cadence just to fill the field.

If the file is not a bank/card statement (e.g. a random photo or unrelated document), set documentType:"other" and return an empty "charges" array.`;

const USER_PROMPT =
  `Analyze this statement. List every subscription-like charge as its own row in "charges" with its own chargeDate. Do not merge duplicates — the server groups them. Be accurate, not inclusive.`;

// Strict Structured Outputs schema. Every property must be required and
// additionalProperties:false at every level (strict mode requirement).
const EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["documentType", "monthsCovered", "charges"],
  properties: {
    documentType: { type: "string", enum: ["bank_statement", "card_statement", "other"] },
    monthsCovered: { type: "integer" },
    charges: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "merchantName",
          "amount",
          "currency",
          "chargeDate",
          "cycleHint",
          "isLikelySubscription",
          "confidence",
        ],
        properties: {
          name: { type: "string", description: "Clean human-readable service name, e.g. Netflix" },
          merchantName: { type: "string", description: "Raw merchant text from the statement line" },
          amount: { type: "number", description: "Positive charge amount, number only" },
          currency: { type: "string", description: "ISO 4217 code, e.g. TRY, USD, EUR" },
          chargeDate: { type: "string", description: "Date of THIS charge, YYYY-MM-DD" },
          cycleHint: { type: "string", enum: ["weekly", "monthly", "quarterly", "yearly", "unknown"] },
          isLikelySubscription: { type: "boolean" },
          confidence: { type: "number", description: "0..1 per the rubric" },
        },
      },
    },
  },
};

function estimateMonths(subs: GroupedSubscription[]): number {
  const dates = subs.flatMap((s) => s.chargedDates).map((d) => Date.parse(d + "T00:00:00Z")).filter((t) => !Number.isNaN(t));
  if (dates.length < 2) return dates.length === 1 ? 1 : 0;
  const span = Math.max(...dates) - Math.min(...dates);
  return Math.max(1, Math.round(span / (30 * 86_400_000)) + 1);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) return fail("CONFIG", "Analysis service is not configured.");

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return fail("BAD_REQUEST", "Invalid request body.");

    const { fileBase64, mimeType } = body as { fileBase64?: unknown; mimeType?: unknown };
    if (typeof fileBase64 !== "string" || fileBase64.length === 0) {
      return fail("BAD_REQUEST", "No file content provided.");
    }
    if (fileBase64.length > MAX_BASE64_LEN) {
      return fail("BAD_REQUEST", "File is too large to analyze.");
    }

    const isImage = typeof mimeType === "string" && mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf";
    if (!isPdf && !isImage) return fail("BAD_REQUEST", `Unsupported file type: ${String(mimeType)}`);

    console.log(`Processing | type: ${isPdf ? "PDF" : "Image"} | size: ${Math.round(fileBase64.length / 1024)}KB | model: ${MODEL}`);

    const fileContent = isPdf
      ? { type: "input_file", filename: "statement.pdf", file_data: `data:application/pdf;base64,${fileBase64}` }
      : { type: "input_image", image_url: `data:${mimeType};base64,${fileBase64}`, detail: "high" };

    let res: Response;
    try {
      res = await withRetry(() =>
        fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: MODEL,
            instructions: SYSTEM_PROMPT,
            input: [{ role: "user", content: [{ type: "input_text", text: USER_PROMPT }, fileContent] }],
            max_output_tokens: 16000,
            text: {
              format: {
                type: "json_schema",
                name: "subscription_extraction",
                strict: true,
                schema: EXTRACTION_SCHEMA,
              },
            },
          }),
        })
      );
    } catch (netErr: any) {
      // All retries threw (network failure: DNS, reset, TLS, timeout).
      console.error("OpenAI request failed after retries:", netErr?.message);
      return fail("UPSTREAM_BUSY", "The analysis service is unreachable right now. Please try again in a moment.");
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error("OpenAI error:", res.status, errText.slice(0, 500));
      if (res.status === 429 || res.status === 503) {
        return fail("UPSTREAM_BUSY", "The analysis service is busy right now. Please try again in a moment.");
      }
      if (res.status === 401 || res.status === 403) {
        return fail("UPSTREAM_ERROR", "Service authentication error. Please contact support.");
      }
      if (res.status === 413) return fail("BAD_REQUEST", "The file is too large for analysis.");
      return fail("UPSTREAM_ERROR", "Failed to analyze the document. Please try again.");
    }

    const json = await res.json();

    if (json?.status === "incomplete") {
      console.error("Incomplete response:", JSON.stringify(json?.incomplete_details ?? {}));
      return fail("UNREADABLE", "The document was too long or unclear to analyze fully. Try a clearer or shorter file.");
    }

    const refusal = extractRefusal(json);
    if (refusal) {
      console.error("Model refusal:", refusal.slice(0, 300));
      return fail("UNREADABLE", "Could not analyze this document. Please try a different file.");
    }

    const text = extractOutputText(json);
    if (!text) return fail("UNREADABLE", "Could not read the document. Please try a clearer file.");

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("JSON parse failed (first 500):", text.slice(0, 500));
      return fail("PARSE", "The analysis service returned an unexpected result. Please try again.");
    }

    if (parsed?.documentType === "other") {
      return fail("NOT_A_STATEMENT", "This does not look like a bank or card statement.");
    }

    const subscriptions = processCharges(parsed?.charges);
    const monthsCovered = Number.isFinite(parsed?.monthsCovered)
      ? Math.max(0, Math.trunc(parsed.monthsCovered))
      : estimateMonths(subscriptions);
    const tokensUsed = json?.usage?.total_tokens ?? 0;
    const rawCount = Array.isArray(parsed?.charges) ? parsed.charges.length : 0;

    console.log(`Done: ${rawCount} raw → ${subscriptions.length} grouped | months: ${monthsCovered} | model: ${json?.model || MODEL} | tokens: ${tokensUsed}`);

    return ok({
      subscriptions,
      monthsCovered,
      documentType: parsed?.documentType ?? "bank_statement",
      tokensUsed,
      model: json?.model || MODEL,
    });
  } catch (error: any) {
    console.error("Edge function error:", error?.message, error?.stack);
    return fail("UPSTREAM_ERROR", "An unexpected error occurred while analyzing your document. Please try again.");
  }
});
