/**
 * Account Store - Zustand store for user auth account management
 * Manages Google Sign-In state for cloud sync
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthAccount {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  connectedAt: string;
}

interface AccountState {
  account: AuthAccount | null;

  // Actions
  setAccount: (account: AuthAccount) => void;
  clearAccount: () => void;

  // Getters
  isSignedIn: () => boolean;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      account: null,

      setAccount: (account) => set({ account }),

      clearAccount: () => set({ account: null }),

      isSignedIn: () => get().account !== null,
    }),
    {
      name: 'account-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
