import { useSubscriptionStore, isValidUUID, generateId, migrateSubscriptionIds, createSubscription } from '../subscriptionStore';
import type { Subscription, PaymentHistoryItem } from '../../../types';

// Mock services that subscriptionStore imports
jest.mock('../../../services/syncService', () => ({
  pushToCloud: jest.fn(),
  pullFromCloud: jest.fn(),
  deleteFromCloud: jest.fn().mockResolvedValue(undefined),
  fullSync: jest.fn(),
}));

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  },
  isSupabaseConfigured: jest.fn(() => false),
}));

jest.mock('../../../services/NotificationService', () => ({
  getSuggestedReminderDays: jest.fn(() => [3, 1]),
}));

jest.mock('../../../services/RatingService', () => ({
  onSubscriptionAdded: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../settingsStore', () => ({
  useSettingsStore: {
    getState: jest.fn(() => ({ smartRemindersEnabled: false })),
  },
}));

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));

jest.mock('../../../i18n', () => ({
  setLocale: jest.fn(),
  t: jest.fn((key: string) => key),
}));

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  const now = new Date().toISOString();
  return {
    id: 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    name: 'Test Sub',
    amount: 9.99,
    currency: 'USD',
    cycle: 'monthly',
    nextBillingDate: '2026-04-01',
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

describe('subscriptionStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSubscriptionStore.setState({
      subscriptions: [],
      paymentHistory: [],
      isLoading: false,
      isSyncing: false,
      lastSyncedAt: null,
      syncError: null,
    });
  });

  describe('initial state', () => {
    it('should start with empty subscriptions', () => {
      const state = useSubscriptionStore.getState();
      expect(state.subscriptions).toEqual([]);
      expect(state.paymentHistory).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.isSyncing).toBe(false);
      expect(state.lastSyncedAt).toBeNull();
      expect(state.syncError).toBeNull();
    });
  });

  describe('setSubscriptions', () => {
    it('should replace all subscriptions', () => {
      const subs = [makeSub({ name: 'Netflix' }), makeSub({ name: 'Spotify' })];
      useSubscriptionStore.getState().setSubscriptions(subs);
      expect(useSubscriptionStore.getState().subscriptions).toHaveLength(2);
      expect(useSubscriptionStore.getState().subscriptions[0].name).toBe('Netflix');
    });
  });

  describe('addSubscription', () => {
    it('should add a subscription with lifecycle event', () => {
      const sub = makeSub({ name: 'Netflix' });
      useSubscriptionStore.getState().addSubscription(sub);

      const subs = useSubscriptionStore.getState().subscriptions;
      expect(subs).toHaveLength(1);
      expect(subs[0].name).toBe('Netflix');
      expect(subs[0].lifecycle).toHaveLength(1);
      expect(subs[0].lifecycle![0].type).toBe('subscribed');
    });

    it('should preserve existing subscriptions when adding new ones', () => {
      useSubscriptionStore.getState().addSubscription(makeSub({ name: 'Netflix' }));
      useSubscriptionStore.getState().addSubscription(makeSub({ name: 'Spotify' }));
      expect(useSubscriptionStore.getState().subscriptions).toHaveLength(2);
    });
  });

  describe('updateSubscription', () => {
    it('should update specified fields and updatedAt', () => {
      const pastDate = '2025-01-01T00:00:00.000Z';
      const sub = makeSub({ name: 'Netflix', amount: 9.99, updatedAt: pastDate });
      useSubscriptionStore.setState({ subscriptions: [sub] });

      useSubscriptionStore.getState().updateSubscription(sub.id, { amount: 15.99 });

      const updated = useSubscriptionStore.getState().subscriptions[0];
      expect(updated.amount).toBe(15.99);
      expect(updated.name).toBe('Netflix');
      expect(updated.updatedAt).not.toBe(pastDate);
    });

    it('should not affect other subscriptions', () => {
      const sub1 = makeSub({ name: 'Netflix' });
      const sub2 = makeSub({ name: 'Spotify' });
      useSubscriptionStore.setState({ subscriptions: [sub1, sub2] });

      useSubscriptionStore.getState().updateSubscription(sub1.id, { amount: 20 });

      const subs = useSubscriptionStore.getState().subscriptions;
      expect(subs[0].amount).toBe(20);
      expect(subs[1].amount).toBe(9.99);
    });

    it('should do nothing for non-existent id', () => {
      const sub = makeSub({ name: 'Netflix' });
      useSubscriptionStore.setState({ subscriptions: [sub] });

      useSubscriptionStore.getState().updateSubscription('non-existent-id', { amount: 20 });
      expect(useSubscriptionStore.getState().subscriptions[0].amount).toBe(9.99);
    });
  });

  describe('deleteSubscription', () => {
    it('should remove the subscription by id', () => {
      const sub = makeSub({ name: 'Netflix' });
      useSubscriptionStore.setState({ subscriptions: [sub] });

      useSubscriptionStore.getState().deleteSubscription(sub.id);
      expect(useSubscriptionStore.getState().subscriptions).toHaveLength(0);
    });

    it('should also delete associated payment history', () => {
      const sub = makeSub({ name: 'Netflix' });
      const payment: PaymentHistoryItem = {
        id: 'pay-1',
        subscriptionId: sub.id,
        date: '2026-03-01',
        amount: 9.99,
        currency: 'USD',
        status: 'completed',
        source: 'manual',
      };
      useSubscriptionStore.setState({ subscriptions: [sub], paymentHistory: [payment] });

      useSubscriptionStore.getState().deleteSubscription(sub.id);
      expect(useSubscriptionStore.getState().subscriptions).toHaveLength(0);
      expect(useSubscriptionStore.getState().paymentHistory).toHaveLength(0);
    });

    it('should preserve other subscriptions and their payments', () => {
      const sub1 = makeSub({ name: 'Netflix' });
      const sub2 = makeSub({ name: 'Spotify' });
      const pay1: PaymentHistoryItem = {
        id: 'pay-1', subscriptionId: sub1.id,
        date: '2026-03-01', amount: 9.99, currency: 'USD', status: 'completed', source: 'manual',
      };
      const pay2: PaymentHistoryItem = {
        id: 'pay-2', subscriptionId: sub2.id,
        date: '2026-03-01', amount: 14.99, currency: 'USD', status: 'completed', source: 'manual',
      };
      useSubscriptionStore.setState({ subscriptions: [sub1, sub2], paymentHistory: [pay1, pay2] });

      useSubscriptionStore.getState().deleteSubscription(sub1.id);
      expect(useSubscriptionStore.getState().subscriptions).toHaveLength(1);
      expect(useSubscriptionStore.getState().subscriptions[0].name).toBe('Spotify');
      expect(useSubscriptionStore.getState().paymentHistory).toHaveLength(1);
      expect(useSubscriptionStore.getState().paymentHistory[0].subscriptionId).toBe(sub2.id);
    });
  });

  describe('pauseSubscription', () => {
    it('should set status to paused and add lifecycle event', () => {
      const sub = makeSub({ name: 'Netflix', status: 'active' });
      useSubscriptionStore.setState({ subscriptions: [sub] });

      useSubscriptionStore.getState().pauseSubscription(sub.id);

      const updated = useSubscriptionStore.getState().subscriptions[0];
      expect(updated.status).toBe('paused');
      expect(updated.lifecycle).toHaveLength(1);
      expect(updated.lifecycle![0].type).toBe('paused');
    });
  });

  describe('resumeSubscription', () => {
    it('should set status to active and add lifecycle event', () => {
      const sub = makeSub({ name: 'Netflix', status: 'paused' });
      useSubscriptionStore.setState({ subscriptions: [sub] });

      useSubscriptionStore.getState().resumeSubscription(sub.id);

      const updated = useSubscriptionStore.getState().subscriptions[0];
      expect(updated.status).toBe('active');
      expect(updated.lifecycle).toHaveLength(1);
      expect(updated.lifecycle![0].type).toBe('resumed');
    });
  });

  describe('updateUsageRating', () => {
    it('should set usage rating and add lifecycle event', () => {
      const sub = makeSub({ name: 'Netflix' });
      useSubscriptionStore.setState({ subscriptions: [sub] });

      useSubscriptionStore.getState().updateUsageRating(sub.id, 4);

      const updated = useSubscriptionStore.getState().subscriptions[0];
      expect(updated.usageRating).toBe(4);
      expect(updated.lifecycle).toHaveLength(1);
      expect(updated.lifecycle![0].type).toBe('rating_changed');
      expect(updated.lifecycle![0].details).toContain('4/5');
    });
  });

  describe('logUsage', () => {
    it('should update lastUsedAt and updatedAt', () => {
      const pastDate = '2025-01-01T00:00:00.000Z';
      const sub = makeSub({ name: 'Netflix', lastUsedAt: null, updatedAt: pastDate });
      useSubscriptionStore.setState({ subscriptions: [sub] });

      useSubscriptionStore.getState().logUsage(sub.id);

      const updated = useSubscriptionStore.getState().subscriptions[0];
      expect(updated.lastUsedAt).toBeTruthy();
      expect(updated.updatedAt).not.toBe(pastDate);
    });
  });

  describe('getActiveSubscriptions', () => {
    it('should return only active subscriptions', () => {
      useSubscriptionStore.setState({
        subscriptions: [
          makeSub({ name: 'Netflix', status: 'active' }),
          makeSub({ name: 'Hulu', status: 'paused' }),
          makeSub({ name: 'Spotify', status: 'active' }),
          makeSub({ name: 'HBO', status: 'cancelled' }),
        ],
      });

      const active = useSubscriptionStore.getState().getActiveSubscriptions();
      expect(active).toHaveLength(2);
      expect(active.map((s) => s.name)).toEqual(['Netflix', 'Spotify']);
    });

    it('should return empty array when no subscriptions', () => {
      expect(useSubscriptionStore.getState().getActiveSubscriptions()).toEqual([]);
    });
  });

  describe('getPausedSubscriptions', () => {
    it('should return only paused subscriptions', () => {
      useSubscriptionStore.setState({
        subscriptions: [
          makeSub({ name: 'Netflix', status: 'active' }),
          makeSub({ name: 'Hulu', status: 'paused' }),
        ],
      });

      const paused = useSubscriptionStore.getState().getPausedSubscriptions();
      expect(paused).toHaveLength(1);
      expect(paused[0].name).toBe('Hulu');
    });
  });

  describe('getTrialSubscriptions', () => {
    it('should return active trial subscriptions', () => {
      useSubscriptionStore.setState({
        subscriptions: [
          makeSub({ name: 'Trial Sub', isTrial: true, trialEndsAt: '2026-12-01', status: 'active' }),
          makeSub({ name: 'Regular', isTrial: false, status: 'active' }),
          makeSub({ name: 'Paused Trial', isTrial: true, trialEndsAt: '2026-12-01', status: 'paused' }),
        ],
      });

      const trials = useSubscriptionStore.getState().getTrialSubscriptions();
      expect(trials).toHaveLength(1);
      expect(trials[0].name).toBe('Trial Sub');
    });
  });

  describe('getSubscriptionById', () => {
    it('should find subscription by id', () => {
      const sub = makeSub({ name: 'Netflix' });
      useSubscriptionStore.setState({ subscriptions: [sub] });

      expect(useSubscriptionStore.getState().getSubscriptionById(sub.id)?.name).toBe('Netflix');
    });

    it('should return undefined for non-existent id', () => {
      expect(useSubscriptionStore.getState().getSubscriptionById('nope')).toBeUndefined();
    });
  });

  describe('calculateMonthlyTotal', () => {
    it('should sum monthly amounts with cycle conversion', () => {
      useSubscriptionStore.setState({
        subscriptions: [
          makeSub({ amount: 10, cycle: 'monthly', status: 'active' }),
          makeSub({ amount: 120, cycle: 'yearly', status: 'active' }),  // 120/12 = 10/mo
          makeSub({ amount: 5, cycle: 'weekly', status: 'active' }),    // 5*4.33 = 21.65/mo
          makeSub({ amount: 30, cycle: 'quarterly', status: 'active' }), // 30/3 = 10/mo
        ],
      });

      const total = useSubscriptionStore.getState().calculateMonthlyTotal();
      expect(total).toBeCloseTo(10 + 10 + 21.65 + 10, 1);
    });

    it('should exclude paused and cancelled subscriptions', () => {
      useSubscriptionStore.setState({
        subscriptions: [
          makeSub({ amount: 10, cycle: 'monthly', status: 'active' }),
          makeSub({ amount: 20, cycle: 'monthly', status: 'paused' }),
          makeSub({ amount: 30, cycle: 'monthly', status: 'cancelled' }),
        ],
      });

      const total = useSubscriptionStore.getState().calculateMonthlyTotal();
      expect(total).toBe(10);
    });

    it('should handle custom cycle', () => {
      useSubscriptionStore.setState({
        subscriptions: [
          makeSub({ amount: 15, cycle: 'custom', customDays: 14, status: 'active' }),
        ],
      });

      const total = useSubscriptionStore.getState().calculateMonthlyTotal();
      // 15 * (30.44 / 14) = ~32.61
      expect(total).toBeCloseTo(15 * (30.44 / 14), 1);
    });

    it('should return 0 for empty list', () => {
      expect(useSubscriptionStore.getState().calculateMonthlyTotal()).toBe(0);
    });
  });

  describe('calculateYearlyTotal', () => {
    it('should sum yearly amounts with cycle conversion', () => {
      useSubscriptionStore.setState({
        subscriptions: [
          makeSub({ amount: 10, cycle: 'monthly', status: 'active' }),   // 10*12 = 120/yr
          makeSub({ amount: 100, cycle: 'yearly', status: 'active' }),    // 100/yr
          makeSub({ amount: 5, cycle: 'weekly', status: 'active' }),      // 5*52 = 260/yr
          makeSub({ amount: 30, cycle: 'quarterly', status: 'active' }),  // 30*4 = 120/yr
        ],
      });

      const total = useSubscriptionStore.getState().calculateYearlyTotal();
      expect(total).toBeCloseTo(120 + 100 + 260 + 120, 1);
    });

    it('should handle custom cycle', () => {
      useSubscriptionStore.setState({
        subscriptions: [
          makeSub({ amount: 10, cycle: 'custom', customDays: 60, status: 'active' }),
        ],
      });

      const total = useSubscriptionStore.getState().calculateYearlyTotal();
      // 10 * (365.25 / 60) = ~60.875
      expect(total).toBeCloseTo(10 * (365.25 / 60), 1);
    });
  });

  describe('calculateMonthlyTotalConverted', () => {
    it('should convert currencies using provided function', () => {
      useSubscriptionStore.setState({
        subscriptions: [
          makeSub({ amount: 10, currency: 'USD', cycle: 'monthly', status: 'active' }),
          makeSub({ amount: 100, currency: 'TRY', cycle: 'monthly', status: 'active' }),
        ],
      });

      // Mock converter: TRY to USD = amount / 36
      const convert = (amount: number, from: string, to: string) => {
        if (from === to) return amount;
        if (from === 'TRY' && to === 'USD') return amount / 36;
        return amount;
      };

      const total = useSubscriptionStore.getState().calculateMonthlyTotalConverted(convert, 'USD');
      // 10 USD + 100 TRY / 36 = 10 + 2.778
      expect(total).toBeCloseTo(10 + 100 / 36, 1);
    });

    it('should handle mixed cycles with currency conversion', () => {
      useSubscriptionStore.setState({
        subscriptions: [
          makeSub({ amount: 120, currency: 'EUR', cycle: 'yearly', status: 'active' }),
        ],
      });

      // 120/12 = 10 EUR/mo, then convert
      const convert = (amount: number, from: string, to: string) => {
        if (from === 'EUR' && to === 'USD') return amount * 1.1;
        return amount;
      };

      const total = useSubscriptionStore.getState().calculateMonthlyTotalConverted(convert, 'USD');
      expect(total).toBeCloseTo(10 * 1.1, 1);
    });
  });

  describe('calculateYearlyTotalConverted', () => {
    it('should convert currencies using provided function', () => {
      useSubscriptionStore.setState({
        subscriptions: [
          makeSub({ amount: 10, currency: 'USD', cycle: 'monthly', status: 'active' }),
        ],
      });

      const convert = (amount: number, from: string, to: string) => {
        if (from === 'USD' && to === 'EUR') return amount * 0.92;
        return amount;
      };

      const total = useSubscriptionStore.getState().calculateYearlyTotalConverted(convert, 'EUR');
      // 10 * 12 = 120 USD/yr, converted: 120 * 0.92 = 110.4 EUR
      expect(total).toBeCloseTo(120 * 0.92, 1);
    });
  });

  describe('payment history', () => {
    it('should add payment history items', () => {
      const payment: PaymentHistoryItem = {
        id: 'pay-1',
        subscriptionId: 'sub-1',
        date: '2026-03-01',
        amount: 9.99,
        currency: 'USD',
        status: 'completed',
        source: 'manual',
      };

      useSubscriptionStore.getState().addPaymentHistory(payment);
      expect(useSubscriptionStore.getState().paymentHistory).toHaveLength(1);
      expect(useSubscriptionStore.getState().paymentHistory[0].id).toBe('pay-1');
    });

    it('should filter payment history by subscription id', () => {
      useSubscriptionStore.setState({
        paymentHistory: [
          { id: 'p1', subscriptionId: 'sub-1', date: '2026-01-01', amount: 10, currency: 'USD', status: 'completed' as const, source: 'manual' as const },
          { id: 'p2', subscriptionId: 'sub-2', date: '2026-02-01', amount: 20, currency: 'USD', status: 'completed' as const, source: 'manual' as const },
          { id: 'p3', subscriptionId: 'sub-1', date: '2026-03-01', amount: 10, currency: 'USD', status: 'completed' as const, source: 'manual' as const },
        ],
      });

      const history = useSubscriptionStore.getState().getPaymentHistory('sub-1');
      expect(history).toHaveLength(2);
      expect(history.every((p) => p.subscriptionId === 'sub-1')).toBe(true);
    });
  });

  describe('updateNotes', () => {
    it('should update notes for a subscription', () => {
      const sub = makeSub({ name: 'Netflix', notes: '' });
      useSubscriptionStore.setState({ subscriptions: [sub] });

      useSubscriptionStore.getState().updateNotes(sub.id, 'Family plan');
      expect(useSubscriptionStore.getState().subscriptions[0].notes).toBe('Family plan');
    });
  });

  describe('addLifecycleEvent', () => {
    it('should append a lifecycle event to a subscription', () => {
      const sub = makeSub({ name: 'Netflix', lifecycle: [] });
      useSubscriptionStore.setState({ subscriptions: [sub] });

      useSubscriptionStore.getState().addLifecycleEvent(sub.id, {
        type: 'price_changed',
        date: new Date().toISOString(),
        details: 'Price changed from $9.99 to $15.99',
      });

      const updated = useSubscriptionStore.getState().subscriptions[0];
      expect(updated.lifecycle).toHaveLength(1);
      expect(updated.lifecycle![0].type).toBe('price_changed');
      expect(updated.lifecycle![0].id).toBeTruthy();
    });
  });
});

