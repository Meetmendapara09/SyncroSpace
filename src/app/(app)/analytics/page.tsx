
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExecutiveInsightsDashboard } from '@/components/analytics/executive-insights-dashboard';
import { UserEngagementForecast } from '@/components/analytics/user-engagement-forecast';
import { EnhancedMeetingAnalytics } from '@/components/analytics/enhanced-meeting-analytics';
import { UserEngagementChart } from '@/components/analytics/user-engagement-chart';
import { FeatureUsageChart } from '@/components/analytics/feature-usage-chart';
import { TeamActivityChart } from '@/components/analytics/team-activity-chart';
import { Activity, BarChart, Users, Megaphone, Send, Brain, TrendingUp, Target } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDocs, collection, addDoc, serverTimestamp, writeBatch, query, where } from 'firebase/firestore';
import { useDocumentData, useCollection } from 'react-firebase-hooks/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function AnalyticsPage() {
    const [user, userLoading] = useAuthState(auth);
    const userDocRef = user ? doc(db, 'users', user.uid) : null;
    const [userData, userDataLoading] = useDocumentData(userDocRef);
    const [announcement, setAnnouncement] = useState('');
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();

    // Fetch Firebase data for analytics
    const [usersSnapshot, usersLoading] = useCollection(collection(db, 'users'));
    const [spacesSnapshot, spacesLoading] = useCollection(collection(db, 'spaces'));
    const [meetingsSnapshot, meetingsLoading] = useCollection(collection(db, 'meetings'));
    
    // Calculate dynamic metrics
    const totalUsers = usersSnapshot?.docs.length || 0;
    const totalSpaces = spacesSnapshot?.docs.length || 0;
    const totalMeetings = meetingsSnapshot?.docs.length || 0;
    
    // Calculate active users (users active in last 7 days)
    const activeUsers = usersSnapshot?.docs.filter(doc => {
        const data = doc.data();
        const lastActive = data.lastActive ? new Date(data.lastActive) : new Date(0);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return lastActive > weekAgo;
    }).length || 0;
    
    // Calculate active spaces (spaces with active meetings)
    const activeSpaces = spacesSnapshot?.docs.filter(doc => doc.data().activeMeeting).length || 0;
    
    // Calculate total messages across all spaces
    const totalMessages = spacesSnapshot?.docs.reduce((total, spaceDoc) => {
        const spaceData = spaceDoc.data();
        return total + (spaceData.messageCount || 0);
    }, 0) || 0;

    const loading = userLoading || userDataLoading || usersLoading || spacesLoading || meetingsLoading;

    const handleSendAnnouncement = async () => {
        if (!announcement.trim()) return;
        setIsSending(true);
        try {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const batch = writeBatch(db);

            usersSnapshot.forEach(userDoc => {
                const notificationsRef = doc(collection(db, 'users', userDoc.id, 'notifications'));
                batch.set(notificationsRef, {
                    title: 'Workspace Announcement',
                    body: announcement,
                    link: '/dashboard',
                    read: false,
                    createdAt: serverTimestamp(),
                });
            });

            await batch.commit();
            toast({
                title: 'Announcement Sent',
                description: 'Your announcement has been sent to all users.',
            });
            setAnnouncement('');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error Sending Announcement',
                description: error.message,
            });
        } finally {
            setIsSending(false);
        }
    }

    if (loading) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <Skeleton className="h-10 w-1/3" />
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
                <div className="grid gap-8 md:grid-cols-2">
                    <Skeleton className="h-80 w-full" />
                    <Skeleton className="h-80 w-full" />
                </div>
            </div>
        )
    }

    if (userData?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8">
                <h1 className="text-3xl font-bold text-destructive">Access Denied</h1>
                <p className="mt-2 text-muted-foreground">You do not have permission to view this page.</p>
            </div>
        )
    }
  
    return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Insights into team activity, feature usage, and user engagement.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {activeUsers} active in last 7 days
                </p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spaces</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totalSpaces}</div>
                <p className="text-xs text-muted-foreground">
                  {activeSpaces} currently active
                </p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Meetings</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totalMeetings}</div>
                <p className="text-xs text-muted-foreground">
                  Across all spaces
                </p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totalMessages}</div>
                <p className="text-xs text-muted-foreground">
                  Total across all spaces
                </p>
            </CardContent>
        </Card>
      </div>

      {/* BigQuery AI-Powered Analytics */}
      <div className="space-y-8">
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-bold">AI-Powered Analytics</h2>
        </div>
        
        <ExecutiveInsightsDashboard />
        <UserEngagementForecast />
        <EnhancedMeetingAnalytics />
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>User Engagement</CardTitle>
                <CardDescription>Daily active users in the last 14 days.</CardDescription>
            </CardHeader>
            <CardContent>
                <UserEngagementChart usersData={usersSnapshot?.docs} />
            </CardContent>
        </Card>
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Feature Usage</CardTitle>
                <CardDescription>Breakdown of popular features.</CardDescription>
            </CardHeader>
            <CardContent>
                <FeatureUsageChart spacesData={spacesSnapshot?.docs} usersData={usersSnapshot?.docs} />
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Admin Tools</CardTitle>
            <CardDescription>Manage your workspace and communicate with users.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" /> Send Announcement</h3>
                <Textarea 
                    placeholder="Type your announcement here. It will be sent to all users."
                    value={announcement}
                    onChange={(e) => setAnnouncement(e.target.value)}
                />
            </div>
            <Button onClick={handleSendAnnouncement} disabled={isSending || !announcement.trim()}>
                <Send className="mr-2 h-4 w-4" />
                {isSending ? 'Sending...' : 'Send to All Users'}
            </Button>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
            <CardTitle>Team Activity</CardTitle>
            <CardDescription>Messages sent per day in the most active spaces.</CardDescription>
        </CardHeader>
        <CardContent>
            <TeamActivityChart spacesData={spacesSnapshot?.docs} />
        </CardContent>
      </Card>
    </div>
  );
}
