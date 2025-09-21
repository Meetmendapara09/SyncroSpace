'use client';

import * as React from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { doc, collection, query, where, getDoc, getDocs, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function DashboardData() {
  const [user] = useAuthState(auth);
  const [spaces, setSpaces] = React.useState<any[]>([]);
  const [meetings, setMeetings] = React.useState<any[]>([]);
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      try {
        // Fetch spaces
        const spacesQuery = query(
          collection(db, 'spaces'),
          where('members', 'array-contains', user.uid),
          limit(8)
        );
        const spacesSnapshot = await getDocs(spacesQuery);
        const spacesData = spacesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSpaces(spacesData);
        
        // Fetch active meetings
        const activeMeetingsQuery = query(
          collection(db, 'spaces'),
          where('members', 'array-contains', user.uid),
          where('activeMeeting', '==', true),
          limit(5)
        );
        const meetingsSnapshot = await getDocs(activeMeetingsQuery);
        const meetingsData = meetingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMeetings(meetingsData);
        
        // Fetch tasks
        const tasksQuery = query(
          collection(db, 'users', user.uid, 'tasks'),
          orderBy('dueDate', 'asc'),
          limit(10)
        );
        const tasksSnapshot = await getDocs(tasksQuery);
        const tasksData = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTasks(tasksData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-lg font-semibold mb-2">Dashboard Data Summary</div>
        <div className="text-sm text-muted-foreground">
          <div>Total Spaces: {spaces.length}</div>
          <div>Active Meetings: {meetings.length}</div>
          <div>Pending Tasks: {tasks.length}</div>
        </div>
      </CardContent>
    </Card>
  );
}