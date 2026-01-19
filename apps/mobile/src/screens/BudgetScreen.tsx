/**
 * BudgetScreen - Monthly budget tracking
 * Uses Zustand stores, calculation utils, and gifted-charts
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header, SecondaryButton, BudgetCircularProgress } from '../components';
import { colors, borderRadius } from '../theme';
import { useSubscriptionStore, useSettingsStore } from '../state';
import { toMonthlyAmount, getBudgetStatus } from '../utils';

export function BudgetScreen() {
  const { subscriptions, getActiveSubscriptions, calculateMonthlyTotal } = useSubscriptionStore();
  const { budget, setBudgetLimit, setBudgetEnabled } = useSettingsStore();

  const subs = getActiveSubscriptions();
  const monthlySpending = calculateMonthlyTotal();
  const budgetStatus = getBudgetStatus(monthlySpending, budget.monthlyLimit);

  // Sort by monthly equivalent
  const sortedSubs = [...subs]
    .map(s => ({
      ...s,
      monthlyAmount: toMonthlyAmount(s.amount, s.cycle),
    }))
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  const handleEditBudget = () => {
    Alert.prompt(
      'Set Monthly Budget',
      'Enter your monthly subscription limit',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (value) => {
            const limit = parseFloat(value || '0');
            if (limit > 0) {
              setBudgetLimit(limit);
            }
          },
        },
      ],
      'plain-text',
      budget.monthlyLimit.toString()
    );
  };

  const getStatusColor = () => {
    switch (budgetStatus.status) {
      case 'danger': return colors.red;
      case 'warning': return colors.amber;
      default: return colors.emerald;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Header
          icon="wallet"
          iconColor={colors.emerald}
          title="Budget"
          subtitle="Track your spending limit"
        />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Budget Progress Card */}
        <View style={styles.budgetCard}>
          <BudgetCircularProgress 
            spent={monthlySpending} 
            budget={budget.monthlyLimit}
            size={200}
          />

          <View style={styles.budgetInfo}>
            <View style={styles.infoRow}>
              <View style={[styles.dot, { backgroundColor: getStatusColor() }]} />
              <Text style={styles.infoLabel}>Spent</Text>
              <Text style={styles.infoValue}>${monthlySpending.toFixed(2)}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
              <Text style={styles.infoLabel}>Remaining</Text>
              <Text style={styles.infoValue}>${budgetStatus.remaining.toFixed(2)}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={styles.infoLabel}>Budget</Text>
              <Text style={styles.infoValue}>${budget.monthlyLimit.toFixed(2)}</Text>
            </View>
          </View>

          <SecondaryButton 
            title="Edit Budget"
            onPress={handleEditBudget}
          />
        </View>

        {/* Budget Alert */}
        {budgetStatus.status !== 'safe' && (
          <View style={[
            styles.alertCard, 
            budgetStatus.status === 'danger' && styles.alertDanger
          ]}>
            <View style={styles.alertHeader}>
              <Ionicons 
                name={budgetStatus.status === 'danger' ? 'warning' : 'alert-circle'} 
                size={20} 
                color={budgetStatus.status === 'danger' ? colors.red : colors.amber} 
              />
              <Text style={styles.alertTitle}>
                {budgetStatus.status === 'danger' ? 'Budget Exceeded!' : 'Approaching Limit'}
              </Text>
            </View>
            <Text style={styles.alertDescription}>
              {budgetStatus.status === 'danger'
                ? `You've exceeded your budget by $${(monthlySpending - budget.monthlyLimit).toFixed(2)}`
                : `You're at ${budgetStatus.percentage.toFixed(0)}% of your monthly budget`
              }
            </Text>
          </View>
        )}

        {/* Spending Breakdown */}
        <Text style={styles.sectionTitle}>Top Spending</Text>
        
        {sortedSubs.slice(0, 5).map((sub) => (
          <View key={sub.id} style={styles.spendingItem}>
            <View style={[styles.spendingIcon, { backgroundColor: sub.colorKey }]}>
              <Text style={styles.spendingEmoji}>{sub.iconKey}</Text>
            </View>
            <View style={styles.spendingInfo}>
              <Text style={styles.spendingName}>{sub.name}</Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${Math.min((sub.monthlyAmount / monthlySpending) * 100, 100)}%`,
                      backgroundColor: sub.colorKey,
                    }
                  ]} 
                />
              </View>
            </View>
            <Text style={styles.spendingAmount}>${sub.monthlyAmount.toFixed(2)}</Text>
          </View>
        ))}

        {sortedSubs.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No subscriptions to track</Text>
          </View>
        )}

        {/* Alert Settings */}
        <View style={styles.settingsCard}>
          <View style={styles.settingsHeader}>
            <Ionicons name="notifications-outline" size={20} color={colors.primary} />
            <Text style={styles.settingsTitle}>Budget Alerts</Text>
          </View>
          <Text style={styles.settingsDescription}>
            Get notified at {(budget.alertThreshold * 100).toFixed(0)}% of your monthly budget
          </Text>
          <TouchableOpacity 
            style={[styles.toggle, budget.isEnabled && styles.toggleActive]}
            onPress={() => setBudgetEnabled(!budget.isEnabled)}
          >
            <View style={[styles.toggleDot, budget.isEnabled && styles.toggleDotActive]} />
          </TouchableOpacity>
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
  budgetCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius['2xl'],
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  budgetInfo: {
    width: '100%',
    marginVertical: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  infoLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  alertCard: {
    backgroundColor: `${colors.amber}15`,
    borderRadius: borderRadius.xl,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: `${colors.amber}30`,
  },
  alertDanger: {
    backgroundColor: `${colors.red}15`,
    borderColor: `${colors.red}30`,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  alertDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  spendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  spendingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spendingEmoji: {
    fontSize: 18,
  },
  spendingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  spendingName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  spendingAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
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
  settingsCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  settingsDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    paddingRight: 60,
  },
  toggle: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: colors.emerald,
  },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text,
  },
  toggleDotActive: {
    alignSelf: 'flex-end',
  },
});
