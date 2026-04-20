'use client';

import React, { useState } from 'react';
import { useJWTAuth } from '@/contexts/JWTAuthContext';
import { ProtectedRoute } from '@/components/AuthGuard';
import { FormInput, PasswordInput, FormSubmitButton } from '@/components/FormInput';
import { authApi } from '@/utils/authApi';
import { validatePassword } from '@/utils/validationUtils';
import { Bell, Lock, Eye, EyeOff } from 'lucide-react';

function SettingsContent() {
  const { user } = useJWTAuth();
  const [activeTab, setActiveTab] = useState<'security' | 'notifications'>('security');
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    setPasswordError('');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.oldPassword) {
      setPasswordError('Please enter your current password');
      return;
    }

    if (!passwordForm.newPassword) {
      setPasswordError('Please enter a new password');
      return;
    }

    const passwordValidation = validatePassword(passwordForm.newPassword);
    if (!passwordValidation.isStrong) {
      setPasswordError(passwordValidation.feedback.join('. '));
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    const response = await authApi.changePassword(
      passwordForm.oldPassword,
      passwordForm.newPassword
    );

    if (response.success) {
      setPasswordSuccess('Password changed successfully!');
      setPasswordForm({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTimeout(() => setPasswordSuccess(''), 3000);
    } else {
      setPasswordError(response.message || 'Failed to change password');
    }

    setIsChangingPassword(false);
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 text-lg">Manage your account settings and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b">
        <button
          onClick={() => setActiveTab('security')}
          className={`py-4 px-6 font-semibold border-b-2 transition ${
            activeTab === 'security'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Lock className="inline mr-2" size={18} />
          Security
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`py-4 px-6 font-semibold border-b-2 transition ${
            activeTab === 'notifications'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Bell className="inline mr-2" size={18} />
          Notifications
        </button>
      </div>

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Change Password</h2>

          {passwordError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{passwordError}</p>
            </div>
          )}

          {passwordSuccess && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm">{passwordSuccess}</p>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-5">
            <PasswordInput
              label="Current Password"
              name="oldPassword"
              placeholder="••••••••"
              value={passwordForm.oldPassword}
              onChange={(value) => handlePasswordChange('oldPassword', value)}
              required
              autoComplete="current-password"
            />

            <PasswordInput
              label="New Password"
              name="newPassword"
              placeholder="••••••••"
              value={passwordForm.newPassword}
              onChange={(value) => handlePasswordChange('newPassword', value)}
              required
              autoComplete="new-password"
              showStrength
            />

            <PasswordInput
              label="Confirm New Password"
              name="confirmPassword"
              placeholder="••••••••"
              value={passwordForm.confirmPassword}
              onChange={(value) => handlePasswordChange('confirmPassword', value)}
              required
              autoComplete="new-password"
            />

            <FormSubmitButton
              label="Change Password"
              loading={isChangingPassword}
              disabled={isChangingPassword}
            />
          </form>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Security Tip:</strong> Use a strong password with a mix of uppercase, lowercase, numbers, and special characters.
            </p>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-600">Receive notifications via email</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">Marketing Emails</p>
                <p className="text-sm text-gray-600">Receive updates about new features</p>
              </div>
              <input type="checkbox" className="w-5 h-5 rounded" />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">Security Alerts</p>
                <p className="text-sm text-gray-600">Get notified about suspicious activity</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
            </div>
          </div>

          <button className="mt-6 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
            Save Preferences
          </button>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
