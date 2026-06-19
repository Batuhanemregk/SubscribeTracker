/**
 * Services Barrel Export
 */

export {
  signInWithGoogle,
  signInWithApple,
  isAppleSignInAvailable,
  deleteAccount,
  signOut,
  getCurrentUser,
  isSignedIn,
  type AuthUser,
  type AuthResult,
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
  initializeAds,
  loadInterstitialAd,
  showInterstitialAd,
  isInterstitialReady,
  getBannerAdUnitId,
  AdSizes,
  cleanupAds,
} from './AdMobService';

export {
  initAdManager,
  showAfterFirstSubscriptionAd,
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
  getProStatus,
  getOfferings,
  purchasePackage,
  restorePurchases,
  logoutUser,
  addProStatusListener,
  formatPackagePrice,
  getPackageType,
  openManageSubscriptions,
  getActiveSubscriptionInfo,
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
