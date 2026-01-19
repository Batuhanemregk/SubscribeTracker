/**
 * CalendarScreen - Upcoming billing dates
 * Uses Zustand stores and calculation utils
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { Header, GradientStatCard } from '../components';
import { colors, borderRadius } from '../theme';
import { useSubscriptionStore } from '../state';
import { getUpcomingPayments, getDaysUntilBilling, getMonthBillingDates } from '../utils';
import type { Subscription } from '../types';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Calendar component
function Calendar({ billingDates }: { billingDates: Date[] }) {
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
    
    days.push(
      <View 
        key={day} 
        style={[
          styles.dayCell,
          today && styles.todayCell,
          hasBilling && styles.billingDayCell,
        ]}
      >
        <Text style={[
          styles.dayText,
          today && styles.todayText,
          hasBilling && styles.billingDayText,
        ]}>
          {day}
        </Text>
        {hasBilling && <View style={styles.billingDot} />}
      </View>
    );
  }

  return (
    <View style={styles.calendarCard}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={prevMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.daysHeader}>
        {DAY_NAMES.map((day, i) => (
          <Text key={i} style={styles.dayName}>{day}</Text>
        ))}
      </View>

      <View style={styles.daysGrid}>{days}</View>
    </View>
  );
}

// Payment item with animation
function PaymentItem({ sub, index }: { sub: Subscription; index: number }) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(-30);

  React.useEffect(() => {
    opacity.value = withDelay(index * 80 + 200, withSpring(1));
    translateX.value = withDelay(index * 80 + 200, withSpring(0, { damping: 15 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  const daysUntil = getDaysUntilBilling(sub.nextBillingDate);

  return (
    <Animated.View style={[styles.paymentItem, animatedStyle]}>
      <View style={[styles.paymentIcon, { backgroundColor: sub.colorKey }]}>
        <Text style={styles.paymentEmoji}>{sub.iconKey}</Text>
      </View>
      <View style={styles.paymentInfo}>
        <Text style={styles.paymentName}>{sub.name}</Text>
        <Text style={styles.paymentDate}>
          {new Date(sub.nextBillingDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      </View>
      <View style={styles.paymentAmountContainer}>
        <Text style={styles.paymentAmount}>${sub.amount.toFixed(2)}</Text>
        <Text style={[
          styles.paymentDays,
          daysUntil <= 3 && { color: colors.red },
          daysUntil <= 7 && daysUntil > 3 && { color: colors.amber },
        ]}>
          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
        </Text>
      </View>
    </Animated.View>
  );
}

export function CalendarScreen() {
  const { subscriptions, getActiveSubscriptions, calculateMonthlyTotal } = useSubscriptionStore();

  const subs = getActiveSubscriptions();
  const monthlyTotal = calculateMonthlyTotal();
  
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
          title="Calendar"
          subtitle="Upcoming billing dates"
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
            label="This Month"
            value={`$${monthlyTotal.toFixed(2)}`}
            subtitle={`${thisMonthPayments.length} payments`}
            delay={0}
          />
          <GradientStatCard
            icon="time-outline"
            iconColor={colors.emerald}
            label="Upcoming"
            value={upcomingPayments.length.toString()}
            subtitle="next 30 days"
            delay={100}
          />
        </View>

        {/* Calendar */}
        <Calendar billingDates={billingDates} />

        {/* Upcoming This Month */}
        <Text style={styles.sectionTitle}>Upcoming Payments</Text>
        
        {upcomingPayments.map((sub, index) => (
          <PaymentItem key={sub.id} sub={sub} index={index} />
        ))}

        {upcomingPayments.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No upcoming payments</Text>
          </View>
        )}
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
