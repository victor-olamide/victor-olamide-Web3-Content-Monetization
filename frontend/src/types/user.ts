/**
 * Shared domain types for User / Profile entities.
 */

export interface SocialLinks {
  twitter?: string;
  discord?: string;
  website?: string;
  github?: string;
}

export interface UserPreferences {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  marketingEmails?: boolean;
  privateProfile?: boolean;
  showOnlineStatus?: boolean;
  allowMessages?: boolean;
}

export interface UserSettings {
  language?: string;
  theme?: 'light' | 'dark' | 'auto';
  currency?: string;
  timezone?: string;
  twoFactorEnabled?: boolean;
}

export interface PurchaseRating {
  score?: number;
  review?: string;
  date?: string;
}

/** Full user profile as returned by the /api/profile/me endpoint */
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
  preferences?: UserPreferences;
  settings?: UserSettings;
  socialLinks?: SocialLinks;
}

/** Purchase stats used for profile reports */
export interface PurchaseStats {
  total: number;
  confirmed: number;
  pending: number;
  failed: number;
  totalSpent: number;
  byType?: Record<string, number>;
}
