'use client';

import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface SharedLayoutProps {
  children: ReactNode;
  hideShell?: boolean;
}

export function SharedLayout({ children, hideShell = false }: SharedLayoutProps) {
  if (hideShell) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className="flex-1 py-6">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
      <Footer />
    </div>
  );
}

export default SharedLayout;
