/**
 * Header - Screen header with optional back button and actions
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, layout } from '../../theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  leftElement?: React.ReactNode;
  icon?: string;
  iconColor?: string;
  style?: ViewStyle;
}

export function Header({ 
  title, 
  subtitle, 
  showBack = false, 
  rightAction,
  leftElement,
  icon,
  iconColor,
  style 
}: HeaderProps) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const resolvedIconColor = iconColor || colors.primary;

  return (
    <View style={[styles.container, style]}>
      {showBack && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.bgCard }]}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      )}

      {leftElement && (
        <View style={styles.iconContainer}>
          {leftElement}
        </View>
      )}

      {!leftElement && icon && (
        <View style={[styles.iconContainer, { backgroundColor: `${resolvedIconColor}20` }]}>
          <Ionicons name={icon as any} size={24} color={resolvedIconColor} />
        </View>
      )}

      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
      </View>

      {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  rightAction: {
    marginLeft: 12,
  },
});

