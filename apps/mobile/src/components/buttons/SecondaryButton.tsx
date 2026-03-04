/**
 * SecondaryButton - Secondary action button with outline style
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  testID?: string;
}

export function SecondaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  accessibilityLabel,
  testID,
}: SecondaryButtonProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      style={[
        styles.container,
        { borderColor: colors.border, backgroundColor: colors.bgCard },
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : (
        <Text
          style={[styles.text, { color: colors.text }, disabled && { color: colors.textMuted }]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
