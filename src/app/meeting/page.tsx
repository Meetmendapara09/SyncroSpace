'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { RoomDecider } from '@/components/meeting/room-selection';
import { OfficeSpace, ProximityChatPanel } from '@/components/meeting/office-space';
import { FloatingActions } from '@/components/meeting/floating-actions';
import { MeetingChat, ChatNotifications } from '@/components/meeting/meeting-chat';
import { MovementControls } from '@/components/meeting/avatar-movement';
import { CharacterSelection } from '@/components/meeting/character-selection';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { 
  setCurrentUser, 
  setUserPosition, 
  joinOffice, 
  leaveOffice, 
  addConnectedUser,
  removeConnectedUser 
} from '@/lib/redux/features/user/userSlice';
import { setRoomJoined, setPlayerPosition } from '@/lib/redux/features/room/roomSlice';
import { 
  setMyWebcamStream, 
  toggleWebcam, 
  toggleMic,
  addWebcamStream,
  disconnectUserForVideoCalling 
} from '@/lib/redux/features/webRtc/webcamSlice';
import videoCalling from '@/lib/video-calling';

interface Player {
  id: string;
  username: string;
  position: { x: number; y: number };
  webcamStream?: MediaStream;
  isWebcamEnabled?: boolean;
  isMicEnabled?: boolean;
  avatar?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
}

