'use client';

import React, { Component, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import Link from 'next/link';

interface Props {
  children: ReactNode;
  contentId?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

export class ContentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorCount: 1,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Content Error Boundary caught:', error, errorInfo);

    // Call optional error callback for logging/analytics
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update error count for retry logic
    this.setState((prevState) => ({
      errorCount: prevState.errorCount + 1,
    }));
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error boundary when contentId changes
    if (prevProps.contentId !== this.props.contentId && this.state.hasError) {
      this.setState({
        hasError: false,
        error: null,
        errorCount: 0,
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorCount: 0,
    });
  };

  render() {
    if (this.state.hasError) {
      const isNetworkError =
        this.state.error?.message?.toLowerCase().includes('fetch') ||
        this.state.error?.message?.toLowerCase().includes('network');

      const isContentNotFound =
        this.state.error?.message?.toLowerCase().includes('not found') ||
        this.state.error?.message?.toLowerCase().includes('404');

      return (
        <div className="w-full min-h-[60vh] flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full mx-4 bg-white rounded-xl border border-gray-200 shadow-lg p-8 text-center">
            <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {isNetworkError && 'Connection Error'}
              {isContentNotFound && 'Content Not Found'}
              {!isNetworkError && !isContentNotFound && 'Something Went Wrong'}
            </h2>

            <p className="text-gray-600 text-sm mb-4">
              {isNetworkError &&
                'We\'re having trouble connecting to the server. Please check your internet connection and try again.'}
              {isContentNotFound &&
                'The content you\'re looking for is no longer available or has been removed.'}
              {!isNetworkError &&
                !isContentNotFound &&
                'An unexpected error occurred while loading this content. Please try again.'}
            </p>

            {this.state.error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                  Error details
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-[10px] overflow-auto max-h-24 text-red-600">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            {this.state.errorCount > 3 && (
              <p className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                Multiple errors detected. If the problem persists, please contact support.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={this.handleReset}
                className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-600 transition flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} />
                Try Again
              </button>

              <Link
                href="/dashboard"
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Return to Dashboard
              </Link>

              {isNetworkError && (
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-600 transition"
                >
                  Refresh Page
                </button>
              )}
            </div>

            {this.state.errorCount > 5 && (
              <p className="mt-4 text-xs text-gray-500">
                Error code: {Math.random().toString(36).substr(2, 9).toUpperCase()}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ContentErrorBoundary;
