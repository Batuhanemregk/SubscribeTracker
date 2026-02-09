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

interface SwipeableSubscriptionCardProps {
  item: Subscription;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function SwipeableSubscriptionCard({ item, onPress, onEdit, onDelete }: SwipeableSubscriptionCardProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const swipeableRef = useRef<Swipeable>(null);
  
  const daysUntil = Math.ceil((new Date(item.nextBillingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysUntil <= 7;
  const formattedDate = new Date(item.nextBillingDate).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
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
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
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
