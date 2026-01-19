/**
 * FeatureGate - Component to gate Pro features
 * Shows locked state for Standard users with upgrade prompt
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius } from '../../theme';
import { usePlanStore } from '../../state';

interface FeatureGateProps {
  feature: 'dailyScan' | 'bodyParsing' | 'autoFill' | 'priceAlerts' | 'cancelLinks';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const FEATURE_INFO = {
  dailyScan: {
    icon: 'scan',
    title: 'Daily Scan',
    description: 'Auto-scan your emails daily for new subscriptions',
  },
  bodyParsing: {
    icon: 'document-text',
    title: 'Full Email Parsing',
    description: 'Extract price and billing details from email content',
  },
  autoFill: {
    icon: 'flash',
    title: 'Auto-fill Pricing',
    description: 'Automatically detect subscription prices',
  },
  priceAlerts: {
    icon: 'notifications',
    title: 'Price Alerts',
    description: 'Get notified when subscription prices change',
  },
  cancelLinks: {
    icon: 'link',
    title: 'Cancel Links',
    description: 'Quick access to subscription cancellation pages',
  },
};

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const navigation = useNavigation<any>();
  const { isPro, isTrialActive } = usePlanStore();

  // If user is Pro or on trial, show the feature
  if (isPro() || isTrialActive()) {
    return <>{children}</>;
  }

  // Show fallback if provided (for inline usage)
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show locked state
  const info = FEATURE_INFO[feature];

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => navigation.navigate('Paywall')}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[`${colors.primary}20`, `${colors.primary}05`]}
        style={styles.gradient}
      >
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={14} color={colors.amber} />
          <Text style={styles.lockText}>PRO</Text>
        </View>

        <View style={styles.iconContainer}>
          <Ionicons name={info.icon as any} size={28} color={colors.primary} />
        </View>

        <Text style={styles.title}>{info.title}</Text>
        <Text style={styles.description}>{info.description}</Text>

        <View style={styles.upgradeButton}>
          <Text style={styles.upgradeText}>Unlock with Pro</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

/**
 * FeatureGateInline - Inline version for simpler gating
 */
interface FeatureGateInlineProps {
  isPro: boolean;
  children: React.ReactNode;
  lockedContent?: React.ReactNode;
}

export function FeatureGateInline({ isPro, children, lockedContent }: FeatureGateInlineProps) {
  if (isPro) {
    return <>{children}</>;
  }
  
  if (lockedContent) {
    return <>{lockedContent}</>;
  }

  return (
    <View style={styles.inlineLock}>
      <Ionicons name="lock-closed" size={12} color={colors.amber} />
      <Text style={styles.inlineLockText}>Pro</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    marginBottom: 16,
  },
  gradient: {
    padding: 24,
    alignItems: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.amber}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lockText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.amber,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  upgradeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  inlineLock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.amber}20`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  inlineLockText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.amber,
  },
});
