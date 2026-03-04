/**
 * SwipeableSubscriptionCard Component
 * Subscription card with swipe-to-reveal Edit/Delete actions
 */
import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ThemeColors } from '../theme';
import type { Subscription } from '../types';
import { t } from '../i18n';
import { calculateValueScore, getValueColor, toMonthlyAmount } from '../utils';
import { useSettingsStore } from '../state/stores/settingsStore';
import { useCurrencyStore } from '../state/stores/currencyStore';
import { formatCurrency } from '../utils/currency';

interface SwipeableSubscriptionCardProps {
  item: Subscription;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPause: () => void;
}

export function SwipeableSubscriptionCard({ item, onPress, onEdit, onDelete, onPause }: SwipeableSubscriptionCardProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const swipeableRef = useRef<Swipeable>(null);
  const { app, showCurrencyConversion } = useSettingsStore();
  const { convert } = useCurrencyStore();

  // Currency conversion
  const homeCurrency = app.currency;
  const subCurrency = item.currency || homeCurrency;
  const showConverted = showCurrencyConversion && subCurrency !== homeCurrency;
  const convertedAmount = showConverted
    ? convert(item.amount, subCurrency, homeCurrency)
    : null;

  const daysUntil = Math.ceil((new Date(item.nextBillingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const hasRating = item.usageRating !== undefined && item.usageRating !== null;
  const valueDotColor = hasRating
    ? getValueColor(calculateValueScore(item.usageRating, toMonthlyAmount(item.amount, item.cycle, item.customDays)))
    : null;
  const isUrgent = daysUntil <= 7;
  const formattedDate = new Date(item.nextBillingDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Trial countdown
  const trialDaysLeft = item.isTrial && item.trialEndsAt
    ? Math.ceil((new Date(item.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isTrialUrgent = trialDaysLeft !== null && trialDaysLeft <= 3;
  
  const cycleLabel = item.cycle === 'custom' ? `${item.customDays ?? 30} days` : item.cycle;
  const cardAccessibilityLabel = `${item.name}, ${formatCurrency(item.amount, subCurrency)} per ${cycleLabel}, next billing ${formattedDate}`;

  const renderLeftActions = () => (
    <TouchableOpacity
      style={[styles.swipeBtn, item.status === 'paused' ? styles.swipeBtnResume : styles.swipeBtnPause]}
      onPress={() => {
        swipeableRef.current?.close();
        onPause();
      }}
      accessibilityLabel={item.status === 'paused' ? `Resume ${item.name}` : `Pause ${item.name}`}
      accessibilityRole="button"
    >
      <Ionicons name={item.status === 'paused' ? 'play' : 'pause'} size={20} color="#FFF" importantForAccessibility="no" />
      <Text style={styles.swipeBtnText}>
        {item.status === 'paused' ? t('subscription.resume') : t('subscription.pause')}
      </Text>
    </TouchableOpacity>
  );

  const renderRightActions = () => {
    return (
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={[styles.swipeBtn, styles.swipeBtnEdit]}
          onPress={() => {
            swipeableRef.current?.close();
            onEdit();
          }}
          accessibilityLabel={`Edit ${item.name}`}
          accessibilityRole="button"
        >
          <Ionicons name="pencil" size={20} color="#FFF" importantForAccessibility="no" />
          <Text style={styles.swipeBtnText}>{t('common.edit')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.swipeBtn, styles.swipeBtnDelete]}
          onPress={() => {
            swipeableRef.current?.close();
            onDelete();
          }}
          accessibilityLabel={`Delete ${item.name}`}
          accessibilityRole="button"
        >
          <Ionicons name="trash" size={20} color="#FFF" importantForAccessibility="no" />
          <Text style={styles.swipeBtnText}>{t('common.delete')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      overshootRight={false}
      overshootLeft={false}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.9}
        accessibilityLabel={cardAccessibilityLabel}
        accessibilityRole="button"
        accessibilityHint="Double tap to view details"
      >
        {/* Value indicator dot (top-right, only if rated) */}
        {hasRating && valueDotColor && (
          <View style={[styles.valueDot, { backgroundColor: valueDotColor }]} accessibilityElementsHidden={true} importantForAccessibility="no" />
        )}
        {/* Colored left border */}
        <View style={[styles.border, { backgroundColor: item.colorKey }]} accessibilityElementsHidden={true} importantForAccessibility="no" />

        <View style={styles.content}>
          {/* Header: Icon, Name, Category */}
          <View style={styles.header}>
            <View style={[styles.icon, { backgroundColor: item.colorKey }]} accessibilityElementsHidden={true} importantForAccessibility="no">
              <Text style={styles.iconEmoji}>{item.iconKey}</Text>
            </View>
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{item.name}</Text>
                {item.status === 'paused' && (
                  <View style={[styles.pausedBadge, { backgroundColor: `${colors.amber}20` }]} accessibilityElementsHidden={true} importantForAccessibility="no">
                    <Text style={[styles.pausedBadgeText, { color: colors.amber }]}>
                      {t('subscription.pausedLabel')}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.category}>{item.category.toUpperCase()}</Text>
            </View>
            {item.isTrial && (
              <View style={[styles.trialBadge, isTrialUrgent && styles.trialBadgeUrgent]} accessibilityElementsHidden={true} importantForAccessibility="no">
                <Ionicons name="time-outline" size={12} color={isTrialUrgent ? '#EF4444' : colors.primary} />
                <Text style={[styles.trialBadgeText, isTrialUrgent && styles.trialBadgeTextUrgent]}>
                  {trialDaysLeft !== null && trialDaysLeft <= 0
                    ? t('subscription.trialExpired')
                    : trialDaysLeft === 1
                    ? t('subscription.trialEndsTomorrow')
                    : t('subscription.trialEndsIn', { days: trialDaysLeft ?? 0 })}
                </Text>
              </View>
            )}
            {item.notes && item.notes.trim().length > 0 && (
              <Ionicons name="document-text-outline" size={15} color={colors.textMuted} style={styles.noteIcon} importantForAccessibility="no" />
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} importantForAccessibility="no" />
          </View>
          
          {/* Price in middle */}
          <Text style={styles.price}>
            {formatCurrency(item.amount, subCurrency)} <Text style={styles.cycle}>{item.cycle === 'custom' ? `/ ${item.customDays ?? 30}d` : '/ mo'}</Text>
          </Text>
          {showConverted && convertedAmount !== null && (
            <Text style={styles.convertedPrice}>
              {t('currency.converted', { amount: formatCurrency(convertedAmount, homeCurrency) })}
            </Text>
          )}
          
          {/* Footer: Date and Days */}
          <View style={styles.footer} importantForAccessibility="no" accessibilityElementsHidden={true}>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
            <View style={[styles.daysBadge, isUrgent && styles.daysBadgeUrgent]}>
              <Ionicons name="sync-outline" size={12} color={isUrgent ? colors.amber : colors.emerald} />
              <Text style={[styles.daysText, isUrgent && styles.daysTextUrgent]}>{daysUntil}d</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  valueDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 10,
  },
  border: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 20,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  pausedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  pausedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  category: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  cycle: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textMuted,
  },
  convertedPrice: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: -8,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.emerald}20`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  daysBadgeUrgent: {
    backgroundColor: `${colors.amber}20`,
  },
  daysText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.emerald,
  },
  daysTextUrgent: {
    color: colors.amber,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    marginRight: 8,
  },
  trialBadgeUrgent: {
    backgroundColor: '#EF444420',
  },
  trialBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  trialBadgeTextUrgent: {
    color: '#EF4444',
  },
  noteIcon: {
    marginRight: 4,
    opacity: 0.6,
  },
  // Swipe actions
  swipeActions: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  swipeBtn: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeBtnPause: {
    backgroundColor: '#8B5CF6',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  swipeBtnResume: {
    backgroundColor: '#10B981',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  swipeBtnEdit: {
    backgroundColor: '#8B5CF6',
  },
  swipeBtnDelete: {
    backgroundColor: '#EF4444',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  swipeBtnText: {
    color: '#FFF',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
});
