import {
  toMonthlyAmount,
  toYearlyAmount,
  calculateMonthlyTotal,
  calculateYearlyTotal,
  getSpendingByCategory,
  getUpcomingPayments,
  advanceToNextBillingDate,
  getDaysUntilBilling,
  getSubscriptionBillingDatesInMonth,
  getSubscriptionsForDay,
  getMonthSubscriptionMap,
  calculatePotentialSavings,
  getBillingCycleBreakdown,
  getBudgetStatus,
  calculateValueScore,
  getValueLabel,
  getValueColor,
  getWastefulSubscriptions,
  getAlternativeSuggestions,
  formatCurrency,
} from '../calculations';
import type { Subscription } from '../../types';

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
// toMonthlyAmount
// =============================================================================
describe('toMonthlyAmount', () => {
  it('should return amount for monthly cycle', () => {
    expect(toMonthlyAmount(10, 'monthly')).toBe(10);
  });

  it('should convert weekly to monthly (x4.33)', () => {
    expect(toMonthlyAmount(10, 'weekly')).toBeCloseTo(43.3, 1);
  });

  it('should convert yearly to monthly (/12)', () => {
    expect(toMonthlyAmount(120, 'yearly')).toBe(10);
  });

  it('should convert quarterly to monthly (/3)', () => {
    expect(toMonthlyAmount(30, 'quarterly')).toBe(10);
  });

  it('should handle custom cycle with customDays', () => {
    // 10 * (30.44 / 15) = ~20.29
    const result = toMonthlyAmount(10, 'custom', 15);
    expect(result).toBeCloseTo(10 * (30.44 / 15), 2);
  });

  it('should default custom cycle to 30 days when customDays is undefined', () => {
    // 10 * (30.44 / 30) = ~10.15
    const result = toMonthlyAmount(10, 'custom');
    expect(result).toBeCloseTo(10 * (30.44 / 30), 2);
  });

  it('should handle zero amount', () => {
    expect(toMonthlyAmount(0, 'monthly')).toBe(0);
    expect(toMonthlyAmount(0, 'yearly')).toBe(0);
  });
});

// =============================================================================
// toYearlyAmount
// =============================================================================
describe('toYearlyAmount', () => {
  it('should return amount for yearly cycle', () => {
    expect(toYearlyAmount(99, 'yearly')).toBe(99);
  });

  it('should convert monthly to yearly (x12)', () => {
    expect(toYearlyAmount(10, 'monthly')).toBe(120);
  });

  it('should convert weekly to yearly (x52)', () => {
    expect(toYearlyAmount(10, 'weekly')).toBe(520);
  });

  it('should convert quarterly to yearly (x4)', () => {
    expect(toYearlyAmount(25, 'quarterly')).toBe(100);
  });

  it('should handle custom cycle with customDays', () => {
    // 10 * (365.25 / 60) = ~60.875
    const result = toYearlyAmount(10, 'custom', 60);
    expect(result).toBeCloseTo(10 * (365.25 / 60), 2);
  });

  it('should default custom cycle to 365 days when customDays is undefined', () => {
    // 10 * (365.25 / 365) = ~10.0068
    const result = toYearlyAmount(10, 'custom');
    expect(result).toBeCloseTo(10 * (365.25 / 365), 2);
  });

  it('should handle zero amount', () => {
    expect(toYearlyAmount(0, 'monthly')).toBe(0);
  });
});

// =============================================================================
// calculateMonthlyTotal
// =============================================================================
describe('calculateMonthlyTotal', () => {
  it('should sum monthly equivalents of active subscriptions', () => {
    const subs = [
      makeSub({ amount: 10, cycle: 'monthly', status: 'active' }),
      makeSub({ amount: 120, cycle: 'yearly', status: 'active' }), // 10/mo
    ];
    expect(calculateMonthlyTotal(subs)).toBeCloseTo(20, 1);
  });

  it('should exclude non-active subscriptions', () => {
    const subs = [
      makeSub({ amount: 10, cycle: 'monthly', status: 'active' }),
      makeSub({ amount: 50, cycle: 'monthly', status: 'paused' }),
      makeSub({ amount: 30, cycle: 'monthly', status: 'cancelled' }),
    ];
    expect(calculateMonthlyTotal(subs)).toBe(10);
  });

  it('should return 0 for empty list', () => {
    expect(calculateMonthlyTotal([])).toBe(0);
  });
});

