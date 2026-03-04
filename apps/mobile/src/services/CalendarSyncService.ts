/**
 * CalendarSyncService - Syncs subscription billing dates to native device calendar
 * Requires expo-calendar: npx expo install expo-calendar
 */
import * as Calendar from 'expo-calendar';
import type { Subscription } from '../types';

const FINIFY_CALENDAR_NAME = 'Finify Billing';
const FINIFY_CALENDAR_COLOR = '#8B5CF6';

/**
 * Request calendar read/write permission from the user.
 * Returns true if granted, false otherwise.
 */
export async function requestCalendarPermission(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

/**
 * Find an existing "Finify Billing" calendar or create one.
 * Returns the calendar ID.
 */
export async function getOrCreateFinifyCalendar(): Promise<string> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find((cal) => cal.title === FINIFY_CALENDAR_NAME);
  if (existing) {
    return existing.id;
  }

  // Determine default calendar source based on platform
  let source: Calendar.Source;
  const defaultCalendar = await Calendar.getDefaultCalendarAsync();
  if (defaultCalendar?.source) {
    source = defaultCalendar.source;
  } else {
    // Fallback for Android
    const localSources = calendars
      .filter((cal) => cal.source?.type === 'LOCAL' || cal.source?.name === 'Default')
      .map((cal) => cal.source);
    source = localSources[0] ?? { isLocalAccount: true, name: 'Default', type: 'LOCAL' };
  }

  const calendarId = await Calendar.createCalendarAsync({
    title: FINIFY_CALENDAR_NAME,
    color: FINIFY_CALENDAR_COLOR,
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: source.id,
    source,
    name: FINIFY_CALENDAR_NAME,
    ownerAccount: 'Finify',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });

  return calendarId;
}

/**
 * Map a subscription billing cycle to an expo-calendar recurrence rule.
 * Returns null for 'custom' cycles (handled individually).
 */
function buildRecurrenceRule(cycle: Subscription['cycle']): Calendar.RecurrenceRule | null {
  switch (cycle) {
    case 'weekly':
      return { frequency: Calendar.Frequency.WEEKLY, interval: 1 };
    case 'monthly':
      return { frequency: Calendar.Frequency.MONTHLY, interval: 1 };
    case 'quarterly':
      return { frequency: Calendar.Frequency.MONTHLY, interval: 3 };
    case 'yearly':
      return { frequency: Calendar.Frequency.YEARLY, interval: 1 };
    case 'custom':
    default:
      return null;
  }
}

/**
 * Sync all active subscriptions to the native device calendar.
 * Creates a recurring event per subscription on its nextBillingDate.
 * Returns counts of synced events and errors.
 */
export async function syncSubscriptionsToCalendar(
  subscriptions: Subscription[]
): Promise<{ synced: number; errors: number }> {
  const calendarId = await getOrCreateFinifyCalendar();
  const activeSubscriptions = subscriptions.filter((s) => s.status === 'active');

  let synced = 0;
  let errors = 0;

  for (const sub of activeSubscriptions) {
    try {
      const startDate = new Date(sub.nextBillingDate);
      // Set to noon to avoid timezone-related date shifts
      startDate.setHours(12, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(13, 0, 0, 0);

      const title = `${sub.name} - ${sub.amount} ${sub.currency}`;
      const recurrenceRule = buildRecurrenceRule(sub.cycle);

      const eventDetails = {
        title,
        startDate,
        endDate,
        notes: 'Finify billing reminder',
        calendarId,
        alarms: [{ relativeOffset: -24 * 60 }], // 1-day-before alarm (minutes)
        recurrenceRule: recurrenceRule ?? undefined,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        isAllDay: false,
        location: '',
        availability: Calendar.Availability.NOT_SUPPORTED as string,
      } as Partial<Calendar.Event>;

      if (sub.cycle === 'custom' && sub.customDays) {
        // For custom cycles, create events for the next 12 occurrences
        for (let i = 0; i < 12; i++) {
          const occurrenceStart = new Date(startDate);
          occurrenceStart.setDate(occurrenceStart.getDate() + sub.customDays * i);
          const occurrenceEnd = new Date(occurrenceStart);
          occurrenceEnd.setHours(occurrenceStart.getHours() + 1);

          await Calendar.createEventAsync(calendarId, {
            title,
            startDate: occurrenceStart,
            endDate: occurrenceEnd,
            notes: 'Finify billing reminder',
            alarms: [{ relativeOffset: -24 * 60 }],
          });
        }
      } else {
        await Calendar.createEventAsync(calendarId, {
          title,
          startDate,
          endDate,
          notes: 'Finify billing reminder',
          alarms: [{ relativeOffset: -24 * 60 }],
          recurrenceRule: recurrenceRule ?? undefined,
        });
      }

      synced++;
    } catch {
      errors++;
    }
  }

  return { synced, errors };
}

/**
 * Remove all events from the Finify Billing calendar.
 * Does not delete the calendar itself.
 */
export async function removeFinifyCalendarEvents(): Promise<void> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const finifyCalendar = calendars.find((cal) => cal.title === FINIFY_CALENDAR_NAME);
  if (!finifyCalendar) return;

  const now = new Date();
  const farFuture = new Date();
  farFuture.setFullYear(farFuture.getFullYear() + 10);

  const events = await Calendar.getEventsAsync([finifyCalendar.id], now, farFuture);
  for (const event of events) {
    try {
      await Calendar.deleteEventAsync(event.id);
    } catch {
      // Ignore individual deletion errors
    }
  }
}
