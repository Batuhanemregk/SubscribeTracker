/**
 * MonthlyReportScreen - Monthly Spending Summary
 * A shareable monthly report with overview, top subscriptions,
 * category breakdown, and stats.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, borderRadius, type ThemeColors } from '../theme';
import { useSubscriptionStore, useSettingsStore, useCurrencyStore } from '../state';
import {
  toMonthlyAmount,
  formatCurrency,
} from '../utils';
import { t } from '../i18n';
import type { Subscription } from '../types';
import { onMonthlyReportViewed } from '../services/RatingService';

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CATEGORY_COLORS: Record<string, string> = {
  Entertainment: '#EC4899',
  Development: '#8B5CF6',
  Design: '#F59E0B',
  Productivity: '#10B981',
  Music: '#06B6D4',
  Storage: '#3B82F6',
  Finance: '#F97316',
  Health: '#22C55E',
  Education: '#A855F7',
  Other: '#6B7280',
};

/**
 * Returns subscriptions that were active during a given month.
 * Active = created before end of month AND not cancelled before start of month.
 * Paused subscriptions are only excluded when viewing the current month
 * (they were still being paid in past months we have no record of their exact pause date).
 */
export function getSubscriptionsForMonth(
  subscriptions: Subscription[],
  year: number,
  month: number
): Subscription[] {
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

  return subscriptions.filter(sub => {
    // Exclude paused subs only for the current month — for past months we
    // have no reliable pause date, so treat them as active.
    if (sub.status === 'paused' && isCurrentMonth) return false;

    // Must have been created before the end of the target month
    const createdAt = new Date(sub.createdAt);
    if (createdAt > monthEnd) return false;

    // If cancelled, the cancellation must have happened within or after the month
    if (sub.status === 'cancelled') {
      const updatedAt = new Date(sub.updatedAt);
      if (updatedAt < monthStart) return false;
    }

    return true;
  });
}

interface CategoryBreakdownItem {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

/**
 * Groups subscriptions by category, sums monthly amounts (converted to target
 * currency), and calculates percentages.
 */
export function getCategoryBreakdown(
  subscriptions: Subscription[],
  targetCurrency: string,
  convert: (amount: number, from: string, to: string) => number
): CategoryBreakdownItem[] {
  const totals: Record<string, number> = {};
  for (const sub of subscriptions) {
    const monthly = toMonthlyAmount(sub.amount, sub.cycle, sub.customDays);
    const converted = convert(monthly, sub.currency || targetCurrency, targetCurrency);
    totals[sub.category] = (totals[sub.category] || 0) + converted;
  }
  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  return Object.entries(totals)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
      color: CATEGORY_COLORS[name] || '#8B5CF6',
    }))
    .sort((a, b) => b.amount - a.amount);
}

// ---------------------------------------------------------------------------
// MonthlyReportScreen
// ---------------------------------------------------------------------------

interface MonthlyReportScreenProps {
  navigation: any;
}

