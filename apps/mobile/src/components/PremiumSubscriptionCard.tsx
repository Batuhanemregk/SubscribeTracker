/**
 * PremiumSubscriptionCard
 * Clean animated subscription card with:
 * - Press scale with spring physics
 * - Stagger fade-in animation
 * - Bright gradient backgrounds
 * - iOS/Android proper shadows
 * - Swipe to reveal actions (fixed gesture handling)
 */
import React, { useRef, useCallback, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Pressable, Platform, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  interpolate,
} from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useSettingsStore, useCurrencyStore } from '../state';
import { formatCurrency, advanceToNextBillingDate } from '../utils';
import type { Subscription } from '../types';
import { t, getLocale } from '../i18n';

interface PremiumSubscriptionCardProps {
  item: Subscription;
  index: number;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPause: () => void;
  onSwipeOpen?: () => void;
  swipeableRef?: (ref: Swipeable | null) => void;
}

export function PremiumSubscriptionCard({
  item,
  index,
  onPress,
  onEdit,
  onDelete,
  onPause,
  onSwipeOpen,
  swipeableRef: registerRef
}: PremiumSubscriptionCardProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const [logoError, setLogoError] = useState(false);
  const isSwiping = useRef(false);
  const { colors, isDark } = useTheme();
  const { app } = useSettingsStore();
  const { convert } = useCurrencyStore();
  const displayCurrency = app.currency;

  // Convert amount from subscription's original currency to user's display currency
  const displayAmount = convert(item.amount, item.currency, displayCurrency);
  const formattedPrice = formatCurrency(displayAmount, displayCurrency);

  // Stagger entry animation
  const entryOpacity = useSharedValue(0);
  const entryTranslateY = useSharedValue(12);

  React.useEffect(() => {
    const delay = Math.min(index * 80, 400); // cap at 400ms
    entryOpacity.value = withDelay(delay, withSpring(1, { damping: 20, stiffness: 100 }));
    entryTranslateY.value = withDelay(delay, withSpring(0, { damping: 20, stiffness: 100 }));
  }, []);

  const entryStyle = useAnimatedStyle(() => ({
    opacity: entryOpacity.value,
    transform: [{ translateY: entryTranslateY.value }],
  }));
  
  // Calculate days until billing (auto-advance past dates)
  const advancedDate = advanceToNextBillingDate(item.nextBillingDate, item.cycle);
  const daysUntil = Math.ceil(
    (advancedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isUrgent = daysUntil <= 7;
  const isOverdue = daysUntil < 0;
  const daySuffix = getLocale() === 'tr' ? 'g' : 'd';
  const dateLocale = getLocale() === 'tr' ? 'tr-TR' : 'en-US';
  const formattedDate = advancedDate.toLocaleDateString(dateLocale, {
    month: 'short',
    day: 'numeric',
  });

  // Left swipe: Pause / Resume
  const renderLeftActions = () => (
    <TouchableOpacity
      style={[styles.actionButton, item.status === 'paused' ? styles.resumeButton : styles.pauseButton]}
      onPress={() => {
        swipeableRef.current?.close();
        onPause();
      }}
    >
      <Ionicons name={item.status === 'paused' ? 'play' : 'pause'} size={20} color="#FFF" />
      <Text style={styles.actionText}>
        {item.status === 'paused' ? t('subscription.resume') : t('subscription.pause')}
      </Text>
    </TouchableOpacity>
  );

  // Swipe action buttons
  const renderRightActions = () => (
    <View style={styles.actionsContainer}>
      <TouchableOpacity 
        style={[styles.actionButton, styles.editButton]} 
        onPress={() => {
          swipeableRef.current?.close();
          onEdit();
        }}
      >
        <Ionicons name="pencil" size={20} color="#FFF" />
        <Text style={styles.actionText}>{t('common.edit')}</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.actionButton, styles.deleteButton]} 
        onPress={() => {
          swipeableRef.current?.close();
          onDelete();
        }}
      >
        <Ionicons name="trash" size={20} color="#FFF" />
        <Text style={styles.actionText}>{t('common.delete')}</Text>
      </TouchableOpacity>
    </View>
  );

  // Combined ref callback - register with parent + internal ref
  const handleRef = useCallback((ref: Swipeable | null) => {
    (swipeableRef as any).current = ref;
    registerRef?.(ref);
  }, [registerRef]);

  return (
    <Animated.View style={[styles.container, entryStyle]}>
      <Swipeable
        ref={handleRef}
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        overshootRight={false}
        overshootLeft={false}
        friction={2}
        onSwipeableOpen={onSwipeOpen}
        activeOffsetX={[-20, 20]}
        failOffsetY={[-15, 15]}
        onSwipeableWillOpen={() => { isSwiping.current = true; }}
        onSwipeableClose={() => { setTimeout(() => { isSwiping.current = false; }, 100); }}
      >
        <Pressable
          onPress={() => { if (!isSwiping.current) onPress(); }}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <View 
            style={[
              styles.card, 
              { backgroundColor: colors.bgCard, borderColor: colors.border },
              // iOS shadow with item color as glow
              Platform.OS === 'ios' && {
                shadowColor: item.colorKey,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
              },
              // Android elevation with tint
              Platform.OS === 'android' && {
                elevation: 4,
              },
            ]}
          >
            {/* Simple dark background - no gradient */}
            <View style={styles.cardInner}>
              {/* Subtle colored accent line on left */}
              <View style={[styles.accentBorder, { backgroundColor: item.colorKey }]} />

              {/* Content */}
              <View style={styles.content}>
                {/* Header Row */}
                <View style={styles.header}>
                  {/* Icon with brighter background */}
                  <View style={styles.iconContainer}>
                    {item.logoUrl && !logoError ? (
                      <Image
                        source={{ uri: item.logoUrl }}
                        style={styles.logoImage}
                        onError={() => setLogoError(true)}
                      />
                    ) : (
                      <Text style={styles.iconEmoji}>{item.iconKey}</Text>
                    )}
                  </View>

                  {/* Name & Category */}
                  <View style={styles.info}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                      {item.status === 'paused' && (
                        <View style={[styles.pausedBadge, { backgroundColor: `${colors.amber}20` }]}>
                          <Ionicons name="pause-circle" size={11} color={colors.amber} />
                          <Text style={[styles.pausedBadgeText, { color: colors.amber }]}>
                            {t('subscription.pausedLabel')}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.category, { color: colors.textMuted }]}>{t(`categories.${item.category}`, { defaultValue: item.category }).toUpperCase()}</Text>
                  </View>

                  {/* Days Badge */}
                  <View style={[
                    styles.daysBadge, 
                    { backgroundColor: isOverdue ? `${colors.red}30` : isUrgent ? `${colors.amber}30` : `${colors.emerald}30` }
                  ]}>
                    <Text style={[
                      styles.daysText, 
                      { color: isOverdue ? colors.red : isUrgent ? colors.amber : colors.emerald }
                    ]}>
                      {isOverdue ? t('common.overdue') : `${daysUntil}${daySuffix}`}
                    </Text>
                  </View>
                </View>

                {/* Price Row */}
                <View style={styles.priceRow}>
                  <View style={styles.priceContainer}>
                    <Text style={[styles.price, { color: colors.text }]}>{formattedPrice}</Text>
                    <Text style={[styles.period, { color: colors.textMuted }]}>{item.cycle === 'monthly' ? t('common.perMonth') : t('common.perYear')}</Text>
                  </View>

                  {/* Next billing date */}
                  <View style={[styles.dateContainer, { borderColor: `${item.colorKey}30`, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                    <Ionicons name="calendar-outline" size={14} color={item.colorKey} />
                    <Text style={[styles.dateText, { color: colors.textMuted }]}>{formattedDate}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Pressable>
      </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  
  // Action buttons
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 70,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseButton: {
    backgroundColor: '#8B5CF6', // purple for pause
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  resumeButton: {
    backgroundColor: '#10B981', // emerald for resume
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  editButton: {
    backgroundColor: '#8B5CF6', // primary - same in both themes
  },
  deleteButton: {
    backgroundColor: '#EF4444', // red - same in both themes
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  actionText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },

  // Card
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    // borderColor and backgroundColor set dynamically via inline style
    // Android elevation
    ...Platform.select({
      android: {
        elevation: 10,
      },
    }),
  },
  cardInner: {
    flexDirection: 'row',
  },

  // Accent border
  accentBorder: {
    width: 5,
  },

  // Content
  content: {
    flex: 1,
    padding: 18,
    gap: 14,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 26,
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  info: {
    flex: 1,
    marginLeft: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    // color set dynamically via inline style
  },
  pausedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pausedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  category: {
    fontSize: 11,
    // color set dynamically via inline style
    marginTop: 4,
    letterSpacing: 1,
  },
  daysBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  daysText: {
    fontSize: 14,
    fontWeight: '800',
  },

  // Price row
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    fontSize: 20,
    fontWeight: '700',
    marginRight: 2,
  },
  price: {
    fontSize: 32,
    fontWeight: '800',
    // color set dynamically via inline style
  },
  period: {
    fontSize: 15,
    // color set dynamically via inline style
    marginLeft: 4,
    fontWeight: '500',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    // backgroundColor set dynamically via inline style
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateText: {
    fontSize: 13,
    // color set dynamically via inline style
    fontWeight: '600',
  },
});