// =============================================================================
// calculateYearlyTotal
// =============================================================================
describe('calculateYearlyTotal', () => {
  it('should sum yearly equivalents of active subscriptions', () => {
    const subs = [
      makeSub({ amount: 10, cycle: 'monthly', status: 'active' }), // 120/yr
      makeSub({ amount: 99, cycle: 'yearly', status: 'active' }),   // 99/yr
    ];
    expect(calculateYearlyTotal(subs)).toBeCloseTo(219, 1);
  });

  it('should exclude non-active subscriptions', () => {
    const subs = [
      makeSub({ amount: 10, cycle: 'monthly', status: 'active' }),
      makeSub({ amount: 50, cycle: 'monthly', status: 'paused' }),
    ];
    expect(calculateYearlyTotal(subs)).toBe(120);
  });
});

// =============================================================================
// getSpendingByCategory
// =============================================================================
describe('getSpendingByCategory', () => {
  it('should group active subscriptions by category', () => {
    const subs = [
      makeSub({ amount: 15, cycle: 'monthly', category: 'Entertainment', status: 'active' }),
      makeSub({ amount: 10, cycle: 'monthly', category: 'Music', status: 'active' }),
      makeSub({ amount: 5, cycle: 'monthly', category: 'Entertainment', status: 'active' }),
    ];

    const result = getSpendingByCategory(subs);
    expect(result).toHaveLength(2);

    const entertainment = result.find(c => c.name === 'Entertainment');
    expect(entertainment?.amount).toBe(20);

    const music = result.find(c => c.name === 'Music');
    expect(music?.amount).toBe(10);
  });

  it('should calculate percentages', () => {
    const subs = [
      makeSub({ amount: 75, cycle: 'monthly', category: 'A', status: 'active' }),
      makeSub({ amount: 25, cycle: 'monthly', category: 'B', status: 'active' }),
    ];

    const result = getSpendingByCategory(subs);
    const catA = result.find(c => c.name === 'A');
    expect(catA?.percentage).toBe(75);
  });

  it('should sort by amount descending', () => {
    const subs = [
      makeSub({ amount: 5, cycle: 'monthly', category: 'Small', status: 'active' }),
      makeSub({ amount: 50, cycle: 'monthly', category: 'Big', status: 'active' }),
    ];

    const result = getSpendingByCategory(subs);
    expect(result[0].name).toBe('Big');
    expect(result[1].name).toBe('Small');
  });

  it('should exclude non-active subscriptions', () => {
    const subs = [
      makeSub({ amount: 10, cycle: 'monthly', category: 'A', status: 'active' }),
      makeSub({ amount: 99, cycle: 'monthly', category: 'B', status: 'paused' }),
    ];

    const result = getSpendingByCategory(subs);
    expect(result).toHaveLength(1);
  });

  it('should return empty array for no active subs', () => {
    expect(getSpendingByCategory([])).toEqual([]);
  });
});

