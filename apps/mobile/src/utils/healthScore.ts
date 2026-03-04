import type { Subscription } from '../types';
import { toMonthlyAmount, getMonthOverMonthChange } from './calculations';

// Types
export interface HealthScoreFactor {
  name: string;
  key: string;
  score: number;
  weight: number;
  description: string;
}

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface HealthScoreResult {
  overallScore: number;
  grade: HealthGrade;
  factors: HealthScoreFactor[];
  recommendations: string[];
}

// Grade thresholds
export function getGrade(score: number): HealthGrade {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

export function getGradeColor(grade: HealthGrade): string {
  switch (grade) {
    case 'A': return '#10B981'; // emerald
    case 'B': return '#8B5CF6'; // primary
    case 'C': return '#F59E0B'; // amber
    case 'D': return '#F97316'; // orange
    case 'F': return '#EC4899'; // pink
  }
}

// Factor calculations
function calculateUsageEfficiency(subscriptions: Subscription[]): number {
  const rated = subscriptions.filter(s => s.usageRating !== undefined && s.usageRating !== null);
  if (rated.length === 0) return 50; // neutral if no ratings
  const avgRating = rated.reduce((sum, s) => sum + (s.usageRating || 3), 0) / rated.length;
  return Math.min(100, Math.max(0, (avgRating - 1) * 25)); // 1→0, 5→100
}

function calculateCostOptimization(subscriptions: Subscription[]): number {
  if (subscriptions.length === 0) return 50;
  const monthlyCosts = subscriptions.map(s => toMonthlyAmount(s.amount, s.cycle, s.customDays));
  const avgCost = monthlyCosts.reduce((a, b) => a + b, 0) / monthlyCosts.length;

  // Score based on average monthly cost per subscription
  // < $5 = excellent, $5-15 = good, $15-30 = moderate, > $30 = poor
  if (avgCost <= 5) return 100;
  if (avgCost <= 10) return 85;
  if (avgCost <= 15) return 70;
  if (avgCost <= 20) return 55;
  if (avgCost <= 30) return 40;
  return 25;
}

function calculateSpendingTrend(subscriptions: Subscription[]): number {
  const change = getMonthOverMonthChange(subscriptions);
  if (change.direction === 'down') return 100;
  if (change.direction === 'same') return 70;
  // Increasing — score based on percentage
  if (change.percentage <= 5) return 60;
  if (change.percentage <= 15) return 40;
  return 20;
}

function calculateTrialManagement(subscriptions: Subscription[]): number {
  const trials = subscriptions.filter(s => s.isTrial && s.trialEndsAt);
  if (trials.length === 0) return 80; // no trials = decent

  const now = new Date();
  let score = 90;

  for (const trial of trials) {
    const endDate = new Date(trial.trialEndsAt!);
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) score -= 20; // expired trial still listed
    else if (daysLeft <= 3) score -= 15; // expiring very soon
    else if (daysLeft <= 7) score -= 5; // expiring soon
  }

  return Math.max(0, Math.min(100, score));
}

function calculateCategoryDiversity(subscriptions: Subscription[]): number {
  const categories = new Set(subscriptions.map(s => s.category));
  const count = categories.size;

  if (count === 0) return 50;
  if (count === 1) return 40;
  if (count === 2) return 60;
  if (count >= 3 && count <= 6) return 100;
  if (count <= 8) return 80;
  return 60; // too scattered
}

function generateRecommendations(factors: HealthScoreFactor[], subscriptions: Subscription[]): string[] {
  const recommendations: string[] = [];

  const sorted = [...factors].sort((a, b) => a.score - b.score);

  for (const factor of sorted) {
    if (factor.score < 50 && recommendations.length < 3) {
      switch (factor.key) {
        case 'usage':
          recommendations.push('Rate your subscription usage to get a more accurate health score');
          break;
        case 'cost':
          recommendations.push('Review your most expensive subscriptions for potential downgrades');
          break;
        case 'trend':
          recommendations.push('Your spending is trending up — consider cancelling unused services');
          break;
        case 'trials':
          recommendations.push('You have trials expiring soon — decide whether to keep or cancel');
          break;
        case 'diversity':
          recommendations.push('Consider diversifying your subscriptions across different categories');
          break;
      }
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('Your subscription portfolio looks healthy! Keep monitoring regularly.');
  }

  return recommendations;
}

// Main calculation
export function calculateHealthScore(subscriptions: Subscription[]): HealthScoreResult {
  const active = subscriptions.filter(s => s.status === 'active');

  if (active.length === 0) {
    return {
      overallScore: 0,
      grade: 'F',
      factors: [],
      recommendations: ['Add your first subscription to start tracking your health score'],
    };
  }

  const factors: HealthScoreFactor[] = [
    {
      name: 'Usage Efficiency',
      key: 'usage',
      score: calculateUsageEfficiency(active),
      weight: 0.30,
      description: 'How well you use your subscriptions',
    },
    {
      name: 'Cost Optimization',
      key: 'cost',
      score: calculateCostOptimization(active),
      weight: 0.25,
      description: 'How cost-effective your subscriptions are',
    },
    {
      name: 'Spending Trend',
      key: 'trend',
      score: calculateSpendingTrend(active),
      weight: 0.20,
      description: 'Your month-over-month spending direction',
    },
    {
      name: 'Trial Management',
      key: 'trials',
      score: calculateTrialManagement(active),
      weight: 0.15,
      description: 'How well you manage free trials',
    },
    {
      name: 'Category Diversity',
      key: 'diversity',
      score: calculateCategoryDiversity(active),
      weight: 0.10,
      description: 'Balance across subscription categories',
    },
  ];

  const overallScore = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0)
  );

  return {
    overallScore,
    grade: getGrade(overallScore),
    factors,
    recommendations: generateRecommendations(factors, active),
  };
}
