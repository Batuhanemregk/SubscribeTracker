/**
 * Purchase Service - RevenueCat Integration
 * 
 * Handles in-app purchases and subscription management.
 * Provides a unified API for both iOS and Android.
 * Gracefully no-ops in Expo Go where native modules are unavailable.
 */
import { Platform, Linking } from 'react-native';

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

// Entitlement identifier — MUST equal the entitlement's *Identifier* (lookup_key)
// in the RevenueCat dashboard, which is what the SDK keys `entitlements.active`
// by (NOT the display name). The Finify project's entitlement identifier is
// "SubscribeTracker Pro" (display name "Finify Premium"). The MCP update API can
// only change the display name, not the identifier, so the code matches the
// identifier here. To clean this up, rename the entitlement Identifier to
// "premium" in the dashboard, then set this back to 'premium'.
const PREMIUM_ENTITLEMENT_ID = 'SubscribeTracker Pro';

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
 * Get Pro entitlement status as a TRI-STATE:
 *   true  = confirmed Pro
 *   false = confirmed NOT Pro
 *   null  = could not determine (offline, timeout, backend error, RC unavailable)
 *
 * Callers MUST NOT downgrade a user on `null` — that conflates "unknown" with
 * "not entitled" and would strip a paying user of Pro on a transient failure.
 */
export async function getProStatus(): Promise<boolean | null> {
  if (!purchasesAvailable || !Purchases) return null;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
  } catch (error) {
    console.error('Failed to check Pro status:', error);
    return null;
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
 * Listen for RevenueCat customer-info changes (purchase completes, subscription
 * expires, restore on another device) and report the resulting Pro status.
 * Returns a function to remove the listener. No-ops if RevenueCat is unavailable.
 */
export function addProStatusListener(onChange: (isPro: boolean) => void): () => void {
  if (!purchasesAvailable || !Purchases) return () => {};
  try {
    const handler = (customerInfo: any) => {
      const isPro = customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID] !== undefined;
      onChange(isPro);
    };
    Purchases.addCustomerInfoUpdateListener(handler);
    return () => {
      try {
        Purchases.removeCustomerInfoUpdateListener(handler);
      } catch {
        /* ignore */
      }
    };
  } catch (error) {
    console.error('Failed to add customer info listener:', error);
    return () => {};
  }
}

/**
 * Get subscription management URL
 */
export function getManagementURL(customerInfo: any): string | null {
  return customerInfo?.managementURL || null;
}

/**
 * Open the OS-native subscription management sheet (App Store / Play Store) so the
 * user can cancel or change their plan. Prefers RevenueCat's managementURL and
 * falls back to the platform subscriptions deep link. Returns false if nothing
 * could be opened (caller can then point the user at device Settings).
 */
export async function openManageSubscriptions(): Promise<boolean> {
  try {
    const customerInfo = await getCustomerInfo();
    const url =
      getManagementURL(customerInfo) ||
      (Platform.OS === 'ios'
        ? 'itms-apps://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions');
    await Linking.openURL(url);
    return true;
  } catch (error) {
    console.error('Failed to open subscription management:', error);
    return false;
  }
}

/**
 * Active Premium subscription info for display: billing cycle, expiration/renewal
 * date (ISO), and whether it will auto-renew. Returns null if there is no active
 * subscription or it can't be determined. Plan CHANGES and cancellation go through
 * the native manage-subscriptions sheet (openManageSubscriptions), which discloses
 * the exact billing (immediate proration vs. effective at next renewal) per change.
 */
export async function getActiveSubscriptionInfo(): Promise<{
  cycle: 'monthly' | 'yearly' | null;
  expirationDate: string | null;
  willRenew: boolean;
} | null> {
  if (!purchasesAvailable || !Purchases) return null;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const ent = customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
    if (!ent) return null;
    const productId: string = ent.productIdentifier || '';
    let cycle: 'monthly' | 'yearly' | null = null;
    if (productId === PRODUCT_IDS.MONTHLY || productId.includes('month')) cycle = 'monthly';
    else if (productId === PRODUCT_IDS.YEARLY || productId.includes('year') || productId.includes('annual')) cycle = 'yearly';
    return {
      cycle,
      expirationDate: ent.expirationDate || null,
      willRenew: ent.willRenew !== false,
    };
  } catch (error) {
    console.error('Failed to get active subscription info:', error);
    return null;
  }
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
