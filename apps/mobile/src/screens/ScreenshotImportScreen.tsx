/**
 * ScreenshotImportScreen — "Magic Import"
 *
 * Lets users take a photo or pick a screenshot of a subscription page/email,
 * then uses GPT-4o-mini vision to extract the subscription details automatically.
 *
 * States: idle → image_selected → analyzing → result (success | failure)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  ZoomIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Header, PrimaryButton } from '../components';
import { useTheme, borderRadius, type ThemeColors } from '../theme';
import { t } from '../i18n';
import {
  captureFromCamera,
  pickFromGallery,
  extractFromScreenshot,
  type ScreenshotImportResult,
} from '../services/ScreenshotImportService';
import { matchKnownService, findDuplicates, getCurrencySymbol } from '../utils';
import { useSubscriptionStore } from '../state';
import { logger } from '../services/LoggerService';
import { onSuccessfulImport } from '../services/RatingService';

type ImportStep = 'idle' | 'image_selected' | 'analyzing' | 'result_success' | 'result_failure';

interface ScreenshotImportScreenProps {
  navigation: any;
}

export function ScreenshotImportScreen({ navigation }: ScreenshotImportScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { subscriptions } = useSubscriptionStore();

  const [step, setStep] = useState<ImportStep>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [result, setResult] = useState<ScreenshotImportResult['data'] | null>(null);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);

  // ─── Handlers ───────────────────────────────────────────

  const handleTakePhoto = async () => {
    const picked = await captureFromCamera();
    if (!picked.success) {
      if (picked.error !== 'User cancelled') {
        Alert.alert(t('common.error'), picked.error || 'Failed to open camera');
      }
      return;
    }
    setImageUri(picked.uri!);
    setImageMimeType(picked.mimeType || 'image/jpeg');
    setStep('image_selected');
  };

  const handleChoosePhoto = async () => {
    const picked = await pickFromGallery();
    if (!picked.success) {
      if (picked.error !== 'User cancelled') {
        Alert.alert(t('common.error'), picked.error || 'Failed to open gallery');
      }
      return;
    }
    setImageUri(picked.uri!);
    setImageMimeType(picked.mimeType || 'image/jpeg');
    setStep('image_selected');
  };

  const handleAnalyze = async () => {
    if (!imageUri) return;
    setStep('analyzing');

    try {
      const extraction = await extractFromScreenshot(imageUri, imageMimeType);

      if (extraction.success && extraction.data) {
        setResult(extraction.data);
        setStep('result_success');
      } else {
        setStep('result_failure');
      }
    } catch (error: any) {
      logger.error('ScreenshotImportScreen', 'Analysis error:', error);
      setStep('result_failure');
    }
  };

  const handleConfirmAdd = () => {
    if (!result) return;

    const matched = matchKnownService(result.name);

    navigation.navigate('AddSubscription', {
      prefillData: {
        name: matched.name !== result.name ? matched.name : result.name,
        amount: result.amount.toString(),
        cycle: result.cycle,
        currency: result.currency,
        category: matched.category,
        iconKey: matched.icon,
        colorKey: matched.color,
        logoUrl: matched.logoUrl || undefined,
      },
    });

    // Fire-and-forget: trigger rating prompt after successful import
    onSuccessfulImport().catch(() => {});
  };

  const handleReset = () => {
    setStep('idle');
    setImageUri(null);
    setResult(null);
    setDuplicateDismissed(false);
  };

  // ─── Step Renderers ─────────────────────────────────────

  const renderIdle = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Gradient header illustration */}
      <LinearGradient
        colors={[`${colors.primary}20`, `${colors.primary}05`]}
        style={styles.heroGradient}
      >
        <Animated.View entering={ZoomIn.duration(400)} style={styles.heroIconWrap}>
          <LinearGradient
            colors={[colors.primary, `${colors.primary}BB`]}
            style={styles.heroIconGradient}
          >
            <Ionicons name="camera" size={40} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>
      </LinearGradient>

      <Animated.Text entering={FadeInDown.delay(100)} style={[styles.title, { color: colors.text }]}>
        {t('screenshotImport.title')}
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(180)} style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('screenshotImport.subtitle')}
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(260)} style={styles.buttonGroup}>
        {/* Take Photo */}
        <TouchableOpacity
          style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
          onPress={handleTakePhoto}
          activeOpacity={0.85}
        >
          <Ionicons name="camera" size={22} color="#FFFFFF" />
          <Text style={styles.primaryActionText}>{t('screenshotImport.takePhoto')}</Text>
        </TouchableOpacity>

        {/* Choose from Gallery */}
        <TouchableOpacity
          style={[styles.secondaryActionBtn, { borderColor: colors.border, backgroundColor: colors.bgCard }]}
          onPress={handleChoosePhoto}
          activeOpacity={0.8}
        >
          <Ionicons name="images-outline" size={22} color={colors.primary} />
          <Text style={[styles.secondaryActionText, { color: colors.primary }]}>
            {t('screenshotImport.choosePhoto')}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Tips */}
      <Animated.View entering={FadeIn.delay(400)} style={[styles.tipsCard, { backgroundColor: `${colors.amber}10`, borderColor: `${colors.amber}30` }]}>
        <View style={styles.tipsRow}>
          <Ionicons name="bulb-outline" size={18} color={colors.amber} />
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            Best results: Netflix billing page, Spotify confirmation email, Apple subscription receipt
          </Text>
        </View>
      </Animated.View>
    </ScrollView>
  );

  const renderImageSelected = () => (
    <View style={styles.imageSelectedContainer}>
      <Animated.Text entering={FadeInDown.delay(50)} style={[styles.title, { color: colors.text }]}>
        Review Screenshot
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(100)} style={[styles.subtitle, { color: colors.textSecondary }]}>
        Make sure the subscription name and price are visible
      </Animated.Text>

      {/* Image preview */}
      {imageUri && (
        <Animated.View entering={FadeIn.delay(150)} style={styles.previewContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.previewImage}
            resizeMode="cover"
          />
        </Animated.View>
      )}

      <Animated.View entering={FadeInUp.delay(200)} style={styles.imageActionGroup}>
        <PrimaryButton
          title={t('screenshotImport.analyze')}
          onPress={handleAnalyze}
        />
        <TouchableOpacity style={styles.retakeBtn} onPress={handleReset}>
          <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.retakeBtnText, { color: colors.textSecondary }]}>
            Choose different image
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  const renderAnalyzing = () => (
    <View style={styles.centerContainer}>
      <Animated.View entering={ZoomIn.duration(400)} style={[styles.analyzeIconWrap, { backgroundColor: `${colors.primary}15` }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Animated.View>

      <Animated.Text entering={FadeInDown.delay(200)} style={[styles.title, { color: colors.text }]}>
        {t('screenshotImport.analyzing')}
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(300)} style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('screenshotImport.analyzingHint')}
      </Animated.Text>
    </View>
  );

  const renderResultSuccess = () => {
    if (!result) return null;

    const confidencePercent = Math.round(result.confidence * 100);
    const confidenceColor =
      result.confidence >= 0.85 ? colors.emerald
      : result.confidence >= 0.65 ? colors.amber
      : colors.red;

    const duplicateMatches = findDuplicates(result.name, subscriptions).filter(
      (m) => m.matchScore >= 70
    );
    const bestDuplicate = duplicateMatches[0] ?? null;

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success icon */}
        <Animated.View entering={ZoomIn.duration(400)} style={styles.successIconWrap}>
          <LinearGradient
            colors={[colors.emerald, `${colors.emerald}AA`]}
            style={styles.successIconGradient}
          >
            <Ionicons name="checkmark" size={36} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(100)} style={[styles.title, { color: colors.text }]}>
          {t('screenshotImport.found')}
        </Animated.Text>

        {/* Result card */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={[styles.resultCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
        >
          {/* Service name */}
          <View style={styles.resultRow}>
            <View style={[styles.resultIconWrap, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="logo-usd" size={20} color={colors.primary} />
            </View>
            <View style={styles.resultTextWrap}>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Service</Text>
              <Text style={[styles.resultValue, { color: colors.text }]}>{result.name}</Text>
            </View>
          </View>

          <View style={[styles.resultDivider, { backgroundColor: colors.border }]} />

          {/* Price */}
          <View style={styles.resultRow}>
            <View style={[styles.resultIconWrap, { backgroundColor: `${colors.emerald}15` }]}>
              <Ionicons name="card-outline" size={20} color={colors.emerald} />
            </View>
            <View style={styles.resultTextWrap}>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Price</Text>
              <Text style={[styles.resultValue, { color: colors.text }]}>
                {result.currency} {result.amount.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={[styles.resultDivider, { backgroundColor: colors.border }]} />

          {/* Billing cycle */}
          <View style={styles.resultRow}>
            <View style={[styles.resultIconWrap, { backgroundColor: `${colors.amber}15` }]}>
              <Ionicons name="repeat-outline" size={20} color={colors.amber} />
            </View>
            <View style={styles.resultTextWrap}>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Billing Cycle</Text>
              <Text style={[styles.resultValue, { color: colors.text }]}>
                {result.cycle.charAt(0).toUpperCase() + result.cycle.slice(1)}
              </Text>
            </View>
          </View>

          {/* Confidence badge */}
          <View style={[styles.confidenceRow, { backgroundColor: `${confidenceColor}12` }]}>
            <Ionicons name="shield-checkmark-outline" size={14} color={confidenceColor} />
            <Text style={[styles.confidenceText, { color: confidenceColor }]}>
              {confidencePercent}% confidence
            </Text>
          </View>
        </Animated.View>

        {/* Duplicate detection warning */}
        {bestDuplicate && !duplicateDismissed && (() => {
          const sub = bestDuplicate.subscription;
          const addedDate = new Date(sub.createdAt).toLocaleDateString();
          const cycleKey = `subscription.per${sub.cycle.charAt(0).toUpperCase() + sub.cycle.slice(1)}`;
          const cycleLabel = t(cycleKey as any, { defaultValue: sub.cycle });
          return (
            <Animated.View entering={FadeInDown.delay(300)} style={styles.duplicateBanner}>
              <View style={styles.duplicateBannerHeader}>
                <Ionicons name="warning-outline" size={16} color="#92400E" />
                <Text style={styles.duplicatePossibleLabel}>
                  {t('duplicateDetection.possibleDuplicate')}
                </Text>
              </View>
              <Text style={styles.duplicateWarningText}>
                {t('duplicateDetection.warning', { name: sub.name })}
              </Text>
              <Text style={styles.duplicateDetailText}>
                {t('duplicateDetection.warningDetail', {
                  price: `${getCurrencySymbol(sub.currency)}${sub.amount.toFixed(2)}`,
                  cycle: cycleLabel,
                  date: addedDate,
                })}
              </Text>
              <View style={styles.duplicateBannerActions}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('SubscriptionDetail', { subscriptionId: sub.id })}
                  style={styles.duplicateViewBtn}
                >
                  <Text style={styles.duplicateViewBtnText}>
                    {t('duplicateDetection.viewExisting')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDuplicateDismissed(true)}
                  style={styles.duplicateAddAnywayBtn}
                >
                  <Text style={styles.duplicateAddAnywayText}>
                    {t('duplicateDetection.addAnyway')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          );
        })()}

        <Animated.View entering={FadeInUp.delay(350)} style={styles.resultActions}>
          <PrimaryButton
            title={t('screenshotImport.confirmAdd')}
            onPress={handleConfirmAdd}
          />
          <TouchableOpacity style={styles.retakeBtn} onPress={handleReset}>
            <Text style={[styles.retakeBtnText, { color: colors.textSecondary }]}>
              {t('screenshotImport.tryAgain')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    );
  };

  const renderResultFailure = () => (
    <View style={styles.centerContainer}>
      <Animated.View entering={ZoomIn.duration(400)} style={[styles.failureIconWrap, { backgroundColor: `${colors.red}15` }]}>
        <Ionicons name="alert-circle-outline" size={52} color={colors.red} />
      </Animated.View>

      <Animated.Text entering={FadeInDown.delay(150)} style={[styles.title, { color: colors.text }]}>
        {t('screenshotImport.notFound')}
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(220)} style={[styles.subtitle, { color: colors.textSecondary }]}>
        Try a clearer screenshot showing the subscription name and price
      </Animated.Text>

      <Animated.View entering={FadeInUp.delay(320)} style={{ width: '100%', marginTop: 8 }}>
        <PrimaryButton title={t('screenshotImport.tryAgain')} onPress={handleReset} />
      </Animated.View>
    </View>
  );

  return (
    <Screen>
      <Header title={t('screenshotImport.title')} showBack />
      {step === 'idle' && renderIdle()}
      {step === 'image_selected' && renderImageSelected()}
      {step === 'analyzing' && renderAnalyzing()}
      {step === 'result_success' && renderResultSuccess()}
      {step === 'result_failure' && renderResultFailure()}
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },

  // Hero
  heroGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  heroIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },

  // Text
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },

  // Idle buttons
  buttonGroup: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: borderRadius.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Tips card
  tipsCard: {
    width: '100%',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: 14,
  },
  tipsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },

  // Image selected
  imageSelectedContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  previewContainer: {
    width: '100%',
    height: 260,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imageActionGroup: {
    gap: 12,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  retakeBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Analyzing / centered states
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  analyzeIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },

  // Success
  successIconWrap: {
    marginTop: 16,
    marginBottom: 20,
  },
  successIconGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.emerald,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  resultCard: {
    width: '100%',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 14,
  },
  resultIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTextWrap: {
    flex: 1,
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  resultValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  resultDivider: {
    height: 1,
    opacity: 0.5,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultActions: {
    width: '100%',
    gap: 12,
  },

  // Failure
  failureIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  // Duplicate detection banner
  duplicateBanner: {
    width: '100%',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    padding: 14,
    marginBottom: 16,
  },
  duplicateBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  duplicatePossibleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  duplicateWarningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78350F',
    marginBottom: 4,
  },
  duplicateDetailText: {
    fontSize: 12,
    color: '#92400E',
    marginBottom: 12,
  },
  duplicateBannerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  duplicateViewBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    alignItems: 'center',
  },
  duplicateViewBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  duplicateAddAnywayBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  duplicateAddAnywayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
});
