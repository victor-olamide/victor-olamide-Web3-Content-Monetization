# Issue #68: Mobile-Responsive Navigation - Quick Start Guide

## 5-Minute Setup

Get mobile-responsive navigation working in your app in 5 minutes.

## Step 1: Install Dependencies (1 min)

Ensure your project has React and Tailwind CSS:

```bash
npm install react react-dom
npm install -D tailwindcss postcss autoprefixer
```

Ensure `lucide-react` is installed for icons:

```bash
npm install lucide-react
```

## Step 2: Import AppLayout (1 min)

Wrap your app with `AppLayout`:

```typescript
// src/App.tsx
import React from 'react';
import { AppLayout } from './components/AppLayout';
import { useNavigation, STANDARD_NAV_ITEMS } from './hooks/useNavigation';

export function App() {
  const { currentPath, navigate } = useNavigation();

  return (
    <AppLayout
      logoText="My Web3 App"
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

## Step 3: Set Up Your Routes (1 min)

Use your existing routing solution (React Router, Next.js, etc.):

```typescript
// Example with React Router
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

export function YourRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/browse" element={<BrowsePage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/profile" element={<ProfilePage />} />
    </Routes>
  );
}
```

## Step 4: Use Responsive Utilities (1 min)

Use responsive utilities in your components:

```typescript
// Example: Show different content on mobile vs desktop
import { useResponsive } from './hooks/useResponsive';
import { MobileOnly, DesktopOnly } from './utils/responsiveLayoutUtils';

export function HomePage() {
  const { isMobile, isDesktop } = useResponsive();

  return (
    <div className="p-4">
      <MobileOnly>
        <h1 className="text-2xl font-bold">Mobile View</h1>
      </MobileOnly>
      
      <DesktopOnly>
        <h1 className="text-4xl font-bold">Desktop View</h1>
      </DesktopOnly>
    </div>
  );
}
```

## Step 5: Customize Navigation (1 min)

Customize navigation items for your app:

```typescript
import { Home, Search, ShoppingCart, User } from 'lucide-react';

const customNavItems = [
  { 
    label: 'Home', 
    path: '/', 
    icon: <Home size={24} />,
    badge: 0
  },
  { 
    label: 'Browse', 
    path: '/browse', 
    icon: <Search size={24} />,
    badge: 0
  },
  { 
    label: 'Cart', 
    path: '/cart', 
    icon: <ShoppingCart size={24} />,
    badge: cartItems.length
  },
  { 
    label: 'Profile', 
    path: '/profile', 
    icon: <User size={24} />,
    badge: 0
  }
];

// Use in AppLayout
<AppLayout
  navItems={customNavItems}
  // ... other props
/>
```

## Common Patterns

### Pattern 1: Responsive Grid Layout

```typescript
import { ResponsiveGrid } from '@/utils/responsiveLayoutUtils';

export function ProductGrid() {
  return (
    <ResponsiveGrid variant="cols2Mobile" gap="md">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </ResponsiveGrid>
  );
}
```

### Pattern 2: Mobile/Desktop Toggle

```typescript
import { useResponsive } from '@/hooks/useResponsive';

export function Header() {
  const { isMobile } = useResponsive();

  return (
    <header className="p-4">
      {isMobile ? (
        <MobileHeaderContent />
      ) : (
        <DesktopHeaderContent />
      )}
    </header>
  );
}
```

### Pattern 3: Responsive Text

```typescript
import { TEXT_STYLES } from '@/utils/responsiveLayoutUtils';

export function Title() {
  return <h1 className={TEXT_STYLES.heading}>My App</h1>;
}
```

### Pattern 4: Responsive Stack

```typescript
import { ResponsiveStack } from '@/utils/responsiveLayoutUtils';

export function Controls() {
  return (
    <ResponsiveStack spacing="normal">
      <button className="flex-1">Save</button>
      <button className="flex-1">Cancel</button>
    </ResponsiveStack>
  );
}
```

### Pattern 5: Conditional Rendering

```typescript
import { useResponsive } from '@/hooks/useResponsive';

export function Navigation() {
  const { isMobile, isDesktop } = useResponsive();

  return (
    <nav>
      {isMobile && <MobileMenu />}
      {isDesktop && <DesktopSidebar />}
    </nav>
  );
}
```

## Responsive Breakpoints

Quick reference for breakpoints:

```typescript
// Mobile-first Tailwind classes
'sm'  // ≥ 640px (768px in our breakpoints)
'md'  // ≥ 768px (1024px in our breakpoints)
'lg'  // ≥ 1024px
'xl'  // ≥ 1280px
'2xl' // ≥ 1536px

