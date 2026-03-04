/**
 * Data Repository - AsyncStorage operations
 * Legacy file - prefer using Zustand stores instead
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Subscription } from '../types';
import { SEED_SUBSCRIPTIONS } from './seed';
import { logger } from '../services/LoggerService';

const STORAGE_KEY = '@subscriptions';

/**
 * Initialize data with seed if empty.
 * No-op: seeding is now handled by HomeScreen with a persisted dataSeeded flag
 * to prevent deleted subscriptions from reappearing.
 */
export async function initData(): Promise<void> {
  // Seed logic moved to HomeScreen with dataSeeded flag guard
}

/**
 * Get all subscriptions
 */
export async function getSubscriptions(): Promise<Subscription[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    logger.error('Repository', 'Get subscriptions error:', e);
    return [];
  }
}

/**
 * Get active subscriptions only
 */
export async function getActiveSubscriptions(): Promise<Subscription[]> {
  const subs = await getSubscriptions();
  return subs.filter(s => s.status === 'active');
}

/**
 * Add a new subscription
 */
export async function addSubscription(sub: Subscription): Promise<void> {
  const subs = await getSubscriptions();
  subs.push(sub);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
}

/**
 * Update an existing subscription
 */
export async function updateSubscription(updated: Subscription): Promise<void> {
  const subs = await getSubscriptions();
  const index = subs.findIndex(s => s.id === updated.id);
  if (index !== -1) {
    subs[index] = updated;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
  }
}

/**
 * Delete a subscription by ID
 */
export async function deleteSubscription(id: string): Promise<void> {
  const subs = await getSubscriptions();
  const filtered = subs.filter(s => s.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Get a single subscription by ID
 */
export async function getSubscriptionById(id: string): Promise<Subscription | null> {
  const subs = await getSubscriptions();
  return subs.find(s => s.id === id) || null;
}

/**
 * Clear all data
 */
export async function clearAllData(): Promise<void> {
  await AsyncStorage.clear();
}

/**
 * Calculate monthly total from subscriptions
 */
export function calculateMonthlyTotal(subs: Subscription[]): number {
  return subs.reduce((sum, s) => {
    switch (s.cycle) {
      case 'weekly': return sum + s.amount * 4.33;
      case 'monthly': return sum + s.amount;
      case 'quarterly': return sum + s.amount / 3;
      case 'yearly': return sum + s.amount / 12;
      default: return sum + s.amount;
    }
  }, 0);
}

/**
 * Get days until next billing
 */
export function getDaysUntilBilling(dateString: string): number {
  return Math.ceil((new Date(dateString).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

/**
 * Get next date string (helper)
 */
export function getNextDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
