/**
 * CompactSubscriptionCard - Small card for grid/See All view
 * Shows icon, name, and price in a compact 2-column layout
 */
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Platform } from 'react-native';
import { useTheme } from '../theme';
import { useSettingsStore, useCurrencyStore } from '../state';
import { formatCurrency } from '../utils';
import type { Subscription } from '../types';
import { t } from '../i18n';

interface CompactSubscriptionCardProps {
  item: Subscription;
  onPress: () => void;
}

export function CompactSubscriptionCard({ item, onPress }: CompactSubscriptionCardProps) {
  const { colors } = useTheme();
  const [logoError, setLogoError] = useState(false);
  const { app } = useSettingsStore();
  const { convert } = useCurrencyStore();
  const displayCurrency = app.currency;
  const displayAmount = convert(item.amount, item.currency, displayCurrency);
  const formattedPrice = formatCurrency(displayAmount, displayCurrency);

  const cycleLabel = item.cycle === 'monthly' ? t('common.perMonth') : t('common.perYear');

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: colors.bgCard, borderColor: colors.border },
      ]}
    >
      {/* Colored accent top line */}
      <View style={[styles.accent, { backgroundColor: item.colorKey }]} />

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconRow}>
          {item.logoUrl && !logoError ? (
            <Image
              source={{ uri: item.logoUrl }}
              style={styles.logo}
              onError={() => setLogoError(true)}
            />
          ) : (
            <Text style={styles.emoji}>{item.iconKey}</Text>
          )}
        </View>

        {/* Name */}
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>

        {/* Price */}
        <Text style={[styles.price, { color: colors.textSecondary }]}>
          {formattedPrice}
          <Text style={[styles.cycle, { color: colors.textMuted }]}>{cycleLabel}</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 4,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  accent: {
    height: 3,
    width: '100%',
  },
  content: {
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  iconRow: {
    marginBottom: 2,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  emoji: {
    fontSize: 24,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
  },
  cycle: {
    fontSize: 11,
    fontWeight: '400',
  },
});
