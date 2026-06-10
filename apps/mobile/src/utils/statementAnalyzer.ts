/**
 * Statement Analyzer — post-processing for bank-statement extractions.
 *
 * The Edge Function already deduplicates, confidence-gates and groups charges,
 * so this module is intentionally small: for each grouped subscription it decides
 * (1) whether the user already tracks it, and (2) whether it should be
 * pre-selected for adding. It is pure (no i18n / state) so it stays unit-testable.
 */
import type { ExtractedSubscription } from '../services/BankStatementService';

export type SubscriptionStatus = 'recurring' | 'new' | 'tracked';

export interface AnalyzedSubscription extends ExtractedSubscription {
  status: SubscriptionStatus;
  occurrences: number;
  autoSelected: boolean;
  /** true when the billing cycle could not be confirmed and the user should check it. */
  verifyCycle: boolean;
}

export interface ExistingSub {
  name: string;
  amount: number;
}

/**
 * Normalize a service/merchant name for comparison.
 * "NETFLIX.COM" → "netflix", "GOOGLE*YOUTUBE" → "googleyoutube".
 * Mirrors the server-side normalizer so client and server group the same way.
 */
function normalizeName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/\.(com|net|org|io|co|app|tv|inc|ltd)\b/gi, '')
    .replace(/[^a-z0-9]/g, '');
}

/** One string contains the other and the shorter one is at least `minShorter` chars. */
function oneContainsOther(a: string, b: string, minShorter: number): boolean {
  if (!a || !b) return false;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return shorter.length >= minShorter && longer.includes(shorter);
}

function amountsClose(a: number, b: number, tolerance: number): boolean {
  if (a <= 0 || b <= 0) return a === b;
  const avg = (a + b) / 2;
  return Math.abs(a - b) / avg <= tolerance;
}

/**
 * Decide whether an extracted subscription matches one the user already tracks.
 * Deliberately strict to avoid false "already tracked" collisions (e.g. Netflix
 * vs Notion): exact normalized name, OR containment where the shorter name is
 * >= 5 chars, OR a 6-char prefix match combined with a near-identical amount.
 */
function matchesExisting(
  sub: ExtractedSubscription,
  existingNormalizedName: string,
  existingAmount: number
): boolean {
  const subName = normalizeName(sub.name);
  const subMerchant = normalizeName(sub.merchantName || sub.name);

  if (existingNormalizedName === subName || existingNormalizedName === subMerchant) return true;
  if (oneContainsOther(existingNormalizedName, subName, 5)) return true;
  if (oneContainsOther(existingNormalizedName, subMerchant, 5)) return true;
  if (
    subName.length >= 6 &&
    existingNormalizedName.length >= 6 &&
    subName.slice(0, 6) === existingNormalizedName.slice(0, 6) &&
    amountsClose(existingAmount, sub.amount, 0.02)
  ) {
    return true;
  }
  return false;
}

/**
 * Assign a status + auto-selection to each grouped subscription.
 *
 * @param extracted - grouped subscriptions from the Edge Function
 * @param existingSubscriptions - the user's current subscriptions (duplicate guard)
 */
export function analyzeStatement(
  extracted: ExtractedSubscription[],
  existingSubscriptions: ExistingSub[]
): AnalyzedSubscription[] {
  const normalizedExisting = existingSubscriptions.map((s) => ({
    name: normalizeName(s.name),
    amount: s.amount,
  }));

  return extracted.map((sub) => {
    const occurrences = sub.occurrenceCount && sub.occurrenceCount > 0 ? sub.occurrenceCount : 1;
    const verifyCycle = sub.cycleInferred === false;
    const isTracked = normalizedExisting.some((ex) => matchesExisting(sub, ex.name, ex.amount));

    if (isTracked) {
      // Already tracked → never auto-select (avoid duplicate adds).
      return { ...sub, status: 'tracked', occurrences, autoSelected: false, verifyCycle };
    }
    if (occurrences >= 2) {
      // Seen multiple times → strong recurring signal, pre-select it.
      return { ...sub, status: 'recurring', occurrences, autoSelected: true, verifyCycle };
    }
    // Single occurrence → could be a one-off; require explicit user opt-in.
    return { ...sub, status: 'new', occurrences, autoSelected: false, verifyCycle };
  });
}
