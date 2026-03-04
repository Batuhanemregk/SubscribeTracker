/**
 * TimelineScreen - Upcoming Payments Timeline (FEAT-02)
 * Shows all payments due in the next 30 days, grouped by date using SectionList.
 */
import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Image,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { Header, EmptyState, GradientStatCard } from '../components';
import { useTheme, borderRadius, layout, type ThemeColors } from '../theme';
import { useSubscriptionStore, useSettingsStore } from '../state';
import {
  groupSubscriptionsByDate,
  calculateUpcomingTotal,
  getDaysUntilBilling,
  formatCurrency,
} from '../utils';
import type { Subscription } from '../types';
import { t } from '../i18n';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_WINDOW = 30;

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Derive the urgency color for a payment row based on how many days remain.
 * AC-TL-05: >7 days → textMuted (gray), 3-7 days → amber, <3 days → red
 */
function getUrgencyColor(daysUntil: number, colors: ThemeColors): string {
  if (daysUntil < 3) return '#EF4444';
  if (daysUntil <= 7) return colors.amber;
  return colors.textMuted;
}

/**
 * Return the localised "due in X days" label for a section header.
 * AC-TL-04: Special cases for today (0) and tomorrow (1).
 */
function getDueLabel(daysUntil: number): string {
  if (daysUntil <= 0) return t('timeline.dueToday');
  if (daysUntil === 1) return t('timeline.dueTomorrow');
  return t('timeline.dueInDays', { days: daysUntil });
}

/**
 * Format a Date as "FRIDAY, MARCH 15" (all uppercase) for section headers.
 * AC-TL-04
 */
