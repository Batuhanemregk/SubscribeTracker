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
  isTrialActive: () => boolean;
  canAddEmailAccount: (currentCount: number) => boolean;
  canUseDailyScan: () => boolean;
  canUseBodyParsing: () => boolean;
  canUseAutoFill: () => boolean;
  canUsePriceAlerts: () => boolean;
  shouldShowAds: () => boolean;
  
  // Actions
  setPlan: (plan: UserPlan) => void;
  upgradeToPro: () => void;
  startTrial: (durationDays?: number) => void;
  downgradeToStandard: () => void;
  
  // Purchase handling (to be connected with IAP later)
  handlePurchaseSuccess: (purchaseDate: string, expiryDate: string) => void;
  handlePurchaseRestore: (purchaseDate: string, expiryDate: string) => void;
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      plan: DEFAULT_STANDARD_PLAN,

      // Getters
      isPro: () => get().plan.tier === 'pro',
      
      isTrialActive: () => {
        const { isTrialActive, trialEndsAt } = get().plan;
        if (!isTrialActive || !trialEndsAt) return false;
        return new Date(trialEndsAt) > new Date();
      },

      canAddEmailAccount: (currentCount) => {
        const { entitlements } = get().plan;
        return currentCount < entitlements.maxEmailAccounts;
      },

      canUseDailyScan: () => get().plan.entitlements.dailyScan,
      canUseBodyParsing: () => get().plan.entitlements.bodyParsing,
      canUseAutoFill: () => get().plan.entitlements.autoFillPricing,
      canUsePriceAlerts: () => get().plan.entitlements.priceAlerts,
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

      downgradeToStandard: () => set({ plan: DEFAULT_STANDARD_PLAN }),

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
