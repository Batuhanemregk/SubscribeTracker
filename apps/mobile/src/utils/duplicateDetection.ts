/**
 * Duplicate Detection Utility
 * Finds potential duplicate subscriptions based on name similarity.
 */
import type { Subscription } from '../types';

export interface DuplicateMatch {
  subscription: Subscription;
  matchScore: number; // 0-100
  matchType: 'exact' | 'similar' | 'partial';
}

/**
 * Normalize a string for comparison:
 * - Lowercase
 * - Remove special characters and extra spaces
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Score a single existing subscription against the candidate name.
 * Returns null if the score is below the minimum threshold (50).
 */
function scoreMatch(candidateName: string, existing: Subscription): DuplicateMatch | null {
  const candidateLower = candidateName.toLowerCase().trim();
  const existingLower = existing.name.toLowerCase().trim();

  // 1. Case-insensitive exact match → 100
  if (candidateLower === existingLower) {
    return { subscription: existing, matchScore: 100, matchType: 'exact' };
  }

  // 2. Normalized match (remove spaces, special chars) → 90
  const candidateNorm = normalize(candidateName);
  const existingNorm = normalize(existing.name);

  if (candidateNorm === existingNorm && candidateNorm.length > 0) {
    return { subscription: existing, matchScore: 90, matchType: 'exact' };
  }

  // 3. One name contains the other → 70
  if (
    candidateNorm.length >= 3 && existingNorm.length >= 3 &&
    (candidateNorm.includes(existingNorm) || existingNorm.includes(candidateNorm))
  ) {
    return { subscription: existing, matchScore: 70, matchType: 'similar' };
  }

  // 4. First 4+ chars match → 50
  const minPrefixLen = 4;
  if (
    candidateNorm.length >= minPrefixLen &&
    existingNorm.length >= minPrefixLen &&
    candidateNorm.slice(0, minPrefixLen) === existingNorm.slice(0, minPrefixLen)
  ) {
    return { subscription: existing, matchScore: 50, matchType: 'partial' };
  }

  return null;
}

/**
 * Find potential duplicate subscriptions for a given name.
 *
 * @param name - The candidate subscription name to check
 * @param existingSubscriptions - All existing subscriptions to check against
 * @returns Matches with score >= 50, sorted by score descending
 */
export function findDuplicates(name: string, existingSubscriptions: Subscription[]): DuplicateMatch[] {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const matches: DuplicateMatch[] = [];

  for (const sub of existingSubscriptions) {
    const match = scoreMatch(trimmed, sub);
    if (match) {
      matches.push(match);
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}