// Examples
'block md:hidden'        // Show on mobile, hide on tablet+
'hidden md:block'        // Hide on mobile, show on tablet+
'px-2 md:px-4 lg:px-8'   // Responsive padding
'text-sm md:text-lg'     // Responsive text size
```

## Testing Your Setup

### Desktop Testing
1. Open browser DevTools (F12)
2. Check console for errors
3. Test responsive navigation
4. Click through pages

### Mobile Testing
1. Open DevTools (F12)
2. Toggle Device Toolbar (Ctrl+Shift+M)
3. Select iPhone 12 preset
4. Test hamburger menu
5. Test bottom navigation
6. Test breadcrumbs

### Tablet Testing
1. DevTools → Device Toolbar
2. Select iPad preset
3. Test responsive layout
4. Test navigation drawer
5. Test bottom navigation

## Troubleshooting

### Problem: Navigation items not showing
**Solution:** Ensure `navItems` prop is passed to `AppLayout`
```typescript
<AppLayout
  navItems={STANDARD_NAV_ITEMS}  // Required
  // ...
/>
```

### Problem: Bottom navigation hidden on desktop
**Solution:** This is intentional - use `showBottomNav={false}` or `showBottomNav={isMobile}`
```typescript
<AppLayout
  showBottomNav={isMobile}  // Only show on mobile
  // ...
/>
```

### Problem: Hamburger menu not appearing
**Solution:** Ensure responsive hook is working
```typescript
import { useResponsive } from '@/hooks/useResponsive';

function Debug() {
  const { isMobile } = useResponsive();
  return <div>{isMobile ? 'Mobile' : 'Desktop'}</div>;
}
```

### Problem: Styles not applying
**Solution:** Verify Tailwind CSS is configured
```bash
# Check tailwind.config.js exists
ls tailwind.config.js

# Check PostCSS configured
ls postcss.config.js

# Rebuild CSS
npm run build
```

### Problem: Menu closes immediately
**Solution:** Check `onClose` callback
```typescript
const [menuOpen, setMenuOpen] = useState(false);

<AppLayout
  // Component handles menu state internally
  // or manage with:
  menuOpen={menuOpen}
  onMenuClose={() => setMenuOpen(false)}
/>
```

## Next Steps

1. **Customize Styling**: Modify colors, spacing, fonts
2. **Add More Pages**: Create routes matching your nav items
3. **Integrate State**: Connect navigation to global state (Redux, Context)
4. **Add Features**: Implement search, notifications, user menu
5. **Optimize Performance**: Add lazy loading and code splitting
6. **Deploy**: Build and deploy your app

## Component Reference

### Quick Component Cheat Sheet

```typescript
// Responsive Detection
import { useResponsive } from '@/hooks/useResponsive';
const { isMobile, isTablet, isDesktop, width, height } = useResponsive();

// Navigation Management
import { useNavigation } from '@/hooks/useNavigation';
const { currentPath, navigate, goBack, goHome } = useNavigation();

// Layout Components
import { AppLayout } from '@/components/AppLayout';
import { MobileHeader } from '@/components/MobileHeader';
import { MobileMenu } from '@/components/MobileMenu';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Breadcrumb } from '@/components/Breadcrumb';
import { DesktopSidebar } from '@/components/DesktopSidebar';

// Responsive Utilities
import { 
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveFlex,
  MobileOnly,
  DesktopOnly,
  ResponsiveStack
} from '@/utils/responsiveLayoutUtils';

import {
  getScreenSize,
  isMobileDevice,
  isTabletDevice,
  isDesktopDevice,
  shouldShowBottomNavigation
} from '@/utils/navigationUtils';
```

## API Props Quick Reference

### AppLayout
```typescript
<AppLayout
  logoText="App Name"                    // Brand name
  userName="User Name"                   // Current user
  currentPath="/page"                    // Current route
  onNavigate={(path) => {}}             // Navigation callback
  navItems={STANDARD_NAV_ITEMS}         // Navigation items
  breadcrumbs={[...]}                   // Breadcrumb items
  showBreadcrumbs={true}                // Show breadcrumbs
  showBottomNav={true}                  // Show bottom nav
  onLogout={() => {}}                   // Logout handler
>
  {children}
</AppLayout>
```

### DesktopSidebar
```typescript
<DesktopSidebar
  items={navItems}                      // Nav items array
  currentPath="/page"                   // Current route
  onNavigate={(path) => {}}             // Navigation callback
  collapsible={true}                    // Allow collapse
  defaultExpanded={true}                // Start expanded
  width="w-64"                          // Sidebar width
  logoSection={<Logo />}                // Top section
  footerSection={<Footer />}            // Bottom section
/>
```

### ResponsiveGrid
```typescript
<ResponsiveGrid
  variant="cols2Mobile"                 // Grid variant
  gap="md"                              // Spacing
>
  {children}
</ResponsiveGrid>
```

## Resources

- [Responsive Design Documentation](./ISSUE_68_IMPLEMENTATION_GUIDE.md)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [React Hooks Documentation](https://react.dev/reference/react/hooks)
- [Mobile Design Guidelines](https://material.io/design/platform-guidance/android-bars.html)

## Support

For issues or questions:
1. Check the [Implementation Guide](./ISSUE_68_IMPLEMENTATION_GUIDE.md)
2. Review component prop definitions
3. Test with browser DevTools responsive mode
4. Check console for errors

Happy coding! 🚀
