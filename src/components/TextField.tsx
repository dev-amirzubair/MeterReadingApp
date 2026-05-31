import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { useAppTheme } from '../theme/useAppTheme';

interface Props extends TextInputProps {
  label?: string;
  errorText?: string;
}

export function TextField({ label, errorText, style, ...rest }: Props) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...rest}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: errorText ? colors.danger : colors.border,
          },
          style,
        ]}
      />
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
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  error: {
    marginTop: 4,
    fontSize: 12,
  },
});
