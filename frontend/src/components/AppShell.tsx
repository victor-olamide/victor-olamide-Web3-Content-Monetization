'use client';

import { usePathname } from 'next/navigation';
import { SharedLayout } from '@/components/layout/SharedLayout';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname() || '';
  const hideShell = pathname.startsWith('/auth') || pathname.startsWith('/unauthorized');

  return <SharedLayout hideShell={hideShell}>{children}</SharedLayout>;
}
