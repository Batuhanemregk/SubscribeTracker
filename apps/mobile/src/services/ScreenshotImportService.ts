/**
 * Screenshot Import Service ("Magic Import")
 *
 * Allows users to capture or pick a screenshot of a subscription page/email/
 * confirmation and extract subscription details using GPT-4o-mini vision.
 *
 * Flow:
 * 1. User picks image from camera or gallery via expo-image-picker
 * 2. Image converted to base64 via expo-file-system
 * 3. Check usage limits (reuse BankStatementService pattern)
 * 4. Send to Supabase Edge Function with a screenshot-specific prompt
 * 5. Return a single parsed subscription result
 *
 * Privacy: Raw image is NOT stored. Base64 is sent to the Edge Function and discarded.
 */
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import type { BillingCycle } from '../types';
import { logger } from './LoggerService';

// ─── Usage Limits ─────────────────────────────────────────
const SCREENSHOT_USAGE_KEY = 'screenshot_import_usage';
const MAX_IMPORTS_PER_DAY = 10;
const MAX_IMPORTS_PER_MONTH = 30;
const COOLDOWN_MS = 15_000; // 15 seconds between imports

// ─── Types ────────────────────────────────────────────────
export interface ScreenshotImportResult {
  success: boolean;
  data?: {
    name: string;
    amount: number;
    currency: string;
    cycle: BillingCycle;
    confidence: number;
  };
  error?: string;
}

export interface ScreenshotUsage {
  dailyCount: number;
  monthlyCount: number;
  lastImportDate: string;   // YYYY-MM-DD
  lastImportMonth: string;  // YYYY-MM
  lastImportTimestamp: number;
}

export interface ScreenshotUsageLimitResult {
  allowed: boolean;
  error?: string;
  remainingToday: number;
  cooldownRemaining: number; // seconds
}

export interface PickImageResult {
  success: boolean;
  uri?: string;
  mimeType?: string;
  error?: string;
}

// ─── Camera / Gallery Picking ─────────────────────────────

/**
 * Launch native camera to capture a new photo
 */
export async function captureFromCamera(): Promise<PickImageResult> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return { success: false, error: 'Camera permission denied' };
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      base64: false,
      allowsEditing: false,
    });

    if (result.canceled) {
      return { success: false, error: 'User cancelled' };
    }

    const asset = result.assets[0];
    return {
      success: true,
      uri: asset.uri,
      mimeType: asset.mimeType || 'image/jpeg',
    };
  } catch (error: any) {
    logger.error('ScreenshotImport', 'Camera error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Open image library to pick an existing screenshot
 */
export async function pickFromGallery(): Promise<PickImageResult> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return { success: false, error: 'Gallery permission denied' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      base64: false,
      allowsEditing: false,
    });

    if (result.canceled) {
      return { success: false, error: 'User cancelled' };
    }

    const asset = result.assets[0];
    return {
      success: true,
      uri: asset.uri,
      mimeType: asset.mimeType || 'image/jpeg',
    };
  } catch (error: any) {
    logger.error('ScreenshotImport', 'Gallery error:', error);
    return { success: false, error: error.message };
  }
}

// ─── File Reading ─────────────────────────────────────────

/**
 * Read image file as base64 string using expo-file-system SDK 54+ File API
 */
async function readImageAsBase64(uri: string): Promise<string | null> {
  try {
    const file = new File(uri);
    if (!file.exists) {
      logger.error('ScreenshotImport', 'File does not exist:', uri);
      return null;
    }
    return await file.base64();
  } catch (error) {
    logger.error('ScreenshotImport', 'Failed to read image:', error);
    return null;
  }
}

// ─── Usage Limits ─────────────────────────────────────────

