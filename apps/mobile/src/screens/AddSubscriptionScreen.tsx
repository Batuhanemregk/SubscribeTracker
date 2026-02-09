/**
 * AddSubscriptionScreen - Add/Edit subscription form
 * Uses new component library with proper validation
 */
import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Alert, Text, TouchableOpacity, Modal, TextInput as RNTextInput } from 'react-native';
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
import { useSubscriptionStore, useSettingsStore, createSubscription, generateId } from '../state';
import { Ionicons } from '@expo/vector-icons';
import type { BillingCycle, Subscription } from '../types';
import { t } from '../i18n';
import { matchKnownService } from '../utils';

interface AddSubscriptionScreenProps {
  navigation: any;
  route: any;
}

const cycleOptions = [
  { value: 'monthly' as BillingCycle, label: t('addSubscription.monthly') },
  { value: 'yearly' as BillingCycle, label: t('addSubscription.yearly') },
  { value: 'weekly' as BillingCycle, label: t('addSubscription.weekly') },
];

const DEFAULT_CATEGORIES = [
  'Entertainment', 'Music', 'Development', 'Design', 
  'Productivity', 'Storage', 'Finance', 'Health', 'Education', 'Other'
];

export function AddSubscriptionScreen({ navigation, route }: AddSubscriptionScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { subscriptionId, editMode, prefillData } = route.params || {};
  const { addSubscription, updateSubscription, getSubscriptionById } = useSubscriptionStore();
  const { customCategories, addCustomCategory } = useSettingsStore();

  // Merge default + custom categories
  const allCategories = useMemo(() => {
    const customNames = customCategories.map(c => c.name);
    return [...DEFAULT_CATEGORIES, ...customNames.filter(n => !DEFAULT_CATEGORIES.includes(n))];
  }, [customCategories]);

  // Custom category creation modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [category, setCategory] = useState('Entertainment');
  const [iconKey, setIconKey] = useState('🎵');
  const [colorKey, setColorKey] = useState('#8B5CF6');
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('addSubscription.nameRequired'));
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert(t('common.error'), t('addSubscription.amountRequired'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate next billing date (today + 1 cycle)
      const today = new Date();
      let nextBillingDate: Date;
      switch (cycle) {
        case 'weekly':
          nextBillingDate = new Date(today.setDate(today.getDate() + 7));
          break;
        case 'monthly':
          nextBillingDate = new Date(today.setMonth(today.getMonth() + 1));
          break;
        case 'quarterly':
          nextBillingDate = new Date(today.setMonth(today.getMonth() + 3));
          break;
        case 'yearly':
          nextBillingDate = new Date(today.setFullYear(today.getFullYear() + 1));
          break;
        default:
          nextBillingDate = new Date(today.setMonth(today.getMonth() + 1));
      }

      if (editMode && subscriptionId) {
        // Update existing
        updateSubscription(subscriptionId, {
          name: name.trim(),
          amount: parseFloat(amount),
          cycle,
          category,
          iconKey,
          colorKey,
          logoUrl,
        });
      } else {
        // Create new
        const newSub = createSubscription({
          name: name.trim(),
          amount: parseFloat(amount),
          currency: 'USD',
          cycle,
          nextBillingDate: nextBillingDate.toISOString(),
          category,
          iconKey,
          colorKey,
          logoUrl,
        });
        addSubscription(newSub);
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
    <View style={styles.container}>
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
          label={t('addSubscription.serviceName')}
          value={name}
          onChangeText={setName}
          placeholder={t('addSubscription.serviceNamePlaceholder')}
        />

        <AmountInput
          label={t('addSubscription.amount')}
          value={amount}
          onChangeText={setAmount}
          currency="$"
        />

        <SegmentedControl
          label={t('addSubscription.billingCycle')}
          options={cycleOptions}
          value={cycle}
          onChange={setCycle}
        />

        {/* Category Picker */}
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 }}>
          {t('addSubscription.category')}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {allCategories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: category === cat ? colors.primary : `${colors.text}10`,
                  borderWidth: 1,
                  borderColor: category === cat ? colors.primary : `${colors.text}20`,
                }}
              >
                <Text style={{
                  fontSize: 13,
                  fontWeight: category === cat ? '600' : '400',
                  color: category === cat ? '#FFFFFF' : colors.textSecondary,
                }}>
                  {t(`categories.${cat}`, { defaultValue: cat })}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowCategoryModal(true)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: `${colors.primary}40`,
                borderStyle: 'dashed',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500' }}>{t('addSubscription.newCategory')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Custom Category Creation Modal */}
        <Modal
          visible={showCategoryModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCategoryModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 32 }}>
            <View style={{ backgroundColor: colors.bgCard, borderRadius: 20, padding: 24 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 16 }}>
                {t('addSubscription.customCategory')}
              </Text>
              <RNTextInput
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder={t('addSubscription.categoryName')}
                placeholderTextColor={colors.textMuted}
                style={{
                  color: colors.text,
                  backgroundColor: `${colors.text}08`,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 16,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: `${colors.text}15`,
                }}
                autoFocus
              />
              <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
                <TouchableOpacity
                  onPress={() => {
                    setNewCategoryName('');
                    setShowCategoryModal(false);
                  }}
                  style={{ paddingHorizontal: 16, paddingVertical: 10 }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 15, fontWeight: '500' }}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const trimmed = newCategoryName.trim();
                    if (!trimmed) return;
                    if (allCategories.includes(trimmed)) {
                      Alert.alert('Exists', 'This category already exists.');
                      return;
                    }
                    addCustomCategory({
                      id: generateId(),
                      name: trimmed,
                      icon: '📁',
                      color: colors.primary,
                    });
                    setCategory(trimmed);
                    setNewCategoryName('');
                    setShowCategoryModal(false);
                  }}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    backgroundColor: colors.primary,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>{t('addSubscription.createCategory')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <IconGrid
          label={t('addSubscription.selectIcon')}
          value={iconKey}
          onChange={setIconKey}
        />

        <ColorGrid
          label={t('addSubscription.selectColor')}
          value={colorKey}
          onChange={setColorKey}
        />

        <View style={styles.buttonRow}>
          <SecondaryButton
            title={t('common.cancel')}
            onPress={() => navigation.goBack()}
            fullWidth={false}
            style={styles.button}
          />
          <PrimaryButton
            title={editMode ? t('addSubscription.updateSubscription') : t('addSubscription.saveSubscription')}
            onPress={handleSave}
            loading={isSubmitting}
            fullWidth={false}
            style={styles.button}
          />
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
  },
});
