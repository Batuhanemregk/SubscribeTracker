/**
 * AdMob Service - Real ad integration
 * Gracefully no-ops in Expo Go where native modules are unavailable.
 */
import { Platform } from 'react-native';

// Dynamic import to avoid crash in Expo Go
let InterstitialAd: any = null;
let AdEventType: any = {};
let TestIds: any = {};
let BannerAdSize: any = {
  BANNER: 'BANNER',
  LARGE_BANNER: 'LARGE_BANNER',
  MEDIUM_RECTANGLE: 'MEDIUM_RECTANGLE',
  FULL_BANNER: 'FULL_BANNER',
  LEADERBOARD: 'LEADERBOARD',
  ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER',
};
let adsAvailable = false;

try {
  const adModule = require('react-native-google-mobile-ads');
  InterstitialAd = adModule.InterstitialAd;
  AdEventType = adModule.AdEventType;
  TestIds = adModule.TestIds;
  BannerAdSize = adModule.BannerAdSize;
  adsAvailable = true;
} catch {
  console.log('AdMob: Native module not available (Expo Go mode)');
}

import { getAdMobIds } from '../config';

const adIds = getAdMobIds();

// Interstitial ad instance
let interstitialAd: any = null;
let isInterstitialLoaded = false;

/**
 * Initialize and load interstitial ad
 */
export function loadInterstitialAd(): void {
  if (!adsAvailable || !InterstitialAd) return;

  if (interstitialAd) {
    interstitialAd.load();
    return;
  }

  interstitialAd = InterstitialAd.createForAdRequest(adIds.interstitialId, {
    requestNonPersonalizedAdsOnly: false,
  });

  // Set up event listeners
  interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
    isInterstitialLoaded = true;
    console.log('Interstitial ad loaded');
  });

  interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
    isInterstitialLoaded = false;
    // Reload for next time
    interstitialAd?.load();
  });

  interstitialAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
    isInterstitialLoaded = false;
    console.error('Interstitial ad error:', error);
  });

  // Start loading
  interstitialAd.load();
}

/**
 * Show interstitial ad if loaded
 */
export async function showInterstitialAd(): Promise<boolean> {
  if (!adsAvailable || !isInterstitialLoaded || !interstitialAd) {
    console.log('Interstitial ad not ready');
    return false;
  }

  try {
    await interstitialAd.show();
    return true;
  } catch (error) {
    console.error('Failed to show interstitial:', error);
    return false;
  }
}

/**
 * Check if interstitial is ready
 */
export function isInterstitialReady(): boolean {
  return isInterstitialLoaded;
}

/**
 * Check if ads are available (native module loaded)
 */
export function areAdsAvailable(): boolean {
  return adsAvailable;
}

/**
 * Get banner ad unit ID
 */
export function getBannerAdUnitId(): string {
  return adIds.bannerId;
}

/**
 * Get available banner sizes
 */
export const AdSizes = {
  BANNER: BannerAdSize.BANNER,
  LARGE_BANNER: BannerAdSize.LARGE_BANNER,
  MEDIUM_RECTANGLE: BannerAdSize.MEDIUM_RECTANGLE,
  FULL_BANNER: BannerAdSize.FULL_BANNER,
  LEADERBOARD: BannerAdSize.LEADERBOARD,
  ANCHORED_ADAPTIVE_BANNER: BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
};

/**
 * Cleanup ads on app close
 */
export function cleanupAds(): void {
  if (interstitialAd) {
    interstitialAd.removeAllListeners();
    interstitialAd = null;
    isInterstitialLoaded = false;
  }
}
