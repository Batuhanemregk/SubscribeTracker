/**
 * Plan Store - Zustand store for user plan and entitlements
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserPlan, PlanTier } from '../../types';
import { DEFAULT_STANDARD_PLAN, DEFAULT_PRO_PLAN } from '../../types';

interface PlanState {
  plan: UserPlan;

  // Getters
  isPro: () => boolean;
  isLifetime: () => boolean;
  isTrialActive: () => boolean;
  canUseBankStatementScan: () => boolean;
  canUseCloudSync: () => boolean;
  canUseDataExport: () => boolean;
  canUseBiometricLock: () => boolean;
  shouldShowAds: () => boolean;

  // Actions
  setPlan: (plan: UserPlan) => void;
  upgradeToPro: () => void;
  upgradeToLifetime: () => void;
  startTrial: (durationDays?: number) => void;
  downgradeToStandard: () => void;

  // Purchase handling (to be connected with IAP later)
  handlePurchaseSuccess: (purchaseDate: string, expiryDate: string) => void;
  handlePurchaseRestore: (purchaseDate: string, expiryDate: string) => void;
  handleLifetimePurchaseSuccess: (purchaseDate: string) => void;
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      plan: DEFAULT_STANDARD_PLAN,

      // Getters
      isPro: () => get().plan.tier === 'pro',

      // isLifetime: pro plan with no expiry date (non-consumable purchase)
      isLifetime: () => {
        const { tier, expiresAt } = get().plan;
        return tier === 'pro' && expiresAt === null;
      },

      isTrialActive: () => {
        const { isTrialActive, trialEndsAt } = get().plan;
        if (!isTrialActive || !trialEndsAt) return false;
        return new Date(trialEndsAt) > new Date();
      },

      canUseBankStatementScan: () => get().plan.entitlements.bankStatementScan,
      canUseCloudSync: () => get().plan.entitlements.cloudSync,
      canUseDataExport: () => get().plan.entitlements.dataExport,
      canUseBiometricLock: () => get().plan.entitlements.biometricLock,
      shouldShowAds: () => !get().plan.entitlements.noAds,

      // Actions
      setPlan: (plan) => set({ plan }),

      upgradeToPro: () => {
        const now = new Date().toISOString();
        set({
          plan: {
            ...DEFAULT_PRO_PLAN,
            purchasedAt: now,
          },
        });
      },

      startTrial: (durationDays = 7) => {
        const now = new Date();
        const trialEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
        set({
          plan: {
            ...DEFAULT_PRO_PLAN,
            isTrialActive: true,
            trialEndsAt: trialEnd.toISOString(),
          },
        });
      },

      upgradeToLifetime: () => {
        const now = new Date().toISOString();
        set({
          plan: {
            ...DEFAULT_PRO_PLAN,
            purchasedAt: now,
            expiresAt: null,
          },
        });
      },

      downgradeToStandard: () => set({ plan: DEFAULT_STANDARD_PLAN }),

      handleLifetimePurchaseSuccess: (purchaseDate) =>
        set({
          plan: {
            ...DEFAULT_PRO_PLAN,
            purchasedAt: purchaseDate,
            expiresAt: null,
            isTrialActive: false,
            trialEndsAt: null,
          },
        }),

      handlePurchaseSuccess: (purchaseDate, expiryDate) =>
        set({
          plan: {
            ...DEFAULT_PRO_PLAN,
            purchasedAt: purchaseDate,
            expiresAt: expiryDate,
            isTrialActive: false,
            trialEndsAt: null,
          },
        }),

      handlePurchaseRestore: (purchaseDate, expiryDate) =>
        set({
          plan: {
            ...DEFAULT_PRO_PLAN,
            purchasedAt: purchaseDate,
            expiresAt: expiryDate,
            isTrialActive: false,
            trialEndsAt: null,
          },
        }),
    }),
    {
      name: 'plan-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
