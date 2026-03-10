import { analyzeStatement, type AnalyzedSubscription } from '../statementAnalyzer';
import type { ExtractedSubscription } from '../../services/BankStatementService';

function makeExtracted(overrides: Partial<ExtractedSubscription> = {}): ExtractedSubscription {
  return {
    name: 'Test Service',
    amount: 9.99,
    currency: 'USD',
    cycle: 'monthly',
    confidence: 0.85,
    merchantName: undefined,
    lastChargeDate: '2026-02-15',
    occurrenceCount: 1,
    chargedDates: [],
    isRecurring: false,
    potentialNew: false,
    ...overrides,
  };
}

// =============================================================================
// Deduplication
// =============================================================================
describe('analyzeStatement - deduplication', () => {
  it('should deduplicate same service appearing 3 times to 1 entry', () => {
    const extracted = [
      makeExtracted({ name: 'Netflix', merchantName: 'NETFLIX.COM', confidence: 0.80 }),
      makeExtracted({ name: 'Netflix', merchantName: 'NETFLIX.COM', confidence: 0.85 }),
      makeExtracted({ name: 'Netflix', merchantName: 'NETFLIX.COM', confidence: 0.90 }),
    ];

    const result = analyzeStatement(extracted, []);
    const netflixEntries = result.filter(r => r.name === 'Netflix');
    expect(netflixEntries).toHaveLength(1);
  });

  it('should keep the entry with highest confidence after dedup', () => {
    const extracted = [
      makeExtracted({ name: 'Netflix', confidence: 0.70 }),
      makeExtracted({ name: 'Netflix', confidence: 0.95 }),
      makeExtracted({ name: 'Netflix', confidence: 0.80 }),
    ];

    const result = analyzeStatement(extracted, []);
    expect(result[0].confidence).toBeGreaterThanOrEqual(0.95);
  });

  it('should keep distinct services separate', () => {
    const extracted = [
      makeExtracted({ name: 'Netflix', merchantName: 'NETFLIX.COM' }),
      makeExtracted({ name: 'Spotify', merchantName: 'SPOTIFY.COM' }),
    ];

    const result = analyzeStatement(extracted, []);
    expect(result).toHaveLength(2);
  });
});

// =============================================================================
// Confidence boost
// =============================================================================
describe('analyzeStatement - confidence boost', () => {
  it('should boost confidence for recurring charges', () => {
    const extracted = [
      makeExtracted({ name: 'Netflix', confidence: 0.80 }),
      makeExtracted({ name: 'Netflix', confidence: 0.80 }),
      makeExtracted({ name: 'Netflix', confidence: 0.80 }),
    ];

    const result = analyzeStatement(extracted, []);
    expect(result[0].confidence).toBeGreaterThan(0.80);
  });

  it('should cap confidence at 1.0', () => {
    const extracted = Array(10).fill(null).map(() =>
      makeExtracted({ name: 'Netflix', confidence: 0.98 })
    );

    const result = analyzeStatement(extracted, []);
    expect(result[0].confidence).toBeLessThanOrEqual(1.0);
  });
});

// =============================================================================
// Normalization
// =============================================================================
describe('analyzeStatement - normalization', () => {
  it('should treat "NETFLIX.COM" and "Netflix" as the same', () => {
    const extracted = [
      makeExtracted({ name: 'Netflix', merchantName: 'NETFLIX.COM' }),
      makeExtracted({ name: 'Netflix', merchantName: 'netflix.com' }),
    ];

    const result = analyzeStatement(extracted, []);
    expect(result).toHaveLength(1);
  });
});

// =============================================================================
// Existing subscription guard
// =============================================================================
describe('analyzeStatement - existing subscription guard', () => {
  it('should mark tracked subscriptions with status "tracked"', () => {
    const extracted = [
      makeExtracted({ name: 'Netflix', amount: 15.99 }),
    ];
    const existing = [{ name: 'Netflix', amount: 15.99 }];

    const result = analyzeStatement(extracted, existing);
    expect(result[0].status).toBe('tracked');
  });

  it('should set autoSelected to false for tracked subscriptions', () => {
    const extracted = [
      makeExtracted({ name: 'Netflix', amount: 15.99 }),
    ];
    const existing = [{ name: 'Netflix', amount: 15.99 }];

    const result = analyzeStatement(extracted, existing);
    expect(result[0].autoSelected).toBe(false);
  });
});

