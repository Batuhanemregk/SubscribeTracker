/**
 * Bank Statement Scanning Service
 * 
 * Extracts subscription information from bank statements using GPT-4o-mini.
 * Pro-only feature.
 * 
 * Flow:
 * 1. User uploads PDF/image of bank statement
 * 2. Validate file (type, size, magic bytes)
 * 3. Check usage limits (5/day, 30/month)
 * 4. Read file as base64
 * 5. Send to Supabase Edge Function → GPT-4o-mini (file for PDF, vision for images)
 * 6. Post-process: dedup recurring, detect new, guard existing
 * 7. Return extracted subscriptions for user review
 * 
 * Privacy: Raw bank statement content is NOT stored. Only extracted subscription
 * records are kept. Base64 is sent directly to Edge Function and discarded.
 */
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { logger } from './LoggerService';

// ─── Usage Limits ─────────────────────────────────────────
const SCAN_USAGE_KEY = 'bank_scan_usage';
const MAX_SCANS_PER_DAY = 100;
const MAX_SCANS_PER_MONTH = 30;
const COOLDOWN_MS = 30_000; // 30 seconds between scans

// ─── File Limits ──────────────────────────────────────────
const MAX_FILE_SIZE_MB = 10;
const MIN_FILE_SIZE_KB = 5;

// ─── Types ────────────────────────────────────────────────
export interface ExtractedSubscription {
  name: string;
  amount: number;
  currency: string;
  cycle: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  confidence: number; // 0-1
  merchantName?: string;
  lastChargeDate?: string;
  // Enhanced fields
  occurrenceCount?: number;
  chargedDates?: string[];
  isRecurring?: boolean;
  potentialNew?: boolean;
}

export interface ExtractionResult {
  success: boolean;
  subscriptions: ExtractedSubscription[];
  error?: string;
  tokensUsed?: number;
  monthsCovered?: number;
}

export interface ScanUsage {
  dailyCount: number;
  monthlyCount: number;
  lastScanDate: string;    // YYYY-MM-DD
  lastScanMonth: string;   // YYYY-MM
  lastScanTimestamp: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  errorKey?: string; // i18n key for the error
}

export interface UsageLimitResult {
  allowed: boolean;
  error?: string;
  errorKey?: string;
  remainingToday: number;
  remainingMonth: number;
  cooldownRemaining: number; // seconds
}

// ─── File Validation ──────────────────────────────────────

/**
 * Validate file before sending to API
 * Checks: size, MIME type, magic bytes
 */
export function validateFile(base64Content: string, mimeType: string): ValidationResult {
  // Check minimum size (< 5KB = probably empty or corrupt)
  const fileSizeBytes = (base64Content.length * 3) / 4;
  const fileSizeKB = fileSizeBytes / 1024;
  const fileSizeMB = fileSizeKB / 1024;

  if (fileSizeKB < MIN_FILE_SIZE_KB) {
    return { valid: false, error: 'File appears empty or too small.', errorKey: 'bankScan.errors.tooSmall' };
  }

  // Check maximum size (> 10MB)
  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    return { valid: false, error: `File too large. Maximum ${MAX_FILE_SIZE_MB}MB.`, errorKey: 'bankScan.errors.tooLarge' };
  }

  // Check MIME type
  const isPdf = mimeType === 'application/pdf';
  const isImage = mimeType?.startsWith('image/');
  if (!isPdf && !isImage) {
    return { valid: false, error: 'Unsupported format. Use PDF, PNG, or JPG.', errorKey: 'bankScan.errors.unsupportedFormat' };
  }

  // Check magic bytes (first few bytes of base64)
  if (isPdf) {
    // PDF starts with %PDF → base64: JVBERi
    if (!base64Content.startsWith('JVBERi')) {
      return { valid: false, error: 'This doesn\'t appear to be a valid PDF file.', errorKey: 'bankScan.errors.invalidPdf' };
    }
  } else if (isImage) {
    // PNG starts with \x89PNG → base64: iVBOR
    // JPEG starts with \xFF\xD8 → base64: /9j/
    const isPng = base64Content.startsWith('iVBOR');
    const isJpeg = base64Content.startsWith('/9j/');
    if (!isPng && !isJpeg) {
      return { valid: false, error: 'This doesn\'t appear to be a valid image.', errorKey: 'bankScan.errors.invalidImage' };
    }
  }

  return { valid: true };
}

// ─── Usage Limits ─────────────────────────────────────────

