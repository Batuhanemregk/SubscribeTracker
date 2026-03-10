import * as Notifications from 'expo-notifications';
import {
  scheduleBillingReminder,
  cancelSubscriptionReminders,
  scheduleAllReminders,
  sendTestNotification,
  getSuggestedReminderDays,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../NotificationService';
import type { Subscription } from '../../types';

// Mock i18n
jest.mock('../../i18n', () => ({
  t: (key: string, params?: Record<string, any>) => {
    if (params) {
      let result = key;
      for (const [k, v] of Object.entries(params)) {
        result += ` ${k}=${v}`;
      }
      return result;
    }
    return key;
  },
}));

// Mock formatCurrency from utils
jest.mock('../../utils', () => ({
  formatCurrency: (amount: number, currency: string) => `${currency}${amount.toFixed(2)}`,
}));

// Mock Device
jest.mock('expo-device', () => ({
  isDevice: true,
}));

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  const now = new Date().toISOString();
  return {
    id: 'sub-test-123',
    name: 'Test Service',
    amount: 10,
    currency: 'USD',
    cycle: 'monthly',
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
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
  } as Subscription;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Mock scheduleNotificationAsync to return an identifier
  (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notif-123');
  // Mock getAllScheduledNotificationsAsync
  (Notifications as any).getAllScheduledNotificationsAsync = jest.fn().mockResolvedValue([]);
  // Mock cancelScheduledNotificationAsync
  (Notifications as any).cancelScheduledNotificationAsync = jest.fn().mockResolvedValue(undefined);
  // Mock getPermissionsAsync
  (Notifications as any).getPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
  // Mock SchedulableTriggerInputTypes
  (Notifications as any).SchedulableTriggerInputTypes = { DATE: 'date' };
  // Mock AndroidImportance
  (Notifications as any).AndroidImportance = { HIGH: 4 };
  // Mock setNotificationChannelAsync
  (Notifications as any).setNotificationChannelAsync = jest.fn().mockResolvedValue(undefined);
});

// =============================================================================
// scheduleBillingReminder
// =============================================================================
describe('scheduleBillingReminder', () => {
  it('should schedule notification for future billing date', async () => {
    const sub = makeSub();
    const result = await scheduleBillingReminder(sub, 1);
    expect(result).toBe('notif-123');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });

  it('should return null for past billing date', async () => {
    const sub = makeSub({
      nextBillingDate: '2020-01-01',
    });
    const result = await scheduleBillingReminder(sub, 1);
    expect(result).toBeNull();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('should include subscription name in notification content', async () => {
    const sub = makeSub({ name: 'Netflix' });
    await scheduleBillingReminder(sub, 1);

    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.content.title).toContain('Netflix');
  });

  it('should include amount in notification body', async () => {
    const sub = makeSub({ amount: 15.99 });
    await scheduleBillingReminder(sub, 3, 'USD');

    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.content.body).toContain('15.99');
  });

  it('should include subscription ID in data', async () => {
    const sub = makeSub({ id: 'my-sub-id' });
    await scheduleBillingReminder(sub, 1);

    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.content.data.subscriptionId).toBe('my-sub-id');
    expect(call.content.data.type).toBe('billing-reminder');
  });
});

// =============================================================================
// cancelSubscriptionReminders
// =============================================================================
describe('cancelSubscriptionReminders', () => {
  it('should cancel notifications matching subscription ID', async () => {
    (Notifications as any).getAllScheduledNotificationsAsync.mockResolvedValue([
      {
        identifier: 'notif-1',
        content: { data: { subscriptionId: 'sub-123' } },
      },
      {
        identifier: 'notif-2',
        content: { data: { subscriptionId: 'sub-456' } },
      },
    ]);

    await cancelSubscriptionReminders('sub-123');

    expect((Notifications as any).cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-1');
    expect((Notifications as any).cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('notif-2');
  });

  it('should do nothing if no matching notifications', async () => {
    (Notifications as any).getAllScheduledNotificationsAsync.mockResolvedValue([
      {
        identifier: 'notif-1',
        content: { data: { subscriptionId: 'sub-other' } },
      },
    ]);

    await cancelSubscriptionReminders('sub-123');

    expect((Notifications as any).cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});

// =============================================================================
// scheduleAllReminders
// =============================================================================
describe('scheduleAllReminders', () => {
  it('should cancel all existing before scheduling new', async () => {
    const subs = [makeSub()];
    await scheduleAllReminders(subs, DEFAULT_NOTIFICATION_SETTINGS);

    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  });

  it('should skip paused subscriptions', async () => {
    const subs = [
      makeSub({ status: 'paused' }),
    ];

    await scheduleAllReminders(subs, DEFAULT_NOTIFICATION_SETTINGS);

    // Only cancelAll should be called, no new schedules
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('should not schedule when notifications are disabled', async () => {
    const subs = [makeSub()];
    await scheduleAllReminders(subs, { enabled: false, reminderDays: [1] });

    expect(Notifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('should schedule reminders for each day in reminderDays', async () => {
    const subs = [makeSub()];
    await scheduleAllReminders(subs, { enabled: true, reminderDays: [1, 3, 7] });

    // Should attempt to schedule 3 reminders (1 day, 3 days, 7 days before)
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
  });
});

// =============================================================================
// sendTestNotification
// =============================================================================
describe('sendTestNotification', () => {
  it('should schedule an immediate notification', async () => {
    await sendTestNotification();

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: null,
      })
    );
  });
});

// =============================================================================
// getSuggestedReminderDays
// =============================================================================
describe('getSuggestedReminderDays', () => {
  it('should suggest [1] for cheap subscriptions (< $5)', () => {
    expect(getSuggestedReminderDays(3)).toEqual([1]);
  });

  it('should suggest [3, 1] for mid-range ($5-$15)', () => {
    expect(getSuggestedReminderDays(10)).toEqual([3, 1]);
  });

  it('should suggest [7, 3, 1] for expensive ($15-$30)', () => {
    expect(getSuggestedReminderDays(20)).toEqual([7, 3, 1]);
  });

  it('should suggest [7, 3, 1, 0] for very expensive (> $30)', () => {
    expect(getSuggestedReminderDays(50)).toEqual([7, 3, 1, 0]);
  });
});
