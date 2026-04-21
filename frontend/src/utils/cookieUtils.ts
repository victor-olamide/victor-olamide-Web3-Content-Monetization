/**
 * Client-side cookie utilities for managing auth tokens
 * Note: In Next.js, httpOnly cookies are better handled server-side,
 * but client-side utilities help manage token state
 */

export interface CookieOptions {
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * Get cookie value by name
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

/**
 * Set cookie value
 */
export function setCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  if (typeof document === 'undefined') return;

  const {
    maxAge = 7 * 24 * 60 * 60 * 1000, // 7 days default
    path = '/',
    secure = true,
    sameSite = 'lax'
  } = options;

  let cookieString = `${name}=${encodeURIComponent(value)}; path=${path}; SameSite=${sameSite}`;

  if (secure) {
    cookieString += '; Secure';
  }

  if (maxAge) {
    const expiryDate = new Date(Date.now() + maxAge);
    cookieString += `; expires=${expiryDate.toUTCString()}`;
  }

  if (options.domain) {
    cookieString += `; domain=${options.domain}`;
  }

  document.cookie = cookieString;
}

/**
 * Delete cookie by name
 */
export function deleteCookie(name: string, path: string = '/'): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
}

/**
 * Clear all cookies
 */
export function clearAllCookies(): void {
  if (typeof document === 'undefined') return;

  document.cookie.split(';').forEach((cookie) => {
    const equals = cookie.indexOf('=');
    const name = equals > -1 ? cookie.substring(0, equals).trim() : cookie.trim();
    if (name) {
      deleteCookie(name);
    }
  });
}

/**
 * Get all cookies as object
 */
export function getAllCookies(): Record<string, string> {
  if (typeof document === 'undefined') return {};

  const cookies: Record<string, string> = {};
  document.cookie.split(';').forEach((cookie) => {
    const [name, value] = cookie.split('=');
    if (name && value) {
      cookies[name.trim()] = decodeURIComponent(value);
    }
  });
  return cookies;
}

/**
 * Check if cookie exists
 */
export function hasCookie(name: string): boolean {
  return getCookie(name) !== null;
}

/**
 * Server-side cookie header builder (for API calls)
 */
export function buildCookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}
