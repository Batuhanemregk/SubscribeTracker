/**
 * Core Data Types
 * Based on approved implementation plan
 */

// =============================================================================
// USER PLAN & ENTITLEMENTS
// =============================================================================

export type PlanTier = 'standard' | 'pro';

export interface UserPlan {
  tier: PlanTier;
  purchasedAt: string | null;
  expiresAt: string | null;
  trialEndsAt: string | null;
  isTrialActive: boolean;
  entitlements: {
    maxEmailAccounts: number;       // 1 for standard, 5 for pro
    dailyScan: boolean;             // false for standard
    bodyParsing: boolean;           // false for standard
    autoFillPricing: boolean;       // false for standard
    priceAlerts: boolean;           // false for standard
    noAds: boolean;                 // false for standard
  };
}

// Default plans
export const DEFAULT_STANDARD_PLAN: UserPlan = {
  tier: 'standard',
  purchasedAt: null,
  expiresAt: null,
  trialEndsAt: null,
  isTrialActive: false,
  entitlements: {
    maxEmailAccounts: 1,
    dailyScan: false,
    bodyParsing: false,
    autoFillPricing: false,
    priceAlerts: false,
    noAds: false,
  },
};

export const DEFAULT_PRO_PLAN: UserPlan = {
  tier: 'pro',
  purchasedAt: null,
  expiresAt: null,
  trialEndsAt: null,
  isTrialActive: false,
  entitlements: {
    maxEmailAccounts: 5,
    dailyScan: true,
    bodyParsing: true,
    autoFillPricing: true,
    priceAlerts: true,
    noAds: true,
  },
};

// =============================================================================
// EMAIL ACCOUNT
// =============================================================================

export type EmailProvider = 'gmail' | 'outlook'; // Apple Mail not supported
export type AccountStatus = 'active' | 'disconnected' | 'error';

export interface EmailAccount {
  id: string;
  provider: EmailProvider;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  status: AccountStatus;
  connectedAt: string;
  lastSyncAt: string | null;
}

// =============================================================================
// SUBSCRIPTION
// =============================================================================

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';
export type SubscriptionSource = 'manual' | 'detected';

export interface SubscriptionDetection {
  confidence: number;               // 0-1
  emailAccountId: string | null;
  senderDomain: string | null;
  lastSeenMessageId: string | null;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;                 // 'USD', 'TRY', 'EUR'
  cycle: BillingCycle;
  nextBillingDate: string;          // ISO date
  category: string;
  iconKey: string;                  // emoji or icon name
  colorKey: string;                 // hex color
  status: SubscriptionStatus;
  source: SubscriptionSource;
  detection: SubscriptionDetection | null;
  cancelUrl: string | null;         // Pro only
  manageUrl: string | null;         // Pro only
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// PAYMENT HISTORY
// =============================================================================

export type PaymentStatus = 'completed' | 'pending' | 'failed';
export type PaymentSource = 'detected' | 'manual' | 'projected';

export interface PaymentHistoryItem {
  id: string;
  subscriptionId: string;
  date: string;                     // ISO date
  amount: number;
  currency: string;
  status: PaymentStatus;
  source: PaymentSource;
}

// =============================================================================
// SCAN JOB
// =============================================================================

export type ScanStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type ScanPhase = 'fetching' | 'analyzing' | 'detecting' | 'done';
export type ScanType = 'manual' | 'scheduled';

export interface ScanProgress {
  phase: ScanPhase;
  emailsFetched: number;
  emailsAnalyzed: number;
  candidatesFound: number;
  subscriptionsDetected: number;
}

export interface ScanJob {
  id: string;
  status: ScanStatus;
  startedAt: string;
  endedAt: string | null;
  type: ScanType;
  emailAccountIds: string[];
  progress: ScanProgress;
  error: string | null;
}

// =============================================================================
// ALERT
// =============================================================================

export type AlertType = 
  | 'price_increase' 
  | 'price_decrease' 
  | 'plan_change' 
  | 'expiring_soon' 
  | 'payment_due';

export interface AlertData {
  oldValue?: number;
  newValue?: number;
  daysRemaining?: number;
}

export interface Alert {
  id: string;
  type: AlertType;
  subscriptionId: string;
  title: string;
  message: string;
  data: AlertData;
  isRead: boolean;
  createdAt: string;
}

// =============================================================================
// DETECTION CANDIDATE
// =============================================================================

export type CandidateStatus = 'pending' | 'confirmed' | 'dismissed';

export interface DetectionCandidate {
  id: string;
  scanJobId: string;
  name: string;
  suggestedAmount: number | null;   // Pro only
  suggestedCurrency: string | null;
  suggestedCycle: BillingCycle | null;
  suggestedNextDate: string | null;
  confidence: number;
  senderDomain: string;
  senderName: string;
  matchedRuleName: string | null;
  cancelUrl: string | null;         // Pro only
  status: CandidateStatus;
  createdAt: string;
}

// =============================================================================
// SETTINGS
// =============================================================================

export type ThemeMode = 'dark' | 'light' | 'system';

export interface BudgetSettings {
  monthlyLimit: number;
  currency: string;
  alertThreshold: number;           // 0.8 = alert at 80%
  isEnabled: boolean;
}

export interface AppSettings {
  theme: ThemeMode;
  currency: string;
  notificationsEnabled: boolean;
  biometricLockEnabled: boolean;
  lastScanAt: string | null;
  onboardingCompleted: boolean;
  interstitialShownThisSession: boolean;
}

// Default settings
export const DEFAULT_BUDGET_SETTINGS: BudgetSettings = {
  monthlyLimit: 100,
  currency: 'USD',
  alertThreshold: 0.8,
  isEnabled: false,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'dark',
  currency: 'USD',
  notificationsEnabled: true,
  biometricLockEnabled: false,
  lastScanAt: null,
  onboardingCompleted: false,
  interstitialShownThisSession: false,
};

// =============================================================================
// CATEGORY DATA (for analytics)
// =============================================================================

export interface CategoryData {
  name: string;
  amount: number;
  color: string;
  percentage: number;
}
