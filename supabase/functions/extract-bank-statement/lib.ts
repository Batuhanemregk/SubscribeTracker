// Pure, dependency-free helpers for the extract-bank-statement edge function.
// Kept separate from index.ts so they can be unit-tested with `deno test` without
// touching the network or the OpenAI API.

export const MIN_CONFIDENCE = 0.6;

export type Cycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type CycleHint = Cycle | 'unknown';
export type DocumentType = 'bank_statement' | 'card_statement' | 'other';

/** A single charge row as returned by the model (one line per charge, NOT grouped). */
export interface ChargeRow {
  name: string;
  merchantName: string;
  amount: number;
  currency: string;
  chargeDate: string; // YYYY-MM-DD
  cycleHint: CycleHint;
  isLikelySubscription: boolean;
  confidence: number; // 0..1
}

/** One subscription after server-side grouping/dedup. This is the client contract. */
export interface GroupedSubscription {
  name: string;
  merchantName: string;
  amount: number;
  currency: string;
  cycle: Cycle;
  confidence: number;
  occurrenceCount: number;
  chargedDates: string[];
  lastChargeDate: string;
  cycleInferred: boolean;
}

const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const CURRENCY_SYMBOLS: Record<string, string> = {
  '₺': 'TRY',
  'tl': 'TRY',
  '$': 'USD',
  'us$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '₹': 'INR',
  '¥': 'JPY',
};

// ─── Small numeric / string helpers ───────────────────────

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Most frequent value, tie-broken by first appearance. */
export function mostCommon<T>(values: T[]): T | undefined {
  if (values.length === 0) return undefined;
  const counts = new Map<T, number>();
  let best = values[0];
  let bestCount = 0;
  for (const v of values) {
    const c = (counts.get(v) ?? 0) + 1;
    counts.set(v, c);
    if (c > bestCount) {
      bestCount = c;
      best = v;
    }
  }
  return best;
}

/**
 * Normalize a service/merchant name for grouping.
 * "NETFLIX.COM" → "netflix", "GOOGLE*YOUTUBE" → "googleyoutube".
 */
export function normalizeName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/\.(com|net|org|io|co|app|tv|inc|ltd)\b/gi, '')
    .replace(/[^a-z0-9]/g, '');
}

export function normalizeCurrency(input: unknown): string {
  if (typeof input !== 'string') return 'USD';
  const raw = input.trim();
  if (!raw) return 'USD';
  const symbol = CURRENCY_SYMBOLS[raw.toLowerCase()];
  if (symbol) return symbol;
  const upper = raw.toUpperCase();
  if (/^[A-Z]{3}$/.test(upper)) return upper;
  // Strip non-letters and retry (e.g. "TRY " or "$TRY")
  const letters = upper.replace(/[^A-Z]/g, '');
  if (/^[A-Z]{3}$/.test(letters)) return letters;
  return CURRENCY_SYMBOLS[raw] ?? upper;
}

export function normalizeCycleHint(input: unknown): CycleHint {
  const v = typeof input === 'string' ? input.toLowerCase().trim() : '';
  if (v === 'weekly' || v === 'monthly' || v === 'quarterly' || v === 'yearly') return v;
  return 'unknown';
}

// ─── Date validation ──────────────────────────────────────

/**
 * True only for a real calendar date in YYYY-MM-DD form, not in the future,
 * and not older than `maxAgeMonths` (default 24). `now` is injectable for tests.
 */
export function isValidIsoDate(value: unknown, now: Date = new Date(), maxAgeMonths = 24): boolean {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const t = Date.parse(value + 'T00:00:00Z');
  if (Number.isNaN(t)) return false;
  // Reject impossible dates like 2026-13-40 by round-tripping.
  if (new Date(t).toISOString().slice(0, 10) !== value) return false;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (t > today) return false;
  const cutoff = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - maxAgeMonths, now.getUTCDate());
  if (t < cutoff) return false;
  return true;
}

// ─── Row validation + confidence gating ───────────────────