function formatSectionDate(date: Date): string {
  const day = DAY_NAMES[date.getDay()].toUpperCase();
  const month = MONTH_NAMES[date.getMonth()].toUpperCase();
  const dateNum = date.getDate();
  return `${day}, ${month} ${dateNum}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SectionData {
  title: string;
  date: Date;
  data: (Subscription & { billingDate: Date })[];
}

/** Subscription icon: logo image if available, otherwise emoji on coloured background. */
function SubscriptionIcon({ sub }: { sub: Subscription }) {
  if (sub.logoUrl) {
    return (
      <Image source={{ uri: sub.logoUrl }} style={styles.logo} accessibilityIgnoresInvertColors />
    );
  }
  return (
    <View style={[styles.iconBadge, { backgroundColor: sub.colorKey || '#8B5CF620' }]}>
      <Text style={styles.iconEmoji}>{sub.iconKey || '📦'}</Text>
    </View>
  );
}

interface SectionHeaderProps {
  section: SectionData;
  colors: ThemeColors;
}

/** Section header showing urgency badge and formatted date. AC-TL-04/05 */
function TimelineSectionHeader({ section, colors }: SectionHeaderProps) {
  const daysUntil = getDaysUntilBilling(section.date.toISOString(), undefined);
  const urgencyColor = getUrgencyColor(daysUntil, colors);
  const dueLabel = getDueLabel(daysUntil);

  return (
    <View
      testID="timeline-section-header"
      style={[styles.sectionHeader, { backgroundColor: colors.bg }]}
      accessibilityRole="header"
    >
      <View style={[styles.urgencyBadge, { backgroundColor: `${urgencyColor}18` }]}>
        <View style={[styles.urgencyDot, { backgroundColor: urgencyColor }]} />
        <Text style={[styles.urgencyText, { color: urgencyColor }]}>{dueLabel}</Text>
      </View>
      <Text style={[styles.sectionDateText, { color: colors.textSecondary }]}>
        {formatSectionDate(section.date)}
      </Text>
    </View>
  );
}

interface PaymentItemProps {
  sub: Subscription & { billingDate: Date };
  colors: ThemeColors;
  currency: string;
  index: number;
  onPress: (sub: Subscription) => void;
}

/** Individual payment row. AC-TL-03 */
function PaymentItem({ sub, colors, currency, index, onPress }: PaymentItemProps) {
  const daysUntil = getDaysUntilBilling(sub.nextBillingDate, sub.cycle);
  const urgencyColor = getUrgencyColor(daysUntil, colors);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60)
        .duration(320)
        .easing(Easing.out(Easing.quad))}
    >
      <TouchableOpacity
        testID="timeline-item"
        style={[
          styles.paymentItem,
          {
            backgroundColor: colors.bgCard,
            borderColor: colors.border,
          },
        ]}
        onPress={() => onPress(sub)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${sub.name}, ${formatCurrency(sub.amount, sub.currency || currency)}, ${getDueLabel(daysUntil)}`}
      >
        {/* Left: icon */}
        <SubscriptionIcon sub={sub} />

        {/* Middle: name + cycle */}
        <View style={styles.paymentInfo}>
          <Text style={[styles.paymentName, { color: colors.text }]} numberOfLines={1}>
            {sub.name}
          </Text>
          <Text style={[styles.paymentCycle, { color: colors.textMuted }]}>
            {sub.cycle.charAt(0).toUpperCase() + sub.cycle.slice(1)}
          </Text>
        </View>

        {/* Right: amount + urgency indicator */}
        <View style={styles.paymentRight}>
          <Text style={[styles.paymentAmount, { color: colors.text }]}>
            {formatCurrency(sub.amount, sub.currency || currency)}
          </Text>
          <View style={[styles.urgencyPill, { backgroundColor: `${urgencyColor}18` }]}>
            <Text style={[styles.urgencyPillText, { color: urgencyColor }]}>
              {getDueLabel(daysUntil)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

interface TimelineScreenProps {
  navigation: any;
}

export function TimelineScreen({ navigation }: TimelineScreenProps) {
  const { colors } = useTheme();
  const { subscriptions } = useSubscriptionStore();
  const { app } = useSettingsStore();
  const currency = app.currency;

  // Derive sections from the upcoming payments window (AC-TL-01, AC-TL-06)
  const sections: SectionData[] = useMemo(
    () => groupSubscriptionsByDate(subscriptions, DAYS_WINDOW),
    [subscriptions],
  );

  // Total amount for all upcoming payments (AC-TL-02)
  const upcomingTotal = useMemo(
    () => calculateUpcomingTotal(subscriptions, DAYS_WINDOW),
    [subscriptions],
  );

  const handleItemPress = useCallback(
    (sub: Subscription) => {
      navigation.navigate('SubscriptionDetails', { subscriptionId: sub.id });
    },
    [navigation],
  );

  const handleAddPress = useCallback(() => {
    navigation.navigate('AddSubscription');
  }, [navigation]);

  const isEmpty = sections.length === 0;

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionData }) => (
      <TimelineSectionHeader section={section} colors={colors} />
    ),
    [colors],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Subscription & { billingDate: Date }; index: number }) => (
      <PaymentItem
        sub={item}
        colors={colors}
        currency={currency}
        index={index}
        onPress={handleItemPress}
      />
    ),
    [colors, currency, handleItemPress],
  );

  const keyExtractor = useCallback(
    (item: Subscription & { billingDate: Date }) => `${item.id}-${item.billingDate.toISOString()}`,
    [],
  );

  const renderSeparator = useCallback(
    () => <View style={[styles.separator, { backgroundColor: colors.border }]} />,
    [colors],
  );

  const ListHeaderComponent = useMemo(
    () => (
      <View style={styles.listHeader}>
        {/* Screen header */}
        <Header title={t('timeline.title')} icon="time-outline" iconColor={colors.primary} />

        {/* Total card (AC-TL-02) */}
        <View
          testID="timeline-total"
          style={styles.totalCardWrapper}
          accessibilityLabel={`${t('timeline.next30DaysTotal')}: ${formatCurrency(upcomingTotal, currency)}`}
          accessibilityRole="summary"
        >
          <GradientStatCard
            icon="wallet-outline"
            iconColor={colors.primary}
            label={t('timeline.next30DaysTotal')}
            value={formatCurrency(upcomingTotal, currency)}
            subtitle={`${sections.reduce((acc, s) => acc + s.data.length, 0)} payments`}
            style={styles.totalCard}
          />
        </View>
      </View>
    ),
    [colors, currency, upcomingTotal, sections],
  );

  // ---------------------------------------------------------------------------
  // Empty state (AC-TL-07)
  // ---------------------------------------------------------------------------

  if (isEmpty) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top']}>
        <StatusBar
          barStyle={
            colors.bg === '#000000' || colors.bg === '#0D0D12' ? 'light-content' : 'dark-content'
          }
          backgroundColor={colors.bg}
        />
        <View testID="timeline-screen" style={[styles.container, { backgroundColor: colors.bg }]}>
          <View style={styles.headerPadding}>
            <Header title={t('timeline.title')} icon="time-outline" iconColor={colors.primary} />
          </View>

          <View testID="timeline-empty" style={styles.emptyWrapper}>
            <EmptyState
              icon="time-outline"
              title={t('timeline.noUpcoming')}
              subtitle={t('timeline.emptyAdd')}
              primaryAction={{
                title: t('home.addSubscription'),
                onPress: handleAddPress,
              }}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top']}>
      <StatusBar
        barStyle={
          colors.bg === '#000000' || colors.bg === '#0D0D12' ? 'light-content' : 'dark-content'
        }
        backgroundColor={colors.bg}
      />
      <View testID="timeline-screen" style={[styles.container, { backgroundColor: colors.bg }]}>
        <SectionList
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ItemSeparatorComponent={renderSeparator}
          ListHeaderComponent={ListHeaderComponent}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: layout.tabBarHeight + 16,
  },

  // List header (screen title + total card)
  listHeader: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 8,
  },
  headerPadding: {
    paddingHorizontal: layout.screenPadding,
  },
  totalCardWrapper: {
    marginBottom: 8,
  },
  totalCard: {
    flex: 0,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 10,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 6,
  },
  urgencyDot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  sectionDateText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // Payment item
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: layout.screenPadding,
    marginVertical: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: 12,
  },

  // Icon / Logo
  logo: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    resizeMode: 'contain',
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 22,
  },

  // Payment info (middle column)
  paymentInfo: {
    flex: 1,
    gap: 2,
  },
  paymentName: {
    fontSize: 15,
    fontWeight: '600',
  },
  paymentCycle: {
    fontSize: 12,
    fontWeight: '400',
  },

  // Payment right column
  paymentRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  urgencyPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  urgencyPillText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Separator
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: layout.screenPadding + 14 + 44 + 12, // align with text
  },

  // Empty state
  emptyWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
});
