/**
 * BannerAd Component - Real AdMob integration
 * Shows ads only for Standard users.
 * Gracefully returns null in Expo Go where native module is unavailable.
 */
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { usePlanStore } from '../../state';
import { getBannerAdUnitId, areAdsAvailable } from '../../services/AdMobService';
import { logger } from '../../services/LoggerService';

// Dynamic import to avoid crash in Expo Go
let GoogleBannerAd: any = null;
let BannerAdSize: any = {
  BANNER: 'BANNER',
  LARGE_BANNER: 'LARGE_BANNER',
  MEDIUM_RECTANGLE: 'MEDIUM_RECTANGLE',
};

try {
  const adModule = require('react-native-google-mobile-ads');
  GoogleBannerAd = adModule.BannerAd;
  BannerAdSize = adModule.BannerAdSize;
} catch {
  // Native module not available (Expo Go)
}

interface BannerAdProps {
  size?: 'standard' | 'large' | 'medium';
}

export function BannerAd({ size = 'standard' }: BannerAdProps) {
  const { shouldShowAds } = usePlanStore();
  const [adError, setAdError] = useState(false);

  // Don't show ads for Pro users or if native module unavailable
  if (!shouldShowAds() || !areAdsAvailable() || !GoogleBannerAd) {
    return null;
  }

  const bannerSize = {
    standard: BannerAdSize.BANNER,
    large: BannerAdSize.LARGE_BANNER,
    medium: BannerAdSize.MEDIUM_RECTANGLE,
  }[size];

  const adUnitId = getBannerAdUnitId();

  if (adError) {
    // Silent fail - don't show anything if ad fails
    return null;
  }

  return (
    <View style={styles.container}>
      <GoogleBannerAd
        unitId={adUnitId}
        size={bannerSize}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdFailedToLoad={(error: any) => {
          logger.warn('BannerAd', 'Failed to load:', error);
          setAdError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
});