export default function MeetingPage() {
  const [user, loading] = useAuthState(auth);
  const dispatch = useAppDispatch();
  
  // Character selection state
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [showCharacterSelection, setShowCharacterSelection] = useState(true);
  
  // Redux state
  const roomJoined = useAppSelector((state) => state.room.roomJoined);
  const playerPosition = useAppSelector((state) => state.room.playerPosition);
  const myWebcamStream = useAppSelector((state) => state.webcam.myWebcamStream);
  const isWebcamEnabled = useAppSelector((state) => state.webcam.isWebcamOn);
  const isMicEnabled = useAppSelector((state) => state.webcam.isMicOn);

  // Local state
  const [currentRoomId, setCurrentRoomId] = useState<string>('');
  const [isPublicRoom, setIsPublicRoom] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [nearbyPlayers, setNearbyPlayers] = useState<Player[]>([]);
  const [isProximityEnabled, setIsProximityEnabled] = useState(true);

  // Mock current player for demo
  const currentPlayer: Player | undefined = user ? {
    id: user.uid,
    username: user.displayName || user.email?.split('@')[0] || 'You',
    position: playerPosition,
    webcamStream: myWebcamStream || undefined,
    isWebcamEnabled,
    isMicEnabled,
    avatar: selectedCharacter || 'adam',
    status: 'online'
  } : undefined;

  // Initialize webcam on mount
  useEffect(() => {
    const initializeWebcam = async () => {
      try {
        const stream = await videoCalling.getUserMedia();
        if (stream) {
          dispatch(setMyWebcamStream(stream));
        }
      } catch (error) {
        console.error('Failed to initialize webcam:', error);
      }
    };

    if (user && !myWebcamStream) {
      initializeWebcam();
    }
  }, [user, myWebcamStream, dispatch]);

  // Update players when current player changes
  useEffect(() => {
    if (currentPlayer) {
      setPlayers(prev => {
        const otherPlayers = prev.filter(p => p.id !== currentPlayer.id);
        return [...otherPlayers, currentPlayer];
      });
    }
  }, [currentPlayer]);

  // Initialize user state when joining room
  const handleJoinRoom = useCallback((roomId: string, isPublic: boolean) => {
    setCurrentRoomId(roomId);
    setIsPublicRoom(isPublic);
    
    // Set current user in Redux
    if (user) {
      dispatch(setCurrentUser({
        userId: user.uid,
        username: user.displayName || user.email?.split('@')[0] || 'You',
        avatar: user.photoURL || undefined
      }));
      
      dispatch(joinOffice(roomId));
    }
    
    dispatch(setRoomJoined(true));
    
    // Mock other players for demo
    const mockPlayers: Player[] = [
      {
        id: 'player1',
        username: 'Alice',
        position: { x: 200, y: 200 },
        isWebcamEnabled: true,
        isMicEnabled: true,
        status: 'online'
      },
      {
        id: 'player2', 
        username: 'Bob',
        position: { x: 600, y: 150 },
        isWebcamEnabled: false,
        isMicEnabled: true,
        status: 'busy'
      },
      {
        id: 'player3',
        username: 'Charlie',
        position: { x: 350, y: 450 },
        isWebcamEnabled: true,
        isMicEnabled: false,
        status: 'online'
      },
    ];
    
    // Add mock users to Redux
    mockPlayers.forEach(player => {
      dispatch(addConnectedUser({
        userId: player.id,
        username: player.username,
        position: player.position,
        isWebcamEnabled: player.isWebcamEnabled || false,
        isMicEnabled: player.isMicEnabled || false,
        status: player.status || 'online',
        lastSeen: Date.now()
      }));
    });
    
    if (currentPlayer) {
      setPlayers([...mockPlayers, currentPlayer]);
    } else {
      setPlayers(mockPlayers);
    }
  }, [currentPlayer, dispatch, user]);

  const handlePositionChange = useCallback((position: { x: number; y: number }) => {
    dispatch(setUserPosition(position));
  }, [dispatch]);

  const handleProximityChat = useCallback((nearbyPlayers: Player[]) => {
    setNearbyPlayers(nearbyPlayers);
  }, []);

  // Character selection handlers
  const handleCharacterSelect = useCallback((characterId: string) => {
    setSelectedCharacter(characterId);
  }, []);

  const handleConfirmCharacter = useCallback(() => {
    if (selectedCharacter) {
      setShowCharacterSelection(false);
    }
  }, [selectedCharacter]);

  const handleToggleWebcam = useCallback(async () => {
    try {
      if (!myWebcamStream) {
        const stream = await videoCalling.getUserMedia();
        if (stream) {
          dispatch(setMyWebcamStream(stream));
        }
      } else {
        dispatch(toggleWebcam());
      }
    } catch (error) {
      console.error('Failed to toggle webcam:', error);
    }
  }, [myWebcamStream, dispatch]);

  const handleToggleMic = useCallback(() => {
    dispatch(toggleMic());
  }, [dispatch]);

  const handleStartScreenShare = useCallback(async () => {
    try {
      // Implement screen sharing logic
      console.log('Starting screen share...');
    } catch (error) {
      console.error('Failed to start screen share:', error);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    // Clean up streams
    if (myWebcamStream) {
      myWebcamStream.getTracks().forEach(track => track.stop());
    }
    
    // Clean up all peer connections
    dispatch(disconnectUserForVideoCalling(user?.uid || 'unknown'));
    
    // Reset room state
    dispatch(setRoomJoined(false));
    setCurrentRoomId('');
    setPlayers([]);
    setNearbyPlayers([]);
  }, [myWebcamStream, dispatch, user?.uid]);

  const handleToggleProximity = useCallback(() => {
    setIsProximityEnabled(prev => !prev);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading SyncroSpace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to SyncroSpace
          </h1>
          <p className="text-gray-600 mb-8">
            Please sign in to join meetings and collaborate with your team.
          </p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Show character selection first
  if (showCharacterSelection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <CharacterSelection
          selectedCharacter={selectedCharacter}
          onCharacterSelect={handleCharacterSelect}
          onConfirm={handleConfirmCharacter}
        />
      </div>
    );
  }

  if (!roomJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <RoomDecider onJoinRoom={handleJoinRoom} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <ChatNotifications />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SyncroSpace Meeting</h1>
              <p className="text-gray-600">
                Room: {currentRoomId} {isPublicRoom && '(Public)'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">{players.length} participants</p>
              <p className="text-xs text-gray-500">
                {user.displayName || user.email}
              </p>
            </div>
          </div>
        </div>

        {/* Main Meeting Area */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Office Space */}
          <div className="lg:col-span-2 relative">
            <OfficeSpace
              players={players}
              currentPlayerId={user.uid}
              onPositionChange={handlePositionChange}
              onProximityChange={handleProximityChat}
            />
            
            {/* Proximity Chat Panel */}
            {nearbyPlayers.length > 0 && (
              <ProximityChatPanel
                nearbyPlayers={nearbyPlayers}
                isEnabled={isProximityEnabled}
                onToggle={handleToggleProximity}
              />
            )}

            {/* Floating Actions */}
            <FloatingActions
              isWebcamEnabled={isWebcamEnabled}
              isMicEnabled={isMicEnabled}
              onToggleWebcam={handleToggleWebcam}
              onToggleMic={handleToggleMic}
              onStartScreenShare={handleStartScreenShare}
              onDisconnect={handleDisconnect}
            />
            
            {/* Meeting Chat */}
            <MeetingChat
              currentUserId={user.uid}
              currentUsername={user.displayName || user.email?.split('@')[0] || 'You'}
              nearbyUserIds={nearbyPlayers.map(p => p.id)}
            />
            
            {/* Movement Controls */}
            <MovementControls
              currentUserId={user.uid}
              onPositionUpdate={handlePositionChange}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Video Preview */}
            {myWebcamStream && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-semibold mb-3">Your Video</h3>
                <video
                  ref={(video) => {
                    if (video && myWebcamStream) {
                      video.srcObject = myWebcamStream;
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-48 object-cover rounded-lg bg-gray-900"
                />
              </div>
            )}

            {/* Participants */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold mb-3">Participants ({players.length})</h3>
              <div className="space-y-2">
                {players.map(player => (
                  <div key={player.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {player.username[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {player.username}
                        {player.id === user.uid && ' (You)'}
                      </p>
                      <div className="flex gap-1 mt-1">
                        <div className={`w-2 h-2 rounded-full ${
                          player.isWebcamEnabled ? 'bg-green-400' : 'bg-red-400'
                        }`}></div>
                        <div className={`w-2 h-2 rounded-full ${
                          player.isMicEnabled ? 'bg-green-400' : 'bg-red-400'
                        }`}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Meeting Stats */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold mb-3">Meeting Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nearby Players:</span>
                  <span className="font-medium">{nearbyPlayers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Proximity Chat:</span>
                  <span className={`font-medium ${
                    isProximityEnabled ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isProximityEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Room Type:</span>
                  <span className="font-medium">
                    {isPublicRoom ? 'Public' : 'Private'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}