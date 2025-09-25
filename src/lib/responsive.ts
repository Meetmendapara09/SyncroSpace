// Breakpoint definitions for consistent responsive design
export const breakpoints = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1400,
};

// Return true if the current viewport is below the specified breakpoint
export function isBelowBreakpoint(breakpoint: keyof typeof breakpoints): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < breakpoints[breakpoint];
}

// Return true if the current viewport is above or equal to the specified breakpoint
export function isAboveBreakpoint(breakpoint: keyof typeof breakpoints): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= breakpoints[breakpoint];
}

// Hook to get current breakpoint
export function useBreakpoint(): keyof typeof breakpoints | null {
  if (typeof window === 'undefined') return null;
  const width = window.innerWidth;
  
  if (width < breakpoints.xs) return null;
  if (width < breakpoints.sm) return 'xs';
  if (width < breakpoints.md) return 'sm';
  if (width < breakpoints.lg) return 'md';
  if (width < breakpoints.xl) return 'lg';
  if (width < breakpoints['2xl']) return 'xl';
  return '2xl';
}

// Get tailwind class string for responsive design
// Example: getResponsiveClasses({ base: 'p-2', md: 'p-4', lg: 'p-6' }) => 'p-2 md:p-4 lg:p-6'
export function getResponsiveClasses(classMap: Record<string, string>): string {
  return Object.entries(classMap)
    .map(([breakpoint, className]) => {
      if (breakpoint === 'base') return className;
      return `${breakpoint}:${className}`;
    })
    .join(' ');
}

export default breakpoints;