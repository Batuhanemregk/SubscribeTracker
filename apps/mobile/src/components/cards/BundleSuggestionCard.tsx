/**
 * BundleSuggestionCard - Shows bundle savings opportunity
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, borderRadius, type ThemeColors } from '../../theme';
import { t } from '../../i18n';
import { formatCurrency } from '../../utils/currency';
import type { BundleSuggestion } from '../../utils/bundleDetection';

interface BundleSuggestionCardProps {
  suggestion: BundleSuggestion;
  currency: string;
  onDismiss?: () => void;
}

export function BundleSuggestionCard({ suggestion, currency, onDismiss }: BundleSuggestionCardProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const handleLearnMore = () => {
    if (suggestion.bundle.url) {
      Linking.openURL(suggestion.bundle.url);
    }
  };

  return (
    <View
      style={styles.container}
      accessibilityRole="none"
      accessibilityLabel={`Bundle suggestion: ${suggestion.bundle.name}, save ${formatCurrency(suggestion.monthlySavings, currency)} per month`}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="layers-outline" size={20} color={colors.primary} />
          <Text style={styles.bundleName} numberOfLines={1}>{suggestion.bundle.name}</Text>
        </View>
        {onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('bundles.dismiss')}
          >
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Service chips */}
      <View style={styles.chipsRow}>
        {suggestion.matchedServices.map((service, idx) => (
          <View key={idx} style={styles.chip}>
            <Text style={styles.chipText}>{service}</Text>
          </View>
        ))}
      </View>

      {/* Price comparison */}
      <View style={styles.comparisonRow}>
        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>{t('bundles.youPay')}</Text>
          <Text style={styles.priceAmount}>
            {formatCurrency(suggestion.currentTotal, currency)}{t('bundles.perMonth')}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>{t('bundles.bundlePrice')}</Text>
          <Text style={[styles.priceAmount, { color: colors.emerald }]}>
            {formatCurrency(suggestion.bundlePrice, currency)}{t('bundles.perMonth')}
          </Text>
        </View>
      </View>

      {/* Savings highlight */}
      <View style={styles.savingsRow}>
        <Ionicons name="trending-down" size={16} color={colors.emerald} />
        <Text style={styles.savingsText}>
          {t('bundles.save')} {formatCurrency(suggestion.monthlySavings, currency)}{t('bundles.perMonth')} ({formatCurrency(suggestion.yearlySavings, currency)}{t('bundles.perYear')})
        </Text>
      </View>

      {/* Match indicator */}
      <Text style={styles.matchText}>
        {t('bundles.matchedServices', {
          count: String(suggestion.matchedServices.length),
          total: String(suggestion.bundle.services.length),
        })}
      </Text>

      {/* Learn More button */}
      {suggestion.bundle.url && (
        <TouchableOpacity
          style={[styles.learnMoreButton, { borderColor: colors.primary + '40' }]}
          onPress={handleLearnMore}
          activeOpacity={0.8}
          accessibilityRole="link"
          accessibilityLabel={t('bundles.learnMore')}
        >
          <Ionicons name="open-outline" size={16} color={colors.primary} />
          <Text style={[styles.learnMoreText, { color: colors.primary }]}>
            {t('bundles.learnMore')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius['2xl'],
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  bundleName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  priceBox: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.bgElevated,
  },
  priceLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: `${colors.emerald}15`,
  },
  savingsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.emerald,
  },
  matchText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  learnMoreText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
