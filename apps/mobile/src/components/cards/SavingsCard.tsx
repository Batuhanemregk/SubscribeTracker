/**
 * SavingsCard - Potential savings display card
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, borderRadius } from '../../theme';
import { useSettingsStore, useCurrencyStore } from '../../state';
import { formatCurrency } from '../../utils';
import { t } from '../../i18n';

interface SavingsCardProps {
  amount: number;
  monthlyCount: number;
  style?: ViewStyle;
}

export function SavingsCard({ amount, monthlyCount, style }: SavingsCardProps) {
  const { colors } = useTheme();
  const { app } = useSettingsStore();
  const { convert } = useCurrencyStore();
  const currency = app.currency;

  // Amount is already calculated in the subscription's native currency mix,
  // convert to display currency for consistent total display
  const displayAmount = convert(amount, 'TRY', currency);

  return (
    <View style={[styles.container, { backgroundColor: `${colors.emerald}15`, borderColor: `${colors.emerald}30` }, style]}>
      <View style={[styles.iconContainer, { backgroundColor: `${colors.emerald}20` }]}>
        <Ionicons name="cash" size={24} color={colors.emerald} />
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{t('insights.savingsTitle')}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {t('insights.savingsAmount', { amount: formatCurrency(displayAmount, currency), count: monthlyCount })}
        </Text>
        <View style={styles.tipRow}>
          <Ionicons name="bulb" size={14} color={colors.amber} />
          <Text style={[styles.tipText, { color: colors.textMuted }]}>
            {t('insights.savingsTip')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: borderRadius['2xl'],
    padding: 20,
    borderWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  tipText: {
    fontSize: 12,
  },
});
