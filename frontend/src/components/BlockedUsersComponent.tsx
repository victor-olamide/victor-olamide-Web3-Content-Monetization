import React, { useState, useEffect } from 'react';
import { Trash2, AlertCircle, Check, X } from 'lucide-react';

interface BlockedUser {
  address: string;
  blockedAt: string;
  displayName?: string;
  avatar?: string;
}

/**
 * Blocked Users Management Component
 * Allows users to view and manage their blocked users list
 */
export const BlockedUsersComponent: React.FC = () => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [unblockingAddress, setUnblockingAddress] = useState<string | null>(null);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      setIsLoading(true);
      // Get profile to extract blocked users list
      const response = await fetch('/api/profile/me', {
        headers: {
          'X-Session-Id': localStorage.getItem('sessionId') || ''
        }
      });

      if (!response.ok) throw new Error('Failed to fetch profile');

      const data = await response.json();
      const blockedList = data.data.blockedUsers || [];

      // For each blocked user, try to fetch their basic info
      const blockedUsersWithInfo = await Promise.all(
        blockedList.map(async (address: string) => {
          try {
            const profileResponse = await fetch(`/api/profile/${address}`, {
              headers: {
                'X-Session-Id': localStorage.getItem('sessionId') || ''
              }
            });

            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              return {
                address,
                blockedAt: new Date().toISOString(), // Backend should provide this
                displayName: profileData.data.displayName,
                avatar: profileData.data.avatar
              };
            }
          } catch (err) {
            // If fetch fails, just use the address
          }

          return {
            address,
            blockedAt: new Date().toISOString()
          };
        })
      );

      setBlockedUsers(blockedUsersWithInfo);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch blocked users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (address: string) => {
    try {
      setUnblockingAddress(address);
      const response = await fetch(`/api/profile/block/${address}`, {
        method: 'DELETE',
        headers: {
          'X-Session-Id': localStorage.getItem('sessionId') || ''
        }
      });

      if (!response.ok) throw new Error('Failed to unblock user');

      setBlockedUsers((prev) => prev.filter((u) => u.address !== address));
      setSuccess(`User unblocked successfully!`);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unblock user');
    } finally {
      setUnblockingAddress(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Blocked Users</h1>
            <p className="text-gray-600 mt-2">
              Manage the users you've blocked. They won't be able to contact or interact with you.
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">{blockedUsers.length}</p>
            <p className="text-gray-600 text-sm">Blocked Users</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {blockedUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <X className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Blocked Users</h2>
            <p className="text-gray-600">You haven't blocked any users yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Desktop View */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Blocked On
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {blockedUsers.map((user) => (
                    <tr key={user.address} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.displayName || 'User'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                👤
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.displayName || 'Unknown User'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {user.address.slice(0, 10)}...{user.address.slice(-8)}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(user.blockedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleUnblock(user.address)}
                          disabled={unblockingAddress === user.address}
                          className="flex items-center gap-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg transition disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Unblock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-gray-200">
              {blockedUsers.map((user) => (
                <div key={user.address} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.displayName || 'User'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            👤
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.displayName || 'Unknown User'}
                        </p>
                        <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded inline-block mt-1">
                          {user.address.slice(0, 10)}...
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Blocked on {new Date(user.blockedAt).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => handleUnblock(user.address)}
                      disabled={unblockingAddress === user.address}
                      className="flex items-center gap-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg transition disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Unblock
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Box */}
        {blockedUsers.length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-700">
              <strong>Note:</strong> Blocked users won't be able to see your profile, contact you, or
              interact with your content. You can unblock users at any time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockedUsersComponent;
