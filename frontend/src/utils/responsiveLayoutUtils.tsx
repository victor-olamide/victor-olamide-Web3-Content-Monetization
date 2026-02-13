/**
 * Responsive Layout Utilities
 * Tailwind CSS helper classes and responsive layout components
 */

import React, { ReactNode } from 'react';

/**
 * Container Styles - Responsive widths for different breakpoints
 */
export const CONTAINER_STYLES = {
  full: 'w-full',
  sm: 'max-w-sm mx-auto',
  md: 'max-w-md mx-auto',
  lg: 'max-w-lg mx-auto',
  xl: 'max-w-xl mx-auto',
  responsive: 'w-full sm:max-w-sm md:max-w-md lg:max-w-2xl xl:max-w-4xl'
};

/**
 * Padding Styles - Responsive padding
 */
export const PADDING_STYLES = {
  compact: 'p-2 sm:p-3 md:p-4 lg:p-6',
  normal: 'p-3 sm:p-4 md:p-6 lg:p-8',
  spacious: 'p-4 sm:p-6 md:p-8 lg:p-12',
  edge: 'px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6'
};

/**
 * Gap Styles - Responsive gaps
 */
export const GAP_STYLES = {
  xs: 'gap-1 sm:gap-2 md:gap-3',
  sm: 'gap-2 sm:gap-3 md:gap-4',
  md: 'gap-3 sm:gap-4 md:gap-6',
  lg: 'gap-4 sm:gap-6 md:gap-8'
};

/**
 * Grid Styles - Responsive grid layouts
 */
export const GRID_STYLES = {
  auto: 'grid auto-cols-fr',
  cols1: 'grid-cols-1',
  cols2Mobile: 'grid-cols-1 sm:grid-cols-2',
  cols2: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  cols3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  cols4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
};

/**
 * Flexbox Styles - Responsive flex layouts
 */
export const FLEX_STYLES = {
  col: 'flex flex-col',
  row: 'flex flex-row',
  colReverse: 'flex flex-col-reverse md:flex-col',
  rowReverse: 'flex flex-row-reverse md:flex-row',
  center: 'flex items-center justify-center',
  between: 'flex items-center justify-between',
  startCol: 'flex flex-col items-start justify-start'
};

/**
 * Text Styles - Responsive text sizing
 */
export const TEXT_STYLES = {
  xs: 'text-xs sm:text-sm',
  sm: 'text-sm sm:text-base',
  base: 'text-base sm:text-lg',
  lg: 'text-lg sm:text-xl md:text-2xl',
  xl: 'text-xl sm:text-2xl md:text-3xl',
  heading: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl',
  display: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl'
};

/**
 * Border Styles - Responsive borders
 */
export const BORDER_STYLES = {
  thin: 'border-0 md:border-l',
  thick: 'border-b md:border-r md:border-b-0',
  full: 'border border-gray-200'
};

/**
 * Display Styles - Responsive visibility
 */
export const DISPLAY_STYLES = {
  mobileOnly: 'block md:hidden',
  tabletOnly: 'hidden sm:block md:hidden',
  desktopOnly: 'hidden md:block',
  mobileTablet: 'block md:hidden',
  desktopUp: 'hidden md:block'
};

/**
 * Responsive Container Component
 */
export interface ResponsiveContainerProps {
  children: ReactNode;
  variant?: 'full' | 'sm' | 'md' | 'lg' | 'xl' | 'responsive';
  className?: string;
}

export const ResponsiveContainer = React.forwardRef<
  HTMLDivElement,
  ResponsiveContainerProps
>(({ children, variant = 'responsive', className = '' }, ref) => {
  const baseStyle = CONTAINER_STYLES[variant];
  return (
    <div ref={ref} className={`${baseStyle} ${className}`}>
      {children}
    </div>
  );
});

ResponsiveContainer.displayName = 'ResponsiveContainer';

/**
 * Responsive Grid Component
 */
export interface ResponsiveGridProps {
  children: ReactNode;
  variant?: keyof typeof GRID_STYLES;
  gap?: keyof typeof GAP_STYLES;
  className?: string;
}

export const ResponsiveGrid = React.forwardRef<
  HTMLDivElement,
  ResponsiveGridProps
