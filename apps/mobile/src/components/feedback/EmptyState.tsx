/**
 * EmptyState - Empty list placeholder
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
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
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon as any} size={56} color={colors.textMuted} />
      </View>
      
      <Text style={styles.title}>{title}</Text>
      
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
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
    </View>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
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
