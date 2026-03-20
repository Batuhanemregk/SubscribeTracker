/**
 * SegmentedControl - Segmented selector for options like billing cycle
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme, borderRadius } from '../../theme';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  style?: ViewStyle;
}

export function SegmentedControl<T extends string>({ 
  options, 
  value, 
  onChange,
  label,
  style 
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <View style={[styles.segmentContainer, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[
                styles.segment,
                isSelected && { backgroundColor: colors.primary },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.segmentText,
                { color: colors.textMuted },
                isSelected && { color: '#FFFFFF' },
              ]}>
                {option.label}
              </Text>
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
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
