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
import { useTheme, borderRadius } from '../../theme';

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
  const { colors } = useTheme();

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
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <View style={[styles.inputContainer, { backgroundColor: colors.bgCard, borderColor: colors.border }, error && { borderColor: colors.red }]}>
        <Text style={[styles.currency, { color: colors.primary }]}>{currency}</Text>
        <RNTextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
        />
      </View>
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  currency: {
    fontSize: 20,
    fontWeight: '600',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    paddingVertical: 14,
  },
  error: {
    fontSize: 12,
    marginTop: 6,
  },
});
