'use client';

import { useEffect, useState } from 'react';
import { featureIntegration, eventBus } from '../feature-integration';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';

export function useSyncroSpaceFeatures() {
  const dispatch = useAppDispatch();
  const [user] = useAuthState(auth);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Get current state from Redux store
  const currentRoomId = useAppSelector((state) => state.room.currentOffice);
  const userPosition = useAppSelector((state) => state.room.playerPosition);
  const connectedUsers = useAppSelector((state) => state.user.connectedUsers);
  const nearbyUsers = useAppSelector((state) => state.user.nearbyUsers);
  const isChatWindowOpen = useAppSelector((state) => state.chat.isChatWindowOpen);
  const unreadCount = useAppSelector((state) => state.chat.unreadCount);
  
  // Initialize feature integration service when user logs in
  useEffect(() => {
    if (user && !isInitialized) {
      featureIntegration.initialize(
        user.uid,
        user.displayName || user.email?.split('@')[0] || 'Anonymous',
        undefined // Character will be set later
      );
      setIsInitialized(true);
    }
    
    // Clean up when component unmounts
    return () => {
      if (isInitialized) {
        featureIntegration.cleanup();
      }
    };
  }, [user, isInitialized]);
  
  // Save session data before window unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isInitialized) {
        featureIntegration.persistSession();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isInitialized]);
  
  // Create helper functions for components
  const selectCharacter = (characterId: string) => {
    eventBus.emit('character:selected', characterId);
  };
  
  const joinRoom = (roomId: string) => {
    featureIntegration.joinRoom(roomId);
  };
  
  const leaveRoom = () => {
    featureIntegration.leaveRoom();
  };
  
  const updatePosition = (position: { x: number; y: number }) => {
    featureIntegration.updateUserPosition(position);
  };
  
  const sendMessage = (message: string, type: 'global' | 'office') => {
    featureIntegration.sendMessage(message, type);
  };
  
  const enterZone = (zoneId: string) => {
    featureIntegration.trackZoneMovement(zoneId, true);
  };
  
  const exitZone = (zoneId: string) => {
    featureIntegration.trackZoneMovement(zoneId, false);
  };
  
  const restoreSession = async () => {
    return await featureIntegration.restoreSession();
  };
  
  return {
    // Status
    isInitialized,
    currentUser: user,
    
    // State
    currentRoomId,
    userPosition,
    connectedUsers,
    nearbyUsers,
    isChatWindowOpen,
    unreadCount,
    
    // Actions
    selectCharacter,
    joinRoom,
    leaveRoom,
    updatePosition,
    sendMessage,
    enterZone,
    exitZone,
    restoreSession
  };
}

export default useSyncroSpaceFeatures;