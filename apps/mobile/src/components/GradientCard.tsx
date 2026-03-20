/**
 * GradientCard Component
 */
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientCardProps {
  gradient: readonly [string, string];
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GradientCard({ gradient, children, style }: GradientCardProps) {
  return (
    <LinearGradient 
      colors={gradient} 
      start={{ x: 0, y: 0 }} 
      end={{ x: 1, y: 1 }} 
      style={[styles.card, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
});
