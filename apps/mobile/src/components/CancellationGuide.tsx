/**
 * CancellationGuide - Interactive step-by-step cancellation flow
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, borderRadius, type ThemeColors } from '../theme';
import { t } from '../i18n';

interface CancellationGuideProps {
  serviceName: string;
  steps: string[];
  cancelUrl?: string;
  cancelDifficulty?: 'easy' | 'medium' | 'hard';
  onComplete?: () => void;
}

const DIFFICULTY_CONFIG = {
  easy: { icon: 'checkmark-circle' as const, colorKey: 'emerald' as const },
  medium: { icon: 'alert-circle' as const, colorKey: 'amber' as const },
  hard: { icon: 'close-circle' as const, colorKey: 'pink' as const },
};

export function CancellationGuide({
  serviceName,
  steps,
  cancelUrl,
  cancelDifficulty = 'medium',
  onComplete,
}: CancellationGuideProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (index: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
        if (next.size === steps.length && onComplete) {
          onComplete();
        }
      }
      return next;
    });
  };

  const progress = steps.length > 0 ? completedSteps.size / steps.length : 0;
  const isCompleted = completedSteps.size === steps.length && steps.length > 0;
  const diffConfig = DIFFICULTY_CONFIG[cancelDifficulty];
  const diffColor = colors[diffConfig.colorKey];

  return (
    <View
      style={styles.container}
      accessibilityRole="none"
      accessibilityLabel={`Cancellation guide for ${serviceName}`}
    >
      {/* Header with difficulty */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="close-circle-outline" size={20} color={colors.pink} />
          <Text style={styles.title}>{t('cancellation.title')}</Text>
        </View>
        <View
          style={[
            styles.difficultyBadge,
            { backgroundColor: `${diffColor}20`, borderColor: `${diffColor}40` },
          ]}
        >
          <Ionicons name={diffConfig.icon} size={14} color={diffColor} />
          <Text style={[styles.difficultyText, { color: diffColor }]}>
            {t(`cancellation.${cancelDifficulty}`)}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: isCompleted ? colors.emerald : colors.primary,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {completedSteps.size} / {steps.length}
        </Text>
      </View>

      {/* Steps */}
      {steps.map((step, index) => {
        const isStepCompleted = completedSteps.has(index);
        return (
          <TouchableOpacity
            key={index}
            style={styles.stepRow}
            onPress={() => toggleStep(index)}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isStepCompleted }}
            accessibilityLabel={`Step ${index + 1}: ${step}`}
          >
            <View
              style={[
                styles.stepCircle,
                isStepCompleted && {
                  backgroundColor: colors.emerald,
                  borderColor: colors.emerald,
                },
              ]}
            >
              {isStepCompleted ? (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              ) : (
                <Text style={styles.stepNumber}>{index + 1}</Text>
              )}
            </View>
            <Text
              style={[styles.stepText, isStepCompleted && styles.stepTextCompleted]}
            >
              {step}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Completion message */}
      {isCompleted && (
        <View style={styles.completedContainer}>
          <Ionicons name="checkmark-circle" size={24} color={colors.emerald} />
          <Text style={styles.completedText}>{t('cancellation.completed')}</Text>
        </View>
      )}

      {/* Open in browser */}
      {cancelUrl && (
        <TouchableOpacity
          style={[styles.browserButton, { borderColor: colors.primary + '40' }]}
          onPress={() => Linking.openURL(cancelUrl)}
          activeOpacity={0.8}
          accessibilityRole="link"
          accessibilityLabel={t('cancellation.openInBrowser')}
        >
          <Ionicons name="open-outline" size={18} color={colors.primary} />
          <Text style={[styles.browserButtonText, { color: colors.primary }]}>
            {t('cancellation.openInBrowser')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.bgCard,
      borderRadius: borderRadius['2xl'],
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    difficultyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
    },
    difficultyText: {
      fontSize: 12,
      fontWeight: '600',
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    progressBar: {
      flex: 1,
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    progressText: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '600',
      minWidth: 35,
      textAlign: 'right',
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    stepCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      borderColor: colors.textMuted,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 1,
    },
    stepNumber: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
    },
    stepText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    stepTextCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    completedContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    completedText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.emerald,
    },
    browserButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 16,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    browserButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
  });
