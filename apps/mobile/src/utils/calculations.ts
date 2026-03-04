/**
 * Analytics Calculations Utilities
 * Helper functions for insights, forecasts, and statistics
 */
import type { Subscription, CategoryData, BillingCycle } from '../types';

// Constants
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Convert subscription amount to monthly equivalent
 */
export function toMonthlyAmount(amount: number, cycle: BillingCycle, customDays?: number): number {
  switch (cycle) {
    case 'weekly':
      return amount * 4.33;
    case 'monthly':
      return amount;
    case 'quarterly':
      return amount / 3;
    case 'yearly':
      return amount / 12;
    case 'custom':
      return amount * (30.44 / (customDays || 30));
    default:
      return amount;
  }
}

/**
 * Convert subscription amount to yearly equivalent
 */
export function toYearlyAmount(amount: number, cycle: BillingCycle, customDays?: number): number {
  switch (cycle) {
    case 'weekly':
      return amount * 52;
    case 'monthly':
      return amount * 12;
    case 'quarterly':
      return amount * 4;
    case 'yearly':
      return amount;
    case 'custom':
      return amount * (365.25 / (customDays || 365));
    default:
      return amount;
  }
}

/**
 * Calculate monthly total from subscriptions
 */
export function calculateMonthlyTotal(subscriptions: Subscription[]): number {
  return subscriptions
    .filter((s) => s.status === 'active')
    .reduce((total, sub) => total + toMonthlyAmount(sub.amount, sub.cycle, sub.customDays), 0);
}

/**
 * Calculate yearly total from subscriptions
 */
export function calculateYearlyTotal(subscriptions: Subscription[]): number {
  return subscriptions
    .filter((s) => s.status === 'active')
    .reduce((total, sub) => total + toYearlyAmount(sub.amount, sub.cycle, sub.customDays), 0);
}

/**
 * Get spending by category
 */
