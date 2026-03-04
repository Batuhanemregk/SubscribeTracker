/**
 * Settings Store - Zustand store for app settings
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings, BudgetSettings, ThemeMode } from '../../types';
import { DEFAULT_APP_SETTINGS, DEFAULT_BUDGET_SETTINGS } from '../../types';
import { setLocale } from '../../i18n';

export interface CustomCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

export const DEFAULT_CATEGORIES: CustomCategory[] = [
  { id: 'streaming', name: 'Streaming', color: '#E50914', icon: 'tv-outline', isDefault: true },
  { id: 'music', name: 'Music', color: '#1DB954', icon: 'musical-notes-outline', isDefault: true },
  { id: 'cloud', name: 'Cloud', color: '#4285F4', icon: 'cloud-outline', isDefault: true },
  { id: 'productivity', name: 'Productivity', color: '#FF6B00', icon: 'construct-outline', isDefault: true },
  { id: 'gaming', name: 'Gaming', color: '#9146FF', icon: 'game-controller-outline', isDefault: true },
  { id: 'fitness', name: 'Fitness', color: '#00C853', icon: 'fitness-outline', isDefault: true },
  { id: 'news', name: 'News', color: '#1A1A2E', icon: 'newspaper-outline', isDefault: true },
  { id: 'education', name: 'Education', color: '#FF9800', icon: 'school-outline', isDefault: true },
  { id: 'shopping', name: 'Shopping', color: '#E91E63', icon: 'cart-outline', isDefault: true },
  { id: 'other', name: 'Other', color: '#6B7280', icon: 'ellipsis-horizontal-outline', isDefault: true },
];

export type SubscriptionSortBy = 'price_desc' | 'price_asc' | 'name_asc' | 'billing_date' | 'date_added';

export interface SavingsGoal {
  targetMonthlySpend: number;
  startDate: string;
  startAmount: number;
  isActive: boolean;
}

interface SettingsState {
  app: AppSettings;
  budget: BudgetSettings;
  customCategories: CustomCategory[];
  savedPaymentMethods: string[];
  calendarSyncEnabled: boolean;
  lastCalendarSync: string | null;
  defaultReminderDays: number[];
  smartRemindersEnabled: boolean;
  subscriptionSortBy: SubscriptionSortBy;
  savingsGoal: SavingsGoal | null;
  lastBackupDate: string | null;
  showCurrencyConversion: boolean;
  accentColor: string;
  amoledMode: boolean;

  // Getters
  hasSeenOnboarding: () => boolean;

  // App settings actions
  setTheme: (theme: ThemeMode) => void;
  setAccentColor: (color: string) => void;
  setAmoledMode: (enabled: boolean) => void;
  setCurrency: (currency: string) => void;
  setLanguage: (language: 'system' | 'en' | 'tr') => void;
  setNotifications: (enabled: boolean) => void;
  setBiometricLock: (enabled: boolean) => void;
  setHasSeenOnboarding: (seen: boolean) => void;
  setLastScanAt: (date: string | null) => void;
  setInterstitialShown: (shown: boolean) => void;
  setDataSeeded: (seeded: boolean) => void;
  setSubscriptionSortBy: (sort: SubscriptionSortBy) => void;

  // Calendar sync actions
  setCalendarSync: (enabled: boolean) => void;
  updateLastCalendarSync: () => void;

  // Budget settings actions
  setBudgetLimit: (limit: number) => void;
  setBudgetCurrency: (currency: string) => void;
  setBudgetAlertThreshold: (threshold: number) => void;
  setBudgetEnabled: (enabled: boolean) => void;

  // Custom categories
  addCustomCategory: (category: CustomCategory) => void;
  removeCustomCategory: (id: string) => void;
  updateCustomCategory: (id: string, updates: Partial<Omit<CustomCategory, 'id'>>) => void;
  deleteCategory: (id: string) => void;
  getAllCategories: () => CustomCategory[];

  // Payment methods
  addPaymentMethod: (method: string) => void;

  // Smart notifications
  setDefaultReminderDays: (days: number[]) => void;
  setSmartRemindersEnabled: (enabled: boolean) => void;

  // Savings Goal
  setSavingsGoal: (target: number, currentSpend: number) => void;
  clearSavingsGoal: () => void;

  // Backup
  setLastBackupDate: (date: string) => void;

  // Currency conversion display
  setShowCurrencyConversion: (show: boolean) => void;

  // Reset
  resetToDefaults: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      app: DEFAULT_APP_SETTINGS,
      budget: DEFAULT_BUDGET_SETTINGS,
      customCategories: DEFAULT_CATEGORIES,
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

      // Getters
      hasSeenOnboarding: () => get().app.onboardingCompleted,

      // App settings
      setTheme: (theme) =>
        set((state) => ({ app: { ...state.app, theme } })),

      setAccentColor: (accentColor) =>
        set(() => ({ accentColor })),

      setAmoledMode: (amoledMode) =>
        set(() => ({ amoledMode })),

      setCurrency: (currency) =>
        set((state) => ({ app: { ...state.app, currency } })),

      setLanguage: (language) => {
        set((state) => ({ app: { ...state.app, language } }));
        if (language === 'system') {
          const deviceLocale = require('expo-localization').getLocales()[0]?.languageCode || 'en';
          setLocale(deviceLocale === 'tr' ? 'tr' : 'en');
        } else {
          setLocale(language);
        }
      },

      setNotifications: (notificationsEnabled) =>
        set((state) => ({ app: { ...state.app, notificationsEnabled } })),

      setBiometricLock: (biometricLockEnabled) =>
        set((state) => ({ app: { ...state.app, biometricLockEnabled } })),

      setHasSeenOnboarding: (onboardingCompleted) =>
        set((state) => ({ app: { ...state.app, onboardingCompleted } })),

      setLastScanAt: (lastScanAt) =>
        set((state) => ({ app: { ...state.app, lastScanAt } })),

      setInterstitialShown: (interstitialShownThisSession) =>
        set((state) => ({ app: { ...state.app, interstitialShownThisSession } })),

      setDataSeeded: (dataSeeded) =>
        set((state) => ({ app: { ...state.app, dataSeeded } })),

      setSubscriptionSortBy: (subscriptionSortBy) =>
        set(() => ({ subscriptionSortBy })),

      // Calendar sync
      setCalendarSync: (calendarSyncEnabled) =>
        set(() => ({ calendarSyncEnabled })),

      updateLastCalendarSync: () =>
        set(() => ({ lastCalendarSync: new Date().toISOString() })),

      // Budget settings
      setBudgetLimit: (monthlyLimit) =>
        set((state) => ({ budget: { ...state.budget, monthlyLimit } })),

      setBudgetCurrency: (currency) =>
        set((state) => ({ budget: { ...state.budget, currency } })),

      setBudgetAlertThreshold: (alertThreshold) =>
        set((state) => ({ budget: { ...state.budget, alertThreshold } })),

      setBudgetEnabled: (isEnabled) =>
        set((state) => ({ budget: { ...state.budget, isEnabled } })),

      // Custom categories
      addCustomCategory: (category: CustomCategory) =>
        set((state) => ({ customCategories: [...state.customCategories, category] })),

      removeCustomCategory: (id: string) =>
        set((state) => ({ customCategories: state.customCategories.filter(c => c.id !== id) })),

      updateCustomCategory: (id: string, updates: Partial<Omit<CustomCategory, 'id'>>) =>
        set((state) => ({
          customCategories: state.customCategories.map(c =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      deleteCategory: (id: string) =>
        set((state) => ({
          customCategories: state.customCategories.filter(c => c.id !== id),
        })),

      getAllCategories: () => get().customCategories,

      // Payment methods
      addPaymentMethod: (method: string) =>
        set((state) => ({
          savedPaymentMethods: state.savedPaymentMethods.includes(method)
            ? state.savedPaymentMethods
            : [...state.savedPaymentMethods, method],
        })),

      // Smart notifications
      setDefaultReminderDays: (defaultReminderDays) =>
        set(() => ({ defaultReminderDays })),

      setSmartRemindersEnabled: (smartRemindersEnabled) =>
        set(() => ({ smartRemindersEnabled })),

      // Savings Goal
      setSavingsGoal: (targetMonthlySpend, currentSpend) =>
        set(() => ({
          savingsGoal: {
            targetMonthlySpend,
            startDate: new Date().toISOString(),
            startAmount: currentSpend,
            isActive: true,
          },
        })),

      clearSavingsGoal: () =>
        set(() => ({ savingsGoal: null })),

      // Backup
      setLastBackupDate: (lastBackupDate) =>
        set(() => ({ lastBackupDate })),

      // Currency conversion display
      setShowCurrencyConversion: (showCurrencyConversion) =>
        set(() => ({ showCurrencyConversion })),

      // Reset
      resetToDefaults: () =>
        set({ app: DEFAULT_APP_SETTINGS, budget: DEFAULT_BUDGET_SETTINGS, customCategories: DEFAULT_CATEGORIES, savedPaymentMethods: [], defaultReminderDays: [1, 3], smartRemindersEnabled: false, savingsGoal: null }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: any, version: number) => {
        // Seed default categories for existing users who have an empty list
        if (
          persistedState &&
          (!persistedState.customCategories || persistedState.customCategories.length === 0)
        ) {
          persistedState.customCategories = DEFAULT_CATEGORIES;
        }
        return persistedState;
      },
    }
  )
);
