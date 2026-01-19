/**
 * Settings Store - Zustand store for app settings
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings, BudgetSettings, ThemeMode } from '../../types';
import { DEFAULT_APP_SETTINGS, DEFAULT_BUDGET_SETTINGS } from '../../types';

interface SettingsState {
  app: AppSettings;
  budget: BudgetSettings;
  
  // Getters
  hasSeenOnboarding: () => boolean;
  
  // App settings actions
  setTheme: (theme: ThemeMode) => void;
  setCurrency: (currency: string) => void;
  setNotifications: (enabled: boolean) => void;
  setBiometricLock: (enabled: boolean) => void;
  setHasSeenOnboarding: (seen: boolean) => void;
  setLastScanAt: (date: string | null) => void;
  setInterstitialShown: (shown: boolean) => void;
  
  // Budget settings actions
  setBudgetLimit: (limit: number) => void;
  setBudgetCurrency: (currency: string) => void;
  setBudgetAlertThreshold: (threshold: number) => void;
  setBudgetEnabled: (enabled: boolean) => void;
  
  // Reset
  resetToDefaults: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      app: DEFAULT_APP_SETTINGS,
      budget: DEFAULT_BUDGET_SETTINGS,

      // Getters
      hasSeenOnboarding: () => get().app.onboardingCompleted,

      // App settings
      setTheme: (theme) =>
        set((state) => ({ app: { ...state.app, theme } })),

      setCurrency: (currency) =>
        set((state) => ({ app: { ...state.app, currency } })),

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

      // Budget settings
      setBudgetLimit: (monthlyLimit) =>
        set((state) => ({ budget: { ...state.budget, monthlyLimit } })),

      setBudgetCurrency: (currency) =>
        set((state) => ({ budget: { ...state.budget, currency } })),

      setBudgetAlertThreshold: (alertThreshold) =>
        set((state) => ({ budget: { ...state.budget, alertThreshold } })),

      setBudgetEnabled: (isEnabled) =>
        set((state) => ({ budget: { ...state.budget, isEnabled } })),

      // Reset
      resetToDefaults: () =>
        set({ app: DEFAULT_APP_SETTINGS, budget: DEFAULT_BUDGET_SETTINGS }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
