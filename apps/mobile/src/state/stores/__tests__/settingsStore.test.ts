import { useSettingsStore, DEFAULT_CATEGORIES } from '../settingsStore';
import { DEFAULT_APP_SETTINGS, DEFAULT_BUDGET_SETTINGS } from '../../../types';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));

jest.mock('../../../i18n', () => ({
  setLocale: jest.fn(),
  t: jest.fn((key: string) => key),
}));

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      app: { ...DEFAULT_APP_SETTINGS },
      budget: { ...DEFAULT_BUDGET_SETTINGS },
      customCategories: [...DEFAULT_CATEGORIES],
      savedPaymentMethods: [],
      calendarSyncEnabled: false,
      lastCalendarSync: null,
      defaultReminderDays: [1, 3],
      smartRemindersEnabled: false,
      subscriptionSortBy: 'billing_date',
      savingsGoal: null,
      lastBackupDate: null,
      showCurrencyConversion: true,
      accentColor: 'purple',
      amoledMode: false,
    });
  });

  describe('default values', () => {
    it('should have correct default app settings', () => {
      const state = useSettingsStore.getState();
      expect(state.app.theme).toBe('dark');
      expect(state.app.currency).toBe('USD');
      expect(state.app.language).toBe('system');
      expect(state.app.notificationsEnabled).toBe(true);
      expect(state.app.biometricLockEnabled).toBe(false);
      expect(state.app.onboardingCompleted).toBe(false);
      expect(state.app.dataSeeded).toBe(false);
    });

    it('should have correct default budget settings', () => {
      const state = useSettingsStore.getState();
      expect(state.budget.monthlyLimit).toBe(100);
      expect(state.budget.currency).toBe('USD');
      expect(state.budget.alertThreshold).toBe(0.8);
      expect(state.budget.isEnabled).toBe(false);
    });

    it('should have default categories', () => {
      const state = useSettingsStore.getState();
      expect(state.customCategories).toHaveLength(DEFAULT_CATEGORIES.length);
      expect(state.customCategories[0].name).toBe('Streaming');
    });

    it('should have default reminder days', () => {
      const state = useSettingsStore.getState();
      expect(state.defaultReminderDays).toEqual([1, 3]);
      expect(state.smartRemindersEnabled).toBe(false);
    });
  });

  describe('setTheme', () => {
    it('should update theme', () => {
      useSettingsStore.getState().setTheme('light');
      expect(useSettingsStore.getState().app.theme).toBe('light');
    });

    it('should accept system theme', () => {
      useSettingsStore.getState().setTheme('system');
      expect(useSettingsStore.getState().app.theme).toBe('system');
    });
  });

  describe('setCurrency', () => {
    it('should update currency', () => {
      useSettingsStore.getState().setCurrency('EUR');
      expect(useSettingsStore.getState().app.currency).toBe('EUR');
    });
  });

  describe('setLanguage', () => {
    it('should update language and call setLocale', () => {
      const { setLocale } = require('../../../i18n');
      useSettingsStore.getState().setLanguage('tr');
      expect(useSettingsStore.getState().app.language).toBe('tr');
      expect(setLocale).toHaveBeenCalledWith('tr');
    });

    it('should detect device locale for system setting', () => {
      const { setLocale } = require('../../../i18n');
      useSettingsStore.getState().setLanguage('system');
      expect(useSettingsStore.getState().app.language).toBe('system');
      // Mock returns 'en' as languageCode, so setLocale should receive 'en'
      expect(setLocale).toHaveBeenCalledWith('en');
    });
  });

  describe('setNotifications', () => {
    it('should toggle notifications', () => {
      useSettingsStore.getState().setNotifications(false);
      expect(useSettingsStore.getState().app.notificationsEnabled).toBe(false);

      useSettingsStore.getState().setNotifications(true);
      expect(useSettingsStore.getState().app.notificationsEnabled).toBe(true);
    });
  });

  describe('setBiometricLock', () => {
    it('should toggle biometric lock', () => {
      useSettingsStore.getState().setBiometricLock(true);
      expect(useSettingsStore.getState().app.biometricLockEnabled).toBe(true);
    });
  });

  describe('hasSeenOnboarding', () => {
    it('should return false by default', () => {
      expect(useSettingsStore.getState().hasSeenOnboarding()).toBe(false);
    });

    it('should return true after setting onboarding completed', () => {
      useSettingsStore.getState().setHasSeenOnboarding(true);
      expect(useSettingsStore.getState().hasSeenOnboarding()).toBe(true);
    });
  });

  describe('budget settings', () => {
    it('should update budget limit', () => {
      useSettingsStore.getState().setBudgetLimit(200);
      expect(useSettingsStore.getState().budget.monthlyLimit).toBe(200);
    });

    it('should update budget currency', () => {
      useSettingsStore.getState().setBudgetCurrency('TRY');
      expect(useSettingsStore.getState().budget.currency).toBe('TRY');
    });

    it('should update budget alert threshold', () => {
      useSettingsStore.getState().setBudgetAlertThreshold(0.9);
      expect(useSettingsStore.getState().budget.alertThreshold).toBe(0.9);
    });

    it('should enable budget', () => {
      useSettingsStore.getState().setBudgetEnabled(true);
      expect(useSettingsStore.getState().budget.isEnabled).toBe(true);
    });
  });

  describe('savings goal', () => {
    it('should set savings goal', () => {
      useSettingsStore.getState().setSavingsGoal(50, 100);
      const goal = useSettingsStore.getState().savingsGoal;

      expect(goal).not.toBeNull();
      expect(goal!.targetMonthlySpend).toBe(50);
      expect(goal!.startAmount).toBe(100);
      expect(goal!.isActive).toBe(true);
      expect(goal!.startDate).toBeTruthy();
    });

    it('should clear savings goal', () => {
      useSettingsStore.getState().setSavingsGoal(50, 100);
      useSettingsStore.getState().clearSavingsGoal();
      expect(useSettingsStore.getState().savingsGoal).toBeNull();
    });
  });

  describe('custom categories', () => {
    it('should add custom category', () => {
      const newCategory = {
        id: 'custom-1',
        name: 'VPN',
        icon: 'shield-outline',
        color: '#FF0000',
        isDefault: false,
      };

      useSettingsStore.getState().addCustomCategory(newCategory);
      const categories = useSettingsStore.getState().customCategories;
      expect(categories).toHaveLength(DEFAULT_CATEGORIES.length + 1);
      expect(categories[categories.length - 1].name).toBe('VPN');
    });

    it('should remove custom category', () => {
      useSettingsStore.getState().removeCustomCategory('streaming');
      const categories = useSettingsStore.getState().customCategories;
      expect(categories).toHaveLength(DEFAULT_CATEGORIES.length - 1);
      expect(categories.find((c) => c.id === 'streaming')).toBeUndefined();
    });

    it('should update custom category', () => {
      useSettingsStore.getState().updateCustomCategory('streaming', { name: 'Video Streaming' });
      const cat = useSettingsStore.getState().customCategories.find((c) => c.id === 'streaming');
      expect(cat?.name).toBe('Video Streaming');
    });

    it('should delete category', () => {
      const initialCount = useSettingsStore.getState().customCategories.length;
      useSettingsStore.getState().deleteCategory('gaming');
      expect(useSettingsStore.getState().customCategories.length).toBe(initialCount - 1);
    });

    it('should get all categories', () => {
      const all = useSettingsStore.getState().getAllCategories();
      expect(all).toHaveLength(DEFAULT_CATEGORIES.length);
    });
  });

  describe('payment methods', () => {
    it('should add payment method', () => {
      useSettingsStore.getState().addPaymentMethod('Visa *4242');
      expect(useSettingsStore.getState().savedPaymentMethods).toContain('Visa *4242');
    });

    it('should not add duplicate payment method', () => {
      useSettingsStore.getState().addPaymentMethod('Visa *4242');
      useSettingsStore.getState().addPaymentMethod('Visa *4242');
      expect(useSettingsStore.getState().savedPaymentMethods).toHaveLength(1);
    });
  });

  describe('smart reminders', () => {
    it('should set default reminder days', () => {
      useSettingsStore.getState().setDefaultReminderDays([7, 3, 1]);
      expect(useSettingsStore.getState().defaultReminderDays).toEqual([7, 3, 1]);
    });

    it('should toggle smart reminders', () => {
      useSettingsStore.getState().setSmartRemindersEnabled(true);
      expect(useSettingsStore.getState().smartRemindersEnabled).toBe(true);
    });
  });

  describe('subscription sort', () => {
    it('should update sort preference', () => {
      useSettingsStore.getState().setSubscriptionSortBy('price_desc');
      expect(useSettingsStore.getState().subscriptionSortBy).toBe('price_desc');
    });
  });

  describe('calendar sync', () => {
    it('should toggle calendar sync', () => {
      useSettingsStore.getState().setCalendarSync(true);
      expect(useSettingsStore.getState().calendarSyncEnabled).toBe(true);
    });

    it('should update last calendar sync time', () => {
      useSettingsStore.getState().updateLastCalendarSync();
      expect(useSettingsStore.getState().lastCalendarSync).toBeTruthy();
    });
  });

  describe('appearance', () => {
    it('should set accent color', () => {
      useSettingsStore.getState().setAccentColor('blue');
      expect(useSettingsStore.getState().accentColor).toBe('blue');
    });

    it('should toggle AMOLED mode', () => {
      useSettingsStore.getState().setAmoledMode(true);
      expect(useSettingsStore.getState().amoledMode).toBe(true);
    });
  });

  describe('other setters', () => {
    it('should set last scan at', () => {
      useSettingsStore.getState().setLastScanAt('2026-03-01');
      expect(useSettingsStore.getState().app.lastScanAt).toBe('2026-03-01');
    });

    it('should set interstitial shown', () => {
      useSettingsStore.getState().setInterstitialShown(true);
      expect(useSettingsStore.getState().app.interstitialShownThisSession).toBe(true);
    });

    it('should set data seeded', () => {
      useSettingsStore.getState().setDataSeeded(true);
      expect(useSettingsStore.getState().app.dataSeeded).toBe(true);
    });

    it('should set last backup date', () => {
      useSettingsStore.getState().setLastBackupDate('2026-03-01');
      expect(useSettingsStore.getState().lastBackupDate).toBe('2026-03-01');
    });

    it('should toggle currency conversion display', () => {
      useSettingsStore.getState().setShowCurrencyConversion(false);
      expect(useSettingsStore.getState().showCurrencyConversion).toBe(false);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset all settings to defaults', () => {
      // Change several settings
      useSettingsStore.getState().setTheme('light');
      useSettingsStore.getState().setCurrency('EUR');
      useSettingsStore.getState().setBudgetLimit(500);
      useSettingsStore.getState().setSavingsGoal(50, 100);
      useSettingsStore.getState().setSmartRemindersEnabled(true);

      useSettingsStore.getState().resetToDefaults();

      const state = useSettingsStore.getState();
      expect(state.app).toEqual(DEFAULT_APP_SETTINGS);
      expect(state.budget).toEqual(DEFAULT_BUDGET_SETTINGS);
      expect(state.customCategories).toEqual(DEFAULT_CATEGORIES);
      expect(state.savedPaymentMethods).toEqual([]);
      expect(state.savingsGoal).toBeNull();
      expect(state.smartRemindersEnabled).toBe(false);
    });
  });
});
