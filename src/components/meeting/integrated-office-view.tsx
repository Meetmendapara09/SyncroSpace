'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSyncroSpaceFeatures } from '@/lib/hooks/use-syncrospace-features';
import { useCharacterPersistence } from '@/lib/hooks/use-character-persistence';
import { useAppSelector } from '@/lib/redux/hooks';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { featureIntegration, eventBus } from '@/lib/feature-integration';
import videoCalling from '@/lib/video-calling';
import { CharacterSelectionWrapper } from '@/components/meeting/character-selection-wrapper';
import { MeetingChat } from '@/components/meeting/enhanced-meeting-chat';
import { ChatNotifications } from '@/components/meeting/enhanced-meeting-chat';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

import {
  Users,
  Video,
  VideoOff,
  Mic,
  MicOff,
  ScreenShare,
  LogOut,
  Settings,
} from 'lucide-react';

// Types for office layout and zones
interface OfficeZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'meeting' | 'desk' | 'relax' | 'kitchen';
}

const OFFICE_ZONES: OfficeZone[] = [
  { 
    id: 'meeting-room-1', 
    name: 'Meeting Room 1', 
    x: 100, 
    y: 100, 
    width: 200, 
    height: 150, 
    type: 'meeting' 
  },
  { 
    id: 'desk-area', 
    name: 'Work Desks', 
    x: 350, 
    y: 100, 
    width: 300, 
    height: 200, 
    type: 'desk' 
  },
  { 
    id: 'kitchen', 
    name: 'Kitchen', 
    x: 100, 
    y: 300, 
    width: 150, 
    height: 150, 
    type: 'kitchen' 
  },
  { 
    id: 'lounge', 
    name: 'Lounge', 
    x: 350, 
    y: 350, 
    width: 200, 
    height: 150, 
    type: 'relax' 
  },
];

