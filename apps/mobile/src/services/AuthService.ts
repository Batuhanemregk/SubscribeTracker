/**
 * Auth Service - Google Sign-In via Supabase Auth
 * 
 * Used for user account creation and cloud data sync.
 * No email scanning scopes — only basic profile info.
 */
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { CONFIG } from '../config';
import { logger } from './LoggerService';

// Ensure web browser redirects work
WebBrowser.maybeCompleteAuthSession();

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

/**
 * Sign in with Google via Supabase Auth
 */
export async function signInWithGoogle(): Promise<{
  success: boolean;
  user?: AuthUser;
  error?: string;
}> {
  try {
    const redirectUrl = makeRedirectUri({ scheme: CONFIG.app.scheme });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        scopes: 'email profile',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const hashParams = new URLSearchParams(
          url.hash.startsWith('#') ? url.hash.substring(1) : url.hash
        );

        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          const { data: userData } = await supabase.auth.getUser(accessToken);
          const user = userData?.user;

          return {
            success: true,
            user: user ? {
              id: user.id,
              email: user.email || '',
              displayName: user.user_metadata?.full_name || user.user_metadata?.name,
              avatarUrl: user.user_metadata?.avatar_url,
            } : undefined,
          };
        }
      }

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { success: false, error: 'User cancelled' };
      }
    }

    return { success: false, error: 'Sign-in flow failed' };
  } catch (error) {
    logger.error('Auth', 'Sign-in error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    logger.error('Auth', 'Sign-out error:', error);
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return {
      id: user.id,
      email: user.email || '',
      displayName: user.user_metadata?.full_name || user.user_metadata?.name,
      avatarUrl: user.user_metadata?.avatar_url,
    };
  } catch {
    return null;
  }
}

/**
 * Check if user is signed in
 */
export async function isSignedIn(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}
