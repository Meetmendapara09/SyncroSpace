'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardSwitch } from '@/components/dashboard/dashboard-switch';
import { ThemeToggle } from '@/components/layout/theme-toggle';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container py-8 space-y-8">
      <div className="fixed top-24 right-8 z-10">
        <ThemeToggle />
      </div>
      <div className="mb-6">
        <DashboardSwitch />
      </div>
      {children}
    </div>
  );
}