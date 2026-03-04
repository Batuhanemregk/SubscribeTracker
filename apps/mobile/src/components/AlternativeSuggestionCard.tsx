/**
 * AlternativeSuggestionCard
 * Shows a cheaper alternative for a subscription with savings amount.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, borderRadius, type ThemeColors } from '../theme';
import { formatCurrency } from '../utils';
import { t } from '../i18n';
import type { AlternativeSuggestion } from '../utils/calculations';

interface AlternativeSuggestionCardProps {
  suggestion: AlternativeSuggestion;
  onDismiss?: () => void;
}

export function AlternativeSuggestionCard({ suggestion, onDismiss }: AlternativeSuggestionCardProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const isFree = suggestion.alternativePrice === 0;

  return (
    <View style={styles.card}>
      {/* Dismiss button */}
      {onDismiss && (
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* Services row */}
      <View style={styles.servicesRow}>
        {/* Current service */}
        <View style={styles.serviceBlock}>
          <Text style={styles.serviceLabel} numberOfLines={1}>{suggestion.currentService}</Text>
          <Text style={styles.servicePrice}>
            {formatCurrency(suggestion.currentPrice, suggestion.currency)}
            <Text style={styles.priceSuffix}>{t('common.perMonth')}</Text>
          </Text>
        </View>

        {/* Arrow divider */}
        <View style={styles.arrowWrap}>
          <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
        </View>

        {/* Alternative service */}
        <View style={[styles.serviceBlock, styles.serviceBlockRight]}>
          <Text style={styles.altLabel} numberOfLines={1}>{suggestion.alternativeName}</Text>
          <Text style={[styles.servicePrice, styles.altPrice]}>
            {isFree
              ? t('alternatives.freeOption')
              : `${formatCurrency(suggestion.alternativePrice, suggestion.currency)}${t('common.perMonth')}`}
          </Text>
        </View>
      </View>

      {/* Savings badge */}
      <View style={styles.savingsRow}>
        <View style={styles.savingsBadge}>
          <Ionicons name="trending-down" size={13} color={colors.emerald} />
          <Text style={styles.savingsText}>
            {t('alternatives.save', { amount: formatCurrency(suggestion.savings, suggestion.currency) })}
          </Text>
        </View>
      </View>

      {/* Note */}
      {suggestion.note ? (
        <Text style={styles.noteText} numberOfLines={2}>{suggestion.note}</Text>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: borderRadius.xl,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
    },
    dismissBtn: {
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 1,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.bgElevated,
      justifyContent: 'center',
      alignItems: 'center',
    },
    servicesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      paddingRight: 24,
    },
    serviceBlock: {
      flex: 1,
    },
    serviceBlockRight: {
      alignItems: 'flex-end',
    },
    serviceLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    altLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 2,
      textAlign: 'right',
    },
    servicePrice: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    altPrice: {
      color: colors.emerald,
    },
    priceSuffix: {
      fontSize: 11,
      fontWeight: '400',
      color: colors.textMuted,
    },
    arrowWrap: {
      paddingHorizontal: 10,
    },
    savingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    savingsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: `${colors.emerald}15`,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: `${colors.emerald}30`,
    },
    savingsText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.emerald,
    },
    noteText: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
    },
  });
