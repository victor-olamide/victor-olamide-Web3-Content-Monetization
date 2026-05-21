'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useJWTAuth } from '@/contexts/JWTAuthContext';
import { validateRegistrationForm } from '@/utils/validationUtils';
import { FormInput, PasswordInput, FormSubmitButton, FormDivider } from '@/components/FormInput';
import SocialLogin from '@/components/SocialLogin';
import { useToast } from '@/contexts/ToastContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading, error: authError, clearError } = useJWTAuth();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
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
    const validation = validateRegistrationForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    const success = await register(formData.email, formData.password, formData.name);

    if (success) {
      setSuccessMessage('Registration successful! Redirecting...');
      addToast('Account created successfully! Welcome!', 'success');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } else {
      setErrors({});
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Get Started</h1>
          <p className="text-gray-600">Create your account to continue</p>
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Full Name"
            name="name"
            type="text"
            placeholder="John Doe"
            value={formData.name}
            onChange={(value) => handleChange('name', value)}
            error={errors.name}
            required
            autoComplete="name"
          />

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

          <PasswordInput
            label="Password"
            name="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(value) => handleChange('password', value)}
            error={errors.password}
            required
            autoComplete="new-password"
            showStrength
          />

          <PasswordInput
            label="Confirm Password"
            name="confirmPassword"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={(value) => handleChange('confirmPassword', value)}
            error={errors.confirmPassword}
            required
            autoComplete="new-password"
          />

          {/* Terms Agreement */}
          <div className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              id="terms"
              required
              className="mt-1 from-current"
            />
            <label htmlFor="terms" className="text-gray-600">
              I agree to the{' '}
              <Link href="/terms" className="text-blue-600 hover:text-blue-700 font-medium">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-blue-600 hover:text-blue-700 font-medium">
                Privacy Policy
              </Link>
            </label>
          </div>

          <FormSubmitButton
            label="Create Account"
            loading={isSubmitting || isLoading}
            disabled={isSubmitting || isLoading}
            className="mt-6"
          />
        </form>

        {/* Social Login Options */}
        <div className="mt-6 mb-6">
          <SocialLogin 
            showDivider={true} 
            dividerText="or sign up with"
            showEmailLink={false}
          />
        </div>

        {/* Sign In Link */}
        <p className="text-center text-gray-600">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
