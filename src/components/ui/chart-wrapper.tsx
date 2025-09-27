'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// Chart wrapper components for consistent styling
export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    config: Record<string, { label: string; color?: string }>;
  }
>(({ className, children, config, ...props }, ref) => (
  <div ref={ref} className={cn('flex aspect-video justify-center text-xs', className)} {...props}>
    {children}
  </div>
));
ChartContainer.displayName = 'ChartContainer';

export const ChartTooltip = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border bg-background p-2 shadow-sm',
      className
    )}
    {...props}
  />
));
ChartTooltip.displayName = 'ChartTooltip';

export const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: 'line' | 'dot' | 'dashed';
  }
>(({ className, hideLabel, hideIndicator, indicator = 'dot', ...props }, ref) => (
  <div
    ref={ref}
    className={cn('grid gap-2 rounded-md bg-background p-2 shadow-md', className)}
    {...props}
  />
));
ChartTooltipContent.displayName = 'ChartTooltipContent';

export const ChartLegend = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center justify-center gap-4', className)}
    {...props}
  />
));
ChartLegend.displayName = 'ChartLegend';

export const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center gap-2', className)}
    {...props}
  />
));
ChartLegendContent.displayName = 'ChartLegendContent';