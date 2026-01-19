/**
 * IconButton - Icon-only button with optional background
 */
import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

interface IconButtonProps {
  icon: string;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  backgroundColor?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

const sizeConfig = {
  sm: { container: 32, icon: 16 },
  md: { container: 40, icon: 20 },
  lg: { container: 48, icon: 24 },
};

export function IconButton({ 
  icon, 
  onPress, 
  size = 'md',
  color = colors.text,
  backgroundColor = colors.bgCard,
  disabled = false,
  style 
}: IconButtonProps) {
  const config = sizeConfig[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          width: config.container,
          height: config.container,
          backgroundColor,
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons 
        name={icon as any} 
        size={config.icon} 
        color={disabled ? colors.textDisabled : color} 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
