/**
 * CatalogService - Remote service catalog auto-update
 *
 * Checks Supabase for updated service catalog data and syncs locally.
 * Falls back to bundled known-services.json when offline.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import bundledCatalog from '../data/known-services.json';
import type { Subscription } from '../types';
import { logger } from './LoggerService';

const CATALOG_STORAGE_KEY = 'service_catalog_cache';
const CATALOG_VERSION_KEY = 'service_catalog_version';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const LAST_CHECK_KEY = 'service_catalog_last_check';

export interface CatalogServiceItem {
  id: string;
  name: string;
  domain: string;
  logoUrl?: string;
  category: string;
  icon: string;
  color: string;
  plans?: Array<{ id: string; name: string; price: number; cycle: string }>;
}

export interface ServiceCatalog {
  version: string;
  lastUpdated: string;
  services: CatalogServiceItem[];
}

/** Raw Supabase row shape */
interface ServiceCatalogRow {
  id: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  category: string | null;
  icon: string | null;
  color: string | null;
  plans: unknown;
  updated_at: string | null;
}

/**
 * Get the active service catalog (cached remote or bundled fallback)
 */
export async function getServiceCatalog(): Promise<ServiceCatalog> {
  try {
    const cached = await AsyncStorage.getItem(CATALOG_STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached) as ServiceCatalog;
    }
  } catch (error) {
    logger.warn('Catalog', 'Failed to read cached catalog:', error);
  }
  
  return {
    version: bundledCatalog.version,
    lastUpdated: bundledCatalog.lastUpdated,
    services: bundledCatalog.services as unknown as CatalogServiceItem[],
  };
}

/**
 * Check if enough time has passed since last check
 */
async function shouldCheckForUpdate(): Promise<boolean> {
  try {
    const lastCheck = await AsyncStorage.getItem(LAST_CHECK_KEY);
    if (!lastCheck) return true;
    
    const elapsed = Date.now() - parseInt(lastCheck, 10);
    return elapsed >= CHECK_INTERVAL_MS;
  } catch {
    return true;
  }
}

/**
 * Check for catalog updates from Supabase and download if newer
 * Call this on app startup (non-blocking)
 */
export async function checkCatalogUpdate(): Promise<boolean> {
  try {
    // Throttle: only check once per 24h
    if (!(await shouldCheckForUpdate())) {
      return false;
    }

    await AsyncStorage.setItem(LAST_CHECK_KEY, Date.now().toString());

    // Get remote catalog — use explicit type assertion since table may not be in generated types yet
    const { data, error } = await supabase
      .from('service_catalog')
      .select('id, name, domain, logo_url, category, icon, color, plans, updated_at')
      .order('name', { ascending: true });

    const remoteServices = data as unknown as ServiceCatalogRow[] | null;

    if (error || !remoteServices || remoteServices.length === 0) {
      logger.info('Catalog', 'No remote data or error, using local');
      return false;
    }

    // Find the latest updated_at as version
    const latestUpdate = remoteServices.reduce((max, s) => {
      const ts = new Date(s.updated_at || 0).getTime();
      return ts > max ? ts : max;
    }, 0);

    const remoteVersion = new Date(latestUpdate).toISOString().split('T')[0];

    // Check if we already have this version
    const localVersion = await AsyncStorage.getItem(CATALOG_VERSION_KEY);
    if (localVersion === remoteVersion) {
      logger.info('Catalog', 'Already up to date');
      return false;
    }

    // Map remote data to local format
    const updatedServices: CatalogServiceItem[] = remoteServices.map((s) => ({
      id: s.id,
      name: s.name,
      domain: s.domain || '',
      logoUrl: s.logo_url || undefined,
      category: s.category || 'Other',
      icon: s.icon || '📦',
      color: s.color || '#8B5CF6',
      plans: (s.plans as CatalogServiceItem['plans']) || undefined,
    }));

    // Merge: remote services override bundled, but keep bundled ones not in remote
    const remoteIds = new Set(updatedServices.map((s) => s.id));
    const bundledServices = bundledCatalog.services as unknown as CatalogServiceItem[];
    const mergedServices = [
      ...updatedServices,
      ...bundledServices.filter((s) => !remoteIds.has(s.id)),
    ];

    const updatedCatalog: ServiceCatalog = {
      version: remoteVersion,
      lastUpdated: remoteVersion,
      services: mergedServices,
    };

    // Cache locally
    await AsyncStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(updatedCatalog));
    await AsyncStorage.setItem(CATALOG_VERSION_KEY, remoteVersion);

    logger.info('Catalog', `Updated to version ${remoteVersion} (${updatedServices.length} remote + ${mergedServices.length - updatedServices.length} bundled)`);
    return true;
  } catch (error) {
    logger.warn('Catalog', 'Update check failed:', error);
    return false;
  }
}

/**
 * Force clear cached catalog (useful for debugging)
 */
export async function clearCatalogCache(): Promise<void> {
  await AsyncStorage.multiRemove([CATALOG_STORAGE_KEY, CATALOG_VERSION_KEY, LAST_CHECK_KEY]);
}

export interface PriceChangeAlert {
  subscriptionId: string;
  subscriptionName: string;
  oldPrice: number;
  newPrice: number;
  currency: string;
  type: 'price_increase' | 'price_decrease';
}

/**
 * Fuzzy-match a subscription name against a catalog service name.
 * Returns true when one string contains the other (case-insensitive).
 */
function fuzzyMatch(subName: string, catalogName: string): boolean {
  const a = subName.toLowerCase().trim();
  const b = catalogName.toLowerCase().trim();
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * Compare active subscriptions against catalog prices.
 * Returns an alert for each subscription whose amount differs from the
 * first matching catalog plan price.
 */
export function checkPriceChanges(
  subscriptions: Subscription[],
  catalog: ServiceCatalog | CatalogServiceItem[]
): PriceChangeAlert[] {
  const services: CatalogServiceItem[] = Array.isArray(catalog)
    ? catalog
    : catalog.services;

  const alerts: PriceChangeAlert[] = [];

  for (const sub of subscriptions) {
    if (sub.status !== 'active') continue;

    const matched = services.find((s) => fuzzyMatch(sub.name, s.name));
    if (!matched || !matched.plans || matched.plans.length === 0) continue;

    // Use the first plan price as the reference catalog price
    const catalogPrice = matched.plans[0].price;

    if (catalogPrice === sub.amount) continue;

    alerts.push({
      subscriptionId: sub.id,
      subscriptionName: sub.name,
      oldPrice: sub.amount,
      newPrice: catalogPrice,
      currency: sub.currency,
      type: catalogPrice > sub.amount ? 'price_increase' : 'price_decrease',
    });
  }

  return alerts;
}
