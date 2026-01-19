/**
 * AddSubscriptionScreen - Add/Edit subscription form
 * Uses new component library with proper validation
 */
import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
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
import { colors } from '../theme';
import { useSubscriptionStore, createSubscription, generateId } from '../state';
import type { BillingCycle, Subscription } from '../types';

interface AddSubscriptionScreenProps {
  navigation: any;
  route: any;
}

const cycleOptions = [
  { value: 'monthly' as BillingCycle, label: 'Monthly' },
  { value: 'yearly' as BillingCycle, label: 'Yearly' },
  { value: 'weekly' as BillingCycle, label: 'Weekly' },
];

const categoryOptions = [
  'Entertainment', 'Music', 'Development', 'Design', 
  'Productivity', 'Storage', 'Finance', 'Health', 'Education', 'Other'
];

export function AddSubscriptionScreen({ navigation, route }: AddSubscriptionScreenProps) {
  const { subscriptionId, editMode } = route.params || {};
  const { addSubscription, updateSubscription, getSubscriptionById } = useSubscriptionStore();

  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [category, setCategory] = useState('Entertainment');
  const [iconKey, setIconKey] = useState('🎵');
  const [colorKey, setColorKey] = useState('#8B5CF6');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load existing subscription for edit mode
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
      }
    }
  }, [editMode, subscriptionId]);

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a subscription name');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
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
        });
        addSubscription(newSub);
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Header
          title={editMode ? 'Edit Subscription' : 'Add Subscription'}
          showBack
        />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TextInput
          label="Subscription Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g., Netflix, Spotify"
        />

        <AmountInput
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          currency="$"
        />

        <SegmentedControl
          label="Billing Cycle"
          options={cycleOptions}
          value={cycle}
          onChange={setCycle}
        />

        <IconGrid
          label="Icon"
          value={iconKey}
          onChange={setIconKey}
        />

        <ColorGrid
          label="Color"
          value={colorKey}
          onChange={setColorKey}
        />

        <View style={styles.buttonRow}>
          <SecondaryButton
            title="Cancel"
            onPress={() => navigation.goBack()}
            fullWidth={false}
            style={styles.button}
          />
          <PrimaryButton
            title={editMode ? 'Save Changes' : 'Add Subscription'}
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
  },
});
