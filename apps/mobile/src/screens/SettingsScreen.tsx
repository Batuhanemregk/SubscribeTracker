/**
 * SettingsScreen - App settings
 * Uses Zustand stores and new component library
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components';
import { colors, borderRadius } from '../theme';
import { useSettingsStore, usePlanStore, useSubscriptionStore, useAccountStore } from '../state';
import { sendTestNotification, scheduleAllReminders } from '../services';

type SettingsRowProps = {
  icon: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
};

function SettingsRow({ icon, iconColor, title, subtitle, onPress, rightElement, destructive }: SettingsRowProps) {
  return (
    <TouchableOpacity 
      style={styles.row} 
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, destructive && styles.destructiveText]}>{title}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || (
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity 
      style={[styles.toggle, value && styles.toggleActive]}
      onPress={() => onChange(!value)}
    >
      <View style={[styles.toggleDot, value && styles.toggleDotActive]} />
    </TouchableOpacity>
  );
}

export function SettingsScreen({ navigation }: any) {
  const { app, setNotifications, setBiometricLock, resetToDefaults } = useSettingsStore();
  const { plan, isPro, downgradeToStandard } = usePlanStore();
  const { accounts, getAccountCount } = useAccountStore();
  const subscriptionStore = useSubscriptionStore();

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all your subscriptions and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            subscriptionStore.setSubscriptions([]);
            resetToDefaults();
            Alert.alert('Success', 'All data has been cleared');
          },
        },
      ]
    );
  };

  const handleDisconnectAccount = () => {
    Alert.alert(
      'Disconnect Account',
      'This will revoke access to your email account. Detected subscriptions will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement disconnect
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account & Data',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            subscriptionStore.setSubscriptions([]);
            resetToDefaults();
            // TODO: Clear all stores
            Alert.alert('Success', 'Your account has been deleted');
          },
        },
      ]
    );
  };

  const handleResetPlan = () => {
    Alert.alert(
      'Reset to Standard',
      'This will downgrade your plan to Standard (Debug only).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: () => {
            downgradeToStandard();
            Alert.alert('Done', 'Plan reset to Standard');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Header
          icon="settings"
          iconColor={colors.primary}
          title="Settings"
          subtitle="Manage your preferences"
        />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan Section */}
        <Text style={styles.sectionTitle}>Plan</Text>
        <View style={styles.card}>
          <View style={styles.planCard}>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>{isPro() ? 'PRO' : 'STANDARD'}</Text>
            </View>
            <Text style={styles.planTitle}>
              {isPro() ? 'Pro Member' : 'Free Plan'}
            </Text>
            <Text style={styles.planDescription}>
              {isPro() 
                ? 'Enjoy unlimited scans, no ads, and all premium features'
                : 'Connect 1 email, basic scanning, with ads'}
            </Text>
            {!isPro() && (
              <TouchableOpacity 
                style={styles.upgradeButton}
                onPress={() => navigation.navigate('Paywall')}
              >
                <Text style={styles.upgradeText}>Upgrade to Pro</Text>
              </TouchableOpacity>
            )}
            {isPro() && (
              <TouchableOpacity 
                style={styles.debugButton}
                onPress={handleResetPlan}
              >
                <Text style={styles.debugText}>Reset to Standard (Debug)</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Email Accounts Section */}
        <Text style={styles.sectionTitle}>Email Accounts</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="mail"
            iconColor={colors.cyan}
            title="Connected Accounts"
            subtitle={`${getAccountCount()}/${isPro() ? 5 : 1} accounts`}
            onPress={() => navigation.navigate('EmailAccounts')}
          />
        </View>

        {/* Preferences Section */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="notifications"
            iconColor={colors.amber}
            title="Push Notifications"
            subtitle="Get reminders before billing"
            rightElement={
              <Toggle 
                value={app.notificationsEnabled} 
                onChange={setNotifications} 
              />
            }
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="send"
            iconColor={colors.emerald}
            title="Test Notification"
            subtitle="Send a test push notification"
            onPress={() => {
              sendTestNotification();
              Alert.alert('Sent!', 'Check your notifications');
            }}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="finger-print"
            iconColor={colors.pink}
            title="Biometric Lock"
            subtitle="Secure app with Face ID/Touch ID"
            rightElement={
              <Toggle 
                value={app.biometricLockEnabled} 
                onChange={setBiometricLock} 
              />
            }
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="moon"
            iconColor={colors.primary}
            title="Appearance"
            subtitle={app.theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            onPress={() => {/* TODO: Theme picker */}}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="cash"
            iconColor={colors.emerald}
            title="Currency"
            subtitle={app.currency}
            onPress={() => {/* TODO: Currency picker */}}
          />
        </View>

        {/* Data Section */}
        <Text style={styles.sectionTitle}>Data & Privacy</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="download"
            iconColor={colors.cyan}
            title="Export Data"
            subtitle="Download your subscription data"
            onPress={() => {/* TODO: Export */}}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="unlink"
            iconColor={colors.amber}
            title="Disconnect Account"
            subtitle="Revoke email access"
            onPress={handleDisconnectAccount}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="trash"
            iconColor={colors.red}
            title="Clear All Data"
            destructive
            onPress={handleClearData}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="person-remove"
            iconColor={colors.red}
            title="Delete Account"
            subtitle="Permanently delete your account"
            destructive
            onPress={handleDeleteAccount}
          />
        </View>

        {/* Legal Section */}
        <Text style={styles.sectionTitle}>Legal</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="document-text"
            iconColor={colors.textMuted}
            title="Privacy Policy"
            onPress={() => {/* TODO: Open privacy policy */}}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="document"
            iconColor={colors.textMuted}
            title="Terms of Service"
            onPress={() => {/* TODO: Open terms */}}
          />
        </View>

        {/* Version */}
        <Text style={styles.version}>SubscribeTracker v1.0.0</Text>
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
  destructiveText: {
    color: colors.red,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 70,
  },
  toggle: {
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
    color: colors.text,
    letterSpacing: 1,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  upgradeButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  upgradeText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  debugButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.bgElevated,
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    color: colors.amber,
  },
  version: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 16,
  },
});
