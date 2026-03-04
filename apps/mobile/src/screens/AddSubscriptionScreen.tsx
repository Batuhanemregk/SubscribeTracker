/**
 * AddSubscriptionScreen - Add/Edit subscription form
 * Uses new component library with proper validation
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
  TextInput as RNTextInput,
  Switch,
} from 'react-native';
import {
  Header,
  TextInput,
  AmountInput,
  SegmentedControl,
  IconGrid,
  ColorGrid,
  PrimaryButton,
  SecondaryButton,
} from '../components';
import { useTheme, type ThemeColors } from '../theme';
import { useSubscriptionStore, useSettingsStore, createSubscription } from '../state';
import { Ionicons } from '@expo/vector-icons';
import type { BillingCycle, Subscription } from '../types';
import { t } from '../i18n';
import { matchKnownService, getCurrencySymbol, findDuplicates } from '../utils';
import type { DuplicateMatch } from '../utils';
import { showAfterFirstSubscriptionAd } from '../services';

interface AddSubscriptionScreenProps {
  navigation: any;
  route: any;
}

export function AddSubscriptionScreen({ navigation, route }: AddSubscriptionScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { subscriptionId, editMode, prefillData } = route.params || {};
  const { subscriptions, addSubscription, updateSubscription, getSubscriptionById } =
    useSubscriptionStore();
  const { app, customCategories, getAllCategories, savedPaymentMethods, addPaymentMethod } =
    useSettingsStore();

  const cycleOptions = [
    { value: 'monthly' as BillingCycle, label: t('addSubscription.monthly') },
    { value: 'yearly' as BillingCycle, label: t('addSubscription.yearly') },
    { value: 'weekly' as BillingCycle, label: t('addSubscription.weekly') },
    { value: 'custom' as BillingCycle, label: t('addSubscription.custom') },
  ];

  // All categories from store (default + custom)
  const allCategories = useMemo(() => getAllCategories(), [customCategories]);

  // Duplicate detection
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [category, setCategory] = useState('other');
  const [iconKey, setIconKey] = useState('🎵');
  const [colorKey, setColorKey] = useState('#8B5CF6');
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customDays, setCustomDays] = useState('30');
  const [isTrial, setIsTrial] = useState(false);
  const [trialDays, setTrialDays] = useState<number>(7);
  const [customTrialDays, setCustomTrialDays] = useState('');
  const [billingDate, setBillingDate] = useState<Date>(new Date());

  // Inline validation errors (AC-QA-02)
  const [errors, setErrors] = useState<{ name?: string; amount?: string; date?: string }>({});

  // Load existing subscription for edit mode OR prefill from template
  useEffect(() => {
    if (editMode && subscriptionId) {
      const existing = getSubscriptionById(subscriptionId);
      if (existing) {
        setName(existing.name);
        setAmount(existing.amount.toString());
        setCycle(existing.cycle);
        setCategory(existing.category);
        setIconKey(existing.iconKey);
        setColorKey(existing.colorKey);
        if (existing.logoUrl) setLogoUrl(existing.logoUrl);
        if (existing.customDays) setCustomDays(existing.customDays.toString());
        if (existing.isTrial) {
          setIsTrial(true);
          if (existing.trialEndsAt) {
            const daysLeft = Math.max(
              1,
              Math.ceil(
                (new Date(existing.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
              ),
            );
            setTrialDays(daysLeft);
          }
        }
        if (existing.paymentMethod) setPaymentMethod(existing.paymentMethod);
      }
    } else if (prefillData) {
      // Prefill from ServicePicker/PlanPicker
      if (prefillData.name) setName(prefillData.name);
      if (prefillData.amount) setAmount(prefillData.amount);
      if (prefillData.cycle) setCycle(prefillData.cycle);
      if (prefillData.category) setCategory(prefillData.category);
      if (prefillData.iconKey) setIconKey(prefillData.iconKey);
      if (prefillData.colorKey) setColorKey(prefillData.colorKey);
      if (prefillData.logoUrl) setLogoUrl(prefillData.logoUrl);
    }
  }, [editMode, subscriptionId, prefillData]);

  // Auto-match known service when name changes (only for new subscriptions without prefill)
  useEffect(() => {
    if (editMode || prefillData) return;
    if (!name.trim() || name.trim().length < 3) return;

    const matched = matchKnownService(name.trim());
    // Only auto-fill if it matched a known service (not the default '💳' fallback)
    if (matched.icon !== '💳' && matched.logoUrl) {
      setIconKey(matched.icon);
      setColorKey(matched.color);
      setCategory(matched.category);
      setLogoUrl(matched.logoUrl);
    }
  }, [name, editMode, prefillData]);

  // Duplicate detection — debounced 500ms, only for new subscriptions
  useEffect(() => {
    if (editMode) return;

    // Reset dismissed state when name changes significantly
    setDuplicateDismissed(false);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!name.trim() || name.trim().length < 2) {
      setDuplicateMatches([]);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      const matches = findDuplicates(name.trim(), subscriptions);
      // Only show matches with score >= 70
      setDuplicateMatches(matches.filter((m) => m.matchScore >= 70));
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [name, editMode, subscriptions]);

  const handleSave = async () => {
    // Inline validation (AC-QA-02)
    const newErrors: { name?: string; amount?: string; date?: string } = {};
    if (!name.trim()) {
      newErrors.name = t('addSubscription.nameRequired');
    }
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount =
        parseFloat(amount) === 0 || (amount && parseFloat(amount) < 0)
          ? t('addSubscription.amountInvalid')
          : t('addSubscription.amountRequired');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    setIsSubmitting(true);

    try {
      // Use the selected billing date (AC-QA-05)
      const nextBillingDate = new Date(billingDate);

      // Calculate trial end date
      const effectiveTrialDays = trialDays === -1 ? parseInt(customTrialDays) || 7 : trialDays;
      const trialEndsAt = isTrial
        ? new Date(Date.now() + effectiveTrialDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const trimmedPaymentMethod = paymentMethod.trim() || undefined;

      if (editMode && subscriptionId) {
        // Update existing
        updateSubscription(subscriptionId, {
          name: name.trim(),
          amount: parseFloat(amount),
          cycle,
          customDays: cycle === 'custom' ? parseInt(customDays) || 30 : undefined,
          category,
          iconKey,
          colorKey,
          logoUrl,
          isTrial,
          trialEndsAt,
          paymentMethod: trimmedPaymentMethod,
        });
      } else {
        // Create new
        const newSub = createSubscription({
          name: name.trim(),
          amount: parseFloat(amount),
          currency: app.currency,
          cycle,
          customDays: cycle === 'custom' ? parseInt(customDays) || 30 : undefined,
          nextBillingDate: isTrial && trialEndsAt ? trialEndsAt : billingDate.toISOString(),
          category,
          iconKey,
          colorKey,
          logoUrl,
          isTrial,
          trialEndsAt,
          paymentMethod: trimmedPaymentMethod,
        });
        addSubscription(newSub);
        // Show ad after first subscription added (once daily)
        showAfterFirstSubscriptionAd().catch(() => {});
      }

      if (trimmedPaymentMethod) {
        addPaymentMethod(trimmedPaymentMethod);
      }

      // After saving, return to Home screen cleanly
      if (!editMode) {
        navigation.popToTop();
      } else {
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert(t('common.error'), 'Failed to save subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View testID="add-subscription-screen" style={styles.container}>
      <View style={styles.header}>
        <Header
          title={editMode ? t('addSubscription.editTitle') : t('addSubscription.title')}
          showBack
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TextInput
          testID="add-service-name"
          label={t('addSubscription.serviceName')}
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          placeholder={t('addSubscription.serviceNamePlaceholder')}
          error={errors.name}
        />

        {/* Duplicate detection warning banner */}
        {duplicateMatches.length > 0 &&
          !duplicateDismissed &&
          (() => {
            const best = duplicateMatches[0];
            const sub = best.subscription;
            const addedDate = new Date(sub.createdAt).toLocaleDateString();
            const cycleKey = `subscription.per${sub.cycle.charAt(0).toUpperCase() + sub.cycle.slice(1)}`;
            const cycleLabel = t(cycleKey as any, { defaultValue: sub.cycle });
            return (
              <View style={styles.duplicateBanner}>
                <View style={styles.duplicateBannerHeader}>
                  <Ionicons name="warning-outline" size={16} color="#92400E" />
                  <Text style={styles.duplicatePossibleLabel}>
                    {t('duplicateDetection.possibleDuplicate')}
                  </Text>
                </View>
                <Text style={styles.duplicateWarningText}>
                  {t('duplicateDetection.warning', { name: sub.name })}
                </Text>
                <Text style={styles.duplicateDetailText}>
                  {t('duplicateDetection.warningDetail', {
                    price: `${getCurrencySymbol(sub.currency)}${sub.amount.toFixed(2)}`,
                    cycle: cycleLabel,
                    date: addedDate,
                  })}
                </Text>
                <View style={styles.duplicateBannerActions}>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('SubscriptionDetail', { subscriptionId: sub.id })
                    }
                    style={styles.duplicateViewBtn}
                  >
                    <Text style={styles.duplicateViewBtnText}>
                      {t('duplicateDetection.viewExisting')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setDuplicateDismissed(true)}
                    style={styles.duplicateAddAnywayBtn}
                  >
                    <Text style={styles.duplicateAddAnywayText}>
                      {t('duplicateDetection.addAnyway')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })()}

        <AmountInput
          label={t('addSubscription.amount')}
          value={amount}
          onChangeText={(text) => {
            setAmount(text);
            if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
          }}
          currency={getCurrencySymbol(app.currency)}
          error={errors.amount}
        />

        <SegmentedControl
          label={t('addSubscription.billingCycle')}
          options={cycleOptions}
          value={cycle}
          onChange={setCycle}
        />

        {/* First Billing Date Picker (AC-QA-05) */}
        <View style={{ marginBottom: 16 }} testID="add-billing-date-section">
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
            {t('addSubscription.firstBillingDate')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Quick select: Today, Tomorrow, Next Week, Next Month */}
            {[
              { label: 'Today', days: 0 },
              { label: '+1w', days: 7 },
              { label: '+2w', days: 14 },
              { label: '+1m', days: 30 },
            ].map((opt) => {
              const optDate = new Date(Date.now() + opt.days * 24 * 60 * 60 * 1000);
              const isSelected = billingDate.toDateString() === optDate.toDateString();
              return (
                <TouchableOpacity
                  key={opt.label}
                  testID={`add-date-${opt.label.toLowerCase().replace('+', '')}`}
                  onPress={() => setBillingDate(optDate)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: isSelected ? colors.primary : `${colors.text}10`,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.primary : `${colors.text}20`,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: isSelected ? '600' : '400',
                      color: isSelected ? '#FFFFFF' : colors.textSecondary,
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Display selected date */}
          <Text
            testID="add-billing-date-display"
            style={{
              color: colors.textSecondary,
              fontSize: 13,
              marginTop: 8,
              textAlign: 'center',
            }}
          >
            {billingDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          {errors.date && (
            <Text style={{ color: colors.red || '#EF4444', fontSize: 12, marginTop: 4 }}>
              {errors.date}
            </Text>
          )}
        </View>

        {cycle === 'custom' && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
              {t('addSubscription.customDays')}
            </Text>
            <RNTextInput
              value={customDays}
              onChangeText={setCustomDays}
              placeholder={t('addSubscription.customDaysPlaceholder')}
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              style={{
                color: colors.text,
                backgroundColor: `${colors.text}08`,
                borderRadius: 12,
                padding: 14,
                fontSize: 16,
                borderWidth: 1,
                borderColor: `${colors.text}15`,
              }}
            />
          </View>
        )}

        {/* Free Trial Toggle */}
        <View style={styles.trialRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
              {t('addSubscription.freeTrial')}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
              {t('addSubscription.freeTrialToggle')}
            </Text>
          </View>
          <Switch
            value={isTrial}
            onValueChange={setIsTrial}
            trackColor={{ false: `${colors.text}20`, true: `${colors.primary}60` }}
            thumbColor={isTrial ? colors.primary : '#f4f3f4'}
            accessibilityLabel={`Free trial: ${isTrial ? 'on' : 'off'}`}
            accessibilityRole="switch"
          />
        </View>

        {isTrial && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
              {t('addSubscription.trialEndDate')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[7, 14, 30].map((days) => (
                <TouchableOpacity
                  key={days}
                  onPress={() => {
                    setTrialDays(days);
                    setCustomTrialDays('');
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: trialDays === days ? colors.primary : `${colors.text}10`,
                    borderWidth: 1,
                    borderColor: trialDays === days ? colors.primary : `${colors.text}20`,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: trialDays === days ? '600' : '400',
                      color: trialDays === days ? '#FFFFFF' : colors.textSecondary,
                    }}
                  >
                    {days}d
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setTrialDays(-1)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: trialDays === -1 ? colors.primary : `${colors.text}10`,
                  borderWidth: 1,
                  borderColor: trialDays === -1 ? colors.primary : `${colors.text}20`,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: trialDays === -1 ? '600' : '400',
                    color: trialDays === -1 ? '#FFFFFF' : colors.textSecondary,
                  }}
                >
                  ...
                </Text>
              </TouchableOpacity>
            </View>
            {trialDays === -1 && (
              <RNTextInput
                value={customTrialDays}
                onChangeText={setCustomTrialDays}
                placeholder="Number of days"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                style={{
                  color: colors.text,
                  backgroundColor: `${colors.text}08`,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 16,
                  marginTop: 8,
                  borderWidth: 1,
                  borderColor: `${colors.text}15`,
                }}
              />
            )}
          </View>
        )}

        {/* Category Picker */}
        <Text
          style={{
            color: colors.text,
            fontSize: 14,
            fontWeight: '600',
            marginBottom: 8,
            marginTop: 16,
          }}
        >
          {t('addSubscription.category')}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
            {allCategories.map((cat) => {
              const isSelected = category === cat.id || category === cat.name.toLowerCase();
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: isSelected ? cat.color : `${colors.text}10`,
                    borderWidth: 1,
                    borderColor: isSelected ? cat.color : `${colors.text}20`,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={cat.name}
                  accessibilityState={{ checked: isSelected }}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={13}
                    color={isSelected ? '#FFFFFF' : colors.textSecondary}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: isSelected ? '600' : '400',
                      color: isSelected ? '#FFFFFF' : colors.textSecondary,
                    }}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        <TouchableOpacity
          onPress={() => navigation.navigate('CategoryManagement')}
          style={{
            marginBottom: 16,
            paddingVertical: 4,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Ionicons name="settings-outline" size={13} color={colors.primary} />
          <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500' }}>
            {t('categories.manageCategories')}
          </Text>
        </TouchableOpacity>

        {/* Payment Method */}
        <Text
          style={{
            color: colors.text,
            fontSize: 14,
            fontWeight: '600',
            marginBottom: 8,
            marginTop: 16,
          }}
        >
          {t('addSubscription.paymentMethod')}
        </Text>
        <RNTextInput
          value={paymentMethod}
          onChangeText={setPaymentMethod}
          placeholder={t('addSubscription.paymentMethodPlaceholder')}
          placeholderTextColor={colors.textMuted}
          style={{
            color: colors.text,
            backgroundColor: `${colors.text}08`,
            borderRadius: 12,
            padding: 14,
            fontSize: 16,
            borderWidth: 1,
            borderColor: `${colors.text}15`,
            marginBottom: savedPaymentMethods.length > 0 ? 8 : 16,
          }}
          accessibilityLabel="Payment method"
        />
        {savedPaymentMethods.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 16 }}
          >
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {savedPaymentMethods.map((method) => (
                <TouchableOpacity
                  key={method}
                  onPress={() => setPaymentMethod(method)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: paymentMethod === method ? colors.primary : `${colors.text}10`,
                    borderWidth: 1,
                    borderColor: paymentMethod === method ? colors.primary : `${colors.text}20`,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Ionicons
                    name="card-outline"
                    size={12}
                    color={paymentMethod === method ? '#FFFFFF' : colors.textSecondary}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: paymentMethod === method ? '600' : '400',
                      color: paymentMethod === method ? '#FFFFFF' : colors.textSecondary,
                    }}
                  >
                    {method}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        <IconGrid label={t('addSubscription.selectIcon')} value={iconKey} onChange={setIconKey} />

        <ColorGrid
          label={t('addSubscription.selectColor')}
          value={colorKey}
          onChange={setColorKey}
        />

        <View style={styles.buttonRow}>
          <SecondaryButton
            testID="add-cancel-btn"
            title={t('common.cancel')}
            onPress={() => navigation.goBack()}
            fullWidth={false}
            style={styles.button}
          />
          <PrimaryButton
            testID="add-submit-btn"
            title={
              editMode
                ? t('addSubscription.updateSubscription')
                : t('addSubscription.addSubscriptionButton')
            }
            onPress={handleSave}
            loading={isSubmitting}
            fullWidth={false}
            style={styles.button}
            accessibilityLabel={editMode ? 'Update subscription' : 'Add subscription'}
          />
        </View>
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
    scrollView: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: 40,
    },
    trialRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: `${colors.primary}10`,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: `${colors.primary}20`,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    button: {
      flex: 1,
    },
    // Duplicate detection banner
    duplicateBanner: {
      backgroundColor: '#FEF3C7',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#F59E0B',
      padding: 14,
      marginBottom: 16,
    },
    duplicateBannerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    duplicatePossibleLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: '#92400E',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    duplicateWarningText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#78350F',
      marginBottom: 4,
    },
    duplicateDetailText: {
      fontSize: 12,
      color: '#92400E',
      marginBottom: 12,
    },
    duplicateBannerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    duplicateViewBtn: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: '#F59E0B',
      borderRadius: 8,
      alignItems: 'center',
    },
    duplicateViewBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    duplicateAddAnywayBtn: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: 'transparent',
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#F59E0B',
    },
    duplicateAddAnywayText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#92400E',
    },
  });
