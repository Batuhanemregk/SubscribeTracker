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
import { useSettingsStore } from '../state';
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

  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);
  const { setHasSeenOnboarding } = useSettingsStore();

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollX.value = event.nativeEvent.contentOffset.x;
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const handleSkip = () => {
    flatListRef.current?.scrollToIndex({ index: SLIDES.length - 1, animated: true });
  };

  const handleGetStarted = () => {
    setHasSeenOnboarding(true);
    // Route through paywall — user can dismiss to continue free
    navigation.replace('Paywall', { fromOnboarding: true });
  };

  const handleGoPro = () => {
    setHasSeenOnboarding(true);
    navigation.replace('Paywall', { fromOnboarding: true });
  };

  const isLastSlide = currentIndex === SLIDES.length - 1;

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
        data={SLIDES}
        renderItem={({ item, index }) => (
          <Slide item={item} index={index} scrollX={scrollX} />
        )}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      />

      {/* Pagination */}
      <Pagination currentIndex={currentIndex} total={SLIDES.length} />

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
