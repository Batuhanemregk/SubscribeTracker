/**
 * TextInput - Styled text input component
 */
import React from 'react';
import { 
  View, 
  TextInput as RNTextInput, 
  Text, 
  StyleSheet, 
  ViewStyle,
  TextInputProps as RNTextInputProps 
} from 'react-native';
import { useTheme, borderRadius } from '../../theme';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function TextInput({ 
  label, 
  error, 
  containerStyle,
  style,
  ...props 
}: TextInputProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <RNTextInput
        style={[
          styles.input,
          { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.text },
          error && { borderColor: colors.red },
          style,
        ]}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        {...props}
      />
      {error && <Text style={[styles.error, { color: colors.red }]}>{error}</Text>}
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
  input: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  error: {
    fontSize: 12,
    marginTop: 6,
  },
});
