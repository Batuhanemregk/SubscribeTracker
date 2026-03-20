/**
 * SubscriptionDetailsScreen - View subscription details
 * Uses new component library and Zustand stores
 */
import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { Header, GradientHeroCard, GradientStatCard, PrimaryButton, SecondaryButton } from '../components';
import { useTheme, borderRadius, type ThemeColors } from '../theme';
import { useSubscriptionStore, useSettingsStore } from '../state';
import { formatCurrency, getCurrencySymbol } from '../utils';
import type { Subscription } from '../types';
import { t, getLocale } from '../i18n';

interface SubscriptionDetailsScreenProps {
  navigation: any;
  route: any;
}

// Payment history item - no animation (animations only on HomeScreen)
function PaymentHistoryItem({ date, amount, currency }: { date: string; amount: number; currency: string }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.historyItem}>
      <View style={styles.historyDot}>
        <View style={styles.dotInner} />
      </View>
      <View style={styles.historyInfo}>
        <Text style={styles.historyDate}>{date}</Text>
        <Text style={styles.historyStatus}>{t('subscription.completed')}</Text>
      </View>
      <Text style={styles.historyAmount}>{formatCurrency(amount, currency)}</Text>
    </View>
  );
}

export function SubscriptionDetailsScreen({ navigation, route }: SubscriptionDetailsScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { subscriptionId } = route.params;
  const { getSubscriptionById, deleteSubscription } = useSubscriptionStore();
  const { app } = useSettingsStore();
  const dateLocale = getLocale() === 'tr' ? 'tr-TR' : 'en-US';
  
  const sub = getSubscriptionById(subscriptionId);

  if (!sub) {
    return (
      <View style={styles.container}>
        <Header title={t('subscription.details')} showBack />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('subscription.notFound')}</Text>
        </View>
      </View>
    );
  }

  const subCurrency = sub.currency || 'TRY';
  const monthlyAmt = sub.cycle === 'monthly' ? sub.amount
    : sub.cycle === 'weekly' ? sub.amount * 4.33
    : sub.cycle === 'quarterly' ? sub.amount / 3
    : sub.amount / 12;
  const yearlyAmt = monthlyAmt * 12;
  const daysUntil = Math.ceil(
    (new Date(sub.nextBillingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Generate realistic payment history based on creation date and billing cycle
  const paymentHistory = useMemo(() => {
    const history: { date: string; amount: number }[] = [];
    const created = new Date(sub.createdAt);
    const now = new Date();
    const cycleMonths = sub.cycle === 'weekly' ? 0.25
      : sub.cycle === 'monthly' ? 1
      : sub.cycle === 'quarterly' ? 3
      : 12;

    let payDate = new Date(created);
    while (payDate <= now && history.length < 12) {
      history.push({
        date: payDate.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' }),
        amount: sub.amount,
      });
      payDate = new Date(payDate);
      payDate.setMonth(payDate.getMonth() + cycleMonths);
    }
    return history.reverse(); // newest first
  }, [sub.createdAt, sub.amount, sub.cycle, dateLocale]);

  const totalPaid = paymentHistory.reduce((sum, p) => sum + p.amount, 0);

  const handleDelete = () => {
    Alert.alert(t('subscription.deleteConfirmTitle'), t('subscription.deleteConfirmMessage', { name: sub.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteSubscription(sub.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleEdit = () => {
    navigation.navigate('AddSubscription', { subscriptionId: sub.id, editMode: true });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Header
          title={t('subscription.details')}
          showBack
          rightAction={
            <TouchableOpacity onPress={handleDelete}>
              <Ionicons name="trash-outline" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          }
        />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <GradientHeroCard
          icon={sub.iconKey}
          logoUrl={sub.logoUrl || undefined}
          name={sub.name}
          amount={sub.amount}
          currency={subCurrency}
          cycle={sub.cycle}
          category={sub.category}
          colorKey={sub.colorKey}
          style={styles.heroCard}
        />

        {/* Cost Stats */}
        <View style={styles.statsRow}>
          <GradientStatCard
            icon="cash-outline"
            iconColor={colors.emerald}
            label={t('subscription.monthlyCost')}
            value={formatCurrency(monthlyAmt, subCurrency)}
            delay={0}
          />
          <GradientStatCard
            icon="trending-up"
            iconColor={colors.primary}
            label={t('subscription.yearlyCost')}
            value={formatCurrency(yearlyAmt, subCurrency)}
            delay={0}
          />
        </View>

        {/* Billing Card */}
        <View style={styles.billingCard}>
          <View style={styles.billingIcon}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
          </View>
          <View style={styles.billingInfo}>
            <Text style={styles.billingTitle}>{t('subscription.nextBilling')}</Text>
            <Text style={styles.billingDate}>
              {new Date(sub.nextBillingDate).toLocaleDateString(dateLocale, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            <View style={styles.billingRemaining}>
              <Ionicons name="time-outline" size={14} color={colors.emerald} />
              <Text style={styles.billingDays}>{daysUntil} {t('subscription.daysRemaining')}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <SecondaryButton
            title={t('common.edit')}
            onPress={handleEdit}
            fullWidth
            style={styles.actionButton}
          />
        </View>

        {/* Payment History */}
        <Text style={styles.sectionTitle}>{t('subscription.paymentHistory')}</Text>
        <View style={styles.historyCard}>
          {paymentHistory.map((payment, index) => (
            <PaymentHistoryItem
              key={index}
              date={payment.date}
              amount={payment.amount}
              currency={subCurrency}
            />
          ))}
        </View>

        {/* Statistics */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>{t('subscription.statistics')}</Text>
          <View style={styles.statsRowItem}>
            <Text style={styles.statsLabel}>{t('subscription.totalPaid')}</Text>
            <Text style={styles.statsValue}>{formatCurrency(totalPaid, subCurrency)}</Text>
          </View>
          <View style={styles.statsRowItem}>
            <Text style={styles.statsLabel}>{t('subscription.memberSince')}</Text>
            <Text style={styles.statsValue}>
              {new Date(sub.createdAt).toLocaleDateString(dateLocale, { month: 'short', year: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* Delete Button */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={18} color={colors.red} />
          <Text style={styles.deleteText}>{t('subscription.deleteConfirmTitle')}</Text>
        </TouchableOpacity>
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
    paddingBottom: 40,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  heroCard: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  billingCard: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  billingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  billingInfo: {
    flex: 1,
  },
  billingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  billingDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  billingRemaining: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  billingDays: {
    fontSize: 13,
    color: colors.emerald,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.emerald}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.emerald,
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  historyStatus: {
    fontSize: 12,
    color: colors.emerald,
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  statsCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  statsRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statsLabel: {
    fontSize: 14,
    color: colors.primary,
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.red,
  },
});
