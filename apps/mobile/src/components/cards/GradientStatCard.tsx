/**
 * GradientStatCard - Stats card with gradient background
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, borderRadius } from '../../theme';

interface GradientStatCardProps {
  icon: string;
  iconColor?: string;
  label: string;
  value: string;
  subtitle?: string;
  delay?: number;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function GradientStatCard({
  icon,
  iconColor,
  label,
  value,
  subtitle,
  delay = 0,
  style,
  accessibilityLabel,
}: GradientStatCardProps) {
  const { colors } = useTheme();
  const resolvedIconColor = iconColor || colors.primary;
  
  // Only animate on HomeScreen (when delay > 0)
  const shouldAnimate = delay > 0;
  const opacity = useSharedValue(shouldAnimate ? 0 : 1);
  const translateY = useSharedValue(shouldAnimate ? 20 : 0);

  useEffect(() => {
    if (shouldAnimate) {
      opacity.value = withDelay(delay, withSpring(1));
      translateY.value = withDelay(delay, withSpring(0, { damping: 15 }));
    }
  }, [delay, shouldAnimate]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[styles.container, { borderColor: colors.border }, animatedStyle, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
    >
      <LinearGradient
        colors={[`${resolvedIconColor}25`, `${resolvedIconColor}08`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${resolvedIconColor}20` }]}>
          <Ionicons name={icon as any} size={18} color={resolvedIconColor} />
        </View>
        <Text style={[styles.label, { color: resolvedIconColor }]}>{label}</Text>
        <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  gradient: {
    padding: 16,
    minHeight: 100,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
});

