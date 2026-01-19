/**
 * PremiumSubscriptionCard
 * Clean animated subscription card with:
 * - Press scale with spring physics
 * - Stagger fade-in animation
 * - Bright gradient backgrounds
 * - iOS/Android proper shadows
 * - Swipe to reveal actions (fixed gesture handling)
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
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
import { colors } from '../theme';
import type { Subscription } from '../types';

interface PremiumSubscriptionCardProps {
  item: Subscription;
  index: number;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function PremiumSubscriptionCard({ 
  item, 
  index, 
  onPress, 
  onEdit, 
  onDelete 
}: PremiumSubscriptionCardProps) {
  const swipeableRef = useRef<Swipeable>(null);
  
  // Animation shared values
  const pressed = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);
  const scale = useSharedValue(0.95);

  // Calculate days until billing
  const daysUntil = Math.ceil(
    (new Date(item.nextBillingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isUrgent = daysUntil <= 7;
  const formattedDate = new Date(item.nextBillingDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  // Stagger entrance animation
  useEffect(() => {
    const delay = index * 100;
    opacity.value = withDelay(delay, withSpring(1));
    translateY.value = withDelay(delay, withSpring(0, { damping: 15 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 12 }));
  }, []);

  // Card entrance animation style
  const entranceStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Card press animation style
  const cardStyle = useAnimatedStyle(() => {
    const cardScale = interpolate(pressed.value, [0, 1], [1, 0.97]);
    return {
      transform: [{ scale: cardScale }],
    };
  });

  // Press handlers
  const handlePressIn = () => {
    pressed.value = withSpring(1, { damping: 15 });
  };

  const handlePressOut = () => {
    pressed.value = withSpring(0);
  };

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
        <Text style={styles.actionText}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.actionButton, styles.deleteButton]} 
        onPress={() => {
          swipeableRef.current?.close();
          onDelete();
        }}
      >
        <Ionicons name="trash" size={20} color="#FFF" />
        <Text style={styles.actionText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  // Brighter gradient colors based on item color
  const gradientColors = [
    `${item.colorKey}50`,  // 50% opacity - brighter
    `${item.colorKey}25`,  // 25% opacity
    '#1E1E28',             // Dark but not too dark
  ] as const;

  return (
    <Animated.View style={[styles.container, entranceStyle]}>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Animated.View 
            style={[
              styles.card, 
              cardStyle,
              // iOS shadow with item color
              Platform.OS === 'ios' && {
                shadowColor: item.colorKey,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
              },
            ]}
          >
            {/* Bright gradient background */}
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBg}
            >
              {/* Colored accent border */}
              <View style={[styles.accentBorder, { backgroundColor: item.colorKey }]} />

              {/* Content */}
              <View style={styles.content}>
                {/* Header Row */}
                <View style={styles.header}>
                  {/* Icon with brighter background */}
                  <View style={[styles.iconContainer, { backgroundColor: `${item.colorKey}40` }]}>
                    <Text style={styles.iconEmoji}>{item.iconKey}</Text>
                  </View>

                  {/* Name & Category */}
                  <View style={styles.info}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.category}>{item.category.toUpperCase()}</Text>
                  </View>

                  {/* Days Badge */}
                  <View style={[
                    styles.daysBadge, 
                    { backgroundColor: isUrgent ? `${colors.amber}30` : `${colors.emerald}30` }
                  ]}>
                    <Text style={[
                      styles.daysText, 
                      { color: isUrgent ? colors.amber : colors.emerald }
                    ]}>
                      {daysUntil}d
                    </Text>
                  </View>
                </View>

                {/* Price Row */}
                <View style={styles.priceRow}>
                  <View style={styles.priceContainer}>
                    <Text style={[styles.currency, { color: item.colorKey }]}>$</Text>
                    <Text style={styles.price}>{item.amount.toFixed(2)}</Text>
                    <Text style={styles.period}>/{item.cycle === 'monthly' ? 'mo' : 'yr'}</Text>
                  </View>

                  {/* Next billing date */}
                  <View style={[styles.dateContainer, { borderColor: `${item.colorKey}30` }]}>
                    <Ionicons name="calendar-outline" size={14} color={item.colorKey} />
                    <Text style={styles.dateText}>{formattedDate}</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
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
  editButton: {
    backgroundColor: colors.primary,
  },
  deleteButton: {
    backgroundColor: colors.red,
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
    backgroundColor: '#1E1E28',
    // Android elevation
    ...Platform.select({
      android: {
        elevation: 10,
      },
    }),
  },
  gradientBg: {
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
  info: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  category: {
    fontSize: 11,
    color: '#9CA3AF',
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
    color: '#FFFFFF',
  },
  period: {
    fontSize: 15,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
  },
});
