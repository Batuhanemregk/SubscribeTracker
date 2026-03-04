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
    bankStatementScan: boolean;     // false for standard
    cloudSync: boolean;             // false for standard
    dataExport: boolean;            // false for standard
    biometricLock: boolean;         // false for standard
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
    bankStatementScan: false,
    cloudSync: false,
    dataExport: false,
    biometricLock: false,
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
    bankStatementScan: true,
    cloudSync: true,
    dataExport: true,
    biometricLock: true,
    noAds: true,
  },
};


// =============================================================================
// SUBSCRIPTION
// =============================================================================

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';
export type SubscriptionSource = 'manual' | 'detected';

export type LifecycleEventType = 'subscribed' | 'paused' | 'resumed' | 'price_changed' | 'renewed' | 'cancelled' | 'rating_changed';

export interface LifecycleEvent {
  id: string;
  type: LifecycleEventType;
  date: string;          // ISO date
  details?: string;      // e.g. "Price changed from $9.99 to $12.99"
}

export interface SubscriptionDetection {
  confidence: number;               // 0-1
  source: 'bank_statement' | 'manual';
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
  logoUrl?: string;                 // Clearbit logo URL (optional)
  status: SubscriptionStatus;
  source: SubscriptionSource;
  detection: SubscriptionDetection | null;
  cancelUrl: string | null;         // Pro only
  manageUrl: string | null;         // Pro only
  notes: string;
  customDays?: number;              // Only used when cycle === 'custom'
  isTrial: boolean;                 // Whether this is a free trial
  trialEndsAt: string | null;       // ISO date when trial converts to paid
  paymentMethod?: string;           // e.g. "Visa *4242", "PayPal"
  customReminderDays?: number[] | null; // Override global reminder days (e.g., [7, 3, 1, 0])
  lifecycle?: LifecycleEvent[];
  usageRating?: number;             // 1-5 scale (1=never use, 5=use daily)
  lastUsedAt?: string | null;       // ISO date of last manual usage log
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
  merchantName: string;
  merchantDomain: string;
  detectedAmount: number;
  detectedCurrency: string;
  detectedCycle: BillingCycle;
  suggestedNextDate?: string | null;
  confidence: number;
  evidenceSnippet?: string;
  sourceEmailId?: string;
  suggestedIcon: string;
  suggestedColor: string;
  suggestedCategory: string;
  matchedRuleName?: string | null;
  cancelUrl?: string | null;
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
  language: 'system' | 'en' | 'tr';
  notificationsEnabled: boolean;
  biometricLockEnabled: boolean;
  lastScanAt: string | null;
  onboardingCompleted: boolean;
  interstitialShownThisSession: boolean;
  dataSeeded: boolean;
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
  language: 'system',
  notificationsEnabled: true,
  biometricLockEnabled: false,
  lastScanAt: null,
  onboardingCompleted: false,
  interstitialShownThisSession: false,
  dataSeeded: false,
};

// =============================================================================
// CATEGORY DATA (for analytics)
// =============================================================================

export interface CategoryData {
  name: string;
  category?: string;
  amount: number;
  color: string;
  percentage: number;
}

// Alias for backward compatibility
export type CategoryTotal = CategoryData;

export interface MonthlyForecast {
  month: string;
  amount: number;
}

export interface CalendarDay {
  date: string;
  subscriptions: Subscription[];
  total: number;
}

export interface BillingBreakdown {
  monthly: { count: number; total: number };
  yearly: { count: number; total: number };
}

export interface AnalyticsData {
  monthlyTotal: number;
  yearlyTotal: number;
  categoryTotals: CategoryTotal[];
  forecast: MonthlyForecast[];
  potentialSavings: number;
  billingBreakdown: BillingBreakdown;
  activeCount: number;
  avgPerSubscription: number;
}
