/**
 * BannerAd Component - Real AdMob integration
 * Shows ads only for Standard users
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BannerAd as GoogleBannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { usePlanStore } from '../../state';
import { getBannerAdUnitId } from '../../services';
import { colors } from '../../theme';

interface BannerAdProps {
  size?: 'standard' | 'large' | 'medium';
}

export function BannerAd({ size = 'standard' }: BannerAdProps) {
  const { shouldShowAds } = usePlanStore();
  const [adError, setAdError] = useState(false);

  // Don't show ads for Pro users
  if (!shouldShowAds()) {
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
        onAdFailedToLoad={(error) => {
          console.log('Banner ad failed to load:', error);
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
