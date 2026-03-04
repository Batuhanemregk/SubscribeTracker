/**
 * SettingsScreen - App settings
 * Uses Zustand stores and new component library
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Pressable, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components';
import { borderRadius, useTheme, type ThemeColors, ACCENT_COLORS, type AccentColorKey } from '../theme';
import { useSettingsStore, usePlanStore, useSubscriptionStore, useAccountStore } from '../state';
import { sendTestNotification, scheduleAllReminders, requestBiometricEnrollment, signInWithGoogle, signOut as authSignOut, identifyUser, logoutUser, requestCalendarPermission, syncSubscriptionsToCalendar, removeFinifyCalendarEvents, shareBackup, pickBackupFile, validateBackup, shareSubscriptionList } from '../services';
import { t } from '../i18n';


export function SettingsScreen({ navigation }: any) {
  const { colors, canUseLight, isDark, accentColor: currentAccent, amoledMode: currentAmoled } = useTheme();
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

  const { app, setNotifications, setBiometricLock, resetToDefaults, setCurrency, setTheme, setLanguage, calendarSyncEnabled, lastCalendarSync, setCalendarSync, updateLastCalendarSync, defaultReminderDays, setDefaultReminderDays, smartRemindersEnabled, setSmartRemindersEnabled, lastBackupDate, setLastBackupDate, showCurrencyConversion, setShowCurrencyConversion, accentColor, setAccentColor, amoledMode, setAmoledMode } = useSettingsStore();
  const { plan, isPro, downgradeToStandard } = usePlanStore();
  const { account, isSignedIn } = useAccountStore();
  const subscriptionStore = useSubscriptionStore();

  const hasDemoData = subscriptionStore.subscriptions.some((s) => (s.source as string) === 'demo');

  const handleClearDemoData = () => {
    Alert.alert(
      t('onboarding.clearDemo'),
      t('onboarding.clearDemoConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            subscriptionStore.clearDemoData();
          },
        },
      ]
    );
  };

  const [isSigningIn, setIsSigningIn] = React.useState(false);

  const [themeModalVisible, setThemeModalVisible] = React.useState(false);
  const [languageModalVisible, setLanguageModalVisible] = React.useState(false);
  const themeOptions = ['dark', 'light', 'system'] as const;
  const themeLabels = { dark: t('settings.dark'), light: t('settings.light'), system: t('settings.system') };

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
      t('settings.clearDataAlertTitle'),
      t('settings.clearDataAlertMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.clearDataAlertButton'),
          style: 'destructive',
          onPress: () => {
            subscriptionStore.setSubscriptions([]);
            resetToDefaults();
            Alert.alert(t('common.success'), t('settings.dataCleared'));
          },
        },
      ]
    );
  };

  const handleDisconnectAccount = () => {
    Alert.alert(
      t('settings.disconnectAlertTitle'),
      t('settings.disconnectAlertMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.disconnectAlertButton'),
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
      t('settings.deleteAlertTitle'),
      t('settings.deleteAlertMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAlertButton'),
          style: 'destructive',
          onPress: async () => {
            // Clear all stores
            subscriptionStore.setSubscriptions([]);
            resetToDefaults();
            // Clear auth account if signed in
            if (account) {
              useAccountStore.getState().clearAccount();
            }
            Alert.alert(t('settings.accountDeleted'), t('settings.accountDeletedMessage'));
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
      t('settings.resetPlanTitle'),
      t('settings.resetPlanMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.resetPlanButton'),
          onPress: () => {
            downgradeToStandard();
            Alert.alert(t('common.done'), t('settings.resetPlanDone'));
          },
        },
      ]
    );
  };

  const handleBackup = async () => {
    const settingsState = useSettingsStore.getState();
    const success = await shareBackup(subscriptionStore.subscriptions, settingsState);
    if (success) {
      const now = new Date().toISOString();
      setLastBackupDate(now);
      Alert.alert(t('common.success'), t('backup.backupSuccess'));
    }
  };

  const handleRestore = async () => {
    const content = await pickBackupFile();
    if (!content) return;

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      Alert.alert(t('backup.invalidFile'), t('backup.invalidFormat'));
      return;
    }

    const validation = validateBackup(parsed);
    if (!validation.valid || !validation.data) {
      Alert.alert(t('backup.invalidFile'), validation.error || t('backup.invalidFormat'));
      return;
    }

    const backupData = validation.data;
    const backupDate = new Date(backupData.exportedAt).toLocaleDateString();
    const subCount = backupData.subscriptions.length;

    Alert.alert(
      t('backup.restoreTitle'),
      t('backup.restoreInfo', { date: backupDate, count: subCount }),
      [
        { text: t('backup.cancel'), style: 'cancel' },
        {
          text: t('backup.mergeOption'),
          onPress: () => {
            const existing = subscriptionStore.subscriptions;
            const existingIds = new Set(existing.map((s) => s.id));
            const newSubs = backupData.subscriptions.filter((s) => !existingIds.has(s.id));
            subscriptionStore.setSubscriptions([...existing, ...newSubs]);
            Alert.alert(t('common.success'), t('backup.mergeResult', { count: newSubs.length }));
          },
        },
        {
          text: t('backup.replaceOption'),
          style: 'destructive',
          onPress: () => {
            subscriptionStore.setSubscriptions(backupData.subscriptions);
            Alert.alert(t('common.success'), t('backup.replaceResult', { count: backupData.subscriptions.length }));
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
                    await logoutUser();
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
                  // Link RevenueCat purchases to authenticated user
                  await identifyUser(result.user.id);
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

        {/* Appearance Section */}
        <Text style={styles.sectionTitle}>{t('themes.appearance')}</Text>
        <View style={styles.card}>
          {/* Accent Color Picker */}
          <View style={styles.accentSection}>
            <Text style={styles.accentLabel}>{t('themes.accentColor')}</Text>
            <View style={styles.accentRow}>
              {(Object.keys(ACCENT_COLORS) as AccentColorKey[]).map((key) => {
                const isSelected = accentColor === key;
                return (
                  <TouchableOpacity
                    key={key}
                    accessibilityLabel={t(`themes.${key}` as any)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setAccentColor(key)}
                    style={[
                      styles.accentCircle,
                      { backgroundColor: ACCENT_COLORS[key].primary },
                      isSelected && styles.accentCircleSelected,
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          {/* AMOLED Mode — only shown when dark mode is active */}
          {isDark && (
            <>
              <View style={styles.divider} />
              <SettingsRow
                icon="phone-portrait"
                iconColor={colors.textMuted}
                title={t('themes.amoledMode')}
                subtitle={t('themes.amoledDesc')}
                rightElement={
                  <Switch
                    value={amoledMode}
                    onValueChange={setAmoledMode}
                    trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                    thumbColor={amoledMode ? colors.primary : '#FFFFFF'}
                  />
                }
              />
            </>
          )}
        </View>

        {/* Categories Section */}
        <Text style={styles.sectionTitle}>{t('categories.title')}</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="pricetag-outline"
            iconColor={colors.primary}
            title={t('categories.manageCategories')}
            subtitle={t('categories.manageCategories')}
            onPress={() => navigation.navigate('CategoryManagement')}
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
          {/* Default Reminder Days */}
          {app.notificationsEnabled && (() => {
            const REMINDER_OPTIONS = [7, 3, 1, 0];
            const dayLabel = (day: number) => {
              if (day === 7) return '7d';
              if (day === 3) return '3d';
              if (day === 1) return '1d';
              return t('smartNotifications.days0').split(' ')[0];
            };
            const toggleDay = (day: number) => {
              const next = defaultReminderDays.includes(day)
                ? defaultReminderDays.filter(d => d !== day)
                : [...defaultReminderDays, day].sort((a, b) => b - a);
              setDefaultReminderDays(next);
            };
            return (
              <View style={styles.reminderSection}>
                <Text style={styles.reminderSectionTitle}>{t('smartNotifications.defaultDays')}</Text>
                <View style={styles.reminderChips}>
                  {REMINDER_OPTIONS.map(day => {
                    const selected = defaultReminderDays.includes(day);
                    return (
                      <Pressable
                        key={day}
                        style={[styles.reminderChip, selected && styles.reminderChipActive]}
                        onPress={() => toggleDay(day)}
                      >
                        <Text style={[styles.reminderChipText, selected && styles.reminderChipTextActive]}>
                          {dayLabel(day)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })()}
          <View style={styles.divider} />
          <SettingsRow
            icon="flash"
            iconColor={colors.primary}
            title={t('smartNotifications.smartSuggestions')}
            subtitle={t('smartNotifications.smartDesc')}
            rightElement={
              <Toggle value={smartRemindersEnabled} onChange={setSmartRemindersEnabled} />
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
              Alert.alert(t('settings.notifSent'), t('settings.notifSentMessage'));
            }}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="finger-print"
            iconColor={colors.pink}
            title={t('settings.biometricLock')}
            subtitle={!isPro() ? t('settings.biometricAppSubtitlePro') : t('settings.biometricAppSubtitle')}
            rightElement={
              <Toggle
                value={app.biometricLockEnabled}
                onChange={async (value) => {
                  if (value) {
                    // Check Pro status first
                    if (!isPro()) {
                      Alert.alert(
                        t('settings.biometricProTitle'),
                        t('settings.biometricProMessage'),
                        [
                          { text: t('common.cancel'), style: 'cancel' },
                          { text: t('common.upgrade'), onPress: () => navigation.navigate('Paywall') },
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
            icon="calendar-outline"
            iconColor={colors.primary}
            title={t('settings.calendarSync')}
            subtitle={
              calendarSyncEnabled && lastCalendarSync
                ? t('settings.lastSynced', { date: new Date(lastCalendarSync).toLocaleDateString() })
                : t('settings.calendarSyncSubtitle')
            }
            rightElement={
              <Toggle
                value={calendarSyncEnabled}
                onChange={async (enabled) => {
                  if (enabled) {
                    const granted = await requestCalendarPermission();
                    if (!granted) {
                      Alert.alert(t('settings.calendarSync'), t('settings.calendarPermissionDenied'));
                      return;
                    }
                    try {
                      const subs = subscriptionStore.getActiveSubscriptions();
                      const { synced } = await syncSubscriptionsToCalendar(subs);
                      setCalendarSync(true);
                      updateLastCalendarSync();
                      Alert.alert(
                        t('settings.calendarSynced'),
                        t('settings.calendarSyncedMessage', { count: synced })
                      );
                    } catch {
                      Alert.alert(t('settings.calendarSync'), t('settings.calendarPermissionDenied'));
                    }
                  } else {
                    try {
                      await removeFinifyCalendarEvents();
                    } catch {
                      // ignore removal errors
                    }
                    setCalendarSync(false);
                    Alert.alert(t('settings.calendarSync'), t('settings.calendarCleared'));
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
            subtitle={(() => {
              const key = app.theme as 'dark' | 'light' | 'system';
              if (!canUseLight && key !== 'dark') {
                return key === 'light' ? t('settings.lightModePro') : t('settings.systemModePro');
              }
              return key === 'dark' ? t('settings.darkMode') : key === 'light' ? t('settings.lightMode') : t('settings.systemMode');
            })()}
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
            icon="swap-horizontal"
            iconColor={colors.cyan}
            title={t('currency.showConversions')}
            subtitle={t('currency.showConversionsDesc')}
            rightElement={
              <Toggle value={showCurrencyConversion} onChange={setShowCurrencyConversion} />
            }
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

        {/* Data Management Section */}
        <Text style={styles.sectionTitle}>{t('backup.dataManagement')}</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="cloud-upload-outline"
            iconColor={colors.primary}
            title={t('backup.backup')}
            subtitle={
              lastBackupDate
                ? t('backup.lastBackup', { date: new Date(lastBackupDate).toLocaleDateString() })
                : t('backup.neverBacked')
            }
            onPress={handleBackup}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="cloud-download-outline"
            iconColor={colors.emerald}
            title={t('backup.restore')}
            subtitle={t('backup.restoreDesc')}
            onPress={handleRestore}
          />
        </View>

        {/* Data Section */}
        <Text style={styles.sectionTitle}>{t('settings.data')}</Text>
        <View style={styles.card}>
          {hasDemoData && (
            <>
              <SettingsRow
                icon="flask-outline"
                iconColor={colors.amber}
                title={t('onboarding.clearDemo')}
                subtitle={t('onboarding.clearDemoDesc')}
                destructive
                onPress={handleClearDemoData}
              />
              <View style={styles.divider} />
            </>
          )}
          <SettingsRow
            icon="download"
            iconColor={colors.cyan}
            title={t('settings.exportData')}
            subtitle={t('settings.exportDataSubtitle')}
            onPress={() => {/* TODO: Export */}}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="share-social-outline"
            iconColor={colors.primary}
            title={t('share.shareList')}
            subtitle={t('share.shareListDesc')}
            onPress={() => {
              const activeSubs = subscriptionStore.getActiveSubscriptions();
              const total = activeSubs.reduce((sum, s) => {
                const monthly = s.cycle === 'monthly' ? s.amount
                  : s.cycle === 'weekly' ? s.amount * 4.33
                  : s.cycle === 'quarterly' ? s.amount / 3
                  : s.amount / 12;
                return sum + monthly;
              }, 0);
              shareSubscriptionList(activeSubs, app.currency, total).catch(() => {
                // user dismissed share sheet — no action needed
              });
            }}
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
  reminderSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  reminderSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
  },
  reminderChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  reminderChipActive: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  },
  reminderChipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  reminderChipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  accentSection: {
    padding: 16,
  },
  accentLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 14,
  },
  accentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  accentCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accentCircleSelected: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});

