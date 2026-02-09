/**
 * BudgetScreen - Monthly budget tracking
 * Uses Zustand stores, calculation utils, and gifted-charts
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header, SecondaryButton, BudgetCircularProgress } from '../components';
import { useTheme, borderRadius, type ThemeColors } from '../theme';
import { useSubscriptionStore, useSettingsStore, useCurrencyStore } from '../state';
import { toMonthlyAmount, getBudgetStatus, getCurrencySymbol, formatCurrency } from '../utils';
import { t } from '../i18n';

export function BudgetScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { subscriptions, getActiveSubscriptions, calculateMonthlyTotalConverted } = useSubscriptionStore();
  const { budget, setBudgetLimit, setBudgetEnabled, app } = useSettingsStore();
  const { convert } = useCurrencyStore();
  const currency = app.currency;

  const subs = getActiveSubscriptions();
  const monthlySpending = calculateMonthlyTotalConverted(convert, currency);
  const budgetStatus = getBudgetStatus(monthlySpending, budget.monthlyLimit);

  // Sort by monthly equivalent
  const sortedSubs = [...subs]
    .map(s => ({
      ...s,
      monthlyAmount: toMonthlyAmount(s.amount, s.cycle),
    }))
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  const [budgetModalVisible, setBudgetModalVisible] = React.useState(false);
  const [budgetInput, setBudgetInput] = React.useState(budget.monthlyLimit.toString());

  const handleEditBudget = () => {
    setBudgetInput(budget.monthlyLimit.toString());
    setBudgetModalVisible(true);
  };

  const handleSaveBudget = () => {
    const limit = parseFloat(budgetInput || '0');
    if (limit > 0) {
      setBudgetLimit(limit);
    }
    setBudgetModalVisible(false);
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
          title={t('budget.title')}
          subtitle={t('budget.subtitle')}
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
              <Text style={styles.infoLabel}>{t('budget.spent')}</Text>
              <Text style={styles.infoValue}>{formatCurrency(monthlySpending, currency)}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
              <Text style={styles.infoLabel}>{t('budget.remaining')}</Text>
              <Text style={styles.infoValue}>{formatCurrency(budgetStatus.remaining, currency)}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={styles.infoLabel}>{t('budget.monthlyBudget')}</Text>
              <Text style={styles.infoValue}>{formatCurrency(budget.monthlyLimit, currency)}</Text>
            </View>
          </View>

          <SecondaryButton 
            title={t('budget.editBudget')}
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
                {budgetStatus.status === 'danger' ? t('budget.exceeded') : t('budget.approaching')}
              </Text>
            </View>
            <Text style={styles.alertDescription}>
              {budgetStatus.status === 'danger'
                ? `${t('budget.exceededBy')} ${formatCurrency(monthlySpending - budget.monthlyLimit, currency)}`
                : t('budget.atPercent', { percent: budgetStatus.percentage.toFixed(0) })
              }
            </Text>
          </View>
        )}

        {/* Spending Breakdown */}
        <Text style={styles.sectionTitle}>{t('budget.topSpending')}</Text>
        
        {sortedSubs.slice(0, 5).map((sub) => (
          <View key={sub.id} style={styles.spendingItem}>
            <View style={[styles.spendingIcon, !sub.logoUrl && { backgroundColor: sub.colorKey }]}>
              {sub.logoUrl ? (
                <Image
                  source={{ uri: sub.logoUrl }}
                  style={styles.spendingLogo}
                />
              ) : (
                <Text style={styles.spendingEmoji}>{sub.iconKey}</Text>
              )}
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
            <Text style={styles.spendingAmount}>{formatCurrency(convert(sub.monthlyAmount, sub.currency || 'TRY', currency), currency)}</Text>
          </View>
        ))}

        {sortedSubs.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>{t('insights.noSubscriptions')}</Text>
          </View>
        )}

        {/* Alert Settings */}
        <View style={styles.settingsCard}>
          <View style={styles.settingsHeader}>
            <Ionicons name="notifications-outline" size={20} color={colors.primary} />
            <Text style={styles.settingsTitle}>{t('budget.alertsTitle')}</Text>
          </View>
          <Text style={styles.settingsDescription}>
            {t('budget.alertsDescription', { percent: (budget.alertThreshold * 100).toFixed(0) })}
          </Text>
          <TouchableOpacity 
            style={[styles.toggle, budget.isEnabled && styles.toggleActive]}
            onPress={() => setBudgetEnabled(!budget.isEnabled)}
          >
            <View style={[styles.toggleDot, budget.isEnabled && styles.toggleDotActive]} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Budget Edit Modal */}
      <Modal
        visible={budgetModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setBudgetModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setBudgetModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('budget.setBudget')}</Text>
            <Text style={styles.modalSubtitle}>{t('budget.budgetPlaceholder')}</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>{getCurrencySymbol(currency)}</Text>
              <TextInput
                style={styles.budgetInput}
                value={budgetInput}
                onChangeText={setBudgetInput}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setBudgetModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveBudget}
              >
                <Text style={styles.saveButtonText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  spendingLogo: {
    width: 24,
    height: 24,
    borderRadius: 6,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: 24,
    width: '85%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.emerald,
    marginRight: 8,
  },
  budgetInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    paddingVertical: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.emerald,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
