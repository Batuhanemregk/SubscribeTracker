/**
 * Bundle Detection Algorithm
 * Identifies opportunities to save money by switching to service bundles
 */
import type { Subscription } from '../types';
import { toMonthlyAmount } from './calculations';
import knownServicesData from '../data/known-services.json';

// Types
export interface Bundle {
  id: string;
  name: string;
  services: string[];
  bundlePrice: number;
  currency: string;
  cycle: string;
  url: string;
  description: string;
}

export interface BundleSuggestion {
  bundle: Bundle;
  matchedServices: string[];
  matchedServiceIds: string[];
  currentTotal: number;
  bundlePrice: number;
  monthlySavings: number;
  yearlySavings: number;
  matchPercentage: number;
}

/**
 * Normalize a service name for fuzzy matching
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[+\-_.,!@#$%^&*()]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * Load bundles from known-services.json
 */
export function loadBundles(): Bundle[] {
  const data = knownServicesData as { services: unknown[]; bundles?: Bundle[] };
  return data.bundles || [];
}

/**
 * Match a subscription to a service ID from the bundle definition
 */
function matchesServiceId(subscription: Subscription, serviceId: string): boolean {
  const normalizedSubName = normalizeName(subscription.name);
  const normalizedServiceId = normalizeName(serviceId.replace(/-/g, ''));

  // Direct ID match
  if (normalizedSubName === normalizedServiceId) return true;

  // Service name contains the ID pattern
  if (normalizedSubName.includes(normalizedServiceId)) return true;
  if (normalizedServiceId.includes(normalizedSubName)) return true;

  // Common name mappings
  const nameMap: Record<string, string[]> = {
    'disneyplus': ['disney+', 'disney plus', 'disneyplus'],
    'hulu': ['hulu'],
    'espnplus': ['espn+', 'espn plus', 'espnplus'],
    'applemusic': ['apple music', 'applemusic'],
    'appletvplus': ['apple tv+', 'apple tv plus', 'appletv+', 'appletv'],
    'applearcade': ['apple arcade', 'applearcade'],
    'icloud': ['icloud', 'icloud+'],
    'youtubepremium': ['youtube premium', 'yt premium', 'youtubepremium'],
    'microsoft365': ['microsoft 365', 'office 365', 'microsoft365', 'office365', 'ms 365'],
    'amazonprime': ['amazon prime', 'prime', 'amazonprime'],
    'hbomax': ['hbo max', 'max', 'hbo', 'hbomax'],
  };

  const normalizedId = normalizeName(serviceId.replace(/-/g, ''));
  const aliases = nameMap[normalizedId] || [];

  return aliases.some(alias => {
    const normalizedAlias = normalizeName(alias);
    return normalizedSubName === normalizedAlias || normalizedSubName.includes(normalizedAlias);
  });
}

/**
 * Detect bundle opportunities from user's subscriptions
 */
export function detectBundleOpportunities(subscriptions: Subscription[]): BundleSuggestion[] {
  const bundles = loadBundles();
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');

  if (activeSubscriptions.length === 0 || bundles.length === 0) {
    return [];
  }

  const suggestions: BundleSuggestion[] = [];

  for (const bundle of bundles) {
    const matchedServices: string[] = [];
    const matchedServiceIds: string[] = [];
    let currentTotal = 0;

    for (const serviceId of bundle.services) {
      const matchedSub = activeSubscriptions.find(sub => matchesServiceId(sub, serviceId));

      if (matchedSub) {
        matchedServices.push(matchedSub.name);
        matchedServiceIds.push(serviceId);
        currentTotal += toMonthlyAmount(matchedSub.amount, matchedSub.cycle, matchedSub.customDays);
      }
    }

    // Require at least 2 matching services
    if (matchedServices.length < 2) continue;

    const bundleMonthlyPrice = bundle.cycle === 'yearly'
      ? bundle.bundlePrice / 12
      : bundle.bundlePrice;

    const monthlySavings = currentTotal - bundleMonthlyPrice;

    // Only suggest if there are actual savings
    if (monthlySavings <= 0) continue;

    suggestions.push({
      bundle,
      matchedServices,
      matchedServiceIds,
      currentTotal: Math.round(currentTotal * 100) / 100,
      bundlePrice: bundle.bundlePrice,
      monthlySavings: Math.round(monthlySavings * 100) / 100,
      yearlySavings: Math.round(monthlySavings * 12 * 100) / 100,
      matchPercentage: Math.round((matchedServices.length / bundle.services.length) * 100),
    });
  }

  // Sort by monthly savings descending, return top 5
  return suggestions
    .sort((a, b) => b.monthlySavings - a.monthlySavings)
    .slice(0, 5);
}
