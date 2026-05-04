/**
 * User Profile API Utility Functions
 * Provides typed wrappers for all profile-related API endpoints
 */

const API_BASE = '/api/profile';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Get session ID from localStorage
 */
const getSessionId = (): string => {
  return localStorage.getItem('sessionId') || '';
};

/**
 * Get authenticated user's profile
 */
export const getProfile = async () => {
  const response = await fetch(`${API_BASE}/me`, {
    headers: {
      'X-Session-Id': getSessionId()
    }
  });

  if (!response.ok) throw new Error('Failed to fetch profile');

  const data: ApiResponse<any> = await response.json();
  return data.data;
};

/**
 * Get public or full profile by address
 */
export const getProfileByAddress = async (address: string) => {
  const response = await fetch(`${API_BASE}/${address}`, {
    headers: {
      'X-Session-Id': getSessionId()
    }
  });

  if (!response.ok) throw new Error('Failed to fetch profile');

  const data: ApiResponse<any> = await response.json();
  return data.data;
};

/**
 * Update user profile
 */
export const updateProfile = async (updates: {
  displayName?: string;
  avatar?: string;
  username?: string;
  bio?: string;
}) => {
  const response = await fetch(`${API_BASE}/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': getSessionId()
    },
    body: JSON.stringify(updates)
  });

  if (!response.ok) throw new Error('Failed to update profile');

  const data: ApiResponse<any> = await response.json();
  return data.data;
};

/**
 * Update notification and privacy preferences
 */
export const updatePreferences = async (preferences: {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  marketingEmails?: boolean;
  privateProfile?: boolean;
  showOnlineStatus?: boolean;
  allowMessages?: boolean;
}) => {
  const response = await fetch(`${API_BASE}/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': getSessionId()
    },
    body: JSON.stringify(preferences)
  });

  if (!response.ok) throw new Error('Failed to update preferences');

  const data: ApiResponse<any> = await response.json();
  return data.data;
};

/**
 * Update user settings (language, theme, currency, timezone, 2FA)
 */
export const updateSettings = async (settings: {
  language?: string;
  theme?: 'light' | 'dark' | 'auto';
  currency?: string;
  timezone?: string;
  twoFactorEnabled?: boolean;
}) => {
  const response = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': getSessionId()
    },
    body: JSON.stringify(settings)
  });

  if (!response.ok) throw new Error('Failed to update settings');

  const data: ApiResponse<any> = await response.json();
  return data.data;
};

/**
 * Update social media links
 */
export const updateSocialLinks = async (socialLinks: {
  twitter?: string;
  discord?: string;
  website?: string;
  github?: string;
}) => {
  const response = await fetch(`${API_BASE}/social-links`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': getSessionId()
    },
    body: JSON.stringify(socialLinks)
  });

  if (!response.ok) throw new Error('Failed to update social links');

  const data: ApiResponse<any> = await response.json();
  return data.data;
};

/**
 * Get purchase history with pagination and sorting
 */
export const getPurchaseHistory = async (options: {
  skip?: number;
  limit?: number;
  sortBy?: 'date-desc' | 'date-asc' | 'price-desc' | 'price-asc';
} = {}) => {
  const params = new URLSearchParams({
    skip: options.skip?.toString() || '0',
    limit: options.limit?.toString() || '10',
    sortBy: options.sortBy || 'date-desc'
  });

  const response = await fetch(`${API_BASE}/purchases?${params}`, {
    headers: {
      'X-Session-Id': getSessionId()
    }
  });

  if (!response.ok) throw new Error('Failed to fetch purchase history');

  const data: ApiResponse<any> = await response.json();
  return data.data;
};

/**
 * Get favorite purchases with pagination
 */
export const getFavorites = async (options: {
  skip?: number;
  limit?: number;
} = {}) => {
  const params = new URLSearchParams({
    skip: options.skip?.toString() || '0',
    limit: options.limit?.toString() || '10'
  });

  const response = await fetch(`${API_BASE}/favorites?${params}`, {
    headers: {
      'X-Session-Id': getSessionId()
    }
  });

  if (!response.ok) throw new Error('Failed to fetch favorites');

  const data: ApiResponse<any> = await response.json();
  return data.data;
};

/**
 * Toggle favorite status for a purchase
 */
export const toggleFavorite = async (purchaseId: string) => {
  const response = await fetch(`${API_BASE}/favorites/${purchaseId}`, {
    method: 'POST',
    headers: {
      'X-Session-Id': getSessionId()
    }
  });

  if (!response.ok) throw new Error('Failed to toggle favorite');

  const data: ApiResponse<any> = await response.json();
  return data.data;
};

/**
 * Get profile statistics (totalPurchases, totalSpent, favoriteCount, ratedCount)
 */
export const getProfileStats = async () => {
  const response = await fetch(`${API_BASE}/stats`, {
    headers: {
      'X-Session-Id': getSessionId()
    }
  });

  if (!response.ok) throw new Error('Failed to fetch profile stats');

  const data: ApiResponse<any> = await response.json();
  return data.data;
};

/**
 * Add or update rating and review for a purchase
 */
export const addRating = async (
  purchaseId: string,
  rating: number,
  review?: string
) => {
  const response = await fetch(`${API_BASE}/rating/${purchaseId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': getSessionId()
    },
    body: JSON.stringify({ rating, review })
  });

  if (!response.ok) throw new Error('Failed to add rating');

  const data: ApiResponse<any> = await response.json();
  return data.data;
};

/**
 * Record content access (view or download)
 */
export const recordAccess = async (
  purchaseId: string,
  accessType: 'view' | 'download'
) => {
  const response = await fetch(`${API_BASE}/access/${purchaseId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': getSessionId()
    },
    body: JSON.stringify({ accessType })
  });

  if (!response.ok) throw new Error(`Failed to record ${accessType}`);

  const data: ApiResponse<any> = await response.json();
  return data.data;
};

/**
 * Update watch/read completion percentage
 */
export const updateCompletion = async (
  purchaseId: string,
  percentage: number
) => {
  const response = await fetch(`${API_BASE}/completion/${purchaseId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': getSessionId()
    },
    body: JSON.stringify({ percentage })
  });

  if (!response.ok) throw new Error('Failed to update completion');

  const data: ApiResponse<any> = await response.json();
  return data.data;
};

/**
 * Block a user
 */
export const blockUser = async (blockedAddress: string) => {
  const response = await fetch(`${API_BASE}/block/${blockedAddress}`, {
    method: 'POST',
    headers: {
      'X-Session-Id': getSessionId()
    }
  });

  if (!response.ok) throw new Error('Failed to block user');

  const data: ApiResponse<any> = await response.json();
  return data.data;
};

/**
 * Unblock a user
 */
export const unblockUser = async (blockedAddress: string) => {
  const response = await fetch(`${API_BASE}/block/${blockedAddress}`, {
    method: 'DELETE',
    headers: {
      'X-Session-Id': getSessionId()
    }
  });

  if (!response.ok) throw new Error('Failed to unblock user');

  const data: ApiResponse<any> = await response.json();
  return data.data;
};

/**
 * Profile API client object
 */
export const profileApi = {
  getProfile,
  getProfileByAddress,
  updateProfile,
  updatePreferences,
  updateSettings,
  updateSocialLinks,
  getPurchaseHistory,
  getFavorites,
  toggleFavorite,
  getProfileStats,
  addRating,
  recordAccess,
  updateCompletion,
  blockUser,
  unblockUser
};

export default profileApi;
