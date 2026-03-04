/**
 * NotificationService - Local push notifications for billing reminders
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type { Subscription } from '../types';
import { t } from '../i18n';
import { formatCurrency } from '../utils';
import { logger } from './LoggerService';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationSettings {
  enabled: boolean;
  reminderDays: number[]; // Days before billing to remind (e.g., [1, 3] = 1 and 3 days before)
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  reminderDays: [1, 3], // Default: remind 1 day and 3 days before billing
};

/**
 * Request permission for push notifications
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    logger.info('Notifications', 'Push notifications require a physical device');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    logger.info('Notifications', 'Permission not granted');
    return false;
  }

  // Configure Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('billing-reminders', {
      name: 'Billing Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#A855F6',
      sound: 'default',
    });
  }

  return true;
}

/**
 * Schedule a billing reminder notification
 */
export async function scheduleBillingReminder(
  subscription: Subscription,
  daysBeforeBilling: number,
  currency: string = 'USD'
): Promise<string | null> {
  const billingDate = new Date(subscription.nextBillingDate);
  const reminderDate = new Date(billingDate);
  reminderDate.setDate(reminderDate.getDate() - daysBeforeBilling);
  
  // Set reminder time to 9 AM
  reminderDate.setHours(9, 0, 0, 0);

  // Don't schedule if reminder date is in the past
  if (reminderDate <= new Date()) {
    return null;
  }

  const formattedAmount = formatCurrency(subscription.amount, currency);
  const formattedDate = billingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: daysBeforeBilling === 1 
        ? t('notifications.billsTomorrow', { name: subscription.name })
        : t('notifications.billsInDays', { name: subscription.name, days: daysBeforeBilling }),
      body: t('notifications.chargedOn', { amount: formattedAmount, date: formattedDate }),
      data: { 
        subscriptionId: subscription.id,
        type: 'billing-reminder',
      },
      sound: 'default',
      categoryIdentifier: 'billing-reminders',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
    },
  });

  return identifier;
}

/**
 * Schedule aggressive trial end reminders (3 days, 1 day, day-of)
 */
export async function scheduleTrialReminder(
  subscription: Subscription,
  daysBeforeEnd: number,
  currency: string = 'USD'
): Promise<string | null> {
  if (!subscription.isTrial || !subscription.trialEndsAt) return null;

  const trialEndDate = new Date(subscription.trialEndsAt);
  const reminderDate = new Date(trialEndDate);
  reminderDate.setDate(reminderDate.getDate() - daysBeforeEnd);
  reminderDate.setHours(9, 0, 0, 0);

  if (reminderDate <= new Date()) return null;

  const formattedAmount = formatCurrency(subscription.amount, currency);

  let title: string;
  if (daysBeforeEnd === 0) {
    title = t('notifications.trialEndsToday', { name: subscription.name });
  } else if (daysBeforeEnd === 1) {
    title = t('notifications.trialEndsTomorrow', { name: subscription.name });
  } else {
    title = t('notifications.trialEndsInDays', { name: subscription.name, days: daysBeforeEnd });
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: t('notifications.trialChargeWarning', { amount: formattedAmount }),
      data: {
        subscriptionId: subscription.id,
        type: 'trial-reminder',
      },
      sound: 'default',
      categoryIdentifier: 'billing-reminders',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
    },
  });

  return identifier;
}

/**
 * Cancel all scheduled notifications for a subscription
 */
export async function cancelSubscriptionReminders(subscriptionId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  
  for (const notification of scheduled) {
    const data = notification.content.data as { subscriptionId?: string };
    if (data?.subscriptionId === subscriptionId) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

/**
 * Schedule reminders for all active subscriptions
 */
export async function scheduleAllReminders(
  subscriptions: Subscription[],
  settings: NotificationSettings = DEFAULT_NOTIFICATION_SETTINGS,
  currency: string = 'USD'
): Promise<void> {
  if (!settings.enabled) {
    return;
  }

  // Cancel all existing reminders first
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Schedule new reminders
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');

  for (const subscription of activeSubscriptions) {
    // Schedule trial reminders (aggressive: 3 days, 1 day, day-of)
    if (subscription.isTrial && subscription.trialEndsAt) {
      for (const daysBefore of [3, 1, 0]) {
        await scheduleTrialReminder(subscription, daysBefore, currency);
      }
    }

    const reminderDays = subscription.customReminderDays != null
      ? subscription.customReminderDays
      : settings.reminderDays;

    for (const daysBefore of reminderDays) {
      await scheduleBillingReminder(subscription, daysBefore, currency);
    }
  }

  const count = await getScheduledNotificationCount();
  logger.info('Notifications', `Scheduled ${count} billing reminders`);
}

/**
 * Suggest reminder days based on monthly subscription cost
 */
export function getSuggestedReminderDays(monthlyAmount: number): number[] {
  if (monthlyAmount < 5) {
    return [1];
  } else if (monthlyAmount < 15) {
    return [3, 1];
  } else if (monthlyAmount < 30) {
    return [7, 3, 1];
  } else {
    return [7, 3, 1, 0];
  }
}

/**
 * Get count of scheduled notifications
 */
export async function getScheduledNotificationCount(): Promise<number> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.length;
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Add notification response listener
 */
export function addNotificationResponseListener(
  callback: (subscriptionId: string) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as { subscriptionId?: string };
    if (data?.subscriptionId) {
      callback(data.subscriptionId);
    }
  });
}

/**
 * Send an immediate notification about a subscription price change
 */
export async function schedulePriceChangeNotification(
  subscriptionName: string,
  oldPrice: number,
  newPrice: number,
  currency: string
): Promise<string | null> {
  const formattedOld = formatCurrency(oldPrice, currency);
  const formattedNew = formatCurrency(newPrice, currency);
  const isIncrease = newPrice > oldPrice;

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: isIncrease
          ? t('alerts.priceIncrease')
          : t('alerts.priceDecrease'),
        body: t('alerts.priceChangedFrom', {
          name: subscriptionName,
          old: formattedOld,
          new: formattedNew,
        }),
        data: {
          subscriptionName,
          type: isIncrease ? 'price_increase' : 'price_decrease',
        },
        sound: 'default',
      },
      trigger: null, // Send immediately
    });
    return identifier;
  } catch (error) {
    logger.warn('Notifications', 'Failed to schedule price change notification:', error);
    return null;
  }
}

/**
 * Send a test notification (for debugging)
 */
export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: t('notifications.testTitle') + ' 🔔',
      body: t('notifications.testBody'),
      sound: 'default',
    },
    trigger: null, // Send immediately
  });
}
