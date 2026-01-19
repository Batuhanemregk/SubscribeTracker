/**
 * ColorGrid - Color picker grid
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '../../theme';

const defaultColors = [
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#14B8A6', // Teal
  '#A855F7', // Violet
];

interface ColorGridProps {
  value: string;
  onChange: (color: string) => void;
  colorOptions?: string[];
  label?: string;
  style?: ViewStyle;
}

export function ColorGrid({ 
  value, 
  onChange, 
  colorOptions = defaultColors,
  label,
  style 
}: ColorGridProps) {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.grid}>
        {colorOptions.map((color) => {
          const isSelected = color === value;
          return (
            <TouchableOpacity
              key={color}
              onPress={() => onChange(color)}
              style={[
                styles.colorButton,
                { backgroundColor: color },
                isSelected && styles.colorButtonSelected,
              ]}
              activeOpacity={0.7}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={20} color="#FFF" />
              )}
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
    gap: 10,
  },
  colorButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorButtonSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
  },
});
