/**
 * InsightsScreen - Analytics Overview
 * Uses Zustand stores, calculation utils, and gifted-charts
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { 
  Header, 
  GradientStatCard, 
  SavingsCard,
  CategoryBarChart,
  ForecastLineChart,
} from '../components';
import { colors, borderRadius } from '../theme';
import { useSubscriptionStore } from '../state';
import { 
  getSpendingByCategory, 
  getForecastData, 
  calculatePotentialSavings,
  getBillingCycleBreakdown,
} from '../utils';

export function InsightsScreen() {
  const { subscriptions, calculateMonthlyTotal, calculateYearlyTotal, getActiveSubscriptions } = useSubscriptionStore();

  const subs = getActiveSubscriptions();
  const monthlyTotal = calculateMonthlyTotal();
  const yearlyTotal = calculateYearlyTotal();

  // Get analytics data using utils
  const categoryData = getSpendingByCategory(subscriptions);
  const forecastData = getForecastData(monthlyTotal);
  const savings = calculatePotentialSavings(subscriptions);
  const breakdown = getBillingCycleBreakdown(subscriptions);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Header
          icon="trending-up"
          iconColor={colors.primary}
          title="Analytics"
          subtitle="Insights into your spending"
        />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Monthly / Yearly Total Cards */}
        <View style={styles.statsRow}>
          <GradientStatCard
            icon="cash-outline"
            iconColor={colors.emerald}
            label="Monthly Total"
            value={`$${monthlyTotal.toFixed(2)}`}
            subtitle={`Across ${subs.length} services`}
            delay={0}
          />
          <GradientStatCard
            icon="calendar-outline"
            iconColor={colors.primary}
            label="Yearly Total"
            value={`$${yearlyTotal.toFixed(2)}`}
            subtitle="Annual projection"
            delay={100}
          />
        </View>

        {/* Spending by Category Chart */}
        <CategoryBarChart data={categoryData} />

        {/* 6-Month Forecast Chart */}
        <ForecastLineChart data={forecastData} />

        {/* Potential Savings Card */}
        {savings.monthlyCount > 0 && (
          <SavingsCard
            amount={savings.amount}
            monthlyCount={savings.monthlyCount}
            style={{ marginBottom: 20 }}
          />
        )}

        {/* Billing Cycle Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Billing Cycle Breakdown</Text>
          
          <View style={styles.breakdownRow}>
            <View style={[styles.dot, { backgroundColor: colors.pink }]} />
            <Text style={styles.breakdownLabel}>Monthly</Text>
            <View style={styles.breakdownValues}>
              <Text style={styles.breakdownCount}>{breakdown.monthly.count} subscriptions</Text>
              <Text style={styles.breakdownAmount}>${breakdown.monthly.total.toFixed(2)}/mo</Text>
            </View>
          </View>

          <View style={styles.breakdownRow}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text style={styles.breakdownLabel}>Yearly</Text>
            <View style={styles.breakdownValues}>
              <Text style={styles.breakdownCount}>{breakdown.yearly.count} subscriptions</Text>
              <Text style={styles.breakdownAmount}>${breakdown.yearly.total.toFixed(2)}/yr</Text>
            </View>
          </View>

          {breakdown.weekly.count > 0 && (
            <View style={styles.breakdownRow}>
              <View style={[styles.dot, { backgroundColor: colors.cyan }]} />
              <Text style={styles.breakdownLabel}>Weekly</Text>
              <View style={styles.breakdownValues}>
                <Text style={styles.breakdownCount}>{breakdown.weekly.count} subscriptions</Text>
                <Text style={styles.breakdownAmount}>${breakdown.weekly.total.toFixed(2)}/wk</Text>
              </View>
            </View>
          )}

          {breakdown.quarterly.count > 0 && (
            <View style={styles.breakdownRow}>
              <View style={[styles.dot, { backgroundColor: colors.amber }]} />
              <Text style={styles.breakdownLabel}>Quarterly</Text>
              <View style={styles.breakdownValues}>
                <Text style={styles.breakdownCount}>{breakdown.quarterly.count} subscriptions</Text>
                <Text style={styles.breakdownAmount}>${breakdown.quarterly.total.toFixed(2)}/qtr</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  breakdownCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius['2xl'],
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 20,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  breakdownLabel: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  breakdownValues: {
    alignItems: 'flex-end',
  },
  breakdownCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  breakdownAmount: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
