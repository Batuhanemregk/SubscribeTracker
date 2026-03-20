import type { Subscription } from '../../types';
import {
  toMonthlyAmount,
  toYearlyAmount,
  calculateMonthlyTotal,
  calculateYearlyTotal,
  getSpendingByCategory,
  calculatePotentialSavings,
  getBillingCycleBreakdown,
  getBudgetStatus,
  formatCurrency,
  getDaysUntilBilling,
  advanceToNextBillingDate,
} from '../calculations';

// ---------------------------------------------------------------------------
// Helpers & shared fixtures
// ---------------------------------------------------------------------------

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'test-1',
    name: 'Netflix',
    amount: 15.99,
    currency: 'USD',
    cycle: 'monthly',
    nextBillingDate: '2026-04-15',
    category: 'Entertainment',
    iconKey: '🎬',
    colorKey: '#EC4899',
    status: 'active',
    source: 'manual',
    detection: null,
    cancelUrl: null,
    manageUrl: null,
    notes: '',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// toMonthlyAmount
// ---------------------------------------------------------------------------

describe('toMonthlyAmount', () => {
  it('converts weekly to monthly (x4.33)', () => {
    expect(toMonthlyAmount(10, 'weekly')).toBeCloseTo(43.3, 1);
  });

  it('returns amount unchanged for monthly', () => {
    expect(toMonthlyAmount(15.99, 'monthly')).toBe(15.99);
  });

  it('converts quarterly to monthly (/3)', () => {
    expect(toMonthlyAmount(30, 'quarterly')).toBeCloseTo(10, 2);
  });

  it('converts yearly to monthly (/12)', () => {
    expect(toMonthlyAmount(120, 'yearly')).toBeCloseTo(10, 2);
  });
});

// ---------------------------------------------------------------------------
// toYearlyAmount
// ---------------------------------------------------------------------------

describe('toYearlyAmount', () => {
  it('converts weekly to yearly (x52)', () => {
    expect(toYearlyAmount(10, 'weekly')).toBe(520);
  });

  it('converts monthly to yearly (x12)', () => {
    expect(toYearlyAmount(10, 'monthly')).toBe(120);
  });

  it('converts quarterly to yearly (x4)', () => {
    expect(toYearlyAmount(25, 'quarterly')).toBe(100);
  });

  it('returns amount unchanged for yearly', () => {
    expect(toYearlyAmount(99.99, 'yearly')).toBe(99.99);
  });
});

// ---------------------------------------------------------------------------
// calculateMonthlyTotal
// ---------------------------------------------------------------------------

