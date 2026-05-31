import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { getColors, type AppColors } from './colors';

export interface AppTheme {
  isDark: boolean;
  colors: AppColors;
}

/**
 * Resolves the active theme honoring the user's setting:
 *   - 'system' → follow the OS
 *   - 'dark'   → force dark
 *   - 'light'  → force light
 */
export function useAppTheme(): AppTheme {
  const themeMode = useSettingsStore(s => s.themeMode);
  const systemScheme = useColorScheme();

  const isDark =
    themeMode === 'dark' ||
    (themeMode === 'system' && systemScheme === 'dark');

  return { isDark, colors: getColors(isDark) };
}
