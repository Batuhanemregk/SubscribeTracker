/**
 * Screen render smoke tests
 * Verifies that every screen renders without crashing.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Theme mock
// ---------------------------------------------------------------------------
const mockColors = {
  primary: '#8B5CF6', primaryLight: '#A78BFA', primaryDark: '#7C3AED',
  emerald: '#10B981', amber: '#F59E0B', red: '#EF4444', pink: '#EC4899',
  cyan: '#06B6D4', orange: '#F97316',
  bg: '#0D0D12', bgCard: '#1A1A24', bgElevated: '#252532',
  border: '#2D2D3A', borderLight: '#3D3D4A',
  text: '#FFFFFF', textSecondary: '#E5E5E5', textMuted: '#9CA3AF', textDisabled: '#6B7280',
  gradients: { primary: ['#8B5CF6', '#6366F1'], emerald: ['#10B981', '#059669'], sunset: ['#F59E0B', '#EC4899'], ocean: ['#06B6D4', '#3B82F6'], card: ['#1A1A24', '#252532'] },
  categoryColors: { Entertainment: '#EC4899', Development: '#8B5CF6', Design: '#F59E0B', Productivity: '#10B981', Music: '#06B6D4', Storage: '#3B82F6', Finance: '#F97316', Health: '#22C55E', Education: '#A855F7', Other: '#6B7280' },
};

jest.mock('@/theme', () => ({
  useTheme: () => ({ colors: mockColors, isDark: true, mode: 'dark', canUseLight: false, accentColor: 'purple', amoledMode: false }),
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, '2xl': 20 },
  layout: { padding: 16 },
  shadows: { button: {} },
  createGlow: () => ({}),
  createShadow: () => ({}),
  ACCENT_COLORS: { purple: { primary: '#8B5CF6' } },
  colors: mockColors,
}));

jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({ colors: mockColors, isDark: true }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn(),
  useIsFocused: () => true,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }: any) => children,
  SafeAreaProvider: ({ children }: any) => children,
}));

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (props: any) => <View testID={`icon-${props.name}`} {...props} /> };
});

jest.mock('@/i18n', () => ({
  t: (key: string) => key,
  getLocale: () => 'en',
  setLocale: jest.fn(),
}));

// ---------------------------------------------------------------------------
// State mocks — Zustand selector pattern helper (must be inlined in factories)
// ---------------------------------------------------------------------------
const mockSubscriptions: any[] = [];

const mockSubscriptionState: Record<string, any> = {
  subscriptions: mockSubscriptions,
  getActiveSubscriptions: () => mockSubscriptions,
  setSubscriptions: jest.fn(),
  addSubscription: jest.fn(),
  deleteSubscription: jest.fn(),
  updateSubscription: jest.fn(),
  pauseSubscription: jest.fn(),
  resumeSubscription: jest.fn(),
  getSubscriptionById: () => undefined,
  updateUsageRating: jest.fn(),
  logUsage: jest.fn(),
  updateNotes: jest.fn(),
  calculateMonthlyTotalConverted: () => 0,
  calculateYearlyTotalConverted: () => 0,
};

const mockSettingsState: Record<string, any> = {
  app: { currency: 'USD', theme: 'dark', language: 'en', notifications: true },
  budget: { monthlyLimit: 100, enabled: true },
  setNotifications: jest.fn(),
  setBiometricLock: jest.fn(),
  resetToDefaults: jest.fn(),
  setCurrency: jest.fn(),
  setTheme: jest.fn(),
  setLanguage: jest.fn(),
  setDataSeeded: jest.fn(),
  setBudgetLimit: jest.fn(),
  setBudgetEnabled: jest.fn(),
  calendarSyncEnabled: false,
  lastCalendarSync: null,
  setCalendarSync: jest.fn(),
  updateLastCalendarSync: jest.fn(),
  defaultReminderDays: [1, 3],
  setDefaultReminderDays: jest.fn(),
  smartRemindersEnabled: false,
  setSmartRemindersEnabled: jest.fn(),
  lastBackupDate: null,
  setLastBackupDate: jest.fn(),
  showCurrencyConversion: false,
  setShowCurrencyConversion: jest.fn(),
  accentColor: 'purple',
  setAccentColor: jest.fn(),
  amoledMode: false,
  setAmoledMode: jest.fn(),
  customCategories: [],
  addCustomCategory: jest.fn(),
  removeCustomCategory: jest.fn(),
  updateCustomCategory: jest.fn(),
  getAllCategories: () => [
    { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#EC4899' },
    { id: 'music', name: 'Music', icon: '🎵', color: '#06B6D4' },
    { id: 'productivity', name: 'Productivity', icon: '⚡', color: '#10B981' },
    { id: 'other', name: 'Other', icon: '📦', color: '#6B7280' },
  ],
  savedPaymentMethods: [],
  addPaymentMethod: jest.fn(),
};

const mockPlanState: Record<string, any> = {
  plan: 'standard',
  isPro: () => false,
  isTrialActive: () => false,
  downgradeToStandard: jest.fn(),
  shouldShowAds: () => false,
};

const mockCurrencyState: Record<string, any> = {
  convert: (amount: number) => amount,
  rates: {},
  lastFetched: null,
  fetchRates: jest.fn(),
};

/**
 * Helper to make a Zustand-compatible mock supporting both `useStore()` and `useStore(selector)`.
 * Because jest.mock factories are hoisted, we reference the `mock*` variables lazily.
 */
