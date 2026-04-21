'use client';

import React, { useState, useEffect } from 'react';
import { useJWTAuth } from '@/contexts/JWTAuthContext';
import { ProtectedRoute } from '@/components/AuthGuard';
import { FormInput, FormSubmitButton } from '@/components/FormInput';
import { User, Mail, Calendar } from 'lucide-react';

function ProfileContent() {
  const { user, isLoading, updateProfile } = useJWTAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSaving(true);
    const success = await updateProfile({
      name: formData.name,
      email: formData.email
    });

    if (success) {
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError('Failed to update profile');
    }

    setIsSaving(false);
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 text-lg">Manage your account information</p>
      </div>

      {/* Profile Alert */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 font-medium">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Avatar Section */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 pt-8 pb-24 relative">
          <div className="flex items-end gap-6">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-3xl font-bold text-blue-600 border-4 border-white shadow-lg">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="mb-2">
              <h2 className="text-2xl font-bold text-white">{user.name}</h2>
              <p className="text-blue-100">{user.role}</p>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="px-6 pb-6">
          <div className="mt-6 space-y-8">
            {/* Account Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>

              <div className="space-y-4">
                {/* Email */}
                <div className="flex items-start gap-4">
                  <Mail className="w-5 h-5 text-gray-400 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Email Address</p>
                    <p className="text-gray-900 font-medium">{user.email}</p>
                  </div>
                </div>

                {/* Member Since */}
                <div className="flex items-start gap-4">
                  <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Member Since</p>
                    <p className="text-gray-900 font-medium">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Profile Section */}
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                Edit Profile
              </button>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <FormInput
                  label="Full Name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={(value) => handleChange('name', value)}
                  required
                />

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-6 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
