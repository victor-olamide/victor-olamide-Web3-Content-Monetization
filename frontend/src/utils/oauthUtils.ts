/**
 * Social/OAuth authentication configuration and utilities
 */

export interface OAuthProvider {
  name: string;
  clientId: string;
  redirectUri: string;
  scope: string[];
  authorizationEndpoint: string;
}

export interface OAuthConfig {
  google: OAuthProvider;
  github: OAuthProvider;
}

// OAuth configuration - these values should be populated from environment variables
export const OAUTH_CONFIG: OAuthConfig = {
  google: {
    name: 'Google',
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback/google`,
    scope: ['openid', 'profile', 'email'],
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth'
  },
  github: {
    name: 'GitHub',
    clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || '',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback/github`,
    scope: ['user:email', 'read:user'],
    authorizationEndpoint: 'https://github.com/login/oauth/authorize'
  }
};

/**
 * Generate OAuth authorization URL
 */
export function generateOAuthUrl(provider: 'google' | 'github'): string {
  const config = OAUTH_CONFIG[provider];
  
  if (!config.clientId) {
    throw new Error(`${provider} OAuth client ID not configured`);
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope.join(provider === 'google' ? ' ' : ' '),
    state: generateState(),
    ...(provider === 'google' && { access_type: 'offline' })
  });

  return `${config.authorizationEndpoint}?${params.toString()}`;
}

/**
 * Generate and store state for CSRF protection
 */
export function generateState(): string {
  const state = generateRandomString(32);
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('oauth_state', state);
  }
  return state;
}

/**
 * Verify state for CSRF protection
 */
export function verifyState(state: string): boolean {
  if (typeof window === 'undefined') return false;
  const storedState = sessionStorage.getItem('oauth_state');
  sessionStorage.removeItem('oauth_state');
  return state === storedState;
}

/**
 * Generate random string for state/nonce
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Extract code from URL query parameters
 */
export function extractOAuthCode(url?: string): string | null {
  const searchParams = new URLSearchParams(
    url ? new URL(url).search : typeof window !== 'undefined' ? window.location.search : ''
  );
  return searchParams.get('code');
}

/**
 * Extract error from URL query parameters
 */
export function extractOAuthError(url?: string): string | null {
  const searchParams = new URLSearchParams(
    url ? new URL(url).search : typeof window !== 'undefined' ? window.location.search : ''
  );
  return searchParams.get('error') || searchParams.get('error_description');
}

/**
 * Exchange authorization code for tokens (server-side)
 */
export async function exchangeOAuthCode(
  provider: 'google' | 'github',
  code: string
): Promise<{ accessToken: string; user: any }> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/oauth/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ provider, code })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `OAuth callback failed: ${provider}`);
  }

  const result = await response.json();
  return {
    accessToken: result.accessToken,
    user: result.user
  };
}

/**
 * OAuth button configuration
 */
export const OAUTH_BUTTON_CONFIG = {
  google: {
    label: 'Continue with Google',
    icon: 'google',
    color: 'bg-white hover:bg-gray-50 border border-gray-300',
    textColor: 'text-gray-700'
  },
  github: {
    label: 'Continue with GitHub',
    icon: 'github',
    color: 'bg-gray-900 hover:bg-gray-800',
    textColor: 'text-white'
  }
};
