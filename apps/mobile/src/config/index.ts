/**
 * App Configuration - API Keys and IDs
 * 
 * IMPORTANT: In production, these should be in environment variables
 * For now, they are here for development convenience
 */

export const CONFIG = {
  // Google OAuth
  google: {
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
    // expo-auth-session uses browser-based flow, needs Web Application client ID
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    scopes: ['openid', 'profile', 'email'],
  },

  // AdMob
  admob: {
    ios: {
      appId: 'ca-app-pub-7540196282258726~6259490193',
      bannerId: 'ca-app-pub-7540196282258726/9918521848',
      interstitialId: 'ca-app-pub-7540196282258726/8637229760',
    },
    android: {
      appId: 'ca-app-pub-7540196282258726~7515719785',
      bannerId: 'ca-app-pub-7540196282258726/3356982923',
      interstitialId: 'ca-app-pub-7540196282258726/7516731545',
    },
    // Test IDs for development
    test: {
      bannerId: 'ca-app-pub-3940256099942544/6300978111',
      interstitialId: 'ca-app-pub-3940256099942544/1033173712',
    },
  },

  // App Info
  app: {
    scheme: 'finify',
    bundleId: 'com.subssentry.app',
    packageName: 'com.subssentry.app',
  },
};

// Helper to get platform-specific AdMob IDs
import { Platform } from 'react-native';

export const getAdMobIds = () => {
  const useTestAds = __DEV__; // Use test ads in development
  
  if (useTestAds) {
    return {
      bannerId: CONFIG.admob.test.bannerId,
      interstitialId: CONFIG.admob.test.interstitialId,
    };
  }

  return Platform.select({
    ios: {
      bannerId: CONFIG.admob.ios.bannerId,
      interstitialId: CONFIG.admob.ios.interstitialId,
    },
    android: {
      bannerId: CONFIG.admob.android.bannerId,
      interstitialId: CONFIG.admob.android.interstitialId,
    },
    default: {
      bannerId: CONFIG.admob.test.bannerId,
      interstitialId: CONFIG.admob.test.interstitialId,
    },
  });
};

export const getGoogleClientId = () => {
  // expo-auth-session uses browser-based flow, Web client ID works on all platforms
  if (CONFIG.google.webClientId) {
    return CONFIG.google.webClientId;
  }
  // Fallback to platform-specific
  return Platform.select({
    ios: CONFIG.google.iosClientId,
    android: CONFIG.google.androidClientId,
    default: CONFIG.google.iosClientId,
  });
};
