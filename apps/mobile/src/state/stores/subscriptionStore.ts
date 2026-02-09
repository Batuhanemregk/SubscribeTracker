/**
 * Subscription Store - Zustand store for subscription management
 * With Cloud Sync support for Pro users
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Subscription, PaymentHistoryItem } from '../../types';
import { pushToCloud, pullFromCloud, deleteFromCloud, fullSync } from '../../services/syncService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface SubscriptionState {
  subscriptions: Subscription[];
  paymentHistory: PaymentHistoryItem[];
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
  
  // Actions
  setSubscriptions: (subs: Subscription[]) => void;
  addSubscription: (sub: Subscription) => void;
  updateSubscription: (id: string, updates: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  
  // Payment history
  addPaymentHistory: (payment: PaymentHistoryItem) => void;
  getPaymentHistory: (subscriptionId: string) => PaymentHistoryItem[];
  
  // Computed helpers
  getActiveSubscriptions: () => Subscription[];
  getSubscriptionById: (id: string) => Subscription | undefined;
  calculateMonthlyTotal: () => number;
  calculateYearlyTotal: () => number;
  calculateMonthlyTotalConverted: (convert: (amount: number, from: string, to: string) => number, displayCurrency: string) => number;
  calculateYearlyTotalConverted: (convert: (amount: number, from: string, to: string) => number, displayCurrency: string) => number;
  
  // Cloud Sync (Pro only)
  syncToCloud: () => Promise<boolean>;
  syncFromCloud: () => Promise<boolean>;
  performFullSync: () => Promise<boolean>;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      subscriptions: [],
      paymentHistory: [],
      isLoading: false,
      isSyncing: false,
      lastSyncedAt: null,
      syncError: null,

      setSubscriptions: (subscriptions) => set({ subscriptions }),

      addSubscription: (sub) =>
        set((state) => ({
          subscriptions: [...state.subscriptions, sub],
        })),

      updateSubscription: (id, updates) =>
        set((state) => ({
          subscriptions: state.subscriptions.map((sub) =>
            sub.id === id ? { ...sub, ...updates, updatedAt: new Date().toISOString() } : sub
          ),
        })),

      deleteSubscription: (id) => {
        // Also delete from cloud if configured
        if (isSupabaseConfigured()) {
          deleteFromCloud(id).catch(console.error);
        }
        set((state) => ({
          subscriptions: state.subscriptions.filter((sub) => sub.id !== id),
          paymentHistory: state.paymentHistory.filter((p) => p.subscriptionId !== id),
        }));
      },

      addPaymentHistory: (payment) =>
        set((state) => ({
          paymentHistory: [...state.paymentHistory, payment],
        })),

      getPaymentHistory: (subscriptionId) =>
        get().paymentHistory.filter((p) => p.subscriptionId === subscriptionId),

      getActiveSubscriptions: () =>
        get().subscriptions.filter((sub) => sub.status === 'active'),

      getSubscriptionById: (id) =>
        get().subscriptions.find((sub) => sub.id === id),

      calculateMonthlyTotal: () => {
        const subs = get().getActiveSubscriptions();
        return subs.reduce((total, sub) => {
          switch (sub.cycle) {
            case 'weekly':
              return total + sub.amount * 4.33;
            case 'monthly':
              return total + sub.amount;
            case 'quarterly':
              return total + sub.amount / 3;
            case 'yearly':
              return total + sub.amount / 12;
            default:
              return total;
          }
        }, 0);
      },

      calculateYearlyTotal: () => {
        const subs = get().getActiveSubscriptions();
        return subs.reduce((total, sub) => {
          switch (sub.cycle) {
            case 'weekly':
              return total + sub.amount * 52;
            case 'monthly':
              return total + sub.amount * 12;
            case 'quarterly':
              return total + sub.amount * 4;
            case 'yearly':
              return total + sub.amount;
            default:
              return total;
          }
        }, 0);
      },

      calculateMonthlyTotalConverted: (convert, displayCurrency) => {
        const subs = get().getActiveSubscriptions();
        return subs.reduce((total, sub) => {
          const subCurrency = sub.currency || 'TRY';
          let monthlyAmount: number;
          switch (sub.cycle) {
            case 'weekly':
              monthlyAmount = sub.amount * 4.33;
              break;
            case 'monthly':
              monthlyAmount = sub.amount;
              break;
            case 'quarterly':
              monthlyAmount = sub.amount / 3;
              break;
            case 'yearly':
              monthlyAmount = sub.amount / 12;
              break;
            default:
              monthlyAmount = sub.amount;
          }
          return total + convert(monthlyAmount, subCurrency, displayCurrency);
        }, 0);
      },

      calculateYearlyTotalConverted: (convert, displayCurrency) => {
        const subs = get().getActiveSubscriptions();
        return subs.reduce((total, sub) => {
          const subCurrency = sub.currency || 'TRY';
          let yearlyAmount: number;
          switch (sub.cycle) {
            case 'weekly':
              yearlyAmount = sub.amount * 52;
              break;
            case 'monthly':
              yearlyAmount = sub.amount * 12;
              break;
            case 'quarterly':
              yearlyAmount = sub.amount * 4;
              break;
            case 'yearly':
              yearlyAmount = sub.amount;
              break;
            default:
              yearlyAmount = sub.amount;
          }
          return total + convert(yearlyAmount, subCurrency, displayCurrency);
        }, 0);
      },

      // Push local subscriptions to cloud
      syncToCloud: async () => {
        if (!isSupabaseConfigured()) return false;
        
        set({ isSyncing: true, syncError: null });
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            set({ isSyncing: false, syncError: 'Not authenticated' });
            return false;
          }
          
          const result = await pushToCloud(get().subscriptions, user.id);
          
          if (result.success) {
            set({ 
              isSyncing: false, 
              lastSyncedAt: new Date().toISOString(),
              syncError: null 
            });
            return true;
          } else {
            set({ isSyncing: false, syncError: result.error });
            return false;
          }
        } catch (error: any) {
          set({ isSyncing: false, syncError: error.message });
          return false;
        }
      },

      // Pull subscriptions from cloud
      syncFromCloud: async () => {
        if (!isSupabaseConfigured()) return false;
        
        set({ isSyncing: true, syncError: null });
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            set({ isSyncing: false, syncError: 'Not authenticated' });
            return false;
          }
          
          const result = await pullFromCloud(user.id);
          
          if (result.success) {
            set({ 
              subscriptions: result.subscriptions,
              isSyncing: false, 
              lastSyncedAt: new Date().toISOString(),
              syncError: null 
            });
            return true;
          } else {
            set({ isSyncing: false, syncError: result.error });
            return false;
          }
        } catch (error: any) {
          set({ isSyncing: false, syncError: error.message });
          return false;
        }
      },

      // Full sync with conflict resolution
      performFullSync: async () => {
        if (!isSupabaseConfigured()) return false;
        
        set({ isSyncing: true, syncError: null });
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            set({ isSyncing: false, syncError: 'Not authenticated' });
            return false;
          }
          
          const result = await fullSync(get().subscriptions, user.id);
          
          if (result.success) {
            set({ 
              subscriptions: result.merged,
              isSyncing: false, 
              lastSyncedAt: new Date().toISOString(),
              syncError: null 
            });
            return true;
          } else {
            set({ isSyncing: false, syncError: result.error });
            return false;
          }
        } catch (error: any) {
          set({ isSyncing: false, syncError: error.message });
          return false;
        }
      },
    }),
    {
      name: 'subscription-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Helper function to generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to create new subscription
export function createSubscription(
  data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'source' | 'detection' | 'cancelUrl' | 'manageUrl' | 'notes'>
): Subscription {
  const now = new Date().toISOString();
  return {
    ...data,
    id: generateId(),
    status: 'active',
    source: 'manual',
    detection: null,
    cancelUrl: null,
    manageUrl: null,
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}