async function getUsage(): Promise<ScreenshotUsage> {
  try {
    const raw = await AsyncStorage.getItem(SCREENSHOT_USAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fallback to defaults */ }

  const today = new Date().toISOString().split('T')[0];
  const month = today.substring(0, 7);
  return {
    dailyCount: 0,
    monthlyCount: 0,
    lastImportDate: today,
    lastImportMonth: month,
    lastImportTimestamp: 0,
  };
}

export async function checkImportLimits(): Promise<ScreenshotUsageLimitResult> {
  const usage = await getUsage();
  const today = new Date().toISOString().split('T')[0];
  const month = today.substring(0, 7);

  const dailyCount = usage.lastImportDate === today ? usage.dailyCount : 0;
  const monthlyCount = usage.lastImportMonth === month ? usage.monthlyCount : 0;

  // Cooldown check
  const elapsed = Date.now() - usage.lastImportTimestamp;
  if (elapsed < COOLDOWN_MS && usage.lastImportTimestamp > 0) {
    const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    return {
      allowed: false,
      error: `Please wait ${remaining} seconds before importing again.`,
      remainingToday: MAX_IMPORTS_PER_DAY - dailyCount,
      cooldownRemaining: remaining,
    };
  }

  // Daily limit
  if (dailyCount >= MAX_IMPORTS_PER_DAY) {
    return {
      allowed: false,
      error: `Daily import limit reached (${MAX_IMPORTS_PER_DAY}/day). Try again tomorrow.`,
      remainingToday: 0,
      cooldownRemaining: 0,
    };
  }

  // Monthly limit
  if (monthlyCount >= MAX_IMPORTS_PER_MONTH) {
    return {
      allowed: false,
      error: `Monthly import limit reached (${MAX_IMPORTS_PER_MONTH}/month).`,
      remainingToday: 0,
      cooldownRemaining: 0,
    };
  }

  return {
    allowed: true,
    remainingToday: MAX_IMPORTS_PER_DAY - dailyCount,
    cooldownRemaining: 0,
  };
}

async function recordImport(): Promise<void> {
  const usage = await getUsage();
  const today = new Date().toISOString().split('T')[0];
  const month = today.substring(0, 7);

  const updated: ScreenshotUsage = {
    dailyCount: (usage.lastImportDate === today ? usage.dailyCount : 0) + 1,
    monthlyCount: (usage.lastImportMonth === month ? usage.monthlyCount : 0) + 1,
    lastImportDate: today,
    lastImportMonth: month,
    lastImportTimestamp: Date.now(),
  };

  await AsyncStorage.setItem(SCREENSHOT_USAGE_KEY, JSON.stringify(updated));
}

// ─── Core Extraction ──────────────────────────────────────

/**
 * Extract subscription details from a screenshot image.
 * Reuses the same Supabase Edge Function infrastructure as BankStatementService,
 * but with a screenshot-specific prompt requesting a single subscription result.
 */
export async function extractFromScreenshot(
  imageUri: string,
  mimeType: string = 'image/jpeg'
): Promise<ScreenshotImportResult> {
  try {
    // Step 1: Check usage limits
    const limits = await checkImportLimits();
    if (!limits.allowed) {
      return { success: false, error: limits.error };
    }

    // Step 2: Read image as base64
    const base64Content = await readImageAsBase64(imageUri);
    if (!base64Content) {
      return { success: false, error: 'Failed to read image file' };
    }

    // Step 3: Record the import
    await recordImport();

    // Step 4: Call Supabase Edge Function with screenshot-specific prompt
    const { data, error } = await supabase.functions.invoke('extract-bank-statement', {
      body: {
        fileBase64: base64Content,
        mimeType,
        mode: 'screenshot',
        prompt:
          'This is a screenshot of a subscription service page, confirmation email, or billing page. ' +
          'Extract the subscription details and return ONLY a JSON object with these exact fields: ' +
          '{ "name": string, "amount": number, "currency": string (ISO 4217, e.g. USD, EUR, TRY), ' +
          '"cycle": "weekly"|"monthly"|"quarterly"|"yearly", "confidence": number between 0 and 1 }. ' +
          'If you cannot identify a subscription with confidence >= 0.5, return { "found": false }. ' +
          'Do not include any explanation — only the JSON.',
      },
    });

    if (error) {
      logger.error('ScreenshotImport', 'Edge function error:', error);
      let errorMessage: string;
      if (data?.error && typeof data.error === 'string') {
        errorMessage = data.error;
      } else if (error.message?.includes('non-2xx')) {
        errorMessage = 'Analysis service temporarily unavailable. Please try again.';
      } else {
        errorMessage = error.message || 'Failed to analyze the screenshot. Please try again.';
      }
      return { success: false, error: errorMessage };
    }

    // Step 5: Parse response — handle both screenshot mode and bank-statement mode responses
    const parsed = parseScreenshotResponse(data);
    if (!parsed) {
      return { success: false, error: 'Could not detect subscription details' };
    }

    return { success: true, data: parsed };
  } catch (error: any) {
    logger.error('ScreenshotImport', 'Extraction error:', error);
    return { success: false, error: error.message };
  }
}

// ─── Helpers ──────────────────────────────────────────────

function parseScreenshotResponse(data: any): ScreenshotImportResult['data'] | null {
  if (!data) return null;

  // Explicit "not found" signal
  if (data.found === false) return null;

  // Direct object with required fields (screenshot mode)
  if (typeof data.name === 'string' && typeof data.amount === 'number') {
    if (data.amount <= 0 || (data.confidence ?? 1) < 0.5) return null;
    return {
      name: String(data.name),
      amount: Number(data.amount),
      currency: String(data.currency || 'USD'),
      cycle: validateCycle(data.cycle),
      confidence: Math.min(1, Math.max(0, Number(data.confidence ?? 0.7))),
    };
  }

  // Bank-statement mode: array of subscriptions — take the highest-confidence one
  if (Array.isArray(data.subscriptions) && data.subscriptions.length > 0) {
    const best = data.subscriptions
      .filter((s: any) => s.name && typeof s.amount === 'number' && s.amount > 0 && (s.confidence ?? 0) >= 0.5)
      .sort((a: any, b: any) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];

    if (!best) return null;
    return {
      name: String(best.name),
      amount: Number(best.amount),
      currency: String(best.currency || 'USD'),
      cycle: validateCycle(best.cycle),
      confidence: Math.min(1, Math.max(0, Number(best.confidence ?? 0.7))),
    };
  }

  return null;
}

function validateCycle(cycle: string): BillingCycle {
  const valid: BillingCycle[] = ['weekly', 'monthly', 'quarterly', 'yearly'];
  return valid.includes(cycle as BillingCycle) ? (cycle as BillingCycle) : 'monthly';
}
