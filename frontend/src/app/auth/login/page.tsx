'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useJWTAuth } from '@/contexts/JWTAuthContext';
import { validateLoginForm } from '@/utils/validationUtils';
import { FormInput, FormSubmitButton, FormDivider } from '@/components/FormInput';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error: authError, clearError } = useJWTAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Clear auth error after 5 seconds
  useEffect(() => {
    if (authError) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [authError, clearError]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');

    // Validate form
    const validation = validateLoginForm(formData.email, formData.password);
    if (!validation.isValid) {
      const errorMap: Record<string, string> = {};
      validation.errors.forEach(err => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);
      return;
    }

    setIsSubmitting(true);
    const success = await login(formData.email, formData.password);

    if (success) {
      setSuccessMessage('Login successful! Redirecting...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } else {
      setErrors({});
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        {/* Error Alert */}
        {authError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{authError}</p>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormInput
            label="Email Address"
            name="email"
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={(value) => handleChange('email', value)}
            error={errors.email}
            required
            autoComplete="email"
          />

          <FormInput
            label="Password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(value) => handleChange('password', value)}
            error={errors.password}
            required
            autoComplete="current-password"
          />

          {/* Forgot Password Link */}
          <div className="text-right">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Forgot password?
            </Link>
          </div>

          <FormSubmitButton
            label="Sign In"
            loading={isSubmitting || isLoading}
            disabled={isSubmitting || isLoading}
          />
        </form>

        <FormDivider />

        {/* Sign Up Link */}
        <p className="text-center text-gray-600">
          Don't have an account?{' '}
          <Link
            href="/auth/register"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
