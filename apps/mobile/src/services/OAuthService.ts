/**
 * OAuth Service - Gmail and Outlook authentication
 */
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { CONFIG, getGoogleClientId } from '../config';

// Ensure web browser redirects work
WebBrowser.maybeCompleteAuthSession();

export type OAuthProvider = 'gmail' | 'outlook';

export interface OAuthResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  email?: string;
  error?: string;
}

// Google OAuth discovery document
const googleDiscovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// Microsoft OAuth discovery document
const microsoftDiscovery = {
  authorizationEndpoint: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize',
  tokenEndpoint: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
  revocationEndpoint: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/logout',
};

/**
 * Get redirect URI for OAuth
 */
export function getRedirectUri(provider: OAuthProvider): string {
  return AuthSession.makeRedirectUri({
    scheme: CONFIG.app.scheme,
    path: 'oauth-callback',
  });
}

/**
 * Authenticate with Google (Gmail)
 */
export async function authenticateWithGoogle(): Promise<OAuthResult> {
  try {
    const clientId = getGoogleClientId();
    const redirectUri = getRedirectUri('gmail');

    const authRequest = new AuthSession.AuthRequest({
      clientId,
      scopes: CONFIG.google.scopes,
      redirectUri,
      usePKCE: true,
    });

    const result = await authRequest.promptAsync(googleDiscovery);

    if (result.type === 'success' && result.params.code) {
      // Exchange code for tokens
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId,
          code: result.params.code,
          redirectUri,
          extraParams: {
            code_verifier: authRequest.codeVerifier || '',
          },
        },
        googleDiscovery
      );

      // Get user email from token
      const userInfo = await fetchGoogleUserInfo(tokenResult.accessToken);

      return {
        success: true,
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        expiresAt: tokenResult.expiresIn 
          ? new Date(Date.now() + tokenResult.expiresIn * 1000).toISOString()
          : undefined,
        email: userInfo?.email,
      };
    }

    return {
      success: false,
      error: result.type === 'cancel' ? 'User cancelled' : 'Authentication failed',
    };
  } catch (error) {
    console.error('Google auth error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Authenticate with Microsoft (Outlook)
 */
export async function authenticateWithMicrosoft(): Promise<OAuthResult> {
  try {
    const redirectUri = getRedirectUri('outlook');

    const authRequest = new AuthSession.AuthRequest({
      clientId: CONFIG.microsoft.clientId,
      scopes: CONFIG.microsoft.scopes,
      redirectUri,
      usePKCE: true,
    });

    const result = await authRequest.promptAsync(microsoftDiscovery);

    if (result.type === 'success' && result.params.code) {
      // Exchange code for tokens
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId: CONFIG.microsoft.clientId,
          code: result.params.code,
          redirectUri,
          extraParams: {
            code_verifier: authRequest.codeVerifier || '',
          },
        },
        microsoftDiscovery
      );

      // Get user email from Microsoft Graph
      const userInfo = await fetchMicrosoftUserInfo(tokenResult.accessToken);

      return {
        success: true,
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        expiresAt: tokenResult.expiresIn
          ? new Date(Date.now() + tokenResult.expiresIn * 1000).toISOString()
          : undefined,
        email: userInfo?.mail || userInfo?.userPrincipalName,
      };
    }

    return {
      success: false,
      error: result.type === 'cancel' ? 'User cancelled' : 'Authentication failed',
    };
  } catch (error) {
    console.error('Microsoft auth error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch Google user info
 */
async function fetchGoogleUserInfo(accessToken: string): Promise<{ email: string } | null> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.json();
  } catch {
    return null;
  }
}

/**
 * Fetch Microsoft user info
 */
async function fetchMicrosoftUserInfo(accessToken: string): Promise<{ mail: string; userPrincipalName: string } | null> {
  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.json();
  } catch {
    return null;
  }
}

/**
 * Revoke Google token
 */
export async function revokeGoogleToken(token: string): Promise<void> {
  try {
    await AuthSession.revokeAsync({ token }, googleDiscovery);
  } catch (error) {
    console.error('Failed to revoke Google token:', error);
  }
}

/**
 * Authenticate with provider
 */
export async function authenticate(provider: OAuthProvider): Promise<OAuthResult> {
  switch (provider) {
    case 'gmail':
      return authenticateWithGoogle();
    case 'outlook':
      return authenticateWithMicrosoft();
    default:
      return { success: false, error: 'Unknown provider' };
  }
}