/** Validate + clean a raw model charge. Returns null if the row should be dropped. */
export function validateRow(raw: unknown, now: Date = new Date()): ChargeRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const name = typeof r.name === 'string' ? r.name.trim() : '';
  const merchantName = typeof r.merchantName === 'string' ? r.merchantName.trim() : '';
  if (!name && !merchantName) return null;

  const amount = Number(r.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  if (!isValidIsoDate(r.chargeDate, now)) return null;

  const confidence = Number(r.confidence);
  if (!Number.isFinite(confidence)) return null;

  return {
    name: name || merchantName,
    merchantName: merchantName || name,
    amount: round2(amount),
    currency: normalizeCurrency(r.currency),
    chargeDate: r.chargeDate as string,
    cycleHint: normalizeCycleHint(r.cycleHint),
    isLikelySubscription: r.isLikelySubscription === true,
    confidence: clamp01(confidence),
  };
}

/**
 * Server-side confidence gate. Keep a row only when the model both flags it as a
 * likely subscription AND is at least MIN_CONFIDENCE sure. This is the gate that
 * fixes "reads too much" — it used to be a loose client-only >= 0.60 filter.
 */
export function passesConfidenceGate(row: ChargeRow): boolean {
  return row.isLikelySubscription && row.confidence >= MIN_CONFIDENCE;
}

// ─── Cadence inference ────────────────────────────────────

function gapToCycle(days: number): Cycle | null {
  if (days >= 5 && days <= 10) return 'weekly';
  if (days >= 24 && days <= 38) return 'monthly';
  if (days >= 80 && days <= 100) return 'quarterly';
  if (days >= 330 && days <= 400) return 'yearly';
  return null;
}

/**
 * Infer billing cycle from the gaps between charge dates. Falls back to the
 * model's cycleHint, then to monthly (with cycleInferred=false so the client can
 * ask the user to verify).
 */
export function inferCycle(sortedDates: string[], cycleHint: CycleHint): { cycle: Cycle; cycleInferred: boolean } {
  if (sortedDates.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < sortedDates.length; i++) {
      const a = Date.parse(sortedDates[i - 1] + 'T00:00:00Z');
      const b = Date.parse(sortedDates[i] + 'T00:00:00Z');
      if (!Number.isNaN(a) && !Number.isNaN(b)) gaps.push(Math.abs(b - a) / DAY_MS);
    }
    if (gaps.length > 0) {
      const cycle = gapToCycle(median(gaps));
      if (cycle) return { cycle, cycleInferred: true };
    }
  }
  if (cycleHint !== 'unknown') return { cycle: cycleHint, cycleInferred: false };
  return { cycle: 'monthly', cycleInferred: false };
}

// ─── Grouping / dedup ─────────────────────────────────────

function groupKey(row: ChargeRow): string {
  // Currency is part of the key so the same service in two currencies (e.g. a
  // forex/travel charge) never merges into one nonsensical median amount.
  const name = normalizeName(row.name) || normalizeName(row.merchantName);
  if (!name) return '';
  return `${name}|${row.currency}`;
}

/** Pick the most representative display name for a group (most common, tie → longest). */
function pickDisplayName(group: ChargeRow[]): string {
  const names = group.map((r) => r.name).filter(Boolean);
  const common = mostCommon(names);
  if (common) return common;
  return group.map((r) => r.merchantName).find(Boolean) ?? group[0].name;
}

/**
 * Group validated, gated charge rows into one entry per service.
 * Recurrence raises confidence gently (+0.03 per extra occurrence, capped +0.12).
 */
export function groupCharges(rows: ChargeRow[]): GroupedSubscription[] {
  const groups = new Map<string, ChargeRow[]>();
  for (const row of rows) {
    const key = groupKey(row);
    if (!key) continue;
    const arr = groups.get(key);
    if (arr) arr.push(row);
    else groups.set(key, [row]);
  }

  const out: GroupedSubscription[] = [];
  for (const group of groups.values()) {
    const dates = Array.from(new Set(group.map((r) => r.chargeDate))).sort();
    const amounts = group.map((r) => r.amount);
    const hint = mostCommon(group.map((r) => r.cycleHint)) ?? 'unknown';
    const { cycle, cycleInferred } = inferCycle(dates, hint);
    const baseConfidence = Math.max(...group.map((r) => r.confidence));
    const bump = Math.min(0.12, Math.max(0, group.length - 1) * 0.03);

    out.push({
      name: pickDisplayName(group),
      merchantName: mostCommon(group.map((r) => r.merchantName)) ?? group[0].merchantName,
      amount: round2(median(amounts)),
      currency: mostCommon(group.map((r) => r.currency)) ?? group[0].currency,
      cycle,
      confidence: clamp01(baseConfidence + bump),
      occurrenceCount: dates.length,
      chargedDates: dates,
      lastChargeDate: dates[dates.length - 1],
      cycleInferred,
    });
  }

  out.sort((a, b) => b.confidence - a.confidence || b.occurrenceCount - a.occurrenceCount);
  return out;
}

