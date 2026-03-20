/**
 * IconGrid - Icon picker grid
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ViewStyle } from 'react-native';
import { useTheme, borderRadius } from '../../theme';

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
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <View style={styles.grid}>
        {icons.map((icon) => {
          const isSelected = icon === value;
          return (
            <TouchableOpacity
              key={icon}
              onPress={() => onChange(icon)}
              style={[
                styles.iconButton,
                { backgroundColor: colors.bgCard, borderColor: colors.border },
                isSelected && { backgroundColor: `${colors.primary}30`, borderColor: colors.primary },
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
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 24,
  },
});
