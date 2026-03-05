/**
 * Services Barrel Export
 */

export { logger } from './LoggerService';

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
  scheduleTrialReminder,
  cancelSubscriptionReminders,
  scheduleAllReminders,
  cancelAllReminders,
  getScheduledNotificationCount,
  addNotificationResponseListener,
  sendTestNotification,
  schedulePriceChangeNotification,
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
  checkPriceChanges,
  type CatalogServiceItem,
  type ServiceCatalog,
  type PriceChangeAlert,
} from './CatalogService';

export {
  requestCalendarPermission,
  getOrCreateFinifyCalendar,
  syncSubscriptionsToCalendar,
  removeFinifyCalendarEvents,
} from './CalendarSyncService';

export {
  captureFromCamera,
  pickFromGallery as pickScreenshotFromGallery,
  extractFromScreenshot,
  checkImportLimits,
  type ScreenshotImportResult,
  type ScreenshotUsageLimitResult,
  type PickImageResult,
} from './ScreenshotImportService';

export {
  createBackup,
  validateBackup,
  shareBackup,
  pickBackupFile,
  type BackupData,
  type BackupSettings,
} from './BackupService';

export {
  formatSubscriptionForShare,
  formatSubscriptionListForShare,
  shareSubscription,
  shareSubscriptionList,
} from './ShareService';

export {
  initRatingTracking,
  requestAppReview,
  recordDismissal,
  onSubscriptionAdded,
  onSuccessfulImport,
  onMonthlyReportViewed,
  onGoalReached,
} from './RatingService';

export {
  aggregateWidgetSummaryData,
  saveWidgetDataToSharedStorage,
  syncWidgetData,
  WIDGET_DATA_STORAGE_KEY,
  type WidgetSummaryData,
  type WidgetRenewalItem,
} from './WidgetDataService';
