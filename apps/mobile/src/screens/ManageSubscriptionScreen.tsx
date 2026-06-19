/**
 * ManageSubscriptionScreen - Premium subscription management
 *
 * Lets an active subscriber:
 *  - switch monthly <-> yearly (StoreKit/Play cross-grade; both products live in
 *    the same subscription group, so the store prorates and never double-bills),
 *  - open the OS-native management sheet to cancel (App Store / Play Store),
 *  - restore purchases.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components';
import { borderRadius, useTheme, type ThemeColors } from '../theme';
import { usePlanStore } from '../state';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  getPackageType,
  formatPackagePrice,
  isPurchasesConfigured,
  getActiveSubscriptionCycle,
  openManageSubscriptions,
} from '../services';
import { t } from '../i18n';

type Cycle = 'monthly' | 'yearly';

export function ManageSubscriptionScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { upgradeToPro } = usePlanStore();

  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async () => {
    if (!isPurchasesConfigured()) {
      setLoading(false);
      return;
    }
    try {
      const [activeCycle, offering] = await Promise.all([
        getActiveSubscriptionCycle(),
        getOfferings(),
      ]);
      setCycle(activeCycle);
      if (offering?.availablePackages) setPackages(offering.availablePackages);
    } catch (error) {
      console.error('Failed to load subscription details:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // The plan the user can switch TO (opposite of the active cycle).
  const targetCycle: Cycle | null =
    cycle === 'monthly' ? 'yearly' : cycle === 'yearly' ? 'monthly' : null;
  const switchPkg = targetCycle
    ? packages.find((p) => getPackageType(p) === targetCycle)
    : undefined;
  const switchPrice = switchPkg ? formatPackagePrice(switchPkg) : '';

  const doSwitch = async () => {
    if (!targetCycle || !switchPkg) {
      Alert.alert(t('paywall.purchaseError'), t('paywall.productNotAvailable'));
      return;
    }
    setSwitching(true);
    const result = await purchasePackage(switchPkg);
    setSwitching(false);
    if (result.success) {
      // Already Premium; the cross-grade keeps the entitlement. Just reflect the
      // new cycle and re-confirm Pro in the local store.
      upgradeToPro();
      setCycle(targetCycle);
      Alert.alert(t('settings.switchSuccess'), t('settings.switchSuccessMessage'));
    } else if (result.errorType === 'cancelled') {
      // User cancelled — no alert.
    } else {
      Alert.alert(t('paywall.purchaseError'), result.error || t('settings.switchError'));
    }
  };

  const handleSwitch = () => {
    if (!targetCycle) return;
    const toYearly = targetCycle === 'yearly';
    Alert.alert(
      t('settings.switchConfirmTitle'),
      toYearly ? t('settings.switchToYearlyConfirm') : t('settings.switchToMonthlyConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.switchAction'), onPress: doSwitch },
      ]
    );
  };

  const handleManage = async () => {
    const ok = await openManageSubscriptions();
    if (!ok) {
      Alert.alert(t('settings.manageSubscription'), t('settings.manageError'));
    }
  };

  const handleRestore = async () => {
    if (!isPurchasesConfigured()) {
      Alert.alert(t('paywall.purchaseError'), t('paywall.purchasesNotConfigured'));
      return;
    }
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);
    if (result.success && result.isPro) {
      upgradeToPro();
      await load();
      Alert.alert(t('paywall.restored'), t('paywall.restoredMessage'));
    } else if (result.success) {
      Alert.alert(t('paywall.noPurchases'), t('paywall.noPurchasesMessage'));
    } else {
      Alert.alert(t('paywall.purchaseError'), result.error || t('paywall.restoreError'));
    }
  };

  const planLabel =
    cycle === 'monthly'
      ? t('settings.premiumMonthly')
      : cycle === 'yearly'
        ? t('settings.premiumYearly')
        : t('settings.premiumActive');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Header title={t('settings.manageSubscription')} showBack />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Current plan */}
            <View style={styles.card}>
              <View style={styles.planCard}>
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>{t('common.pro')}</Text>
                </View>
                <Text style={styles.planTitle}>{planLabel}</Text>
                <Text style={styles.planInfo}>{t('settings.subscriptionRenewInfo')}</Text>
              </View>
            </View>

            {/* Change plan (only when the opposite cycle is available) */}
            {targetCycle && switchPkg && (
              <>
                <Text style={styles.sectionTitle}>{t('settings.changePlan')}</Text>
                <View style={styles.card}>
                  <TouchableOpacity
                    style={styles.row}
                    onPress={handleSwitch}
                    disabled={switching}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.rowIcon, { backgroundColor: `${colors.emerald}14` }]}>
                      <Ionicons name="swap-horizontal" size={20} color={colors.emerald} />
                    </View>
                    <View style={styles.rowContent}>
                      <Text style={styles.rowTitle}>
                        {targetCycle === 'yearly'
                          ? t('settings.switchToYearly')
                          : t('settings.switchToMonthly')}
                      </Text>
                      <Text style={styles.rowSubtitle}>
                        {targetCycle === 'yearly'
                          ? t('settings.switchToYearlySubtitle')
                          : t('settings.switchToMonthlySubtitle')}
                        {switchPrice ? ` · ${switchPrice}` : ''}
                      </Text>
                    </View>
                    {switching ? (
                      <ActivityIndicator color={colors.textMuted} />
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Manage / cancel / restore */}
            <Text style={styles.sectionTitle}>{t('settings.manageTitle')}</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.row} onPress={handleManage} activeOpacity={0.7}>
                <View style={[styles.rowIcon, { backgroundColor: `${colors.text}08` }]}>
                  <Ionicons name="open-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{t('settings.cancelSubscription')}</Text>
                  <Text style={styles.rowSubtitle}>{t('settings.cancelSubscriptionSubtitle')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.row}
                onPress={handleRestore}
                disabled={restoring}
                activeOpacity={0.7}
              >
                <View style={[styles.rowIcon, { backgroundColor: `${colors.text}08` }]}>
                  <Ionicons name="refresh" size={20} color={colors.amber} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{t('settings.restorePurchases')}</Text>
                  <Text style={styles.rowSubtitle}>{t('settings.restoreSubtitle')}</Text>
                </View>
                {restoring ? (
                  <ActivityIndicator color={colors.textMuted} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 50,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: 40,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
      marginBottom: 12,
      marginTop: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    rowContent: {
      flex: 1,
    },
    rowTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    rowSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 70,
    },
    planCard: {
      padding: 20,
      alignItems: 'center',
    },
    planBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      marginBottom: 12,
    },
    planBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 1,
    },
    planTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    planInfo: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
