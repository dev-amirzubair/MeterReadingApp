import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme/useAppTheme';

interface Props {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'primary' | 'success' | 'danger' | 'warning';
  style?: ViewStyle;
}

export function StatTile({ label, value, hint, tone = 'default', style }: Props) {
  const { colors } = useAppTheme();

  const tonePalette = (() => {
    switch (tone) {
      case 'primary':
        return { bg: colors.primarySoft, fg: colors.primary };
      case 'success':
        return { bg: colors.successSoft, fg: colors.success };
      case 'danger':
        return { bg: colors.dangerSoft, fg: colors.danger };
      case 'warning':
        return { bg: colors.warningSoft, fg: colors.warning };
      default:
        return { bg: colors.surfaceMuted, fg: colors.text };
    }
  })();

  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}>
      <View style={[styles.badge, { backgroundColor: tonePalette.bg }]}>
        <Text style={[styles.label, { color: tonePalette.fg }]}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      {hint ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 140,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  value: { fontSize: 22, fontWeight: '800', marginTop: 8 },
  hint: { fontSize: 12, marginTop: 2 },
});
