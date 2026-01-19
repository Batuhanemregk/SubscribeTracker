/**
 * NotificationService - Local push notifications for billing reminders
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type { Subscription } from '../types';

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
    console.log('Push notifications require a physical device');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted');
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
  daysBeforeBilling: number
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

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: daysBeforeBilling === 1 
        ? `${subscription.name} bills tomorrow!`
        : `${subscription.name} bills in ${daysBeforeBilling} days`,
      body: `$${subscription.amount.toFixed(2)} will be charged on ${billingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
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
  settings: NotificationSettings = DEFAULT_NOTIFICATION_SETTINGS
): Promise<void> {
  if (!settings.enabled) {
    return;
  }

  // Cancel all existing reminders first
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Schedule new reminders
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  
  for (const subscription of activeSubscriptions) {
    for (const daysBefore of settings.reminderDays) {
      await scheduleBillingReminder(subscription, daysBefore);
    }
  }

  const count = await getScheduledNotificationCount();
  console.log(`Scheduled ${count} billing reminders`);
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
 * Send a test notification (for debugging)
 */
export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test Notification 🔔',
      body: 'Push notifications are working!',
      sound: 'default',
    },
    trigger: null, // Send immediately
  });
}
