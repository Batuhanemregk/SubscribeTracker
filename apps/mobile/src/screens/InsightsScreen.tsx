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
import { useTheme, borderRadius, type ThemeColors } from '../theme';
import { useSubscriptionStore, useSettingsStore, useCurrencyStore } from '../state';
import { 
  getSpendingByCategory, 
  getForecastData, 
  calculatePotentialSavings,
  getBillingCycleBreakdown,
  formatCurrency,
  getCurrencySymbol,
} from '../utils';
import { t } from '../i18n';

export function InsightsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { subscriptions, calculateMonthlyTotalConverted, calculateYearlyTotalConverted, getActiveSubscriptions } = useSubscriptionStore();
  const { app } = useSettingsStore();
  const { convert } = useCurrencyStore();
  const currency = app.currency;

  const subs = getActiveSubscriptions();
  const monthlyTotal = calculateMonthlyTotalConverted(convert, currency);
  const yearlyTotal = calculateYearlyTotalConverted(convert, currency);

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
          title={t('insights.title')}
          subtitle={t('insights.subtitle')}
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
            label={t('insights.monthlyTotal')}
            value={formatCurrency(monthlyTotal, currency)}
            subtitle={t('insights.acrossServices', { count: subs.length })}
            delay={0}
          />
          <GradientStatCard
            icon="calendar-outline"
            iconColor={colors.primary}
            label={t('insights.yearlyTotal')}
            value={formatCurrency(yearlyTotal, currency)}
            subtitle={t('insights.annualProjection')}
            delay={0}
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
          <Text style={styles.breakdownTitle}>{t('insights.billingBreakdown')}</Text>
          
          <View style={styles.breakdownRow}>
            <View style={[styles.dot, { backgroundColor: colors.pink }]} />
            <Text style={styles.breakdownLabel}>{t('addSubscription.monthly')}</Text>
            <View style={styles.breakdownValues}>
              <Text style={styles.breakdownCount}>{breakdown.monthly.count} {t('insights.subscriptions')}</Text>
              <Text style={styles.breakdownAmount}>{formatCurrency(breakdown.monthly.total, currency)}{t('common.perMonth')}</Text>
            </View>
          </View>

          <View style={styles.breakdownRow}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text style={styles.breakdownLabel}>{t('addSubscription.yearly')}</Text>
            <View style={styles.breakdownValues}>
              <Text style={styles.breakdownCount}>{breakdown.yearly.count} {t('insights.subscriptions')}</Text>
              <Text style={styles.breakdownAmount}>{formatCurrency(breakdown.yearly.total, currency)}{t('common.perYear')}</Text>
            </View>
          </View>

          {breakdown.weekly.count > 0 && (
            <View style={styles.breakdownRow}>
              <View style={[styles.dot, { backgroundColor: colors.cyan }]} />
              <Text style={styles.breakdownLabel}>{t('addSubscription.weekly')}</Text>
              <View style={styles.breakdownValues}>
                <Text style={styles.breakdownCount}>{breakdown.weekly.count} {t('insights.subscriptions')}</Text>
                <Text style={styles.breakdownAmount}>{formatCurrency(breakdown.weekly.total, currency)}/wk</Text>
              </View>
            </View>
          )}

          {breakdown.quarterly.count > 0 && (
            <View style={styles.breakdownRow}>
              <View style={[styles.dot, { backgroundColor: colors.amber }]} />
              <Text style={styles.breakdownLabel}>{t('addSubscription.quarterly')}</Text>
              <View style={styles.breakdownValues}>
                <Text style={styles.breakdownCount}>{breakdown.quarterly.count} {t('insights.subscriptions')}</Text>
                <Text style={styles.breakdownAmount}>{getCurrencySymbol(currency)}{breakdown.quarterly.total.toFixed(2)}/qtr</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
    paddingBottom: 140,
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
