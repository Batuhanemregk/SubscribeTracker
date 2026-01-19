/**
 * Subscription Store - Zustand store for subscription management
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Subscription, PaymentHistoryItem } from '../../types';

interface SubscriptionState {
  subscriptions: Subscription[];
  paymentHistory: PaymentHistoryItem[];
  isLoading: boolean;
  
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
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      subscriptions: [],
      paymentHistory: [],
      isLoading: false,

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

      deleteSubscription: (id) =>
        set((state) => ({
          subscriptions: state.subscriptions.filter((sub) => sub.id !== id),
          paymentHistory: state.paymentHistory.filter((p) => p.subscriptionId !== id),
        })),

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
