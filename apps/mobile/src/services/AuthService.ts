/**
 * Auth Service — Google + Apple Sign-In via Supabase Auth.
 *
 * Used for account creation and cloud data sync. No email-scanning scopes —
 * only basic profile info. Google uses the browser-based OAuth flow; Apple uses
 * the native credential + Supabase `signInWithIdToken` (required by App Store
 * when a third-party login like Google is offered).
 */
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { CONFIG } from '../config';

// Ensure web browser redirects work
WebBrowser.maybeCompleteAuthSession();

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

const CANCELLED = 'User cancelled';

function mapUser(user: { id: string; email?: string | null; user_metadata?: Record<string, any> }): AuthUser {
  return {
    id: user.id,
    email: user.email || '',
    displayName: user.user_metadata?.full_name || user.user_metadata?.name,
    avatarUrl: user.user_metadata?.avatar_url,
  };
}

/**
 * Establish a Supabase session from the OAuth redirect URL. Handles both the
 * implicit flow (tokens in the URL hash) and the PKCE flow (`?code=`), so the
 * sign-in works regardless of the project's configured flow type.
 */
async function sessionFromRedirectUrl(redirectUrl: string): Promise<boolean> {
  const url = new URL(redirectUrl);

  const hash = url.hash.startsWith('#') ? url.hash.substring(1) : url.hash;
  const hashParams = new URLSearchParams(hash);
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  if (accessToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    });
    return !error;
  }

  const code = url.searchParams.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return !error;
  }

  return false;
}

/**
 * Sign in with Google via Supabase Auth (browser-based OAuth).
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const redirectUrl = makeRedirectUri({ scheme: CONFIG.app.scheme });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        scopes: 'email profile',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });

    if (error) return { success: false, error: error.message };
    if (!data?.url) return { success: false, error: 'Sign-in flow failed' };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { success: false, error: CANCELLED };
    }
    if (result.type !== 'success' || !result.url) {
      return { success: false, error: 'Sign-in flow failed' };
    }

    const ok = await sessionFromRedirectUrl(result.url);
    if (!ok) return { success: false, error: 'Sign-in flow failed' };

    const { data: userData } = await supabase.auth.getUser();
    return { success: true, user: userData?.user ? mapUser(userData.user) : undefined };
  } catch (error) {
    console.error('[Auth] Google sign-in error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Whether the "Sign in with Apple" button should be offered (iOS only).
 */
export function isAppleSignInAvailable(): boolean {
  return Platform.OS === 'ios';
}

/**
 * Sign in with Apple via the native credential, exchanged with Supabase using a
 * nonce for replay protection.
 */
export async function signInWithApple(): Promise<AuthResult> {
  try {
    if (Platform.OS !== 'ios') {
      return { success: false, error: 'Apple Sign-In is only available on iOS' };
    }
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      return { success: false, error: 'Apple Sign-In is not available on this device' };
    }

    // Apple wants the SHA-256 hash of the nonce; Supabase wants the raw nonce.
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      return { success: false, error: 'No identity token returned from Apple' };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });

    if (error) return { success: false, error: error.message };

    // Apple only sends the full name on the FIRST sign-in; keep it if present.
    const appleName = credential.fullName
      ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
      : undefined;

    const user = data?.user;
    if (!user) return { success: false, error: 'Sign-in flow failed' };

    const mapped = mapUser(user);
    return { success: true, user: { ...mapped, displayName: mapped.displayName || appleName } };
  } catch (error: any) {
    if (error?.code === 'ERR_REQUEST_CANCELED') {
      return { success: false, error: CANCELLED };
    }
    console.error('[Auth] Apple sign-in error:', error);
    return { success: false, error: error?.message || 'Apple Sign-In failed' };
  }
}

/**
 * Sign out (clears the local Supabase session).
 */
export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('[Auth] Sign-out error:', error);
  }
}

/**
 * Permanently delete the signed-in user's account and all server-side data via
 * the `delete-account` Edge Function (which uses the service-role key), then
 * clear the local session. If the user is not signed in to the cloud, this is a
 * no-op success (local data is cleared by the caller).
 */
export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: true };

    const { data, error } = await supabase.functions.invoke('delete-account');
    if (error) {
      // supabase-js leaves `data` null on a non-2xx and puts the raw Response on
      // error.context; recover the server's message instead of the generic one.
      let message = error.message;
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === 'function') {
        try {
          const body = await ctx.json();
          if (body?.error) message = body.error;
        } catch {
          /* ignore — fall back to error.message */
        }
      }
      return { success: false, error: message };
    }
    if (data && data.ok === false) {
      return { success: false, error: data.error || 'Failed to delete account' };
    }

    // The user no longer exists server-side; just clear the local session.
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      /* ignore — session is already invalid */
    }
    return { success: true };
  } catch (error: any) {
    console.error('[Auth] Delete account error:', error);
    return { success: false, error: error?.message || 'Failed to delete account' };
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user ? mapUser(user) : null;
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
