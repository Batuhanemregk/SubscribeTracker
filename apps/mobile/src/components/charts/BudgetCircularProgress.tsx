/**
 * BudgetCircularProgress - Animated circular progress for budget screen
 * Uses react-native-gifted-charts
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useTheme } from '../../theme';

interface BudgetCircularProgressProps {
  spent: number;
  budget: number;
  size?: number;
}

export function BudgetCircularProgress({ 
  spent, 
  budget, 
  size = 200 
}: BudgetCircularProgressProps) {
  const { colors } = useTheme();
  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const remaining = Math.max(budget - spent, 0);
  
  // Determine color based on percentage
  const getProgressColor = () => {
    if (percentage >= 90) return colors.red;
    if (percentage >= 75) return colors.amber;
    return colors.emerald;
  };

  const progressColor = getProgressColor();

  // Data for pie chart (donut style)
  const pieData = [
    {
      value: spent,
      color: progressColor,
      gradientCenterColor: progressColor,
    },
    {
      value: remaining,
      color: colors.border,
      gradientCenterColor: colors.bgElevated,
    },
  ];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <PieChart
        data={pieData}
        donut
        radius={size / 2 - 10}
        innerRadius={size / 2 - 30}
        innerCircleColor={colors.bgCard}
        centerLabelComponent={() => (
          <View style={styles.centerLabel}>
            <Text style={[styles.percentage, { color: colors.text }]}>{percentage.toFixed(0)}%</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>of budget</Text>
          </View>
        )}
        isAnimated
        animationDuration={1000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentage: {
    fontSize: 36,
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
    marginTop: 4,
  },
});
