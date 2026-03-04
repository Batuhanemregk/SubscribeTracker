/**
 * Utils Barrel Export
 */
export * from './calculations';
export { formatCurrency, getCurrencySymbol } from './currency';
export { matchKnownService, getFaviconUrl } from './matchKnownService';
export { findDuplicates } from './duplicateDetection';
export type { DuplicateMatch } from './duplicateDetection';
export { calculateHealthScore, getGrade, getGradeColor } from './healthScore';
export type { HealthScoreResult, HealthScoreFactor, HealthGrade } from './healthScore';
export { detectBundleOpportunities, loadBundles } from './bundleDetection';
export type { BundleSuggestion, Bundle } from './bundleDetection';
