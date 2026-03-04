/**
 * BubbleViewScreen - Interactive bubble visualization of subscriptions
 * Each subscription is a floating circle sized by monthly cost
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useSubscriptionStore, useCurrencyStore, useSettingsStore } from '../state';
import { toMonthlyAmount } from '../utils/calculations';
import { formatCurrency } from '../utils';
import { t } from '../i18n';
import type { Subscription } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Category color map
const CATEGORY_COLORS: Record<string, string> = {
  streaming: '#E50914',
  music: '#1DB954',
  cloud: '#4285F4',
  productivity: '#FF6B00',
  gaming: '#9146FF',
  fitness: '#00C853',
  news: '#1A1A2E',
  other: '#6B7280',
  // Also match app categories (capitalized)
  Entertainment: '#E50914',
  Music: '#1DB954',
  Storage: '#4285F4',
  Productivity: '#FF6B00',
  Development: '#9146FF',
  Health: '#00C853',
  Education: '#A855F6',
  Design: '#F59E0B',
  Finance: '#10B981',
  Other: '#6B7280',
};

const DEFAULT_COLOR = '#A855F6';

function getCategoryColor(category: string, colorKey?: string): string {
  if (colorKey && colorKey.startsWith('#')) return colorKey;
  return CATEGORY_COLORS[category] || DEFAULT_COLOR;
}

const MIN_RADIUS = 38;
const MAX_RADIUS = 90;

interface BubbleData {
  subscription: Subscription;
  monthlyAmount: number;
  radius: number;
  x: number;
  y: number;
  color: string;
  label: string;
}

function calculateBubbleLayout(
  subscriptions: Subscription[],
  containerWidth: number,
  containerHeight: number
): BubbleData[] {
  if (subscriptions.length === 0) return [];

  // Compute monthly amounts and sort largest first
  const withAmounts = subscriptions.map((sub) => ({
    subscription: sub,
    monthlyAmount: toMonthlyAmount(sub.amount, sub.cycle, sub.customDays),
  }));

  const maxAmount = Math.max(...withAmounts.map((s) => s.monthlyAmount), 1);
  const minAmount = Math.min(...withAmounts.map((s) => s.monthlyAmount), 0);
  const range = maxAmount - minAmount || 1;

  // Sort largest first
  withAmounts.sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  const bubbles: BubbleData[] = withAmounts.map(({ subscription, monthlyAmount }) => {
    const normalized = (monthlyAmount - minAmount) / range;
    const radius = MIN_RADIUS + normalized * (MAX_RADIUS - MIN_RADIUS);
    const color = getCategoryColor(subscription.category, subscription.colorKey);
    const label = subscription.name.substring(0, 2).toUpperCase();
    return { subscription, monthlyAmount, radius, x: 0, y: 0, color, label };
  });

  // Place bubbles using spiral layout from center outward
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;

  const placed: { x: number; y: number; r: number }[] = [];

  for (let i = 0; i < bubbles.length; i++) {
    const bubble = bubbles[i];
    const r = bubble.radius;

    if (i === 0) {
      bubble.x = centerX;
      bubble.y = centerY;
      placed.push({ x: centerX, y: centerY, r });
      continue;
    }

    // Spiral search: try increasing angles/distances
    let placed_ok = false;
    const step = 0.3;
    const maxDist = Math.max(containerWidth, containerHeight);

    for (let dist = r + (placed[0]?.r || 0) + 4; dist < maxDist; dist += 8) {
      for (let angle = 0; angle < Math.PI * 2; angle += step) {
        const cx = centerX + dist * Math.cos(angle);
        const cy = centerY + dist * Math.sin(angle);

        // Check bounds with padding
        const padding = 8;
        if (
          cx - r < padding ||
          cx + r > containerWidth - padding ||
          cy - r < padding ||
          cy + r > containerHeight - padding
        ) {
          continue;
        }

        // Check no overlap with placed bubbles
        let overlaps = false;
        for (const p of placed) {
          const dx = cx - p.x;
          const dy = cy - p.y;
          const dist2 = Math.sqrt(dx * dx + dy * dy);
          if (dist2 < r + p.r + 6) {
            overlaps = true;
            break;
          }
        }

        if (!overlaps) {
          bubble.x = cx;
          bubble.y = cy;
          placed.push({ x: cx, y: cy, r });
          placed_ok = true;
          break;
        }
      }
      if (placed_ok) break;
    }

    // Fallback: place outside center if can't fit
    if (!placed_ok) {
      const angle = (i / bubbles.length) * Math.PI * 2;
      const d = Math.min(containerWidth, containerHeight) * 0.35 + r;
      bubble.x = Math.max(r + 8, Math.min(containerWidth - r - 8, centerX + d * Math.cos(angle)));
      bubble.y = Math.max(r + 8, Math.min(containerHeight - r - 8, centerY + d * Math.sin(angle)));
    }
  }

  return bubbles;
}

// Individual animated bubble component
function Bubble({
  data,
  index,
  onPress,
  currency,
  reduceMotion,
}: {
  data: BubbleData;
  index: number;
  onPress: () => void;
  currency: string;
  reduceMotion: boolean;
}) {
  const scale = useSharedValue(reduceMotion ? 1 : 0);
  const floatY = useSharedValue(0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      // Skip entrance animation — appear instantly
      scale.value = 1;
      return;
    }

    // Entrance: spring from 0 to 1
    scale.value = withDelay(index * 60, withSpring(1, { damping: 12, stiffness: 150 }));

    // Subtle float: oscillate ±4px with staggered phase
    const phase = index * 300;
    floatY.value = withDelay(
      phase,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 2000 + index * 200 }),
          withTiming(5, { duration: 2000 + index * 200 })
        ),
        -1,
        true
      )
    );
  }, [reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * pressScale.value },
      { translateY: floatY.value },
    ],
  }));

  const { radius, color, label, subscription, monthlyAmount } = data;
  const diameter = radius * 2;
  const priceText = formatCurrency(monthlyAmount, currency);

  const handlePressIn = () => {
    if (!reduceMotion) {
      pressScale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (!reduceMotion) {
      pressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.bubbleWrapper,
        {
          left: data.x - radius,
          top: data.y - radius,
          width: diameter,
          height: diameter + 40,
        },
      ]}
      accessibilityLabel={`${subscription.name}, ${priceText} per month`}
      accessibilityRole="button"
      accessibilityHint="Double tap to view details"
    >
      <Animated.View style={animatedStyle} accessibilityElementsHidden={true} importantForAccessibility="no">
        {/* Circle */}
        <View
          style={[
            styles.circle,
            {
              width: diameter,
              height: diameter,
              borderRadius: radius,
              backgroundColor: color,
            },
          ]}
        >
          {/* Highlight shimmer */}
          <View style={[styles.circleHighlight, { borderRadius: radius }]} />

          <Text
            style={[
              styles.bubbleInitials,
              { fontSize: Math.max(16, radius * 0.45) },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>

        {/* Name label below circle */}
        <Text
          style={styles.bubbleName}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {subscription.name}
        </Text>

        {/* Price label */}
        <Text style={styles.bubblePrice} numberOfLines={1}>
          {priceText}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

interface HomeScreenProps {
  navigation: any;
}

export function BubbleViewScreen({ navigation }: HomeScreenProps) {
  const { colors } = useTheme();
  const nav = navigation;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub?.remove();
  }, []);

  const subscriptions = useSubscriptionStore((s) =>
    s.subscriptions.filter((sub) => sub.status === 'active')
  );
  const { convert } = useCurrencyStore();
  const currency = useSettingsStore((s) => s.app.currency);
  const calculateMonthlyTotalConverted = useSubscriptionStore(
    (s) => s.calculateMonthlyTotalConverted
  );

  const monthlyTotal = calculateMonthlyTotalConverted(convert, currency);

  // Container area below header
  const headerH = 130;
  const containerWidth = SCREEN_WIDTH;
  const containerHeight = SCREEN_HEIGHT - headerH;

  const bubbles = useMemo(
    () => calculateBubbleLayout(subscriptions, containerWidth, containerHeight),
    [subscriptions, containerWidth, containerHeight]
  );

  const handleBubblePress = (subscriptionId: string) => {
    nav.navigate('SubscriptionDetails', { subscriptionId });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bg }]}>
        <View style={styles.headerTop}>
          <Pressable
            onPress={() => nav.goBack()}
            style={[styles.backButton, { backgroundColor: colors.bgCard }]}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} importantForAccessibility="no" />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('bubbleView.title')}
          </Text>
          <View style={styles.backButton} />
        </View>

        <View
          style={styles.totalRow}
          accessibilityRole="text"
          accessibilityLabel={`Monthly total: ${formatCurrency(monthlyTotal, currency)}`}
        >
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
            {t('bubbleView.monthlyTotal')}
          </Text>
          <Text style={[styles.totalAmount, { color: colors.text }]}>
            {formatCurrency(monthlyTotal, currency)}
          </Text>
        </View>

        {subscriptions.length > 0 && (
          <Text style={[styles.hintText, { color: colors.textMuted }]}>
            {t('bubbleView.tapToView')}
          </Text>
        )}
      </View>

      {/* Bubble canvas */}
      {subscriptions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIconWrap,
              { backgroundColor: `${colors.primary}15` },
            ]}
          >
            <Ionicons name="apps-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('bubbleView.noSubscriptions')}
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.canvas,
            { width: containerWidth, height: containerHeight },
          ]}
        >
          {bubbles.map((bubble, index) => (
            <Bubble
              key={bubble.subscription.id}
              data={bubble}
              index={index}
              currency={currency}
              onPress={() => handleBubblePress(bubble.subscription.id)}
              reduceMotion={reduceMotion}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  totalRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  hintText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  canvas: {
    position: 'relative',
    overflow: 'hidden',
  },
  bubbleWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  circleHighlight: {
    position: 'absolute',
    top: 4,
    left: 8,
    width: '40%',
    height: '30%',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  bubbleInitials: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  bubbleName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 5,
    maxWidth: 90,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bubblePrice: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
