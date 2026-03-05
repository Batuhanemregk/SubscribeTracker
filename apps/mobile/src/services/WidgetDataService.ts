import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Subscription } from '../types';

export const WIDGET_DATA_STORAGE_KEY = '@finify/widget-data';
const DEFAULT_UPCOMING_DAYS = 30;
const DEFAULT_UPCOMING_LIMIT = 5;
const DEFAULT_IOS_APP_GROUP = 'group.com.finify.app';

export interface WidgetRenewalItem {
  id: string;
  name: string;
  amount: number;
  currency: string;
  nextBillingDate: string;
}

export interface WidgetSummaryData {
  generatedAt: string;
  totalMonthlyCost: number;
  activeSubscriptionCount: number;
  upcomingRenewals: WidgetRenewalItem[];
}

interface AggregateOptions {
  now?: Date;
  upcomingDays?: number;
  upcomingLimit?: number;
}

interface SaveOptions {
  storageKey?: string;
  iosAppGroup?: string;
  asyncStorage?: Pick<typeof AsyncStorage, 'setItem'>;
  nativeWriter?: (summary: WidgetSummaryData) => Promise<void>;
}

function toMonthlyAmount(subscription: Subscription): number {
  switch (subscription.cycle) {
    case 'weekly':
      return subscription.amount * 4.33;
    case 'monthly':
      return subscription.amount;
    case 'quarterly':
      return subscription.amount / 3;
    case 'yearly':
      return subscription.amount / 12;
    case 'custom':
      return subscription.amount * (30.44 / (subscription.customDays || 30));
    default:
      return subscription.amount;
  }
}

function resolveNativeWriter(iosAppGroup: string): ((summary: WidgetSummaryData) => Promise<void>) | null {
  try {
    if (Platform.OS === 'ios') {
      const sharedGroupPreferences: unknown = require('react-native-shared-group-preferences');
      if (
        typeof sharedGroupPreferences === 'object' &&
        sharedGroupPreferences !== null &&
        'setItem' in sharedGroupPreferences &&
        typeof (sharedGroupPreferences as { setItem: unknown }).setItem === 'function'
      ) {
        const bridge = sharedGroupPreferences as {
          setItem: (key: string, value: WidgetSummaryData, group: string) => Promise<void>;
        };
        return (summary: WidgetSummaryData) => bridge.setItem('widgetData', summary, iosAppGroup);
      }
    }

    if (Platform.OS === 'android') {
      const sharedPreferences: unknown = require('react-native-shared-preferences');
      if (
        typeof sharedPreferences === 'object' &&
        sharedPreferences !== null &&
        'setItem' in sharedPreferences &&
        typeof (sharedPreferences as { setItem: unknown }).setItem === 'function'
      ) {
        const bridge = sharedPreferences as {
          setItem: (key: string, value: string) => Promise<void>;
          setName?: (name: string) => void;
        };

        bridge.setName?.('finify_widget_prefs');
        return (summary: WidgetSummaryData) => bridge.setItem('widgetData', JSON.stringify(summary));
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function aggregateWidgetSummaryData(
  subscriptions: Subscription[],
  options: AggregateOptions = {}
): WidgetSummaryData {
  const now = options.now ?? new Date();
  const upcomingDays = options.upcomingDays ?? DEFAULT_UPCOMING_DAYS;
  const upcomingLimit = options.upcomingLimit ?? DEFAULT_UPCOMING_LIMIT;
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + upcomingDays);

  const activeSubscriptions = subscriptions.filter((sub) => sub.status === 'active');

  const totalMonthlyCost = activeSubscriptions.reduce((sum, subscription) => {
    return sum + toMonthlyAmount(subscription);
  }, 0);

  const upcomingRenewals = activeSubscriptions
    .filter((subscription) => {
      const billingDate = new Date(subscription.nextBillingDate);
      return !Number.isNaN(billingDate.getTime()) && billingDate >= now && billingDate <= endDate;
    })
    .sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime())
    .slice(0, upcomingLimit)
    .map((subscription) => ({
      id: subscription.id,
      name: subscription.name,
      amount: subscription.amount,
      currency: subscription.currency,
      nextBillingDate: subscription.nextBillingDate,
    }));

  return {
    generatedAt: now.toISOString(),
    totalMonthlyCost,
    activeSubscriptionCount: activeSubscriptions.length,
    upcomingRenewals,
  };
}

export async function saveWidgetDataToSharedStorage(
  summary: WidgetSummaryData,
  options: SaveOptions = {}
): Promise<void> {
  const storageKey = options.storageKey ?? WIDGET_DATA_STORAGE_KEY;
  const iosAppGroup = options.iosAppGroup ?? DEFAULT_IOS_APP_GROUP;
  const storage = options.asyncStorage ?? AsyncStorage;

  const payload = JSON.stringify(summary);
  await storage.setItem(storageKey, payload);

  const nativeWriter = options.nativeWriter ?? resolveNativeWriter(iosAppGroup);
  if (nativeWriter) {
    await nativeWriter(summary);
  }
}

export async function syncWidgetData(
  subscriptions: Subscription[],
  options: AggregateOptions & SaveOptions = {}
): Promise<WidgetSummaryData> {
  const summary = aggregateWidgetSummaryData(subscriptions, options);
  await saveWidgetDataToSharedStorage(summary, options);
  return summary;
}
