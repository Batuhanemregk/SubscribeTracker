/**
 * IconGrid - Icon picker grid
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ViewStyle } from 'react-native';
import { colors, borderRadius } from '../../theme';

const defaultIcons = [
  '🎵', '📺', '☁️', '🎮', '💻', '🎨',
  '📧', '🔒', '📱', '🏋️', '📚', '🎬',
  '🛒', '💳', '🔧', '📊', '🎯', '🚀',
  '💡', '🎧', '📷', '🌐', '🔔', '⭐',
];

interface IconGridProps {
  value: string;
  onChange: (icon: string) => void;
  icons?: string[];
  label?: string;
  style?: ViewStyle;
}

export function IconGrid({ 
  value, 
  onChange, 
  icons = defaultIcons,
  label,
  style 
}: IconGridProps) {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.grid}>
        {icons.map((icon) => {
          const isSelected = icon === value;
          return (
            <TouchableOpacity
              key={icon}
              onPress={() => onChange(icon)}
              style={[
                styles.iconButton,
                isSelected && styles.iconButtonSelected,
              ]}
              activeOpacity={0.7}
            >
              <Text style={styles.iconText}>{icon}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonSelected: {
    backgroundColor: `${colors.primary}30`,
    borderColor: colors.primary,
  },
  iconText: {
    fontSize: 24,
  },
});
