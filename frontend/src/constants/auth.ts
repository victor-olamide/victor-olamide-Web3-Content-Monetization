/**
 * Authentication constants and configuration
 */

export const AUTH_CONFIG = {
  // API endpoints
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  
  // Token settings
  ACCESS_TOKEN_EXPIRY: 15 * 60 * 1000, // 15 minutes
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days
  TOKEN_REFRESH_BUFFER: 5 * 60 * 1000, // Refresh 5 minutes before expiry
  
  // Cookie settings
  COOKIE_PATH: '/',
  COOKIE_DOMAIN: undefined,
  COOKIE_SAME_SITE: 'Lax' as const,
  COOKIE_SECURE: process.env.NODE_ENV === 'production',
  
  // Session settings
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes of inactivity
  INACTIVITY_WARNING_TIME: 5 * 60 * 1000, // Warn 5 minutes before logout
  
  // Password requirements
  MIN_PASSWORD_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL_CHARS: true,
  
  // Validation
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Rate limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  MAX_PASSWORD_RESET_ATTEMPTS: 3,
  PASSWORD_RESET_LOCKOUT_DURATION: 60 * 60 * 1000, // 1 hour
  
  // UI
  TOAST_DURATION: 5000,
  REDIRECT_DELAY: 1500
};

// Cookie names
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  SESSION_ID: 'sessionId',
  THEME: 'theme'
};

// Local storage keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'user_preferences',
  AUTH_STATE: 'auth_state',
  LAST_LOGIN: 'last_login'
};

// Error messages
export const AUTH_ERROR_MESSAGES = {
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PASSWORD: 'Password must be at least 8 characters',
  PASSWORD_MISMATCH: 'Passwords do not match',
  EMAIL_TAKEN: 'Email already in use',
  INVALID_CREDENTIALS: 'Invalid email or password',
  SESSION_EXPIRED: 'Your session has expired. Please log in again',
  UNAUTHORIZED: 'You are not authorized to view this page',
  NETWORK_ERROR: 'Network error. Please try again.',
  SERVER_ERROR: 'Server error. Please try again later.'
};

// Success messages
export const AUTH_SUCCESS_MESSAGES = {
  LOGIN: 'Successfully logged in',
  LOGOUT: 'Successfully logged out',
  REGISTER: 'Account created successfully',
  PASSWORD_CHANGED: 'Password changed successfully',
  PASSWORD_RESET: 'Password reset successfully',
  PROFILE_UPDATED: 'Profile updated successfully'
};

// Routes
export const AUTH_ROUTES = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  UNAUTHORIZED: '/unauthorized'
};

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  CREATOR: 'creator',
  USER: 'user'
} as const;

// API endpoints (relative to API_BASE_URL)
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  PROFILE: '/auth/profile',
  VERIFY: '/auth/verify',
  REFRESH: '/auth/refresh',
  CHANGE_PASSWORD: '/auth/change-password',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password'
};
