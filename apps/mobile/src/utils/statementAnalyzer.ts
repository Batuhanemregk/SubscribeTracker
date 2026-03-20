/**
 * Statement Analyzer - Post-processing for bank statement extractions
 * 
 * Handles:
 * - Multi-month deduplication (Netflix x3 → 1 entry)
 * - New subscription detection (single charge in latest month)
 * - Existing subscription guard (already tracked → auto-deselect)
 */
import type { ExtractedSubscription } from '../services/BankStatementService';

export type SubscriptionStatus = 'recurring' | 'new' | 'tracked';

export interface AnalyzedSubscription extends ExtractedSubscription {
  status: SubscriptionStatus;
  statusLabel: string;
  occurrences: number;
  autoSelected: boolean;
}

interface ExistingSub {
  name: string;
  amount: number;
}

/**
 * Normalize a merchant name for comparison
 * "NETFLIX.COM" → "netflix"
 * "Spotify AB" → "spotify"
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.(com|net|org|io|co|app|tv)$/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Check if two amounts are similar (within 5% tolerance)
 */
function isSimilarAmount(a: number, b: number): boolean {
  if (a === 0 && b === 0) return true;
  const diff = Math.abs(a - b);
  const avg = (a + b) / 2;
  return diff / avg <= 0.05;
}

/**
 * Deduplicate multi-month recurring charges.
 * Groups by normalized service name (case-insensitive, trimmed).
 * For duplicates: keeps the entry with highest confidence, preserves latest date.
 * Each service appears only once in the output.
 */
function deduplicateRecurring(subs: ExtractedSubscription[]): ExtractedSubscription[] {
  const groups = new Map<string, ExtractedSubscription[]>();

  for (const sub of subs) {
    const key = normalizeName(sub.merchantName || sub.name);
    // Also try normalizing the clean name for matching
    const altKey = normalizeName(sub.name);

    // Check if this sub matches an existing group by name
    let matchedKey: string | null = null;
    if (groups.has(key)) {
      matchedKey = key;
    } else if (key !== altKey && groups.has(altKey)) {
      matchedKey = altKey;
    } else {
      // Check for partial name matches (one contains the other)
      for (const [groupKey] of groups) {
        if (groupKey.length >= 4 && key.length >= 4) {
          if (groupKey.includes(key) || key.includes(groupKey)) {
            matchedKey = groupKey;
            break;
          }
        }
        if (groupKey.length >= 4 && altKey.length >= 4) {
          if (groupKey.includes(altKey) || altKey.includes(groupKey)) {
            matchedKey = groupKey;
            break;
          }
        }
      }
    }

    if (matchedKey) {
      groups.get(matchedKey)!.push(sub);
    } else {
      groups.set(key, [sub]);
    }
  }

  // Consolidate each group into one entry
  const deduplicated: ExtractedSubscription[] = [];

  for (const group of groups.values()) {
    if (group.length === 1) {
      deduplicated.push(group[0]);
      continue;
    }

    // Sort by confidence descending, then by date descending
    const sorted = group.sort((a, b) => {
      // Primary: highest confidence
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      // Secondary: latest date
      const dateA = a.lastChargeDate ? new Date(a.lastChargeDate).getTime() : 0;
      const dateB = b.lastChargeDate ? new Date(b.lastChargeDate).getTime() : 0;
      return dateB - dateA;
    });

    const best = sorted[0];
    const allDates = group
      .map((s) => s.lastChargeDate)
      .filter(Boolean) as string[];

    // Use the latest date across all occurrences
    const latestDate = allDates.length > 0
      ? allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : best.lastChargeDate;

    // Boost confidence for recurring charges
    const boostedConfidence = Math.min(1, best.confidence + (group.length * 0.05));

    deduplicated.push({
      ...best,
      lastChargeDate: latestDate,
      occurrenceCount: group.length,
      chargedDates: allDates,
      isRecurring: true,
      potentialNew: false,
      confidence: boostedConfidence,
    });
  }

  return deduplicated;
}

/**
 * Detect new subscriptions (single occurrence in latest month)
 */
function detectNewSubscriptions(subs: ExtractedSubscription[]): ExtractedSubscription[] {
  return subs.map((sub) => {
    if (
      !sub.isRecurring &&
      (sub.occurrenceCount === undefined || sub.occurrenceCount <= 1)
    ) {
      return { ...sub, potentialNew: true };
    }
    return sub;
  });
}

/**
 * Full analysis pipeline
 * 
 * @param extracted - Raw extractions from GPT
 * @param existingSubscriptions - User's current subscriptions for duplicate guard
 */
export function analyzeStatement(
  extracted: ExtractedSubscription[],
  existingSubscriptions: ExistingSub[]
): AnalyzedSubscription[] {
  // Step 1: Deduplicate recurring charges
  let processed = deduplicateRecurring(extracted);
  
  // Step 2: Detect new subscriptions
  processed = detectNewSubscriptions(processed);

  // Step 3: Map to AnalyzedSubscription with status
  const normalizedExisting = existingSubscriptions.map((s) => ({
    name: normalizeName(s.name),
    amount: s.amount,
  }));

  return processed.map((sub) => {
    const normalizedMerchant = normalizeName(sub.merchantName || sub.name);
    const normalizedClean = normalizeName(sub.name);

    // Check against existing subscriptions with improved matching
    const isTracked = normalizedExisting.some(
      (existing) => {
        // Exact name match
        if (existing.name === normalizedMerchant || existing.name === normalizedClean) return true;
        // Bidirectional includes (either contains the other)
        if (existing.name.length >= 4 && normalizedMerchant.length >= 4) {
          if (existing.name.includes(normalizedMerchant) || normalizedMerchant.includes(existing.name)) return true;
        }
        if (existing.name.length >= 4 && normalizedClean.length >= 4) {
          if (existing.name.includes(normalizedClean) || normalizedClean.includes(existing.name)) return true;
        }
        // Fuzzy: similar amount + partial name overlap (first 3 chars)
        if (isSimilarAmount(existing.amount, sub.amount) && 
            existing.name.substring(0, 3) === normalizedClean.substring(0, 3)) return true;
        return false;
      }
    );

    if (isTracked) {
      return {
        ...sub,
        status: 'tracked' as const,
        statusLabel: 'Already tracked',
        occurrences: sub.occurrenceCount || 1,
        autoSelected: false, // Don't auto-select tracked items
      };
    }

    if (sub.isRecurring && (sub.occurrenceCount || 1) >= 2) {
      return {
        ...sub,
        status: 'recurring' as const,
        statusLabel: `Seen ${sub.occurrenceCount} times`,
        occurrences: sub.occurrenceCount || 1,
        autoSelected: true,
      };
    }

    if (sub.potentialNew) {
      return {
        ...sub,
        status: 'new' as const,
        statusLabel: 'New subscription',
        occurrences: 1,
        autoSelected: true,
      };
    }

    // Default: single occurrence, not identified as new
    return {
      ...sub,
      status: 'recurring' as const,
      statusLabel: '',
      occurrences: sub.occurrenceCount || 1,
      autoSelected: true,
    };
  });
}