export function getSpendingByCategory(subscriptions: Subscription[]): CategoryData[] {
  const categoryTotals: Record<string, number> = {};

  subscriptions
    .filter((s) => s.status === 'active')
    .forEach((sub) => {
      const monthlyAmt = toMonthlyAmount(sub.amount, sub.cycle, sub.customDays);
      categoryTotals[sub.category] = (categoryTotals[sub.category] || 0) + monthlyAmt;
    });

  const totalSpending = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  const categoryColors: Record<string, string> = {
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

  return Object.entries(categoryTotals)
    .map(([name, amount]) => ({
      name,
      amount,
      color: categoryColors[name] || '#8B5CF6',
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
    .filter((s) => s.status === 'active')
    .filter((s) => {
      const billingDate = advanceToNextBillingDate(s.nextBillingDate, s.cycle, s.customDays);
      return billingDate >= now && billingDate <= futureDate;
    })
    .sort(
      (a, b) =>
        advanceToNextBillingDate(a.nextBillingDate, a.cycle, a.customDays).getTime() -
        advanceToNextBillingDate(b.nextBillingDate, b.cycle, b.customDays).getTime(),
    );
}

/**
 * Advance a past billing date forward by cycle until it's in the future.
 * Handles edge case where nextBillingDate is in the past (e.g. payment
 * was charged to a different card and didn't appear in the scanned statement).
 */
export function advanceToNextBillingDate(
  nextBillingDate: string,
  cycle: BillingCycle,
  customDays?: number,
): Date {
  const billing = new Date(nextBillingDate);
  const now = new Date();

  while (billing < now) {
    switch (cycle) {
      case 'weekly':
        billing.setDate(billing.getDate() + 7);
        break;
      case 'monthly':
        billing.setMonth(billing.getMonth() + 1);
        break;
      case 'quarterly':
        billing.setMonth(billing.getMonth() + 3);
        break;
      case 'yearly':
        billing.setFullYear(billing.getFullYear() + 1);
        break;
      case 'custom':
        billing.setDate(billing.getDate() + (customDays || 30));
        break;
    }
  }

  return billing;
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
 * Get billing dates for current month (legacy - uses raw nextBillingDate only)
 */
export function getMonthBillingDates(
  subscriptions: Subscription[],
  year: number,
  month: number,
): Date[] {
  return subscriptions
    .filter((s) => s.status === 'active')
    .map((s) => new Date(s.nextBillingDate))
    .filter((d) => d.getFullYear() === year && d.getMonth() === month);
}

/**
 * Project all billing dates for a subscription within a specific month.
 * Advances the billing date forward (or backward) from nextBillingDate
 * using the subscription's cycle to find all occurrences in the target month.
 */
export function getSubscriptionBillingDatesInMonth(
  sub: Subscription,
  year: number,
  month: number,
): Date[] {
  if (sub.status !== 'active') return [];

  const dates: Date[] = [];
  const billing = new Date(sub.nextBillingDate);
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

  // Rewind billing date to before the target month start
  const rewound = new Date(billing);
  const customDays = sub.customDays || 30;
  while (rewound > monthStart) {
    switch (sub.cycle) {
      case 'weekly':
        rewound.setDate(rewound.getDate() - 7);
        break;
      case 'monthly':
        rewound.setMonth(rewound.getMonth() - 1);
        break;
      case 'quarterly':
        rewound.setMonth(rewound.getMonth() - 3);
        break;
      case 'yearly':
        rewound.setFullYear(rewound.getFullYear() - 1);
        break;
      case 'custom':
        rewound.setDate(rewound.getDate() - customDays);
        break;
    }
  }

  // Advance through the target month collecting all dates that fall within it
  const cursor = new Date(rewound);
  const maxIterations = 200; // Safety limit
  let iterations = 0;
  while (cursor <= monthEnd && iterations < maxIterations) {
    iterations++;
    if (cursor >= monthStart && cursor <= monthEnd) {
      dates.push(new Date(cursor));
    }
    // Advance by cycle
    switch (sub.cycle) {
      case 'weekly':
        cursor.setDate(cursor.getDate() + 7);
        break;
      case 'monthly':
        cursor.setMonth(cursor.getMonth() + 1);
        break;
      case 'quarterly':
        cursor.setMonth(cursor.getMonth() + 3);
        break;
      case 'yearly':
        cursor.setFullYear(cursor.getFullYear() + 1);
        break;
      case 'custom':
        cursor.setDate(cursor.getDate() + customDays);
        break;
    }
    // Break if we've passed the month
    if (cursor > monthEnd) break;
  }

  return dates;
}

/**
 * Get all subscriptions that have a billing date on a specific day.
 * Projects recurring dates properly into any month (past or future).
 */
export function getSubscriptionsForDay(
  subscriptions: Subscription[],
  year: number,
  month: number,
  day: number,
): Subscription[] {
  return subscriptions.filter((sub) => {
    if (sub.status !== 'active') return false;
    const dates = getSubscriptionBillingDatesInMonth(sub, year, month);
    return dates.some((d) => d.getDate() === day);
  });
}

/**
 * Get a map of day -> subscriptions for an entire month.
 * More efficient than calling getSubscriptionsForDay for each day.
 */
export function getMonthSubscriptionMap(
  subscriptions: Subscription[],
  year: number,
  month: number,
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
  const monthlySubs = subscriptions.filter((s) => s.status === 'active' && s.cycle === 'monthly');

  // Assume 15% discount for yearly plans
  const savings = monthlySubs.reduce((total, sub) => total + sub.amount * 12 * 0.15, 0);

  return {
    amount: savings,
    monthlyCount: monthlySubs.length,
  };
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
  const activeSubs = subscriptions.filter((s) => s.status === 'active');

  const breakdown = {
    monthly: { count: 0, total: 0 },
    yearly: { count: 0, total: 0 },
    weekly: { count: 0, total: 0 },
    quarterly: { count: 0, total: 0 },
    custom: { count: 0, total: 0 },
  };

  activeSubs.forEach((sub) => {
    breakdown[sub.cycle].count += 1;
    breakdown[sub.cycle].total += sub.amount;
  });

  return breakdown;
}

/**
 * Calculate monthly spending for last N months (for trend chart)
 * Checks which subscriptions were active (created before month end, not cancelled before month start)
 */
export function getMonthlySpendingTrend(
  subscriptions: Subscription[],
  months: number = 6,
): { month: string; amount: number }[] {
  const now = new Date();
  const result: { month: string; amount: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

    const amount = subscriptions
      .filter((s) => {
        // Must have been created before the end of this month
        const createdAt = new Date(s.createdAt);
        if (createdAt > monthEnd) return false;
        // Must not be cancelled before the start of this month
        // (cancelled subscriptions no longer have a tracking date, treat as active for past months)
        if (s.status === 'cancelled') {
          // Still count if updatedAt is within or after this month
          const updatedAt = new Date(s.updatedAt);
          if (updatedAt < monthStart) return false;
        }
        if (s.status === 'paused') return false;
        return true;
      })
      .reduce((total, sub) => total + toMonthlyAmount(sub.amount, sub.cycle, sub.customDays), 0);

    result.push({
      month: MONTHS[date.getMonth()],
      amount: Math.round(amount * 100) / 100,
    });
  }

  return result;
}

/**
 * Calculate month-over-month spending change
 */
export function getMonthOverMonthChange(subscriptions: Subscription[]): {
  amount: number;
  percentage: number;
  direction: 'up' | 'down' | 'same';
} {
  const trend = getMonthlySpendingTrend(subscriptions, 2);
  if (trend.length < 2) {
    return { amount: 0, percentage: 0, direction: 'same' };
  }

  const lastMonth = trend[0].amount;
  const currentMonth = trend[1].amount;
  const diff = currentMonth - lastMonth;

  if (lastMonth === 0) {
    return { amount: diff, percentage: 0, direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same' };
  }

  const percentage = Math.abs((diff / lastMonth) * 100);
  const direction = diff > 0.01 ? 'up' : diff < -0.01 ? 'down' : 'same';

  return {
    amount: Math.abs(diff),
    percentage: Math.round(percentage * 10) / 10,
    direction,
  };
}

/**
 * Predict next month's spending based on active subscriptions
 */
export function predictNextMonthSpending(subscriptions: Subscription[]): number {
  return subscriptions
    .filter((s) => s.status === 'active')
    .reduce((total, sub) => total + toMonthlyAmount(sub.amount, sub.cycle, sub.customDays), 0);
}

/**
 * Get budget status
 */
export function getBudgetStatus(
  spent: number,
  limit: number,
): {
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

/**
 * Calculate a value score (0-100) for a subscription based on usage rating and cost.
 * High usage (5) + low cost = best value (100)
 * Low usage (1) + high cost = worst value (0)
 * Unrated subscriptions return 50 (neutral).
 */
export function calculateValueScore(
  usageRating: number | undefined,
  monthlyAmount: number,
  maxMonthlyAmount: number = 50,
): number {
  if (usageRating === undefined || usageRating === null) return 50;
  const usageScore = (usageRating / 5) * 100;
  const costPenalty = maxMonthlyAmount > 0 ? (monthlyAmount / maxMonthlyAmount) * 20 : 0;
  return Math.max(0, Math.min(100, usageScore - costPenalty));
}

/**
 * Get a human-readable value label based on score
 */
export function getValueLabel(score: number): 'great' | 'good' | 'fair' | 'poor' | 'wasteful' {
  if (score >= 80) return 'great';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  if (score >= 20) return 'poor';
  return 'wasteful';
}

/**
 * Get a color for the value score (green = great, red = wasteful)
 */
export function getValueColor(score: number): string {
  if (score >= 80) return '#10B981'; // emerald
  if (score >= 60) return '#22C55E'; // green
  if (score >= 40) return '#F59E0B'; // amber
  if (score >= 20) return '#F97316'; // orange
  return '#EF4444'; // red
}

/**
 * Sort subscriptions by worst value first (only those with a usageRating).
 * Unrated subscriptions are excluded.
 */
export function getWastefulSubscriptions(
  subscriptions: Subscription[],
  currency: string,
): Subscription[] {
  // Compute max monthly amount among rated subs for normalization
  const ratedSubs = subscriptions.filter(
    (s) => s.status === 'active' && s.usageRating !== undefined && s.usageRating !== null,
  );
  if (ratedSubs.length === 0) return [];

  const monthlyAmounts = ratedSubs.map((s) => toMonthlyAmount(s.amount, s.cycle, s.customDays));
  const maxMonthly = Math.max(...monthlyAmounts, 1);

  return [...ratedSubs].sort((a, b) => {
    const aMonthly = toMonthlyAmount(a.amount, a.cycle, a.customDays);
    const bMonthly = toMonthlyAmount(b.amount, b.cycle, b.customDays);
    const aScore = calculateValueScore(a.usageRating, aMonthly, maxMonthly);
    const bScore = calculateValueScore(b.usageRating, bMonthly, maxMonthly);
    return aScore - bScore; // worst value first
  });
}

// ---------------------------------------------------------------------------
// Alternative Service Suggestions
// ---------------------------------------------------------------------------

export interface AlternativeSuggestion {
  currentService: string;
  currentPrice: number;
  alternativeName: string;
  alternativePrice: number;
  savings: number;
  note: string;
  currency: string;
}

interface KnownServiceAlternative {
  name: string;
  price: number;
  currency: string;
  cycle: string;
  note: string;
}

interface KnownServiceWithAlternatives {
  name: string;
  alternatives?: KnownServiceAlternative[];
  [key: string]: unknown;
}

/**
 * Match user subscriptions against known services, find cheaper alternatives,
 * and return suggestions sorted by highest savings first.
 */
export function getAlternativeSuggestions(
  subscriptions: Subscription[],
  knownServices: KnownServiceWithAlternatives[],
): AlternativeSuggestion[] {
  const suggestions: AlternativeSuggestion[] = [];

  const activeSubs = subscriptions.filter((s) => s.status === 'active');

  for (const sub of activeSubs) {
    const monthlyPrice = toMonthlyAmount(sub.amount, sub.cycle, sub.customDays);
    const subNameLower = sub.name.toLowerCase();

    const match = knownServices.find(
      (s) =>
        s.name.toLowerCase() === subNameLower ||
        subNameLower.includes(s.name.toLowerCase()) ||
        s.name.toLowerCase().includes(subNameLower),
    );

    if (!match?.alternatives) continue;

    for (const alt of match.alternatives) {
      // Only suggest cheaper alternatives
      const altMonthlyPrice = alt.cycle === 'yearly' ? alt.price / 12 : alt.price;

      if (altMonthlyPrice >= monthlyPrice) continue;

      suggestions.push({
        currentService: sub.name,
        currentPrice: monthlyPrice,
        alternativeName: alt.name,
        alternativePrice: altMonthlyPrice,
        savings: monthlyPrice - altMonthlyPrice,
        note: alt.note,
        currency: sub.currency || alt.currency || 'USD',
      });
    }
  }

  // Sort by highest savings first, de-duplicate by currentService+alternativeName
  const seen = new Set<string>();
  return suggestions
    .sort((a, b) => b.savings - a.savings)
    .filter((s) => {
      const key = `${s.currentService}|${s.alternativeName}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// ---------------------------------------------------------------------------
// Sprint 1 — Dashboard & Timeline helpers
// ---------------------------------------------------------------------------

/**
 * Find the next upcoming payment (subscription with nearest future billing date).
 * Returns null if there are no active subscriptions with future billing dates.
 */
export function findNextUpcomingPayment(subscriptions: Subscription[]): {
  subscription: Subscription;
  daysUntil: number;
  billingDate: Date;
} | null {
  const now = new Date();
  let nearest: { subscription: Subscription; daysUntil: number; billingDate: Date } | null = null;

  for (const sub of subscriptions) {
    if (sub.status !== 'active') continue;
    const billing = advanceToNextBillingDate(sub.nextBillingDate, sub.cycle, sub.customDays);
    if (billing < now) continue;
    const daysUntil = Math.ceil((billing.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (!nearest || daysUntil < nearest.daysUntil) {
      nearest = { subscription: sub, daysUntil, billingDate: billing };
    }
  }

  return nearest;
}

/**
 * Group upcoming subscriptions by billing date for SectionList usage.
 * Returns sections sorted chronologically, each containing subscriptions due that day.
 */
export function groupSubscriptionsByDate(
  subscriptions: Subscription[],
  days: number = 30,
): { title: string; date: Date; data: (Subscription & { billingDate: Date })[] }[] {
  const upcoming = getUpcomingPayments(subscriptions, days);
  const groups: Record<string, { date: Date; data: (Subscription & { billingDate: Date })[] }> = {};

  for (const sub of upcoming) {
    const billing = advanceToNextBillingDate(sub.nextBillingDate, sub.cycle, sub.customDays);
    const key = `${billing.getFullYear()}-${String(billing.getMonth() + 1).padStart(2, '0')}-${String(billing.getDate()).padStart(2, '0')}`;
    if (!groups[key]) {
      groups[key] = { date: new Date(billing), data: [] };
    }
    groups[key].data.push({ ...sub, billingDate: new Date(billing) });
  }

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      title: key,
      date: value.date,
      data: value.data,
    }));
}

/**
 * Format a date as "Billed: MMM dd" (e.g. "Billed: Mar 15")
 */
export function formatBillingDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `Billed: ${months[d.getMonth()]} ${d.getDate()}`;
}

/**
 * Calculate the total amount for upcoming payments in the next N days.
 */
export function calculateUpcomingTotal(subscriptions: Subscription[], days: number = 30): number {
  return getUpcomingPayments(subscriptions, days).reduce((total, sub) => total + sub.amount, 0);
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
