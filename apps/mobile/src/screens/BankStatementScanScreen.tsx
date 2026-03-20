/**
 * Bank Statement Scan Screen — Premium 3D Animated UI
 * 
 * Pro-only feature for scanning bank statements to detect subscriptions.
 * Flow: Upload (3D floating doc) → Scanning (laser scan) → Review (animated cards)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  Easing,
  FadeInDown,
  FadeInUp,
  FadeIn,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Header, PrimaryButton } from '../components';
import { useTheme, borderRadius, type ThemeColors } from '../theme';
import { usePlanStore } from '../state';
import { useSubscriptionStore, createSubscription } from '../state/stores/subscriptionStore';
import { t } from '../i18n';
import { matchKnownService } from '../utils';
import { formatCurrency } from '../utils/currency';
import { useSettingsStore } from '../state';
import {
  pickBankStatement,
  pickFromGallery,
  extractSubscriptionsFromStatement,
  getRemainingScans,
} from '../services/BankStatementService';
import { analyzeStatement, type AnalyzedSubscription } from '../utils/statementAnalyzer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DOC_WIDTH = SCREEN_WIDTH * 0.52;
const DOC_HEIGHT = DOC_WIDTH * 1.35;

type ScanStep = 'upload' | 'scanning' | 'review';

// ─── 3D Floating Document Component ──────────────────────
function FloatingDocument({ colors, step }: { colors: ThemeColors; step: ScanStep }) {
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const translateY = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);
  const scanLineY = useSharedValue(0);

  useEffect(() => {
    // 3D tilt oscillation
    rotateX.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(5, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1, true
    );
    rotateY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(8, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, true
    );
    // Float up/down
    translateY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(8, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, true
    );
    // Glow pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500 }),
        withTiming(0.2, { duration: 1500 })
      ),
      -1, true
    );

    return () => {
      cancelAnimation(rotateX);
      cancelAnimation(rotateY);
      cancelAnimation(translateY);
      cancelAnimation(glowOpacity);
    };
  }, []);

  useEffect(() => {
    if (step === 'scanning') {
      // Scan line sweeps from top to bottom
      scanLineY.value = withRepeat(
        withTiming(DOC_HEIGHT - 4, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        -1, true
      );
    } else {
      cancelAnimation(scanLineY);
      scanLineY.value = 0;
    }
  }, [step]);

  const docStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
      { translateY: translateY.value },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
    opacity: step === 'scanning' ? 1 : 0,
  }));

  return (
    <View style={docStyles.container}>
      {/* Glow shadow */}
      <Animated.View style={[docStyles.glow, { backgroundColor: colors.primary }, glowStyle]} />

      {/* 3D Document card */}
      <Animated.View style={[docStyles.document, { backgroundColor: colors.bgCard, borderColor: colors.border }, docStyle]}>
        {/* Fake document lines */}
        <View style={[docStyles.docHeader, { backgroundColor: colors.primary }]} />
        <View style={docStyles.docLines}>
          {[1, 0.7, 0.9, 0.5, 0.8, 0.6, 0.75, 0.4].map((w, i) => (
            <View
              key={i}
              style={[
                docStyles.docLine,
                { width: `${w * 80}%`, backgroundColor: `${colors.textSecondary}20` },
              ]}
            />
          ))}
        </View>

        {/* Document icon */}
        <View style={[docStyles.docIcon, { backgroundColor: `${colors.primary}20` }]}>
          <Ionicons name="document-text" size={28} color={colors.primary} />
        </View>

        {/* Scan line (visible during scanning) */}
        <Animated.View style={[docStyles.scanLine, scanLineStyle]}>
          <LinearGradient
            colors={['transparent', `${colors.emerald}90`, `${colors.emerald}FF`, `${colors.emerald}90`, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={docStyles.scanLineGradient}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const docStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', height: DOC_HEIGHT + 40, marginBottom: 16 },
  glow: { position: 'absolute', width: DOC_WIDTH * 0.8, height: 20, borderRadius: 100, bottom: 0 },
  document: {
    width: DOC_WIDTH, height: DOC_HEIGHT, borderRadius: 12, borderWidth: 1,
    padding: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
  },
  docHeader: { height: 6, borderRadius: 3, width: '60%', marginBottom: 16, opacity: 0.8 },
  docLines: { gap: 8 },
  docLine: { height: 4, borderRadius: 2 },
  docIcon: { position: 'absolute', bottom: 16, right: 16, width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  scanLine: { position: 'absolute', left: 0, right: 0, top: 0, height: 4 },
  scanLineGradient: { width: '100%', height: 4 },
});

// ─── Progress Bar Component ──────────────────────────────
function ScanProgressBar({ colors, isActive }: { colors: ThemeColors; isActive: boolean }) {
  const progress = useSharedValue(0);
  const [statusIndex, setStatusIndex] = useState(0);

  const statuses = [
    { text: t('bankScan.statusReading'), icon: 'search-outline' as const },
    { text: t('bankScan.statusDetecting'), icon: 'bar-chart-outline' as const },
    { text: t('bankScan.statusAnalyzing'), icon: 'sparkles-outline' as const },
  ];

  useEffect(() => {
    if (isActive) {
      // Fake progress: 0→30% fast, 30→75% slow
      progress.value = withSequence(
        withTiming(0.3, { duration: 2000, easing: Easing.out(Easing.ease) }),
        withTiming(0.75, { duration: 8000, easing: Easing.inOut(Easing.ease) })
      );

      // Cycle status messages
      const interval = setInterval(() => {
        setStatusIndex((prev) => (prev + 1) % statuses.length);
      }, 3000);

      return () => clearInterval(interval);
    } else {
      progress.value = withTiming(1, { duration: 500 });
    }
  }, [isActive]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={progressStyles.container}>
      <View style={[progressStyles.track, { backgroundColor: `${colors.primary}20` }]}>
        <Animated.View style={[progressStyles.fill, { backgroundColor: colors.primary }, barStyle]} />
      </View>
      <Animated.View
        entering={FadeIn.duration(300)}
        key={statusIndex}
        style={progressStyles.statusRow}
      >
        <Ionicons
          name={statuses[statusIndex].icon}
          size={16}
          color={colors.primary}
          style={{ marginRight: 6 }}
        />
        <Text style={[progressStyles.status, { color: colors.textSecondary }]}>
          {statuses[statusIndex].text}
        </Text>
      </Animated.View>
    </View>
  );
}

const progressStyles = StyleSheet.create({
  container: { width: '100%', paddingHorizontal: 32, marginTop: 24 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  status: { fontSize: 14, textAlign: 'center' },
});

// ─── Format Badges ───────────────────────────────────────
function FormatBadge({ label, icon, delay, colors }: { label: string; icon: string; delay: number; colors: ThemeColors }) {
  return (
    <Animated.View
      entering={FadeInUp.delay(delay).springify()}
      style={[badgeStyles.badge, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}
    >
      <Text style={badgeStyles.icon}>{icon}</Text>
      <Text style={[badgeStyles.label, { color: colors.text }]}>{label}</Text>
    </Animated.View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, gap: 6 },
  icon: { fontSize: 16 },
  label: { fontSize: 13, fontWeight: '600' },
});

// ─── Status Badge for Review ─────────────────────────────
function StatusBadge({ status, label, colors }: { status: string; label: string; colors: ThemeColors }) {
  const bgColor = status === 'recurring' ? `${colors.emerald}20` : status === 'new' ? `${colors.amber}20` : `${colors.textSecondary}20`;
  const textColor = status === 'recurring' ? colors.emerald : status === 'new' ? colors.amber : colors.textSecondary;
  const icon = status === 'recurring' ? '🔁' : status === 'new' ? '🆕' : '✅';

  if (!label) return null;

  return (
    <View style={[statusBadgeStyles.container, { backgroundColor: bgColor }]}>
      <Text style={statusBadgeStyles.icon}>{icon}</Text>
      <Text style={[statusBadgeStyles.label, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const statusBadgeStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 4 },
  icon: { fontSize: 10 },
  label: { fontSize: 11, fontWeight: '600' },
});

// ─── Main Screen ─────────────────────────────────────────
export function BankStatementScanScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { isPro } = usePlanStore();
  const { addSubscription, subscriptions } = useSubscriptionStore();
  const currency = useSettingsStore((s) => s.app.currency);
  
  const [step, setStep] = useState<ScanStep>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [analyzedSubs, setAnalyzedSubs] = useState<AnalyzedSubscription[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [remaining, setRemaining] = useState({ today: 5, month: 30 });
  const [tipsExpanded, setTipsExpanded] = useState(false);

  // Load remaining scans
  useEffect(() => {
    getRemainingScans().then(setRemaining);
  }, [step]);

  // Pro gate
  if (!isPro()) {
    return (
      <Screen>
        <Header title={t('bankScan.title')} />
        <View style={styles.proGate}>
          <Ionicons name="lock-closed" size={64} color={colors.primary} />
          <Text style={styles.proTitle}>{t('bankScan.proTitle')}</Text>
          <Text style={styles.proSubtitle}>{t('bankScan.proSubtitle')}</Text>
          <PrimaryButton
            title={t('settings.upgradeToPro')}
            onPress={() => navigation.navigate('Paywall')}
          />
        </View>
      </Screen>
    );
  }

  const handlePickDocument = async () => {
    const result = await pickBankStatement();
    
    if (!result.success) {
      if (result.error !== 'User cancelled') {
        Alert.alert(t('common.error'), result.error || 'Failed to pick document');
      }
      return;
    }

    setFileName(result.name || 'Document');
    setStep('scanning');
    setIsProcessing(true);

    try {
      const extraction = await extractSubscriptionsFromStatement(
        result.uri!,
        result.mimeType || 'application/pdf'
      );

      if (!extraction.success) {
        Alert.alert(t('bankScan.extractionFailed'), extraction.error || 'Could not extract subscriptions');
        setStep('upload');
        return;
      }

      // Post-process with statement analyzer
      const existingSubs = subscriptions.map((s) => ({ name: s.name, amount: s.amount }));
      const analyzed = analyzeStatement(extraction.subscriptions, existingSubs);
      
      setAnalyzedSubs(analyzed);
      // Auto-select based on analyzer recommendation
      const autoSelected = new Set(
        analyzed
          .map((s, i) => (s.autoSelected ? i : -1))
          .filter((i) => i >= 0)
      );
      setSelectedIds(autoSelected);
      setStep('review');
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickFromGallery = async () => {
    const result = await pickFromGallery();
    
    if (!result.success) {
      if (result.error !== 'User cancelled') {
        Alert.alert(t('common.error'), result.error || 'Failed to pick image');
      }
      return;
    }

    setFileName(result.name || 'Image');
    setStep('scanning');
    setIsProcessing(true);

    try {
      const extraction = await extractSubscriptionsFromStatement(
        result.uri!,
        result.mimeType || 'image/jpeg'
      );

      if (!extraction.success) {
        Alert.alert(t('bankScan.extractionFailed'), extraction.error || 'Could not extract subscriptions');
        setStep('upload');
        return;
      }

      const existingSubs = subscriptions.map((s) => ({ name: s.name, amount: s.amount }));
      const analyzed = analyzeStatement(extraction.subscriptions, existingSubs);
      
      setAnalyzedSubs(analyzed);
      const autoSelected = new Set(
        analyzed
          .map((s, i) => (s.autoSelected ? i : -1))
          .filter((i) => i >= 0)
      );
      setSelectedIds(autoSelected);
      setStep('review');
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelection = (index: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIds(newSelected);
  };

  const handleAddSelected = () => {
    const toAdd = analyzedSubs.filter((_, i) => selectedIds.has(i));
    
    toAdd.forEach((sub) => {
      const matched = matchKnownService(sub.name);
      
      const newSub = createSubscription({
        name: matched.name,
        amount: sub.amount,
        currency: sub.currency,
        cycle: sub.cycle,
        nextBillingDate: sub.lastChargeDate 
          ? calculateNextBillingDate(sub.lastChargeDate, sub.cycle)
          : new Date().toISOString(),
        category: matched.category,
        iconKey: matched.icon,
        colorKey: matched.color,
        logoUrl: matched.logoUrl || undefined,
      });
      addSubscription(newSub);
    });

    Alert.alert(
      t('common.success'),
      t('bankScan.addedSuccess', { count: toAdd.length }),
      [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
    );
  };

  // ─── Upload Step ───────────────────────────────────────
  const renderUploadStep = () => (
    <View style={styles.stepContainer}>
      <FloatingDocument colors={colors} step={step} />

      <Animated.Text entering={FadeInDown.delay(200)} style={styles.mainTitle}>
        {t('bankScan.uploadTitle')}
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(300)} style={styles.mainSubtitle}>
        {t('bankScan.uploadSubtitle')}
      </Animated.Text>

      {/* Format badges */}
      <Animated.View entering={FadeInDown.delay(400)} style={styles.formatRow}>
        <FormatBadge label="PDF" icon="📄" delay={500} colors={colors} />
        <FormatBadge label="PNG" icon="🖼️" delay={600} colors={colors} />
        <FormatBadge label="JPG" icon="📸" delay={700} colors={colors} />
      </Animated.View>

      {/* Tips Section */}
      <Animated.View entering={FadeInDown.delay(500)} style={styles.tipsSection}>
        <TouchableOpacity
          style={[styles.tipsToggle, { borderColor: colors.border }]}
          onPress={() => setTipsExpanded(!tipsExpanded)}
        >
          <Ionicons name="bulb-outline" size={18} color={colors.amber} />
          <Text style={[styles.tipsToggleText, { color: colors.text }]}>
            {t('bankScan.bestPractices')}
          </Text>
          <Ionicons
            name={tipsExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
        {tipsExpanded && (
          <Animated.View entering={FadeInDown.duration(200)} style={[styles.tipsContent, { backgroundColor: `${colors.amber}08`, borderColor: `${colors.amber}20` }]}>
            <Text style={[styles.tipItem, { color: colors.textSecondary }]}>
              • {t('bankScan.tip1')}
            </Text>
            <Text style={[styles.tipItem, { color: colors.textSecondary }]}>
              • {t('bankScan.tip2')}
            </Text>
            <Text style={[styles.tipItem, { color: colors.textSecondary }]}>
              • {t('bankScan.tip3')}
            </Text>
            <Text style={[styles.tipItem, { color: colors.textSecondary }]}>
              • {t('bankScan.tip4')}
            </Text>
          </Animated.View>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(600)} style={styles.uploadAction}>
        <PrimaryButton title={t('bankScan.chooseFile')} onPress={handlePickDocument} />
        <TouchableOpacity
          style={[styles.galleryButton, { borderColor: colors.border }]}
          onPress={handlePickFromGallery}
        >
          <Ionicons name="images-outline" size={20} color={colors.primary} />
          <Text style={[styles.galleryButtonText, { color: colors.primary }]}>
            {t('bankScan.chooseFromGallery')}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Remaining scans counter */}
      <Animated.Text entering={FadeIn.delay(700)} style={[styles.remainingText, { color: colors.textMuted }]}>
        {t('bankScan.remainingScans', { count: remaining.today })}
      </Animated.Text>
    </View>
  );

  // ─── Scanning Step ─────────────────────────────────────
  const renderScanningStep = () => (
    <View style={styles.stepContainer}>
      <FloatingDocument colors={colors} step={step} />

      <Animated.Text entering={FadeInDown.delay(200)} style={styles.mainTitle}>
        {t('bankScan.analyzing')}
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(300)} style={[styles.mainSubtitle, { marginBottom: 0 }]}>
        {fileName}
      </Animated.Text>

      <ScanProgressBar colors={colors} isActive={isProcessing} />
    </View>
  );

  // ─── Review Step ───────────────────────────────────────
  const renderReviewStep = () => (
    <View style={styles.reviewContainer}>
      <Animated.View entering={FadeInDown.delay(100)}>
        <Text style={styles.reviewTitle}>
          ✨ {t('bankScan.foundSubscriptions', { count: analyzedSubs.length })}
        </Text>
        <Text style={styles.reviewSubtitle}>{t('bankScan.selectToAdd')}</Text>
      </Animated.View>

      <FlatList
        data={analyzedSubs}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(150 + index * 80).springify()}>
            <TouchableOpacity
              style={[
                styles.subItem,
                selectedIds.has(index) && styles.subItemSelected,
                item.status === 'tracked' && styles.subItemTracked,
              ]}
              onPress={() => toggleSelection(index)}
              activeOpacity={0.7}
            >
              <View style={styles.subCheckbox}>
                {selectedIds.has(index) ? (
                  <Ionicons name="checkbox" size={24} color={colors.primary} />
                ) : (
                  <Ionicons name="square-outline" size={24} color={colors.textSecondary} />
                )}
              </View>
              <View style={styles.subInfo}>
                <Text style={styles.subName}>{item.name}</Text>
                {item.merchantName && (
                  <Text style={styles.subMerchant}>{item.merchantName}</Text>
                )}
                {/* Status badge */}
                <View style={styles.subBadgeRow}>
                  <StatusBadge status={item.status} label={item.statusLabel} colors={colors} />
                </View>
              </View>
              <View style={styles.subAmountCol}>
                <Text style={styles.subPrice}>
                  {formatCurrency(item.amount, item.currency || currency)}
                </Text>
                <Text style={styles.subCycle}>/{item.cycle}</Text>
              </View>
              <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(item.confidence, colors) }]}>
                <Text style={styles.confidenceText}>{Math.round(item.confidence * 100)}%</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <Animated.View entering={FadeInUp.delay(400)} style={styles.reviewActions}>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={() => { setStep('upload'); setAnalyzedSubs([]); }}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
            {t('bankScan.scanAnother')}
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            title={t('bankScan.addSelected', { count: selectedIds.size })}
            onPress={handleAddSelected}
            disabled={selectedIds.size === 0}
          />
        </View>
      </Animated.View>
    </View>
  );

  return (
    <Screen>
      <Header title={t('bankScan.title')} />
      {step === 'upload' && renderUploadStep()}
      {step === 'scanning' && renderScanningStep()}
      {step === 'review' && renderReviewStep()}
    </Screen>
  );
}

// ─── Helpers ─────────────────────────────────────────────
function calculateNextBillingDate(lastDate: string, cycle: string): string {
  const date = new Date(lastDate);
  switch (cycle) {
    case 'weekly': date.setDate(date.getDate() + 7); break;
    case 'monthly': date.setMonth(date.getMonth() + 1); break;
    case 'quarterly': date.setMonth(date.getMonth() + 3); break;
    case 'yearly': date.setFullYear(date.getFullYear() + 1); break;
  }
  return date.toISOString();
}

function getConfidenceColor(confidence: number, themeColors: ThemeColors): string {
  if (confidence >= 0.9) return themeColors.emerald;
  if (confidence >= 0.7) return themeColors.amber;
  return themeColors.red;
}

// ─── Styles ──────────────────────────────────────────────
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  // Pro gate
  proGate: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  proTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 16 },
  proSubtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginVertical: 16, lineHeight: 24 },

  // Steps
  stepContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  mainTitle: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.5 },
  mainSubtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 20, lineHeight: 22 },

  // Format badges
  formatRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },

  // Tips
  tipsSection: { width: '100%', marginBottom: 20 },
  tipsToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: borderRadius.lg,
    borderWidth: 1, gap: 8,
  },
  tipsToggleText: { fontSize: 14, fontWeight: '600', flex: 1 },
  tipsContent: { marginTop: 8, padding: 14, borderRadius: borderRadius.lg, borderWidth: 1, gap: 8 },
  tipItem: { fontSize: 13, lineHeight: 20 },

  // Upload action
  uploadAction: { width: '100%', gap: 12 },
  galleryButton: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    paddingVertical: 14, borderRadius: borderRadius.lg,
    borderWidth: 1, gap: 8,
  },
  galleryButtonText: { fontSize: 16, fontWeight: '600' as const },
  remainingText: { fontSize: 12, marginTop: 12 },

  // Review
  reviewContainer: { flex: 1, padding: 16 },
  reviewTitle: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  reviewSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 16, marginTop: 4 },
  listContent: { paddingBottom: 24 },
  subItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: borderRadius.lg,
    padding: 14, marginBottom: 10, borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  subItemSelected: { borderColor: colors.primary, backgroundColor: `${colors.primary}08` },
  subItemTracked: { opacity: 0.55 },
  subCheckbox: { marginRight: 12 },
  subInfo: { flex: 1, gap: 2 },
  subName: { fontSize: 16, fontWeight: '700', color: colors.text },
  subMerchant: { fontSize: 12, color: colors.textSecondary },
  subBadgeRow: { flexDirection: 'row', marginTop: 4, gap: 6 },
  subAmountCol: { alignItems: 'flex-end', marginRight: 10 },
  subPrice: { fontSize: 16, fontWeight: '700', color: colors.text },
  subCycle: { fontSize: 12, color: colors.textSecondary },
  confidenceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.sm },
  confidenceText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  reviewActions: { flexDirection: 'row', gap: 12, paddingTop: 12, paddingBottom: 8 },
  secondaryButton: {
    flex: 0.8, paddingVertical: 14, borderRadius: borderRadius.lg,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '600' },
});
