# Issue #68: Mobile-Responsive Navigation - Implementation Guide

## Overview

This implementation provides a comprehensive mobile-responsive navigation system for web3 dApp frontends. It supports seamless user experience across mobile, tablet, and desktop devices with distinct navigation patterns optimized for each screen size.

## Architecture

### Core Components

#### 1. **useResponsive Hook** (61 lines)
Custom React hook that detects device screen size and provides responsive breakpoint information.

**Purpose:** Provides reactive breakpoint detection to enable responsive component behavior throughout the application.

**Key Features:**
- 5 responsive breakpoints (small mobile, mobile, tablet, desktop)
- Debounced resize listener (150ms) to prevent excessive re-renders
- Returns boolean flags for each breakpoint
- SSR-safe implementation
- Window dimensions tracking

**Usage:**
```typescript
import { useResponsive } from '@/hooks/useResponsive';

function MyComponent() {
  const { isMobile, isTablet, isDesktop, width, height } = useResponsive();
  
  return (
    <div>
      {isMobile && <MobileLayout />}
      {isDesktop && <DesktopLayout />}
    </div>
  );
}
```

**Breakpoints:**
- Small Mobile: width < 375px
- Mobile: width < 768px
- Tablet: width < 1024px
- Large Mobile: 375px ≤ width < 768px
- Desktop: width ≥ 1024px

#### 2. **useNavigation Hook** (111 lines)
Custom React hook for managing navigation state, history, and standard navigation items.

**Purpose:** Centralizes navigation logic and provides standard navigation items for the application.

**Key Features:**
- Current path tracking
- Previous path for back navigation
- Navigation state management
- Standard navigation item constants
- Helper functions for building nav items

**Usage:**
```typescript
import { useNavigation, STANDARD_NAV_ITEMS } from '@/hooks/useNavigation';

function App() {
  const { currentPath, navigate, goBack } = useNavigation();
  
  return (
    <button onClick={() => navigate('/browse')}>
      Browse
    </button>
  );
}
```

**Standard Navigation Items:**
1. Home (`/`)
2. Browse (`/browse`)
3. Cart (`/cart`)
4. Notifications (`/notifications`)
5. Profile (`/profile`)

#### 3. **MobileHeader Component** (126 lines)
Responsive header component with hamburger menu and user controls.

**Purpose:** Provides top navigation with hamburger menu for mobile, responsive logo, and user menu.

**Key Features:**
- Hamburger menu button (mobile only)
- Responsive logo with optional image
- User avatar with dropdown menu (desktop only)
- Sticky positioning (z-40)
- Responsive padding and layout

**Props:**
```typescript
interface MobileHeaderProps {
  logo?: string | React.ReactNode;
  logoText: string;
  onMenuToggle: () => void;
  onLogoClick?: () => void;
  userName?: string;
  onLogout?: () => void;
  isDesktop?: boolean;
}
```

**Usage:**
```typescript
<MobileHeader
  logoText="MyApp"
  onMenuToggle={() => setMenuOpen(!menuOpen)}
  userName="John Doe"
  onLogout={handleLogout}
/>
```

#### 4. **MobileMenu Component** (173 lines)
Slide-out sidebar menu for mobile and tablet navigation.

**Purpose:** Provides slide-out sidebar navigation with user info, nav items, and logout button.

**Key Features:**
- Smooth slide-out animation (300ms)
- Overlay backdrop (50% opacity)
- User info section with avatar
- Navigation items with badges
- Active state highlighting
- ESC key support to close
- Prevents body scroll when open
- Chevron indicators for navigation

**Props:**
```typescript
interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: Array<{ label: string; path: string; icon?: React.ReactNode; badge?: number }>;
  currentPath: string;
  onNavigate: (path: string) => void;
  userName?: string;
  onLogout?: () => void;
}
```

**Usage:**
```typescript
<MobileMenu
  isOpen={menuOpen}
  onClose={() => setMenuOpen(false)}
  navItems={STANDARD_NAV_ITEMS}
  currentPath={pathname}
  onNavigate={navigate}
/>
```

#### 5. **BottomNavigation Component** (110 lines)
Fixed bottom tab bar for mobile and tablet navigation (Material Design).

**Purpose:** Provides Material Design bottom navigation bar with active indicators and badges.