describe('utility functions', () => {
  describe('isValidUUID', () => {
    it('should return true for valid UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID('12345')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
    });
  });

  describe('generateId', () => {
    it('should return a string', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('createSubscription', () => {
    it('should create a subscription with defaults', () => {
      const sub = createSubscription({
        name: 'Netflix',
        amount: 15.99,
        currency: 'USD',
        cycle: 'monthly',
        nextBillingDate: '2026-04-01',
        category: 'Entertainment',
        iconKey: '🎬',
        colorKey: '#E50914',
      });

      expect(sub.name).toBe('Netflix');
      expect(sub.amount).toBe(15.99);
      expect(sub.status).toBe('active');
      expect(sub.source).toBe('manual');
      expect(sub.detection).toBeNull();
      expect(sub.notes).toBe('');
      expect(sub.isTrial).toBe(false);
      expect(sub.trialEndsAt).toBeNull();
      expect(sub.id).toBeTruthy();
      expect(sub.createdAt).toBeTruthy();
      expect(sub.updatedAt).toBeTruthy();
    });

    it('should allow trial overrides', () => {
      const sub = createSubscription({
        name: 'ChatGPT',
        amount: 20,
        currency: 'USD',
        cycle: 'monthly',
        nextBillingDate: '2026-04-01',
        category: 'Productivity',
        iconKey: '🤖',
        colorKey: '#10A37F',
        isTrial: true,
        trialEndsAt: '2026-04-15',
      });

      expect(sub.isTrial).toBe(true);
      expect(sub.trialEndsAt).toBe('2026-04-15');
    });
  });

  describe('migrateSubscriptionIds', () => {
    it('should not migrate valid UUID ids', () => {
      const subs = [
        makeSub({ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Netflix' }),
      ];

      const result = migrateSubscriptionIds({
        subscriptions: subs,
        paymentHistory: [],
      });

      expect(result.migrated).toBe(false);
      expect(result.subscriptions[0].id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should migrate non-UUID ids to UUIDs', () => {
      const subs = [
        makeSub({ id: 'timestamp-12345', name: 'Netflix' }),
      ];

      const result = migrateSubscriptionIds({
        subscriptions: subs,
        paymentHistory: [],
      });

      expect(result.migrated).toBe(true);
      expect(result.subscriptions[0].id).not.toBe('timestamp-12345');
    });

    it('should update payment history references after migration', () => {
      const oldSubId = 'old-non-uuid-id';
      const subs = [makeSub({ id: oldSubId, name: 'Netflix' })];
      const payments: PaymentHistoryItem[] = [
        {
          id: 'old-payment-id',
          subscriptionId: oldSubId,
          date: '2026-03-01',
          amount: 9.99,
          currency: 'USD',
          status: 'completed',
          source: 'manual',
        },
      ];

      const result = migrateSubscriptionIds({
        subscriptions: subs,
        paymentHistory: payments,
      });

      expect(result.migrated).toBe(true);
      // Payment should reference the new subscription id
      expect(result.paymentHistory[0].subscriptionId).toBe(result.subscriptions[0].id);
      expect(result.paymentHistory[0].subscriptionId).not.toBe(oldSubId);
    });
  });
});
