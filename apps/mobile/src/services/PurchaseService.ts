/**
 * Purchase Service - RevenueCat Integration
 * 
 * Handles in-app purchases and subscription management.
 * Provides a unified API for both iOS and Android.
 * Gracefully no-ops in Expo Go where native modules are unavailable.
 */
import { Platform } from 'react-native';

// Dynamic import to avoid crash in Expo Go
let Purchases: any = null;
let LOG_LEVEL: any = { VERBOSE: 'VERBOSE', ERROR: 'ERROR' };
let purchasesAvailable = false;

try {
  const purchasesModule = require('react-native-purchases');
  Purchases = purchasesModule.default || purchasesModule;
  LOG_LEVEL = purchasesModule.LOG_LEVEL || LOG_LEVEL;
  purchasesAvailable = true;
} catch {
  console.log('RevenueCat: Native module not available (Expo Go mode)');
}

// RevenueCat API Keys
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

// Entitlement ID - matches what you set in RevenueCat dashboard
const PREMIUM_ENTITLEMENT_ID = 'premium';

// Product identifiers - must match App Store Connect
export const PRODUCT_IDS = {
  MONTHLY: 'finify_premium_monthly',
  YEARLY: 'finify_premium_yearly',
};

/**
 * Initialize RevenueCat SDK
 * Call this once on app startup
 */
export async function initPurchases(userId?: string): Promise<void> {
  if (!purchasesAvailable || !Purchases) {
    console.log('RevenueCat: Skipping init (native module unavailable)');
    return;
  }

  const apiKey = Platform.OS === 'ios' 
    ? REVENUECAT_API_KEY_IOS 
    : REVENUECAT_API_KEY_ANDROID;

  if (!apiKey) {
    console.warn('RevenueCat: API key not configured. Purchases disabled.');
    return;
  }

  try {
    // Set log level for debugging (use LOG_LEVEL.ERROR in production)
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.ERROR);

    // Configure RevenueCat
    await Purchases.configure({
      apiKey,
      appUserID: userId || undefined, // null = anonymous user
    });

    console.log('RevenueCat initialized successfully');
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
  }
}

/**
 * Check if RevenueCat is configured
 */
export function isPurchasesConfigured(): boolean {
  if (!purchasesAvailable) return false;
  const apiKey = Platform.OS === 'ios' 
    ? REVENUECAT_API_KEY_IOS 
    : REVENUECAT_API_KEY_ANDROID;
  return !!apiKey;
}

/**
 * Get current customer info including entitlements
 */
export async function getCustomerInfo(): Promise<any | null> {
  if (!purchasesAvailable || !Purchases) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('Failed to get customer info:', error);
    return null;
  }
}

/**
 * Check if user has Pro entitlement
 */
export async function checkProStatus(): Promise<boolean> {
  if (!purchasesAvailable || !Purchases) return false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
  } catch (error) {
    console.error('Failed to check Pro status:', error);
    return false;
  }
}

/**
 * Get available offerings (products)
 */
export async function getOfferings(): Promise<any | null> {
  if (!purchasesAvailable || !Purchases) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return null;
  }
}

/**
 * Purchase a package
 */
export async function purchasePackage(
  pkg: any
): Promise<{ success: boolean; customerInfo?: any; error?: string }> {
  if (!purchasesAvailable || !Purchases) {
    return { success: false, error: 'Purchases not available' };
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    
    const isPro = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
    
    return {
      success: isPro,
      customerInfo,
    };
  } catch (error: any) {
    // Check if user cancelled
    if (error.userCancelled) {
      return { success: false, error: 'Purchase cancelled' };
    }
    
    console.error('Purchase failed:', error);
    return { success: false, error: error.message || 'Purchase failed' };
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  isPro: boolean;
  error?: string;
}> {
  if (!purchasesAvailable || !Purchases) {
    return { success: false, isPro: false, error: 'Purchases not available' };
  }
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPro = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
    
    return { success: true, isPro };
  } catch (error: any) {
    console.error('Restore failed:', error);
    return { success: false, isPro: false, error: error.message };
  }
}

/**
 * Identify user (call after login)
 */
export async function identifyUser(userId: string): Promise<void> {
  if (!purchasesAvailable || !Purchases) return;
  try {
    await Purchases.logIn(userId);
    console.log('User identified:', userId);
  } catch (error) {
    console.error('Failed to identify user:', error);
  }
}

/**
 * Logout user (call after logout)
 */
export async function logoutUser(): Promise<void> {
  if (!purchasesAvailable || !Purchases) return;
  try {
    await Purchases.logOut();
    console.log('User logged out from RevenueCat');
  } catch (error) {
    console.error('Failed to logout user:', error);
  }
}

/**
 * Get subscription management URL
 */
export function getManagementURL(customerInfo: any): string | null {
  return customerInfo?.managementURL || null;
}

/**
 * Format price for display
 */
export function formatPackagePrice(pkg: any): string {
  return pkg?.product?.priceString || '';
}

/**
 * Get package identifier
 */
export function getPackageType(pkg: any): 'monthly' | 'yearly' | 'unknown' {
  const id = pkg?.identifier || '';
  if (id.includes('monthly') || id === '$rc_monthly') return 'monthly';
  if (id.includes('yearly') || id.includes('annual') || id === '$rc_annual') return 'yearly';
  return 'unknown';
}
