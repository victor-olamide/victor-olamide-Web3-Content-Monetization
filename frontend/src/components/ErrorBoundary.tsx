'use client';

import React, { ReactNode, ReactElement } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactElement;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component for catching and displaying errors
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md bg-white rounded-lg shadow-lg p-8">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 text-center mb-3">
                Oops! Something went wrong
              </h1>
              <p className="text-gray-600 text-center mb-4">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>

              <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
                <p className="text-xs text-red-700 font-mono break-words">
                  {this.state.error?.toString()}
                </p>
              </div>

              <button
                onClick={this.resetError}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                <RefreshCw size={18} />
                Try Again
              </button>

              <button
                onClick={() => (window.location.href = '/')}
                className="w-full mt-3 px-4 py-3 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition"
              >
                Go to Home
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Async error boundary wrapper for better async error handling
 */
interface AsyncErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error) => void;
}

export function AsyncErrorBoundary({ children, onError }: AsyncErrorBoundaryProps) {
  const handleError = (error: Error) => {
    console.error('Async error:', error);
    onError?.(error);
  };

  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md bg-white rounded-lg shadow-lg p-8">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-3">
              Error Loading
            </h1>
            <p className="text-gray-600 text-center mb-4">
              An error occurred while loading this page. Please try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
