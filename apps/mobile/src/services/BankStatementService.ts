/**
 * Bank Statement Scanning Service
 *
 * Extracts subscription information from bank/card statements via the
 * `extract-bank-statement` Edge Function (OpenAI Responses API, gpt-5-mini).
 * Pro-only feature.
 *
 * Flow:
 * 1. User uploads PDF/image of a statement
 * 2. Check usage limits (rate limiting)
 * 3. Read file as base64 + validate (type, size, magic bytes)
 * 4. Send to the Edge Function, which validates / confidence-gates / groups
 *    subscriptions SERVER-SIDE and returns a { ok, ... } envelope
 * 5. Map any error code to a localized message; return grouped subscriptions
 *
 * The server already deduplicates and confidence-gates, so this service does NOT
 * filter by confidence anymore — it only does a thin sanity sanitization.
 *
 * Privacy: raw statement content is NOT stored. Base64 is sent to the Edge
 * Function and discarded; only derived subscription fields are kept.
 */
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { t } from '../i18n';

// ─── Usage Limits ─────────────────────────────────────────
const SCAN_USAGE_KEY = 'bank_scan_usage';
const MAX_SCANS_PER_DAY = 100;
const MAX_SCANS_PER_MONTH = 30;
const COOLDOWN_MS = 30_000; // 30 seconds between scans

// ─── File Limits ──────────────────────────────────────────
const MAX_FILE_SIZE_MB = 10;
const MIN_FILE_SIZE_KB = 5;

// ─── Types ────────────────────────────────────────────────
export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/**
 * One subscription as grouped/deduped by the Edge Function. Fields below mirror
 * the server `GroupedSubscription` contract.
 */
export interface ExtractedSubscription {
  name: string;
  amount: number;
  currency: string;
  cycle: BillingCycle;
  confidence: number; // 0-1
  merchantName?: string;
  lastChargeDate?: string;
  occurrenceCount?: number;
  chargedDates?: string[];
  /** false when the server could not confirm the cycle → UI asks user to verify. */
  cycleInferred?: boolean;
}

export interface ExtractionResult {
  success: boolean;
  subscriptions: ExtractedSubscription[];
  error?: string;
  /** i18n key for the error, so the UI can localize it. */
  errorKey?: string;
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
  } catch {}
  
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
    console.error('Document picker error:', error);
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
    console.error('Gallery picker error:', error);
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
      console.error('File does not exist at URI:', uri);
      return null;
    }

    const content = await file.base64();
    return content;
  } catch (error) {
    console.error('Failed to read file:', error, 'URI:', uri);
    return null;
  }
}

// ─── Extraction ───────────────────────────────────────────

/** Map the Edge Function's errorCode to a localized i18n key. */
const ERROR_CODE_KEYS: Record<string, string> = {
  NOT_A_STATEMENT: 'bankScan.errors.notAStatement',
  UNREADABLE: 'bankScan.errors.unreadable',
  PARSE: 'bankScan.errors.serviceError',
  RATE_LIMITED: 'bankScan.errors.rateLimited',
  UPSTREAM_BUSY: 'bankScan.errors.serviceBusy',
  UPSTREAM_ERROR: 'bankScan.errors.serviceError',
  CONFIG: 'bankScan.errors.serviceError',
  BAD_REQUEST: 'bankScan.errors.serviceError',
};

function serviceError(): ExtractionResult {
  return {
    success: false,
    subscriptions: [],
    error: t('bankScan.errors.serviceError'),
    errorKey: 'bankScan.errors.serviceError',
  };
}

/**
 * Extract subscriptions from a bank/card statement.
 *
 * The Edge Function does all confidence gating, dedup and grouping, then returns
 * a { ok, ... } envelope. This client only validates the file, maps errors to
 * localized messages, and lightly sanitizes the grouped results.
 */
export async function extractSubscriptionsFromStatement(
  fileUri: string,
  mimeType: string
): Promise<ExtractionResult> {
  try {
    // Step 1: Client-side rate limit
    const limits = await checkScanLimits();
    if (!limits.allowed) {
      return { success: false, subscriptions: [], error: limits.error, errorKey: limits.errorKey };
    }

    // Step 2: Read file as base64
    const base64Content = await readFileAsBase64(fileUri);
    if (!base64Content) return serviceError();

    // Step 3: Validate file (type, size, magic bytes)
    const validation = validateFile(base64Content, mimeType);
    if (!validation.valid) {
      return { success: false, subscriptions: [], error: validation.error, errorKey: validation.errorKey };
    }

    // Step 4: Call the Edge Function. We record the scan AFTER we know the
    // outcome so transient failures don't burn the user's quota.
    const { data, error } = await supabase.functions.invoke('extract-bank-statement', {
      body: { fileBase64: base64Content, mimeType },
    });

    // Transport / platform failure (network, function crash, timeout)
    if (error) {
      console.error('Edge function transport error:', error.message);
      // A 504 means the Edge Function hit the ~150s gateway timeout — almost
      // always a very large statement. Guide the user to a shorter period.
      const status = (error as any)?.context?.status;
      const message = String((error as any)?.message || '');
      if (status === 504 || /timeout|timed out|504/i.test(message)) {
        return {
          success: false,
          subscriptions: [],
          error: t('bankScan.errors.tooLargeTimeout'),
          errorKey: 'bankScan.errors.tooLargeTimeout',
        };
      }
      return serviceError();
    }
    if (!data || typeof data !== 'object') return serviceError();

    // Business failure envelope
    if (data.ok === false) {
      const code = String(data.errorCode || 'UPSTREAM_ERROR');
      const errorKey = ERROR_CODE_KEYS[code] ?? 'bankScan.errors.serviceError';
      // A "busy" signal means OpenAI was overloaded — let the user retry for free.
      if (code !== 'UPSTREAM_BUSY') await recordScan();
      return { success: false, subscriptions: [], error: t(errorKey), errorKey };
    }

    if (!Array.isArray(data.subscriptions)) return serviceError();

    // Success — count this scan against the quota.
    await recordScan();

    // Thin sanitization only; the server already validated/gated/grouped.
    const subscriptions: ExtractedSubscription[] = data.subscriptions
      .filter((s: any) => s && s.name && Number.isFinite(Number(s.amount)) && Number(s.amount) > 0)
      .map((s: any) => ({
        name: String(s.name),
        amount: Number(s.amount),
        currency: String(s.currency || 'USD'),
        cycle: coerceCycle(s.cycle),
        confidence: Math.min(1, Math.max(0, Number(s.confidence) || 0)),
        merchantName: s.merchantName || undefined,
        lastChargeDate: s.lastChargeDate || undefined,
        occurrenceCount: Number(s.occurrenceCount) || 1,
        chargedDates: Array.isArray(s.chargedDates) ? s.chargedDates : [],
        cycleInferred: s.cycleInferred !== false,
      }));

    return {
      success: true,
      subscriptions,
      tokensUsed: data.tokensUsed || 0,
      monthsCovered: data.monthsCovered || 1,
    };
  } catch (error: any) {
    console.error('Extraction error:', error?.message);
    return serviceError();
  }
}

// ─── Helpers ──────────────────────────────────────────────

const VALID_CYCLES: BillingCycle[] = ['weekly', 'monthly', 'quarterly', 'yearly'];

/** Trust the server's cycle enum, but guard against anything unexpected. */
function coerceCycle(cycle: unknown): BillingCycle {
  return typeof cycle === 'string' && (VALID_CYCLES as string[]).includes(cycle)
    ? (cycle as BillingCycle)
    : 'monthly';
}
