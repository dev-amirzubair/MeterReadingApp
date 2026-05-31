/* global jest */

// Notifee — replace the entire native module with no-op JS shims so test files
// that import it (directly or transitively) don't trigger native bridging.
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
    getNotificationSettings: jest
      .fn()
      .mockResolvedValue({ authorizationStatus: 1 }),
    createChannel: jest.fn().mockResolvedValue('channel'),
    createTriggerNotification: jest.fn().mockResolvedValue('id'),
    cancelTriggerNotifications: jest.fn().mockResolvedValue(undefined),
    cancelTriggerNotification: jest.fn().mockResolvedValue(undefined),
    getTriggerNotificationIds: jest.fn().mockResolvedValue([]),
  },
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  },
  TriggerType: { TIMESTAMP: 0, INTERVAL: 1 },
  RepeatFrequency: { HOURLY: 1, DAILY: 2, WEEKLY: 3 },
}));

// ML Kit OCR — same approach.
jest.mock('@react-native-ml-kit/text-recognition', () => ({
  __esModule: true,
  default: {
    recognize: jest.fn().mockResolvedValue({ text: '' }),
  },
}));
