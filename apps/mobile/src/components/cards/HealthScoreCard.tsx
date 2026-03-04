/**
 * HealthScoreCard - Animated circular gauge showing subscription health
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, borderRadius, type ThemeColors } from '../../theme';
import { t } from '../../i18n';
import type { HealthScoreResult } from '../../utils/healthScore';
import { getGradeColor } from '../../utils/healthScore';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface HealthScoreCardProps {
  score: HealthScoreResult;
}

const GAUGE_SIZE = 120;
const STROKE_WIDTH = 10;
const RADIUS = (GAUGE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function HealthScoreCard({ score }: HealthScoreCardProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const progress = useSharedValue(0);
  const gradeColor = getGradeColor(score.grade);

  useEffect(() => {
    progress.value = withTiming(score.overallScore / 100, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [score.overallScore]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  if (score.factors.length === 0) {
    return (
      <View style={styles.container} accessibilityRole="none" accessibilityLabel={t('healthScore.title')}>
        <View style={styles.headerRow}>
          <Ionicons name="heart-outline" size={20} color={colors.primary} />
          <Text style={styles.title}>{t('healthScore.title')}</Text>
        </View>
        <Text style={styles.noDataText}>{t('healthScore.noData')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} accessibilityRole="none" accessibilityLabel={`${t('healthScore.title')}: ${score.grade} grade, score ${score.overallScore}`}>
      <View style={styles.headerRow}>
        <Ionicons name="heart-outline" size={20} color={colors.primary} />
        <Text style={styles.title}>{t('healthScore.title')}</Text>
      </View>

      {/* Gauge + Grade */}
      <View style={styles.gaugeContainer}>
        <Svg width={GAUGE_SIZE} height={GAUGE_SIZE} viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}>
          {/* Background circle */}
          <Circle
            cx={GAUGE_SIZE / 2}
            cy={GAUGE_SIZE / 2}
            r={RADIUS}
            stroke={colors.border}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* Progress circle */}
          <AnimatedCircle
            cx={GAUGE_SIZE / 2}
            cy={GAUGE_SIZE / 2}
            r={RADIUS}
            stroke={gradeColor}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            animatedProps={animatedProps}
            strokeLinecap="round"
            rotation="-90"
            origin={`${GAUGE_SIZE / 2}, ${GAUGE_SIZE / 2}`}
          />
        </Svg>
        {/* Score in center */}
        <View style={styles.gaugeCenter}>
          <Text style={[styles.gradeText, { color: gradeColor }]}>{score.grade}</Text>
          <Text style={styles.scoreText}>{score.overallScore}</Text>
        </View>
      </View>

      {/* Grade label */}
      <View style={[styles.gradeBadge, { backgroundColor: `${gradeColor}20`, borderColor: `${gradeColor}40` }]}>
        <Text style={[styles.gradeBadgeText, { color: gradeColor }]}>
          {t(`healthScore.grade${score.grade}`)}
        </Text>
      </View>

      {/* Factor bars */}
      <Text style={styles.factorsTitle}>{t('healthScore.factors')}</Text>
      {score.factors.map((factor) => (
        <View key={factor.key} style={styles.factorRow}>
          <Text style={styles.factorName} numberOfLines={1}>
            {t(`healthScore.${factor.key === 'usage' ? 'usageEfficiency' : factor.key === 'cost' ? 'costOptimization' : factor.key === 'trend' ? 'spendingTrend' : factor.key === 'trials' ? 'trialManagement' : 'categoryDiversity'}`)}
          </Text>
          <View style={styles.factorBarContainer}>
            <View style={styles.factorBarBg}>
              <View
                style={[
                  styles.factorBarFill,
                  {
                    width: `${factor.score}%`,
                    backgroundColor: factor.score >= 70 ? colors.emerald : factor.score >= 40 ? colors.amber : colors.pink,
                  },
                ]}
              />
            </View>
            <Text style={styles.factorScore}>{factor.score}</Text>
          </View>
        </View>
      ))}

      {/* Recommendations */}
      {score.recommendations.length > 0 && (
        <View style={styles.recommendationsSection}>
          <Text style={styles.recommendationsTitle}>{t('healthScore.recommendations')}</Text>
          {score.recommendations.map((rec, idx) => (
            <View key={idx} style={styles.recommendationRow}>
              <Ionicons name="bulb-outline" size={14} color={colors.amber} />
              <Text style={styles.recommendationText}>{rec}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius['2xl'],
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  noDataText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  gradeText: {
    fontSize: 28,
    fontWeight: '800',
  },
  scoreText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: -2,
  },
  gradeBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  gradeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  factorsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  factorRow: {
    marginBottom: 10,
  },
  factorName: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 4,
  },
  factorBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  factorBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  factorBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  factorScore: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    minWidth: 24,
    textAlign: 'right',
  },
  recommendationsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  recommendationsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
