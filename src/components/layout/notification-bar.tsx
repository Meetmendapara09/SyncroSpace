'use client';

import { useEffect, useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, limit, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../ui/badge';

export function NotificationBar() {
  const [user] = useAuthState(auth);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  
  // Get user's announcements
  const announcementsQuery = user ? 
    query(
      collection(db, 'announcements'),
      where('recipients', 'array-contains', user.uid),
      orderBy('timestamp', 'desc'),
      limit(5)
    ) : null;
  
  const [announcements, loading, error] = useCollection(announcementsQuery);
  
  // Mark notification as read in local state
  const markAsRead = (id: string) => {
    setReadNotifications(prev => [...prev, id]);
    
    // Optional: update Firestore that user has read this notification
    if (user) {
      const userNotificationRef = doc(db, 'users', user.uid, 'notifications', id);
      updateDoc(userNotificationRef, { 
        readAt: Timestamp.now() 
      }).catch(() => {
        // Silently fail if doc doesn't exist - we'll create it later
      });
    }
  };
  
  // Calculate unread notifications count
  const unreadCount = announcements?.docs.filter(
    doc => !readNotifications.includes(doc.id)
  ).length || 0;
  
  // Filter to only show unread notifications
  const unreadAnnouncements = announcements?.docs.filter(
    doc => !readNotifications.includes(doc.id)
  );
  
  if (loading || error || !unreadAnnouncements || unreadAnnouncements.length === 0) {
    return null;
  }

  const currentNotification = unreadAnnouncements[currentIndex];
  const data = currentNotification.data();
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="relative w-full"
      >
        <Alert className="rounded-none border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <AlertTitle>{data.title}</AlertTitle>
            <Badge variant="outline" className="ml-2">
              {unreadCount} unread
            </Badge>
          </div>
          <AlertDescription className="mt-2">{data.message}</AlertDescription>
          <div className="mt-2 flex items-center gap-2">
            {unreadAnnouncements.length > 1 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentIndex((currentIndex + 1) % unreadAnnouncements.length)}
              >
                Next notification
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => markAsRead(currentNotification.id)}
            >
              Dismiss
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-2 top-2" 
            onClick={() => markAsRead(currentNotification.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
}