import dynamic from 'next/dynamic';
import React from 'react';

/**
 * LoadingFallback - A simple loading spinner component
 */
export function LoadingFallback() {
  return (
    <div className="flex items-center justify-center p-4 w-full h-32">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}

/**
 * ErrorFallback - A component to display when loading fails
 */
export function ErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-4 text-center">
      <p className="text-red-500">Failed to load component</p>
      <button
        onClick={retry}
        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

/**
 * Lazy - A utility function for dynamically importing components with better loading states
 * 
 * @param importFn - The import function (e.g., () => import('./MyComponent'))
 * @param options - Additional options like loading component, ssr flag, etc.
 * @returns A dynamically imported component with proper loading state
 */
export function Lazy<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    ssr?: boolean;
    loading?: React.ComponentType;
    displayName?: string;
  } = {}
) {
  const {
    ssr = false,
    loading: LoadingComponent = LoadingFallback,
    displayName,
  } = options;

  const LazyComponent = dynamic(importFn, {
    loading: () => <LoadingComponent />,
    ssr,
  });

  // Set a display name for better debugging
  if (displayName) {
    LazyComponent.displayName = `Lazy(${displayName})`;
  }

  return LazyComponent;
}

/**
 * Examples:
 * 
 * // Basic usage
 * const LazyEditor = Lazy(() => import('@/components/editor'), { 
 *   displayName: 'Editor' 
 * });
 * 
 * // With SSR enabled
 * const LazyHeader = Lazy(() => import('@/components/header'), { 
 *   ssr: true,
 *   displayName: 'Header'
 * });
 * 
 * // With custom loading component
 * const LazyDataTable = Lazy(() => import('@/components/data-table'), {
 *   loading: () => <div>Loading table...</div>,
 *   displayName: 'DataTable'
 * });
 */