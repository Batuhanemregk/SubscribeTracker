/**
 * FAB - Floating Action Button
 */
import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows, createGlow } from '../../theme';

interface FABProps {
  icon?: string;
  onPress: () => void;
  style?: ViewStyle;
}

export function FAB({ icon = 'add', onPress, style }: FABProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.container, createGlow(colors.primary, 'md'), style]}
    >
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.gradient}
      >
        <Ionicons name={icon as any} size={28} color={colors.text} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    borderRadius: 28,
    overflow: 'hidden',
  },
  gradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
