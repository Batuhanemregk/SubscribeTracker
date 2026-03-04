/**
 * AdManager - Interstitial Ad Strategy Controller
 * 
 * Rules:
 * - After first subscription is added (once daily)
 * - Before bank statement scan starts
 * - When paywall is dismissed without purchase
 * - Minimum 3 minutes between ads
 * - Maximum 2-3 per day
 * - Pro users see no ads
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showInterstitialAd, isInterstitialReady } from './AdMobService';
import { logger } from './LoggerService';

const STORAGE_KEY = 'ad_manager_state';
const MIN_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes
const DAILY_MAX_ADS = 3;
const DAILY_OPEN_AD_SHOWN_KEY = 'daily_first_sub_ad_shown';

interface AdManagerState {
  lastAdShownAt: number;
  dailyAdCount: number;
  lastResetDate: string;
  dailyOpenAdShown: boolean; // reused for first-subscription ad
}

let state: AdManagerState = {
  lastAdShownAt: 0,
  dailyAdCount: 0,
  lastResetDate: '',
  dailyOpenAdShown: false,
};

let appOpenTime: number = 0;

/**
 * Initialize AdManager - call on app start
 */
export async function initAdManager(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      state = JSON.parse(stored);
    }
    
    // Reset daily counters if new day
    const today = new Date().toDateString();
    if (state.lastResetDate !== today) {
      state.dailyAdCount = 0;
      state.dailyOpenAdShown = false;
      state.lastResetDate = today;
      await saveState();
    }
    
    // Set app open time for 30-second timer
    appOpenTime = Date.now();
  } catch (error) {
    logger.error('AdManager', 'Init error:', error);
  }
}

/**
 * Save state to AsyncStorage
 */
async function saveState(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    logger.error('AdManager', 'Save error:', error);
  }
}

/**
 * Check if we can show an ad (cooldown + daily limit)
 */
function canShowAd(): boolean {
  const now = Date.now();
  
  // Check cooldown
  if (now - state.lastAdShownAt < MIN_COOLDOWN_MS) {
    logger.debug('AdManager', 'Cooldown active, skipping ad');
    return false;
  }
  
  // Check daily limit
  if (state.dailyAdCount >= DAILY_MAX_ADS) {
    logger.debug('AdManager', 'Daily limit reached');
    return false;
  }
  
  // Check if ad is loaded
  if (!isInterstitialReady()) {
    logger.debug('AdManager', 'Interstitial not ready');
    return false;
  }
  
  return true;
}

/**
 * Show interstitial ad and update state
 */
async function showAdAndUpdateState(): Promise<boolean> {
  if (!canShowAd()) {
    return false;
  }
  
  const shown = await showInterstitialAd();
  
  if (shown) {
    state.lastAdShownAt = Date.now();
    state.dailyAdCount++;
    await saveState();
    logger.info('AdManager', `Ad shown (${state.dailyAdCount}/${DAILY_MAX_ADS} today)`);
  }
  
  return shown;
}

/**
 * Show ad after first subscription is added (once daily)
 */
export async function showAfterFirstSubscriptionAd(): Promise<boolean> {
  if (state.dailyOpenAdShown) {
    logger.debug('AdManager', 'Daily first-subscription ad already shown');
    return false;
  }
  
  const shown = await showAdAndUpdateState();
  if (shown) {
    state.dailyOpenAdShown = true;
    await saveState();
    logger.info('AdManager', 'First-subscription ad shown');
  }
  return shown;
}

/**
 * Cancel ad timer (kept for backward compatibility)
 */
export function cancelAppOpenAdTimer(): void {
  // No-op: timer-based ads removed
}

/**
 * Show ad before scan starts
 */
export async function showPreScanAd(): Promise<boolean> {
  logger.debug('AdManager', 'Pre-scan ad requested');
  return showAdAndUpdateState();
}

/**
 * Show ad when paywall is dismissed without purchase
 */
export async function showPaywallDismissAd(): Promise<boolean> {
  logger.debug('AdManager', 'Paywall dismiss ad requested');
  return showAdAndUpdateState();
}

/**
 * Get current ad stats (for debugging)
 */
export function getAdStats(): { dailyCount: number; maxDaily: number; cooldownRemaining: number } {
  const cooldownRemaining = Math.max(0, MIN_COOLDOWN_MS - (Date.now() - state.lastAdShownAt));
  return {
    dailyCount: state.dailyAdCount,
    maxDaily: DAILY_MAX_ADS,
    cooldownRemaining: Math.round(cooldownRemaining / 1000),
  };
}
