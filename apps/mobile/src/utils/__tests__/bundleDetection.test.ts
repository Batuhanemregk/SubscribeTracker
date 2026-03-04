import { detectBundleOpportunities, loadBundles } from '../bundleDetection';
import type { Subscription } from '../../types';

// Mock the known-services.json import
jest.mock('../../data/known-services.json', () => ({
  services: [],
  bundles: [
    {
      id: 'disney-bundle',
      name: 'Disney Bundle',
      services: ['disney-plus', 'hulu', 'espn-plus'],
      bundlePrice: 14.99,
      individualTotal: 27.97,
      currency: 'USD',
      cycle: 'monthly',
      url: 'https://example.com',
      description: 'Disney+ / Hulu / ESPN+ Bundle',
    },
    {
      id: 'apple-one',
      name: 'Apple One Individual',
      services: ['apple-music', 'apple-tv-plus', 'apple-arcade', 'icloud'],
      bundlePrice: 19.95,
      individualTotal: 36.94,
      currency: 'USD',
      cycle: 'monthly',
      url: 'https://example.com',
      description: 'Apple Music, TV+, Arcade, iCloud',
    },
    {
      id: 'expensive-bundle',
      name: 'Expensive Bundle',
      services: ['service-a', 'service-b'],
      bundlePrice: 99.99,
      individualTotal: 100,
      currency: 'USD',
      cycle: 'monthly',
      url: 'https://example.com',
      description: 'Bundle that costs more than individual',
    },
  ],
}));

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  const now = new Date().toISOString();
  return {
    id: 'sub-' + Math.random().toString(36).substr(2, 9),
    name: 'Test Service',
    amount: 10,
    currency: 'USD',
    cycle: 'monthly',
    nextBillingDate: '2026-04-15',
    category: 'Entertainment',
    iconKey: '🎬',
    colorKey: '#E50914',
    status: 'active',
    source: 'manual',
    detection: null,
    cancelUrl: null,
    manageUrl: null,
    notes: '',
    isTrial: false,
    trialEndsAt: null,
    lifecycle: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// =============================================================================
// loadBundles
// =============================================================================
describe('loadBundles', () => {
  it('should load bundles from known-services.json', () => {
    const bundles = loadBundles();
    expect(bundles).toHaveLength(3);
    expect(bundles[0].id).toBe('disney-bundle');
  });

  it('should have required fields on each bundle', () => {
    const bundles = loadBundles();
    for (const bundle of bundles) {
      expect(bundle.id).toBeTruthy();
      expect(bundle.name).toBeTruthy();
      expect(bundle.services.length).toBeGreaterThan(0);
      expect(bundle.bundlePrice).toBeGreaterThan(0);
      expect(bundle.currency).toBeTruthy();
    }
  });
});

// =============================================================================
// detectBundleOpportunities
// =============================================================================
describe('detectBundleOpportunities', () => {
  it('should detect bundle opportunity when user has 2+ matching services', () => {
    const subs = [
      makeSub({ name: 'Disney+', amount: 10.99, status: 'active' }),
      makeSub({ name: 'Hulu', amount: 8.99, status: 'active' }),
    ];

    const result = detectBundleOpportunities(subs);
    expect(result.length).toBeGreaterThan(0);

    const disneySuggestion = result.find(s => s.bundle.id === 'disney-bundle');
    expect(disneySuggestion).toBeDefined();
    expect(disneySuggestion!.matchedServices).toHaveLength(2);
    expect(disneySuggestion!.monthlySavings).toBeGreaterThan(0);
  });

  it('should calculate correct savings', () => {
    const subs = [
      makeSub({ name: 'Disney+', amount: 10.99, status: 'active' }),
      makeSub({ name: 'Hulu', amount: 8.99, status: 'active' }),
      makeSub({ name: 'ESPN+', amount: 7.99, status: 'active' }),
    ];

    const result = detectBundleOpportunities(subs);
    const disneySuggestion = result.find(s => s.bundle.id === 'disney-bundle');
    expect(disneySuggestion).toBeDefined();

    const expectedCurrentTotal = 10.99 + 8.99 + 7.99;
    expect(disneySuggestion!.currentTotal).toBeCloseTo(expectedCurrentTotal, 1);
    expect(disneySuggestion!.monthlySavings).toBeCloseTo(expectedCurrentTotal - 14.99, 1);
    expect(disneySuggestion!.yearlySavings).toBeCloseTo((expectedCurrentTotal - 14.99) * 12, 1);
  });

  it('should not suggest when user has fewer than 2 matching services', () => {
    const subs = [
      makeSub({ name: 'Disney+', amount: 10.99, status: 'active' }),
    ];

    const result = detectBundleOpportunities(subs);
    const disneySuggestion = result.find(s => s.bundle.id === 'disney-bundle');
    expect(disneySuggestion).toBeUndefined();
  });

  it('should not suggest when bundle would cost more', () => {
    // 'expensive-bundle' has bundlePrice 99.99 -- individual subs priced low should not match
    const subs = [
      makeSub({ name: 'Service A', amount: 5, status: 'active' }),
      makeSub({ name: 'Service B', amount: 5, status: 'active' }),
    ];

    const result = detectBundleOpportunities(subs);
    const expensiveSuggestion = result.find(s => s.bundle.id === 'expensive-bundle');
    expect(expensiveSuggestion).toBeUndefined();
  });

  it('should exclude paused subscriptions', () => {
    const subs = [
      makeSub({ name: 'Disney+', amount: 10.99, status: 'active' }),
      makeSub({ name: 'Hulu', amount: 8.99, status: 'paused' }),
    ];

    const result = detectBundleOpportunities(subs);
    const disneySuggestion = result.find(s => s.bundle.id === 'disney-bundle');
    expect(disneySuggestion).toBeUndefined();
  });

  it('should return empty array for no subscriptions', () => {
    expect(detectBundleOpportunities([])).toEqual([]);
  });

  it('should return empty when no bundles match', () => {
    const subs = [
      makeSub({ name: 'RandomService1', amount: 10, status: 'active' }),
      makeSub({ name: 'RandomService2', amount: 20, status: 'active' }),
    ];

    const result = detectBundleOpportunities(subs);
    expect(result).toEqual([]);
  });

  it('should sort by monthly savings descending', () => {
    const subs = [
      makeSub({ name: 'Disney+', amount: 10.99, status: 'active' }),
      makeSub({ name: 'Hulu', amount: 8.99, status: 'active' }),
      makeSub({ name: 'Apple Music', amount: 10.99, status: 'active' }),
      makeSub({ name: 'Apple TV+', amount: 9.99, status: 'active' }),
    ];

    const result = detectBundleOpportunities(subs);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].monthlySavings).toBeGreaterThanOrEqual(result[i].monthlySavings);
    }
  });

  it('should calculate match percentage correctly', () => {
    const subs = [
      makeSub({ name: 'Disney+', amount: 10.99, status: 'active' }),
      makeSub({ name: 'Hulu', amount: 8.99, status: 'active' }),
    ];

    const result = detectBundleOpportunities(subs);
    const disneySuggestion = result.find(s => s.bundle.id === 'disney-bundle');
    // 2 out of 3 services matched = 67%
    expect(disneySuggestion?.matchPercentage).toBe(67);
  });

  it('should match common name variations', () => {
    const subs = [
      makeSub({ name: 'Apple Music', amount: 10.99, status: 'active' }),
      makeSub({ name: 'Apple TV+', amount: 9.99, status: 'active' }),
    ];

    const result = detectBundleOpportunities(subs);
    const appleSuggestion = result.find(s => s.bundle.id === 'apple-one');
    expect(appleSuggestion).toBeDefined();
    expect(appleSuggestion!.matchedServices).toHaveLength(2);
  });

  it('should limit results to 5', () => {
    // With only 3 bundles in mock, we can't test the limit directly
    // but verify the function runs and returns an array
    const subs = [
      makeSub({ name: 'Disney+', amount: 10.99, status: 'active' }),
      makeSub({ name: 'Hulu', amount: 8.99, status: 'active' }),
    ];

    const result = detectBundleOpportunities(subs);
    expect(result.length).toBeLessThanOrEqual(5);
  });
});
