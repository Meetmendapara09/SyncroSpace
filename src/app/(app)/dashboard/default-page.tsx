'use client';

import * as React from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { 
  Video, 
  Users, 
  MapPin, 
  Clock, 
  TrendingUp, 
  PlayCircle,
  CheckSquare,
  Target
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { WelcomeBanner } from '@/components/dashboard/welcome-banner';
import { DashboardData } from '@/components/dashboard/dashboard-data';

// Import your existing dashboard components
// ...

export default function Dashboard() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  
  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  if (loading) {
    return (
      <DashboardLayout>
        <Skeleton className="h-32 w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </DashboardLayout>
    );
  }
  
  // We'll include relevant content directly
  
  return (
    <DashboardLayout>
      <WelcomeBanner />
      
      {/* Quick Stats Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200/50 dark:border-blue-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-500 dark:text-blue-400">Active Meetings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">No active meetings</p>
          </CardContent>
          <div className="absolute right-4 top-4 opacity-20">
            <Video className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-500 dark:text-emerald-400">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Invite team members</p>
          </CardContent>
          <div className="absolute right-4 top-4 opacity-20">
            <Users className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200/50 dark:border-purple-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-500 dark:text-purple-400">Productivity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">No data available</p>
          </CardContent>
          <div className="absolute right-4 top-4 opacity-20">
            <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/20 border-amber-200/50 dark:border-amber-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-500 dark:text-amber-400">Total Spaces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Create your first space</p>
          </CardContent>
          <div className="absolute right-4 top-4 opacity-20">
            <MapPin className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
        </Card>
      </div>
      
      {/* Team Management Section */}
      <section className="space-y-4 mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Team Management</h2>
          <span className="text-sm font-medium text-slate-500">Manage your teams and collaboration</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200/50 dark:border-blue-800/30 hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/teams">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-blue-600 dark:text-blue-400">My Teams</CardTitle>
                <p className="text-sm text-muted-foreground">Create and manage your teams</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">Manage Teams</div>
                  <Users className="h-8 w-8 text-blue-600 dark:text-blue-400 opacity-80" />
                </div>
              </CardContent>
            </Link>
          </Card>
          
          <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/20 border-green-200/50 dark:border-green-800/30 hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/teams">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-green-600 dark:text-green-400">Team Tasks</CardTitle>
                <p className="text-sm text-muted-foreground">Collaborate on team projects</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">Team Tasks</div>
                  <CheckSquare className="h-8 w-8 text-green-600 dark:text-green-400 opacity-80" />
                </div>
              </CardContent>
            </Link>
          </Card>
          
          <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200/50 dark:border-purple-800/30 hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/teams">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-purple-600 dark:text-purple-400">Team Goals</CardTitle>
                <p className="text-sm text-muted-foreground">Track team objectives and progress</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">Team Goals</div>
                  <Target className="h-8 w-8 text-purple-600 dark:text-purple-400 opacity-80" />
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>
      </section>
      
      {/* Active Meetings Section */}
      <section className="space-y-4 mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Active Meetings</h2>
          <span className="text-sm font-medium text-slate-500">Meetings in progress</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardData />
        </div>
      </section>
    </DashboardLayout>
  );
}