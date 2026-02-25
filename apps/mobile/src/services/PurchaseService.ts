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
 * Purchase error types for granular handling
 */
export type PurchaseErrorType =
  | 'cancelled'
  | 'network'
  | 'not_available'
  | 'store_error'
  | 'already_owned'
  | 'not_configured'
  | 'unknown';

export interface PurchaseResult {
  success: boolean;
  customerInfo?: any;
  error?: string;
  errorType?: PurchaseErrorType;
}

/**
 * Classify a RevenueCat error into a user-friendly error type
 */
function classifyPurchaseError(error: any): { errorType: PurchaseErrorType; message: string } {
  // User explicitly cancelled
  if (error.userCancelled) {
    return { errorType: 'cancelled', message: 'Purchase cancelled' };
  }

  // RevenueCat error codes (from PurchasesErrorCode enum)
  const code = error.code || error.errorCode;

  switch (code) {
    // Network issues
    case 1: // networkError
    case 'NetworkError':
      return { errorType: 'network', message: 'Network error. Please check your connection and try again.' };

    // Product not available
    case 5: // productNotAvailableForPurchaseError
    case 7: // purchaseNotAllowedError
    case 'ProductNotAvailableForPurchaseError':
    case 'PurchaseNotAllowedError':
      return { errorType: 'not_available', message: 'This product is not available for purchase right now.' };

    // Store problems
    case 2: // invalidReceiptError
    case 3: // readReceiptError
    case 6: // storeProblemError
    case 'StoreProblemError':
      return { errorType: 'store_error', message: 'There was a problem with the app store. Please try again later.' };

    // Already owned
    case 4: // productAlreadyPurchasedError
    case 'ProductAlreadyPurchasedError':
      return { errorType: 'already_owned', message: 'You already own this subscription. Try restoring purchases.' };

    default:
      return { errorType: 'unknown', message: error.message || 'An unexpected error occurred. Please try again.' };
  }
}

/**
 * Purchase a package
 */
export async function purchasePackage(pkg: any): Promise<PurchaseResult> {
  if (!purchasesAvailable || !Purchases) {
    return { success: false, error: 'In-app purchases are not available on this device.', errorType: 'not_configured' };
  }

  if (!isPurchasesConfigured()) {
    return { success: false, error: 'Purchase service is not configured.', errorType: 'not_configured' };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);

    const isPro = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;

    return {
      success: isPro,
      customerInfo,
      error: isPro ? undefined : 'Entitlement not granted. Please contact support.',
      errorType: isPro ? undefined : 'store_error',
    };
  } catch (error: any) {
    console.error('Purchase error details:', JSON.stringify({
      code: error.code,
      message: error.message,
      userCancelled: error.userCancelled,
      underlyingError: error.underlyingErrorMessage,
      readableCode: error.readableErrorCode,
    }, null, 2));
    const classified = classifyPurchaseError(error);
    console.error(`Purchase failed [${classified.errorType}]:`, classified.message);
    return {
      success: false,
      error: classified.message,
      errorType: classified.errorType,
    };
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
    return { success: false, isPro: false, error: 'In-app purchases are not available on this device.' };
  }
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPro = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;

    return { success: true, isPro };
  } catch (error: any) {
    console.error('Restore failed:', error);
    const classified = classifyPurchaseError(error);
    return { success: false, isPro: false, error: classified.message };
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
