/**
 * ManageSubscriptionScreen - Premium subscription management
 *
 * Shows the active plan + renewal/expiry date, and routes plan changes AND
 * cancellation to the OS-native manage-subscriptions sheet (App Store / Play
 * Store). Apple's native UI is the single source of truth for billing: it shows
 * the renewal date, lets the user switch between plans in the same group, and
 * discloses the exact proration and effective date for each change — which a
 * custom in-app switch cannot do reliably before purchase. Also offers Restore.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components';
import { borderRadius, useTheme, type ThemeColors } from '../theme';
import { usePlanStore } from '../state';
import {
  restorePurchases,
  isPurchasesConfigured,
  getActiveSubscriptionInfo,
  openManageSubscriptions,
} from '../services';
import { t } from '../i18n';

type SubscriptionInfo = {
  cycle: 'monthly' | 'yearly' | null;
  expirationDate: string | null;
  willRenew: boolean;
};

export function ManageSubscriptionScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { upgradeToPro } = usePlanStore();

  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async () => {
    if (!isPurchasesConfigured()) {
      setLoading(false);
      return;
    }
    try {
      setInfo(await getActiveSubscriptionInfo());
    } catch (error) {
      console.error('Failed to load subscription info:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Plan changes + cancellation both go through the native sheet — Apple shows the
  // renewal date and the exact billing (immediate proration vs. at next renewal)
  // for whichever change the user makes.
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
    info?.cycle === 'monthly'
      ? t('settings.premiumMonthly')
      : info?.cycle === 'yearly'
        ? t('settings.premiumYearly')
        : t('settings.premiumActive');

  // "Renews on <date>" when auto-renew is on, "Access until <date>" once cancelled.
  const dateLabel = (() => {
    if (!info?.expirationDate) return null;
    const formatted = new Date(info.expirationDate).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return info.willRenew
      ? t('settings.renewsOn', { date: formatted })
      : t('settings.accessUntil', { date: formatted });
  })();

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
                {dateLabel && <Text style={styles.planDate}>{dateLabel}</Text>}
                <Text style={styles.planInfo}>{t('settings.subscriptionRenewInfo')}</Text>
              </View>
            </View>

            {/* Change plan / cancel / restore */}
            <Text style={styles.sectionTitle}>{t('settings.manageTitle')}</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.row} onPress={handleManage} activeOpacity={0.7}>
                <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}14` }]}>
                  <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{t('settings.changeOrCancelPlan')}</Text>
                  <Text style={styles.rowSubtitle}>{t('settings.changeOrCancelSubtitle')}</Text>
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
    planDate: {
      fontSize: 14,
      fontWeight: '600',
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
