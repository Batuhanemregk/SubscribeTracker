/**
 * SubscriptionDetailsScreen - View subscription details
 * Uses new component library and Zustand stores
 */
import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { Header, GradientHeroCard, GradientStatCard, PrimaryButton, SecondaryButton } from '../components';
import { colors, borderRadius } from '../theme';
import { useSubscriptionStore } from '../state';
import type { Subscription } from '../types';

interface SubscriptionDetailsScreenProps {
  navigation: any;
  route: any;
}

// Payment history item
function PaymentHistoryItem({ date, amount, index }: { date: string; amount: number; index: number }) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(-20);

  useEffect(() => {
    opacity.value = withDelay(index * 60 + 300, withSpring(1));
    translateX.value = withDelay(index * 60 + 300, withSpring(0, { damping: 15 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.historyItem, animatedStyle]}>
      <View style={styles.historyDot}>
        <View style={styles.dotInner} />
      </View>
      <View style={styles.historyInfo}>
        <Text style={styles.historyDate}>{date}</Text>
        <Text style={styles.historyStatus}>Completed</Text>
      </View>
      <Text style={styles.historyAmount}>${amount.toFixed(2)}</Text>
    </Animated.View>
  );
}

export function SubscriptionDetailsScreen({ navigation, route }: SubscriptionDetailsScreenProps) {
  const { subscriptionId } = route.params;
  const { getSubscriptionById, deleteSubscription } = useSubscriptionStore();
  
  const sub = getSubscriptionById(subscriptionId);

  if (!sub) {
    return (
      <View style={styles.container}>
        <Header title="Subscription Details" showBack />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Subscription not found</Text>
        </View>
      </View>
    );
  }

  const monthlyAmt = sub.cycle === 'monthly' ? sub.amount : sub.amount / 12;
  const yearlyAmt = monthlyAmt * 12;
  const daysUntil = Math.ceil(
    (new Date(sub.nextBillingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Generate fake payment history
  const paymentHistory = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (i + 1));
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: sub.amount,
    };
  });

  const totalPaid = paymentHistory.reduce((sum, p) => sum + p.amount, 0);

  const handleDelete = () => {
    Alert.alert('Delete Subscription', `Are you sure you want to delete ${sub.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
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
          title="Subscription Details"
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
          name={sub.name}
          amount={sub.amount}
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
            label="Monthly Cost"
            value={`$${monthlyAmt.toFixed(2)}`}
            delay={100}
          />
          <GradientStatCard
            icon="trending-up"
            iconColor={colors.primary}
            label="Yearly Cost"
            value={`$${yearlyAmt.toFixed(2)}`}
            delay={200}
          />
        </View>

        {/* Billing Card */}
        <View style={styles.billingCard}>
          <View style={styles.billingIcon}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
          </View>
          <View style={styles.billingInfo}>
            <Text style={styles.billingTitle}>Next Billing Date</Text>
            <Text style={styles.billingDate}>
              {new Date(sub.nextBillingDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            <View style={styles.billingRemaining}>
              <Ionicons name="time-outline" size={14} color={colors.emerald} />
              <Text style={styles.billingDays}>{daysUntil} days remaining</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <SecondaryButton
            title="Edit"
            onPress={handleEdit}
            fullWidth={false}
            style={styles.actionButton}
          />
          <SecondaryButton
            title="Reschedule"
            onPress={() => {}}
            fullWidth={false}
            style={styles.actionButton}
          />
        </View>

        {/* Payment History */}
        <Text style={styles.sectionTitle}>Payment History</Text>
        <View style={styles.historyCard}>
          {paymentHistory.map((payment, index) => (
            <PaymentHistoryItem
              key={index}
              date={payment.date}
              amount={payment.amount}
              index={index}
            />
          ))}
        </View>

        {/* Statistics */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Statistics</Text>
          <View style={styles.statsRowItem}>
            <Text style={styles.statsLabel}>Total Paid</Text>
            <Text style={styles.statsValue}>${totalPaid.toFixed(2)}</Text>
          </View>
          <View style={styles.statsRowItem}>
            <Text style={styles.statsLabel}>Member Since</Text>
            <Text style={styles.statsValue}>
              {new Date(sub.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* Delete Button */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={18} color={colors.red} />
          <Text style={styles.deleteText}>Delete Subscription</Text>
        </TouchableOpacity>
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