// =============================================================================
// New subscription detection
// =============================================================================
describe('analyzeStatement - new subscription detection', () => {
  it('should detect single occurrence as new', () => {
    const extracted = [
      makeExtracted({ name: 'NewService', occurrenceCount: 1, isRecurring: false }),
    ];

    const result = analyzeStatement(extracted, []);
    expect(result[0].status).toBe('new');
  });

  it('should auto-select new subscriptions', () => {
    const extracted = [
      makeExtracted({ name: 'NewService', occurrenceCount: 1, isRecurring: false }),
    ];

    const result = analyzeStatement(extracted, []);
    expect(result[0].autoSelected).toBe(true);
  });
});

// =============================================================================
// Recurring status
// =============================================================================
describe('analyzeStatement - recurring status', () => {
  it('should mark services with 2+ occurrences as recurring', () => {
    const extracted = [
      makeExtracted({ name: 'Netflix', confidence: 0.85 }),
      makeExtracted({ name: 'Netflix', confidence: 0.85 }),
    ];

    const result = analyzeStatement(extracted, []);
    expect(result[0].status).toBe('recurring');
  });

  it('should set occurrences count correctly', () => {
    const extracted = [
      makeExtracted({ name: 'Netflix' }),
      makeExtracted({ name: 'Netflix' }),
      makeExtracted({ name: 'Netflix' }),
    ];

    const result = analyzeStatement(extracted, []);
    expect(result[0].occurrences).toBe(3);
  });
});

// =============================================================================
// Empty input
// =============================================================================
describe('analyzeStatement - empty input', () => {
  it('should return empty array for empty input', () => {
    const result = analyzeStatement([], []);
    expect(result).toEqual([]);
  });
});

// =============================================================================
// Status labels
// =============================================================================
describe('analyzeStatement - status labels', () => {
  it('should have "Already tracked" label for tracked items', () => {
    const extracted = [makeExtracted({ name: 'Netflix', amount: 9.99 })];
    const existing = [{ name: 'Netflix', amount: 9.99 }];

    const result = analyzeStatement(extracted, existing);
    expect(result[0].statusLabel).toBe('Already tracked');
  });

  it('should have "Seen X times" label for recurring items', () => {
    const extracted = [
      makeExtracted({ name: 'Spotify' }),
      makeExtracted({ name: 'Spotify' }),
      makeExtracted({ name: 'Spotify' }),
    ];

    const result = analyzeStatement(extracted, []);
    expect(result[0].statusLabel).toContain('Seen');
    expect(result[0].statusLabel).toContain('3');
  });

  it('should have "New subscription" label for new items', () => {
    const extracted = [
      makeExtracted({ name: 'BrandNewApp', occurrenceCount: 1, isRecurring: false }),
    ];

    const result = analyzeStatement(extracted, []);
    expect(result[0].statusLabel).toBe('New subscription');
  });
});

// =============================================================================
// Mixed scenario
// =============================================================================
describe('analyzeStatement - mixed scenario', () => {
  it('should correctly categorize a mix of tracked, recurring, and new', () => {
    const extracted = [
      // Tracked (exists in user's list)
      makeExtracted({ name: 'Netflix', amount: 15.99 }),
      // Recurring (2 occurrences, not tracked)
      makeExtracted({ name: 'Spotify', amount: 9.99 }),
      makeExtracted({ name: 'Spotify', amount: 9.99 }),
      // New (single occurrence)
      makeExtracted({ name: 'NewApp', amount: 4.99, occurrenceCount: 1, isRecurring: false }),
    ];
    const existing = [{ name: 'Netflix', amount: 15.99 }];

    const result = analyzeStatement(extracted, existing);

    const netflix = result.find(r => r.name === 'Netflix');
    const spotify = result.find(r => r.name === 'Spotify');
    const newApp = result.find(r => r.name === 'NewApp');

    expect(netflix?.status).toBe('tracked');
    expect(netflix?.autoSelected).toBe(false);

    expect(spotify?.status).toBe('recurring');
    expect(spotify?.autoSelected).toBe(true);

    expect(newApp?.status).toBe('new');
    expect(newApp?.autoSelected).toBe(true);
  });
});
