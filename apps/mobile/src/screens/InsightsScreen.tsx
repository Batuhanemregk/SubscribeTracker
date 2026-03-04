/**
 * InsightsScreen - Analytics Overview
 * Uses Zustand stores, calculation utils, and gifted-charts
 */
import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import {
  Header,
  GradientStatCard,
  SavingsCard,
  CategoryBarChart,
  ForecastLineChart,
  AlternativeSuggestionCard,
  GoalProgressCard,
  HealthScoreCard,
  BundleSuggestionCard,
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
  getMonthlySpendingTrend,
  getMonthOverMonthChange,
  predictNextMonthSpending,
  getWastefulSubscriptions,
  calculateValueScore,
  getValueLabel,
  getValueColor,
  toMonthlyAmount,
  getAlternativeSuggestions,
  calculateHealthScore,
  detectBundleOpportunities,
  type AlternativeSuggestion,
  type BundleSuggestion,
} from '../utils';
import knownServicesData from '../data/known-services.json';
import { t } from '../i18n';
import type { CategoryData } from '../types';
import { onGoalReached } from '../services/RatingService';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ---------------------------------------------------------------------------
// Expandable Category Card
// ---------------------------------------------------------------------------

interface ExpandableCategoryCardProps {
  category: CategoryData;
  subscriptions: import('../types').Subscription[];
  currency: string;
}

