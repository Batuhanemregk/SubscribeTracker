/**
 * App Configuration - API Keys and IDs
 * 
 * IMPORTANT: In production, these should be in environment variables
 * For now, they are here for development convenience
 */

export const CONFIG = {
  // Google OAuth
  google: {
    iosClientId: '199620956001-dlpichi5sbkkh8dh0d34r005c0bajguf.apps.googleusercontent.com',
    androidClientId: '199620956001-72rprn4amp24cuuom3424he7hu1rqpkj.apps.googleusercontent.com',
    // expo-auth-session uses browser-based flow, needs Web Application client ID
    webClientId: '199620956001-jkd548j5alvttcltq0b4kkulap1f6sj7.apps.googleusercontent.com',
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
