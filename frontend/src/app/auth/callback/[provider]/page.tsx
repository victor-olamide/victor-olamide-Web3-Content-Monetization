'use client';

/**
 * OAuth callback handler page
 * This page handles redirects from OAuth providers (Google, GitHub)
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/JWTAuthContext';
import { extractOAuthCode, extractOAuthError, verifyState, exchangeOAuthCode } from '@/utils/oauthUtils';
import { FullPageLoader } from '@/components/LoadingSkeletons';

interface OAuthCallbackPageProps {
  params: { provider: 'google' | 'github' };
}

export default function OAuthCallbackPage({ params }: OAuthCallbackPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleOAuthCallback();
  }, [searchParams]);

  async function handleOAuthCallback() {
    try {
      // Check for errors from OAuth provider
      const oauthError = extractOAuthError();
      if (oauthError) {
        setError(`OAuth error: ${oauthError}`);
        return;
      }

      // Verify state for CSRF protection
      const state = searchParams?.get('state');
      if (state && !verifyState(state)) {
        setError('Invalid state parameter - possible CSRF attack');
        return;
      }

      // Extract authorization code
      const code = extractOAuthCode();
      if (!code) {
        setError('No authorization code received from OAuth provider');
        return;
      }

      // Exchange code for tokens
      const result = await exchangeOAuthCode(params.provider, code);

      // Call our login context to update auth state
      await login({
        email: result.user.email,
        password: '' // OAuth login doesn't use password
      });

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OAuth callback failed';
      setError(message);
      console.error('OAuth callback error:', err);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Failed</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <FullPageLoader />;
}
