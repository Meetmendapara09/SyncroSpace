import { useState, useEffect } from 'react';
import { useCollection, useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, limit, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function NotificationDisplay() {
  const [user] = useAuthState(auth);
  
  // Get user's announcements
  const announcementsQuery = user ? 
    query(
      collection(db, 'announcements'),
      where('recipients', 'array-contains', user.uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    ) : null;
  
  const [announcements, loading, error] = useCollection(announcementsQuery);
  
  const handleDelete = async (id: string) => {
    // In production you'd likely update a field to mark as read/deleted
    // rather than deleting the document
    await deleteDoc(doc(db, 'announcements', id));
  };
  
  if (loading) {
    return <div>Loading notifications...</div>;
  }
  
  if (error) {
    return <div className="text-destructive">Error loading notifications: {error.message}</div>;
  }
  
  if (!announcements || announcements.empty) {
    return <div className="text-muted-foreground">No notifications at this time.</div>;
  }
  
  return (
    <div className="space-y-4">
      {announcements.docs.map(doc => {
        const announcement = doc.data();
        return (
          <Card key={doc.id} className="relative">
            <CardHeader className="pb-2">
              <CardTitle>{announcement.title}</CardTitle>
              <CardDescription>
                From: {announcement.senderName} • 
                {announcement.timestamp?.toDate ? 
                  format(announcement.timestamp.toDate(), 'MMM d, yyyy h:mm a') : 
                  'Just now'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line">{announcement.message}</p>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)}>
                Dismiss
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}