export function IntegratedOfficeView() {
  const [user] = useAuthState(auth);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentZone, setCurrentZone] = useState<string | null>(null);
  const [characterSelected, setCharacterSelected] = useState(false);
  const [isWebcamOn, setIsWebcamOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // Use character persistence hook to ensure character selection is maintained
  const characterPersistence = useCharacterPersistence();
  
  // Get features from our custom hook
  const {
    isInitialized,
    currentRoomId,
    userPosition,
    connectedUsers,
    nearbyUsers,
    joinRoom,
    leaveRoom,
    updatePosition,
    enterZone,
    exitZone,
    selectCharacter,
  } = useSyncroSpaceFeatures();
  
  // Track nearby users for WebRTC connections
  useEffect(() => {
    if (!isWebcamOn || !user || !isInitialized) return;
    
    // Connect to users who are nearby but not connected
    nearbyUsers.forEach(async (userId) => {
      try {
        // Initialize peer if not already
        if (!videoCalling.getPeer()) {
          await videoCalling.initializePeer(user.uid);
        }
        
        // Share webcam with nearby user
        videoCalling.shareWebcam(userId);
      } catch (error) {
        console.error(`Error connecting to nearby user ${userId}:`, error);
      }
    });
    
    // Clean up when nearby users change
    return () => {
      // Note: This doesn't disconnect existing calls. If that's needed,
      // we would need to track which users are no longer nearby and disconnect them
    };
  }, [nearbyUsers, isWebcamOn, user, isInitialized]);
  
  const currentOffice = useAppSelector(state => state.room.currentOffice);
  const roomJoined = useAppSelector(state => state.room.roomJoined);
  const playerPosition = useAppSelector(state => state.room.playerPosition);
  const userAvatar = useAppSelector(state => state.user.avatar);
  
  // Character images cache
  const characterImages = useRef<Map<string, HTMLImageElement>>(new Map());
  
  // Setup canvas and join room
  useEffect(() => {
    if (!user || !isInitialized) return;
    
    // If room not joined yet, join the default office room
    if (!roomJoined) {
      joinRoom('office-default');
    }
    
    // Set character selected if avatar exists
    if (userAvatar) {
      setCharacterSelected(true);
      
      // Make sure the character is updated in the room
      if (roomJoined) {
        featureIntegration.updateUserData({ 
          avatar: userAvatar,
          characterId: userAvatar
        });
      }
    }
    
    // Preload character images
    const characters = ['adam', 'ash', 'lucy', 'nancy'];
    characters.forEach(charId => {
      const img = new Image();
      img.src = `/assets/characters/single/${charId}_idle_anim_1.png`;
      img.onload = () => {
        characterImages.current.set(charId, img);
      };
    });
    
    // Return cleanup function
    return () => {
      if (roomJoined) {
        leaveRoom();
      }
    };
  }, [user, isInitialized, roomJoined, joinRoom, leaveRoom, userAvatar]);
  
  // Canvas rendering
  useEffect(() => {
    if (!canvasRef.current || !characterSelected || !roomJoined) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Animation frame ID for cleanup
    let animationId: number;
    
    // Draw the office and characters
    const drawOffice = () => {
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw zones
      OFFICE_ZONES.forEach(zone => {
        // Different colors for different zone types
        let fillColor;
        switch (zone.type) {
          case 'meeting': fillColor = 'rgba(100, 149, 237, 0.2)'; break;
          case 'desk': fillColor = 'rgba(144, 238, 144, 0.2)'; break;
          case 'kitchen': fillColor = 'rgba(255, 218, 185, 0.2)'; break;
          case 'relax': fillColor = 'rgba(221, 160, 221, 0.2)'; break;
          default: fillColor = 'rgba(200, 200, 200, 0.2)';
        }
        
        ctx.fillStyle = fillColor;
        ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
        
        // Zone border
        ctx.strokeStyle = zone.id === currentZone ? '#3b82f6' : '#d1d5db';
        ctx.lineWidth = zone.id === currentZone ? 2 : 1;
        ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
        
        // Zone name
        ctx.fillStyle = '#4b5563';
        ctx.font = '12px Arial';
        ctx.fillText(zone.name, zone.x + 5, zone.y + 16);
      });
      
      // Draw current user
      if (userAvatar && characterImages.current.has(userAvatar)) {
        const img = characterImages.current.get(userAvatar)!;
        ctx.drawImage(img, playerPosition.x, playerPosition.y, 32, 48);
        
        // Draw username above character
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(user?.displayName || 'You', playerPosition.x + 16, playerPosition.y - 5);
        
        // Draw video/mic indicators if active
        if (isWebcamOn || isMicOn) {
          let iconX = playerPosition.x + 24;
          
          if (isWebcamOn) {
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(iconX, playerPosition.y - 16, 5, 0, Math.PI * 2);
            ctx.fill();
            iconX += 12;
          }
          
          if (isMicOn) {
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(iconX, playerPosition.y - 16, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      
      // Draw other users
      connectedUsers.forEach((connectedUser, userId) => {
        if (userId !== user?.uid && connectedUser.position) {
          const avatar = connectedUser.avatar || 'adam';
          
          if (characterImages.current.has(avatar)) {
            const img = characterImages.current.get(avatar)!;
            ctx.drawImage(
              img, 
              connectedUser.position.x, 
              connectedUser.position.y, 
              32, 
              48
            );
            
            // Draw username above character
            ctx.fillStyle = '#000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(
              connectedUser.username, 
              connectedUser.position.x + 16, 
              connectedUser.position.y - 5
            );
            
            // Draw indicators for webcam/mic
            let iconX = connectedUser.position.x + 24;
            
            if (connectedUser.isWebcamEnabled) {
              ctx.fillStyle = '#10b981';
              ctx.beginPath();
              ctx.arc(iconX, connectedUser.position.y - 16, 5, 0, Math.PI * 2);
              ctx.fill();
              iconX += 12;
            }
            
            if (connectedUser.isMicEnabled) {
              ctx.fillStyle = '#3b82f6';
              ctx.beginPath();
              ctx.arc(iconX, connectedUser.position.y - 16, 5, 0, Math.PI * 2);
              ctx.fill();
            }
            
            // Highlight nearby users (those in proximity chat range)
            if (nearbyUsers.includes(userId)) {
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(
                connectedUser.position.x + 16, 
                connectedUser.position.y + 24, 
                40, 
                0, 
                Math.PI * 2
              );
              ctx.stroke();
            }
          }
        }
      });
      
      // Continue animation
      animationId = requestAnimationFrame(drawOffice);
    };
    
    // Start drawing
    drawOffice();
    
    // Cleanup animation on unmount
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [canvasRef, characterSelected, roomJoined, playerPosition, connectedUsers, nearbyUsers, userAvatar, currentZone, user, isWebcamOn, isMicOn]);
  
  // Handle canvas click for movement
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !roomJoined) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update position locally and in service
    updatePosition({ x, y });
    
    // Check if entering/exiting a zone
    let newZone: string | null = null;
    
    for (const zone of OFFICE_ZONES) {
      if (
        x >= zone.x && 
        x <= zone.x + zone.width && 
        y >= zone.y && 
        y <= zone.y + zone.height
      ) {
        newZone = zone.id;
        break;
      }
    }
    
    // Handle zone transitions
    if (newZone !== currentZone) {
      // Exit previous zone
      if (currentZone) {
        exitZone(currentZone);
      }
      
      // Enter new zone
      if (newZone) {
        enterZone(newZone);
      }
      
      setCurrentZone(newZone);
    }
  };
  
  // Toggle webcam state
  const toggleWebcam = async () => {
    try {
      if (!isWebcamOn) {
        // Initialize webcam if not already on
        const stream = await videoCalling.getUserMedia();
        if (stream) {
          // Initialize peer connection if needed
          if (user && !videoCalling.getPeer()) {
            await videoCalling.initializePeer(user.uid);
          }
          
          // Connect with nearby users
          nearbyUsers.forEach(userId => {
            videoCalling.shareWebcam(userId);
          });
          
          setIsWebcamOn(true);
        }
      } else {
        // Turn off webcam
        videoCalling.toggleVideo();
        setIsWebcamOn(false);
      }
      
      // Update user data in the feature service
      if (user && roomJoined) {
        featureIntegration.updateUserData({ isWebcamEnabled: !isWebcamOn });
        // Emit event for other components
        eventBus.emit('webcam:toggled', !isWebcamOn);
      }
    } catch (error) {
      console.error('Error toggling webcam:', error);
      // Show error to user
      alert('Failed to toggle webcam. Please check camera permissions.');
    }
  };
  
  // Toggle microphone state
  const toggleMic = async () => {
    try {
      if (!isMicOn) {
        // Initialize audio if not already on
        if (!videoCalling.getCallState().myStream) {
          const stream = await videoCalling.getUserMedia();
          if (!stream) {
            throw new Error('Failed to access microphone');
          }
        }
        
        videoCalling.toggleAudio();
        setIsMicOn(true);
      } else {
        // Turn off microphone
        videoCalling.toggleAudio();
        setIsMicOn(false);
      }
      
      // Update user data in the feature service
      if (user && roomJoined) {
        featureIntegration.updateUserData({ isMicEnabled: !isMicOn });
        // Emit event for other components
        eventBus.emit('mic:toggled', !isMicOn);
      }
    } catch (error) {
      console.error('Error toggling microphone:', error);
      // Show error to user
      alert('Failed to toggle microphone. Please check microphone permissions.');
    }
  };
  
  // Toggle screen sharing state
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // Get screen sharing stream
        const displayMediaOptions: DisplayMediaStreamOptions = {
          video: true,
          audio: false
        };
        
        // Request screen share permissions and get stream
        const screenStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
        
        // Initialize peer connection if needed
        if (user && !videoCalling.getPeer()) {
          await videoCalling.initializePeer(user.uid);
        }
        
        // TODO: Implement proper screen sharing through videoCalling service
        // This would require extending the video-calling.ts service
        
        // For now, just update UI
        setIsScreenSharing(true);
        
        // Add event listener to detect when user stops sharing
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
          setIsScreenSharing(false);
          eventBus.emit('screen:toggled', false);
        });
        
        // Emit event for other components
        eventBus.emit('screen:toggled', true);
      } else {
        // Since we can't programmatically end screen sharing,
        // the user has to click the browser's "Stop sharing" button
        // Just update the UI state
        setIsScreenSharing(false);
        eventBus.emit('screen:toggled', false);
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      setIsScreenSharing(false);
      // Show error to user
      alert('Failed to start screen sharing. Please try again.');
    }
  };
  
  // Handle exiting the office
  const handleExitOffice = () => {
    if (roomJoined) {
      leaveRoom();
    }
  };
  
  // If not authenticated, show login prompt
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Card className="p-6 max-w-md">
          <h2 className="text-xl font-bold mb-4">Authentication Required</h2>
          <p className="mb-4">Please sign in to access the virtual office.</p>
        </Card>
      </div>
    );
  }
  
  // If character not selected, show character selection first
  if (!characterSelected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Welcome to SyncroSpace</h1>
        <CharacterSelectionWrapper 
          onComplete={() => setCharacterSelected(true)}
          showTitle={true}
        />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">SyncroSpace Virtual Office</h1>
          <a href="/diagnostic" className="text-sm text-blue-600 hover:underline ml-2" target="_blank">Diagnostics</a>
        </div>
        
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleWebcam}
                className={isWebcamOn ? 'bg-green-100' : ''}
              >
                {isWebcamOn ? <Video size={18} /> : <VideoOff size={18} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isWebcamOn ? 'Turn webcam off' : 'Turn webcam on'}
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleMic}
                className={isMicOn ? 'bg-blue-100' : ''}
              >
                {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isMicOn ? 'Turn microphone off' : 'Turn microphone on'}
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleScreenShare}
                className={isScreenSharing ? 'bg-purple-100' : ''}
              >
                <ScreenShare size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isScreenSharing ? 'Stop screen sharing' : 'Share your screen'}
            </TooltipContent>
          </Tooltip>
          
          <Button 
            variant="outline" 
            size="sm"
            className="ml-2"
            onClick={() => window.open('/settings', '_blank')}
          >
            <Settings size={16} className="mr-2" />
            Settings
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            className="ml-2"
            onClick={handleExitOffice}
          >
            <LogOut size={16} className="mr-2" />
            Exit Office
          </Button>
        </div>
      </div>
      
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative bg-slate-100 border rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              onClick={handleCanvasClick}
              className="w-full h-full cursor-pointer"
            ></canvas>
            
            {currentZone && (
              <div className="absolute top-2 left-2 bg-white/90 rounded px-2 py-1 text-sm shadow-sm">
                Current zone: <span className="font-medium">{
                  OFFICE_ZONES.find(zone => zone.id === currentZone)?.name || currentZone
                }</span>
              </div>
            )}
            
            <div className="absolute top-2 right-2 bg-white/90 rounded px-2 py-1 text-sm shadow-sm">
              <div className="flex items-center gap-1">
                <Users size={14} />
                <span className="font-medium">{connectedUsers.size + 1} users online</span>
              </div>
            </div>
            
            <div className="absolute bottom-2 left-2 bg-white/90 rounded px-2 py-1 text-sm shadow-sm">
              <div className="flex items-center gap-1">
                <span className="font-medium">Click anywhere to move</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 bg-white p-4 rounded-lg border">
            <h2 className="text-lg font-medium mb-2">Office Zones</h2>
            <div className="grid grid-cols-2 gap-3">
              {OFFICE_ZONES.map((zone) => (
                <div 
                  key={zone.id} 
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentZone === zone.id 
                      ? 'bg-blue-100 border border-blue-300' 
                      : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => {
                    // Move user to the center of the zone
                    const x = zone.x + zone.width / 2;
                    const y = zone.y + zone.height / 2;
                    updatePosition({ x, y });
                    
                    // Update zone status
                    if (currentZone) exitZone(currentZone);
                    enterZone(zone.id);
                    setCurrentZone(zone.id);
                  }}
                >
                  <h3 className="font-medium text-sm">{zone.name}</h3>
                  <p className="text-xs text-gray-500 capitalize">Type: {zone.type}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Chat components will appear at the bottom right corner */}
      <MeetingChat />
      <ChatNotifications />
    </div>
  );
}

export default IntegratedOfficeView;