describe('calculateMonthlyTotal', () => {
  it('sums only active subscriptions converted to monthly', () => {
    const subs: Subscription[] = [
      makeSub({ id: '1', amount: 12, cycle: 'monthly', status: 'active' }),
      makeSub({ id: '2', amount: 120, cycle: 'yearly', status: 'active' }),
      makeSub({ id: '3', amount: 30, cycle: 'monthly', status: 'cancelled' }),
      makeSub({ id: '4', amount: 20, cycle: 'monthly', status: 'paused' }),
    ];

    // 12 (monthly) + 120/12 (yearly->monthly) = 12 + 10 = 22
    expect(calculateMonthlyTotal(subs)).toBeCloseTo(22, 2);
  });

  it('returns 0 for an empty array', () => {
    expect(calculateMonthlyTotal([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateYearlyTotal
// ---------------------------------------------------------------------------

describe('calculateYearlyTotal', () => {
  it('sums only active subscriptions converted to yearly', () => {
    const subs: Subscription[] = [
      makeSub({ id: '1', amount: 10, cycle: 'monthly', status: 'active' }),
      makeSub({ id: '2', amount: 100, cycle: 'yearly', status: 'active' }),
      makeSub({ id: '3', amount: 50, cycle: 'monthly', status: 'paused' }),
    ];

    // 10*12 + 100 = 220
    expect(calculateYearlyTotal(subs)).toBeCloseTo(220, 2);
  });

  it('returns 0 for an empty array', () => {
    expect(calculateYearlyTotal([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getSpendingByCategory
// ---------------------------------------------------------------------------

describe('getSpendingByCategory', () => {
  it('groups active subscriptions by category with correct totals', () => {
    const subs: Subscription[] = [
      makeSub({ id: '1', amount: 15, cycle: 'monthly', category: 'Entertainment' }),
      makeSub({ id: '2', amount: 10, cycle: 'monthly', category: 'Entertainment' }),
      makeSub({ id: '3', amount: 5, cycle: 'monthly', category: 'Productivity' }),
    ];

    const result = getSpendingByCategory(subs);

    expect(result).toHaveLength(2);
    // Sorted descending by amount
    expect(result[0].name).toBe('Entertainment');
    expect(result[0].amount).toBeCloseTo(25, 2);
    expect(result[1].name).toBe('Productivity');
    expect(result[1].amount).toBeCloseTo(5, 2);
  });

  it('calculates percentages that sum to 100', () => {
    const subs: Subscription[] = [
      makeSub({ id: '1', amount: 75, cycle: 'monthly', category: 'A' }),
      makeSub({ id: '2', amount: 25, cycle: 'monthly', category: 'B' }),
    ];

    const result = getSpendingByCategory(subs);
    const totalPct = result.reduce((sum, c) => sum + c.percentage, 0);
    expect(totalPct).toBeCloseTo(100, 2);
    expect(result[0].percentage).toBeCloseTo(75, 2);
    expect(result[1].percentage).toBeCloseTo(25, 2);
  });

  it('sorts categories by amount descending', () => {
    const subs: Subscription[] = [
      makeSub({ id: '1', amount: 5, cycle: 'monthly', category: 'Small' }),
      makeSub({ id: '2', amount: 50, cycle: 'monthly', category: 'Big' }),
      makeSub({ id: '3', amount: 20, cycle: 'monthly', category: 'Medium' }),
    ];

    const result = getSpendingByCategory(subs);
    expect(result.map(c => c.name)).toEqual(['Big', 'Medium', 'Small']);
  });

  it('ignores paused and cancelled subscriptions', () => {
    const subs: Subscription[] = [
      makeSub({ id: '1', amount: 10, cycle: 'monthly', category: 'A', status: 'active' }),
      makeSub({ id: '2', amount: 99, cycle: 'monthly', category: 'B', status: 'cancelled' }),
      makeSub({ id: '3', amount: 99, cycle: 'monthly', category: 'C', status: 'paused' }),
    ];

    const result = getSpendingByCategory(subs);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('A');
  });

  it('returns empty array for no active subscriptions', () => {
    expect(getSpendingByCategory([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// calculatePotentialSavings
// ---------------------------------------------------------------------------

describe('calculatePotentialSavings', () => {
  it('calculates 15% yearly savings for monthly subscriptions', () => {
    const subs: Subscription[] = [
      makeSub({ id: '1', amount: 10, cycle: 'monthly', status: 'active' }),
      makeSub({ id: '2', amount: 20, cycle: 'monthly', status: 'active' }),
    ];

    const result = calculatePotentialSavings(subs);

    // (10 * 12 * 0.15) + (20 * 12 * 0.15) = 18 + 36 = 54
    expect(result.amount).toBeCloseTo(54, 2);
    expect(result.monthlyCount).toBe(2);
  });

  it('ignores yearly and other cycle subscriptions', () => {
    const subs: Subscription[] = [
      makeSub({ id: '1', amount: 100, cycle: 'yearly', status: 'active' }),
      makeSub({ id: '2', amount: 50, cycle: 'quarterly', status: 'active' }),
      makeSub({ id: '3', amount: 5, cycle: 'weekly', status: 'active' }),
    ];

    const result = calculatePotentialSavings(subs);
    expect(result.amount).toBe(0);
    expect(result.monthlyCount).toBe(0);
  });

  it('ignores inactive monthly subscriptions', () => {
    const subs: Subscription[] = [
      makeSub({ id: '1', amount: 10, cycle: 'monthly', status: 'cancelled' }),
      makeSub({ id: '2', amount: 20, cycle: 'monthly', status: 'paused' }),
    ];

    const result = calculatePotentialSavings(subs);
    expect(result.amount).toBe(0);
    expect(result.monthlyCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getBillingCycleBreakdown
// ---------------------------------------------------------------------------

describe('getBillingCycleBreakdown', () => {
  it('counts and totals active subscriptions per cycle', () => {
    const subs: Subscription[] = [
      makeSub({ id: '1', amount: 10, cycle: 'monthly', status: 'active' }),
      makeSub({ id: '2', amount: 20, cycle: 'monthly', status: 'active' }),
      makeSub({ id: '3', amount: 100, cycle: 'yearly', status: 'active' }),
      makeSub({ id: '4', amount: 5, cycle: 'weekly', status: 'active' }),
      makeSub({ id: '5', amount: 30, cycle: 'quarterly', status: 'active' }),
      makeSub({ id: '6', amount: 99, cycle: 'monthly', status: 'cancelled' }),
    ];

    const result = getBillingCycleBreakdown(subs);

    expect(result.monthly).toEqual({ count: 2, total: 30 });
    expect(result.yearly).toEqual({ count: 1, total: 100 });
    expect(result.weekly).toEqual({ count: 1, total: 5 });
    expect(result.quarterly).toEqual({ count: 1, total: 30 });
  });

  it('returns zeros for all cycles when no active subscriptions', () => {
    const result = getBillingCycleBreakdown([]);
    expect(result.monthly).toEqual({ count: 0, total: 0 });
    expect(result.yearly).toEqual({ count: 0, total: 0 });
    expect(result.weekly).toEqual({ count: 0, total: 0 });
    expect(result.quarterly).toEqual({ count: 0, total: 0 });
  });
});

// ---------------------------------------------------------------------------
// getBudgetStatus
// ---------------------------------------------------------------------------

describe('getBudgetStatus', () => {
  it('returns safe when spending is below 75%', () => {
    const result = getBudgetStatus(50, 100);
    expect(result.status).toBe('safe');
    expect(result.percentage).toBeCloseTo(50, 2);
    expect(result.remaining).toBe(50);
  });

  it('returns warning when spending is between 75% and 90%', () => {
    const result = getBudgetStatus(80, 100);
    expect(result.status).toBe('warning');
    expect(result.percentage).toBeCloseTo(80, 2);
    expect(result.remaining).toBe(20);
  });

  it('returns warning at exactly 75%', () => {
    const result = getBudgetStatus(75, 100);
    expect(result.status).toBe('warning');
  });

  it('returns danger when spending is 90% or above', () => {
    const result = getBudgetStatus(95, 100);
    expect(result.status).toBe('danger');
    expect(result.percentage).toBeCloseTo(95, 2);
    expect(result.remaining).toBe(5);
  });

  it('returns danger at exactly 90%', () => {
    const result = getBudgetStatus(90, 100);
    expect(result.status).toBe('danger');
  });

  it('handles zero limit gracefully', () => {
    const result = getBudgetStatus(50, 0);
    expect(result.percentage).toBe(0);
    expect(result.remaining).toBe(0);
    expect(result.status).toBe('safe');
  });

  it('clamps remaining to zero when over budget', () => {
    const result = getBudgetStatus(150, 100);
    expect(result.remaining).toBe(0);
    expect(result.percentage).toBeCloseTo(150, 2);
  });
});

// ---------------------------------------------------------------------------
// formatCurrency (calculations.ts version)
// ---------------------------------------------------------------------------

describe('formatCurrency (calculations)', () => {
  it('formats USD with $ symbol', () => {
    expect(formatCurrency(15.99, 'USD')).toBe('$15.99');
  });

  it('formats EUR with euro symbol', () => {
    expect(formatCurrency(9.99, 'EUR')).toBe('€9.99');
  });

  it('formats GBP with pound symbol', () => {
    expect(formatCurrency(7.5, 'GBP')).toBe('£7.50');
  });

  it('formats TRY with lira symbol', () => {
    expect(formatCurrency(29.99, 'TRY')).toBe('₺29.99');
  });

  it('uses currency code for unknown currencies', () => {
    expect(formatCurrency(100, 'JPY')).toBe('JPY100.00');
  });

  it('defaults to USD when no currency specified', () => {
    expect(formatCurrency(42)).toBe('$42.00');
  });
});

// ---------------------------------------------------------------------------
// getDaysUntilBilling
// ---------------------------------------------------------------------------

describe('getDaysUntilBilling', () => {
  beforeEach(() => {
    // Fix "now" to 2026-03-18T12:00:00Z for deterministic tests
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-18T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns positive days for a future billing date', () => {
    const days = getDaysUntilBilling('2026-04-15');
    expect(days).toBe(28); // Mar 18 -> Apr 15 = 28 days
  });

  it('returns negative days for a past date without cycle', () => {
    const days = getDaysUntilBilling('2026-03-10');
    // Mar 10 is 8 days before Mar 18
    expect(days).toBeLessThan(0);
  });

  it('advances a past date forward using cycle and returns positive days', () => {
    // Billing was 2026-02-15, cycle monthly -> advances to 2026-03-15 (past)
    // then to 2026-04-15 (future)
    const days = getDaysUntilBilling('2026-02-15', 'monthly');
    expect(days).toBe(28); // Mar 18 -> Apr 15 = 28 days
  });

  it('returns positive days when billing date is already in the future with cycle', () => {
    const days = getDaysUntilBilling('2026-05-01', 'monthly');
    // May 1 is already in the future, no advancement needed
    expect(days).toBe(44); // Mar 18 -> May 1 = 44 days
  });
});

// ---------------------------------------------------------------------------
// advanceToNextBillingDate
// ---------------------------------------------------------------------------

describe('advanceToNextBillingDate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-18T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not advance a future date', () => {
    const result = advanceToNextBillingDate('2026-05-01', 'monthly');
    expect(result.toISOString().startsWith('2026-05-01')).toBe(true);
  });

  it('advances a past monthly date to the future', () => {
    const result = advanceToNextBillingDate('2026-01-15', 'monthly');
    // Jan 15 -> Feb 15 -> Mar 15 (past) -> Apr 15 (future)
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(3); // April (0-indexed)
    expect(result.getDate()).toBe(15);
  });

  it('advances a past weekly date to the future', () => {
    const result = advanceToNextBillingDate('2026-03-01', 'weekly');
    // Mar 1 -> Mar 8 -> Mar 15 (past) -> Mar 22 (future)
    expect(result >= new Date('2026-03-18T12:00:00Z')).toBe(true);
    expect(result.getDay()).toBe(new Date('2026-03-01').getDay()); // Same day of week
  });

  it('advances a past quarterly date to the future', () => {
    const result = advanceToNextBillingDate('2025-12-01', 'quarterly');
    // Dec 1 2025 -> Mar 1 2026 (past) -> Jun 1 2026 (future)
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(5); // June
    expect(result.getDate()).toBe(1);
  });

  it('advances a past yearly date to the future', () => {
    const result = advanceToNextBillingDate('2024-06-15', 'yearly');
    // Jun 15 2024 -> Jun 15 2025 (past) -> Jun 15 2026 (future)
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(5); // June
    expect(result.getDate()).toBe(15);
  });
});
