/**
 * Supabase Client Configuration
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Copy your project URL and anon key from Settings > API
 * 3. Create a .env file in apps/mobile with:
 *    EXPO_PUBLIC_SUPABASE_URL=your-project-url
 *    EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
 */
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from './database.types';
import { logger } from '../services/LoggerService';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  logger.warn(
    'Supabase',
    'Credentials not found. Cloud sync will be disabled. ' +
    'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env'
  );
}

// Use a placeholder URL when credentials are missing to avoid createClient crash.
// All remote calls should check isSupabaseConfigured() before using the client.
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTkwMDAwMDAwMH0.placeholder';

export const supabase = createClient<Database>(
  supabaseUrl || PLACEHOLDER_URL,
  supabaseAnonKey || PLACEHOLDER_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: !!supabaseUrl,
      persistSession: !!supabaseUrl,
      detectSessionInUrl: false, // Important for React Native
    },
  },
);

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};
