/**
 * AmountInput - Currency amount input with prefix
 */
import React from 'react';
import { 
  View, 
  TextInput as RNTextInput, 
  Text, 
  StyleSheet, 
  ViewStyle 
} from 'react-native';
import { colors, borderRadius } from '../../theme';

interface AmountInputProps {
  value: string;
  onChangeText: (text: string) => void;
  currency?: string;
  label?: string;
  error?: string;
  style?: ViewStyle;
}

export function AmountInput({ 
  value, 
  onChangeText, 
  currency = '$',
  label,
  error,
  style 
}: AmountInputProps) {
  const handleChange = (text: string) => {
    // Only allow numbers and decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return;
    }
    // Limit decimal places to 2
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    onChangeText(cleaned);
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, error && styles.inputError]}>
        <Text style={styles.currency}>{currency}</Text>
        <RNTextInput
          style={styles.input}
          value={value}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  currency: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: 14,
  },
  inputError: {
    borderColor: colors.red,
  },
  error: {
    fontSize: 12,
    color: colors.red,
    marginTop: 6,
  },
});
