/**
 * SettingsScreen - App settings
 * Uses Zustand stores and new component library
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components';
import { borderRadius, useTheme, type ThemeColors } from '../theme';
import { useSettingsStore, usePlanStore, useSubscriptionStore, useAccountStore } from '../state';
import { sendTestNotification, scheduleAllReminders, requestBiometricEnrollment, signInWithGoogle, signOut as authSignOut } from '../services';
import { t } from '../i18n';


export function SettingsScreen({ navigation }: any) {
  const { colors, canUseLight, isDark } = useTheme();
  const styles = createStyles(colors);

  // --- Sub-components with access to dynamic styles/colors ---
  const SettingsRow = ({ icon, iconColor, title, subtitle, onPress, rightElement, destructive }: {
    icon: string; iconColor: string; title: string; subtitle?: string;
    onPress?: () => void; rightElement?: React.ReactNode; destructive?: boolean;
  }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, { backgroundColor: `${colors.text}08` }]}>
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

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <TouchableOpacity style={[styles.toggle, value && styles.toggleActive]} onPress={() => onChange(!value)}>
      <View style={[styles.toggleDot, value && styles.toggleDotActive]} />
    </TouchableOpacity>
  );

  const { app, setNotifications, setBiometricLock, resetToDefaults, setCurrency, setTheme, setLanguage } = useSettingsStore();
  const { plan, isPro, downgradeToStandard } = usePlanStore();
  const { account, isSignedIn } = useAccountStore();
  const subscriptionStore = useSubscriptionStore();

  const [isSigningIn, setIsSigningIn] = React.useState(false);

  const [themeModalVisible, setThemeModalVisible] = React.useState(false);
  const [languageModalVisible, setLanguageModalVisible] = React.useState(false);
  const themeOptions = ['dark', 'light', 'system'] as const;
  const themeLabels = { dark: 'Dark', light: 'Light', system: 'System' };

  const languageOptions = ['system', 'en', 'tr'] as const;
  const languageLabels: Record<string, string> = {
    system: t('languageSelector.system'),
    en: t('languageSelector.english'),
    tr: t('languageSelector.turkish'),
  };
  const languageIcons: Record<string, string> = {
    system: 'phone-portrait',
    en: 'language',
    tr: 'language',
  };

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
      'This will sign out your account and remove sync data. Your local subscriptions will remain.',
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
      'This will permanently delete ALL your data including subscriptions, account connections, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            // Clear all stores
            subscriptionStore.setSubscriptions([]);
            resetToDefaults();
            // Clear auth account if signed in
            if (account) {
              useAccountStore.getState().clearAccount();
            }
            Alert.alert('Account Deleted', 'All your data has been removed from this device.');
          },
        },
      ]
    );
  };

  const [currencyModalVisible, setCurrencyModalVisible] = React.useState(false);
  const currencies = ['USD', 'EUR', 'TRY', 'GBP', 'JPY', 'CAD', 'AUD'];

  const handleCurrencySelect = (currency: string) => {
    setCurrency(currency);
    setCurrencyModalVisible(false);
  };

  const handleThemeSelect = (theme: 'dark' | 'light' | 'system') => {
    setTheme(theme);
    setThemeModalVisible(false);
  };

  const handleOpenPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'Finify respects your privacy.\n\n• We do not store raw document content\n• Only subscription metadata is saved locally\n• No data is sent to external servers\n• You can delete all data anytime\n\nFor full policy, visit our website.',
      [{ text: 'OK' }]
    );
  };

  const handleOpenTerms = () => {
    Alert.alert(
      'Terms of Service',
      'By using SubscribeTracker you agree to:\n\n• Use the app for personal purposes\n• Not reverse engineer the app\n• Accept that Pro features require payment\n• Understand we are not liable for missed payments\n\nFor full terms, visit our website.',
      [{ text: 'OK' }]
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
          title={t('settings.title')}
          subtitle={t('settings.subtitle')}
        />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan Section */}
        <Text style={styles.sectionTitle}>{t('settings.plan')}</Text>
        <View style={styles.card}>
          <View style={styles.planCard}>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>{isPro() ? t('common.pro') : t('common.standard')}</Text>
            </View>
            <Text style={styles.planTitle}>
              {isPro() ? t('settings.proMember') : t('settings.freePlan')}
            </Text>
            <Text style={styles.planDescription}>
              {isPro() 
                ? t('settings.proDescription')
                : t('settings.freeDescription')}
            </Text>
            {!isPro() && (
              <TouchableOpacity 
                style={styles.upgradeButton}
                onPress={() => navigation.navigate('Paywall')}
              >
                <Text style={styles.upgradeText}>{t('settings.upgradeToPro')}</Text>
              </TouchableOpacity>
            )}
            {isPro() && (
              <TouchableOpacity 
                style={styles.debugButton}
                onPress={handleResetPlan}
              >
                <Text style={styles.debugText}>{t('settings.resetPlan')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>



        {/* Cloud Sync Section */}
        <Text style={styles.sectionTitle}>{t('settings.cloudSync')}</Text>
        <View style={styles.card}>
          {/* Google Account Sign-In/Sign-Out */}
          <SettingsRow
            icon={isSignedIn() ? 'person-circle' : 'logo-google'}
            iconColor={isSignedIn() ? colors.emerald : colors.primary}
            title={isSignedIn() ? (account?.displayName || account?.email || t('settings.signedIn')) : t('settings.signInGoogle')}
            subtitle={isSignedIn() ? account?.email : t('settings.signInSubtitle')}
            rightElement={
              isSignedIn() ? (
                <TouchableOpacity
                  onPress={async () => {
                    await authSignOut();
                    useAccountStore.getState().clearAccount();
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: `${colors.red}15` }}
                >
                  <Text style={{ color: colors.red, fontSize: 13, fontWeight: '500' }}>{t('common.signOut')}</Text>
                </TouchableOpacity>
              ) : isSigningIn ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('common.signingIn')}</Text>
              ) : undefined
            }
            onPress={isSignedIn() ? undefined : async () => {
              setIsSigningIn(true);
              try {
                const result = await signInWithGoogle();
                if (result.success && result.user) {
                  useAccountStore.getState().setAccount({
                    id: result.user.id,
                    email: result.user.email,
                    displayName: result.user.displayName,
                    avatarUrl: result.user.avatarUrl,
                    connectedAt: new Date().toISOString(),
                  });
                  Alert.alert(t('settings.signedIn'), t('settings.welcome', { name: result.user.displayName || result.user.email }));
                } else if (result.error && result.error !== 'User cancelled') {
                  Alert.alert('Sign-In Failed', result.error);
                }
              } finally {
                setIsSigningIn(false);
              }
            }}
          />
          <SettingsRow
            icon="cloud-upload"
            iconColor={colors.primary}
            title={t('settings.syncToCloud')}
            subtitle={
              isPro() 
                ? (subscriptionStore.lastSyncedAt 
                    ? t('settings.lastSynced', { date: new Date(subscriptionStore.lastSyncedAt).toLocaleString() })
                    : t('settings.tapToSync'))
                : t('settings.upgradeForSync')
            }
            rightElement={
              !isPro() ? (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              ) : subscriptionStore.isSyncing ? (
                <Text style={{ color: colors.textSecondary }}>{t('common.syncing')}</Text>
              ) : undefined
            }
            onPress={async () => {
              if (isPro()) {
                const success = await subscriptionStore.performFullSync();
                if (success) {
                  Alert.alert(t('settings.synced'), t('settings.syncedMessage'));
                } else {
                  Alert.alert(t('settings.syncFailed'), subscriptionStore.syncError || 'Unknown error');
                }
              } else {
                navigation.navigate('Paywall');
              }
            }}
          />
        </View>

        {/* Bank Statement Scan Section - PRO ONLY */}
        <Text style={styles.sectionTitle}>{t('settings.bankStatement')}</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="document-text"
            iconColor={colors.amber}
            title={t('settings.scanBankStatement')}
            subtitle={isPro() ? t('settings.scanBankSubtitle') : t('settings.upgradeToScan')}
            rightElement={
              !isPro() ? (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              ) : undefined
            }
            onPress={() => {
              if (isPro()) {
                navigation.navigate('BankStatementScan');
              } else {
                navigation.navigate('Paywall');
              }
            }}
          />
        </View>

        {/* Data Export Section - PRO ONLY */}
        <Text style={styles.sectionTitle}>{t('settings.dataExport')}</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="download"
            iconColor={colors.emerald}
            title={t('settings.exportCSV')}
            subtitle={isPro() ? t('settings.exportCSVSubtitle') : t('settings.upgradeToExport')}
            rightElement={
              !isPro() ? (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              ) : undefined
            }
            onPress={async () => {
              if (isPro()) {
                const { exportToCSV } = require('../services/ExportService');
                const result = await exportToCSV(subscriptionStore.subscriptions);
                if (!result.success) {
                  Alert.alert(t('settings.exportFailed'), result.error || 'Unknown error');
                }
              } else {
                navigation.navigate('Paywall');
              }
            }}
          />
          <SettingsRow
            icon="document"
            iconColor={colors.primary}
            title={t('settings.exportPDF')}
            subtitle={isPro() ? t('settings.exportPDFSubtitle') : t('settings.upgradeToExport')}
            rightElement={
              !isPro() ? (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              ) : undefined
            }
            onPress={async () => {
              if (isPro()) {
                const { exportToPDF } = require('../services/ExportService');
                const result = await exportToPDF(subscriptionStore.subscriptions);
                if (!result.success) {
                  Alert.alert(t('settings.exportFailed'), result.error || 'Unknown error');
                }
              } else {
                navigation.navigate('Paywall');
              }
            }}
          />
        </View>

        {/* Preferences Section */}
        <Text style={styles.sectionTitle}>{t('settings.preferences')}</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="notifications"
            iconColor={colors.amber}
            title={t('settings.pushNotifications')}
            subtitle={t('settings.pushNotifSubtitle')}
            rightElement={
              <Toggle 
                value={app.notificationsEnabled} 
                onChange={async (enabled) => {
                  setNotifications(enabled);
                  if (enabled) {
                    const subs = subscriptionStore.getActiveSubscriptions();
                    await scheduleAllReminders(subs, undefined, app.currency);
                  } else {
                    const { cancelAllReminders } = await import('../services/NotificationService');
                    await cancelAllReminders();
                  }
                }} 
              />
            }
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="send"
            iconColor={colors.emerald}
            title={t('settings.testNotification')}
            subtitle={t('settings.testNotifSubtitle')}
            onPress={() => {
              sendTestNotification();
              Alert.alert('Sent!', 'Check your notifications');
            }}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="finger-print"
            iconColor={colors.pink}
            title={t('settings.biometricLock')}
            subtitle={`Secure app with Face ID/Touch ID${!isPro() ? ' (Pro)' : ''}`}
            rightElement={
              <Toggle 
                value={app.biometricLockEnabled} 
                onChange={async (value) => {
                  if (value) {
                    // Check Pro status first
                    if (!isPro()) {
                      Alert.alert(
                        'Pro Feature',
                        'Biometric lock is a Pro feature. Upgrade to unlock!',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Upgrade', onPress: () => navigation.navigate('Paywall') },
                        ]
                      );
                      return;
                    }
                    // Verify biometrics before enabling
                    const success = await requestBiometricEnrollment();
                    if (success) {
                      setBiometricLock(true);
                    }
                  } else {
                    setBiometricLock(false);
                  }
                }} 
              />
            }
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="moon"
            iconColor={colors.primary}
            title={t('settings.appearance')}
            subtitle={`${themeLabels[app.theme as keyof typeof themeLabels] || 'Dark'} Mode${!canUseLight && app.theme !== 'dark' ? ' (Pro)' : ''}`}
            onPress={() => setThemeModalVisible(true)}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="cash"
            iconColor={colors.emerald}
            title={t('settings.currency')}
            subtitle={app.currency}
            onPress={() => setCurrencyModalVisible(true)}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="language"
            iconColor={colors.amber}
            title={t('languageSelector.title')}
            subtitle={languageLabels[app.language] || languageLabels.system}
            onPress={() => setLanguageModalVisible(true)}
          />
        </View>

        {/* Data Section */}
        <Text style={styles.sectionTitle}>{t('settings.data')}</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="download"
            iconColor={colors.cyan}
            title={t('settings.exportData')}
            subtitle={t('settings.exportDataSubtitle')}
            onPress={() => {/* TODO: Export */}}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="unlink"
            iconColor={colors.amber}
            title={t('settings.disconnectAccount')}
            subtitle={t('settings.disconnectSubtitle')}
            onPress={handleDisconnectAccount}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="trash"
            iconColor={colors.red}
            title={t('settings.clearAllData')}
            destructive
            onPress={handleClearData}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="person-remove"
            iconColor={colors.red}
            title={t('settings.deleteAccount')}
            subtitle={t('settings.deleteAccountSubtitle')}
            destructive
            onPress={handleDeleteAccount}
          />
        </View>

        {/* Legal Section */}
        <Text style={styles.sectionTitle}>{t('settings.legal')}</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="document-text"
            iconColor={colors.textMuted}
            title={t('settings.privacyPolicy')}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="document"
            iconColor={colors.textMuted}
            title={t('settings.termsOfService')}
            onPress={() => navigation.navigate('TermsOfService')}
          />
        </View>

        {/* Version */}
        <Text style={styles.version}>Finify v1.0.0</Text>
      </ScrollView>

      {/* Currency Picker Modal */}
      <Modal
        visible={currencyModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setCurrencyModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settings.currency')}</Text>
            {currencies.map((currency) => (
              <TouchableOpacity
                key={currency}
                style={[
                  styles.currencyOption,
                  app.currency === currency && styles.currencyOptionActive
                ]}
                onPress={() => handleCurrencySelect(currency)}
              >
                <Text style={[
                  styles.currencyText,
                  app.currency === currency && styles.currencyTextActive
                ]}>
                  {currency}
                </Text>
                {app.currency === currency && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Theme Picker Modal */}
      <Modal
        visible={themeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setThemeModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Theme</Text>
            {themeOptions.map((theme) => (
              <TouchableOpacity
                key={theme}
                style={[
                  styles.currencyOption,
                  app.theme === theme && styles.currencyOptionActive
                ]}
                onPress={() => handleThemeSelect(theme)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons 
                    name={theme === 'dark' ? 'moon' : theme === 'light' ? 'sunny' : 'phone-portrait'} 
                    size={18} 
                    color={app.theme === theme ? colors.primary : colors.textMuted} 
                  />
                  <Text style={[
                    styles.currencyText,
                    app.theme === theme && styles.currencyTextActive
                  ]}>
                    {themeLabels[theme]}
                  </Text>
                  {(theme === 'light' || theme === 'system') && !canUseLight && (
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                  )}
                </View>
                {app.theme === theme && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Language Picker Modal */}
      <Modal
        visible={languageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setLanguageModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('languageSelector.title')}</Text>
            {languageOptions.map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.currencyOption,
                  app.language === lang && styles.currencyOptionActive
                ]}
                onPress={() => {
                  setLanguage(lang);
                  setLanguageModalVisible(false);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons 
                    name={languageIcons[lang] as any} 
                    size={18} 
                    color={app.language === lang ? colors.primary : colors.textMuted} 
                  />
                  <Text style={[
                    styles.currencyText,
                    app.language === lang && styles.currencyTextActive
                  ]}>
                    {languageLabels[lang]}
                  </Text>
                </View>
                {app.language === lang && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
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
    paddingBottom: 140,
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
    backgroundColor: '#FFFFFF',
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  currencyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: borderRadius.lg,
    marginBottom: 4,
  },
  currencyOptionActive: {
    backgroundColor: `${colors.primary}20`,
  },
  currencyText: {
    fontSize: 16,
    color: colors.text,
  },
  currencyTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  proBadge: {
    backgroundColor: colors.amber,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

