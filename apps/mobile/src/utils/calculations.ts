/**
 * Analytics Calculations Utilities
 * Helper functions for insights, forecasts, and statistics
 */
import type { Subscription, CategoryData, BillingCycle } from '../types';

// Constants
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Stable color per spending category (shared across charts and budgets) */
export const CATEGORY_COLORS: Record<string, string> = {
  Entertainment: '#EC4899',
  Development: '#8B5CF6',
  Design: '#F59E0B',
  Productivity: '#10B981',
  Music: '#06B6D4',
  Storage: '#3B82F6',
  Finance: '#F97316',
  Health: '#22C55E',
  Education: '#A855F7',
  Other: '#6B7280',
};

const DEFAULT_CATEGORY_COLOR = '#8B5CF6';

/**
 * Convert subscription amount to monthly equivalent
 */
export function toMonthlyAmount(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'weekly':
      return amount * 4.33;
    case 'monthly':
      return amount;
    case 'quarterly':
      return amount / 3;
    case 'yearly':
      return amount / 12;
    default:
      return amount;
  }
}

/**
 * Convert subscription amount to yearly equivalent
 */
export function toYearlyAmount(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'weekly':
      return amount * 52;
    case 'monthly':
      return amount * 12;
    case 'quarterly':
      return amount * 4;
    case 'yearly':
      return amount;
    default:
      return amount;
  }
}

/**
 * Calculate monthly total from subscriptions
 */
export function calculateMonthlyTotal(subscriptions: Subscription[]): number {
  return subscriptions
    .filter(s => s.status === 'active')
    .reduce((total, sub) => total + toMonthlyAmount(sub.amount, sub.cycle), 0);
}

/**
 * Calculate yearly total from subscriptions
 */
export function calculateYearlyTotal(subscriptions: Subscription[]): number {
  return subscriptions
    .filter(s => s.status === 'active')
    .reduce((total, sub) => total + toYearlyAmount(sub.amount, sub.cycle), 0);
}

/**
 * Get spending by category
 */
