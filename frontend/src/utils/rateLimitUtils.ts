/**
 * Rate Limit Utility Functions (Frontend)
 * 
 * Helper functions for parsing, formatting, and displaying rate limit information.
 * 
 * @module utils/rateLimitUtils
 */

export interface RateLimitStatus {
  tier: string;
  limits: {
    maxRequests: number;
    windowMs: number;
    burstLimit: number;
    burstWindowMs: number;
    dailyLimit: number;
    concurrentLimit: number;
  };
  current?: {
    windowRequests: number;
    burstRequests: number;
    dailyRequests: number;
    activeRequests: number;
  };
  remaining: {
    window: number;
    burst: number;
    daily: number;
    concurrent: number;
  };
  isBlocked: boolean;
  blockedUntil?: string;
  violations: number;
  lastViolationAt?: string;
  lastRequestAt?: string;
}

export interface RateLimitTier {
  name: string;
  maxRequests: number;
  windowMs: number;
  burstLimit: number;
  burstWindowMs: number;
  dailyLimit: number;
  concurrentLimit: number;
  description: string;
  windowFormatted: string;
  burstWindowFormatted: string;
}

export interface TierComparison {
  tierA: RateLimitTier & { name: string };
  tierB: RateLimitTier & { name: string };
  differences: {
    maxRequests: number;
    burstLimit: number;
    dailyLimit: number;
    concurrentLimit: number;
  };
  multipliers: {
    maxRequests: string;
    burstLimit: string;
    dailyLimit: string;
    concurrentLimit: string;
  };
}

export interface ParsedRateLimitHeaders {
  limit: number | null;
  remaining: number | null;
  reset: number | null;
  retryAfter: number | null;
  tier: string | null;
  dailyLimit: number | null;
  dailyRemaining: number | null;
}

/**
 * Parse rate limit headers from a fetch Response
 * @param headers - Response headers
 * @returns Parsed rate limit information
 */
export function parseRateLimitHeaders(headers: Headers): ParsedRateLimitHeaders {
  return {
    limit: parseIntOrNull(headers.get('x-ratelimit-limit')),
    remaining: parseIntOrNull(headers.get('x-ratelimit-remaining')),
    reset: parseIntOrNull(headers.get('x-ratelimit-reset')),
    retryAfter: parseIntOrNull(headers.get('retry-after')),
    tier: headers.get('x-ratelimit-tier'),
    dailyLimit: parseIntOrNull(headers.get('x-ratelimit-daily-limit')),
    dailyRemaining: parseIntOrNull(headers.get('x-ratelimit-daily-remaining'))
  };
}

/**
 * Parse a string to integer or return null
 * @param value - String value to parse
 * @returns Parsed integer or null
 */
function parseIntOrNull(value: string | null): number | null {
  if (value === null) return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Format seconds into a human-readable retry-after string
 * @param seconds - Number of seconds
 * @returns Formatted string
 */
export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  if (seconds < 86400) {
    const hours = Math.ceil(seconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  const days = Math.ceil(seconds / 86400);
  return `${days} day${days !== 1 ? 's' : ''}`;
}

/**
 * Format milliseconds into a human-readable duration
 * @param ms - Duration in milliseconds
 * @returns Formatted string
 */
export function formatWindowDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${Math.round(ms / 3600000)}h`;
}

/**
 * Calculate usage percentage
 * @param current - Current request count
 * @param limit - Maximum allowed
 * @returns Percentage (0-100)
 */
export function calculateUsagePercentage(current: number, limit: number): number {
  if (limit === 0) return 100;
  return Math.min(100, Math.round((current / limit) * 100));
}

/**
 * Get a color based on usage percentage for UI display
 * @param percentage - Usage percentage (0-100)
 * @returns CSS color string
 */
export function getStatusColor(percentage: number): string {
  if (percentage >= 100) return '#dc3545'; // Red - exceeded
  if (percentage >= 90) return '#fd7e14'; // Orange - critical
  if (percentage >= 75) return '#ffc107'; // Yellow - warning
  if (percentage >= 50) return '#17a2b8'; // Blue - moderate
  return '#28a745'; // Green - ok
}

/**
 * Get a status label based on usage percentage
 * @param percentage - Usage percentage (0-100)
 * @returns Status label string
 */
export function getStatusLabel(percentage: number): string {
  if (percentage >= 100) return 'Exceeded';
  if (percentage >= 90) return 'Critical';
  if (percentage >= 75) return 'Warning';
  if (percentage >= 50) return 'Moderate';
  return 'OK';
}

/**
 * Get tier display name with proper capitalization
 * @param tier - Tier identifier
 * @returns Display name
 */
export function getTierDisplayName(tier: string): string {
  const names: Record<string, string> = {
    free: 'Free',
    basic: 'Basic',
    premium: 'Premium',
    enterprise: 'Enterprise',
    admin: 'Admin'
  };
  return names[tier] || tier.charAt(0).toUpperCase() + tier.slice(1);
}

/**
 * Get tier badge color for UI display
 * @param tier - Tier identifier
 * @returns CSS color string
 */
export function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    free: '#6c757d',
    basic: '#007bff',
    premium: '#6f42c1',
    enterprise: '#fd7e14',
    admin: '#dc3545'
  };
  return colors[tier] || '#6c757d';
}

/**
 * Format a number with commas for display
 * @param num - Number to format
 * @returns Formatted string
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Calculate time until reset from a Unix timestamp
 * @param resetTimestamp - Unix timestamp (seconds)
 * @returns Seconds until reset
 */
export function getSecondsUntilReset(resetTimestamp: number): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, resetTimestamp - now);
}

/**
 * Create a rate-limit-aware fetch wrapper
 * @param url - Request URL
 * @param options - Fetch options
 * @param onRateLimit - Callback when rate limited
 * @returns Fetch response
 */
export async function rateLimitAwareFetch(
  url: string,
  options: RequestInit = {},
  onRateLimit?: (retryAfter: number) => void
): Promise<Response> {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const retryAfter = parseIntOrNull(response.headers.get('retry-after'));
    if (onRateLimit && retryAfter !== null) {
      onRateLimit(retryAfter);
    }
  }

  return response;
}

/**
 * Retry a fetch request with exponential backoff when rate limited
 * @param url - Request URL
 * @param options - Fetch options
 * @param maxRetries - Maximum retry attempts
 * @returns Fetch response
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    lastResponse = response;

    if (response.status !== 429) {
      return response;
    }

    if (attempt < maxRetries) {
      const retryAfter = parseIntOrNull(response.headers.get('retry-after'));
      const delay = retryAfter ? retryAfter * 1000 : Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return lastResponse!;
}
