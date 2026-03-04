/**
 * Subscription Sync Service
 * 
 * Handles syncing subscriptions between local storage and Supabase cloud.
 * Only available for Pro users.
 * 
 * Strategy: Offline-first
 * - Local storage is source of truth for fast UI
 * - Sync to cloud happens in background
 * - Conflict resolution: Last write wins (based on updated_at)
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Subscription } from '../types';
import { logger } from './LoggerService';

interface SyncResult {
  success: boolean;
  syncedCount: number;
  error?: string;
}

/**
 * Ensure the Supabase client has a valid session before making DB calls.
 * Calls getSession() which triggers auto-refresh if the token is expired.
 */
async function ensureValidSession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      logger.error('Sync', 'No valid session:', error?.message);
      return false;
    }
    return true;
  } catch (err) {
    logger.error('Sync', 'Session check failed:', err);
    return false;
  }
}

/**
 * Convert local subscription format to Supabase format
 */
function toSupabaseFormat(sub: Subscription, userId: string) {
  return {
    id: sub.id,
    user_id: userId,
    name: sub.name,
    amount: sub.amount,
    currency: sub.currency,
    cycle: sub.cycle,
    next_billing_date: sub.nextBillingDate,
    category: sub.category,
    icon_key: sub.iconKey,
    color_key: sub.colorKey,
    logo_url: sub.logoUrl || null,
    status: sub.status,
    source: sub.source,
    notes: sub.notes || null,
    updated_at: sub.updatedAt,
  };
}

/**
 * Convert Supabase format to local subscription format
 */
function toLocalFormat(row: any): Subscription {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    currency: row.currency,
    cycle: row.cycle,
    nextBillingDate: row.next_billing_date,
    category: row.category,
    iconKey: row.icon_key,
    colorKey: row.color_key,
    logoUrl: row.logo_url,
    status: row.status,
    source: row.source,
    detection: null,
    cancelUrl: null,
    manageUrl: null,
    notes: row.notes || '',
    isTrial: row.is_trial ?? false,
    trialEndsAt: row.trial_ends_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Push local subscriptions to cloud
 * Uses upsert to handle both new and updated subscriptions
 */
export async function pushToCloud(
  subscriptions: Subscription[],
  userId: string
): Promise<SyncResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, syncedCount: 0, error: 'Supabase not configured' };
  }

  try {
    // Ensure we have a valid session before making DB calls
    const hasSession = await ensureValidSession();
    if (!hasSession) {
      return { success: false, syncedCount: 0, error: 'Session expired. Please sign in again.' };
    }

    const supabaseData = subscriptions.map(sub => toSupabaseFormat(sub, userId));

    const { error } = await supabase
      .from('subscriptions')
      .upsert(supabaseData as any, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (error) {
      logger.error('Sync', 'Push to cloud failed:', error);
      return { success: false, syncedCount: 0, error: error.message };
    }

    return { success: true, syncedCount: subscriptions.length };
  } catch (err: any) {
    logger.error('Sync', 'Push to cloud error:', err);
    return { success: false, syncedCount: 0, error: err.message };
  }
}

/**
 * Pull subscriptions from cloud
 * Returns all subscriptions for the user
 */
export async function pullFromCloud(userId: string): Promise<{
  success: boolean;
  subscriptions: Subscription[];
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { success: false, subscriptions: [], error: 'Supabase not configured' };
  }

  try {
    // Ensure we have a valid session before making DB calls
    const hasSession = await ensureValidSession();
    if (!hasSession) {
      return { success: false, subscriptions: [], error: 'Session expired. Please sign in again.' };
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Sync', 'Pull from cloud failed:', error);
      return { success: false, subscriptions: [], error: error.message };
    }

    const subscriptions = (data || []).map(toLocalFormat);
    return { success: true, subscriptions };
  } catch (err: any) {
    logger.error('Sync', 'Pull from cloud error:', err);
    return { success: false, subscriptions: [], error: err.message };
  }
}

/**
 * Delete subscription from cloud
 */
export async function deleteFromCloud(subscriptionId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', subscriptionId);

    if (error) {
      logger.error('Sync', 'Delete from cloud failed:', error);
      return false;
    }

    return true;
  } catch (err) {
    logger.error('Sync', 'Delete from cloud error:', err);
    return false;
  }
}

/**
 * Full sync - merge local and cloud data
 * Conflict resolution: newer updated_at wins
 */
export async function fullSync(
  localSubscriptions: Subscription[],
  userId: string
): Promise<{
  success: boolean;
  merged: Subscription[];
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { success: false, merged: localSubscriptions, error: 'Supabase not configured' };
  }

  try {
    // 1. Pull from cloud
    const { success: pullSuccess, subscriptions: cloudSubs, error: pullError } = 
      await pullFromCloud(userId);
    
    if (!pullSuccess) {
      return { success: false, merged: localSubscriptions, error: pullError };
    }

    // 2. Merge with conflict resolution
    const merged = mergeSubscriptions(localSubscriptions, cloudSubs);

    // 3. Push merged back to cloud
    const { success: pushSuccess, error: pushError } = await pushToCloud(merged, userId);
    
    if (!pushSuccess) {
      return { success: false, merged, error: pushError };
    }

    return { success: true, merged };
  } catch (err: any) {
    logger.error('Sync', 'Full sync error:', err);
    return { success: false, merged: localSubscriptions, error: err.message };
  }
}

/**
 * Merge local and cloud subscriptions
 * Newer updated_at wins on conflict
 */
function mergeSubscriptions(
  local: Subscription[],
  cloud: Subscription[]
): Subscription[] {
  const mergedMap = new Map<string, Subscription>();

  // Add all cloud subscriptions
  for (const sub of cloud) {
    mergedMap.set(sub.id, sub);
  }

  // Merge local subscriptions (newer wins)
  for (const localSub of local) {
    const cloudSub = mergedMap.get(localSub.id);
    
    if (!cloudSub) {
      // Only in local, add it
      mergedMap.set(localSub.id, localSub);
    } else {
      // Both exist, compare timestamps
      const localTime = new Date(localSub.updatedAt).getTime();
      const cloudTime = new Date(cloudSub.updatedAt).getTime();
      
      if (localTime > cloudTime) {
        mergedMap.set(localSub.id, localSub);
      }
      // else cloud version is newer, already in map
    }
  }

  return Array.from(mergedMap.values());
}