>(({ children, variant = 'cols2Mobile', gap = 'md', className = '' }, ref) => {
  const gridClass = GRID_STYLES[variant];
  const gapClass = GAP_STYLES[gap];
  return (
    <div ref={ref} className={`grid ${gridClass} ${gapClass} ${className}`}>
      {children}
    </div>
  );
});

ResponsiveGrid.displayName = 'ResponsiveGrid';

/**
 * Responsive Flexbox Component
 */
export interface ResponsiveFlexProps {
  children: ReactNode;
  variant?: keyof typeof FLEX_STYLES;
  gap?: keyof typeof GAP_STYLES;
  className?: string;
}

export const ResponsiveFlex = React.forwardRef<HTMLDivElement, ResponsiveFlexProps>(
  ({ children, variant = 'col', gap = 'md', className = '' }, ref) => {
    const flexClass = FLEX_STYLES[variant];
    const gapClass = GAP_STYLES[gap];
    return (
      <div ref={ref} className={`${flexClass} ${gapClass} ${className}`}>
        {children}
      </div>
    );
  }
);

ResponsiveFlex.displayName = 'ResponsiveFlex';

/**
 * Mobile-Only Wrapper Component
 */
export interface MobileOnlyProps {
  children: ReactNode;
  className?: string;
}

export const MobileOnly: React.FC<MobileOnlyProps> = ({ children, className = '' }) => (
  <div className={`${DISPLAY_STYLES.mobileOnly} ${className}`}>{children}</div>
);

/**
 * Desktop-Only Wrapper Component
 */
export interface DesktopOnlyProps {
  children: ReactNode;
  className?: string;
}

export const DesktopOnly: React.FC<DesktopOnlyProps> = ({ children, className = '' }) => (
  <div className={`${DISPLAY_STYLES.desktopOnly} ${className}`}>{children}</div>
);

/**
 * Responsive Stack Component
 * Stacks vertically on mobile, horizontally on desktop
 */
export interface ResponsiveStackProps {
  children: ReactNode;
  spacing?: 'compact' | 'normal' | 'spacious';
  className?: string;
}

export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  children,
  spacing = 'normal',
  className = ''
}) => {
  const gapMap = {
    compact: 'gap-2 md:gap-4',
    normal: 'gap-3 md:gap-6',
    spacious: 'gap-4 md:gap-8'
  };

  return (
    <div
      className={`flex flex-col md:flex-row items-start md:items-center ${gapMap[spacing]} ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * Get responsive class based on breakpoint
 */
export function getResponsiveClass(
  mobileClass: string,
  tabletClass?: string,
  desktopClass?: string
): string {
  let classes = mobileClass;
  if (tabletClass) classes += ` md:${tabletClass}`;
  if (desktopClass) classes += ` lg:${desktopClass}`;
  return classes;
}

/**
 * Create responsive style object
 */
export function createResponsiveStyle(
  mobile: React.CSSProperties,
  tablet?: React.CSSProperties,
  desktop?: React.CSSProperties
) {
  // Note: CSS-in-JS responsive styles are limited; prefer Tailwind classes
  return mobile;
}

/**
 * Responsive Typography Helpers
 */
export const TYPOGRAPHY = {
  h1: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold',
  h2: 'text-2xl sm:text-3xl md:text-4xl font-bold',
  h3: 'text-xl sm:text-2xl md:text-3xl font-semibold',
  h4: 'text-lg sm:text-xl md:text-2xl font-semibold',
  h5: 'text-base sm:text-lg md:text-xl font-semibold',
  h6: 'text-sm sm:text-base md:text-lg font-semibold',
  body: 'text-sm sm:text-base md:text-lg leading-relaxed',
  caption: 'text-xs sm:text-sm text-gray-600',
  overline: 'text-xs uppercase tracking-wide'
};

/**
 * Spacing Helpers - Generate responsive spacing values
 */
export const SPACING = {
  xs: 'space-y-2 sm:space-y-3 md:space-y-4',
  sm: 'space-y-3 sm:space-y-4 md:space-y-6',
  md: 'space-y-4 sm:space-y-6 md:space-y-8',
  lg: 'space-y-6 sm:space-y-8 md:space-y-12',
  xl: 'space-y-8 sm:space-y-12 md:space-y-16'
};
