/**
 * BackupSignInScreen — optional, post-purchase nudge to sign in for cloud backup.
 * Shown after a successful purchase (when not already signed in). Skippable: a
 * user can continue without an account; Premium itself never requires sign-in.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, borderRadius, type ThemeColors } from '../theme';
import { useAccountStore, useSubscriptionStore } from '../state';
import {
  signInWithGoogle,
  signInWithApple,
  isAppleSignInAvailable,
  type AuthResult,
} from '../services';
import { t } from '../i18n';

export default function BackupSignInScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const finish = () => navigation.replace('MainTabs');

  const handleSignIn = async (provider: 'google' | 'apple') => {
    setIsSigningIn(true);
    try {
      const result: AuthResult =
        provider === 'apple' ? await signInWithApple() : await signInWithGoogle();
      if (result.success && result.user) {
        // Do NOT call Purchases.logIn() here — see the note in SettingsScreen.
        // Premium is Apple-ID-anchored; identifying RevenueCat with the app
        // account would drop the entitlement.
        useAccountStore.getState().setAccount({
          id: result.user.id,
          email: result.user.email,
          displayName: result.user.displayName,
          avatarUrl: result.user.avatarUrl,
          connectedAt: new Date().toISOString(),
        });
        // Kick off an initial backup; don't block navigation on it.
        useSubscriptionStore.getState().performFullSync().catch(() => {});
        finish();
      } else if (result.error && result.error !== 'User cancelled') {
        Alert.alert(t('settings.signInFailed'), result.error);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const BENEFITS = [
    t('backupSignIn.benefitReinstall'),
    t('backupSignIn.benefitDevices'),
    t('backupSignIn.benefitSafe'),
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="cloud-upload" size={40} color={colors.primary} />
        </View>

        <Text style={styles.title}>{t('backupSignIn.title')}</Text>
        <Text style={styles.subtitle}>{t('backupSignIn.subtitle')}</Text>

        <View style={styles.benefits}>
          {BENEFITS.map((b, i) => (
            <View key={i} style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.emerald} />
              <Text style={styles.benefitText}>{b}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        {isSigningIn ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: 16 }} />
        ) : (
          <>
            <TouchableOpacity style={styles.googleButton} onPress={() => handleSignIn('google')} activeOpacity={0.85}>
              <Ionicons name="logo-google" size={20} color={colors.text} />
              <Text style={styles.googleButtonText}>{t('settings.signInGoogle')}</Text>
            </TouchableOpacity>

            {isAppleSignInAvailable() && (
              <TouchableOpacity style={styles.appleButton} onPress={() => handleSignIn('apple')} activeOpacity={0.85}>
                <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                <Text style={styles.appleButtonText}>{t('settings.signInApple')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.skipButton} onPress={finish} activeOpacity={0.7}>
              <Text style={styles.skipText}>{t('backupSignIn.skip')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  benefits: {
    alignSelf: 'stretch',
    gap: 14,
    paddingHorizontal: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  actions: {
    gap: 12,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#000000',
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
