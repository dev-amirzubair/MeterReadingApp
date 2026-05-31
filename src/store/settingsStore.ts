import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandMmkvStorage } from './zustandMmkvStorage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsState {
  themeMode: ThemeMode;
  notificationsEnabled: boolean;
  /** Day of month (1-28) the monthly bill reminder fires. */
  reminderDay: number;
  /** Hour of day (0-23) the monthly bill reminder fires. */
  reminderHour: number;
  hasOnboarded: boolean;

  setThemeMode: (mode: ThemeMode) => void;
  toggleDarkMode: () => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setReminderDay: (day: number) => void;
  setReminderHour: (hour: number) => void;
  setOnboarded: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    set => ({
      themeMode: 'system',
      notificationsEnabled: true,
      reminderDay: 25,
      reminderHour: 9,
      hasOnboarded: false,

      setThemeMode: mode => set({ themeMode: mode }),
      toggleDarkMode: () =>
        set(state => ({
          themeMode: state.themeMode === 'dark' ? 'light' : 'dark',
        })),
      setNotificationsEnabled: enabled =>
        set({ notificationsEnabled: enabled }),
      setReminderDay: day =>
        set({ reminderDay: Math.min(28, Math.max(1, Math.round(day))) }),
      setReminderHour: hour =>
        set({ reminderHour: Math.min(23, Math.max(0, Math.round(hour))) }),
      setOnboarded: value => set({ hasOnboarded: value }),
    }),
    {
      name: 'settings.v1',
      storage: createJSONStorage(() => zustandMmkvStorage),
    },
  ),
);
