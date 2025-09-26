'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { setNearbyUsers, updateConnectedUser } from '@/lib/redux/features/user/userSlice';
import { addWebcamStream } from '@/lib/redux/features/webRtc/webcamSlice';
import videoCalling from '@/lib/video-calling';

interface ProximityAudioManagerProps {
  currentUserId: string;
  onProximityChange?: (nearbyUsers: string[]) => void;
}

// Constants for proximity calculations
const PROXIMITY_THRESHOLD = 150; // pixels
const MAX_AUDIO_DISTANCE = 300; // pixels
const MIN_VOLUME = 0.0;
const MAX_VOLUME = 1.0;

export function ProximityAudioManager({ 
  currentUserId, 
  onProximityChange 
}: ProximityAudioManagerProps) {
  const dispatch = useAppDispatch();
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Redux state
  const currentUserPosition = useAppSelector((state) => state.user.position);
  const connectedUsers = useAppSelector((state) => state.user.connectedUsers);
  const nearbyUsers = useAppSelector((state) => state.user.nearbyUsers);
  const peerStreams = useAppSelector((state) => state.webcam.peerStreams);

  // Initialize Web Audio API context
  useEffect(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.error('Failed to initialize AudioContext:', error);
      }
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Calculate distance between two positions
  const calculateDistance = useCallback((pos1: { x: number; y: number }, pos2: { x: number; y: number }) => {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Calculate volume based on distance
  const calculateVolume = useCallback((distance: number) => {
    if (distance >= MAX_AUDIO_DISTANCE) return MIN_VOLUME;
    if (distance <= 50) return MAX_VOLUME;
    
    // Linear falloff from 50px to MAX_AUDIO_DISTANCE
    const falloffRange = MAX_AUDIO_DISTANCE - 50;
    const distanceInRange = distance - 50;
    const volumeRatio = 1 - (distanceInRange / falloffRange);
    
    return Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, volumeRatio));
  }, []);

  // Update audio volumes based on proximity
  const updateProximityAudio = useCallback(() => {
    if (!audioContextRef.current || !currentUserPosition) return;

    const currentNearbyUsers: string[] = [];
    
    connectedUsers.forEach((user, userId) => {
      if (userId === currentUserId) return;

      const distance = calculateDistance(currentUserPosition, user.position);
      
      // Check if user is within proximity threshold
      if (distance <= PROXIMITY_THRESHOLD) {
        currentNearbyUsers.push(userId);
      }

      // Update audio volume based on distance
      const volume = calculateVolume(distance);
      const gainNode = gainNodesRef.current.get(userId);
      
      if (gainNode) {
        gainNode.gain.setValueAtTime(volume, audioContextRef.current!.currentTime);
      }

      // Update user's audio status in Redux
      dispatch(updateConnectedUser({
        userId,
        updates: { 
          lastSeen: Date.now(),
          // Could add audio volume info here if needed
        }
      }));
    });

    // Update nearby users in Redux if changed
    if (JSON.stringify(currentNearbyUsers.sort()) !== JSON.stringify(nearbyUsers.sort())) {
      dispatch(setNearbyUsers(currentNearbyUsers));
      onProximityChange?.(currentNearbyUsers);
    }
  }, [
    currentUserPosition, 
    connectedUsers, 
    currentUserId, 
    calculateDistance, 
    calculateVolume, 
    dispatch, 
    nearbyUsers, 
    onProximityChange
  ]);

  // Setup audio nodes for a peer stream
  const setupAudioNode = useCallback((userId: string, stream: MediaStream) => {
    if (!audioContextRef.current || gainNodesRef.current.has(userId)) return;

    try {
      const audioContext = audioContextRef.current;
      const source = audioContext.createMediaStreamSource(stream);
      const gainNode = audioContext.createGain();
      
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Initialize with zero volume, will be updated by proximity
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      
      gainNodesRef.current.set(userId, gainNode);
    } catch (error) {
      console.error(`Failed to setup audio node for ${userId}:`, error);
    }
  }, []);

  // Cleanup audio node for a user
  const cleanupAudioNode = useCallback((userId: string) => {
    const gainNode = gainNodesRef.current.get(userId);
    if (gainNode) {
      try {
        gainNode.disconnect();
        gainNodesRef.current.delete(userId);
      } catch (error) {
        console.error(`Failed to cleanup audio node for ${userId}:`, error);
      }
    }
  }, []);

  // Monitor peer streams and setup audio nodes
  useEffect(() => {
    peerStreams.forEach((peerData, userId) => {
      if (peerData.stream && !gainNodesRef.current.has(userId)) {
        setupAudioNode(userId, peerData.stream);
      }
    });

    // Cleanup removed peers
    gainNodesRef.current.forEach((gainNode, userId) => {
      if (!peerStreams.has(userId)) {
        cleanupAudioNode(userId);
      }
    });
  }, [peerStreams, setupAudioNode, cleanupAudioNode]);

  // Start proximity monitoring
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Update proximity every 100ms for smooth audio transitions
    intervalRef.current = setInterval(updateProximityAudio, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateProximityAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      gainNodesRef.current.forEach((gainNode) => {
        try {
          gainNode.disconnect();
        } catch (error) {
          console.error('Error disconnecting gain node:', error);
        }
      });
      gainNodesRef.current.clear();
    };
  }, []);

  // Resume AudioContext on user interaction (required by browsers)
  useEffect(() => {
    const resumeAudioContext = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };

    document.addEventListener('click', resumeAudioContext, { once: true });
    document.addEventListener('keydown', resumeAudioContext, { once: true });

    return () => {
      document.removeEventListener('click', resumeAudioContext);
      document.removeEventListener('keydown', resumeAudioContext);
    };
  }, []);

  return null; // This component doesn't render anything
}

// Hook for proximity chat functionality
export function useProximityChat(currentUserId: string) {
  const dispatch = useAppDispatch();
  const nearbyUsers = useAppSelector((state) => state.user.nearbyUsers);
  const connectedUsers = useAppSelector((state) => state.user.connectedUsers);
  
  const getNearbyUsers = useCallback(() => {
    return nearbyUsers.map(userId => connectedUsers.get(userId)).filter(Boolean);
  }, [nearbyUsers, connectedUsers]);

  const isUserNearby = useCallback((userId: string) => {
    return nearbyUsers.includes(userId);
  }, [nearbyUsers]);

  const getProximityInfo = useCallback(() => {
    return {
      nearbyCount: nearbyUsers.length,
      totalConnected: connectedUsers.size,
      nearbyUsers: getNearbyUsers(),
    };
  }, [nearbyUsers, connectedUsers, getNearbyUsers]);

  return {
    nearbyUsers,
    getNearbyUsers,
    isUserNearby,
    getProximityInfo,
  };
}