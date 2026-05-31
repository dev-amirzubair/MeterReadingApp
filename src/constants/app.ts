export const APP_NAME = 'Meter Tracker PK';
export const APP_VERSION = '0.1.0';

export const DB_NAME = 'meter_tracker.db';

export const STORAGE_KEYS = {
  THEME: 'app.theme', // 'light' | 'dark' | 'system'
  ONBOARDED: 'app.onboarded',
  LAST_DISCO: 'app.lastDisco',
  LAST_BILL_URL: 'webview.lastBillUrl',
  NOTIFICATIONS_ENABLED: 'settings.notificationsEnabled',
} as const;
