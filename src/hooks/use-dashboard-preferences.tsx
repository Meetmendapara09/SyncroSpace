'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

export interface DashboardPreferences {
  widgets: any[];
  layout: string;
  theme: string;
  favoriteTeams: string[];
  favoriteProjects: string[];
  showActiveMeetings: boolean;
  showNotifications: boolean;
  favoriteSpaces: string[];
  compactView: boolean;
}

const defaultPreferences: DashboardPreferences = {
  widgets: [],
  layout: 'default',
  theme: 'system',
  favoriteTeams: [],
  favoriteProjects: [],
  showActiveMeetings: true,
  showNotifications: true,
  favoriteSpaces: [],
  compactView: false,
};

export function useDashboardPreferences() {
  const [user] = useAuthState(auth);
  const [preferences, setPreferences] = useState<DashboardPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load preferences
  useEffect(() => {
    async function loadPreferences() {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().dashboardPreferences) {
          setPreferences({
            ...defaultPreferences,
            ...userDoc.data().dashboardPreferences,
          });
        } else {
          setPreferences(defaultPreferences);
        }
      } catch (err: any) {
        console.error('Error loading dashboard preferences:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    loadPreferences();
  }, [user]);

  // Update a single preference
  const updatePreference = useCallback(async <K extends keyof DashboardPreferences>(
    key: K,
    value: DashboardPreferences[K]
  ) => {
    if (!user) return;

    try {
      // Update local state
      setPreferences(prev => ({
        ...prev,
        [key]: value,
      }));

      // Update in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const currentPrefs = userDoc.data().dashboardPreferences || defaultPreferences;
        
        await updateDoc(userDocRef, {
          dashboardPreferences: {
            ...currentPrefs,
            [key]: value,
          },
          lastUpdated: serverTimestamp(),
        });
      } else {
        await setDoc(userDocRef, {
          dashboardPreferences: {
            ...defaultPreferences,
            [key]: value,
          },
          lastUpdated: serverTimestamp(),
        });
      }
    } catch (err: any) {
      console.error(`Error updating ${String(key)} preference:`, err);
      setError(err);
      
      // Revert local state on error
      setPreferences(prev => {
        // Attempt to get from Firestore again if needed
        return prev;
      });
      
      throw err; // Re-throw for the caller to handle
    }
  }, [user]);

  // Update all preferences
  const updateAllPreferences = useCallback(async (newPreferences: Partial<DashboardPreferences>) => {
    if (!user) return;

    try {
      // Update local state
      setPreferences(prev => ({
        ...prev,
        ...newPreferences,
      }));

      // Update in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const currentPrefs = userDoc.data().dashboardPreferences || defaultPreferences;
        
        await updateDoc(userDocRef, {
          dashboardPreferences: {
            ...currentPrefs,
            ...newPreferences,
          },
          lastUpdated: serverTimestamp(),
        });
      } else {
        await setDoc(userDocRef, {
          dashboardPreferences: {
            ...defaultPreferences,
            ...newPreferences,
          },
          lastUpdated: serverTimestamp(),
        });
      }
    } catch (err: any) {
      console.error('Error updating all preferences:', err);
      setError(err);
      throw err;
    }
  }, [user]);

  // Reset to default preferences
  const resetPreferences = useCallback(async () => {
    if (!user) return;

    try {
      setPreferences(defaultPreferences);

      const userDocRef = doc(db, 'users', user.uid);
      
      await updateDoc(userDocRef, {
        dashboardPreferences: defaultPreferences,
        lastUpdated: serverTimestamp(),
      });
    } catch (err: any) {
      console.error('Error resetting preferences:', err);
      setError(err);
      throw err;
    }
  }, [user]);

  return {
    preferences,
    loading,
    error,
    updatePreference,
    updateAllPreferences,
    resetPreferences,
  };
}