// =============================================================================
// advanceToNextBillingDate
// =============================================================================
describe('advanceToNextBillingDate', () => {
  it('should return future date unchanged', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const result = advanceToNextBillingDate(futureDate.toISOString(), 'monthly');
    expect(result.getTime()).toBeCloseTo(futureDate.getTime(), -3);
  });

  it('should advance past monthly billing date to future', () => {
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 2);
    pastDate.setMilliseconds(pastDate.getMilliseconds() - 1); // ensure strictly in the past
    const before = Date.now();
    const result = advanceToNextBillingDate(pastDate.toISOString(), 'monthly');
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('should advance past weekly billing date by weeks', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 14);
    pastDate.setMilliseconds(pastDate.getMilliseconds() - 1);
    const before = Date.now();
    const result = advanceToNextBillingDate(pastDate.toISOString(), 'weekly');
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('should advance past yearly billing date', () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 2);
    pastDate.setMilliseconds(pastDate.getMilliseconds() - 1);
    const before = Date.now();
    const result = advanceToNextBillingDate(pastDate.toISOString(), 'yearly');
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('should advance past quarterly billing date', () => {
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 6);
    pastDate.setMilliseconds(pastDate.getMilliseconds() - 1);
    const before = Date.now();
    const result = advanceToNextBillingDate(pastDate.toISOString(), 'quarterly');
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('should advance custom cycle', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 60);
    pastDate.setMilliseconds(pastDate.getMilliseconds() - 1);
    const before = Date.now();
    const result = advanceToNextBillingDate(pastDate.toISOString(), 'custom', 15);
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
  });
});

// =============================================================================
// getDaysUntilBilling
// =============================================================================
describe('getDaysUntilBilling', () => {
  it('should return positive days for future date', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const result = getDaysUntilBilling(futureDate.toISOString());
    expect(result).toBe(10);
  });

  it('should return negative days for past date without cycle', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const result = getDaysUntilBilling(pastDate.toISOString());
    expect(result).toBe(-5);
  });

  it('should auto-advance past date when cycle is provided', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);
    const result = getDaysUntilBilling(pastDate.toISOString(), 'monthly');
    expect(result).toBeGreaterThan(0);
  });
});

// =============================================================================
// getSubscriptionBillingDatesInMonth
// =============================================================================
describe('getSubscriptionBillingDatesInMonth', () => {
  it('should return billing date for a monthly sub in the correct month', () => {
    const sub = makeSub({
      nextBillingDate: '2026-06-15',
      cycle: 'monthly',
      status: 'active',
    });

    const dates = getSubscriptionBillingDatesInMonth(sub, 2026, 5); // June = month 5
    expect(dates).toHaveLength(1);
    expect(dates[0].getDate()).toBe(15);
  });

  it('should return multiple dates for weekly subs', () => {
    const sub = makeSub({
      nextBillingDate: '2026-06-01',
      cycle: 'weekly',
      status: 'active',
    });

    const dates = getSubscriptionBillingDatesInMonth(sub, 2026, 5); // June
    // June has ~4-5 weeks
    expect(dates.length).toBeGreaterThanOrEqual(4);
  });

  it('should return empty for paused subs', () => {
    const sub = makeSub({
      nextBillingDate: '2026-06-15',
      cycle: 'monthly',
      status: 'paused',
    });

    const dates = getSubscriptionBillingDatesInMonth(sub, 2026, 5);
    expect(dates).toHaveLength(0);
  });

  it('should return 0 or 1 for yearly sub', () => {
    const sub = makeSub({
      nextBillingDate: '2026-06-15',
      cycle: 'yearly',
      status: 'active',
    });

    const datesInJune = getSubscriptionBillingDatesInMonth(sub, 2026, 5);
    expect(datesInJune).toHaveLength(1);

    const datesInJuly = getSubscriptionBillingDatesInMonth(sub, 2026, 6);
    expect(datesInJuly).toHaveLength(0);
  });
});

