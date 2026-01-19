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
export function getSpendingByCategory(subscriptions: Subscription[]): CategoryData[] {
  const categoryTotals: Record<string, number> = {};
  
  subscriptions
    .filter(s => s.status === 'active')
    .forEach(sub => {
      const monthlyAmt = toMonthlyAmount(sub.amount, sub.cycle);
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
    .filter(s => s.status === 'active')
    .filter(s => {
      const billingDate = new Date(s.nextBillingDate);
      return billingDate >= now && billingDate <= futureDate;
    })
    .sort((a, b) => 
      new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime()
    );
}

/**
 * Calculate days until next billing
 */
export function getDaysUntilBilling(nextBillingDate: string): number {
  const now = new Date();
  const billing = new Date(nextBillingDate);
  return Math.ceil((billing.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get billing dates for current month
 */
export function getMonthBillingDates(subscriptions: Subscription[], year: number, month: number): Date[] {
  return subscriptions
    .filter(s => s.status === 'active')
    .map(s => new Date(s.nextBillingDate))
    .filter(d => d.getFullYear() === year && d.getMonth() === month);
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
