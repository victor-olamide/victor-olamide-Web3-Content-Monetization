'use client';

import React from 'react';
import Link from 'next/link';
import { useJWTAuth } from '@/contexts/JWTAuthContext';
import { User, Mail, Calendar, Shield } from 'lucide-react';

/**
 * User info card component
 */
export function UserInfoCard() {
  const { user, isLoading } = useJWTAuth();

  if (isLoading || !user) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-12 bg-gray-200 rounded-full w-12 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
          {user.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{user.name}</h3>
          <p className="text-sm text-gray-600 capitalize">{user.role}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 text-gray-700">
          <Mail size={18} className="text-gray-400" />
          <span className="text-sm break-all">{user.email}</span>
        </div>

        <div className="flex items-center gap-3 text-gray-700">
          <Calendar size={18} className="text-gray-400" />
          <span className="text-sm">
            Member since{' '}
            {new Date(user.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric'
            })}
          </span>
        </div>

        {user.role && (
          <div className="flex items-center gap-3 text-gray-700">
            <Shield size={18} className="text-gray-400" />
            <span className="text-sm capitalize">{user.role} Account</span>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-2 border-t pt-4">
        <Link
          href="/profile"
          className="block w-full px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded-lg hover:bg-blue-100 transition text-center"
        >
          View Profile
        </Link>
        <Link
          href="/settings"
          className="block w-full px-4 py-2 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 transition text-center"
        >
          Settings
        </Link>
      </div>
    </div>
  );
}

/**
 * User badge component
 */
interface UserBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export function UserBadge({ size = 'md', showName = false }: UserBadgeProps) {
  const { user } = useJWTAuth();

  if (!user) return null;

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} rounded-full bg-blue-600 text-white flex items-center justify-center font-bold`}
      >
        {user.name?.charAt(0).toUpperCase()}
      </div>
      {showName && (
        <div>
          <p className="text-sm font-medium text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-500 capitalize">{user.role}</p>
        </div>
      )}
    </div>
  );
}

/**
 * User role tag component
 */
export function UserRoleTag() {
  const { user } = useJWTAuth();

  if (!user) return null;

  const roleColors: Record<string, { bg: string; text: string }> = {
    admin: { bg: 'bg-red-100', text: 'text-red-700' },
    moderator: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    user: { bg: 'bg-blue-100', text: 'text-blue-700' },
    creator: { bg: 'bg-green-100', text: 'text-green-700' }
  };

  const colors = roleColors[user.role] || roleColors.user;

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}>
      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
    </span>
  );
}
