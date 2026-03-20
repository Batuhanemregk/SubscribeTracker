/**
 * LoadingSpinner - Loading indicator
 */
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  text?: string;
  fullScreen?: boolean;
  style?: ViewStyle;
}

export function LoadingSpinner({ 
  size = 'large', 
  text,
  fullScreen = false,
  style 
}: LoadingSpinnerProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, fullScreen && { flex: 1, backgroundColor: colors.bg }, style]}>
      <ActivityIndicator size={size} color={colors.primary} />
      {text && <Text style={[styles.text, { color: colors.textMuted }]}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    marginTop: 12,
    fontSize: 14,
  },
});
