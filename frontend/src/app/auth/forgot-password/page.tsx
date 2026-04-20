'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/utils/authApi';
import { validateEmail } from '@/utils/validationUtils';
import { FormInput, FormSubmitButton } from '@/components/FormInput';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    const response = await authApi.requestPasswordReset(email);

    if (response.success) {
      setSuccess('Password reset link has been sent to your email. Please check your inbox.');
      setEmail('');
    } else {
      setError(response.message || 'Failed to send reset email');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
          <p className="text-gray-600">Enter your email to receive a password reset link</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormInput
            label="Email Address"
            name="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={setEmail}
            required
            autoComplete="email"
          />

          <FormSubmitButton
            label="Send Reset Link"
            loading={isLoading}
            disabled={isLoading}
          />
        </form>

        {/* Back to Login */}
        <div className="text-center mt-6">
          <Link
            href="/auth/login"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
