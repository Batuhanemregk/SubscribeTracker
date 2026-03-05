import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Subscription } from '../../types';
import {
  aggregateWidgetSummaryData,
  saveWidgetDataToSharedStorage,
  WIDGET_DATA_STORAGE_KEY,
} from '../WidgetDataService';

function createSubscription(overrides: Partial<Subscription>): Subscription {
  return {
    id: 'sub-1',
    name: 'Netflix',
    amount: 10,
    currency: 'USD',
    cycle: 'monthly',
    nextBillingDate: '2026-01-20T00:00:00.000Z',
    category: 'Entertainment',
    iconKey: '🎬',
    colorKey: '#fff',
    status: 'active',
    source: 'manual',
    detection: null,
    cancelUrl: null,
    manageUrl: null,
    notes: '',
    isTrial: false,
    trialEndsAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('WidgetDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('aggregates total monthly cost across billing cycles and filters upcoming renewals', () => {
    const now = new Date('2026-01-10T00:00:00.000Z');
    const subscriptions: Subscription[] = [
      createSubscription({ id: 'monthly', amount: 10, cycle: 'monthly', nextBillingDate: '2026-01-11T00:00:00.000Z' }),
      createSubscription({ id: 'weekly', amount: 5, cycle: 'weekly', nextBillingDate: '2026-01-12T00:00:00.000Z' }),
      createSubscription({ id: 'yearly', amount: 120, cycle: 'yearly', nextBillingDate: '2026-01-13T00:00:00.000Z' }),
      createSubscription({ id: 'paused', amount: 99, status: 'paused', nextBillingDate: '2026-01-14T00:00:00.000Z' }),
      createSubscription({ id: 'late', amount: 7, nextBillingDate: '2026-03-10T00:00:00.000Z' }),
    ];

    const result = aggregateWidgetSummaryData(subscriptions, {
      now,
      upcomingDays: 30,
      upcomingLimit: 3,
    });

    expect(result.activeSubscriptionCount).toBe(4);
    expect(result.totalMonthlyCost).toBeCloseTo(48.65, 2); // 10 + (5*4.33) + (120/12) + 7
    expect(result.upcomingRenewals.map((item) => item.id)).toEqual(['monthly', 'weekly', 'yearly']);
    expect(result.generatedAt).toBe(now.toISOString());
  });

  it('writes widget data to shared storage key and optional native writer', async () => {
    const summary = {
      generatedAt: '2026-01-10T00:00:00.000Z',
      totalMonthlyCost: 42,
      activeSubscriptionCount: 3,
      upcomingRenewals: [],
    };
    const nativeWriter = jest.fn().mockResolvedValue(undefined);

    await saveWidgetDataToSharedStorage(summary, { nativeWriter });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(WIDGET_DATA_STORAGE_KEY, JSON.stringify(summary));
    expect(nativeWriter).toHaveBeenCalledWith(summary);
  });
});
