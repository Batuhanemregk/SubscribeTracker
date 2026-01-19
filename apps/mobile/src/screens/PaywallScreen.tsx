/**
 * PaywallScreen - Pro upgrade paywall
 * Feature comparison and purchase flow
 */
import React, { useState } from 'react';
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
import { Header, PrimaryButton, SecondaryButton } from '../components';
import { colors, borderRadius } from '../theme';
import { usePlanStore } from '../state';
import { showPaywallDismissAd } from '../services';

interface FeatureRowProps {
  icon: string;
  iconColor: string;
  title: string;
  standardValue: string | boolean;
  proValue: string | boolean;
  index: number;
}

function FeatureRow({ icon, iconColor, title, standardValue, proValue, index }: FeatureRowProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  React.useEffect(() => {
    opacity.value = withDelay(index * 50 + 200, withSpring(1));
    translateY.value = withDelay(index * 50 + 200, withSpring(0, { damping: 15 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

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
    <Animated.View style={[styles.featureRow, animatedStyle]}>
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
    </Animated.View>
  );
}

const FEATURES = [
  { icon: 'mail', iconColor: colors.cyan, title: 'Email Accounts', standard: '1', pro: '5' },
  { icon: 'scan', iconColor: colors.primary, title: 'Email Scanning', standard: 'Manual', pro: 'Daily Auto' },
  { icon: 'document-text', iconColor: colors.amber, title: 'Scan Depth', standard: 'Metadata', pro: 'Full Body' },
  { icon: 'cash', iconColor: colors.emerald, title: 'Price Auto-fill', standard: false, pro: true },
  { icon: 'calendar', iconColor: colors.pink, title: 'Cycle Detection', standard: false, pro: true },
  { icon: 'link', iconColor: colors.cyan, title: 'Cancel Links', standard: false, pro: true },
  { icon: 'notifications', iconColor: colors.amber, title: 'Price Alerts', standard: false, pro: true },
  { icon: 'remove-circle', iconColor: colors.red, title: 'Ad-Free', standard: false, pro: true },
];

export function PaywallScreen({ navigation }: any) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const { upgradeToPro, startTrial } = usePlanStore();

  const monthlyPrice = 4.99;
  const yearlyPrice = 39.99;
  const yearlySavings = Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100);

  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      // Simulate purchase - will be replaced with actual IAP
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const now = new Date();
      const expiryDate = billingCycle === 'yearly' 
        ? new Date(now.setFullYear(now.getFullYear() + 1))
        : new Date(now.setMonth(now.getMonth() + 1));
      
      upgradeToPro();
      
      Alert.alert(
        'Welcome to Pro! 🎉',
        'You now have access to all premium features.',
        [{ text: 'Continue', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Purchase Failed', 'Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTrial = () => {
    startTrial(7);
    Alert.alert(
      'Trial Started! 🎉',
      'Enjoy 7 days of Pro features for free.',
      [{ text: 'Continue', onPress: () => navigation.goBack() }]
    );
  };

  const handleRestorePurchases = () => {
    Alert.alert('Restore Purchases', 'Checking for previous purchases...');
    // TODO: Implement restore with IAP
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            showPaywallDismissAd();
            navigation.goBack();
          }} 
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
          <Text style={styles.heroTitle}>Upgrade to Pro</Text>
          <Text style={styles.heroSubtitle}>
            Unlock powerful features to manage your subscriptions effortlessly
          </Text>
        </LinearGradient>

        {/* Billing Cycle Toggle */}
        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={[styles.billingOption, billingCycle === 'monthly' && styles.billingOptionActive]}
            onPress={() => setBillingCycle('monthly')}
          >
            <Text style={[styles.billingOptionText, billingCycle === 'monthly' && styles.billingOptionTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.billingOption, billingCycle === 'yearly' && styles.billingOptionActive]}
            onPress={() => setBillingCycle('yearly')}
          >
            <Text style={[styles.billingOptionText, billingCycle === 'yearly' && styles.billingOptionTextActive]}>
              Yearly
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>Save {yearlySavings}%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Price Card */}
        <View style={styles.priceCard}>
          <Text style={styles.priceAmount}>
            ${billingCycle === 'yearly' ? yearlyPrice.toFixed(2) : monthlyPrice.toFixed(2)}
          </Text>
          <Text style={styles.pricePeriod}>
            per {billingCycle === 'yearly' ? 'year' : 'month'}
          </Text>
          {billingCycle === 'yearly' && (
            <Text style={styles.priceBreakdown}>
              Just ${(yearlyPrice / 12).toFixed(2)}/month
            </Text>
          )}
        </View>

        {/* Feature Comparison */}
        <View style={styles.comparisonHeader}>
          <Text style={styles.comparisonTitle}>Compare Plans</Text>
          <View style={styles.columnHeaders}>
            <Text style={styles.columnHeader}>Standard</Text>
            <Text style={[styles.columnHeader, styles.proColumnHeader]}>Pro</Text>
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
            title={`Subscribe Now - $${billingCycle === 'yearly' ? yearlyPrice : monthlyPrice}`}
            onPress={handlePurchase}
            loading={isLoading}
          />
          
          <TouchableOpacity style={styles.trialButton} onPress={handleStartTrial}>
            <Text style={styles.trialButtonText}>Start 7-Day Free Trial</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchases}>
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <Text style={styles.legalText}>
          Payment will be charged to your App Store or Play Store account. 
          Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
        </Text>

        <View style={styles.legalLinks}>
          <TouchableOpacity>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalDivider}>•</Text>
          <TouchableOpacity>
            <Text style={styles.legalLink}>Terms of Service</Text>
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
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    marginHorizontal: 16,
    borderRadius: borderRadius.xl,
    padding: 4,
    marginBottom: 20,
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
  priceCard: {
    alignItems: 'center',
    marginBottom: 30,
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.text,
  },
  pricePeriod: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 4,
  },
  priceBreakdown: {
    fontSize: 14,
    color: colors.emerald,
    marginTop: 8,
    fontWeight: '600',
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