/**
 * Get current scan usage stats
 */
async function getScanUsage(): Promise<ScanUsage> {
  try {
    const raw = await AsyncStorage.getItem(SCAN_USAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fallback to defaults */ }
  
  const today = new Date().toISOString().split('T')[0];
  const month = today.substring(0, 7);
  return { dailyCount: 0, monthlyCount: 0, lastScanDate: today, lastScanMonth: month, lastScanTimestamp: 0 };
}

/**
 * Check if user can perform a scan (rate limiting)
 */
export async function checkScanLimits(): Promise<UsageLimitResult> {
  const usage = await getScanUsage();
  const today = new Date().toISOString().split('T')[0];
  const month = today.substring(0, 7);
  
  // Reset counters if day/month changed
  const dailyCount = usage.lastScanDate === today ? usage.dailyCount : 0;
  const monthlyCount = usage.lastScanMonth === month ? usage.monthlyCount : 0;

  // Check cooldown
  const elapsed = Date.now() - usage.lastScanTimestamp;
  if (elapsed < COOLDOWN_MS && usage.lastScanTimestamp > 0) {
    const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    return {
      allowed: false,
      error: `Please wait ${remaining} seconds before scanning again.`,
      errorKey: 'bankScan.errors.cooldown',
      remainingToday: MAX_SCANS_PER_DAY - dailyCount,
      remainingMonth: MAX_SCANS_PER_MONTH - monthlyCount,
      cooldownRemaining: remaining,
    };
  }

  // Check daily limit
  if (dailyCount >= MAX_SCANS_PER_DAY) {
    return {
      allowed: false,
      error: `Daily limit reached (${MAX_SCANS_PER_DAY}/day). Try again tomorrow.`,
      errorKey: 'bankScan.errors.dailyLimit',
      remainingToday: 0,
      remainingMonth: MAX_SCANS_PER_MONTH - monthlyCount,
      cooldownRemaining: 0,
    };
  }

  // Check monthly limit
  if (monthlyCount >= MAX_SCANS_PER_MONTH) {
    return {
      allowed: false,
      error: `Monthly limit reached (${MAX_SCANS_PER_MONTH}/month).`,
      errorKey: 'bankScan.errors.monthlyLimit',
      remainingToday: 0,
      remainingMonth: 0,
      cooldownRemaining: 0,
    };
  }

  return {
    allowed: true,
    remainingToday: MAX_SCANS_PER_DAY - dailyCount,
    remainingMonth: MAX_SCANS_PER_MONTH - monthlyCount,
    cooldownRemaining: 0,
  };
}

/**
 * Record a scan (increment counters)
 */
export async function recordScan(): Promise<void> {
  const usage = await getScanUsage();
  const today = new Date().toISOString().split('T')[0];
  const month = today.substring(0, 7);

  const updated: ScanUsage = {
    dailyCount: (usage.lastScanDate === today ? usage.dailyCount : 0) + 1,
    monthlyCount: (usage.lastScanMonth === month ? usage.monthlyCount : 0) + 1,
    lastScanDate: today,
    lastScanMonth: month,
    lastScanTimestamp: Date.now(),
  };

  await AsyncStorage.setItem(SCAN_USAGE_KEY, JSON.stringify(updated));
}

/**
 * Get remaining scans for display
 */
export async function getRemainingScans(): Promise<{ today: number; month: number }> {
  const usage = await getScanUsage();
  const today = new Date().toISOString().split('T')[0];
  const month = today.substring(0, 7);
  
  const dailyCount = usage.lastScanDate === today ? usage.dailyCount : 0;
  const monthlyCount = usage.lastScanMonth === month ? usage.monthlyCount : 0;

  return {
    today: Math.max(0, MAX_SCANS_PER_DAY - dailyCount),
    month: Math.max(0, MAX_SCANS_PER_MONTH - monthlyCount),
  };
}

// ─── File Picking ─────────────────────────────────────────

/**
 * Pick a bank statement file (PDF or image)
 */
export async function pickBankStatement(): Promise<{
  success: boolean;
  uri?: string;
  name?: string;
  mimeType?: string;
  error?: string;
}> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return { success: false, error: 'User cancelled' };
    }

    const asset = result.assets[0];
    return {
      success: true,
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType,
    };
  } catch (error: any) {
    logger.error('BankStatement', 'Document picker error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Pick an image from the gallery (photos/screenshots)
 */
export async function pickFromGallery(): Promise<{
  success: boolean;
  uri?: string;
  name?: string;
  mimeType?: string;
  error?: string;
}> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return { success: false, error: 'User cancelled' };
    }

    const asset = result.assets[0];
    return {
      success: true,
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType || 'image/jpeg',
    };
  } catch (error: any) {
    logger.error('BankStatement', 'Gallery picker error:', error);
    return { success: false, error: error.message };
  }
}

