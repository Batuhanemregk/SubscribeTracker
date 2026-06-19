/**
 * OnboardingScreen - First launch experience
 * 3-slide carousel with plan selection
 */
import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  FlatList, 
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { useTheme, borderRadius, type ThemeColors } from '../theme';
import { useSettingsStore, usePlanStore } from '../state';
import { t } from '../i18n';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  gradient: readonly [string, string];
}

type CarouselItem = OnboardingSlide | { id: 'theme' };



interface SlideProps {
  item: OnboardingSlide;
  index: number;
  scrollX: SharedValue<number>;
}

function Slide({ item, index, scrollX }: SlideProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.8, 1, 0.8],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.5, 1, 0.5],
      Extrapolation.CLAMP
    );
    return { transform: [{ scale }], opacity };
  });

  return (
    <View style={styles.slide}>
      <Animated.View style={[styles.slideContent, animatedStyle]}>
        {/* Icon with gradient background */}
        <LinearGradient
          colors={item.gradient}
          style={styles.iconContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={item.icon as any} size={64} color="#FFFFFF" />
        </LinearGradient>

        {/* Text */}
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </Animated.View>
    </View>
  );
}

function Pagination({ currentIndex, total }: { currentIndex: number; total: number }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.pagination}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === currentIndex && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );
}

const THEME_OPTIONS = [
  { key: 'dark', icon: 'moon' },
  { key: 'light', icon: 'sunny' },
  { key: 'system', icon: 'phone-portrait' },
] as const;

