import React, { PropsWithChildren } from 'react';
import { type ViewStyle } from 'react-native';
import Animated, { FadeInUp as RNFadeInUp } from 'react-native-reanimated';

interface Props {
  /** Delay in ms before the animation starts. Useful for stagger. */
  delay?: number;
  /** Duration in ms. Defaults to 280. */
  duration?: number;
  style?: ViewStyle | ViewStyle[];
}

/**
 * Lightweight entrance wrapper: fades in while sliding up 12 px.
 *
 * Use to stagger lists of cards/tiles by passing successive `delay` values
 * (e.g. `delay={index * 60}`). Animation only fires on mount, so wrapping
 * a list item is the right place — the parent list does not re-trigger it.
 */
export function FadeInUp({
  children,
  delay = 0,
  duration = 280,
  style,
}: PropsWithChildren<Props>) {
  return (
    <Animated.View
      entering={RNFadeInUp.duration(duration).delay(delay)}
      style={style}>
      {children}
    </Animated.View>
  );
}
