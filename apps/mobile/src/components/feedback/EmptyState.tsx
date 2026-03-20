/**
 * EmptyState - Empty list placeholder with fade-in animation
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { PrimaryButton } from '../buttons/PrimaryButton';
import { SecondaryButton } from '../buttons/SecondaryButton';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  primaryAction?: {
    title: string;
    onPress: () => void;
  };
  secondaryAction?: {
    title: string;
    onPress: () => void;
  };
  style?: ViewStyle;
}

export function EmptyState({ 
  icon = 'apps-outline',
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  style 
}: EmptyStateProps) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(200, withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }));
    translateY.value = withDelay(200, withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}12` }]}>
        <Ionicons name={icon as any} size={48} color={colors.primary} />
      </View>
      
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      )}

      {(primaryAction || secondaryAction) && (
        <View style={styles.actions}>
          {primaryAction && (
            <PrimaryButton 
              title={primaryAction.title} 
              onPress={primaryAction.onPress}
              fullWidth={false}
              style={styles.button}
            />
          )}
          {secondaryAction && (
            <SecondaryButton 
              title={secondaryAction.title} 
              onPress={secondaryAction.onPress}
              fullWidth={false}
              style={styles.button}
            />
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    paddingHorizontal: 20,
  },
});
