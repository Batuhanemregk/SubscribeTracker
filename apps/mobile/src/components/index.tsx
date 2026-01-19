/**
 * Reusable UI Components
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients, borderRadius, spacing, typography, shadows, brandIcons, iconMap } from '../theme';

// ============================================================================
// SCREEN CONTAINER
// ============================================================================
interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function ScreenContainer({ children, style }: ScreenContainerProps) {
  return (
    <View style={[styles.screenContainer, style]}>
      {children}
    </View>
  );
}

// ============================================================================
// GLASS CARD
// ============================================================================
interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export function GlassCard({ children, style, onPress }: GlassCardProps) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper 
      style={[styles.glassCard, style]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      {children}
    </Wrapper>
  );
}

// ============================================================================
// GRADIENT HERO CARD
// ============================================================================
interface GradientHeroCardProps {
  children: React.ReactNode;
  gradient?: readonly [string, string, ...string[]];
  style?: ViewStyle;
}

export function GradientHeroCard({ children, gradient = gradients.purple, style }: GradientHeroCardProps) {
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradientCard, style]}
    >
      {children}
    </LinearGradient>
  );
}

// ============================================================================
// STAT CARD
// ============================================================================
interface StatCardProps {
  icon: string;
  value: string;
  label: string;
  iconColor?: string;
  style?: ViewStyle;
}

export function StatCard({ icon, value, label, iconColor = colors.primary, style }: StatCardProps) {
  return (
    <View style={[styles.statCard, style]}>
      <View style={[styles.statIconBox, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon as any} size={16} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ============================================================================
// SECTION HEADER
// ============================================================================
interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.sectionAction} onPress={onAction}>
          <Ionicons name="add" size={16} color={colors.text} />
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// PILL TAG
// ============================================================================
interface PillTagProps {
  label: string;
  color?: string;
  style?: ViewStyle;
}

export function PillTag({ label, color = colors.primary, style }: PillTagProps) {
  return (
    <View style={[styles.pill, { backgroundColor: `${color}20` }, style]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

// ============================================================================
// PRIMARY BUTTON
// ============================================================================
interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  icon?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export function PrimaryButton({ label, onPress, icon, disabled, style }: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, disabled && styles.buttonDisabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {icon && <Ionicons name={icon as any} size={18} color={colors.text} style={{ marginRight: 8 }} />}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// SECONDARY BUTTON
// ============================================================================
interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
  icon?: string;
  style?: ViewStyle;
}

export function SecondaryButton({ label, onPress, icon, style }: SecondaryButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.secondaryButton, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon && <Ionicons name={icon as any} size={18} color={colors.text} style={{ marginRight: 8 }} />}
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// LIST ROW
// ============================================================================
interface ListRowProps {
  icon?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  rightText?: string;
  rightSubtext?: string;
  onPress?: () => void;
}

export function ListRow({ icon, iconColor, title, subtitle, rightText, rightSubtext, onPress }: ListRowProps) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={styles.listRow} onPress={onPress} activeOpacity={0.7}>
      {icon && (
        <View style={[styles.listRowIcon, { backgroundColor: `${iconColor || colors.primary}20` }]}>
          <Ionicons name={icon as any} size={18} color={iconColor || colors.primary} />
        </View>
      )}
      <View style={styles.listRowContent}>
        <Text style={styles.listRowTitle}>{title}</Text>
        {subtitle && <Text style={styles.listRowSubtitle}>{subtitle}</Text>}
      </View>
      {(rightText || rightSubtext) && (
        <View style={styles.listRowRight}>
          {rightText && <Text style={styles.listRowRightText}>{rightText}</Text>}
          {rightSubtext && <Text style={styles.listRowRightSubtext}>{rightSubtext}</Text>}
        </View>
      )}
      {onPress && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </Wrapper>
  );
}

// ============================================================================
// PROGRESS ROW
// ============================================================================
interface ProgressRowProps {
  label: string;
  amount: number;
  total: number;
  color: string;
}

export function ProgressRow({ label, amount, total, color }: ProgressRowProps) {
  const percentage = total > 0 ? (amount / total) * 100 : 0;
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressHeader}>
        <View style={styles.progressLabelRow}>
          <View style={[styles.progressDot, { backgroundColor: color }]} />
          <Text style={styles.progressLabel}>{label}</Text>
        </View>
        <Text style={styles.progressAmount}>${amount.toFixed(2)}</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ============================================================================
// SUBSCRIPTION ICON
// ============================================================================
interface SubscriptionIconProps {
  name: string;
  iconKey: string;
  colorKey: string;
  size?: number;
}

export function SubscriptionIcon({ name, iconKey, colorKey, size = 44 }: SubscriptionIconProps) {
  // Check for brand-specific icon
  const brand = brandIcons[name];
  const icon = brand?.icon || iconMap[iconKey] || 'apps';
  const color = brand?.color || colorKey;

  return (
    <View style={[styles.subscriptionIcon, { width: size, height: size, backgroundColor: color }]}>
      <Ionicons name={icon as any} size={size * 0.45} color="#FFFFFF" />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  glassCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },

  gradientCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },

  statCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
  },

  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  statValue: {
    fontSize: typography.sectionTitle,
    fontWeight: typography.bold,
    color: colors.text,
  },

  statLabel: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  sectionTitle: {
    fontSize: typography.sectionTitle,
    fontWeight: typography.semibold,
    color: colors.text,
  },

  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },

  sectionActionText: {
    color: colors.text,
    fontSize: typography.caption,
    marginLeft: spacing.xs,
  },

  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },

  pillText: {
    fontSize: typography.small,
    fontWeight: typography.medium,
  },

  primaryButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  secondaryButton: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  secondaryButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },

  listRowIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },

  listRowContent: {
    flex: 1,
  },

  listRowTitle: {
    fontSize: typography.body,
    fontWeight: typography.medium,
    color: colors.text,
  },

  listRowSubtitle: {
    fontSize: typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },

  listRowRight: {
    alignItems: 'flex-end',
    marginRight: spacing.sm,
  },

  listRowRightText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.text,
  },

  listRowRightSubtext: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },

  progressRow: {
    marginBottom: spacing.lg,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },

  progressLabel: {
    fontSize: typography.caption,
    color: colors.text,
  },

  progressAmount: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },

  progressBar: {
    height: 6,
    backgroundColor: colors.bgTertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  subscriptionIcon: {
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