function mockMakeStore(getState: () => Record<string, any>) {
  return (selectorOrVoid?: (s: any) => any) => {
    const state = getState();
    if (typeof selectorOrVoid === 'function') {
      return selectorOrVoid(state);
    }
    return state;
  };
}

jest.mock('@/state', () => ({
  useSubscriptionStore: mockMakeStore(() => mockSubscriptionState),
  useSettingsStore: mockMakeStore(() => mockSettingsState),
  usePlanStore: mockMakeStore(() => mockPlanState),
  useCurrencyStore: mockMakeStore(() => mockCurrencyState),
  useAccountStore: () => ({
    account: null,
    isSignedIn: () => false,
  }),
  generateId: () => 'test-id',
  createSubscription: (data: any) => ({ id: 'test-id', ...data }),
  migrateSubscriptionIds: jest.fn(),
  isValidUUID: () => true,
}));

jest.mock('@/state/stores/subscriptionStore', () => ({
  useSubscriptionStore: mockMakeStore(() => mockSubscriptionState),
  createSubscription: (data: any) => ({ id: 'test-id', ...data }),
  generateId: () => 'test-id',
}));

jest.mock('@/state/stores/settingsStore', () => ({
  useSettingsStore: mockMakeStore(() => mockSettingsState),
}));

