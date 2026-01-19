/**
 * GradientHeroCard - Large hero card for subscription details
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius } from '../../theme';

interface GradientHeroCardProps {
  icon: string;
  name: string;
  amount: number;
  cycle: 'monthly' | 'yearly' | 'weekly' | 'quarterly';
  category: string;
  colorKey: string;
  style?: ViewStyle;
}

export function GradientHeroCard({ 
  icon, 
  name, 
  amount, 
  cycle, 
  category,
  colorKey,
  style 
}: GradientHeroCardProps) {
  const cycleLabel = {
    weekly: 'week',
    monthly: 'month',
    quarterly: 'quarter',
    yearly: 'year',
  }[cycle];

  return (
    <LinearGradient
      colors={[`${colorKey}60`, `${colorKey}30`, colors.bgCard]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      {/* Category Badge */}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{category}</Text>
      </View>

      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: `${colorKey}40` }]}>
        <Text style={styles.iconEmoji}>{icon}</Text>
      </View>

      {/* Name & Price */}
      <Text style={styles.name}>{name}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.priceValue}>${amount.toFixed(2)}</Text>
        <Text style={styles.pricePeriod}> / {cycleLabel}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius['2xl'],
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  categoryText: {
    fontSize: 12,
    color: colors.emerald,
    fontWeight: '600',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconEmoji: {
    fontSize: 28,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  pricePeriod: {
    fontSize: 16,
    color: colors.textMuted,
  },
});