export function MonthlyReportScreen({ navigation }: MonthlyReportScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { subscriptions } = useSubscriptionStore();
  const { app } = useSettingsStore();
  const { convert } = useCurrencyStore();
  const currency = app.currency;

  // Trigger rating prompt on first mount (fire-and-forget)
  useEffect(() => {
    onMonthlyReportViewed().catch(() => {});
  }, []);

  // Stable reference to "now" — created once at mount so midnight doesn't shift things mid-session
  const now = useRef(new Date()).current;
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  const navigateMonth = (delta: number) => {
    let m = selectedMonth + delta;
    let y = selectedYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }

    // Don't go beyond current month
    if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth())) return;

    // Don't go more than 12 months back
    const monthsBack =
      (now.getFullYear() - y) * 12 + (now.getMonth() - m);
    if (monthsBack > 12) return;

    setSelectedYear(y);
    setSelectedMonth(m);
  };

  // Compute report data
  const activeSubs = useMemo(
    () => getSubscriptionsForMonth(subscriptions, selectedYear, selectedMonth),
    [subscriptions, selectedYear, selectedMonth]
  );

  const totalSpent = useMemo(
    () => activeSubs.reduce((sum, sub) => {
      const monthly = toMonthlyAmount(sub.amount, sub.cycle, sub.customDays);
      return sum + convert(monthly, sub.currency || currency, currency);
    }, 0),
    [activeSubs, currency, convert]
  );

  // Last month total for comparison
  const lastMonthSubs = useMemo(() => {
    let lm = selectedMonth - 1;
    let ly = selectedYear;
    if (lm < 0) { lm = 11; ly -= 1; }
    return getSubscriptionsForMonth(subscriptions, ly, lm);
  }, [subscriptions, selectedYear, selectedMonth]);

  const lastMonthTotal = useMemo(
    () => lastMonthSubs.reduce((sum, sub) => {
      const monthly = toMonthlyAmount(sub.amount, sub.cycle, sub.customDays);
      return sum + convert(monthly, sub.currency || currency, currency);
    }, 0),
    [lastMonthSubs, currency, convert]
  );

  const vsLastMonth = totalSpent - lastMonthTotal;
  const vsLastMonthIsDecrease = vsLastMonth < -0.01;
  const vsLastMonthIsIncrease = vsLastMonth > 0.01;
  const vsColor = vsLastMonthIsDecrease ? colors.emerald : vsLastMonthIsIncrease ? colors.pink : colors.textMuted;

  // Top 3 subscriptions by monthly amount
  const topSubs = useMemo(() =>
    [...activeSubs]
      .map(sub => ({
        sub,
        monthly: convert(
          toMonthlyAmount(sub.amount, sub.cycle, sub.customDays),
          sub.currency || currency,
          currency
        ),
      }))
      .sort((a, b) => b.monthly - a.monthly)
      .slice(0, 3),
    [activeSubs, currency, convert]
  );

  // Category breakdown (with currency conversion)
  const categoryBreakdown = useMemo(
    () => getCategoryBreakdown(activeSubs, currency, convert),
    [activeSubs, currency, convert]
  );

  // Memoized month boundaries used for "new/cancelled this month" filters
  const { monthStart, monthEnd, daysInMonth } = useMemo(() => {
    const start = new Date(selectedYear, selectedMonth, 1);
    const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    const days = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return { monthStart: start, monthEnd: end, daysInMonth: days };
  }, [selectedYear, selectedMonth]);

  const dailyAverage = daysInMonth > 0 ? totalSpent / daysInMonth : 0;

  const sortedByAmount = useMemo(() =>
    [...activeSubs].sort((a, b) =>
      toMonthlyAmount(b.amount, b.cycle, b.customDays) - toMonthlyAmount(a.amount, a.cycle, a.customDays)
    ),
    [activeSubs]
  );
  const mostExpensive = sortedByAmount[0];
  const cheapest = sortedByAmount[sortedByAmount.length - 1];

  // New this month
  const newThisMonth = useMemo(() =>
    activeSubs.filter(sub => {
      const created = new Date(sub.createdAt);
      return created >= monthStart && created <= monthEnd;
    }).length,
    [activeSubs, monthStart, monthEnd]
  );

  // Cancelled this month
  const cancelledThisMonth = useMemo(() =>
    subscriptions.filter(sub => {
      if (sub.status !== 'cancelled') return false;
      const updated = new Date(sub.updatedAt);
      return updated >= monthStart && updated <= monthEnd;
    }).length,
    [subscriptions, monthStart, monthEnd]
  );

  // Share handler
  const handleShare = async () => {
    const monthLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    const topSubsText = topSubs
      .map((item, i) => `${i + 1}. ${item.sub.name} — ${formatCurrency(item.monthly, currency)}`)
      .join('\n');

    const message = [
      `Subscription Report — ${monthLabel}`,
      `${'━'.repeat(20)}`,
      `Total: ${formatCurrency(totalSpent, currency)}/mo (${activeSubs.length} subscriptions)`,
      '',
      `Top Subscriptions:`,
      topSubsText,
      '',
      t('monthlyReport.generatedWith'),
    ].join('\n');

    try {
      await Share.share({ message });
    } catch (_) {
      // user dismissed
    }
  };

  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const hasData = activeSubs.length > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('monthlyReport.title')}</Text>
        <View style={styles.backButton} />
      </View>

      {/* Month selector */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.arrowButton}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {MONTH_NAMES[selectedMonth]} {selectedYear}
        </Text>
        <TouchableOpacity
          onPress={() => navigateMonth(1)}
          style={[styles.arrowButton, isCurrentMonth && styles.arrowDisabled]}
          disabled={isCurrentMonth}
        >
          <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? colors.textMuted : colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {!hasData ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>{t('monthlyReport.noData')}</Text>
          </View>
        ) : (
          <>
            {/* Section 1 — Overview */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>{t('monthlyReport.totalSpent')}</Text>
              <Text style={styles.totalAmount}>{formatCurrency(totalSpent, currency)}</Text>
              <Text style={styles.activeCount}>
                {t('monthlyReport.activeSubscriptions', { count: activeSubs.length })}
              </Text>

              {(vsLastMonthIsDecrease || vsLastMonthIsIncrease) && (
                <View style={[styles.vsBadge, { backgroundColor: `${vsColor}18`, borderColor: `${vsColor}40` }]}>
                  <Ionicons
                    name={vsLastMonthIsDecrease ? 'trending-down' : 'trending-up'}
                    size={14}
                    color={vsColor}
                  />
                  <Text style={[styles.vsText, { color: vsColor }]}>
                    {vsLastMonthIsDecrease ? '-' : '+'}{formatCurrency(Math.abs(vsLastMonth), currency)}{' '}
                    {t('monthlyReport.vsLastMonth')}
                  </Text>
                </View>
              )}
            </View>

            {/* Section 2 — Top Subscriptions */}
            {topSubs.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('monthlyReport.topExpensive')}</Text>
                {topSubs.map(({ sub, monthly }, index) => (
                  <View
                    key={sub.id}
                    style={[styles.topSubRow, index < topSubs.length - 1 && styles.rowBorder]}
                  >
                    <Text style={styles.rankNumber}>{index + 1}</Text>
                    <Text style={styles.subIcon}>{sub.iconKey}</Text>
                    <Text style={styles.subName} numberOfLines={1}>{sub.name}</Text>
                    <Text style={styles.subMonthly}>{formatCurrency(monthly, currency)}{t('common.perMonth')}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Section 3 — Category Breakdown */}
            {categoryBreakdown.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('monthlyReport.categoryBreakdown')}</Text>
                {categoryBreakdown.map((cat, index) => (
                  <View
                    key={cat.name}
                    style={[styles.categoryRow, index < categoryBreakdown.length - 1 && styles.rowBorder]}
                  >
                    <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                    <Text style={styles.categoryName} numberOfLines={1}>{cat.name}</Text>
                    <View style={styles.categoryRight}>
                      <Text style={styles.categoryAmount}>{formatCurrency(cat.amount, currency)}</Text>
                      <Text style={styles.categoryPercent}>{cat.percentage.toFixed(1)}%</Text>
                    </View>
                  </View>
                ))}

                {/* Simple bar chart */}
                <View style={styles.barsContainer}>
                  {categoryBreakdown.map(cat => (
                    <View key={cat.name} style={styles.barRow}>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              width: `${Math.min(cat.percentage, 100)}%` as any,
                              backgroundColor: cat.color,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Section 4 — Stats */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('monthlyReport.stats')}</Text>

              <View style={[styles.statRow, styles.rowBorder]}>
                <Text style={styles.statLabel}>{t('monthlyReport.dailyAverage')}</Text>
                <Text style={styles.statValue}>{formatCurrency(dailyAverage, currency)}</Text>
              </View>

              {mostExpensive && (
                <View style={[styles.statRow, styles.rowBorder]}>
                  <Text style={styles.statLabel}>{t('monthlyReport.mostExpensive')}</Text>
                  <Text style={styles.statValue} numberOfLines={1}>
                    {mostExpensive.name} ({formatCurrency(
                      toMonthlyAmount(mostExpensive.amount, mostExpensive.cycle, mostExpensive.customDays),
                      currency
                    )})
                  </Text>
                </View>
              )}

              {cheapest && cheapest.id !== mostExpensive?.id && (
                <View style={[styles.statRow, styles.rowBorder]}>
                  <Text style={styles.statLabel}>{t('monthlyReport.cheapest')}</Text>
                  <Text style={styles.statValue} numberOfLines={1}>
                    {cheapest.name} ({formatCurrency(
                      toMonthlyAmount(cheapest.amount, cheapest.cycle, cheapest.customDays),
                      currency
                    )})
                  </Text>
                </View>
              )}

              <View style={[styles.statRow, styles.rowBorder]}>
                <Text style={styles.statLabel}>{t('monthlyReport.newThisMonth')}</Text>
                <Text style={styles.statValue}>{newThisMonth}</Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('monthlyReport.cancelledThisMonth')}</Text>
                <Text style={styles.statValue}>{cancelledThisMonth}</Text>
              </View>
            </View>

            {/* Section 5 — Footer */}
            <View style={styles.footer}>
              <View style={styles.footerBrand}>
                <Ionicons name="stats-chart" size={16} color={colors.primary} />
                <Text style={styles.footerBrandText}>Finify</Text>
              </View>
              <Text style={styles.footerDate}>
                {t('monthlyReport.generatedWith')} · {generatedDate}
              </Text>
            </View>

            {/* Share button */}
            <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="share-outline" size={20} color="#FFFFFF" />
              <Text style={styles.shareButtonText}>{t('monthlyReport.share')}</Text>
            </TouchableOpacity>
          </>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 20,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowDisabled: {
    opacity: 0.35,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    minWidth: 160,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 140,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius['2xl'],
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
    marginBottom: 4,
  },
  activeCount: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 12,
  },
  vsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  vsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  rankNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    width: 20,
    textAlign: 'center',
  },
  subIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  subName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  subMonthly: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 10,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  categoryPercent: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  barsContainer: {
    marginTop: 14,
    gap: 6,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textMuted,
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerBrandText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  footerDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: 16,
    marginBottom: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
