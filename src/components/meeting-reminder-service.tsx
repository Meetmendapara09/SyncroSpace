'use client';

import { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { checkMeetingReminders, cleanupCompletedMeetings } from '@/lib/meeting-notifications';

export function MeetingReminderService() {
  const [user] = useAuthState(auth);

  useEffect(() => {
    if (!user || !user.email) return;

    // Start the reminder service when user is authenticated
    const intervalId = setInterval(() => {
      checkMeetingReminders(user.email || undefined).catch(error => {
        console.error('Error in meeting reminder service:', error);
      });
      cleanupCompletedMeetings(user.email || undefined).catch(error => {
        console.error('Error in meeting cleanup service:', error);
      });
    }, 60 * 1000); // Check every minute

    // Also run cleanup more frequently for better responsiveness
    const cleanupIntervalId = setInterval(() => {
      cleanupCompletedMeetings(user.email || undefined).catch(error => {
        console.error('Error in frequent meeting cleanup:', error);
      });
    }, 30 * 1000); // Check every 30 seconds

    // Also check immediately
    checkMeetingReminders(user.email || undefined).catch(error => {
      console.error('Error in initial meeting reminder check:', error);
    });
    cleanupCompletedMeetings(user.email || undefined).catch(error => {
      console.error('Error in initial meeting cleanup:', error);
    });

    return () => {
      clearInterval(intervalId);
      clearInterval(cleanupIntervalId);
    };
  }, [user]);

  // This component doesn't render anything
  return null;
}
