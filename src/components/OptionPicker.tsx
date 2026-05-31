import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../theme/useAppTheme';

export interface PickerOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface Props<T extends string> {
  label?: string;
  value: T | null | undefined;
  options: PickerOption<T>[];
  onChange: (value: T) => void;
  errorText?: string;
  /** When true, options render in a horizontally scrolling pill row. */
  horizontal?: boolean;
}

export function OptionPicker<T extends string>({
  label,
  value,
  options,
  onChange,
  errorText,
  horizontal = true,
}: Props<T>) {
  const { colors } = useAppTheme();

  const pill = (opt: PickerOption<T>) => {
    const selected = opt.value === value;
    return (
      <Pressable
        key={opt.value}
        onPress={() => onChange(opt.value)}
        style={[
          styles.pill,
          {
            backgroundColor: selected ? colors.primary : colors.surface,
            borderColor: selected ? colors.primary : colors.border,
          },
        ]}>
        <Text
          style={{
            color: selected ? '#fff' : colors.text,
            fontWeight: '600',
            fontSize: 13,
          }}>
          {opt.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      ) : null}

      {horizontal ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}>
          {options.map(pill)}
        </ScrollView>
      ) : (
        <View style={styles.grid}>{options.map(pill)}</View>
      )}

      {errorText ? (
        <Text style={[styles.error, { color: colors.danger }]}>{errorText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  label: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  row: { gap: 8, paddingVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  error: { marginTop: 4, fontSize: 12 },
});
