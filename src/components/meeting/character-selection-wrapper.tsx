'use client';

import React, { useState, useEffect } from 'react';
import { CharacterSelection, Character, AVAILABLE_CHARACTERS } from '@/components/meeting/character-selection';
import { useSyncroSpaceFeatures } from '@/lib/hooks/use-syncrospace-features';
import { useCharacterPersistence } from '@/lib/hooks/use-character-persistence';
import { auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { eventBus } from '@/lib/feature-integration';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { updateConnectedUser } from '@/lib/redux/features/user/userSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { featureIntegration } from '@/lib/feature-integration';

interface CharacterSelectionWrapperProps {
  onComplete?: () => void;
  showTitle?: boolean;
}

export function CharacterSelectionWrapper({
  onComplete,
  showTitle = true
}: CharacterSelectionWrapperProps) {
  const [user] = useAuthState(auth);
  const dispatch = useAppDispatch();
  const [selectedCharacter, setSelectedCharacter] = useState<string | undefined>(undefined);
  const { selectCharacter } = useSyncroSpaceFeatures();
  // Use character persistence hook to synchronize character selection with Firebase
  const characterPersistence = useCharacterPersistence();
  
  const userAvatar = useAppSelector(state => state.user.avatar);
  const isRoomJoined = useAppSelector(state => state.room.roomJoined);
  const currentRoomId = useAppSelector(state => state.room.currentOffice);
  const userId = useAppSelector(state => state.user.currentUserId);
  
  useEffect(() => {
    // Set initial character from Redux store if available
    if (userAvatar) {
      setSelectedCharacter(userAvatar);
    }
  }, [userAvatar]);
  
  // Handle character selection
  const handleCharacterSelect = (characterId: string) => {
    setSelectedCharacter(characterId);
  };
  
  // Handle confirmation of selection
  const handleConfirmSelection = () => {
    if (!selectedCharacter || !user) return;
    
    // Update via feature integration service
    selectCharacter(selectedCharacter);
    
    // If connected to a room, update user data
    if (isRoomJoined && userId) {
      featureIntegration.updateUserData({ avatar: selectedCharacter });
      
      // Update in Redux
      dispatch(updateConnectedUser({
        userId: userId,
        updates: { avatar: selectedCharacter }
      }));
    }
    
    // Call callback if provided
    if (onComplete) {
      onComplete();
    }
  };
  
  // Get character details if selected
  const characterDetails = selectedCharacter 
    ? AVAILABLE_CHARACTERS.find(c => c.id === selectedCharacter) 
    : undefined;
  
  return (
    <div className="container mx-auto px-4 py-6">
      {showTitle && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-center">Customize Your Experience</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Choose a character to represent yourself in the virtual office. 
              Your character will be visible to other users in the space.
            </p>
          </CardContent>
        </Card>
      )}
      
      <CharacterSelection
        selectedCharacter={selectedCharacter}
        onCharacterSelect={handleCharacterSelect}
        onConfirm={handleConfirmSelection}
      />
      
      {characterDetails && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Selected: {characterDetails.name}</p>
          <p>{characterDetails.description}</p>
        </div>
      )}
    </div>
  );
}

export default CharacterSelectionWrapper;