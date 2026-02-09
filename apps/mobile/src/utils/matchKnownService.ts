/**
 * Smart Service Matching Utility
 * 
 * Matches a subscription name (e.g., from bank statement scan) against the
 * known-services catalog to find proper icon, color, category, and logo.
 * Uses fuzzy name matching with common aliases and normalization.
 */

import knownServices from '../data/known-services.json';

interface MatchedService {
  name: string;
  icon: string;
  color: string;
  category: string;
  logoUrl: string;
}

// Pre-built lookup index: lowercase name → service
const serviceIndex = new Map<string, typeof knownServices.services[0]>();
// Also index by id and common aliases
const aliasIndex = new Map<string, typeof knownServices.services[0]>();

// Build indices on module load
for (const svc of knownServices.services) {
  serviceIndex.set(svc.name.toLowerCase(), svc);
  aliasIndex.set(svc.id.toLowerCase(), svc);
  
  // Index by domain name without TLD (e.g., "netflix" from "netflix.com")
  if (svc.domain) {
    const domainBase = svc.domain.split('.')[0].toLowerCase();
    if (!aliasIndex.has(domainBase)) {
      aliasIndex.set(domainBase, svc);
    }
  }
}

// Common name variations for fuzzy matching
const ALIASES: Record<string, string> = {
  'chatgpt': 'openai',
  'gpt': 'openai',
  'icloud': 'apple icloud',
  'apple music': 'apple music',
  'ms 365': 'microsoft 365',
  'office 365': 'microsoft 365',
  'ms office': 'microsoft 365',
  'youtube music': 'youtube music',
  'yt premium': 'youtube premium',
  'yt music': 'youtube music',
  'disney': 'disney+',
  'hbo': 'hbo max',
  'prime': 'amazon prime',
  'prime video': 'amazon prime video',
  'aws': 'amazon web services',
};

// Default color palette for unmatched subscriptions (ensures variety)
const DEFAULT_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4',
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1',
  '#D946EF', '#0EA5E9', '#84CC16', '#FB923C', '#A855F7',
];

/**
 * Match a subscription name against the known services catalog.
 * Returns the matched service data or sensible defaults.
 */
export function matchKnownService(name: string): MatchedService {
  const normalized = name.toLowerCase().trim();
  
  // 1. Exact name match
  const exactMatch = serviceIndex.get(normalized);
  if (exactMatch) {
    return {
      name: exactMatch.name,
      icon: exactMatch.icon,
      color: exactMatch.color,
      category: exactMatch.category,
      logoUrl: exactMatch.logoUrl,
    };
  }
  
  // 2. Alias match
  const aliased = ALIASES[normalized];
  if (aliased) {
    const aliasMatch = serviceIndex.get(aliased);
    if (aliasMatch) {
      return {
        name: aliasMatch.name,
        icon: aliasMatch.icon,
        color: aliasMatch.color,
        category: aliasMatch.category,
        logoUrl: aliasMatch.logoUrl,
      };
    }
  }
  
  // 3. ID / domain base match
  const idMatch = aliasIndex.get(normalized);
  if (idMatch) {
    return {
      name: idMatch.name,
      icon: idMatch.icon,
      color: idMatch.color,
      category: idMatch.category,
      logoUrl: idMatch.logoUrl,
    };
  }
  
  // 4. Contains match — check if any known service name is part of the input
  for (const [key, svc] of serviceIndex) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return {
        name: svc.name,
        icon: svc.icon,
        color: svc.color,
        category: svc.category,
        logoUrl: svc.logoUrl,
      };
    }
  }
  
  // 5. Partial word match — split both names and compare words
  const inputWords = normalized.split(/[\s\-\_\.\*]+/).filter(Boolean);
  for (const [key, svc] of serviceIndex) {
    const svcWords = key.split(/[\s\-\_\.]+/).filter(Boolean);
    const commonWords = inputWords.filter(w => svcWords.some(sw => sw.includes(w) || w.includes(sw)));
    if (commonWords.length > 0 && commonWords[0].length >= 3) {
      return {
        name: svc.name,
        icon: svc.icon,
        color: svc.color,
        category: svc.category,
        logoUrl: svc.logoUrl,
      };
    }
  }
  
  // 6. No match — return defaults with a deterministic color based on name hash
  const hash = normalized.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const defaultColor = DEFAULT_COLORS[hash % DEFAULT_COLORS.length];
  
  return {
    name,
    icon: '💳',
    color: defaultColor,
    category: 'Other',
    logoUrl: '',
  };
}

/**
 * Generate a favicon URL from a service name as a fallback logo.
 * Uses Google's favicon API.
 */
export function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}
