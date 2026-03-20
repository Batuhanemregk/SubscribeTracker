/**
 * Analytics Calculations
 */
import { Subscription, AnalyticsData, CategoryTotal, MonthlyForecast, CalendarDay } from '../types';
import { categoryColors } from '../theme';

export function calculateMonthlyTotal(subscriptions: Subscription[]): number {
  return subscriptions
    .filter(s => s.status === 'active')
    .reduce((total, sub) => {
      if (sub.cycle === 'monthly') {
        return total + sub.amount;
      }
      return total + sub.amount / 12;
    }, 0);
}

export function calculateYearlyTotal(subscriptions: Subscription[]): number {
  return subscriptions
    .filter(s => s.status === 'active')
    .reduce((total, sub) => {
      if (sub.cycle === 'yearly') {
        return total + sub.amount;
      }
      return total + sub.amount * 12;
    }, 0);
}

export function calculateCategoryTotals(subscriptions: Subscription[]): CategoryTotal[] {
  const totals: Record<string, number> = {};
  const totalMonthly = calculateMonthlyTotal(subscriptions);

  subscriptions.filter(s => s.status === 'active').forEach(sub => {
    const monthlyAmount = sub.cycle === 'monthly' ? sub.amount : sub.amount / 12;
    totals[sub.category] = (totals[sub.category] || 0) + monthlyAmount;
  });

  return Object.entries(totals)
    .map(([category, amount]) => ({
      name: category,
      category,
      amount,
      percentage: totalMonthly > 0 ? (amount / totalMonthly) * 100 : 0,
      color: categoryColors[category] || '#6B7280',
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function calculate6MonthForecast(subscriptions: Subscription[]): MonthlyForecast[] {
  const monthlyTotal = calculateMonthlyTotal(subscriptions);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();
  
  return Array.from({ length: 6 }, (_, i) => {
    const monthIndex = (currentMonth + i) % 12;
    // Add slight variation for realism
    const variation = 1 + (Math.random() * 0.1 - 0.05);
    return {
      month: months[monthIndex],
      amount: Math.round(monthlyTotal * variation * 100) / 100,
    };
  });
}

export function calculatePotentialSavings(subscriptions: Subscription[]): number {
  // Assume 16% savings when converting monthly to yearly
  const monthlyOnlySubs = subscriptions.filter(s => s.status === 'active' && s.cycle === 'monthly');
  const potentialYearlyCost = monthlyOnlySubs.reduce((total, sub) => total + sub.amount * 12, 0);
  return Math.round(potentialYearlyCost * 0.16 * 100) / 100;
}

export function calculateBillingBreakdown(subscriptions: Subscription[]) {
  const active = subscriptions.filter(s => s.status === 'active');
  const monthly = active.filter(s => s.cycle === 'monthly');
  const yearly = active.filter(s => s.cycle === 'yearly');

  return {
    monthly: {
      count: monthly.length,
      total: monthly.reduce((sum, s) => sum + s.amount, 0),
    },
    yearly: {
      count: yearly.length,
      total: yearly.reduce((sum, s) => sum + s.amount, 0),
    },
  };
}

export function getAnalyticsData(subscriptions: Subscription[]): AnalyticsData {
  const active = subscriptions.filter(s => s.status === 'active');
  const monthlyTotal = calculateMonthlyTotal(subscriptions);

  return {
    monthlyTotal,
    yearlyTotal: calculateYearlyTotal(subscriptions),
    categoryTotals: calculateCategoryTotals(subscriptions),
    forecast: calculate6MonthForecast(subscriptions),
    potentialSavings: calculatePotentialSavings(subscriptions),
    billingBreakdown: calculateBillingBreakdown(subscriptions),
    activeCount: active.length,
    avgPerSubscription: active.length > 0 ? monthlyTotal / active.length : 0,
  };
}

export function getNextBillingDays(subscriptions: Subscription[]): number {
  const now = new Date();
  const active = subscriptions.filter(s => s.status === 'active');
  if (active.length === 0) return 0;

  const dates = active.map(s => new Date(s.nextBillingDate).getTime());
  const nextDate = Math.min(...dates);
  const diffDays = Math.ceil((nextDate - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function getUpcomingThisMonth(subscriptions: Subscription[]): Subscription[] {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return subscriptions
    .filter(s => s.status === 'active')
    .filter(s => {
      const billingDate = new Date(s.nextBillingDate);
      return billingDate >= now && billingDate <= endOfMonth;
    })
    .sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime());
}

export function getThisMonthTotal(subscriptions: Subscription[]): number {
  return getUpcomingThisMonth(subscriptions).reduce((sum, s) => sum + s.amount, 0);
}

export function getCalendarDays(subscriptions: Subscription[], year: number, month: number): Record<string, CalendarDay> {
  const days: Record<string, CalendarDay> = {};
  
  subscriptions.filter(s => s.status === 'active').forEach(sub => {
    const billingDate = new Date(sub.nextBillingDate);
    if (billingDate.getFullYear() === year && billingDate.getMonth() === month) {
      const dateStr = sub.nextBillingDate;
      if (!days[dateStr]) {
        days[dateStr] = { date: dateStr, subscriptions: [], total: 0 };
      }
      days[dateStr].subscriptions.push(sub);
      days[dateStr].total += sub.amount;
    }
  });

  return days;
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function getDaysUntil(dateString: string): number {
  const now = new Date();
  const target = new Date(dateString);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