**Key Features:**
- Fixed bottom positioning (z-30)
- Active indicator bar (blue)
- Badge support with red circles
- Icons with optional labels
- Scale animation on active state
- Touch-friendly spacing (16px height)
- Shows only on mobile/tablet (hidden on desktop)

**Props:**
```typescript
interface BottomNavigationProps {
  items: Array<{ label: string; path: string; icon: React.ReactNode; badge?: number }>;
  currentPath: string;
  onNavigate: (path: string) => void;
  showLabels?: boolean;
}
```

**Usage:**
```typescript
<BottomNavigation
  items={[
    { label: 'Home', path: '/', icon: <Home /> },
    { label: 'Browse', path: '/browse', icon: <Search /> },
    { label: 'Cart', path: '/cart', icon: <ShoppingCart />, badge: 3 }
  ]}
  currentPath={pathname}
  onNavigate={navigate}
/>
```

#### 6. **Breadcrumb Component** (140 lines)
Mobile-friendly breadcrumb navigation with collapsing behavior.

**Purpose:** Provides collapsible breadcrumb navigation that adapts to screen size.

**Key Features:**
- Collapsible breadcrumbs with ellipsis
- Home icon option
- Expandable full path view
- Mobile optimization (2 items on mobile, 3 on desktop)
- Current item highlighted (bold)
- Previous items are clickable links

**Props:**
```typescript
interface BreadcrumbProps {
  items: Array<{ label: string; path?: string }>;
  onNavigate?: (path: string) => void;
  maxItems?: number;
  showHome?: boolean;
}
```

**Usage:**
```typescript
<Breadcrumb
  items={[
    { label: 'Browse', path: '/browse' },
    { label: 'Videos', path: '/browse/videos' },
    { label: 'Web3 Tutorials' }
  ]}
  onNavigate={navigate}
  maxItems={3}
  showHome
/>
```

#### 7. **AppLayout Component** (142 lines)
Master layout wrapper combining all navigation elements.

**Purpose:** Provides unified responsive layout with all navigation components integrated.

**Key Features:**
- Responsive header integration
- Mobile menu management
- Breadcrumb navigation
- Bottom navigation display
- Automatic padding management
- MinimalLayout variant for header-only pages

**Props:**
```typescript
interface AppLayoutProps {
  children: React.ReactNode;
  logo?: string | React.ReactNode;
  logoText?: string;
  userName?: string;
  onLogout?: () => void;
  breadcrumbs?: Array<{ label: string; path?: string }>;
  showBreadcrumbs?: boolean;
  showBottomNav?: boolean;
  navItems?: Array<{ label: string; path: string; icon?: React.ReactNode; badge?: number }>;
  currentPath?: string;
  onNavigate?: (path: string) => void;
}
```

**Usage:**
```typescript
<AppLayout
  logoText="MyApp"
  userName="John Doe"
  onLogout={handleLogout}
  currentPath={pathname}
  onNavigate={navigate}
  breadcrumbs={breadcrumbs}
  showBreadcrumbs
  showBottomNav
>
  <YourPageContent />
</AppLayout>
```

#### 8. **DesktopSidebar Component** (295 lines)
Collapsible sidebar navigation for desktop layouts.

**Purpose:** Provides desktop-optimized sidebar navigation with collapsible behavior.

**Key Features:**
- Collapsible/expandable sidebar
- Active state highlighting
- Badge support
- Nested menu items
- Smooth animations
- Customizable width
- Logo and footer sections

**Props:**
```typescript
interface DesktopSidebarProps {
  items: NavItem[];
  currentPath?: string;
  onNavigate?: (path: string) => void;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  width?: string;
  logoSection?: React.ReactNode;
  footerSection?: React.ReactNode;
}
```

**Usage:**
```typescript
<DesktopSidebar
  items={navItems}
  currentPath={pathname}
  onNavigate={navigate}
  collapsible
  width="w-64"
  logoSection={<Logo />}
/>
```

### Utility Modules

#### 9. **navigationUtils.ts** (194 lines)
Helper functions and constants for responsive navigation.

