/**
 * AnimatedTabScreen - Wraps tab screens with a smooth fade-in on focus
 * 
 * Bottom tabs don't support animation prop like native-stack.
 * This wrapper uses Reanimated to apply a fast fade whenever
 * the screen gains focus via React Navigation's useIsFocused.
 */
import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';

interface Props {
  children: React.ReactNode;
}

export function AnimatedTabScreen({ children }: Props) {
  const isFocused = useIsFocused();
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isFocused) {
      opacity.value = 0;
      opacity.value = withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
}
