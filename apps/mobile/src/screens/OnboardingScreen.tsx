/**
 * OnboardingScreen - Enhanced first launch experience
 * 4-step flow: Welcome → Quick Add → Features → Setup
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useTheme, borderRadius, type ThemeColors } from '../theme';
import { useSettingsStore, useSubscriptionStore } from '../state';
import { t } from '../i18n';
import * as Crypto from 'expo-crypto';
import type { Subscription } from '../types';
import { requestNotificationPermission } from '../services';

const { width } = Dimensions.get('window');

// ---------------- Popular services for Quick Add ----------------

interface ServiceItem {
  id: string;
  name: string;
  price: string;
  icon: string;
  color: string;
  category: string;
  amount: number;
  currency: string;
}

const POPULAR_SERVICES: ServiceItem[] = [
  { id: 'netflix', name: 'Netflix', price: '$22.99/mo', icon: '🎬', color: '#E50914', category: 'Entertainment', amount: 22.99, currency: 'USD' },
  { id: 'spotify', name: 'Spotify', price: '$9.99/mo', icon: '🎵', color: '#1DB954', category: 'Music', amount: 9.99, currency: 'USD' },
  { id: 'youtube', name: 'YouTube Premium', price: '$13.99/mo', icon: '▶️', color: '#FF0000', category: 'Entertainment', amount: 13.99, currency: 'USD' },
  { id: 'disney', name: 'Disney+', price: '$7.99/mo', icon: '✨', color: '#113CCF', category: 'Entertainment', amount: 7.99, currency: 'USD' },
  { id: 'icloud', name: 'iCloud+', price: '$2.99/mo', icon: '☁️', color: '#3B82F6', category: 'Storage', amount: 2.99, currency: 'USD' },
  { id: 'googleone', name: 'Google One', price: '$1.99/mo', icon: '🔵', color: '#4285F4', category: 'Storage', amount: 1.99, currency: 'USD' },
  { id: 'chatgpt', name: 'ChatGPT Plus', price: '$20.00/mo', icon: '🤖', color: '#10A37F', category: 'Productivity', amount: 20.00, currency: 'USD' },
  { id: 'amazon', name: 'Amazon Prime', price: '$14.99/mo', icon: '📦', color: '#FF9900', category: 'Entertainment', amount: 14.99, currency: 'USD' },
  { id: 'applemusic', name: 'Apple Music', price: '$10.99/mo', icon: '🎧', color: '#FC3C44', category: 'Music', amount: 10.99, currency: 'USD' },
  { id: 'microsoft', name: 'Microsoft 365', price: '$9.99/mo', icon: '💼', color: '#D83B01', category: 'Productivity', amount: 9.99, currency: 'USD' },
  { id: 'adobe', name: 'Adobe CC', price: '$54.99/mo', icon: '🎨', color: '#FF0000', category: 'Design', amount: 54.99, currency: 'USD' },
  { id: 'notion', name: 'Notion', price: '$8.00/mo', icon: '📝', color: '#000000', category: 'Productivity', amount: 8.00, currency: 'USD' },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'TRY', 'JPY'];

// ---------------- Step components ----------------

interface StepWelcomeProps {
  colors: ThemeColors;
  onGetStarted: () => void;
  onAlreadyHave: () => void;
}

function StepWelcome({ colors, onGetStarted, onAlreadyHave }: StepWelcomeProps) {
  const styles = createStyles(colors);
  return (
    <View style={styles.stepContainer}>
      {/* Logo area */}
      <View style={styles.welcomeLogoArea}>
        <LinearGradient
          colors={[colors.primary, colors.pink]}
          style={styles.welcomeLogo}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="wallet" size={56} color="#FFFFFF" />
        </LinearGradient>
        <Text style={styles.appName}>Finify</Text>
      </View>

      <View style={styles.welcomeTextArea}>
        <Text style={styles.welcomeTitle}>{t('onboarding.welcome')}</Text>
        <Text style={styles.welcomeSubtitle}>{t('onboarding.welcomeSubtitle')}</Text>
      </View>

      <View style={styles.welcomeActions}>
        <TouchableOpacity style={styles.primaryButtonWrap} onPress={onGetStarted} activeOpacity={0.85}>
          <LinearGradient
            colors={[colors.primary, colors.pink]}
            style={styles.primaryButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.primaryButtonText}>{t('onboarding.getStarted')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={onAlreadyHave} activeOpacity={0.7}>
          <Text style={styles.linkButtonText}>{t('onboarding.alreadyHave')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface StepQuickAddProps {
  colors: ThemeColors;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onAddSelected: () => void;
  onSkip: () => void;
  onTryDemo: () => void;
}

function StepQuickAdd({ colors, selected, onToggle, onAddSelected, onSkip, onTryDemo }: StepQuickAddProps) {
  const styles = createStyles(colors);
  const count = selected.size;

  return (
    <View style={[styles.stepContainer, { paddingBottom: 0 }]}>
      <Text style={styles.stepTitle}>{t('onboarding.quickAdd')}</Text>
      <Text style={styles.stepSubtitle}>Tap the ones you use</Text>

      <ScrollView
        style={styles.servicesScroll}
        contentContainerStyle={styles.servicesGrid}
        showsVerticalScrollIndicator={false}
      >
        {POPULAR_SERVICES.map((service) => {
          const isSelected = selected.has(service.id);
          return (
            <TouchableOpacity
              key={service.id}
              style={[
                styles.serviceCard,
                isSelected && { borderColor: colors.primary, borderWidth: 2, backgroundColor: `${colors.primary}12` },
              ]}
              onPress={() => onToggle(service.id)}
              activeOpacity={0.75}
            >
              {isSelected && (
                <View style={styles.serviceCheck}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                </View>
              )}
              <Text style={styles.serviceIcon}>{service.icon}</Text>
              <Text style={styles.serviceName} numberOfLines={1}>{service.name}</Text>
              <Text style={styles.servicePrice}>{service.price}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Try Demo link */}
        <TouchableOpacity style={styles.demoLinkWrap} onPress={onTryDemo} activeOpacity={0.7}>
          <Ionicons name="flask-outline" size={16} color={colors.textMuted} />
          <Text style={styles.demoLinkText}>{t('onboarding.tryDemo')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.stepActions, { paddingTop: 12 }]}>
        {count > 0 ? (
          <TouchableOpacity style={styles.primaryButtonWrap} onPress={onAddSelected} activeOpacity={0.85}>
            <LinearGradient
              colors={[colors.primary, colors.pink]}
              style={styles.primaryButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.primaryButtonText}>
                {t('onboarding.addSelected').replace('{{count}}', String(count))}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryButtonWrap} onPress={onSkip} activeOpacity={0.85}>
            <View style={[styles.primaryButtonGradient, { backgroundColor: colors.bgCard, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={[styles.primaryButtonText, { color: colors.textMuted }]}>{t('onboarding.skip')}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

interface StepFeaturesProps {
  colors: ThemeColors;
  onNext: () => void;
}

function StepFeatures({ colors, onNext }: StepFeaturesProps) {
  const styles = createStyles(colors);

  const features = [
    {
      icon: 'alarm-outline' as const,
      color: colors.amber,
      title: t('onboarding.featureTrialTitle'),
      desc: t('onboarding.featureTrialDesc'),
    },
    {
      icon: 'notifications-outline' as const,
      color: colors.primary,
      title: t('onboarding.featureReminderTitle'),
      desc: t('onboarding.featureReminderDesc'),
    },
    {
      icon: 'camera-outline' as const,
      color: colors.cyan,
      title: t('onboarding.featureImportTitle'),
      desc: t('onboarding.featureImportDesc'),
    },
    {
      icon: 'bar-chart-outline' as const,
      color: colors.emerald,
      title: t('onboarding.featureInsightsTitle'),
      desc: t('onboarding.featureInsightsDesc'),
    },
  ];

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('onboarding.features')}</Text>

      <View style={styles.featuresGrid}>
        {features.map((f, i) => (
          <View key={i} style={styles.featureCard}>
            <View style={[styles.featureIconWrap, { backgroundColor: `${f.color}18` }]}>
              <Ionicons name={f.icon} size={28} color={f.color} />
            </View>
            <Text style={styles.featureTitle}>{f.title}</Text>
            <Text style={styles.featureDesc}>{f.desc}</Text>
          </View>
        ))}
      </View>

      <View style={styles.stepActions}>
        <TouchableOpacity style={styles.primaryButtonWrap} onPress={onNext} activeOpacity={0.85}>
          <LinearGradient
            colors={[colors.primary, colors.pink]}
            style={styles.primaryButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.primaryButtonText}>{t('onboarding.next')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface StepSetupProps {
  colors: ThemeColors;
  currency: string;
  onCurrencyChange: (c: string) => void;
  budget: string;
  onBudgetChange: (v: string) => void;
  notificationsOn: boolean;
  onNotificationsChange: (v: boolean) => void;
  onFinish: () => void;
}

function StepSetup({ colors, currency, onCurrencyChange, budget, onBudgetChange, notificationsOn, onNotificationsChange, onFinish }: StepSetupProps) {
  const styles = createStyles(colors);

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('onboarding.quickSetup')}</Text>

      {/* Currency picker */}
      <View style={styles.setupSection}>
        <Text style={styles.setupLabel}>{t('onboarding.selectCurrency')}</Text>
        <View style={styles.currencyRow}>
          {CURRENCIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.currencyChip,
                currency === c && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => onCurrencyChange(c)}
              activeOpacity={0.7}
            >
              <Text style={[styles.currencyChipText, currency === c && { color: '#FFFFFF' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Budget input */}
      <View style={styles.setupSection}>
        <Text style={styles.setupLabel}>{t('onboarding.setBudget')}</Text>
        <View style={styles.budgetInputWrap}>
          <Text style={styles.budgetPrefix}>{currency}</Text>
          <TextInput
            style={styles.budgetInput}
            value={budget}
            onChangeText={onBudgetChange}
            placeholder="100"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      {/* Notifications toggle */}
      <View style={styles.setupSection}>
        <View style={styles.notifRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.setupLabel}>{t('onboarding.enableNotifications')}</Text>
            <Text style={styles.setupSubLabel}>{t('onboarding.notificationDesc')}</Text>
          </View>
          <Switch
            value={notificationsOn}
            onValueChange={onNotificationsChange}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={[styles.stepActions, { marginTop: 'auto' }]}>
        <TouchableOpacity style={styles.primaryButtonWrap} onPress={onFinish} activeOpacity={0.85}>
          <LinearGradient
            colors={[colors.primary, colors.pink]}
            style={styles.primaryButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.primaryButtonText}>{t('onboarding.finishSetup')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------- Main screen ----------------

const TOTAL_STEPS = 4;

export function OnboardingScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [step, setStep] = useState(0);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [currency, setCurrency] = useState('USD');
  const [budget, setBudget] = useState('');
  const [notificationsOn, setNotificationsOn] = useState(true);

  const scrollRef = useRef<ScrollView>(null);
  const { setHasSeenOnboarding, setCurrency: saveSettingsCurrency, setBudgetLimit, setBudgetEnabled } = useSettingsStore();
  const { addSubscription, loadDemoData } = useSubscriptionStore();

  // Animated opacity for step transitions
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);

  const animateToStep = (nextStep: number) => {
    const direction = nextStep > step ? 1 : -1;
    opacity.value = withTiming(0, { duration: 150 }, () => {
      translateX.value = direction * 40;
      opacity.value = withSpring(1, { damping: 20 });
      translateX.value = withSpring(0, { damping: 20 });
    });
    setStep(nextStep);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  const handleSkip = () => {
    // Skip straight to last step
    animateToStep(TOTAL_STEPS - 1);
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      animateToStep(step + 1);
    }
  };

  const handleToggleService = (id: string) => {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddSelected = () => {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    selectedServices.forEach((serviceId) => {
      const svc = POPULAR_SERVICES.find((s) => s.id === serviceId);
      if (!svc) return;
      const sub: Subscription = {
        id: Crypto.randomUUID(),
        name: svc.name,
        amount: svc.amount,
        currency: svc.currency,
        cycle: 'monthly',
        nextBillingDate: nextMonth.toISOString(),
        category: svc.category,
        iconKey: svc.icon,
        colorKey: svc.color,
        status: 'active',
        source: 'manual',
        detection: null,
        cancelUrl: null,
        manageUrl: null,
        notes: '',
        isTrial: false,
        trialEndsAt: null,
        lifecycle: [],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      addSubscription(sub);
    });
    animateToStep(step + 1);
  };

  const handleTryDemo = () => {
    loadDemoData();
    completeOnboarding();
  };

  const completeOnboarding = () => {
    // Save settings
    saveSettingsCurrency(currency);
    if (budget && parseFloat(budget) > 0) {
      setBudgetLimit(parseFloat(budget));
      setBudgetEnabled(true);
    }
    if (notificationsOn) {
      requestNotificationPermission().catch(() => {});
    }
    setHasSeenOnboarding(true);
    navigation.replace('Paywall', { fromOnboarding: true });
  };

  const handleFinish = () => {
    completeOnboarding();
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <StepWelcome
            colors={colors}
            onGetStarted={handleNext}
            onAlreadyHave={handleSkip}
          />
        );
      case 1:
        return (
          <StepQuickAdd
            colors={colors}
            selected={selectedServices}
            onToggle={handleToggleService}
            onAddSelected={handleAddSelected}
            onSkip={handleNext}
            onTryDemo={handleTryDemo}
          />
        );
      case 2:
        return (
          <StepFeatures
            colors={colors}
            onNext={handleNext}
          />
        );
      case 3:
        return (
          <StepSetup
            colors={colors}
            currency={currency}
            onCurrencyChange={setCurrency}
            budget={budget}
            onBudgetChange={setBudget}
            notificationsOn={notificationsOn}
            onNotificationsChange={setNotificationsOn}
            onFinish={handleFinish}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header: skip button + dots */}
      <View style={styles.header}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === step && styles.dotActive,
                i < step && styles.dotDone,
              ]}
            />
          ))}
        </View>

        {/* Skip button — hidden on Welcome and Setup steps */}
        {step > 0 && step < TOTAL_STEPS - 1 ? (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.7}>
            <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipButton} />
        )}
      </View>

      {/* Step content */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
          {renderStep()}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------- Styles ----------------

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    dots: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    dotActive: {
      width: 24,
      backgroundColor: colors.primary,
    },
    dotDone: {
      backgroundColor: `${colors.primary}50`,
    },
    skipButton: {
      paddingVertical: 6,
      paddingHorizontal: 4,
      minWidth: 48,
      alignItems: 'flex-end',
    },
    skipText: {
      fontSize: 15,
      color: colors.textMuted,
      fontWeight: '500',
    },

    // Shared step container
    stepContainer: {
      flex: 1,
      paddingHorizontal: 24,
      paddingBottom: 24,
    },

    // Welcome step
    welcomeLogoArea: {
      alignItems: 'center',
      marginTop: 32,
      marginBottom: 32,
    },
    welcomeLogo: {
      width: 120,
      height: 120,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    appName: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
    },
    welcomeTextArea: {
      alignItems: 'center',
      marginBottom: 48,
    },
    welcomeTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      lineHeight: 34,
      marginBottom: 12,
    },
    welcomeSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    welcomeActions: {
      gap: 12,
    },

    // Shared action button
    primaryButtonWrap: {
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
    },
    primaryButtonGradient: {
      paddingVertical: 17,
      alignItems: 'center',
    },
    primaryButtonText: {
      fontSize: 17,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    linkButton: {
      paddingVertical: 14,
      alignItems: 'center',
    },
    linkButtonText: {
      fontSize: 15,
      color: colors.textMuted,
      fontWeight: '500',
    },

    stepActions: {
      paddingTop: 16,
      gap: 10,
    },

    // Quick Add step
    stepTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      marginTop: 8,
      marginBottom: 6,
    },
    stepSubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 20,
    },
    servicesScroll: {
      flex: 1,
    },
    servicesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      paddingBottom: 16,
    },
    serviceCard: {
      width: (width - 48 - 10 * 2) / 3,
      backgroundColor: colors.bgCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      padding: 12,
      alignItems: 'center',
      position: 'relative',
      minHeight: 88,
      justifyContent: 'center',
    },
    serviceCheck: {
      position: 'absolute',
      top: 6,
      right: 6,
    },
    serviceIcon: {
      fontSize: 26,
      marginBottom: 6,
    },
    serviceName: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    servicePrice: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 2,
      textAlign: 'center',
    },
    demoLinkWrap: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      gap: 6,
    },
    demoLinkText: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: '500',
    },

    // Features step
    featuresGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 20,
      flex: 1,
    },
    featureCard: {
      width: (width - 48 - 12) / 2,
      backgroundColor: colors.bgCard,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    featureIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    featureTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    featureDesc: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 18,
    },

    // Setup step
    setupSection: {
      marginTop: 24,
    },
    setupLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    setupSubLabel: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    currencyRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    currencyChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.bgCard,
    },
    currencyChipText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    budgetInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: 16,
      height: 52,
    },
    budgetPrefix: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textMuted,
      marginRight: 8,
    },
    budgetInput: {
      flex: 1,
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      paddingVertical: 0,
    },
    notifRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
  });
