/**
 * Reusable UI Components
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, gradients, borderRadius, shadows } from '../theme';

// ============================================================================
// SCREEN CONTAINER
// ============================================================================
interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function ScreenContainer({ children, style }: ScreenContainerProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.screenContainer, { backgroundColor: colors.bg }, style]}>
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
  const { colors } = useTheme();
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper 
      style={[styles.glassCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, style]} 
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

export function GradientHeroCard({ children, gradient = gradients.primary, style }: GradientHeroCardProps) {
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

export function StatCard({ icon, value, label, iconColor, style }: StatCardProps) {
  const { colors } = useTheme();
  const resolvedColor = iconColor || colors.primary;
  return (
    <View style={[styles.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, style]}>
      <View style={[styles.statIconBox, { backgroundColor: `${resolvedColor}20` }]}>
        <Ionicons name={icon as any} size={16} color={resolvedColor} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
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
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={[styles.sectionAction, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={onAction}>
          <Ionicons name="add" size={16} color={colors.text} />
          <Text style={[styles.sectionActionText, { color: colors.text }]}>{actionLabel}</Text>
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

export function PillTag({ label, color, style }: PillTagProps) {
  const { colors } = useTheme();
  const resolvedColor = color || colors.primary;
  return (
    <View style={[styles.pill, { backgroundColor: `${resolvedColor}20` }, style]}>
      <Text style={[styles.pillText, { color: resolvedColor }]}>{label}</Text>
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
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.primaryButton, { backgroundColor: colors.primary }, disabled && styles.buttonDisabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {icon && <Ionicons name={icon as any} size={18} color="#FFFFFF" style={{ marginRight: 8 }} />}
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
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.secondaryButton, { backgroundColor: colors.bgCard, borderColor: colors.border }, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon && <Ionicons name={icon as any} size={18} color={colors.text} style={{ marginRight: 8 }} />}
      <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{label}</Text>
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
  const { colors } = useTheme();
  const resolvedIconColor = iconColor || colors.primary;
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={[styles.listRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      {icon && (
        <View style={[styles.listRowIcon, { backgroundColor: `${resolvedIconColor}20` }]}>
          <Ionicons name={icon as any} size={18} color={resolvedIconColor} />
        </View>
      )}
      <View style={styles.listRowContent}>
        <Text style={[styles.listRowTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.listRowSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
      </View>
      {(rightText || rightSubtext) && (
        <View style={styles.listRowRight}>
          {rightText && <Text style={[styles.listRowRightText, { color: colors.text }]}>{rightText}</Text>}
          {rightSubtext && <Text style={[styles.listRowRightSubtext, { color: colors.textMuted }]}>{rightSubtext}</Text>}
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
  const { colors } = useTheme();
  const percentage = total > 0 ? (amount / total) * 100 : 0;
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressHeader}>
        <View style={styles.progressLabelRow}>
          <View style={[styles.progressDot, { backgroundColor: color }]} />
          <Text style={[styles.progressLabel, { color: colors.text }]}>{label}</Text>
        </View>
        <Text style={[styles.progressAmount, { color: colors.textSecondary }]}>${amount.toFixed(2)}</Text>
      </View>
      <View style={[styles.progressBar, { backgroundColor: colors.bgElevated }]}>
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
  return (
    <View style={[styles.subscriptionIcon, { width: size, height: size, backgroundColor: colorKey }]}>
      <Ionicons name={(iconKey || 'apps') as any} size={size * 0.45} color="#FFFFFF" />
    </View>
  );
}

// ============================================================================
// STYLES (layout only — colors applied via inline styles)
// ============================================================================
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },

  glassCard: {
    borderRadius: borderRadius.xl,
    padding: 16,
    borderWidth: 1,
    ...shadows.card,
  },

  gradientCard: {
    borderRadius: borderRadius.xl,
    padding: 20,
    marginBottom: 16,
  },

  statCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    alignItems: 'flex-start',
  },

  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },

  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },

  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },

  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },

  sectionActionText: {
    fontSize: 13,
    marginLeft: 4,
  },

  pill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },

  pillText: {
    fontSize: 12,
    fontWeight: '500',
  },

  primaryButton: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  secondaryButton: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: borderRadius.lg,
    marginBottom: 8,
    borderWidth: 1,
  },

  listRowIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  listRowContent: {
    flex: 1,
  },

  listRowTitle: {
    fontSize: 14,
    fontWeight: '500',
  },

  listRowSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },

  listRowRight: {
    alignItems: 'flex-end',
    marginRight: 8,
  },

  listRowRightText: {
    fontSize: 14,
    fontWeight: '600',
  },

  listRowRightSubtext: {
    fontSize: 12,
    marginTop: 2,
  },

  progressRow: {
    marginBottom: 16,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },

  progressLabel: {
    fontSize: 13,
  },

  progressAmount: {
    fontSize: 13,
    fontWeight: '600',
  },

  progressBar: {
    height: 6,
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
