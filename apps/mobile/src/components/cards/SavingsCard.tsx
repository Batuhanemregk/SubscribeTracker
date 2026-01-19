/**
 * SavingsCard - Potential savings display card
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '../../theme';

interface SavingsCardProps {
  amount: number;
  monthlyCount: number;
  style?: ViewStyle;
}

export function SavingsCard({ amount, monthlyCount, style }: SavingsCardProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Ionicons name="cash" size={24} color={colors.emerald} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>Potential Savings</Text>
        <Text style={styles.description}>
          Save <Text style={styles.amount}>${amount.toFixed(2)}/year</Text> by switching {monthlyCount} monthly subscriptions to yearly plans
        </Text>
        <View style={styles.tipRow}>
          <Ionicons name="bulb" size={14} color={colors.amber} />
          <Text style={styles.tipText}>
            Many services offer 10-20% discount for annual billing
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: `${colors.emerald}15`,
    borderRadius: borderRadius['2xl'],
    padding: 20,
    borderWidth: 1,
    borderColor: `${colors.emerald}30`,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: `${colors.emerald}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  amount: {
    color: colors.emerald,
    fontWeight: '700',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  tipText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
