
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserEngagementChart } from '@/components/analytics/user-engagement-chart';
import { TeamActivityChart } from '@/components/analytics/team-activity-chart';
import { FeatureUsageChart } from '@/components/analytics/feature-usage-chart';
import { Activity, BarChart, Users, Megaphone, Send } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDocs, collection, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function AnalyticsPage() {
    const [user, userLoading] = useAuthState(auth);
    const userDocRef = user ? doc(db, 'users', user.uid) : null;
    const [userData, userDataLoading] = useDocumentData(userDocRef);
    const [announcement, setAnnouncement] = useState('');
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();

    const loading = userLoading || userDataLoading;

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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">1,234</div>
                <p className="text-xs text-muted-foreground">+5.2% from last month</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Spaces</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">57</div>
                <p className="text-xs text-muted-foreground">+3 since last week</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">+12,234</div>
                <p className="text-xs text-muted-foreground">+19% from last month</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>User Engagement</CardTitle>
                <CardDescription>Daily active users in the last 14 days.</CardDescription>
            </CardHeader>
            <CardContent>
                <UserEngagementChart />
            </CardContent>
        </Card>
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Feature Usage</CardTitle>
                <CardDescription>Breakdown of popular features.</CardDescription>
            </CardHeader>
            <CardContent>
                <FeatureUsageChart />
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
            <TeamActivityChart />
        </CardContent>
      </Card>
    </div>
  );
}