/** Run the full server-side pipeline: validate → gate → group. */
export function processCharges(rawCharges: unknown, now: Date = new Date()): GroupedSubscription[] {
  const rows = (Array.isArray(rawCharges) ? rawCharges : [])
    .map((c) => validateRow(c, now))
    .filter((r): r is ChargeRow => r !== null)
    .filter(passesConfidenceGate);
  return groupCharges(rows);
}

// ─── HTTP retry ───────────────────────────────────────────

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

function backoffDelay(base: number, attemptIndex: number): number {
  // 500, 1500, 4500ms ... plus a small deterministic jitter.
  return base * Math.pow(3, attemptIndex) + (((attemptIndex + 1) * 137) % 250);
}

/**
 * Call `fn` (which performs one fetch) and retry on 429 / 5xx AND on thrown
 * network errors (DNS, reset, TLS, timeout) with exponential backoff (honoring
 * Retry-After). Returns the final Response (ok or not); throws only if every
 * attempt threw. `sleep` is injectable so tests don't actually wait.
 */
export async function withRetry(fn: () => Promise<Response>, opts: RetryOptions = {}): Promise<Response> {
  const attempts = opts.attempts ?? 3;
  const base = opts.baseDelayMs ?? 500;
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));

  let lastError: unknown = null;
  for (let i = 0; i < attempts; i++) {
    let res: Response;
    try {
      res = await fn();
    } catch (err) {
      // Network-level failure — retryable until we run out of attempts.
      lastError = err;
      if (i === attempts - 1) throw err;
      await sleep(backoffDelay(base, i));
      continue;
    }

    if (res.ok) return res;
    const retryable = res.status === 429 || (res.status >= 500 && res.status <= 504);
    if (!retryable || i === attempts - 1) return res;

    let delay = backoffDelay(base, i);
    const retryAfter = res.headers.get('retry-after');
    if (retryAfter) {
      const secs = Number(retryAfter);
      if (Number.isFinite(secs)) delay = Math.max(delay, secs * 1000);
    }
    await sleep(delay);
  }
  // Unreachable in practice (the loop returns or throws), but satisfies types.
  throw lastError ?? new Error('withRetry: no attempts made');
}

// ─── Responses API parsing ────────────────────────────────

/**
 * Extract the text output from a raw OpenAI Responses API JSON body.
 * Handles both the `output_text` convenience field and walking the `output[]`
 * array (reasoning models interleave reasoning items we must skip).
 */
export function extractOutputText(json: any): string {
  if (typeof json?.output_text === 'string' && json.output_text.length > 0) return json.output_text;
  const output = Array.isArray(json?.output) ? json.output : [];
  const parts: string[] = [];
  for (const item of output) {
    if (item?.type === 'message' && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c?.type === 'output_text' && typeof c.text === 'string') parts.push(c.text);
      }
    }
  }
  return parts.join('');
}

/**
 * Extract a model refusal, if any. Structured Outputs can still refuse, in
 * which case the message content has a `refusal` item instead of `output_text`.
 * Returns '' when there is no refusal.
 */
export function extractRefusal(json: any): string {
  const output = Array.isArray(json?.output) ? json.output : [];
  const parts: string[] = [];
  for (const item of output) {
    if (item?.type === 'message' && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c?.type === 'refusal' && typeof c.refusal === 'string') parts.push(c.refusal);
      }
    }
  }
  return parts.join(' ');
}
