/**
 * RatingService - Smart App Rating Prompts
 *
 * Prompts users for App Store / Google Play reviews at high-value moments.
 * Rules:
 *   1. Never if hasRated is true
 *   2. Never before 3 days since firstOpenDate
 *   3. Never within 90 days of lastPromptDate
 *   4. Max 3 total prompts ever
 *   5. Never after 2 dismissals
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { logger } from './LoggerService';

const RATING_KEY = 'rating_prompt_state';

interface RatingState {
  firstOpenDate: string | null;
  lastPromptDate: string | null;
  promptCount: number;
  hasRated: boolean;
  dismissCount: number;
}

const DEFAULT_STATE: RatingState = {
  firstOpenDate: null,
  lastPromptDate: null,
  promptCount: 0,
  hasRated: false,
  dismissCount: 0,
};

async function loadState(): Promise<RatingState> {
  try {
    const raw = await AsyncStorage.getItem(RATING_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function saveState(state: RatingState): Promise<void> {
  try {
    await AsyncStorage.setItem(RATING_KEY, JSON.stringify(state));
  } catch (e) {
    logger.warn('Rating', 'Failed to save state:', e);
  }
}

function daysBetween(isoA: string, isoB: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return (new Date(isoB).getTime() - new Date(isoA).getTime()) / msPerDay;
}

/**
 * Initialize on app start — records firstOpenDate if not yet set.
 */
export async function initRatingTracking(): Promise<void> {
  try {
    const state = await loadState();
    if (!state.firstOpenDate) {
      state.firstOpenDate = new Date().toISOString();
      await saveState(state);
      logger.info('Rating', 'First open recorded');
    }
  } catch (e) {
    logger.warn('Rating', 'initRatingTracking error:', e);
  }
}

/**
 * Returns true if the rating prompt should be shown right now.
 */
export async function shouldPromptForRating(): Promise<boolean> {
  try {
    const state = await loadState();
    const now = new Date().toISOString();

    if (state.hasRated) return false;
    if (state.promptCount >= 3) return false;
    if (state.dismissCount >= 2) return false;

    if (!state.firstOpenDate) return false;
    if (daysBetween(state.firstOpenDate, now) < 3) return false;

    if (state.lastPromptDate && daysBetween(state.lastPromptDate, now) < 90) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Request the native review dialog. Checks eligibility first.
 */
export async function requestAppReview(): Promise<void> {
  try {
    const eligible = await shouldPromptForRating();
    if (!eligible) return;

    const available = await StoreReview.isAvailableAsync();
    if (!available) return;

    await StoreReview.requestReview();

    const state = await loadState();
    state.lastPromptDate = new Date().toISOString();
    state.promptCount += 1;
    await saveState(state);

    logger.info('Rating', 'Review requested, total prompts:', state.promptCount);
  } catch (e) {
    logger.warn('Rating', 'requestAppReview error:', e);
  }
}

/**
 * Record that the user dismissed a rating prompt.
 */
export async function recordDismissal(): Promise<void> {
  try {
    const state = await loadState();
    state.dismissCount += 1;
    await saveState(state);
    logger.info('Rating', 'Dismissal recorded, total:', state.dismissCount);
  } catch (e) {
    logger.warn('Rating', 'recordDismissal error:', e);
  }
}

// ---------------------------------------------------------------------------
// Trigger points — fire-and-forget; call without await in product code
// ---------------------------------------------------------------------------

/**
 * Trigger when the user adds their 3rd subscription.
 */
export async function onSubscriptionAdded(totalCount: number): Promise<void> {
  if (totalCount !== 3) return;
  logger.debug('Rating', 'Triggered at subscription_added_3rd');
  await requestAppReview();
}

/**
 * Trigger after a successful Magic Import or Bank Scan.
 */
export async function onSuccessfulImport(): Promise<void> {
  logger.debug('Rating', 'Triggered at successful_import');
  await requestAppReview();
}

/**
 * Trigger on first Monthly Report view.
 */
export async function onMonthlyReportViewed(): Promise<void> {
  logger.debug('Rating', 'Triggered at monthly_report_viewed');
  await requestAppReview();
}

/**
 * Trigger when a savings goal is reached (progress >= 100%).
 */
export async function onGoalReached(): Promise<void> {
  logger.debug('Rating', 'Triggered at goal_reached');
  await requestAppReview();
}