**Exports:**
- `BREAKPOINTS`: Screen size constants (SM, MD, LG, XL, XXL)
- `SCREEN_SIZES`: Screen size enumeration
- `getScreenSize()`: Get screen size from width
- `isMobileDevice()`: Check if mobile
- `isTabletDevice()`: Check if tablet
- `isDesktopDevice()`: Check if desktop
- `getViewportDimensions()`: Get window dimensions
- `shouldShowNavigationDrawer()`: Check if drawer should show
- `shouldShowBottomNavigation()`: Check if bottom nav should show
- `getSafeAreaInsets()`: Get notch/safe area insets
- `prefersReducedMotion()`: Check for motion preferences
- `getMobilePadding()`: Get responsive padding class
- `getMobileGap()`: Get responsive gap class
- `lockBodyScroll()`: Prevent body scrolling
- `unlockBodyScroll()`: Allow body scrolling
- `isTouchAvailable()`: Check touch support
- `getDeviceOrientation()`: Get portrait/landscape
- `formatBreadcrumbPath()`: Format path to breadcrumb
- `buildBreadcrumbsFromPath()`: Build breadcrumb items from path

#### 10. **responsiveLayoutUtils.tsx** (274 lines)
Responsive layout components and Tailwind CSS helper classes.

**Key Classes:**
- `CONTAINER_STYLES`: Responsive container widths
- `PADDING_STYLES`: Responsive padding utilities
- `GAP_STYLES`: Responsive gap spacing
- `GRID_STYLES`: Responsive grid layouts
- `FLEX_STYLES`: Responsive flexbox layouts
- `TEXT_STYLES`: Responsive text sizing
- `BORDER_STYLES`: Responsive borders
- `DISPLAY_STYLES`: Responsive visibility
- `TYPOGRAPHY`: Typography presets
- `SPACING`: Spacing utilities

**Components:**
- `ResponsiveContainer`: Responsive width container
- `ResponsiveGrid`: Responsive grid layout
- `ResponsiveFlex`: Responsive flexbox layout
- `MobileOnly`: Mobile-only wrapper
- `DesktopOnly`: Desktop-only wrapper
- `ResponsiveStack`: Vertical stack (mobile) / Horizontal (desktop)

**Helper Functions:**
- `getResponsiveClass()`: Build responsive Tailwind classes
- `createResponsiveStyle()`: Create responsive CSS objects

### Responsive Design Patterns

#### Mobile-First Approach
All components are designed mobile-first, with enhancements for larger screens:
```typescript
// Mobile by default, tablet and desktop enhanced
<div className="block md:hidden lg:flex" />
```

#### Breakpoint-Based Components
Components show/hide based on responsive breakpoints:
```typescript
// Mobile header shows hamburger, desktop shows full menu
{isMobile && <MobileHeader onMenuToggle={toggleMenu} />}
{isDesktop && <DesktopHeader />}
```

#### Responsive Navigation Patterns
- **Mobile (<768px)**: Hamburger menu, slide-out sidebar, bottom navigation
- **Tablet (768px-1024px)**: Hamburger menu, bottom navigation, optional sidebar
- **Desktop (≥1024px)**: Top header with sidebar, full navigation visible

## Integration Guide

### Step 1: Set Up Layout
```typescript
import { AppLayout } from '@/components/AppLayout';
import { useNavigation, STANDARD_NAV_ITEMS } from '@/hooks/useNavigation';

export function App() {
  const { currentPath, navigate } = useNavigation();

  return (
    <AppLayout
      logoText="Web3 DApp"
      currentPath={currentPath}
      onNavigate={navigate}
      navItems={STANDARD_NAV_ITEMS}
      showBreadcrumbs
      showBottomNav
    >
      <YourRoutes />
    </AppLayout>
  );
}
```

### Step 2: Use Responsive Utilities
```typescript
import { useResponsive } from '@/hooks/useResponsive';
import { MobileOnly, DesktopOnly } from '@/utils/responsiveLayoutUtils';

function MyPage() {
  const { isMobile } = useResponsive();

  return (
    <>
      <MobileOnly>
        <h1 className="text-2xl">Mobile Title</h1>
      </MobileOnly>
      <DesktopOnly>
        <h1 className="text-4xl">Desktop Title</h1>
      </DesktopOnly>
    </>
  );
}
```

### Step 3: Customize Navigation Items
```typescript
const customNavItems = [
  { label: 'Home', path: '/', icon: <Home />, badge: 0 },
  { label: 'Browse', path: '/browse', icon: <Search />, badge: 0 },
  { label: 'Cart', path: '/cart', icon: <ShoppingCart />, badge: cartCount },
  { label: 'Profile', path: '/profile', icon: <User />, badge: 0 }
];

<AppLayout navItems={customNavItems} />
```

## Mobile-First Design Principles

