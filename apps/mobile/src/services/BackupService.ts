/**
 * BackupService - JSON backup and restore for user data
 *
 * Provides human-readable JSON export/import for subscriptions and settings.
 * Free users can use this as an alternative to cloud sync.
 */
import * as FileSystem from 'expo-file-system';
const { cacheDirectory, writeAsStringAsync, readAsStringAsync, EncodingType } = FileSystem as any;
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import type { Subscription } from '../types';
import { logger } from './LoggerService';

const BACKUP_SCHEMA_VERSION = 1;
const APP_VERSION = '1.0.1';

export interface BackupSettings {
  currency: string;
  theme: string;
  language: string;
  notificationSettings: any;
  savedPaymentMethods: string[];
}

export interface BackupData {
  version: number;
  exportedAt: string;
  appVersion: string;
  subscriptions: Subscription[];
  settings: BackupSettings;
}

/**
 * Creates a pretty-printed JSON backup string from subscriptions and settings.
 */
export function createBackup(subscriptions: Subscription[], settings: any): string {
  const backupData: BackupData = {
    version: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    subscriptions,
    settings: {
      currency: settings?.app?.currency ?? 'USD',
      theme: settings?.app?.theme ?? 'dark',
      language: settings?.app?.language ?? 'system',
      notificationSettings: {
        notificationsEnabled: settings?.app?.notificationsEnabled ?? true,
        defaultReminderDays: settings?.defaultReminderDays ?? [1, 3],
        smartRemindersEnabled: settings?.smartRemindersEnabled ?? false,
      },
      savedPaymentMethods: settings?.savedPaymentMethods ?? [],
    },
  };

  return JSON.stringify(backupData, null, 2);
}

/**
 * Validates that a parsed JSON object is a valid Finify backup.
 * Returns the validated BackupData on success, or an error message on failure.
 */
export function validateBackup(data: any): { valid: boolean; error?: string; data?: BackupData } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'File is not a valid JSON object' };
  }

  if (typeof data.version !== 'number') {
    return { valid: false, error: 'Missing or invalid version field' };
  }

  if (data.version !== BACKUP_SCHEMA_VERSION) {
    return { valid: false, error: `Unsupported backup version: ${data.version}` };
  }

  if (!Array.isArray(data.subscriptions)) {
    return { valid: false, error: 'Missing or invalid subscriptions field' };
  }

  // Validate each subscription has required fields
  for (let i = 0; i < data.subscriptions.length; i++) {
    const sub = data.subscriptions[i];
    if (!sub || typeof sub !== 'object') {
      return { valid: false, error: `Subscription at index ${i} is not an object` };
    }
    if (typeof sub.id !== 'string' || sub.id.trim() === '') {
      return { valid: false, error: `Subscription at index ${i} is missing a valid id` };
    }
    if (typeof sub.name !== 'string' || sub.name.trim() === '') {
      return { valid: false, error: `Subscription at index ${i} is missing a valid name` };
    }
    if (typeof sub.amount !== 'number' || isNaN(sub.amount)) {
      return { valid: false, error: `Subscription "${sub.name}" has an invalid amount` };
    }
  }

  if (typeof data.exportedAt !== 'string') {
    return { valid: false, error: 'Missing or invalid exportedAt field' };
  }

  return { valid: true, data: data as BackupData };
}

/**
 * Generates a backup JSON, writes it to a temp file, and opens the system share sheet.
 * Returns true on success, false on failure.
 */
export async function shareBackup(subscriptions: Subscription[], settings: any): Promise<boolean> {
  try {
    const json = createBackup(subscriptions, settings);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `finify-backup-${dateStr}.json`;
    const filePath = `${cacheDirectory}${fileName}`;

    await writeAsStringAsync(filePath, json, {
      encoding: EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Save Finify Backup',
        UTI: 'public.json',
      });
    }

    return true;
  } catch (error: any) {
    logger.error('BackupService', 'shareBackup failed:', error);
    return false;
  }
}

/**
 * Opens a document picker for .json files, reads the selected file, and returns its content.
 * Returns null if the user cancelled or an error occurred.
 */
export async function pickBackupFile(): Promise<string | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'public.json'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return null;
    }

    const asset = result.assets?.[0];
    if (!asset?.uri) {
      return null;
    }

    const content = await readAsStringAsync(asset.uri, {
      encoding: EncodingType.UTF8,
    });

    return content;
  } catch (error: any) {
    logger.error('BackupService', 'pickBackupFile failed:', error);
    return null;
  }
}
