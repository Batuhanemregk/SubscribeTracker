/**
 * Account Store - Zustand store for email account management
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EmailAccount, EmailProvider, AccountStatus } from '../../types';
import { generateId } from './subscriptionStore';

interface AccountState {
  accounts: EmailAccount[];
  
  // Actions
  addAccount: (account: Omit<EmailAccount, 'id' | 'connectedAt' | 'lastSyncAt'>) => EmailAccount;
  removeAccount: (id: string) => void;
  updateAccountStatus: (id: string, status: AccountStatus) => void;
  updateLastSync: (id: string) => void;
  
  // Getters
  getAccountById: (id: string) => EmailAccount | undefined;
  getAccountsByProvider: (provider: EmailProvider) => EmailAccount[];
  getActiveAccounts: () => EmailAccount[];
  getAccountCount: () => number;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      accounts: [],

      addAccount: (accountData) => {
        const now = new Date().toISOString();
        const newAccount: EmailAccount = {
          ...accountData,
          id: generateId(),
          connectedAt: now,
          lastSyncAt: null,
        };
        set((state) => ({
          accounts: [...state.accounts, newAccount],
        }));
        return newAccount;
      },

      removeAccount: (id) =>
        set((state) => ({
          accounts: state.accounts.filter((acc) => acc.id !== id),
        })),

      updateAccountStatus: (id, status) =>
        set((state) => ({
          accounts: state.accounts.map((acc) =>
            acc.id === id ? { ...acc, status } : acc
          ),
        })),

      updateLastSync: (id) =>
        set((state) => ({
          accounts: state.accounts.map((acc) =>
            acc.id === id ? { ...acc, lastSyncAt: new Date().toISOString() } : acc
          ),
        })),

      getAccountById: (id) => get().accounts.find((acc) => acc.id === id),

      getAccountsByProvider: (provider) =>
        get().accounts.filter((acc) => acc.provider === provider),

      getActiveAccounts: () =>
        get().accounts.filter((acc) => acc.status === 'active'),

      getAccountCount: () => get().accounts.length,
    }),
    {
      name: 'account-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