1. **Breakpoint Order**: Design for mobile first, enhance for tablets and desktops
2. **Touch-Friendly**: All interactive elements sized for touch (minimum 44x44px)
3. **Performance**: Minimize layout shifts and animations on mobile
4. **Accessibility**: Keyboard navigation, ARIA labels, semantic HTML
5. **Responsive Images**: Use responsive image sizes for different screens
6. **Typography**: Scale fonts appropriately for each breakpoint
7. **Spacing**: Adjust spacing based on available screen space

## Responsive Breakpoint Guidelines

### Small Mobile (<375px)
- Minimal padding and spacing
- Single column layout
- Hamburger menu for navigation
- Bottom navigation tab bar
- Extra-large touch targets

### Mobile (375px-768px)
- Compact padding and spacing
- Single column layout
- Hamburger menu for navigation
- Bottom navigation tab bar
- Touch-friendly components

### Tablet (768px-1024px)
- Normal padding and spacing
- 2-column layouts where appropriate
- Optional sidebar or hamburger menu
- Bottom or top navigation
- Optimized for touch and pointer

### Desktop (≥1024px)
- Spacious padding and spacing
- 3+ column layouts
- Permanent sidebar navigation
- Top header navigation
- Optimized for mouse/keyboard

## Customization

### Custom Breakpoints
Modify breakpoints in `navigationUtils.ts`:
```typescript
export const BREAKPOINTS = {
  SM: 375,      // Customize as needed
  MD: 768,
  LG: 1024,
  XL: 1280,
  XXL: 1536
};
```

### Custom Styles
Use Tailwind CSS classes or Tailwind config for custom styles:
```typescript
const CUSTOM_STYLES = {
  primaryColor: 'bg-blue-600 hover:bg-blue-700',
  secondaryColor: 'bg-gray-200 hover:bg-gray-300'
};
```

### Custom Navigation Items
Create custom nav items with icons and badges:
```typescript
const navItems = [
  { 
    label: 'Staking', 
    path: '/staking', 
    icon: <Gift />,
    badge: unclaimedRewards 
  }
];
```

## Best Practices

1. **Use AppLayout as Root**: Wrap your entire app with AppLayout for consistent navigation
2. **Manage Navigation State**: Use useNavigation hook for centralized navigation
3. **Responsive Components**: Use useResponsive hook for responsive behavior
4. **Mobile First**: Design for mobile, enhance for larger screens
5. **Performance**: Memoize components to prevent unnecessary re-renders
6. **Accessibility**: Ensure keyboard navigation and screen reader support
7. **Testing**: Test on multiple screen sizes and devices
8. **Documentation**: Document custom navigation patterns

## Testing Responsive Design

### Browser DevTools
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test different device presets (iPhone, iPad, etc.)
4. Test responsive mode with custom widths

### Testing Breakpoints
```typescript
import { useResponsive } from '@/hooks/useResponsive';

function BreakpointTester() {
  const { isMobile, isTablet, isDesktop, width } = useResponsive();
  
  return (
    <div>
      <p>Width: {width}px</p>
      <p>Mobile: {isMobile ? 'Yes' : 'No'}</p>
      <p>Tablet: {isTablet ? 'Yes' : 'No'}</p>
      <p>Desktop: {isDesktop ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

## Troubleshooting

### Navigation Not Updating
- Ensure useNavigation hook is used correctly
- Check that currentPath prop is passed to components
- Verify onNavigate callback is implemented

### Responsive Breakpoints Not Working
- Check useResponsive hook is properly used
- Verify Tailwind CSS is configured correctly
- Test with explicit window width values

### Mobile Menu Not Closing
- Ensure onClose callback is called
- Check ESC key listener is working
- Verify overlay backdrop click handling

## Performance Considerations

1. **Debounced Resize**: useResponsive uses 150ms debounce to minimize re-renders
2. **Memoization**: Components use React.forwardRef for optimization
3. **Lazy Loading**: Consider lazy loading navigation items
4. **CSS-in-JS**: Minimize runtime CSS generation
5. **Bundle Size**: Tree-shake unused components

## Accessibility Features

- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- ESC key to close menus
- Screen reader friendly
- Focus management
- Color contrast compliance
- Mobile-friendly touch targets

## Future Enhancements

- Persistent sidebar collapse state
- Custom animation speeds
- Dark mode support
- Customizable color schemes
- Gesture support (swipe to open/close)
- Voice navigation integration
- Advanced animation presets
