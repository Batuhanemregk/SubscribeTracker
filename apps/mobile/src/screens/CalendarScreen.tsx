/**
 * CalendarScreen - Upcoming billing dates
 * Uses Zustand stores and calculation utils
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header, GradientStatCard } from '../components';
import { useTheme, borderRadius, type ThemeColors } from '../theme';
import { useSubscriptionStore, useSettingsStore, useCurrencyStore } from '../state';
import { getUpcomingPayments, getDaysUntilBilling, getMonthBillingDates, formatCurrency, getCurrencySymbol } from '../utils';
import type { Subscription } from '../types';
import { t, getLocale } from '../i18n';

const MONTH_KEYS = ['january', 'february', 'march', 'april', 'may', 'june', 
                'july', 'august', 'september', 'october', 'november', 'december'];
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// Calendar component
function Calendar({ billingDates }: { billingDates: Date[] }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [viewDate, setViewDate] = useState(new Date());
  
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const isBillingDate = (day: number) => {
    return billingDates.some(d => 
      d.getDate() === day && d.getMonth() === month && d.getFullYear() === year
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const hasBilling = isBillingDate(day);
    const today = isToday(day);
    
    // Determine cell style - today takes precedence but we show billing indicator
    const cellStyles: any[] = [styles.dayCell];
    const textStyleList: any[] = [styles.dayText];
    
    if (today) {
      cellStyles.push(styles.todayCell);
      textStyleList.push(styles.todayText);
    } else if (hasBilling) {
      cellStyles.push(styles.billingDayCell);
      textStyleList.push(styles.billingDayText);
    }
    
    days.push(
      <View key={day} style={cellStyles}>
        <Text style={textStyleList}>
          {day}
        </Text>
        {hasBilling && !today && <View style={styles.billingDot} />}
        {hasBilling && today && <View style={styles.billingDotToday} />}
      </View>
    );
  }

  return (
    <View style={styles.calendarCard}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={prevMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{t(`calendar.months.${MONTH_KEYS[month]}`)} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.daysHeader}>
        {DAY_KEYS.map((key, i) => (
          <Text key={i} style={styles.dayName}>{t(`calendar.daysShort.${key}`)}</Text>
        ))}
      </View>

      <View style={styles.daysGrid}>{days}</View>
    </View>
  );
}

// Payment item - no animation (animations only on HomeScreen)
function PaymentItem({ sub, index }: { sub: Subscription; index: number }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { app } = useSettingsStore();
  const currency = app.currency;
  const daysUntil = getDaysUntilBilling(sub.nextBillingDate, sub.cycle);

  return (
    <View style={styles.paymentItem}>
      <View style={[styles.paymentIcon, !sub.logoUrl && { backgroundColor: sub.colorKey }]}>
        {sub.logoUrl ? (
          <Image
            source={{ uri: sub.logoUrl }}
            style={styles.paymentLogo}
          />
        ) : (
          <Text style={styles.paymentEmoji}>{sub.iconKey}</Text>
        )}
      </View>
      <View style={styles.paymentInfo}>
        <Text style={styles.paymentName}>{sub.name}</Text>
        <Text style={styles.paymentDate}>
          {new Date(sub.nextBillingDate).toLocaleDateString(getLocale() === 'tr' ? 'tr-TR' : 'en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      </View>
      <View style={styles.paymentAmountContainer}>
        <Text style={styles.paymentAmount}>{formatCurrency(sub.amount, sub.currency || 'TRY')}</Text>
        <Text style={[
          styles.paymentDays,
          daysUntil <= 3 && { color: colors.red },
          daysUntil <= 7 && daysUntil > 3 && { color: colors.amber },
        ]}>
          {daysUntil === 0 ? t('calendar.dueToday') : daysUntil === 1 ? t('calendar.dueIn', { days: 1 }) : t('calendar.dueIn', { days: daysUntil })}
        </Text>
      </View>
    </View>
  );
}

export function CalendarScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { subscriptions, getActiveSubscriptions, calculateMonthlyTotalConverted } = useSubscriptionStore();
  const { app } = useSettingsStore();
  const { convert } = useCurrencyStore();
  const currency = app.currency;

  const subs = getActiveSubscriptions();
  const monthlyTotal = calculateMonthlyTotalConverted(convert, currency);
  
  // Get billing dates for calendar markers
  const billingDates = subs.map(s => new Date(s.nextBillingDate));
  
  // Get upcoming payments (next 30 days)
  const upcomingPayments = getUpcomingPayments(subscriptions, 30);
  
  // Get payments this month
  const now = new Date();
  const thisMonthPayments = getUpcomingPayments(subscriptions, 
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Header
          icon="calendar"
          iconColor={colors.primary}
          title={t('calendar.title')}
          subtitle={t('calendar.subtitle')}
        />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Stat Cards */}
        <View style={styles.statsRow}>
          <GradientStatCard
            icon="calendar-outline"
            iconColor={colors.primary}
            label={t('calendar.totalThisMonth')}
            value={formatCurrency(monthlyTotal, currency)}
            subtitle={`${thisMonthPayments.length} ${t('subscription.payments')}`}
            delay={0}
          />
          <GradientStatCard
            icon="time-outline"
            iconColor={colors.emerald}
            label={t('calendar.upcoming')}
            value={upcomingPayments.length.toString()}
            subtitle={t('calendar.dueIn', { days: 30 })}
            delay={0}
          />
        </View>

        {/* Calendar */}
        <Calendar billingDates={billingDates} />

        {/* Upcoming This Month */}
        <Text style={styles.sectionTitle}>{t('calendar.upcoming')}</Text>
        
        {upcomingPayments.map((sub, index) => (
          <PaymentItem key={sub.id} sub={sub} index={index} />
        ))}

        {upcomingPayments.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>{t('calendar.noUpcoming')}</Text>
          </View>
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
  calendarCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius['2xl'],
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  daysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  dayName: {
    width: 40,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  todayCell: {
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  billingDayCell: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
  },
  dayText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  todayText: {
    color: colors.text,
    fontWeight: '700',
  },
  billingDayText: {
    color: colors.primary,
    fontWeight: '600',
  },
  billingDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.red,
  },
  billingDotToday: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text,
    borderWidth: 1,
    borderColor: colors.red,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentEmoji: {
    fontSize: 20,
  },
  paymentLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 14,
  },
  paymentName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  paymentDate: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  paymentAmountContainer: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  paymentDays: {
    fontSize: 12,
    color: colors.emerald,
    fontWeight: '500',
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 12,
  },
});
