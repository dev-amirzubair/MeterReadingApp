export const lightColors = {
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2F7',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primarySoft: '#DBEAFE',
  accent: '#0EA5E9',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
};

export const darkColors = {
  background: '#0B1220',
  surface: '#111827',
  surfaceMuted: '#1F2937',
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primarySoft: '#1E3A8A',
  accent: '#38BDF8',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  border: '#1F2937',
  danger: '#F87171',
  dangerSoft: '#7F1D1D',
  success: '#34D399',
  successSoft: '#064E3B',
  warning: '#FBBF24',
  warningSoft: '#78350F',
};

export type AppColors = typeof lightColors;

export const getColors = (isDark: boolean): AppColors =>
  isDark ? darkColors : lightColors;
