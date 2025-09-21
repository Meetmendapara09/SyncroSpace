'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { ChevronRight, Zap, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { useDashboardPreferences } from '@/hooks/use-dashboard-preferences';

export function WelcomeBanner() {
  const [user] = useAuthState(auth);
  const { preferences } = useDashboardPreferences();
  const [greeting, setGreeting] = React.useState<string>('');
  
  React.useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Good morning');
    } else if (hour >= 12 && hour < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }
  }, []);
  
  const firstName = user?.displayName?.split(' ')[0] || 'there';
  
  // Only show the welcome banner if not using compact view
  if (preferences.compactView) {
    return null;
  }
  
  return (
    <Card className="bg-primary text-primary-foreground mb-6">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          {greeting}, {firstName}!
        </CardTitle>
        <CardDescription className="text-primary-foreground/80 text-base">
          Welcome to your personalized dashboard. Here's what's happening today.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4">
        <Button asChild variant="secondary" className="group">
          <Link href="/calendar">
            Check today's meetings
            <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
        <Button asChild variant="secondary" className="group">
          <Link href="/board">
            View your tasks
            <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
        <Button asChild variant="secondary" className="group">
          <Link href="/dashboard/customized">
            <Zap className="mr-1 h-4 w-4" />
            Customize dashboard
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}