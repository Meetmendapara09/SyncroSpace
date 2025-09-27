'use client';

import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, rtdb } from '@/lib/firebase';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { ref, onValue, set, serverTimestamp } from 'firebase/database';
import { featureIntegration, eventBus } from '@/lib/feature-integration';
import { setPlayerPosition } from '@/lib/redux/features/room/roomSlice';

export interface SessionData {
  roomId: string;
  position: { x: number, y: number };
  timestamp: number;
  lastZoneId?: string | null;
  avatar?: string;
}

/**
 * Hook for managing user session persistence
 */
export function useSessionPersistence() {
  const [user] = useAuthState(auth);
  const [lastSession, setLastSession] = useState<SessionData | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSessionSaved, setIsSessionSaved] = useState(false);
  const dispatch = useAppDispatch();
  
  const currentRoomId = useAppSelector(state => state.room.currentOffice);
  const playerPosition = useAppSelector(state => state.room.playerPosition);
  const userAvatar = useAppSelector(state => state.user.avatar);
  
  // Save session data on significant changes and before unload
  useEffect(() => {
    if (!user || !currentRoomId) return;
    
    // Function to save session
    const saveSession = async () => {
      try {
        const sessionData: SessionData = {
          roomId: currentRoomId,
          position: playerPosition,
          timestamp: Date.now(),
          avatar: userAvatar,
        };
        
        // Save to Firestore for persistence
        const sessionRef = doc(db, 'users', user.uid, 'sessions', 'lastSession');
        await setDoc(sessionRef, {
          ...sessionData,
          timestamp: Timestamp.fromDate(new Date())
        });
        
        // Also save to RTDB for quicker access
        const rtdbSessionRef = ref(rtdb, `users/${user.uid}/lastSession`);
        await set(rtdbSessionRef, {
          ...sessionData,
          timestamp: serverTimestamp()
        });
        
        setIsSessionSaved(true);
        console.log('Session saved:', sessionData);
      } catch (error) {
        console.error('Error saving session:', error);
      }
    };
    
    // Save session before page unload
    const handleBeforeUnload = () => {
      featureIntegration.persistSession();
      saveSession();
    };
    
    // Save session every 30 seconds if position changed
    const intervalId = setInterval(saveSession, 30000);
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Save session immediately on significant changes
    const handleRoomChange = () => saveSession();
    const handlePositionChange = () => {
      // Debounce position saving to avoid too frequent writes
      clearTimeout(positionTimer);
      positionTimer = setTimeout(saveSession, 3000);
    };
    
    let positionTimer: NodeJS.Timeout;
    
    eventBus.on('room:joined', handleRoomChange);
    eventBus.on('position:updated', handlePositionChange);
    
    return () => {
      clearInterval(intervalId);
      clearTimeout(positionTimer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      eventBus.off('room:joined', handleRoomChange);
      eventBus.off('position:updated', handlePositionChange);
      
      // Save session on unmount
      saveSession();
    };
  }, [user, currentRoomId, playerPosition, userAvatar]);
  
  // Restore session on load
  useEffect(() => {
    if (!user || isRestoring) return;
    
    const restoreSession = async () => {
      try {
        setIsRestoring(true);
        
        // Try to get session from RTDB first (faster)
        const rtdbSessionRef = ref(rtdb, `users/${user.uid}/lastSession`);
        
        // Set up error handler for onValue
        const onError = (error: Error) => {
          console.error('Error retrieving session from RTDB:', error);
          // Continue with Firestore fallback
          fallbackToFirestore();
        };
        
        // Set up the listener with error handling
        onValue(
          rtdbSessionRef, 
          async (snapshot) => {
            try {
              const rtdbSession = snapshot.val();
              
              if (rtdbSession) {
                console.log('Retrieved session from RTDB:', rtdbSession);
                setLastSession(rtdbSession);
                setIsRestoring(false);
              } else {
                // Fall back to Firestore
                fallbackToFirestore();
              }
            } catch (error) {
              console.error('Error processing RTDB session data:', error);
              fallbackToFirestore();
            }
          }, 
          { onlyOnce: true }
        );
        
        // Fallback function to try Firestore if RTDB fails
        const fallbackToFirestore = async () => {
          try {
            console.log('Falling back to Firestore for session data');
            const sessionRef = doc(db, 'users', user.uid, 'sessions', 'lastSession');
            const sessionDoc = await getDoc(sessionRef);
            
            if (sessionDoc.exists()) {
              const firestoreSession = sessionDoc.data() as SessionData;
              console.log('Retrieved session from Firestore:', firestoreSession);
              setLastSession(firestoreSession);
            } else {
              console.log('No session found in Firestore');
            }
          } catch (error) {
            console.error('Error retrieving session from Firestore:', error);
          } finally {
            setIsRestoring(false);
          }
        };
        
      } catch (error) {
        console.error('Error in session restoration process:', error);
        setIsRestoring(false);
      }
    };
    
    // Start the restore process
    restoreSession();
    
    // Cleanup function to ensure we don't have memory leaks
    return () => {
      // If needed, we could clean up any lingering listeners here
    };
  }, [user]);
  
  // Function to restore session
  const restoreSession = async () => {
    if (!lastSession || !user) return false;
    
    try {
      console.log('Restoring session with data:', lastSession);
      
      // Join the previously saved room
      featureIntegration.joinRoom(lastSession.roomId);
      
      // Wait a moment for the room join to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Restore position
      if (lastSession.position && 
          typeof lastSession.position.x === 'number' && 
          typeof lastSession.position.y === 'number') {
        featureIntegration.updateUserPosition(lastSession.position);
        dispatch(setPlayerPosition(lastSession.position));
        console.log('Position restored:', lastSession.position);
      } else {
        console.warn('Invalid position data in session:', lastSession.position);
      }
      
      // Restore character if available
      if (lastSession.avatar) {
        console.log('Avatar restored:', lastSession.avatar);
        eventBus.emit('character:selected', lastSession.avatar);
      }
      
      // Restore zone if available
      if (lastSession.lastZoneId) {
        // Wait a bit longer for character and position to be applied
        setTimeout(() => {
          console.log('Zone restored:', lastSession.lastZoneId);
          eventBus.emit('zone:entered', lastSession.lastZoneId);
        }, 1000);
      }
      
      // Emit event for successful session restore
      eventBus.emit('session:restored', lastSession);
      
      return true;
    } catch (error) {
      console.error('Error applying session restore:', error);
      // Show error message to user
      alert('Failed to restore your previous session. Starting a new session.');
      return false;
    }
  };
  
  return {
    lastSession,
    isRestoring,
    isSessionSaved,
    restoreSession,
  };
}

export default useSessionPersistence;