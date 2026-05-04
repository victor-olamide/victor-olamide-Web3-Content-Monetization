import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Check, Lock, Bell, Palette, Globe } from 'lucide-react';

interface Preferences {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  marketingEmails?: boolean;
  privateProfile?: boolean;
  showOnlineStatus?: boolean;
  allowMessages?: boolean;
}

interface Settings {
  language?: string;
  theme?: 'light' | 'dark' | 'auto';
  currency?: string;
  timezone?: string;
  twoFactorEnabled?: boolean;
}

/**
 * User Settings Component
 * Manages profile preferences and security settings
 */
export const UserSettingsComponent: React.FC = () => {
  const [preferences, setPreferences] = useState<Preferences>({});
  const [settings, setSettings] = useState<Settings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'notifications' | 'privacy' | 'security' | 'regional'>('notifications');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/profile/me', {
        headers: {
          'X-Session-Id': localStorage.getItem('sessionId') || ''
        }
      });

      if (!response.ok) throw new Error('Failed to fetch settings');

      const data = await response.json();
      setPreferences(data.data.preferences || {});
      setSettings(data.data.settings || {});
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceChange = (key: keyof Preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSettingChange = (key: keyof Settings, value: string | boolean) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSavePreferences = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/profile/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': localStorage.getItem('sessionId') || ''
        },
        body: JSON.stringify(preferences)
      });

      if (!response.ok) throw new Error('Failed to save preferences');

      setSuccess('Preferences saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/profile/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': localStorage.getItem('sessionId') || ''
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) throw new Error('Failed to save settings');

      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

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

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex gap-8 px-6 py-4 overflow-x-auto">
              {[
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'privacy', label: 'Privacy', icon: Lock },
                { id: 'security', label: 'Security', icon: Lock },
                { id: 'regional', label: 'Regional', icon: Globe }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center gap-2 whitespace-nowrap pb-4 border-b-2 transition ${
                    activeTab === id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.emailNotifications ?? false}
                      onChange={() => handlePreferenceChange('emailNotifications')}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Email Notifications</p>
                      <p className="text-sm text-gray-600">Receive important updates via email</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.pushNotifications ?? false}
                      onChange={() => handlePreferenceChange('pushNotifications')}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Push Notifications</p>
                      <p className="text-sm text-gray-600">Get real-time alerts on your device</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.marketingEmails ?? false}
                      onChange={() => handlePreferenceChange('marketingEmails')}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Marketing Emails</p>
                      <p className="text-sm text-gray-600">Receive news and promotional content</p>
                    </div>
                  </label>
                </div>

                <button
                  onClick={handleSavePreferences}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Save Preferences
                </button>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.privateProfile ?? false}
                      onChange={() => handlePreferenceChange('privateProfile')}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Private Profile</p>
                      <p className="text-sm text-gray-600">Hide your profile from public view</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.showOnlineStatus ?? false}
                      onChange={() => handlePreferenceChange('showOnlineStatus')}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Show Online Status</p>
                      <p className="text-sm text-gray-600">Let others see when you're online</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.allowMessages ?? false}
                      onChange={() => handlePreferenceChange('allowMessages')}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Allow Messages</p>
                      <p className="text-sm text-gray-600">Allow others to send you messages</p>
                    </div>
                  </label>
                </div>

                <button
                  onClick={handleSavePreferences}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Save Privacy Settings
                </button>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.twoFactorEnabled ?? false}
                      onChange={() => handleSettingChange('twoFactorEnabled', !settings.twoFactorEnabled)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-600">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                  </label>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Save Security Settings
                </button>
              </div>
            )}

            {/* Regional Tab */}
            {activeTab === 'regional' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Language</label>
                    <select
                      value={settings.language || 'en'}
                      onChange={(e) => handleSettingChange('language', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="ja">日本語</option>
                      <option value="zh">中文</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Theme</label>
                    <select
                      value={settings.theme || 'auto'}
                      onChange={(e) => handleSettingChange('theme', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto (follow system)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Currency</label>
                    <select
                      value={settings.currency || 'USD'}
                      onChange={(e) => handleSettingChange('currency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="CNY">CNY (¥)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Timezone</label>
                    <select
                      value={settings.timezone || 'UTC'}
                      onChange={(e) => handleSettingChange('timezone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Europe/Paris">Central European Time (CET)</option>
                      <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
                      <option value="Australia/Sydney">Australian Eastern Time (AEST)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Save Regional Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettingsComponent;
