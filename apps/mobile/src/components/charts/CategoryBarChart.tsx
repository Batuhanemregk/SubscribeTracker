/**
 * CategoryBarChart - Bar chart for spending by category
 * Uses react-native-gifted-charts
 */
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '../../theme';
import type { CategoryData } from '../../types';

interface CategoryBarChartProps {
  data: CategoryData[];
  title?: string;
}

export function CategoryBarChart({ data, title = 'Spending by Category' }: CategoryBarChartProps) {
  const chartWidth = Dimensions.get('window').width - 80;
  
  // Transform data for gifted-charts
  const barData = data.slice(0, 5).map((item) => ({
    value: item.amount,
    label: item.name.slice(0, 5),
    frontColor: item.color,
    gradientColor: `${item.color}80`,
    topLabelComponent: () => (
      <Text style={styles.barLabel}>${item.amount.toFixed(0)}</Text>
    ),
  }));

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="pie-chart" size={18} color={colors.primary} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data to display</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="pie-chart" size={18} color={colors.primary} />
        <Text style={styles.title}>{title}</Text>
      </View>
      
      <BarChart
        data={barData}
        width={chartWidth}
        height={180}
        barWidth={40}
        spacing={20}
        roundedTop
        roundedBottom
        xAxisThickness={0}
        yAxisThickness={0}
        yAxisTextStyle={styles.yAxisText}
        xAxisLabelTextStyle={styles.xAxisLabel}
        noOfSections={4}
        backgroundColor="transparent"
        hideRules
        isAnimated
        animationDuration={500}
      />

      {/* Legend */}
      <View style={styles.legend}>
        {data.slice(0, 5).map((item) => (
          <View key={item.name} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius['2xl'],
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  emptyState: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  yAxisText: {
    color: colors.textMuted,
    fontSize: 10,
  },
  xAxisLabel: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 5,
  },
  barLabel: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
