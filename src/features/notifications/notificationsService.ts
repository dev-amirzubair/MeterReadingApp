import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  type TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import { Platform } from 'react-native';

const ANDROID_CHANNEL_ID = 'meter-reminders';
const REMINDER_GROUP_PREFIX = 'meter-monthly-';
const MONTHS_AHEAD = 12;

export interface ReminderConfig {
  /** Day of month (1-28). */
  day: number;
  /** Hour of day (0-23). */
  hour: number;
}

export interface PermissionState {
  granted: boolean;
  /** True only if the user has been asked at least once. */
  determined: boolean;
}

let channelEnsured = false;

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android' || channelEnsured) {
    return;
  }
  await notifee.createChannel({
    id: ANDROID_CHANNEL_ID,
    name: 'Bill reminders',
    description: 'Monthly nudges to record your meter\'s bill reading.',
    importance: AndroidImportance.DEFAULT,
  });
  channelEnsured = true;
}

/**
 * Asks the OS for notification permission. On Android <13 this is implicit and
 * always returns granted.
 */
export async function requestNotificationPermission(): Promise<PermissionState> {
  await ensureAndroidChannel();
  const settings = await notifee.requestPermission();
  const granted =
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;
  return {
    granted,
    determined: settings.authorizationStatus !== AuthorizationStatus.NOT_DETERMINED,
  };
}

export async function getNotificationPermission(): Promise<PermissionState> {
  const settings = await notifee.getNotificationSettings();
  const granted =
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;
  return {
    granted,
    determined: settings.authorizationStatus !== AuthorizationStatus.NOT_DETERMINED,
  };
}

/**
 * Returns the timestamp for the Nth upcoming occurrence of (day, hour).
 *
 * - `monthsFromNow = 0` returns this month's date if it is still in the future,
 *   otherwise next month.
 * - `monthsFromNow = 1` returns the month after that, etc.
 *
 * Uses day clamping so day=29..31 still works for short months (it falls back
 * to the last day of the month). Our settings limit day to 1-28 anyway, but
 * the helper is robust either way.
 */
export function nextReminderTimestamp(
  config: ReminderConfig,
  monthsFromNow = 0,
  now: Date = new Date(),
): number {
  const base = new Date(now.getFullYear(), now.getMonth(), 1, config.hour, 0, 0, 0);
  base.setMonth(base.getMonth() + monthsFromNow);

  const lastDayOfMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const day = Math.min(config.day, lastDayOfMonth);
  base.setDate(day);

  if (monthsFromNow === 0 && base.getTime() <= now.getTime()) {
    return nextReminderTimestamp(config, 1, now);
  }
  return base.getTime();
}

function buildReminderId(timestamp: number): string {
  return `${REMINDER_GROUP_PREFIX}${timestamp}`;
}

async function cancelAllMeterReminders(): Promise<void> {
  const ids = await notifee.getTriggerNotificationIds();
  const ours = ids.filter(id => id.startsWith(REMINDER_GROUP_PREFIX));
  if (ours.length > 0) {
    await notifee.cancelTriggerNotifications(ours);
  }
}

/**
 * Cancels every scheduled bill reminder.
 */
export async function cancelMonthlyReminders(): Promise<void> {
  await cancelAllMeterReminders();
}

/**
 * Cancels the existing schedule and books `MONTHS_AHEAD` reminders starting at
 * the next valid (day, hour) occurrence. Idempotent — safe to call repeatedly.
 *
 * Returns the next reminder timestamp (ms) on success, or null if permission
 * is not granted.
 */
export async function scheduleMonthlyReminders(
  config: ReminderConfig,
): Promise<number | null> {
  const perm = await getNotificationPermission();
  if (!perm.granted) {
    return null;
  }
  await ensureAndroidChannel();
  await cancelAllMeterReminders();

  const now = new Date();
  let firstTimestamp: number | null = null;

  for (let i = 0; i < MONTHS_AHEAD; i += 1) {
    const ts = nextReminderTimestamp(config, i, now);
    if (i === 0) {
      firstTimestamp = ts;
    }
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: ts,
    };
    await notifee.createTriggerNotification(
      {
        id: buildReminderId(ts),
        title: 'Time to record your bill reading',
        body: 'Open Meter Tracker and add this month\'s reading to keep your usage charts accurate.',
        android: {
          channelId: ANDROID_CHANNEL_ID,
          pressAction: { id: 'default' },
          smallIcon: 'ic_launcher',
        },
        ios: {
          sound: 'default',
        },
      },
      trigger,
    );
  }
  return firstTimestamp;
}

/**
 * Returns the count of currently scheduled reminders the app owns and the
 * timestamp of the next one. Useful for the Settings screen status line.
 */
export async function getScheduleStatus(): Promise<{
  pendingCount: number;
  nextAt: number | null;
}> {
  const ids = await notifee.getTriggerNotificationIds();
  const ours = ids
    .filter(id => id.startsWith(REMINDER_GROUP_PREFIX))
    .map(id => Number(id.slice(REMINDER_GROUP_PREFIX.length)))
    .filter(ts => Number.isFinite(ts) && ts > Date.now())
    .sort((a, b) => a - b);
  return {
    pendingCount: ours.length,
    nextAt: ours[0] ?? null,
  };
}

/**
 * Tops up the schedule when the user comes back to the app. If fewer than half
 * of `MONTHS_AHEAD` reminders remain, we re-schedule from scratch so the user
 * always has a long horizon of upcoming reminders.
 */
export async function refreshScheduleIfNeeded(
  config: ReminderConfig,
  enabled: boolean,
): Promise<void> {
  if (!enabled) {
    await cancelAllMeterReminders();
    return;
  }
  const perm = await getNotificationPermission();
  if (!perm.granted) {
    return;
  }
  const status = await getScheduleStatus();
  if (status.pendingCount < Math.ceil(MONTHS_AHEAD / 2)) {
    await scheduleMonthlyReminders(config);
  }
}