// =============================================================================
// getSubscriptionsForDay
// =============================================================================
describe('getSubscriptionsForDay', () => {
  it('should return subscriptions billing on that day', () => {
    const subs = [
      makeSub({ name: 'Netflix', nextBillingDate: '2026-06-15', cycle: 'monthly', status: 'active' }),
      makeSub({ name: 'Spotify', nextBillingDate: '2026-06-20', cycle: 'monthly', status: 'active' }),
    ];

    const result = getSubscriptionsForDay(subs, 2026, 5, 15); // June 15
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Netflix');
  });

  it('should return empty for a day with no billing', () => {
    const subs = [
      makeSub({ nextBillingDate: '2026-06-15', cycle: 'monthly', status: 'active' }),
    ];

    const result = getSubscriptionsForDay(subs, 2026, 5, 1);
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// getMonthSubscriptionMap
// =============================================================================
describe('getMonthSubscriptionMap', () => {
  it('should build a map of day to subscriptions', () => {
    const subs = [
      makeSub({ name: 'Netflix', nextBillingDate: '2026-06-15', cycle: 'monthly', status: 'active' }),
      makeSub({ name: 'Spotify', nextBillingDate: '2026-06-15', cycle: 'monthly', status: 'active' }),
      makeSub({ name: 'Hulu', nextBillingDate: '2026-06-20', cycle: 'monthly', status: 'active' }),
    ];

    const map = getMonthSubscriptionMap(subs, 2026, 5); // June
    expect(map.get(15)).toHaveLength(2);
    expect(map.get(20)).toHaveLength(1);
    expect(map.has(1)).toBe(false);
  });

  it('should exclude paused subscriptions', () => {
    const subs = [
      makeSub({ name: 'Paused', nextBillingDate: '2026-06-15', cycle: 'monthly', status: 'paused' }),
    ];

    const map = getMonthSubscriptionMap(subs, 2026, 5);
    expect(map.size).toBe(0);
  });
});

// =============================================================================
// calculatePotentialSavings
// =============================================================================
describe('calculatePotentialSavings', () => {
  it('should calculate 15% savings for monthly subs switching to yearly', () => {
    const subs = [
      makeSub({ amount: 10, cycle: 'monthly', status: 'active' }),
      makeSub({ amount: 20, cycle: 'monthly', status: 'active' }),
    ];

    const result = calculatePotentialSavings(subs);
    // (10 * 12 * 0.15) + (20 * 12 * 0.15) = 18 + 36 = 54
    expect(result.amount).toBe(54);
    expect(result.monthlyCount).toBe(2);
  });

  it('should not count yearly or weekly subs', () => {
    const subs = [
      makeSub({ amount: 10, cycle: 'monthly', status: 'active' }),
      makeSub({ amount: 100, cycle: 'yearly', status: 'active' }),
      makeSub({ amount: 5, cycle: 'weekly', status: 'active' }),
    ];

    const result = calculatePotentialSavings(subs);
    expect(result.amount).toBe(10 * 12 * 0.15);
    expect(result.monthlyCount).toBe(1);
  });

  it('should not count paused subscriptions', () => {
    const subs = [
      makeSub({ amount: 10, cycle: 'monthly', status: 'paused' }),
    ];

    const result = calculatePotentialSavings(subs);
    expect(result.amount).toBe(0);
    expect(result.monthlyCount).toBe(0);
  });
});

// =============================================================================
// getBillingCycleBreakdown
// =============================================================================
describe('getBillingCycleBreakdown', () => {
  it('should group active subscriptions by cycle', () => {
    const subs = [
      makeSub({ amount: 10, cycle: 'monthly', status: 'active' }),
      makeSub({ amount: 15, cycle: 'monthly', status: 'active' }),
      makeSub({ amount: 99, cycle: 'yearly', status: 'active' }),
      makeSub({ amount: 5, cycle: 'weekly', status: 'active' }),
      makeSub({ amount: 50, cycle: 'monthly', status: 'paused' }),
    ];

    const result = getBillingCycleBreakdown(subs);
    expect(result.monthly.count).toBe(2);
    expect(result.monthly.total).toBe(25);
    expect(result.yearly.count).toBe(1);
    expect(result.yearly.total).toBe(99);
    expect(result.weekly.count).toBe(1);
    expect(result.weekly.total).toBe(5);
    expect(result.quarterly.count).toBe(0);
  });
});

// =============================================================================
// getBudgetStatus
// =============================================================================
describe('getBudgetStatus', () => {
  it('should return safe when under 75%', () => {
    const result = getBudgetStatus(50, 100);
    expect(result.status).toBe('safe');
    expect(result.percentage).toBe(50);
    expect(result.remaining).toBe(50);
  });

  it('should return warning when 75-89%', () => {
    const result = getBudgetStatus(80, 100);
    expect(result.status).toBe('warning');
    expect(result.percentage).toBe(80);
    expect(result.remaining).toBe(20);
  });

  it('should return danger when 90%+', () => {
    const result = getBudgetStatus(95, 100);
    expect(result.status).toBe('danger');
    expect(result.percentage).toBe(95);
    expect(result.remaining).toBe(5);
  });

  it('should not return negative remaining', () => {
    const result = getBudgetStatus(150, 100);
    expect(result.remaining).toBe(0);
    expect(result.percentage).toBe(150);
  });

  it('should handle zero limit', () => {
    const result = getBudgetStatus(50, 0);
    expect(result.percentage).toBe(0);
    expect(result.remaining).toBe(0);
    expect(result.status).toBe('safe');
  });
});

// =============================================================================
// calculateValueScore
// =============================================================================
describe('calculateValueScore', () => {
  it('should return 50 for unrated subscription', () => {
    expect(calculateValueScore(undefined, 10)).toBe(50);
  });

  it('should return high score for high usage + low cost', () => {
    const score = calculateValueScore(5, 5, 50);
    // (5/5)*100 - (5/50)*20 = 100 - 2 = 98
    expect(score).toBe(98);
  });

  it('should return low score for low usage + high cost', () => {
    const score = calculateValueScore(1, 50, 50);
    // (1/5)*100 - (50/50)*20 = 20 - 20 = 0
    expect(score).toBe(0);
  });

  it('should clamp score between 0 and 100', () => {
    expect(calculateValueScore(5, 0, 50)).toBeLessThanOrEqual(100);
    expect(calculateValueScore(1, 100, 50)).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// getValueLabel
// =============================================================================
describe('getValueLabel', () => {
  it('should return great for score >= 80', () => {
    expect(getValueLabel(80)).toBe('great');
    expect(getValueLabel(100)).toBe('great');
  });

  it('should return good for score 60-79', () => {
    expect(getValueLabel(60)).toBe('good');
    expect(getValueLabel(79)).toBe('good');
  });

  it('should return fair for score 40-59', () => {
    expect(getValueLabel(40)).toBe('fair');
    expect(getValueLabel(59)).toBe('fair');
  });

  it('should return poor for score 20-39', () => {
    expect(getValueLabel(20)).toBe('poor');
    expect(getValueLabel(39)).toBe('poor');
  });

  it('should return wasteful for score < 20', () => {
    expect(getValueLabel(0)).toBe('wasteful');
    expect(getValueLabel(19)).toBe('wasteful');
  });
});

// =============================================================================
// getValueColor
// =============================================================================
describe('getValueColor', () => {
  it('should return emerald for score >= 80', () => {
    expect(getValueColor(80)).toBe('#10B981');
  });

  it('should return green for score 60-79', () => {
    expect(getValueColor(60)).toBe('#22C55E');
  });

  it('should return amber for score 40-59', () => {
    expect(getValueColor(40)).toBe('#F59E0B');
  });

  it('should return orange for score 20-39', () => {
    expect(getValueColor(20)).toBe('#F97316');
  });

  it('should return red for score < 20', () => {
    expect(getValueColor(0)).toBe('#EF4444');
  });
});

// =============================================================================
// getWastefulSubscriptions
// =============================================================================
describe('getWastefulSubscriptions', () => {
  it('should return rated subs sorted by worst value first', () => {
    const subs = [
      makeSub({ name: 'Good', amount: 5, usageRating: 5, status: 'active' }),
      makeSub({ name: 'Bad', amount: 50, usageRating: 1, status: 'active' }),
    ];

    const result = getWastefulSubscriptions(subs, 'USD');
    expect(result[0].name).toBe('Bad');
    expect(result[1].name).toBe('Good');
  });

  it('should exclude unrated subscriptions', () => {
    const subs = [
      makeSub({ name: 'Rated', amount: 10, usageRating: 3, status: 'active' }),
      makeSub({ name: 'Unrated', amount: 10, status: 'active' }),
    ];

    const result = getWastefulSubscriptions(subs, 'USD');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Rated');
  });

  it('should exclude paused subscriptions', () => {
    const subs = [
      makeSub({ name: 'Paused', amount: 10, usageRating: 1, status: 'paused' }),
    ];

    const result = getWastefulSubscriptions(subs, 'USD');
    expect(result).toHaveLength(0);
  });

  it('should return empty array when no rated subs', () => {
    const subs = [makeSub({ status: 'active' })];
    expect(getWastefulSubscriptions(subs, 'USD')).toEqual([]);
  });
});

// =============================================================================
// getAlternativeSuggestions
// =============================================================================
describe('getAlternativeSuggestions', () => {
  const knownServices = [
    {
      name: 'Netflix',
      alternatives: [
        { name: 'Hulu', price: 7.99, currency: 'USD', cycle: 'monthly', note: 'Basic plan' },
        { name: 'Amazon Prime', price: 14.99, currency: 'USD', cycle: 'monthly', note: 'More expensive' },
      ],
    },
    {
      name: 'Spotify',
      alternatives: [
        { name: 'YouTube Music', price: 4.99, currency: 'USD', cycle: 'monthly', note: 'Cheaper tier' },
      ],
    },
  ];

  it('should suggest cheaper alternatives', () => {
    const subs = [
      makeSub({ name: 'Netflix', amount: 15.99, cycle: 'monthly', status: 'active' }),
    ];

    const result = getAlternativeSuggestions(subs, knownServices);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].alternativeName).toBe('Hulu');
    expect(result[0].savings).toBeCloseTo(15.99 - 7.99, 2);
  });

  it('should not suggest more expensive alternatives', () => {
    const subs = [
      makeSub({ name: 'Netflix', amount: 5, cycle: 'monthly', status: 'active' }),
    ];

    const result = getAlternativeSuggestions(subs, knownServices);
    // All alternatives are more expensive than $5, so none should be suggested
    expect(result).toHaveLength(0);
  });

  it('should skip inactive subscriptions', () => {
    const subs = [
      makeSub({ name: 'Netflix', amount: 15.99, cycle: 'monthly', status: 'paused' }),
    ];

    const result = getAlternativeSuggestions(subs, knownServices);
    expect(result).toHaveLength(0);
  });

  it('should sort by highest savings first', () => {
    const subs = [
      makeSub({ name: 'Netflix', amount: 15.99, cycle: 'monthly', status: 'active' }),
      makeSub({ name: 'Spotify', amount: 9.99, cycle: 'monthly', status: 'active' }),
    ];

    const result = getAlternativeSuggestions(subs, knownServices);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].savings).toBeGreaterThanOrEqual(result[i].savings);
    }
  });

  it('should return empty for unmatched subscriptions', () => {
    const subs = [
      makeSub({ name: 'UnknownService', amount: 10, cycle: 'monthly', status: 'active' }),
    ];

    const result = getAlternativeSuggestions(subs, knownServices);
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// formatCurrency (calculations.ts version)
// =============================================================================
describe('formatCurrency (calculations.ts)', () => {
  it('should format USD', () => {
    expect(formatCurrency(10.5, 'USD')).toBe('$10.50');
  });

  it('should format EUR', () => {
    expect(formatCurrency(10, 'EUR')).toBe('€10.00');
  });

  it('should format GBP', () => {
    expect(formatCurrency(5.99, 'GBP')).toBe('£5.99');
  });

  it('should format TRY', () => {
    expect(formatCurrency(100, 'TRY')).toBe('₺100.00');
  });

  it('should use currency code when symbol unknown', () => {
    expect(formatCurrency(10, 'CHF')).toBe('CHF10.00');
  });

  it('should default to USD when currency not specified', () => {
    expect(formatCurrency(10)).toBe('$10.00');
  });
});
