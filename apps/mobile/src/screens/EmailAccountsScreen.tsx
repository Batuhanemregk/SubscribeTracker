/**
 * EmailAccountsScreen - Manage connected email accounts
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { Header, PrimaryButton, EmptyState } from '../components';
import { colors, borderRadius } from '../theme';
import { useAccountStore, usePlanStore } from '../state';
import type { EmailAccount } from '../types';

// Provider icons and colors
const PROVIDER_CONFIG = {
  gmail: {
    name: 'Gmail',
    icon: 'mail',
    color: '#EA4335',
    bgColor: '#EA433520',
  },
  outlook: {
    name: 'Outlook',
    icon: 'mail-outline',
    color: '#0078D4',
    bgColor: '#0078D420',
  },
};

function AccountCard({ account, index, onRemove }: { 
  account: EmailAccount; 
  index: number;
  onRemove: () => void;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  React.useEffect(() => {
    opacity.value = withDelay(index * 80, withSpring(1));
    translateY.value = withDelay(index * 80, withSpring(0, { damping: 15 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const config = PROVIDER_CONFIG[account.provider];
  const isError = account.status === 'error';
  const isDisconnected = account.status === 'disconnected';

  const handleRemove = () => {
    Alert.alert(
      'Remove Account',
      `Are you sure you want to disconnect ${account.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onRemove },
      ]
    );
  };

  return (
    <Animated.View style={[styles.accountCard, animatedStyle]}>
      <View style={[styles.providerIcon, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon as any} size={24} color={config.color} />
      </View>

      <View style={styles.accountInfo}>
        <View style={styles.accountHeader}>
          <Text style={styles.providerName}>{config.name}</Text>
          {account.status === 'active' && (
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>Active</Text>
            </View>
          )}
          {isError && (
            <View style={styles.errorBadge}>
              <Ionicons name="warning" size={12} color={colors.red} />
              <Text style={styles.errorText}>Error</Text>
            </View>
          )}
        </View>
        <Text style={styles.email}>{account.email}</Text>
        {account.lastSyncAt && (
          <Text style={styles.lastSync}>
            Last synced: {new Date(account.lastSyncAt).toLocaleDateString()}
          </Text>
        )}
      </View>

      <TouchableOpacity style={styles.removeButton} onPress={handleRemove}>
        <Ionicons name="trash-outline" size={18} color={colors.red} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export function EmailAccountsScreen({ navigation }: any) {
  const { accounts, removeAccount, getAccountCount } = useAccountStore();
  const { isPro, canAddEmailAccount } = usePlanStore();

  const accountCount = getAccountCount();
  const maxAccounts = isPro() ? 5 : 1;
  const canAdd = canAddEmailAccount(accountCount);

  const handleAddAccount = () => {
    if (!canAdd) {
      Alert.alert(
        'Account Limit Reached',
        isPro() 
          ? 'You can connect up to 5 email accounts.'
          : 'Upgrade to Pro to connect more email accounts.',
        [
          { text: 'Cancel', style: 'cancel' },
          !isPro() && { text: 'Upgrade', onPress: () => navigation.navigate('Paywall') },
        ].filter(Boolean) as any
      );
      return;
    }
    navigation.navigate('AddEmailAccount');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Header
          title="Email Accounts"
          subtitle="Manage connected accounts"
          showBack
        />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Limit */}
        <View style={styles.limitCard}>
          <View style={styles.limitInfo}>
            <Text style={styles.limitLabel}>Connected Accounts</Text>
            <Text style={styles.limitValue}>
              {accountCount} / {maxAccounts}
            </Text>
          </View>
          <View style={styles.limitBar}>
            <View 
              style={[
                styles.limitFill, 
                { width: `${(accountCount / maxAccounts) * 100}%` }
              ]} 
            />
          </View>
          {!isPro() && (
            <TouchableOpacity 
              style={styles.upgradeLink}
              onPress={() => navigation.navigate('Paywall')}
            >
              <Text style={styles.upgradeLinkText}>Upgrade for more accounts</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Account List */}
        {accounts.length > 0 ? (
          accounts.map((account, index) => (
            <AccountCard
              key={account.id}
              account={account}
              index={index}
              onRemove={() => removeAccount(account.id)}
            />
          ))
        ) : (
          <EmptyState
            icon="mail-outline"
            title="No accounts connected"
            subtitle="Connect your email to auto-detect subscriptions"
            primaryAction={{
              title: 'Connect Email',
              onPress: handleAddAccount,
            }}
          />
        )}
      </ScrollView>

      {/* Add Button */}
      {accounts.length > 0 && (
        <View style={styles.footer}>
          <PrimaryButton
            title="Add Account"
            onPress={handleAddAccount}
            disabled={!canAdd}
          />
        </View>
      )}
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
  limitCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  limitInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  limitLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  limitValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  limitBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  limitFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  upgradeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 4,
  },
  upgradeLinkText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountInfo: {
    flex: 1,
    marginLeft: 14,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.emerald}20`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.emerald,
  },
  activeText: {
    fontSize: 11,
    color: colors.emerald,
    fontWeight: '600',
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.red}20`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  errorText: {
    fontSize: 11,
    color: colors.red,
    fontWeight: '600',
  },
  email: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  lastSync: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.red}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