export function getSpendingByCategory(
  subscriptions: Subscription[],
  convert?: (amount: number, from: string, to: string) => number,
  toCurrency?: string
): CategoryData[] {
  const categoryTotals: Record<string, number> = {};

  subscriptions
    .filter(s => s.status === 'active')
    .forEach(sub => {
      const base = convert && toCurrency ? convert(sub.amount, sub.currency || 'TRY', toCurrency) : sub.amount;
      const monthlyAmt = toMonthlyAmount(base, sub.cycle);
      categoryTotals[sub.category] = (categoryTotals[sub.category] || 0) + monthlyAmt;
    });

  const totalSpending = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  return Object.entries(categoryTotals)
    .map(([name, amount]) => ({
      name,
      amount,
      color: CATEGORY_COLORS[name] || DEFAULT_CATEGORY_COLOR,
      percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Get 6-month forecast data
 */
export function getForecastData(monthlyTotal: number): { month: string; value: number }[] {
  const now = new Date();
  const data: { month: string; value: number }[] = [];
  
  for (let i = 0; i < 6; i++) {
    const monthIndex = (now.getMonth() + i) % 12;
    // Add slight variance for visual interest (±5%)
    const variance = 1 + (Math.random() - 0.5) * 0.1;
    data.push({
      month: MONTHS[monthIndex],
      value: monthlyTotal * variance,
    });
  }
  
  return data;
}

/**
 * Get upcoming payments in next N days
 */
export function getUpcomingPayments(subscriptions: Subscription[], days: number): Subscription[] {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  
  return subscriptions
    .filter(s => s.status === 'active')
    .filter(s => {
      const billingDate = advanceToNextBillingDate(s.nextBillingDate, s.cycle);
      return billingDate >= now && billingDate <= futureDate;
    })
    .sort((a, b) => 
      advanceToNextBillingDate(a.nextBillingDate, a.cycle).getTime() - 
      advanceToNextBillingDate(b.nextBillingDate, b.cycle).getTime()
    );
}

/**
 * Add `count` billing cycles to a date, anchored on the start date's
 * day-of-month and clamped to the target month's length.
 *
 * This avoids the JS `Date.setMonth` rollover bug: naively, Jan 31 + 1 month
 * becomes Mar 3 (Feb has no 31st), which makes a 31st-of-month subscription
 * disappear from 30-day months entirely. Here the anchor day is preserved and
 * only clamped per target month:
 *   Jan 31 + 1 (monthly)  -> Feb 28/29   (clamped)
 *   Jan 31 + 2 (monthly)  -> Mar 31      (anchor preserved, not Mar 28)
 *   Jan 31 + 5 (monthly)  -> Jun 30      (clamped)
 *
 * `count` may be negative. Always call it from the ORIGINAL anchor date (not a
 * previously-clamped result) so the day-of-month does not drift.
 */
export function addBillingCycles(start: Date, cycle: BillingCycle, count: number): Date {
  if (cycle === 'weekly') {
    const d = new Date(start);
    d.setDate(d.getDate() + 7 * count);
    return d;
  }

  const monthsPerCycle = cycle === 'quarterly' ? 3 : cycle === 'yearly' ? 12 : 1;
  const anchorDay = start.getDate();
  const totalMonths = start.getMonth() + monthsPerCycle * count;
  const targetYear = start.getFullYear() + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

  const result = new Date(start);
  // setFullYear(y, m, d) sets all three atomically — no intermediate rollover.
  result.setFullYear(targetYear, targetMonth, Math.min(anchorDay, daysInTargetMonth));
  return result;
}

/**
 * Advance a past billing date forward by cycle until it's in the future.
 * Handles edge case where nextBillingDate is in the past (e.g. payment
 * was charged to a different card and didn't appear in the scanned statement).
 *
 * Cycles are applied from the original anchor in one shot (via addBillingCycles)
 * so the day-of-month anchor is preserved rather than drifting via repeated
 * month-end clamping.
 */
export function advanceToNextBillingDate(
  nextBillingDate: string,
  cycle: BillingCycle
): Date {
  const start = new Date(nextBillingDate);
  const now = new Date();
  if (start >= now) return start;

  // Estimate how many whole cycles separate `start` from `now`.
  let count: number;
  if (cycle === 'weekly') {
    count = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  } else {
    const monthsPerCycle = cycle === 'quarterly' ? 3 : cycle === 'yearly' ? 12 : 1;
    const monthsApart =
      (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    count = Math.floor(monthsApart / monthsPerCycle);
  }
  count = Math.max(0, count);

  // Nudge forward until strictly in the future (covers estimate undershoot).
  let candidate = addBillingCycles(start, cycle, count);
  let guard = 0;
  while (candidate < now && guard < 24) {
    count += 1;
    candidate = addBillingCycles(start, cycle, count);
    guard += 1;
  }
  return candidate;
}

/**
 * Calculate days until next billing (auto-advances past dates)
 */
export function getDaysUntilBilling(nextBillingDate: string, cycle?: BillingCycle): number {
  const now = new Date();
  if (cycle) {
    const billing = advanceToNextBillingDate(nextBillingDate, cycle);
    return Math.ceil((billing.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }
  const billing = new Date(nextBillingDate);
  return Math.ceil((billing.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Project all billing dates for a subscription within a specific month.
 * Advances the billing date forward (or backward) from nextBillingDate
 * using the subscription's cycle to find all occurrences in the target month.
 */
export function getSubscriptionBillingDatesInMonth(
  sub: Subscription,
  year: number,
  month: number
): Date[] {
  if (sub.status !== 'active') return [];

  const anchor = new Date(sub.nextBillingDate);

  // Weekly: walk every 7 days through the target month.
  if (sub.cycle === 'weekly') {
    const dates: Date[] = [];
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
    const cursor = new Date(anchor);
    while (cursor > monthStart) cursor.setDate(cursor.getDate() - 7);
    while (cursor < monthStart) cursor.setDate(cursor.getDate() + 7);
    while (cursor <= monthEnd) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
    return dates;
  }

  // Monthly / quarterly / yearly: at most one occurrence per month, on the
  // anchor day-of-month clamped to the month length. Only emit it when the
  // target month is in phase with the anchor month (so quarterly/yearly skip
  // off-cycle months). This clamps a 31st anchor to e.g. June 30 instead of
  // letting it roll over and disappear.
  const monthsPerCycle = sub.cycle === 'quarterly' ? 3 : sub.cycle === 'yearly' ? 12 : 1;
  const monthsDiff = (year - anchor.getFullYear()) * 12 + (month - anchor.getMonth());
  if ((((monthsDiff % monthsPerCycle) + monthsPerCycle) % monthsPerCycle) !== 0) return [];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const day = Math.min(anchor.getDate(), daysInMonth);
  return [new Date(year, month, day)];
}

/**
 * Get all subscriptions that have a billing date on a specific day.
 * Projects recurring dates properly into any month (past or future).
 */
export function getSubscriptionsForDay(
  subscriptions: Subscription[],
  year: number,
  month: number,
  day: number
): Subscription[] {
  return subscriptions.filter(sub => {
    if (sub.status !== 'active') return false;
    const dates = getSubscriptionBillingDatesInMonth(sub, year, month);
    return dates.some(d => d.getDate() === day);
  });
}

/**
 * Get a map of day -> subscriptions for an entire month.
 * More efficient than calling getSubscriptionsForDay for each day.
 */
export function getMonthSubscriptionMap(
  subscriptions: Subscription[],
  year: number,
  month: number
): Map<number, Subscription[]> {
  const map = new Map<number, Subscription[]>();

  for (const sub of subscriptions) {
    if (sub.status !== 'active') continue;
    const dates = getSubscriptionBillingDatesInMonth(sub, year, month);
    for (const d of dates) {
      const day = d.getDate();
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(sub);
    }
  }

  return map;
}

/**
 * Calculate potential yearly savings from switching to annual plans
 * Assumes 15% discount for yearly billing
 */
export function calculatePotentialSavings(subscriptions: Subscription[]): {
  amount: number;
  monthlyCount: number;
} {
  const monthlySubs = subscriptions.filter(
    s => s.status === 'active' && s.cycle === 'monthly'
  );
  
  // Assume 15% discount for yearly plans
  const savings = monthlySubs.reduce(
    (total, sub) => total + sub.amount * 12 * 0.15,
    0
  );
  
  return {
    amount: savings,
    monthlyCount: monthlySubs.length,
  };
}

/**
 * Rank active subscriptions by their monthly-equivalent cost (highest first)
 * and return the top `limit`. Lets the Insights screen surface the biggest
 * spenders and derive each one's share of the monthly total. Like
 * getSpendingByCategory, this sums raw amounts and does not convert currencies.
 */
export function getTopSubscriptions(
  subscriptions: Subscription[],
  limit: number = 5,
  convert?: (amount: number, from: string, to: string) => number,
  toCurrency?: string
): { subscription: Subscription; monthlyAmount: number }[] {
  return subscriptions
    .filter(s => s.status === 'active')
    .map(s => {
      const base = convert && toCurrency ? convert(s.amount, s.currency || 'TRY', toCurrency) : s.amount;
      return { subscription: s, monthlyAmount: toMonthlyAmount(base, s.cycle) };
    })
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount)
    .slice(0, limit);
}

/**
 * Detect categories where the user has 2+ active subscriptions — a signal of
 * possible overlap (e.g. several streaming services). Sorted by count, then
 * monthly total, descending, so the most overlap-prone category surfaces first.
 */
export function getSubscriptionOverlaps(
  subscriptions: Subscription[],
  convert?: (amount: number, from: string, to: string) => number,
  toCurrency?: string
): { category: string; count: number; monthlyTotal: number }[] {
  const byCategory = new Map<string, { count: number; monthlyTotal: number }>();
  for (const s of subscriptions) {
    if (s.status !== 'active') continue;
    const entry = byCategory.get(s.category) || { count: 0, monthlyTotal: 0 };
    const base = convert && toCurrency ? convert(s.amount, s.currency || 'TRY', toCurrency) : s.amount;
    entry.count += 1;
    entry.monthlyTotal += toMonthlyAmount(base, s.cycle);
    byCategory.set(s.category, entry);
  }
  return Array.from(byCategory.entries())
    .filter(([, v]) => v.count >= 2)
    .map(([category, v]) => ({ category, count: v.count, monthlyTotal: v.monthlyTotal }))
    .sort((a, b) => b.count - a.count || b.monthlyTotal - a.monthlyTotal);
}

export type SubscriptionSortKey = 'soonest' | 'name' | 'priceDesc';

export interface SubscriptionListFilter {
  query?: string;
  categories?: string[];   // empty/undefined => all categories
  cycles?: BillingCycle[]; // empty/undefined => all cycles
  sortBy?: SubscriptionSortKey;
}

/**
 * Filter a subscription list by name query, category, and billing cycle, then
 * sort it. Pure and presentation-agnostic so the Home list and its tests share
 * one code path. Like getTopSubscriptions, an optional currency converter makes
 * the price sort comparable across mixed currencies (falls back to raw amount).
 * Status is NOT filtered here — pass the already-active list in.
 */
export function filterAndSortSubscriptions(
  subscriptions: Subscription[],
  filter: SubscriptionListFilter,
  convert?: (amount: number, from: string, to: string) => number,
  toCurrency?: string
): Subscription[] {
  const query = filter.query?.trim().toLowerCase() ?? '';
  const categorySet =
    filter.categories && filter.categories.length ? new Set(filter.categories) : null;
  const cycleSet = filter.cycles && filter.cycles.length ? new Set(filter.cycles) : null;
  const sortBy = filter.sortBy ?? 'soonest';

  const filtered = subscriptions.filter((s) => {
    if (query && !s.name.toLowerCase().includes(query)) return false;
    if (categorySet && !categorySet.has(s.category)) return false;
    if (cycleSet && !cycleSet.has(s.cycle)) return false;
    return true;
  });

  const monthlyOf = (s: Subscription) => {
    const base = convert && toCurrency ? convert(s.amount, s.currency || 'TRY', toCurrency) : s.amount;
    return toMonthlyAmount(base, s.cycle);
  };

  const sorted = [...filtered];
  switch (sortBy) {
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'priceDesc':
      sorted.sort((a, b) => monthlyOf(b) - monthlyOf(a));
      break;
    case 'soonest':
    default:
      sorted.sort(
        (a, b) =>
          advanceToNextBillingDate(a.nextBillingDate, a.cycle).getTime() -
          advanceToNextBillingDate(b.nextBillingDate, b.cycle).getTime()
      );
      break;
  }
  return sorted;
}

/**
 * Get billing cycle breakdown
 */
export function getBillingCycleBreakdown(subscriptions: Subscription[]): {
  monthly: { count: number; total: number };
  yearly: { count: number; total: number };
  weekly: { count: number; total: number };
  quarterly: { count: number; total: number };
} {
  const activeSubs = subscriptions.filter(s => s.status === 'active');
  
  const breakdown = {
    monthly: { count: 0, total: 0 },
    yearly: { count: 0, total: 0 },
    weekly: { count: 0, total: 0 },
    quarterly: { count: 0, total: 0 },
  };
  
  activeSubs.forEach(sub => {
    breakdown[sub.cycle].count += 1;
    breakdown[sub.cycle].total += sub.amount;
  });
  
  return breakdown;
}

/**
 * Get budget status
 */
export function getBudgetStatus(spent: number, limit: number): {
  percentage: number;
  remaining: number;
  status: 'safe' | 'warning' | 'danger';
} {
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;
  const remaining = Math.max(limit - spent, 0);
  
  let status: 'safe' | 'warning' | 'danger' = 'safe';
  if (percentage >= 90) status = 'danger';
  else if (percentage >= 75) status = 'warning';

  return { percentage, remaining, status };
}

export interface CategoryBudgetRow {
  name: string;
  color: string;
  spent: number;
  limit: number | null;                                  // null = no limit set
  percentage: number;                                    // 0 when no limit
  remaining: number;                                     // 0 when no limit
  status: 'safe' | 'warning' | 'danger' | 'none';        // 'none' = no limit set
}

/**
 * Per-category budget status. Combines current category spending with the
 * user's per-category limits, reusing getBudgetStatus thresholds.
 * Includes categories that have spending OR a configured limit. Budgeted
 * categories sort first (highest usage % first); unbudgeted by spend.
 */
export function getCategoryBudgetStatus(
  categorySpending: CategoryData[],
  categoryBudgets: Record<string, number>
): CategoryBudgetRow[] {
  const spendByName: Record<string, CategoryData> = {};
  categorySpending.forEach(c => { spendByName[c.name] = c; });

  const budgetedNames = Object.keys(categoryBudgets).filter(k => categoryBudgets[k] > 0);
  const names = Array.from(new Set([...categorySpending.map(c => c.name), ...budgetedNames]));

  const rows: CategoryBudgetRow[] = names.map(name => {
    const spent = spendByName[name]?.amount ?? 0;
    const color = spendByName[name]?.color ?? CATEGORY_COLORS[name] ?? DEFAULT_CATEGORY_COLOR;
    const limit = categoryBudgets[name];

    if (!limit || limit <= 0) {
      return { name, color, spent, limit: null, percentage: 0, remaining: 0, status: 'none' };
    }

    const { percentage, remaining, status } = getBudgetStatus(spent, limit);
    return { name, color, spent, limit, percentage, remaining, status };
  });

  return rows.sort((a, b) => {
    if (a.limit !== null && b.limit === null) return -1;
    if (a.limit === null && b.limit !== null) return 1;
    if (a.limit !== null && b.limit !== null) return b.percentage - a.percentage;
    return b.spent - a.spent;
  });
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    TRY: '₺',
  };
  
  const symbol = symbols[currency] || currency;
  return `${symbol}${amount.toFixed(2)}`;
}
