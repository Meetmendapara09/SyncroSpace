'use client';

import * as React from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { DashboardCustomizer } from '@/components/dashboard/dashboard-customizer';

export default function DashboardPage() {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="animate-pulse text-center">
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Please sign in to view your personalized dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <DashboardCustomizer />
    </div>
  );
}