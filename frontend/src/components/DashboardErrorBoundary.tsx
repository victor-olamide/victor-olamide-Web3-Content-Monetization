'use client';

import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Dashboard Error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-rose-900">
                {this.props.componentName
                  ? `Error loading ${this.props.componentName}`
                  : 'Something went wrong'}
              </h3>
              <p className="mt-2 text-sm text-rose-800">
                {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
              </p>
              <button
                onClick={this.handleRetry}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export interface ErrorMessageProps {
  title: string;
  message: string;
  onRetry?: () => void;
  actionLabel?: string;
}

export function ErrorMessage({
  title,
  message,
  onRetry,
  actionLabel = 'Try again',
}: ErrorMessageProps) {
  return (
    <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6">
      <div className="flex items-start gap-4">
        <AlertCircle className="h-6 w-6 text-rose-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-rose-900">{title}</h3>
          <p className="mt-2 text-sm text-rose-800">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition"
            >
              <RefreshCw className="h-4 w-4" />
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
      {Icon && <Icon className="mx-auto h-12 w-12 text-slate-400" />}
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