// ─── File Reading ─────────────────────────────────────────

/**
 * Read file content as base64 (for sending to LLM)
 * Uses the new expo-file-system/next File API (SDK 54+)
 */
export async function readFileAsBase64(uri: string): Promise<string | null> {
  try {
    const file = new File(uri);

    // Check file exists first
    if (!file.exists) {
      logger.error('BankStatement', 'File does not exist at URI:', uri);
      return null;
    }

    const content = await file.base64();
    return content;
  } catch (error) {
    logger.error('BankStatement', 'Failed to read file:', error, 'URI:', uri);
    return null;
  }
}

// ─── Extraction ───────────────────────────────────────────

/**
 * Extract subscriptions from bank statement using GPT-4o-mini
 * 
 * Now includes: file validation, usage limits, and enhanced extraction.
 */
export async function extractSubscriptionsFromStatement(
  fileUri: string,
  mimeType: string
): Promise<ExtractionResult> {
  try {
    // Step 1: Check usage limits
    const limits = await checkScanLimits();
    if (!limits.allowed) {
      return { success: false, subscriptions: [], error: limits.error };
    }

    // Step 2: Read file as base64
    const base64Content = await readFileAsBase64(fileUri);
    if (!base64Content) {
      return { success: false, subscriptions: [], error: 'Failed to read file' };
    }

    // Step 3: Validate file
    const validation = validateFile(base64Content, mimeType);
    if (!validation.valid) {
      return { success: false, subscriptions: [], error: validation.error };
    }

    // Step 4: Record the scan
    await recordScan();

    // Step 5: Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('extract-bank-statement', {
      body: {
        fileBase64: base64Content,
        mimeType,
      },
    });

    if (error) {
      logger.error('BankStatement', 'Edge function error:', error);
      // Extract user-friendly error message from the Edge Function response if available
      let errorMessage: string;
      if (data?.error && typeof data.error === 'string') {
        errorMessage = data.error;
      } else if (error.message?.includes('non-2xx')) {
        errorMessage = 'The analysis service is temporarily unavailable. Please try again later.';
      } else {
        errorMessage = error.message || 'Failed to analyze the document. Please try again.';
      }
      return {
        success: false,
        subscriptions: [],
        error: errorMessage,
      };
    }

    if (!data?.subscriptions || !Array.isArray(data.subscriptions)) {
      return { 
        success: false, 
        subscriptions: [], 
        error: 'Invalid response from extraction service' 
      };
    }

    // Step 6: Validate and clean results
    const subscriptions: ExtractedSubscription[] = data.subscriptions
      .filter((s: any) => 
        s.name && 
        typeof s.amount === 'number' && 
        s.amount > 0 &&
        s.confidence >= 0.6  // Only return ≥ 0.60 confidence
      )
      .map((s: any) => ({
        name: String(s.name),
        amount: Number(s.amount),
        currency: String(s.currency || 'TRY'),
        cycle: validateCycle(s.cycle),
        confidence: Math.min(1, Math.max(0, Number(s.confidence))),
        merchantName: s.merchantName || undefined,
        lastChargeDate: s.lastChargeDate || undefined,
        occurrenceCount: s.occurrenceCount || 1,
        chargedDates: s.chargedDates || [],
        isRecurring: s.isRecurring || false,
        potentialNew: s.potentialNew || false,
      }));

    return {
      success: true,
      subscriptions,
      tokensUsed: data.tokensUsed || 0,
      monthsCovered: data.monthsCovered || 1,
    };
  } catch (error: any) {
    logger.error('BankStatement', 'Extraction error:', error);
    return { success: false, subscriptions: [], error: error.message };
  }
}

// ─── Helpers ──────────────────────────────────────────────

/**
 * Validate billing cycle value
 */
function validateCycle(cycle: string): 'weekly' | 'monthly' | 'quarterly' | 'yearly' {
  const valid = ['weekly', 'monthly', 'quarterly', 'yearly'];
  return valid.includes(cycle) ? cycle as any : 'monthly';
}
