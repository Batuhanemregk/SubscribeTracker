/**
 * GoalProgressCard - Shows progress toward a savings goal
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { formatCurrency } from '../utils';

interface GoalProgressCardProps {
  goal: {
    targetMonthlySpend: number;
    isActive: boolean;
  };
  currentSpend: number;
  currency: string;
}

export function GoalProgressCard({ goal, currentSpend, currency }: GoalProgressCardProps) {
  const { colors } = useTheme();
  const percentage =
    goal.targetMonthlySpend > 0 ? Math.min((currentSpend / goal.targetMonthlySpend) * 100, 100) : 0;
  const isOverBudget = currentSpend > goal.targetMonthlySpend;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <Ionicons name="flag-outline" size={20} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Savings Goal</Text>
      </View>
      <Text style={[styles.amount, { color: colors.text }]}>
        {formatCurrency(currentSpend, currency)} /{' '}
        {formatCurrency(goal.targetMonthlySpend, currency)}
      </Text>
      <View style={[styles.progressBar, { backgroundColor: `${colors.text}10` }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: isOverBudget ? colors.red || '#EF4444' : colors.emerald,
            },
          ]}
        />
      </View>
      <Text
        style={[
          styles.percentage,
          { color: isOverBudget ? colors.red || '#EF4444' : colors.emerald },
        ]}
      >
        {percentage.toFixed(0)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  amount: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentage: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
});
