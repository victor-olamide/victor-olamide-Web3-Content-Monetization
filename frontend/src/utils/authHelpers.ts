/**
 * Common authentication helper functions
 */

/**
 * Check if user has a specific role
 */
export function hasRole(userRole: string | undefined, requiredRole: string): boolean {
  if (!userRole) return false;
  return userRole === requiredRole;
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(userRole: string | undefined, requiredRoles: string[]): boolean {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}

/**
 * Check if user has admin role
 */
export function isAdmin(userRole: string | undefined): boolean {
  return hasRole(userRole, 'admin');
}

/**
 * Check if user has moderator role or above
 */
export function isModerator(userRole: string | undefined): boolean {
  return hasAnyRole(userRole, ['admin', 'moderator']);
}

/**
 * Get readable role name
 */
export function getRoleName(role: string): string {
  const roleNames: Record<string, string> = {
    'admin': 'Administrator',
    'moderator': 'Moderator',
    'user': 'User',
    'guest': 'Guest'
  };
  return roleNames[role] || role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Get role color for UI
 */
export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    'admin': 'red',
    'moderator': 'orange',
    'user': 'blue',
    'guest': 'gray'
  };
  return colors[role] || 'gray';
}

/**
 * Get role icon for UI
 */
export function getRoleIcon(role: string): string {
  const icons: Record<string, string> = {
    'admin': '👑',
    'moderator': '🛡️',
    'user': '👤',
    'guest': '👥'
  };
  return icons[role] || '❓';
}

/**
 * Format user display name
 */
export function formatUserName(name: string | undefined, email?: string): string {
  if (!name && !email) return 'User';
  if (name) return name;
  if (email) return email.split('@')[0];
  return 'User';
}

/**
 * Get user initials for avatar
 */
export function getUserInitials(name: string | undefined, email?: string): string {
  const displayName = formatUserName(name, email);
  return displayName
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format email for display (truncate long emails)
 */
export function formatEmail(email: string, maxLength: number = 30): string {
  if (email.length <= maxLength) return email;
  const [localPart, domain] = email.split('@');
  const truncatedLocal = localPart.slice(0, Math.max(1, maxLength - domain.length - 2)) + '...';
  return `${truncatedLocal}@${domain}`;
}

/**
 * Check if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check password strength
 */
export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  let strength = 0;

  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  if (strength <= 2) return 'weak';
  if (strength <= 4) return 'medium';
  return 'strong';
}

/**
 * Get password strength color
 */
export function getPasswordStrengthColor(strength: 'weak' | 'medium' | 'strong'): string {
  const colors = {
    weak: 'red',
    medium: 'yellow',
    strong: 'green'
  };
  return colors[strength];
}

/**
 * Format last login time
 */
export function formatLastLogin(date: Date | string | undefined): string {
  if (!date) return 'Never';

  const lastLogin = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - lastLogin.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return lastLogin.toLocaleDateString();
}

/**
 * Check if user is logged in (for debugging)
 */
export function debugAuthState(user: any): string {
  if (!user) return 'Not authenticated';
  return `Authenticated as ${user.name || user.email} (${user.role || 'no role'})`;
}

/**
 * Validate auth token format
 */
export function isValidTokenFormat(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3;
}

/**
 * Get token expiry timestamp (from JWT)
 */
export function getTokenExpiry(token: string): number | null {
  try {
    if (!isValidTokenFormat(token)) return null;

    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch (err) {
    console.error('Failed to parse token expiry:', err);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;
  return expiry < Date.now();
}

/**
 * Get time until token expiry
 */
export function getTimeUntilExpiry(token: string): number | null {
  const expiry = getTokenExpiry(token);
  if (!expiry) return null;
  const remaining = expiry - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * Format token expiry as human readable
 */
export function formatTokenExpiry(token: string): string {
  const expiry = getTokenExpiry(token);
  if (!expiry) return 'Unknown';

  const remaining = expiry - Date.now();
  if (remaining <= 0) return 'Expired';

  const mins = Math.floor(remaining / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return 'Expiring soon';
  if (mins < 60) return `${mins}m remaining`;
  if (hours < 24) return `${hours}h remaining`;
  return `${days}d remaining`;
}

/**
 * Type guards
 */
export function isAuthError(error: any): error is { message: string; code?: string } {
  return error && typeof error.message === 'string';
}

/**
 * Session storage helpers
 */
export const SessionStorageHelper = {
  setAuthState: (state: any) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth_state', JSON.stringify(state));
    }
  },

  getAuthState: () => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('auth_state');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  },

  clearAuthState: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('auth_state');
    }
  },

  setLoginTime: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('login_time', new Date().toISOString());
    }
  },

  getLoginTime: () => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('login_time');
      return stored ? new Date(stored) : null;
    }
    return null;
  },

  getSessionDuration: () => {
    if (typeof window !== 'undefined') {
      const loginTime = SessionStorageHelper.getLoginTime();
      if (loginTime) {
        return new Date().getTime() - loginTime.getTime();
      }
    }
    return null;
  }
};