function ExpandableCategoryCard({ category, subscriptions, currency }: ExpandableCategoryCardProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [expanded, setExpanded] = useState(false);
  const animHeight = useRef(new Animated.Value(0)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;

  const categorySubs = subscriptions.filter(
    s => s.status === 'active' && s.category === category.name
  );

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expanded) {
      Animated.parallel([
        Animated.timing(animHeight, { toValue: 0, duration: 250, useNativeDriver: false }),
        Animated.timing(animOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(animHeight, {
          toValue: categorySubs.length * 52,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(animOpacity, { toValue: 1, duration: 250, useNativeDriver: false }),
      ]).start();
    }
    setExpanded(prev => !prev);
  };

  return (
    <View style={styles.expandableCard}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.7} style={styles.expandableHeader}>
        <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
        <View style={styles.expandableLabelGroup}>
          <Text style={styles.expandableName}>{category.name}</Text>
          <Text style={styles.expandableHint}>{t('insights.tapToExpand')}</Text>
        </View>
        <View style={styles.expandableRight}>
          <Text style={styles.expandableAmount}>
            {formatCurrency(category.amount, currency)}{t('common.perMonth')}
          </Text>
          <Text style={styles.expandablePercent}>{category.percentage.toFixed(1)}%</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textMuted}
            style={{ marginLeft: 4 }}
          />
        </View>
      </TouchableOpacity>

      <Animated.View style={{ height: animHeight, opacity: animOpacity, overflow: 'hidden' }}>
        {categorySubs.map((sub, idx) => (
          <View
            key={sub.id}
            style={[
              styles.subItem,
              idx < categorySubs.length - 1 && styles.subItemBorder,
            ]}
          >
            <Text style={styles.subIcon}>{sub.iconKey}</Text>
            <Text style={styles.subName} numberOfLines={1}>{sub.name}</Text>
            <Text style={styles.subAmount}>
              {formatCurrency(sub.amount, currency)}/{sub.cycle === 'monthly' ? 'mo' : sub.cycle === 'yearly' ? 'yr' : sub.cycle}
            </Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// InsightsScreen
// ---------------------------------------------------------------------------

export function InsightsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<any>();
  const { subscriptions, calculateMonthlyTotalConverted, calculateYearlyTotalConverted, getActiveSubscriptions } = useSubscriptionStore();
  const { app, savingsGoal, setSavingsGoal, clearSavingsGoal } = useSettingsStore();
  const { convert } = useCurrencyStore();
  const currency = app.currency;

  // Goal-setting local state
  const [customTarget, setCustomTarget] = useState('');

  const subs = getActiveSubscriptions();
  const monthlyTotal = calculateMonthlyTotalConverted(convert, currency);
  const yearlyTotal = calculateYearlyTotalConverted(convert, currency);

  // Trigger rating prompt when savings goal is reached (fire-and-forget)
  useEffect(() => {
    if (savingsGoal?.isActive && monthlyTotal <= savingsGoal.targetMonthlySpend) {
      onGoalReached().catch(() => {});
    }
  }, [savingsGoal, monthlyTotal]);

  // Value Check data
  const ratedSubs = subs.filter(s => s.usageRating !== undefined && s.usageRating !== null);
  const showValueCheck = ratedSubs.length >= 2;
  const wastefulSubs = getWastefulSubscriptions(subs, currency).slice(0, 3);
  const maxMonthly = ratedSubs.length > 0
    ? Math.max(...ratedSubs.map(s => toMonthlyAmount(s.amount, s.cycle, s.customDays)), 1)
    : 1;
  const poorOrWastefulMonthly = ratedSubs
    .filter(s => {
      const mAmt = toMonthlyAmount(s.amount, s.cycle, s.customDays);
      const score = calculateValueScore(s.usageRating, mAmt, maxMonthly);
      const label = getValueLabel(score);
      return label === 'poor' || label === 'wasteful';
    })
    .reduce((sum, s) => sum + toMonthlyAmount(s.amount, s.cycle, s.customDays), 0);

  // Health Score
  const healthScore = useMemo(() => calculateHealthScore(subscriptions), [subscriptions]);

  // Bundle Detection
  const [dismissedBundles, setDismissedBundles] = useState<Set<string>>(new Set());
  const bundleSuggestions = useMemo(() => detectBundleOpportunities(subscriptions), [subscriptions]);
  const visibleBundles = useMemo(
    () => bundleSuggestions.filter(s => !dismissedBundles.has(s.bundle.id)),
    [bundleSuggestions, dismissedBundles],
  );

  // Existing analytics
  const categoryData = getSpendingByCategory(subscriptions);
  const forecastData = getForecastData(monthlyTotal);
  const savings = calculatePotentialSavings(subscriptions);
  const breakdown = getBillingCycleBreakdown(subscriptions);

  // Alternative suggestions
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  const allSuggestions = useMemo(
    () => getAlternativeSuggestions(subs, (knownServicesData as any).services),
    [subs]
  );

  const visibleSuggestions = useMemo(
    () => allSuggestions
      .filter(s => !dismissedSuggestions.has(`${s.currentService}|${s.alternativeName}`))
      .slice(0, 3),
    [allSuggestions, dismissedSuggestions]
  );

  const totalPotentialSavings = useMemo(
    () => visibleSuggestions.reduce((sum, s) => sum + s.savings, 0),
    [visibleSuggestions]
  );

  const handleDismissSuggestion = (suggestion: AlternativeSuggestion) => {
    setDismissedSuggestions(prev => {
      const next = new Set(prev);
      next.add(`${suggestion.currentService}|${suggestion.alternativeName}`);
      return next;
    });
  };

  // New analytics
  const trendData = getMonthlySpendingTrend(subscriptions, 6);
  const momChange = getMonthOverMonthChange(subscriptions);
  const predictedNext = predictNextMonthSpending(subscriptions);

  // Prepare LineChart data format for react-native-gifted-charts
  const lineChartData = trendData.map(d => ({ value: d.amount, label: d.month }));

  // Month-over-month colour logic: spending decreased = green (good), increased = red (bad)
  const momColor =
    momChange.direction === 'down' ? colors.emerald :
    momChange.direction === 'up' ? colors.pink :
    colors.textMuted;

  const momIcon: 'trending-down' | 'trending-up' | 'remove-outline' =
    momChange.direction === 'down' ? 'trending-down' :
    momChange.direction === 'up' ? 'trending-up' :
    'remove-outline';

  const momLabel =
    momChange.direction === 'down' ? t('insights.decreased') :
    momChange.direction === 'up' ? t('insights.increased') :
    t('insights.noChange');

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
        {/* Monthly Report shortcut */}
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => navigation.navigate('MonthlyReport')}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text-outline" size={18} color={colors.primary} />
          <Text style={styles.reportButtonText}>{t('monthlyReport.viewReport')}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>

        {/* ---------------------------------------------------------------- */}
        {/* Health Score                                                     */}
        {/* ---------------------------------------------------------------- */}
        <HealthScoreCard score={healthScore} />

        {/* ---------------------------------------------------------------- */}
        {/* Savings Goal Section                                            */}
        {/* ---------------------------------------------------------------- */}
        {savingsGoal?.isActive ? (
          <View style={styles.card}>
            <GoalProgressCard
              goal={savingsGoal}
              currentSpend={monthlyTotal}
              currency={currency}
            />
            <View style={styles.goalActions}>
              <TouchableOpacity
                onPress={() => {
                  setCustomTarget(savingsGoal.targetMonthlySpend.toString());
                }}
              >
                <Text style={[styles.goalActionText, { color: colors.primary }]}>
                  {t('savingsGoal.updateGoal')}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.goalActionSep, { color: colors.textMuted }]}> · </Text>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    t('savingsGoal.clearGoal'),
                    t('savingsGoal.clearConfirm'),
                    [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('common.ok'), onPress: () => clearSavingsGoal() },
                    ]
                  );
                }}
              >
                <Text style={[styles.goalActionText, { color: colors.pink }]}>
                  {t('savingsGoal.clearGoal')}
                </Text>
              </TouchableOpacity>
            </View>
            {/* Inline update target field */}
            {customTarget !== '' && (
              <View style={styles.goalUpdateRow}>
                <TextInput
                  style={[styles.goalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
                  value={customTarget}
                  onChangeText={setCustomTarget}
                  keyboardType="decimal-pad"
                  placeholder="New target"
                  placeholderTextColor={colors.textMuted}
                />
                <TouchableOpacity
                  style={[styles.goalSaveBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    const val = parseFloat(customTarget);
                    if (!isNaN(val) && val > 0) {
                      setSavingsGoal(val, savingsGoal.startAmount);
                      setCustomTarget('');
                    }
                  }}
                >
                  <Text style={styles.goalSaveBtnText}>{t('common.save')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCustomTarget('')}
                  style={styles.goalCancelBtn}
                >
                  <Text style={[styles.goalCancelBtnText, { color: colors.textMuted }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.setGoalHeader}>
              <Ionicons name="trophy-outline" size={18} color={colors.amber} />
              <Text style={[styles.cardTitle, { marginBottom: 0 }]}>{t('savingsGoal.setGoal')}</Text>
            </View>
            <Text style={[styles.goalChallenge, { color: colors.textSecondary }]}>
              {t('savingsGoal.challenge')}
            </Text>
            <Text style={[styles.goalCurrentLabel, { color: colors.textMuted }]}>
              {t('savingsGoal.currentSpend', { amount: formatCurrency(monthlyTotal, currency) })}
            </Text>

            {/* Quick reduction buttons */}
            <View style={styles.goalQuickRow}>
              {[10, 20, 30].map((pct) => {
                const target = Math.max(monthlyTotal * (1 - pct / 100), 0);
                return (
                  <TouchableOpacity
                    key={pct}
                    style={[styles.goalQuickBtn, { borderColor: colors.primary, backgroundColor: `${colors.primary}12` }]}
                    onPress={() => setSavingsGoal(target, monthlyTotal)}
                  >
                    <Text style={[styles.goalQuickBtnText, { color: colors.primary }]}>
                      {t(`savingsGoal.reduce${pct}` as any)}
                    </Text>
                    <Text style={[styles.goalQuickBtnAmount, { color: colors.textMuted }]}>
                      {formatCurrency(target, currency)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom target */}
            <View style={styles.goalCustomRow}>
              <TextInput
                style={[styles.goalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg, flex: 1 }]}
                value={customTarget}
                onChangeText={setCustomTarget}
                keyboardType="decimal-pad"
                placeholder={t('savingsGoal.customTarget')}
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity
                style={[styles.goalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  const val = parseFloat(customTarget);
                  if (!isNaN(val) && val > 0 && val < monthlyTotal) {
                    setSavingsGoal(val, monthlyTotal);
                    setCustomTarget('');
                  }
                }}
              >
                <Text style={styles.goalSaveBtnText}>{t('savingsGoal.startTracking')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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

        {/* ---------------------------------------------------------------- */}
        {/* A. Spending Trend Chart (last 6 months, actual)                  */}
        {/* ---------------------------------------------------------------- */}
        {lineChartData.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('insights.spendingTrend')}</Text>
            <LineChart
              data={lineChartData}
              color={colors.primary}
              thickness={2}
              dataPointsColor={colors.primary}
              dataPointsRadius={4}
              startFillColor={colors.primary}
              endFillColor={colors.bg}
              startOpacity={0.25}
              endOpacity={0.02}
              areaChart
              curved
              hideYAxisText={false}
              yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
              noOfSections={4}
              width={280}
              height={160}
              rulesColor={colors.border}
              rulesType="solid"
              initialSpacing={16}
              spacing={44}
              hideAxesAndRules={false}
              xAxisColor={colors.border}
              yAxisColor={colors.border}
            />
          </View>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Value Check Section                                              */}
        {/* ---------------------------------------------------------------- */}
        {showValueCheck && (
          <View style={styles.card}>
            <View style={styles.valueCheckHeader}>
              <Ionicons name="bulb-outline" size={18} color={colors.amber} />
              <Text style={styles.cardTitle}>{t('usageScore.valueCheck')}</Text>
            </View>

            {wastefulSubs.length === 0 ? (
              <Text style={styles.valueCheckEmpty}>{t('usageScore.rateToSee')}</Text>
            ) : (
              <>
                {wastefulSubs.map((sub) => {
                  const mAmt = toMonthlyAmount(sub.amount, sub.cycle, sub.customDays);
                  const score = calculateValueScore(sub.usageRating, mAmt, maxMonthly);
                  const label = getValueLabel(score);
                  const vColor = getValueColor(score);
                  const USAGE_EMOJIS = ['😫', '😕', '😐', '🙂', '😍'];
                  return (
                    <View key={sub.id} style={styles.valueCheckItem}>
                      <View style={styles.valueCheckIcon}>
                        <Text style={styles.valueCheckEmoji}>{sub.iconKey}</Text>
                      </View>
                      <View style={styles.valueCheckInfo}>
                        <Text style={styles.valueCheckName} numberOfLines={1}>{sub.name}</Text>
                        <Text style={styles.valueCheckPrice}>
                          {formatCurrency(mAmt, currency)}{t('common.perMonth')}
                        </Text>
                        {sub.usageRating !== undefined && (
                          <Text style={styles.valueCheckRatingEmoji}>
                            {USAGE_EMOJIS[(sub.usageRating ?? 1) - 1]}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.valueCheckBadge, { backgroundColor: `${vColor}20`, borderColor: `${vColor}40` }]}>
                        <Text style={[styles.valueCheckBadgeText, { color: vColor }]}>
                          {t(`usageScore.${label}`)}
                        </Text>
                      </View>
                    </View>
                  );
                })}

                {poorOrWastefulMonthly > 0 && (
                  <View style={styles.valueCheckSummary}>
                    <Ionicons name="trending-down" size={14} color={colors.emerald} />
                    <Text style={styles.valueCheckSummaryText}>
                      {t('usageScore.couldSave', { amount: formatCurrency(poorOrWastefulMonthly, currency) })}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Bundle Savings Suggestions                                       */}
        {/* ---------------------------------------------------------------- */}
        {visibleBundles.length > 0 && (
          <View style={styles.card}>
            <View style={styles.altSectionHeader}>
              <Ionicons name="layers-outline" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>{t('bundles.title')}</Text>
            </View>
            <Text style={[styles.goalChallenge, { color: colors.textSecondary, marginBottom: 12 }]}>
              {t('bundles.subtitle')}
            </Text>
            {visibleBundles.map((suggestion) => (
              <BundleSuggestionCard
                key={suggestion.bundle.id}
                suggestion={suggestion}
                currency={currency}
                onDismiss={() => {
                  setDismissedBundles(prev => {
                    const next = new Set(prev);
                    next.add(suggestion.bundle.id);
                    return next;
                  });
                }}
              />
            ))}
          </View>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* B. Month-over-Month Comparison + C. Predicted Next Month         */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.statsRow}>
          {/* Month-over-Month */}
          <View style={[styles.miniCard, { flex: 1 }]}>
            <Text style={styles.miniCardLabel}>{t('insights.monthOverMonth')}</Text>
            {momChange.direction === 'same' ? (
              <View style={styles.momRow}>
                <Ionicons name="remove-outline" size={20} color={colors.textMuted} />
                <Text style={[styles.momChangeText, { color: colors.textMuted }]}>
                  {t('insights.noChange')}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.momRow}>
                  <Ionicons name={momIcon} size={20} color={momColor} />
                  <Text style={[styles.momChangeAmount, { color: momColor }]}>
                    {momChange.percentage}%
                  </Text>
                </View>
                <Text style={styles.momSubLabel}>
                  {momLabel} {t('insights.vsLastMonth')}
                </Text>
              </>
            )}
          </View>

          {/* Predicted Next Month */}
          <View style={[styles.miniCard, { flex: 1, borderColor: colors.cyan + '55' }]}>
            <Text style={styles.miniCardLabel}>{t('insights.predictedNext')}</Text>
            <Text style={[styles.miniCardValue, { color: colors.cyan }]}>
              {formatCurrency(predictedNext, currency)}
            </Text>
            <Text style={styles.momSubLabel}>{t('common.perMonth')}</Text>
          </View>
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* D. Expandable Category Cards                                     */}
        {/* ---------------------------------------------------------------- */}
        {categoryData.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('insights.spendingByCategory')}</Text>
            {categoryData.map(cat => (
              <ExpandableCategoryCard
                key={cat.name}
                category={cat}
                subscriptions={subscriptions}
                currency={currency}
              />
            ))}
          </View>
        )}

        {/* Potential Savings Card */}
        {savings.monthlyCount > 0 && (
          <SavingsCard
            amount={savings.amount}
            monthlyCount={savings.monthlyCount}
            style={{ marginBottom: 20 }}
          />
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Money-Saving Tips (Alternative Suggestions)                      */}
        {/* ---------------------------------------------------------------- */}
        {visibleSuggestions.length > 0 && (
          <View style={styles.card}>
            <View style={styles.altSectionHeader}>
              <Ionicons name="cash-outline" size={18} color={colors.emerald} />
              <Text style={styles.cardTitle}>{t('alternatives.sectionTitle')}</Text>
            </View>

            {visibleSuggestions.map((suggestion) => (
              <AlternativeSuggestionCard
                key={`${suggestion.currentService}|${suggestion.alternativeName}`}
                suggestion={suggestion}
                onDismiss={() => handleDismissSuggestion(suggestion)}
              />
            ))}

            {totalPotentialSavings > 0 && (
              <View style={styles.altSavingsSummary}>
                <Ionicons name="trending-down" size={14} color={colors.emerald} />
                <Text style={styles.altSavingsSummaryText}>
                  {t('alternatives.totalSavings', {
                    amount: formatCurrency(totalPotentialSavings, currency),
                  })}
                </Text>
              </View>
            )}
          </View>
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
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  reportButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  // Shared card base
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
    marginBottom: 16,
  },
  // Mini stat cards (MoM + Predicted)
  miniCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius['2xl'],
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  miniCardLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
  },
  miniCardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  momRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  momChangeAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  momChangeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  momSubLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  // Expandable category cards
  expandableCard: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 4,
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  expandableLabelGroup: {
    flex: 1,
  },
  expandableName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  expandableHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  expandableRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
  },
  expandableAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  expandablePercent: {
    fontSize: 12,
    color: colors.textMuted,
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    height: 52,
  },
  subItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subIcon: {
    fontSize: 18,
    marginRight: 10,
    width: 28,
    textAlign: 'center',
  },
  subName: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  subAmount: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  // Value Check styles
  valueCheckHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  valueCheckEmpty: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  valueCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  valueCheckIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueCheckEmoji: {
    fontSize: 18,
  },
  valueCheckInfo: {
    flex: 1,
  },
  valueCheckName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  valueCheckPrice: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  valueCheckRatingEmoji: {
    fontSize: 14,
    marginTop: 2,
  },
  valueCheckBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  valueCheckBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  valueCheckSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  valueCheckSummaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.emerald,
  },
  // Alternative suggestions
  altSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  altSavingsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  altSavingsSummaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.emerald,
  },
  // Original breakdown card styles
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
  // Savings Goal styles
  setGoalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  goalChallenge: {
    fontSize: 13,
    marginBottom: 10,
  },
  goalCurrentLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  goalQuickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  goalQuickBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  goalQuickBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  goalQuickBtnAmount: {
    fontSize: 11,
    marginTop: 2,
  },
  goalCustomRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  goalInput: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  goalSaveBtn: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalSaveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  goalCancelBtn: {
    paddingHorizontal: 8,
    height: 42,
    justifyContent: 'center',
  },
  goalCancelBtnText: {
    fontSize: 13,
  },
  goalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  goalActionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  goalActionSep: {
    fontSize: 13,
  },
  goalUpdateRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 12,
  },
});
