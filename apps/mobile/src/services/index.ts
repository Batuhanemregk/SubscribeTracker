/**
 * Services Barrel Export
 */
export { 
  ScanService, 
  scanService,
  findServiceByDomain,
  isSubscriptionEmail,
  extractAmount,
  detectBillingCycle,
  calculateConfidence,
  createCandidate,
  KNOWN_SERVICES,
  CATEGORIES,
} from './DetectionService';

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
  authenticate,
  authenticateWithGoogle,
  authenticateWithMicrosoft,
  revokeGoogleToken,
  getRedirectUri,
  type OAuthProvider,
  type OAuthResult,
} from './OAuthService';

export {
  loadInterstitialAd,
  showInterstitialAd,
  isInterstitialReady,
  getBannerAdUnitId,
  AdSizes,
  cleanupAds,
} from './AdMobService';
