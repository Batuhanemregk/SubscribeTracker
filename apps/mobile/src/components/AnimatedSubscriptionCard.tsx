/**
 * AnimatedSubscriptionCard Component
 * Premium card with shimmer, glassmorphism, spring bounce, and neon glow
 */
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated as RNAnimated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, type ThemeColors } from '../theme';
import type { Subscription } from '../types';

interface AnimatedSubscriptionCardProps {
  item: Subscription;
  index: number;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isRefreshing?: boolean;
}

export function AnimatedSubscriptionCard({ 
  item, 
  index, 
  onPress, 
  onEdit, 
  onDelete,
  isRefreshing = false 
}: AnimatedSubscriptionCardProps) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors);
  const swipeableRef = useRef<Swipeable>(null);
  
  // Animation values
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const slideAnim = useRef(new RNAnimated.Value(50)).current;
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  const shimmerAnim = useRef(new RNAnimated.Value(0)).current;
  
  const daysUntil = Math.ceil((new Date(item.nextBillingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysUntil <= 7;
  const formattedDate = new Date(item.nextBillingDate).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });

  // Stagger animation on mount and refresh
  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    
    const delay = index * 100; // Stagger delay
    
    RNAnimated.parallel([
      RNAnimated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      RNAnimated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isRefreshing]);

  // Shimmer animation loop
  useEffect(() => {
    const shimmerLoop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        RNAnimated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerLoop.start();
    return () => shimmerLoop.stop();
  }, []);

  // Press animations (spring bounce)
  const handlePressIn = () => {
    RNAnimated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    RNAnimated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 400],
  });

  const renderRightActions = () => {
    return (
      <View style={styles.swipeActions}>
        <TouchableOpacity 
          style={[styles.swipeBtn, styles.swipeBtnEdit]} 
          onPress={() => {
            swipeableRef.current?.close();
            onEdit();
          }}
        >
          <Ionicons name="pencil" size={20} color="#FFF" />
          <Text style={styles.swipeBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.swipeBtn, styles.swipeBtnDelete]} 
          onPress={() => {
            swipeableRef.current?.close();
            onDelete();
          }}
        >
          <Ionicons name="trash" size={20} color="#FFF" />
          <Text style={styles.swipeBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable 
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      <RNAnimated.View
        style={[
          styles.cardWrapper,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        {/* Neon glow shadow */}
        <View style={[styles.neonGlow, { backgroundColor: item.colorKey, shadowColor: item.colorKey }]} />
        
        <TouchableOpacity 
          style={styles.card} 
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          {/* Glassmorphism background */}
          <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={[styles.blurBg, { backgroundColor: isDark ? 'rgba(20, 20, 25, 0.8)' : 'rgba(255, 255, 255, 0.85)' }]}>
            {/* Shimmer effect */}
            <RNAnimated.View
              style={[
                styles.shimmer,
                {
                  transform: [{ translateX: shimmerTranslate }],
                },
              ]}
            >
              <LinearGradient
                colors={['transparent', isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </RNAnimated.View>
            
            {/* Colored left border */}
            <View style={[styles.border, { backgroundColor: item.colorKey }]} />
            
            <View style={styles.content}>
              {/* Header: Icon, Name, Category */}
              <View style={styles.header}>
                <View style={[styles.icon, { backgroundColor: item.colorKey }]}>
                  <Text style={styles.iconEmoji}>{item.iconKey}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.category}>{item.category.toUpperCase()}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
              
              {/* Price in middle */}
              <Text style={styles.price}>
                ${item.amount.toFixed(2)} <Text style={styles.cycle}>/ mo</Text>
              </Text>
              
              {/* Footer: Date and Days */}
              <View style={styles.footer}>
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
          </BlurView>
        </TouchableOpacity>
      </RNAnimated.View>
    </Swipeable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  cardWrapper: {
    marginBottom: 16,
    position: 'relative',
  },
  neonGlow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: -4,
    borderRadius: 20,
    opacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  blurBg: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  shimmerGradient: {
    width: 100,
    height: '100%',
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
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
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
  swipeActions: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  swipeBtn: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeBtnEdit: {
    backgroundColor: '#8B5CF6',
  },
  swipeBtnDelete: {
    backgroundColor: '#EF4444',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  swipeBtnText: {
    color: '#FFF',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
});
