import { useState } from 'react';
import { useDocument } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function UserActivityLog({ userId }: { userId: string }) {
  const [limit, setLimit] = useState<number>(10);
  
  const userRef = doc(db, 'users', userId);
  const [userData, loading, error] = useDocument(userRef);
  
  if (loading) {
    return <Skeleton className="h-40 w-full" />;
  }
  
  if (error) {
    return <div className="text-destructive">Error loading activity: {error.message}</div>;
  }
  
  if (!userData?.exists()) {
    return <div className="text-muted-foreground">User not found</div>;
  }
  
  const userActivityLog = userData.data()?.activityLog || [];
  const sortedActivities = [...userActivityLog].sort((a, b) => {
    return (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0);
  }).slice(0, limit);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>User Activity Log</CardTitle>
            <CardDescription>Recent actions performed by this user</CardDescription>
          </div>
          <Select value={limit.toString()} onValueChange={(value) => setLimit(Number(value))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Limit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">Last 10</SelectItem>
              <SelectItem value="25">Last 25</SelectItem>
              <SelectItem value="50">Last 50</SelectItem>
              <SelectItem value="100">Last 100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {sortedActivities.length === 0 ? (
          <div className="text-center p-4 text-muted-foreground">No activity recorded yet</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedActivities.map((activity, index) => (
                <TableRow key={index}>
                  <TableCell className="whitespace-nowrap">
                    {activity.timestamp?.toDate ? 
                      format(activity.timestamp.toDate(), 'MMM d, yyyy h:mm a') : 
                      'Unknown time'}
                  </TableCell>
                  <TableCell>{activity.action}</TableCell>
                  <TableCell>
                    {activity.details ? (
                      typeof activity.details === 'object' ? 
                        JSON.stringify(activity.details) : 
                        activity.details
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}