// Mini app mockup that recolors with the live theme so users see the look before committing.
function ThemePreview({ colors }: { colors: ThemeColors }) {
  return (
    <View style={[previewStyles.frame, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={previewStyles.topRow}>
        <View>
          <View style={[previewStyles.lineSm, { backgroundColor: colors.textMuted, width: 44 }]} />
          <View style={[previewStyles.lineMd, { backgroundColor: colors.text, width: 70, marginTop: 5 }]} />
        </View>
        <View style={[previewStyles.avatar, { backgroundColor: colors.bgElevated }]} />
      </View>
      <View style={[previewStyles.statCard, { backgroundColor: colors.primary }]}>
        <View style={[previewStyles.lineSm, { backgroundColor: 'rgba(255,255,255,0.6)', width: 40 }]} />
        <View style={[previewStyles.lineLg, { backgroundColor: '#FFFFFF', width: 86, marginTop: 7 }]} />
      </View>
      {[colors.pink, colors.cyan].map((c, i) => (
        <View key={i} style={[previewStyles.subRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[previewStyles.logo, { backgroundColor: c }]} />
          <View style={{ flex: 1 }}>
            <View style={[previewStyles.lineMd, { backgroundColor: colors.text, width: 60 }]} />
            <View style={[previewStyles.lineSm, { backgroundColor: colors.textMuted, width: 38, marginTop: 5 }]} />
          </View>
          <View style={[previewStyles.lineMd, { backgroundColor: colors.text, width: 28 }]} />
        </View>
      ))}
    </View>
  );
}

// Final onboarding slide: a live theme chooser. Tapping an option applies the theme
// instantly app-wide (via settings store -> ThemeProvider), and the preview above updates.
function ThemeSlide({ index, scrollX }: { index: number; scrollX: SharedValue<number> }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { app, setTheme } = useSettingsStore();
  const current = app.theme;
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const scale = interpolate(scrollX.value, inputRange, [0.8, 1, 0.8], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], Extrapolation.CLAMP);
    return { transform: [{ scale }], opacity };
  });
  const labels: Record<string, string> = {
    dark: t('settings.dark'),
    light: t('settings.light'),
    system: t('settings.system'),
  };
  return (
    <View style={styles.slide}>
      <Animated.View style={[styles.slideContent, animatedStyle, { width: '100%' }]}>
        <ThemePreview colors={colors} />
        <Text style={[styles.title, { marginTop: 28 }]}>{t('onboarding.themeTitle')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.themeSubtitle')}</Text>
        <View style={previewStyles.optionsRow}>
          {THEME_OPTIONS.map(({ key, icon }) => {
            const selected = current === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setTheme(key)}
                activeOpacity={0.8}
                style={[
                  previewStyles.option,
                  {
                    backgroundColor: selected ? `${colors.primary}15` : colors.bgCard,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons name={icon as any} size={22} color={selected ? colors.primary : colors.textSecondary} />
                <Text style={[previewStyles.optionLabel, { color: selected ? colors.primary : colors.textSecondary }]}>
                  {labels[key]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

const previewStyles = StyleSheet.create({
  frame: { width: width * 0.56, alignSelf: 'center', borderRadius: 22, borderWidth: 1, padding: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 26, height: 26, borderRadius: 13 },
  statCard: { borderRadius: 14, padding: 12, marginBottom: 12 },
  subRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 10, marginBottom: 8, gap: 10 },
  logo: { width: 26, height: 26, borderRadius: 8 },
  lineSm: { height: 5, borderRadius: 3 },
  lineMd: { height: 7, borderRadius: 4 },
  lineLg: { height: 12, borderRadius: 4 },
  optionsRow: { flexDirection: 'row', gap: 10, marginTop: 24, paddingHorizontal: 4 },
  option: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: borderRadius.lg, borderWidth: 1, gap: 6 },
  optionLabel: { fontSize: 13, fontWeight: '600' },
});

export function OnboardingScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [currentIndex, setCurrentIndex] = useState(0);

  const SLIDES: OnboardingSlide[] = [
    {
      id: '1',
      icon: 'wallet',
      iconColor: colors.primary,
      title: t('onboarding.slide1Title'),
      subtitle: t('onboarding.slide1Subtitle'),
      gradient: [colors.primary, colors.pink] as const,
    },
    {
      id: '2',
      icon: 'document-text',
      iconColor: colors.cyan,
      title: t('onboarding.slide2Title'),
      subtitle: t('onboarding.slide2Subtitle'),
      gradient: [colors.cyan, colors.primary] as const,
    },
    {
      id: '3',
      icon: 'notifications',
      iconColor: colors.amber,
      title: t('onboarding.slide3Title'),
      subtitle: t('onboarding.slide3Subtitle'),
      gradient: [colors.amber, colors.pink] as const,
    },
  ];

  // The live theme chooser is the final slide before the Get Started CTA.
  const DATA: CarouselItem[] = [...SLIDES, { id: 'theme' }];

  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);
  const { setHasSeenOnboarding } = useSettingsStore();
  const { isPro } = usePlanStore();

  // Finish onboarding. Users who already own Premium (e.g. it was restored from
  // their Apple ID after a reinstall, which wipes local "seen onboarding" state)
  // must NOT be pitched the paywall — send them straight into the app.
  const finishOnboarding = () => {
    setHasSeenOnboarding(true);
    if (isPro()) {
      navigation.replace('MainTabs');
    } else {
      navigation.replace('Paywall', { fromOnboarding: true });
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollX.value = event.nativeEvent.contentOffset.x;
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < DATA.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const handleSkip = () => {
    flatListRef.current?.scrollToIndex({ index: DATA.length - 1, animated: true });
  };

  const handleGetStarted = () => {
    // Route through the paywall (unless already Premium); user can dismiss to continue free.
    finishOnboarding();
  };

  const handleGoPro = () => {
    finishOnboarding();
  };

  const isLastSlide = currentIndex === DATA.length - 1;

  return (
    <View style={styles.container}>
      {/* Skip Button */}
      {!isLastSlide && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={DATA}
        renderItem={({ item, index }) =>
          item.id === 'theme' ? (
            <ThemeSlide index={index} scrollX={scrollX} />
          ) : (
            <Slide item={item as OnboardingSlide} index={index} scrollX={scrollX} />
          )
        }
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      />

      {/* Pagination */}
      <Pagination currentIndex={currentIndex} total={DATA.length} />

      {/* Action Buttons */}
      <View style={styles.actions}>
        {isLastSlide ? (
          <>
            {/* Final slide - Plan selection */}
            <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted}>
              <LinearGradient
                colors={[colors.primary, colors.pink]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.primaryButtonText}>{t('onboarding.getStarted')}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleGoPro}>
              <View style={styles.proButtonContent}>
                <Ionicons name="star" size={16} color={colors.amber} />
                <Text style={styles.secondaryButtonText}>{t('paywall.title')}</Text>
              </View>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <LinearGradient
              colors={[colors.primary, colors.pink]}
              style={styles.nextButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="arrow-forward" size={24} color={colors.text} />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '500',
  },
  slide: {
    width,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  slideContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 50,
  },
  primaryButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: 12,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.amber,
  },
  proButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.amber,
    marginLeft: 8,
  },
  nextButton: {
    alignSelf: 'center',
    borderRadius: 30,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