// ---------------------------------------------------------------------------
// Services mock
// ---------------------------------------------------------------------------
jest.mock('@/services', () => ({
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
  sendTestNotification: jest.fn(),
  scheduleAllReminders: jest.fn(),
  requestBiometricEnrollment: jest.fn(),
  identifyUser: jest.fn(),
  logoutUser: jest.fn(),
  requestCalendarPermission: jest.fn(),
  syncSubscriptionsToCalendar: jest.fn(),
  removeFinifyCalendarEvents: jest.fn(),
  shareBackup: jest.fn(),
  pickBackupFile: jest.fn(),
  validateBackup: jest.fn(),
  shareSubscriptionList: jest.fn(),
  showAfterFirstSubscriptionAd: jest.fn(),
  showPaywallDismissAd: jest.fn(),
  showPreScanAd: jest.fn(),
  getOfferings: jest.fn().mockResolvedValue({ current: null }),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  formatPackagePrice: jest.fn(),
  getPackageType: jest.fn(),
  isPurchasesConfigured: jest.fn().mockReturnValue(false),
  PRODUCT_IDS: {},
  requestNotificationPermission: jest.fn().mockResolvedValue(true),
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/services/LoggerService', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/services/AdMobService', () => ({
  shouldShowAds: () => false,
  areAdsAvailable: () => false,
  getBannerAdUnitId: () => 'test-banner-id',
  loadInterstitialAd: jest.fn(),
  showInterstitialAd: jest.fn().mockResolvedValue(false),
  isInterstitialReady: () => false,
  cleanupAds: jest.fn(),
  AdSizes: {},
}));

jest.mock('@/services/CatalogService', () => ({
  getServiceCatalog: jest.fn().mockReturnValue({ services: [] }),
  checkPriceChanges: jest.fn().mockReturnValue([]),
}));

jest.mock('@/services/ShareService', () => ({
  shareSubscription: jest.fn(),
  shareSubscriptionList: jest.fn(),
}));

jest.mock('@/services/RatingService', () => ({
  onGoalReached: jest.fn().mockResolvedValue(undefined),
  onMonthlyReportViewed: jest.fn().mockResolvedValue(undefined),
  onSubscriptionAdded: jest.fn().mockResolvedValue(undefined),
  onSuccessfulImport: jest.fn().mockResolvedValue(undefined),
  initRatingTracking: jest.fn(),
}));

jest.mock('@/services/ScreenshotImportService', () => ({
  captureFromCamera: jest.fn(),
  pickFromGallery: jest.fn(),
  extractFromScreenshot: jest.fn(),
}));

jest.mock('@/services/BankStatementService', () => ({
  pickBankStatement: jest.fn(),
  pickFromGallery: jest.fn(),
  readFileAsBase64: jest.fn(),
  extractSubscriptionsFromStatement: jest.fn(),
  validateFile: jest.fn().mockReturnValue({ valid: true }),
  checkScanLimits: jest.fn().mockResolvedValue({ allowed: true, reason: null }),
  recordScan: jest.fn(),
  getRemainingScans: jest.fn().mockResolvedValue({ today: 3, month: 10 }),
}));

// ---------------------------------------------------------------------------
// Mock data files
// ---------------------------------------------------------------------------
jest.mock('@/data/known-services.json', () => ({
  services: [],
  categories: [{ name: 'Entertainment' }, { name: 'Music' }, { name: 'Productivity' }],
  bundles: [],
}));

jest.mock('@/data/seed', () => ({
  SEED_SUBSCRIPTIONS: [],
}));

// ---------------------------------------------------------------------------
// Mock utils — formatCurrency must handle undefined/null gracefully
// ---------------------------------------------------------------------------
jest.mock('@/utils', () => ({
  formatCurrency: (amount: any, _currency?: string) => {
    if (amount == null || typeof amount !== 'number') return '$0.00';
    return `$${amount.toFixed(2)}`;
  },
  getCurrencySymbol: () => '$',
  findNextUpcomingPayment: () => null,
  formatBillingDate: () => 'Jan 1',
  advanceToNextBillingDate: jest.fn(),
  getSpendingByCategory: () => [],
  getForecastData: () => [],
  calculatePotentialSavings: () => 0,
  getBillingCycleBreakdown: () => ({
    monthly: { count: 0, total: 0 },
    yearly: { count: 0, total: 0 },
    weekly: { count: 0, total: 0 },
    quarterly: { count: 0, total: 0 },
  }),
  getMonthlySpendingTrend: () => [],
  getMonthOverMonthChange: () => 0,
  predictNextMonthSpending: () => 0,
  getWastefulSubscriptions: () => [],
  calculateValueScore: () => 50,
  getValueLabel: () => 'Good',
  getValueColor: () => '#10B981',
  toMonthlyAmount: (amount: number) => amount,
  getAlternativeSuggestions: () => [],
  calculateHealthScore: () => ({ score: 75, grade: 'B', factors: [] }),
  detectBundleOpportunities: () => [],
  getBudgetStatus: () => ({ status: 'good', percentage: 50 }),
  getUpcomingPayments: () => [],
  getDaysUntilBilling: () => 5,
  getMonthSubscriptionMap: () => new Map(),
  matchKnownService: () => null,
  findDuplicates: () => [],
  groupSubscriptionsByDate: () => [],
  calculateUpcomingTotal: () => 0,
}));

jest.mock('@/utils/calculations', () => ({
  toMonthlyAmount: (amount: number) => amount,
}));

jest.mock('@/utils/currency', () => ({
  formatCurrency: (amount: any, _currency?: string) => {
    if (amount == null || typeof amount !== 'number') return '$0.00';
    return `$${amount.toFixed(2)}`;
  },
  getCurrencySymbol: () => '$',
}));

jest.mock('@/utils/statementAnalyzer', () => ({
  analyzeStatement: jest.fn().mockReturnValue([]),
}));

// ---------------------------------------------------------------------------
// Component mocks (ScanBanner uses AsyncStorage internally)
// ---------------------------------------------------------------------------
jest.mock('@/components/ScanBanner', () => ({
  ScanBanner: () => null,
  markScanCompleted: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Chart mock
// ---------------------------------------------------------------------------
jest.mock('react-native-gifted-charts', () => {
  const { View } = require('react-native');
  return {
    LineChart: (props: any) => <View testID="line-chart" />,
    BarChart: (props: any) => <View testID="bar-chart" />,
    PieChart: (props: any) => <View testID="pie-chart" />,
  };
});

// ---------------------------------------------------------------------------
// Expo mocks (beyond jest.setup.js)
// ---------------------------------------------------------------------------
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn(),
  getCalendarsAsync: jest.fn().mockResolvedValue([]),
}));

jest.mock('expo-store-review', () => ({
  requestReview: jest.fn(),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

// ---------------------------------------------------------------------------
// Screen imports (from individual files, NOT barrel)
// ---------------------------------------------------------------------------
import { HomeScreen } from '@/screens/HomeScreen';
import { AddSubscriptionScreen } from '@/screens/AddSubscriptionScreen';
import { SubscriptionDetailsScreen } from '@/screens/SubscriptionDetailsScreen';
import { InsightsScreen } from '@/screens/InsightsScreen';
import { BudgetScreen } from '@/screens/BudgetScreen';
import { CalendarScreen } from '@/screens/CalendarScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { PaywallScreen } from '@/screens/PaywallScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { ServicePickerScreen } from '@/screens/ServicePickerScreen';
import { PlanPickerScreen } from '@/screens/PlanPickerScreen';
import { BankStatementScanScreen } from '@/screens/BankStatementScanScreen';
import PrivacyPolicyScreen from '@/screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '@/screens/TermsOfServiceScreen';
import { ScreenshotImportScreen } from '@/screens/ScreenshotImportScreen';
import { BubbleViewScreen } from '@/screens/BubbleViewScreen';
import { MonthlyReportScreen } from '@/screens/MonthlyReportScreen';
import { CategoryManagementScreen } from '@/screens/CategoryManagementScreen';
import { TimelineScreen } from '@/screens/TimelineScreen';

// ---------------------------------------------------------------------------
// Shared navigation mock
// ---------------------------------------------------------------------------
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  dispatch: jest.fn(),
};

// ---------------------------------------------------------------------------
// Smoke tests
// ---------------------------------------------------------------------------
describe('Screen render tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('HomeScreen renders without crash', () => {
    const { toJSON } = render(<HomeScreen navigation={mockNavigation as any} />);
    expect(toJSON()).toBeTruthy();
  });

  it('AddSubscriptionScreen renders without crash', () => {
    const { toJSON } = render(
      <AddSubscriptionScreen navigation={mockNavigation as any} route={{ params: {} } as any} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('SubscriptionDetailsScreen renders without crash', () => {
    const { toJSON } = render(
      <SubscriptionDetailsScreen
        navigation={mockNavigation as any}
        route={{ params: { subscriptionId: 'test-id' } } as any}
      />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('InsightsScreen renders without crash', () => {
    const { toJSON } = render(<InsightsScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('BudgetScreen renders without crash', () => {
    const { toJSON } = render(<BudgetScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('CalendarScreen renders without crash', () => {
    const { toJSON } = render(<CalendarScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('SettingsScreen renders without crash', () => {
    const { toJSON } = render(<SettingsScreen navigation={mockNavigation as any} />);
    expect(toJSON()).toBeTruthy();
  });

  it('PaywallScreen renders without crash', () => {
    const { toJSON } = render(<PaywallScreen navigation={mockNavigation as any} />);
    expect(toJSON()).toBeTruthy();
  });

  it('OnboardingScreen renders without crash', () => {
    const { toJSON } = render(
      <OnboardingScreen navigation={mockNavigation as any} route={{ params: {} } as any} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('ServicePickerScreen renders without crash', () => {
    const { toJSON } = render(<ServicePickerScreen navigation={mockNavigation as any} />);
    expect(toJSON()).toBeTruthy();
  });

  it('PlanPickerScreen renders without crash', () => {
    const { toJSON } = render(
      <PlanPickerScreen
        navigation={mockNavigation as any}
        route={{
          params: {
            service: {
              id: 'test',
              name: 'Test',
              domain: 'test.com',
              category: 'Entertainment',
              icon: '\uD83C\uDFAC',
              color: '#E50914',
              plans: [],
            },
          },
        } as any}
      />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('BankStatementScanScreen renders without crash', async () => {
    const { toJSON } = render(<BankStatementScanScreen navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(toJSON()).toBeTruthy();
    });
  });

  it('PrivacyPolicyScreen renders without crash', () => {
    const { toJSON } = render(<PrivacyPolicyScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('TermsOfServiceScreen renders without crash', () => {
    const { toJSON } = render(<TermsOfServiceScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('ScreenshotImportScreen renders without crash', () => {
    const { toJSON } = render(<ScreenshotImportScreen navigation={mockNavigation as any} />);
    expect(toJSON()).toBeTruthy();
  });

  it('BubbleViewScreen renders without crash', () => {
    const { toJSON } = render(<BubbleViewScreen navigation={mockNavigation as any} />);
    expect(toJSON()).toBeTruthy();
  });

  it('MonthlyReportScreen renders without crash', () => {
    const { toJSON } = render(<MonthlyReportScreen navigation={mockNavigation as any} />);
    expect(toJSON()).toBeTruthy();
  });

  it('CategoryManagementScreen renders without crash', () => {
    const { toJSON } = render(<CategoryManagementScreen navigation={mockNavigation as any} />);
    expect(toJSON()).toBeTruthy();
  });

  it('TimelineScreen renders without crash', () => {
    const { toJSON } = render(<TimelineScreen navigation={mockNavigation as any} />);
    expect(toJSON()).toBeTruthy();
  });
});
