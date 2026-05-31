import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { useAppTheme } from '../theme/useAppTheme';

type Variant = 'solid' | 'outline' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function PrimaryButton({
  label,
  onPress,
  variant = 'solid',
  loading,
  disabled,
  style,
}: Props) {
  const { colors } = useAppTheme();

  const palette = (() => {
    switch (variant) {
      case 'outline':
        return {
          background: 'transparent',
          border: colors.primary,
          text: colors.primary,
        };
      case 'ghost':
        return {
          background: 'transparent',
          border: 'transparent',
          text: colors.primary,
        };
      case 'danger':
        return {
          background: colors.danger,
          border: colors.danger,
          text: '#fff',
        };
      default:
        return {
          background: colors.primary,
          border: colors.primary,
          text: '#fff',
        };
    }
  })();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      android_ripple={{ color: '#ffffff22' }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
