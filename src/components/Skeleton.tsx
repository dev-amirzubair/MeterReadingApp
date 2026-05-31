import React, { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useAppTheme } from '../theme/useAppTheme';

interface Props {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

/**
 * Pulsing skeleton placeholder. Animates `opacity` between 0.4 and 1.0 on a
 * loop. Cheap (no shimmer gradient) but still feels alive.
 */
export function Skeleton({
  width = '100%',
  height = 14,
  radius = 6,
  style,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: isDark ? colors.surfaceMuted : colors.border,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

interface BlockProps {
  rows?: number;
  /** Height of each row. */
  rowHeight?: number;
  /** Vertical gap between rows. */
  gap?: number;
  style?: ViewStyle;
}

/**
 * Convenience: stack of equal-height skeleton bars.
 */
export function SkeletonStack({
  rows = 3,
  rowHeight = 16,
  gap = 10,
  style,
}: BlockProps) {
  return (
    <View style={style}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={i}
          height={rowHeight}
          width={i === rows - 1 ? '60%' : '100%'}
          style={i === 0 ? undefined : { marginTop: gap }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
});
