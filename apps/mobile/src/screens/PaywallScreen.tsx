/**
 * PaywallScreen - Pro upgrade paywall
 * Feature comparison and purchase flow with RevenueCat
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';
// PurchasesPackage type - use any for Expo Go compatibility
import { Header, PrimaryButton, SecondaryButton } from '../components';
import { useTheme, borderRadius, type ThemeColors } from '../theme';
import { usePlanStore } from '../state';
import {
  showPaywallDismissAd,
  getOfferings,
  purchasePackage,
  restorePurchases,
  formatPackagePrice,
  getPackageType,
  isPurchasesConfigured,
  PRODUCT_IDS,
} from '../services';
import { t } from '../i18n';

interface FeatureRowProps {
  icon: string;
  iconColor: string;
  title: string;
  standardValue: string | boolean;
  proValue: string | boolean;
  index: number;
}

function FeatureRow({ icon, iconColor, title, standardValue, proValue, index }: FeatureRowProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const renderValue = (value: string | boolean, isPro: boolean) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Ionicons name="checkmark-circle" size={20} color={isPro ? colors.emerald : colors.textMuted} />
      ) : (
        <Ionicons name="close-circle" size={20} color={colors.textMuted} />
      );
    }
    return (
      <Text style={[styles.featureValue, isPro && styles.featureValuePro]}>{value}</Text>
    );
  };

  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureIcon, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <View style={styles.featureValues}>
        <View style={styles.featureValueWrapper}>
          {renderValue(standardValue, false)}
        </View>
        <View style={[styles.featureValueWrapper, styles.proColumn]}>
          {renderValue(proValue, true)}
        </View>
      </View>
    </View>
  );
}

export function PaywallScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const fromOnboarding = route?.params?.fromOnboarding === true;

  const FEATURES = [
    { icon: 'document-text', iconColor: colors.amber, title: t('paywall.features.bankScan'), standard: false, pro: true },
    { icon: 'cloud', iconColor: colors.primary, title: t('paywall.features.cloudSync'), standard: false, pro: true },
    { icon: 'download', iconColor: colors.emerald, title: t('paywall.features.dataExport'), standard: false, pro: 'CSV/PDF' },
    { icon: 'color-palette', iconColor: colors.pink, title: t('paywall.features.customCategories'), standard: false, pro: true },
    { icon: 'lock-closed', iconColor: colors.primary, title: t('paywall.features.biometricLock'), standard: false, pro: true },
    { icon: 'infinite', iconColor: colors.cyan, title: t('paywall.features.unlimitedSubs'), standard: '10', pro: t('common.upgrade') },
    { icon: 'remove-circle', iconColor: colors.red, title: t('paywall.features.noAds'), standard: false, pro: true },
  ];
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly' | 'lifetime'>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const { upgradeToPro, upgradeToLifetime, startTrial } = usePlanStore();

  const handleDismiss = () => {
    showPaywallDismissAd();
    if (fromOnboarding) {
      navigation.replace('MainTabs');
    } else {
      navigation.goBack();
    }
  };

  const handleSuccess = () => {
    if (fromOnboarding) {
      navigation.replace('MainTabs');
    } else {
      navigation.goBack();
    }
  };

  // Fallback prices (TRY) - used when RevenueCat not configured
  const [monthlyPrice, setMonthlyPrice] = useState('₺99');
  const [yearlyPrice, setYearlyPrice] = useState('₺799');
  const [lifetimePrice, setLifetimePrice] = useState(t('paywall.lifetimePrice'));
  const yearlySavings = 33; // Pre-calculated for fallback

  // Load offerings from RevenueCat
  useEffect(() => {
    async function loadOfferings() {
      if (!isPurchasesConfigured()) return;
      
      const offering = await getOfferings();
      if (offering?.availablePackages) {
        setPackages(offering.availablePackages);
        
        // Update prices from RevenueCat
        offering.availablePackages.forEach((pkg: any) => {
          const type = getPackageType(pkg);
          if (type === 'monthly') {
            setMonthlyPrice(formatPackagePrice(pkg));
          } else if (type === 'yearly') {
            setYearlyPrice(formatPackagePrice(pkg));
          } else if (type === 'lifetime') {
            setLifetimePrice(formatPackagePrice(pkg));
          }
        });
      }
    }
    loadOfferings();
  }, []);

  const getSelectedPackage = (): any | undefined => {
    if (billingCycle === 'lifetime') {
      return packages.find(pkg => getPackageType(pkg) === 'lifetime');
    }
    return packages.find(pkg => getPackageType(pkg) === billingCycle);
  };

  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      const pkg = getSelectedPackage();

      if (!pkg && isPurchasesConfigured()) {
        Alert.alert(t('paywall.purchaseError'), t('paywall.productNotAvailable'));
        return;
      }

      if (pkg) {
        // Real purchase with RevenueCat
        const result = await purchasePackage(pkg);

        if (result.success) {
          if (billingCycle === 'lifetime') {
            upgradeToLifetime();
          } else {
            upgradeToPro();
          }
          Alert.alert(
            t('paywall.welcomePro'),
            t('paywall.welcomeProMessage'),
            [{ text: t('common.continue') || 'Continue', onPress: handleSuccess }]
          );
        } else if (result.errorType === 'cancelled') {
          // User cancelled - do nothing, no alert
        } else if (result.errorType === 'already_owned') {
          // Auto-restore for already owned subscriptions
          const restoreResult = await restorePurchases();
          if (restoreResult.isPro) {
            upgradeToPro();
            Alert.alert(
              t('paywall.welcomePro'),
              t('paywall.welcomeProMessage'),
              [{ text: t('common.continue') || 'Continue', onPress: handleSuccess }]
            );
          } else {
            Alert.alert(
              t('paywall.alreadyOwned'),
              result.error,
              [{ text: t('paywall.restore'), onPress: handleRestorePurchases }]
            );
          }
        } else if (result.errorType === 'network') {
          Alert.alert(t('paywall.networkError'), result.error);
        } else {
          Alert.alert(t('paywall.purchaseError'), result.error);
        }
      } else {
        // Mock purchase for development (RevenueCat not configured)
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (billingCycle === 'lifetime') {
          upgradeToLifetime();
        } else {
          upgradeToPro();
        }
        Alert.alert(
          t('paywall.welcomePro') + ' (Dev)',
          'RevenueCat not configured. Simulated purchase.',
          [{ text: t('common.continue') || 'Continue', onPress: handleSuccess }]
        );
      }
    } catch (error: any) {
      Alert.alert(t('paywall.purchaseError'), t('paywall.purchaseErrorGeneric'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTrial = () => {
    startTrial(7);
    Alert.alert(
      'Trial Started! 🎉',
      'Enjoy 7 days of Pro features for free.',
      [{ text: 'Continue', onPress: handleSuccess }]
    );
  };

  const handleRestorePurchases = async () => {
    if (!isPurchasesConfigured()) {
      Alert.alert(t('paywall.purchaseError'), t('paywall.purchasesNotConfigured'));
      return;
    }

    setIsLoading(true);
    const result = await restorePurchases();
    setIsLoading(false);

    if (result.success && result.isPro) {
      upgradeToPro();
      Alert.alert(
        t('paywall.restored'),
        t('paywall.restoredMessage'),
        [{ text: t('common.continue') || 'Continue', onPress: handleSuccess }]
      );
    } else if (result.success) {
      Alert.alert(t('paywall.noPurchases'), t('paywall.noPurchasesMessage'));
    } else {
      Alert.alert(t('paywall.purchaseError'), result.error || t('paywall.restoreError'));
    }
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={handleDismiss} 
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={[`${colors.primary}40`, `${colors.pink}20`, 'transparent']}
          style={styles.heroGradient}
        >
          <View style={styles.proBadge}>
            <Ionicons name="star" size={16} color={colors.amber} />
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
          <Text style={styles.heroTitle}>{t('settings.upgradeToPro')}</Text>
          <Text style={styles.heroSubtitle}>
            {t('paywall.subtitle')}
          </Text>
        </LinearGradient>

        {/* Plan Cards */}
        <View style={styles.planCards}>
          {/* Lifetime Plan - Most Prominent */}
          <TouchableOpacity
            style={[styles.planCard, styles.lifetimeCard, billingCycle === 'lifetime' && styles.planCardActive]}
            onPress={() => setBillingCycle('lifetime')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[`${colors.amber}30`, `${colors.pink}20`]}
              style={styles.lifetimeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.planCardHeader}>
                <Text style={styles.planCardTitle}>{t('paywall.lifetimePlan')}</Text>
                <View style={styles.lifetimeBadge}>
                  <Text style={styles.lifetimeBadgeText}>{t('paywall.lifetimeBadge')}</Text>
                </View>
              </View>
              <Text style={styles.lifetimePriceAmount}>{lifetimePrice}</Text>
              <Text style={styles.lifetimeOneTime}>{t('paywall.oneTime')}</Text>
              <Text style={styles.lifetimeDescription}>{t('paywall.lifetimeDescription')}</Text>
              {billingCycle === 'lifetime' && (
                <View style={styles.selectedCheck}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.amber} />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Monthly / Yearly toggle row */}
          <View style={styles.billingToggle}>
            <TouchableOpacity
              style={[styles.billingOption, billingCycle === 'monthly' && styles.billingOptionActive]}
              onPress={() => setBillingCycle('monthly')}
            >
              <Text style={[styles.billingOptionText, billingCycle === 'monthly' && styles.billingOptionTextActive]}>
                {t('paywall.monthlyPlan')}
              </Text>
              <Text style={[styles.billingOptionPrice, billingCycle === 'monthly' && styles.billingOptionTextActive]}>
                {monthlyPrice}{t('paywall.perMonth')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.billingOption, billingCycle === 'yearly' && styles.billingOptionActive]}
              onPress={() => setBillingCycle('yearly')}
            >
              <Text style={[styles.billingOptionText, billingCycle === 'yearly' && styles.billingOptionTextActive]}>
                {t('paywall.yearlyPlan')}
              </Text>
              <Text style={[styles.billingOptionPrice, billingCycle === 'yearly' && styles.billingOptionTextActive]}>
                {yearlyPrice}{t('paywall.perYear')}
              </Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>Save {yearlySavings}%</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Feature Comparison */}
        <View style={styles.comparisonHeader}>
          <Text style={styles.comparisonTitle}>{t('paywall.compareTitle')}</Text>
          <View style={styles.columnHeaders}>
            <Text style={styles.columnHeader}>{t('paywall.standard')}</Text>
            <Text style={[styles.columnHeader, styles.proColumnHeader]}>{t('paywall.pro')}</Text>
          </View>
        </View>

        {FEATURES.map((feature, index) => (
          <FeatureRow
            key={feature.title}
            icon={feature.icon}
            iconColor={feature.iconColor}
            title={feature.title}
            standardValue={feature.standard}
            proValue={feature.pro}
            index={index}
          />
        ))}

        {/* CTA Buttons */}
        <View style={styles.ctaContainer}>
          <PrimaryButton
            title={
              billingCycle === 'lifetime'
                ? `${t('paywall.payOnce')} - ${lifetimePrice}`
                : `Subscribe Now - ${billingCycle === 'yearly' ? yearlyPrice : monthlyPrice}`
            }
            onPress={handlePurchase}
            loading={isLoading}
          />
          
          <TouchableOpacity style={styles.trialButton} onPress={handleStartTrial}>
            <Text style={styles.trialButtonText}>{t('paywall.startTrial')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchases}>
            <Text style={styles.restoreButtonText}>{t('paywall.restore')}</Text>
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <Text style={styles.legalText}>
          Payment will be charged to your App Store or Play Store account. 
          Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
        </Text>

        <View style={styles.legalLinks}>
          <TouchableOpacity>
            <Text style={styles.legalLink}>{t('settings.privacyPolicy')}</Text>
          </TouchableOpacity>
          <Text style={styles.legalDivider}>•</Text>
          <TouchableOpacity>
            <Text style={styles.legalLink}>{t('settings.termsOfService')}</Text>
          </TouchableOpacity>
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
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  heroGradient: {
    paddingTop: 100,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${colors.amber}20`,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  proBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.amber,
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  planCards: {
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  planCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardActive: {
    borderColor: colors.amber,
  },
  lifetimeCard: {
    borderWidth: 2,
    borderColor: `${colors.amber}60`,
  },
  lifetimeGradient: {
    padding: 16,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  planCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  lifetimeBadge: {
    backgroundColor: colors.amber,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  lifetimeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.bg,
  },
  lifetimePriceAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  lifetimeOneTime: {
    fontSize: 13,
    color: colors.amber,
    fontWeight: '600',
    marginBottom: 6,
  },
  lifetimeDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  selectedCheck: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: 4,
  },
  billingOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    position: 'relative',
  },
  billingOptionActive: {
    backgroundColor: colors.primary,
  },
  billingOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  billingOptionTextActive: {
    color: colors.text,
  },
  billingOptionPrice: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  saveBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: colors.emerald,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  comparisonHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  columnHeaders: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  columnHeader: {
    width: 70,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  proColumnHeader: {
    color: colors.primary,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureTitle: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  featureValues: {
    flexDirection: 'row',
  },
  featureValueWrapper: {
    width: 70,
    alignItems: 'center',
  },
  proColumn: {
    backgroundColor: `${colors.primary}10`,
    borderRadius: 8,
    paddingVertical: 4,
  },
  featureValue: {
    fontSize: 13,
    color: colors.textMuted,
  },
  featureValuePro: {
    color: colors.primary,
    fontWeight: '600',
  },
  ctaContainer: {
    padding: 20,
    gap: 12,
  },
  trialButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  trialButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  restoreButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  legalText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 30,
    marginBottom: 12,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  legalLink: {
    fontSize: 12,
    color: colors.primary,
  },
  legalDivider: {
    color: colors.textMuted,
  },
});
