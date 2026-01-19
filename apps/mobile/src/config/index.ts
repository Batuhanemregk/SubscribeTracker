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
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  },

  // Microsoft Azure OAuth (Outlook)
  microsoft: {
    clientId: '66ce2ee7-b8e3-4a79-b2f7-c9bb481823b4',
    scopes: ['openid', 'profile', 'email', 'Mail.Read'],
    redirectUri: 'subscribetracker://oauth-callback',
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
    scheme: 'subscribetracker',
    bundleId: 'com.subscribetracker.app',
    packageName: 'com.subscribetracker.app',
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
  return Platform.select({
    ios: CONFIG.google.iosClientId,
    android: CONFIG.google.androidClientId,
    default: CONFIG.google.iosClientId,
  });
};
