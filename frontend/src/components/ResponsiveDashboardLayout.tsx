'use client';

import React, { useState } from 'react';
import { Menu, X, ChevronRight } from 'lucide-react';

interface ResponsiveDashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  tabs?: Array<{
    id: string;
    label: string;
    icon?: React.ComponentType<{ className: string }>;
  }>;
  onTabChange?: (tabId: string) => void;
}

export function ResponsiveDashboardLayout({
  children,
  activeTab,
  tabs,
  onTabChange,
}: ResponsiveDashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 md:hidden border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Tab Menu */}
        {mobileMenuOpen && tabs && (
          <div className="border-t border-slate-200 bg-white p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    onTabChange?.(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {Icon && <Icon className="h-5 w-5" />}
                  <span className="flex-1 font-medium">{tab.label}</span>
                  {isActive && <ChevronRight className="h-5 w-5" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Tab Navigation */}
      {tabs && (
        <div className="hidden md:block sticky top-0 z-30 border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange?.(tab.id)}
                    className={`flex items-center gap-2 px-4 py-4 font-medium border-b-2 transition whitespace-nowrap ${
                      isActive
                        ? 'border-slate-900 text-slate-900'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {Icon && <Icon className="h-5 w-5" />}
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}

export function ResponsiveGrid({
  children,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
}: ResponsiveGridProps) {
  const gridClass = `grid gap-4 sm:grid-cols-${columns.tablet || columns.mobile} lg:grid-cols-${columns.desktop || columns.tablet}`;

  return (
    <div className={`grid gap-4 sm:grid-cols-${columns.tablet || columns.mobile} lg:grid-cols-${columns.desktop || columns.tablet}`}>
      {children}
    </div>
  );
}

interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveCard({ children, className = '' }: ResponsiveCardProps) {
  return (
    <div
      className={`rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 bg-white p-4 sm:p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
