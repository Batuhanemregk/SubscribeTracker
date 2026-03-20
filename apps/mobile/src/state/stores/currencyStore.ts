/**
 * Currency Store - Zustand store for exchange rates
 * Fetches and caches real-time exchange rates via Supabase Edge Function
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const EXCHANGE_RATES_URL = `${SUPABASE_URL}/functions/v1/exchange-rates`;
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

interface ExchangeRates {
  [currency: string]: number; // Rates relative to USD (1 USD = X)
}

interface CurrencyState {
  rates: ExchangeRates;
  lastFetchedAt: number | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchRates: () => Promise<void>;
  convert: (amount: number, from: string, to: string) => number;
  isStale: () => boolean;
}

// Fallback rates if API is unavailable
const FALLBACK_RATES: ExchangeRates = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  TRY: 36.50,
  JPY: 149.50,
  CAD: 1.36,
  AUD: 1.53,
};

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      rates: FALLBACK_RATES,
      lastFetchedAt: null,
      isLoading: false,
      error: null,

      isStale: () => {
        const { lastFetchedAt } = get();
        if (!lastFetchedAt) return true;
        return Date.now() - lastFetchedAt > CACHE_DURATION_MS;
      },

      fetchRates: async () => {
        const state = get();
        // Skip if we have fresh rates
        if (!state.isStale() && Object.keys(state.rates).length > 1) {
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const response = await fetch(EXCHANGE_RATES_URL);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();

          if (data.rates && typeof data.rates === 'object') {
            set({
              rates: { USD: 1, ...data.rates },
              lastFetchedAt: Date.now(),
              isLoading: false,
              error: null,
            });
          } else {
            throw new Error('Invalid response format');
          }
        } catch (error: any) {
          console.warn('Exchange rate fetch failed, using cached/fallback rates:', error.message);
          set({
            isLoading: false,
            error: error.message,
            // Keep existing rates as fallback
          });
        }
      },

      convert: (amount: number, from: string, to: string) => {
        if (from === to) return amount;

        const { rates } = get();
        const fromRate = rates[from];
        const toRate = rates[to];

        if (!fromRate || !toRate) {
          console.warn(`Missing rate for ${from} or ${to}, returning original amount`);
          return amount;
        }

        // Convert: amount in FROM -> USD -> TO
        const amountInUsd = amount / fromRate;
        return amountInUsd * toRate;
      },
    }),
    {
      name: 'currency-rates-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        rates: state.rates,
        lastFetchedAt: state.lastFetchedAt,
      }),
    }
  )
);
