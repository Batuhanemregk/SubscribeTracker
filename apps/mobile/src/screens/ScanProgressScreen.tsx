/**
 * ScanProgressScreen - Email scanning progress indicator
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors, borderRadius } from '../theme';
import { usePlanStore } from '../state';
import { showPreScanAd } from '../services';

interface ScanProgressScreenProps {
  navigation: any;
  route: any;
}

const PHASES = [
  { key: 'connecting', label: 'Connecting to email...', icon: 'mail' },
  { key: 'fetching', label: 'Fetching emails...', icon: 'download' },
  { key: 'analyzing', label: 'Analyzing content...', icon: 'analytics' },
  { key: 'detecting', label: 'Detecting subscriptions...', icon: 'search' },
  { key: 'done', label: 'Scan complete!', icon: 'checkmark-circle' },
];

export function ScanProgressScreen({ navigation, route }: ScanProgressScreenProps) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ emails: 0, candidates: 0 });
  const [isCancelled, setIsCancelled] = useState(false);

  const { isPro } = usePlanStore();

  // Animation values
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    // Show pre-scan ad for Standard users
    if (!isPro()) {
      showPreScanAd();
    }

    // Rotate animation
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );

    // Pulse animation
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );

    // Simulate scan progress
    const interval = setInterval(() => {
      if (isCancelled) {
        clearInterval(interval);
        return;
      }

      setProgress(prev => {
        const next = prev + Math.random() * 5;
        if (next >= 100) {
          clearInterval(interval);
          setCurrentPhase(4); // Done
          // Navigate to results after delay
          setTimeout(() => {
            navigation.replace('ScanResults', { 
              candidatesCount: Math.floor(Math.random() * 5) + 2 
            });
          }, 1500);
          return 100;
        }

        // Update phase based on progress
        if (next > 75) setCurrentPhase(3);
        else if (next > 50) setCurrentPhase(2);
        else if (next > 25) setCurrentPhase(1);

        // Update stats
        setStats({
          emails: Math.floor(next * 2),
          candidates: Math.floor(next / 20),
        });

        return next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isCancelled]);

  const handleCancel = () => {
    setIsCancelled(true);
    navigation.goBack();
  };

  const animatedRotation = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const animatedPulse = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const phase = PHASES[currentPhase];
  const isDone = currentPhase === 4;

  return (
    <View style={styles.container}>
      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
        <Ionicons name="close" size={24} color={colors.text} />
      </TouchableOpacity>

      {/* Progress Circle */}
      <View style={styles.progressContainer}>
        <Animated.View style={[styles.outerRing, animatedRotation]}>
          <LinearGradient
            colors={[colors.primary, colors.pink, colors.primary]}
            style={styles.gradientRing}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>

        <Animated.View style={[styles.innerCircle, animatedPulse]}>
          <Ionicons 
            name={phase.icon as any} 
            size={48} 
            color={isDone ? colors.emerald : colors.primary} 
          />
        </Animated.View>
      </View>

      {/* Progress Text */}
      <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
      <Text style={styles.phaseLabel}>{phase.label}</Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="mail" size={18} color={colors.primary} />
          <Text style={styles.statValue}>{stats.emails}</Text>
          <Text style={styles.statLabel}>Emails scanned</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="checkmark-circle" size={18} color={colors.emerald} />
          <Text style={styles.statValue}>{stats.candidates}</Text>
          <Text style={styles.statLabel}>Detected</Text>
        </View>
      </View>

      {/* Scan Type Badge */}
      <View style={styles.scanTypeBadge}>
        <Ionicons 
          name={isPro() ? 'document-text' : 'mail-outline'} 
          size={14} 
          color={isPro() ? colors.amber : colors.textMuted} 
        />
        <Text style={styles.scanTypeText}>
          {isPro() ? 'Full Body Scan' : 'Metadata Scan'}
        </Text>
      </View>

      {/* Info Text */}
      <Text style={styles.infoText}>
        {isPro() 
          ? 'Analyzing email content for accurate detection...'
          : 'Scanning email headers. Upgrade to Pro for better detection.'}
      </Text>

      {/* Cancel Button */}
      {!isDone && (
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>Cancel Scan</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  outerRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    padding: 4,
  },
  gradientRing: {
    flex: 1,
    borderRadius: 100,
    opacity: 0.3,
  },
  innerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  progressPercent: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  phaseLabel: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  scanTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgCard,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  scanTypeText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
    marginBottom: 32,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelText: {
    fontSize: 15,
    color: colors.red,
    fontWeight: '600',
  },
});
