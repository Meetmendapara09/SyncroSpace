'use client';

import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { featureIntegration } from '@/lib/feature-integration';
import { eventBus } from '@/lib/feature-integration';

/**
 * A hook that ensures character selection is synchronized with Firebase and
 * persisted between sessions.
 */
export function useCharacterPersistence() {
  const [user] = useAuthState(auth);
  const avatar = useAppSelector(state => state.user.avatar);
  const roomJoined = useAppSelector(state => state.room.roomJoined);
  const currentRoomId = useAppSelector(state => state.room.currentOffice);
  
  // Save character selection to Firestore whenever it changes
  useEffect(() => {
    if (user && avatar) {
      const userPreferencesRef = doc(db, 'users', user.uid, 'preferences', 'character');
      setDoc(userPreferencesRef, {
        selectedCharacter: avatar,
        lastUpdated: new Date()
      }, { merge: true }).catch(error => {
        console.error('Error saving character preference:', error);
      });
      
      // Also update in current room if joined
      if (roomJoined && currentRoomId) {
        featureIntegration.updateUserData({ 
          avatar: avatar,
          characterId: avatar
        });
      }
    }
  }, [user, avatar, roomJoined, currentRoomId]);
  
  // Load character selection from Firestore on initial load
  useEffect(() => {
    const loadCharacterPreference = async () => {
      if (!user) return;
      
      try {
        const userPreferencesRef = doc(db, 'users', user.uid, 'preferences', 'character');
        const docSnap = await getDoc(userPreferencesRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.selectedCharacter) {
            // Emit event to update character
            eventBus.emit('character:selected', data.selectedCharacter);
          }
        }
      } catch (error) {
        console.error('Error loading character preference:', error);
      }
    };
    
    loadCharacterPreference();
  }, [user]);
  
  return {
    selectedCharacter: avatar
  };
}

export default useCharacterPersistence;