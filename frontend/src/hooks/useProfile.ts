import { useState, useEffect, useCallback, useRef } from 'react';

export interface UserProfile {
  address: string;
  displayName?: string;
  avatar?: string;
  username?: string;
  bio?: string;
  isVerified?: boolean;
  profileCompleteness?: number;
  totalPurchases?: number;
  totalSpent?: number;
  lastLogin?: string;
  preferences?: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    marketingEmails?: boolean;
    privateProfile?: boolean;
    showOnlineStatus?: boolean;
    allowMessages?: boolean;
  };
  settings?: {
    language?: string;
    theme?: 'light' | 'dark' | 'auto';
    currency?: string;
    timezone?: string;
    twoFactorEnabled?: boolean;
  };
  socialLinks?: {
    twitter?: string;
    discord?: string;
    website?: string;
    github?: string;
  };
}

interface UseProfileOptions {
  cacheTime?: number;
  autoRefresh?: boolean;
  autoRefreshInterval?: number;
}

/**
 * Custom hook for managing user profile
 * Provides profile fetching, caching, and auto-refresh capabilities
 */
export const useProfile = (options: UseProfileOptions = {}) => {
  const {
    cacheTime = 5 * 60 * 1000, // 5 minutes default
    autoRefresh = false,
    autoRefreshInterval = 60 * 1000 // 1 minute default
  } = options;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cacheRef = useRef<{
    data: UserProfile | null;
    timestamp: number;
  }>({
    data: null,
    timestamp: 0
  });

  const refreshIntervalRef = useRef<NodeJS.Timeout>();

  /**
   * Fetch profile from API
   */
  const fetchProfile = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache
      const now = Date.now();
      if (
        !forceRefresh &&
        cacheRef.current.data &&
        now - cacheRef.current.timestamp < cacheTime
      ) {
        setProfile(cacheRef.current.data);
        setError(null);
        return;
      }

      setIsLoading(true);
      const response = await fetch('/api/profile/me', {
        headers: {
          'X-Session-Id': localStorage.getItem('sessionId') || ''
        }
      });

      if (!response.ok) throw new Error('Failed to fetch profile');

      const data = await response.json();
      const profileData = data.data;

      // Update cache
      cacheRef.current = {
        data: profileData,
        timestamp: Date.now()
      };

      setProfile(profileData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [cacheTime]);

  /**
   * Update profile data
   */
  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/profile/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Id': localStorage.getItem('sessionId') || ''
          },
          body: JSON.stringify(updates)
        });

        if (!response.ok) throw new Error('Failed to update profile');

        const data = await response.json();
        const updatedProfile = data.data;

        // Update cache
        cacheRef.current = {
          data: updatedProfile,
          timestamp: Date.now()
        };

        setProfile(updatedProfile);
        setError(null);

        return updatedProfile;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update profile';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Update preferences
   */
  const updatePreferences = useCallback(
    async (preferences: UserProfile['preferences']) => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/profile/preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Id': localStorage.getItem('sessionId') || ''
          },
          body: JSON.stringify(preferences)
        });

        if (!response.ok) throw new Error('Failed to update preferences');

        const data = await response.json();
        const updatedProfile = data.data;

        // Update cache
        if (cacheRef.current.data) {
          cacheRef.current.data.preferences = updatedProfile.preferences;
        }

        setProfile((prev) => prev ? { ...prev, preferences: updatedProfile.preferences } : null);
        setError(null);

        return updatedProfile;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update preferences';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Update settings
   */
  const updateSettings = useCallback(
    async (settings: UserProfile['settings']) => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/profile/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Id': localStorage.getItem('sessionId') || ''
          },
          body: JSON.stringify(settings)
        });

        if (!response.ok) throw new Error('Failed to update settings');

        const data = await response.json();
        const updatedProfile = data.data;

        // Update cache
        if (cacheRef.current.data) {
          cacheRef.current.data.settings = updatedProfile.settings;
        }

        setProfile((prev) => prev ? { ...prev, settings: updatedProfile.settings } : null);
        setError(null);

        return updatedProfile;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update settings';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Update social links
   */
  const updateSocialLinks = useCallback(
    async (socialLinks: UserProfile['socialLinks']) => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/profile/social-links', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Id': localStorage.getItem('sessionId') || ''
          },
          body: JSON.stringify(socialLinks)
        });

        if (!response.ok) throw new Error('Failed to update social links');

        const data = await response.json();
        const updatedProfile = data.data;

        // Update cache
        if (cacheRef.current.data) {
          cacheRef.current.data.socialLinks = updatedProfile.socialLinks;
        }

        setProfile((prev) => prev ? { ...prev, socialLinks: updatedProfile.socialLinks } : null);
        setError(null);

        return updatedProfile;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update social links';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Clear cache
   */
  const clearCache = useCallback(() => {
    cacheRef.current = {
      data: null,
      timestamp: 0
    };
  }, []);

  /**
   * Initial fetch and auto-refresh setup
   */
  useEffect(() => {
    fetchProfile();

    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchProfile(true);
      }, autoRefreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchProfile, autoRefresh, autoRefreshInterval]);

  return {
    profile,
    isLoading,
    error,
    fetchProfile,
    updateProfile,
    updatePreferences,
    updateSettings,
    updateSocialLinks,
    clearCache
  };
};

export default useProfile;
