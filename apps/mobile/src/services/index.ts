/**
 * Services Barrel Export
 */

export {
  signInWithGoogle,
  signOut,
  getCurrentUser,
  isSignedIn,
  type AuthUser,
} from './AuthService';

export {
  requestNotificationPermission,
  scheduleBillingReminder,
  cancelSubscriptionReminders,
  scheduleAllReminders,
  cancelAllReminders,
  getScheduledNotificationCount,
  addNotificationResponseListener,
  sendTestNotification,
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
} from './NotificationService';

export {
  loadInterstitialAd,
  showInterstitialAd,
  isInterstitialReady,
  getBannerAdUnitId,
  AdSizes,
  cleanupAds,
} from './AdMobService';

export {
  initAdManager,
  startAppOpenAdTimer,
  cancelAppOpenAdTimer,
  showPreScanAd,
  showPaywallDismissAd,
  getAdStats,
} from './AdManager';

export {
  authenticateWithBiometrics,
  isBiometricAvailable,
  getBiometricType,
  requestBiometricEnrollment,
} from './biometricService';

export {
  pushToCloud,
  pullFromCloud,
  deleteFromCloud,
  fullSync,
} from './syncService';

export {
  initPurchases,
  isPurchasesConfigured,
  getCustomerInfo,
  checkProStatus,
  getOfferings,
  purchasePackage,
  restorePurchases,
  identifyUser,
  logoutUser,
  formatPackagePrice,
  getPackageType,
  PRODUCT_IDS,
} from './PurchaseService';

export {
  exportToCSV,
  exportToPDF,
  generateCSV,
  generatePDFHtml,
} from './ExportService';

export {
  pickBankStatement,
  readFileAsBase64,
  extractSubscriptionsFromStatement,
  validateFile,
  checkScanLimits,
  recordScan,
  getRemainingScans,
  type ExtractedSubscription,
  type ExtractionResult,
  type ValidationResult,
  type UsageLimitResult,
} from './BankStatementService';

export {
  checkCatalogUpdate,
  getServiceCatalog,
  clearCatalogCache,
  type CatalogServiceItem,
  type ServiceCatalog,
} from './CatalogService';
