import React, { ReactNode, useState } from 'react';
import { MobileHeader } from './MobileHeader';
import { MobileMenu } from './MobileMenu';
import { BottomNavigation, BottomNavigationContainer } from './BottomNavigation';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';
import { useResponsive } from '../hooks/useResponsive';
import { useNavigation, STANDARD_NAV_ITEMS } from '../hooks/useNavigation';

interface AppLayoutProps {
  children: ReactNode;
  logo?: string;
  logoText?: string;
  userName?: string;
  onLogout?: () => void;
  onLogoClick?: () => void;
  breadcrumbs?: BreadcrumbItem[];
  showBreadcrumbs?: boolean;
  showBottomNav?: boolean;
  navItems?: typeof STANDARD_NAV_ITEMS;
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

/**
 * AppLayout Component
 * Main layout wrapper that includes responsive header, menu, and navigation
 */
export function AppLayout({
  children,
  logo,
  logoText = 'Web3 Content',
  userName,
  onLogout,
  onLogoClick,
  breadcrumbs = [],
  showBreadcrumbs = true,
  showBottomNav = true,
  navItems = STANDARD_NAV_ITEMS,
  currentPath = '/',
  onNavigate
}: AppLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isMobile, isDesktop } = useResponsive();
  const { navigate } = useNavigation(currentPath);

  const handleNavigate = (path: string) => {
    onNavigate?.(path);
    navigate(path);
  };

  const handleMenuToggle = (isOpen: boolean) => {
    setIsMenuOpen(isOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <MobileHeader
        logo={logo}
        logoText={logoText}
        userName={userName}
        onLogout={onLogout}
        onLogoClick={onLogoClick}
        onMenuToggle={handleMenuToggle}
        isDesktop={isDesktop}
      />

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        navItems={navItems}
        currentPath={currentPath}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        userName={userName}
      />

      {/* Breadcrumbs */}
      {showBreadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb
          items={breadcrumbs}
          onNavigate={handleNavigate}
          maxItems={isMobile ? 2 : 3}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <BottomNavigationContainer hasBottomNav={showBottomNav && isMobile}>
          {children}
        </BottomNavigationContainer>
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <BottomNavigation
          items={navItems}
          currentPath={currentPath}
          onNavigate={handleNavigate}
          showLabels={true}
        />
      )}
    </div>
  );
}

/**
 * Minimal Layout (Header only)
 * For pages that don't need full navigation
 */
export function MinimalLayout({
  children,
  logo,
  logoText = 'Web3 Content',
  userName,
  onLogout,
  onLogoClick
}: Omit<AppLayoutProps, 'children' | 'showBreadcrumbs' | 'showBottomNav' | 'navItems'> & { children: ReactNode }) {
  const { isDesktop } = useResponsive();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <MobileHeader
        logo={logo}
        logoText={logoText}
        userName={userName}
        onLogout={onLogout}
        onLogoClick={onLogoClick}
        onMenuToggle={(isOpen) => setIsMenuOpen(isOpen)}
        isDesktop={isDesktop}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
