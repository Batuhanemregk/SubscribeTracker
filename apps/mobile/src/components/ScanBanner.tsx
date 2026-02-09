/**
 * ScanBanner — Gradient card promoting bank statement scanning
 * 
 * Display logic:
 * - Show when user has ≥1 subscription AND hasn't scanned AND hasn't dismissed
 * - Disappears after first scan or dismiss (stored in AsyncStorage)
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { borderRadius } from '../theme';
import { t } from '../i18n';

const BANNER_DISMISSED_KEY = 'scan_banner_dismissed';
const SCAN_COMPLETED_KEY = 'scan_completed';

interface ScanBannerProps {
  onScanPress: () => void;
}

export function ScanBanner({ onScanPress }: ScanBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    checkVisibility();
  }, []);

  async function checkVisibility() {
    try {
      const [dismissed, completed] = await Promise.all([
        AsyncStorage.getItem(BANNER_DISMISSED_KEY),
        AsyncStorage.getItem(SCAN_COMPLETED_KEY),
      ]);
      // Show only if not dismissed and not completed a scan
      if (!dismissed && !completed) {
        setVisible(true);
      }
    } catch {
      // Default: don't show
    }
  }

  async function handleDismiss() {
    setVisible(false);
    await AsyncStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  }

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeInDown.delay(300).springify()}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      <TouchableOpacity activeOpacity={0.85} onPress={onScanPress}>
        <LinearGradient
          colors={['#8B5CF6', '#6366F1', '#4F46E5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Dismiss button */}
          <TouchableOpacity style={styles.dismiss} onPress={handleDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.textCol}>
              <Text style={styles.title}>{t('scanBanner.title')}</Text>
              <Text style={styles.subtitle}>{t('scanBanner.subtitle')}</Text>
            </View>
            <View style={styles.iconCol}>
              <View style={styles.iconCircle}>
                <Ionicons name="document-text" size={26} color="#fff" />
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Mark scan as completed — banner will never show again
 */
export async function markScanCompleted(): Promise<void> {
  await AsyncStorage.setItem(SCAN_COMPLETED_KEY, 'true');
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  gradient: {
    borderRadius: borderRadius.xl || 16,
    padding: 20,
    overflow: 'hidden',
  },
  dismiss: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textCol: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  iconCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
