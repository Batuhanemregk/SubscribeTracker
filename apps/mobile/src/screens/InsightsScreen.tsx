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
  getTopSubscriptions,
  getSubscriptionOverlaps,
  getUpcomingPayments,
  toMonthlyAmount,
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

  // Differentiated insights: biggest spenders, near-term cost, category overlaps.
  const topSpenders = getTopSubscriptions(subscriptions, 5);
  const overlaps = getSubscriptionOverlaps(subscriptions);
  const next30Total = getUpcomingPayments(subscriptions, 30).reduce(
    (sum, s) => sum + convert(s.amount, s.currency || 'TRY', currency),
    0
  );
  const avgPerSub = subs.length > 0 ? monthlyTotal / subs.length : 0;

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

        {/* Quick insight stats */}
        <View style={styles.quickRow}>
          <View style={styles.quickTile}>
            <Text style={styles.quickValue} numberOfLines={1}>{formatCurrency(avgPerSub, currency)}</Text>
            <Text style={styles.quickLabel}>{t('insights.averagePerSub')}</Text>
          </View>
          <View style={styles.quickTile}>
            <Text style={styles.quickValue} numberOfLines={1}>{formatCurrency(next30Total, currency)}</Text>
            <Text style={styles.quickLabel}>{t('insights.next30Days')}</Text>
          </View>
        </View>

        {/* Spending by Category Chart */}
        <CategoryBarChart data={categoryData} />

        {/* Top Spenders */}
        {topSpenders.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('insights.topSpenders')}</Text>
            {topSpenders.map(({ subscription: s }, i) => {
              const m = toMonthlyAmount(convert(s.amount, s.currency || 'TRY', currency), s.cycle);
              const pct = monthlyTotal > 0 ? Math.round((m / monthlyTotal) * 100) : 0;
              const daily = (m * 12) / 365;
              return (
                <View
                  key={s.id}
                  style={[styles.spenderRow, i === topSpenders.length - 1 && styles.lastRow]}
                >
                  <View style={[styles.rankBadge, { backgroundColor: `${colors.primary}20` }]}>
                    <Text style={[styles.rankText, { color: colors.primary }]}>{i + 1}</Text>
                  </View>
                  <View style={styles.spenderInfo}>
                    <Text style={styles.spenderName} numberOfLines={1}>{s.name}</Text>
                    <Text style={styles.spenderSub}>
                      {formatCurrency(daily, currency)}{t('insights.perDay')}
                    </Text>
                  </View>
                  <View style={styles.spenderRight}>
                    <Text style={styles.spenderAmount}>
                      {formatCurrency(m, currency)}{t('common.perMonth')}
                    </Text>
                    <Text style={styles.spenderPct}>{pct}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Possible category overlaps */}
        {overlaps.length > 0 && (
          <View style={styles.card}>
            <View style={styles.overlapHeader}>
              <Ionicons name="git-compare-outline" size={18} color={colors.amber} />
              <Text style={styles.overlapTitle}>{t('insights.possibleOverlaps')}</Text>
            </View>
            <Text style={styles.overlapHintText}>{t('insights.overlapHint')}</Text>
            {overlaps.map((o, i) => (
              <View
                key={o.category}
                style={[styles.overlapRow, i === overlaps.length - 1 && styles.lastRow]}
              >
                <View style={[styles.dot, { backgroundColor: colors.amber }]} />
                <Text style={styles.overlapCategory}>{o.category}</Text>
                <Text style={styles.overlapCount}>{o.count} {t('insights.subscriptions')}</Text>
              </View>
            ))}
          </View>
        )}

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
                <Text style={styles.breakdownAmount}>{formatCurrency(breakdown.weekly.total, currency)}{t('subscription.perWeekShort')}</Text>
              </View>
            </View>
          )}

          {breakdown.quarterly.count > 0 && (
            <View style={styles.breakdownRow}>
              <View style={[styles.dot, { backgroundColor: colors.amber }]} />
              <Text style={styles.breakdownLabel}>{t('addSubscription.quarterly')}</Text>
              <View style={styles.breakdownValues}>
                <Text style={styles.breakdownCount}>{breakdown.quarterly.count} {t('insights.subscriptions')}</Text>
                <Text style={styles.breakdownAmount}>{getCurrencySymbol(currency)}{breakdown.quarterly.total.toFixed(2)}{t('subscription.perQuarterShort')}</Text>
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
  quickRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  quickTile: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  quickLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius['2xl'],
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  spenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
  },
  spenderInfo: {
    flex: 1,
  },
  spenderName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  spenderSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  spenderRight: {
    alignItems: 'flex-end',
  },
  spenderAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  spenderPct: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  overlapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  overlapTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  overlapHintText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 12,
  },
  overlapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  overlapCategory: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  overlapCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
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
