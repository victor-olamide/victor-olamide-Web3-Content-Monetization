'use client';

/**
 * Social login component with OAuth provider buttons
 */

import { useState } from 'react';
import Link from 'next/link';
import { generateOAuthUrl, OAUTH_BUTTON_CONFIG } from '@/utils/oauthUtils';
import { Github, Mail } from 'lucide-react';

interface SocialLoginProps {
  /** Callback after successful login */
  onSuccess?: () => void;
  /** CSS classes for the container */
  className?: string;
  /** Show or hide the divider with text */
  showDivider?: boolean;
  /** Text to show in divider */
  dividerText?: string;
  /** Show email login link */
  showEmailLink?: boolean;
}

export function SocialLogin({
  onSuccess,
  className = '',
  showDivider = true,
  dividerText = 'or continue with email',
  showEmailLink = true
}: SocialLoginProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOAuthClick = (provider: 'google' | 'github') => {
    try {
      setLoading(provider);
      setError(null);
      const authUrl = generateOAuthUrl(provider);
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth configuration error');
      setLoading(null);
    }
  };

  const googleConfig = OAUTH_BUTTON_CONFIG.google;
  const githubConfig = OAUTH_BUTTON_CONFIG.github;

  return (
    <div className={`w-full ${className}`}>
      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* OAuth buttons */}
      <div className="space-y-3">
        {/* Google button */}
        <button
          onClick={() => handleOAuthClick('google')}
          disabled={loading !== null}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            loading === 'google' ? 'opacity-50 cursor-not-allowed' : googleConfig.color
          } ${googleConfig.textColor}`}
        >
          {loading === 'google' ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* GitHub button */}
        <button
          onClick={() => handleOAuthClick('github')}
          disabled={loading !== null}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            loading === 'github' ? 'opacity-50 cursor-not-allowed' : githubConfig.color
          } ${githubConfig.textColor}`}
        >
          {loading === 'github' ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <Github size={20} />
              <span>Continue with GitHub</span>
            </>
          )}
        </button>
      </div>

      {/* Divider */}
      {showDivider && (
        <div className="my-4 flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-300" />
          <span className="text-sm text-gray-600">{dividerText}</span>
          <div className="flex-1 h-px bg-gray-300" />
        </div>
      )}

      {/* Email login link */}
      {showEmailLink && (
        <Link
          href="/auth/login"
          className="w-full py-3 px-4 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 font-medium transition-colors flex items-center justify-center gap-2 text-gray-700"
        >
          <Mail size={20} />
          <span>Continue with Email</span>
        </Link>
      )}
    </div>
  );
}

export default SocialLogin;
