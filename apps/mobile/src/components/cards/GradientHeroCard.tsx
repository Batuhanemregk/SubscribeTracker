/**
 * GradientHeroCard - Large hero card for subscription details
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, borderRadius } from '../../theme';
import { formatCurrency } from '../../utils';
import { t } from '../../i18n';

interface GradientHeroCardProps {
  icon: string;
  logoUrl?: string;
  name: string;
  amount: number;
  currency: string;
  cycle: 'monthly' | 'yearly' | 'weekly' | 'quarterly';
  category: string;
  colorKey: string;
  style?: ViewStyle;
}

export function GradientHeroCard({ 
  icon, 
  logoUrl,
  name, 
  amount, 
  currency,
  cycle, 
  category,
  colorKey,
  style 
}: GradientHeroCardProps) {
  const { colors } = useTheme();
  const [logoError, setLogoError] = useState(false);

  const cycleLabel = {
    weekly: t('subscription.perWeek'),
    monthly: t('subscription.perMonth'),
    quarterly: t('subscription.perQuarter'),
    yearly: t('subscription.perYear'),
  }[cycle];

  return (
    <LinearGradient
      colors={[`${colorKey}60`, `${colorKey}30`, colors.bgCard]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      {/* Category Badge */}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{category}</Text>
      </View>

      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: `${colorKey}40` }]}>
        {logoUrl && !logoError ? (
          <Image
            source={{ uri: logoUrl }}
            style={styles.logoImage}
            onError={() => setLogoError(true)}
          />
        ) : (
          <Text style={styles.iconEmoji}>{icon}</Text>
        )}
      </View>

      {/* Name & Price */}
      <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
      <View style={styles.priceRow}>
        <Text style={[styles.priceValue, { color: colors.text }]}>{formatCurrency(amount, currency)}</Text>
        <Text style={[styles.pricePeriod, { color: colors.textMuted }]}> / {cycleLabel}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius['2xl'],
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  categoryText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconEmoji: {
    fontSize: 28,
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  pricePeriod: {
    fontSize: 16,
  },
});
