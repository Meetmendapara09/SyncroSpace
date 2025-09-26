'use client';

import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { networkManager } from '@/lib/colyseus-network';
import { useAppSelector } from '@/lib/redux/hooks';
import { MeetingChat } from './meeting/meeting-chat';
import { OfficeSpace } from './meeting/office-space';
import videoCalling from '@/lib/video-calling';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  MessageSquare,
  Phone,
  PhoneOff,
  ScreenShare,
  Settings 
} from 'lucide-react';

interface ConnectedUser {
  id: string;
  username: string;
  position: { x: number; y: number };
  avatar?: string;
  isMicOn?: boolean;
  isWebcamOn?: boolean;
  status?: 'online' | 'away' | 'busy' | 'offline';
}

export default function IntegratedMeetingSpace() {
  const [user, loading] = useAuthState(auth);
  const [connected, setConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [nearbyUsers, setNearbyUsers] = useState<string[]>([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Redux state
  const playerPosition = useAppSelector((state) => state.room.playerPosition);
  const currentOffice = useAppSelector((state) => state.room.currentOffice);
  const messages = useAppSelector((state) => state.chat.messages);

  // Initialize connections when user is available
  useEffect(() => {
    if (!user || loading) return;

    const initializeConnections = async () => {
      setConnectionStatus('connecting');
      
      try {
        // Initialize video calling
        await videoCalling.initializePeer(user.uid);
        const stream = await videoCalling.getUserMedia();
        
        if (stream) {
          setIsVideoEnabled(true);
          setIsAudioEnabled(true);
        }

        // Connect to multiplayer server
        const success = await networkManager.joinPublicRoom({
          username: user.displayName || user.email?.split('@')[0] || 'Anonymous',
          avatar: user.photoURL || 'default',
          isMicOn: true,
          isWebcamOn: true,
          userId: user.uid
        });

        if (success) {
          setConnected(true);
          setConnectionStatus('connected');
          console.log('✅ All systems connected successfully!');
        } else {
          setConnectionStatus('disconnected');
          console.error('❌ Failed to connect to multiplayer server');
        }
      } catch (error) {
        setConnectionStatus('disconnected');
        console.error('❌ Error during initialization:', error);
      }
    };

    initializeConnections();

    return () => {
      // Cleanup on unmount
      videoCalling.cleanup();
      networkManager.disconnect();
    };
  }, [user, loading]);

  // Monitor nearby users for proximity features
  useEffect(() => {
    if (!connected || connectedUsers.length === 0) return;

    const currentUser = connectedUsers.find(u => u.id === user?.uid);
    if (!currentUser) return;

    const proximityThreshold = 150; // pixels
    const nearby = connectedUsers
      .filter(u => u.id !== user?.uid)
      .filter(u => {
        const distance = Math.sqrt(
          Math.pow(u.position.x - currentUser.position.x, 2) +
          Math.pow(u.position.y - currentUser.position.y, 2)
        );
        return distance <= proximityThreshold;
      })
      .map(u => u.id);

    setNearbyUsers(nearby);
  }, [connectedUsers, user?.uid, connected]);

  const handlePositionChange = (position: { x: number; y: number }) => {
    // Position updates are handled by the OfficeSpace component
    // and automatically sync with multiplayer via networkManager
  };

  const handleProximityChange = (nearbyPlayers: ConnectedUser[]) => {
    setNearbyUsers(nearbyPlayers.map(p => p.id));
  };

  const toggleVideo = () => {
    const newState = videoCalling.toggleVideo();
    setIsVideoEnabled(newState);
    
    if (user) {
      networkManager.updatePlayerStatus({
        isWebcamOn: newState
      });
    }
  };

  const toggleAudio = () => {
    const newState = videoCalling.toggleAudio();
    setIsAudioEnabled(newState);
    
    if (user) {
      networkManager.updatePlayerStatus({
        isMicOn: newState
      });
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        
        setIsScreenSharing(true);
        networkManager.startScreenShare();
        
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
          setIsScreenSharing(false);
          networkManager.stopScreenShare();
        });
      } else {
        setIsScreenSharing(false);
        networkManager.stopScreenShare();
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  };

  const startProximityVideoCall = () => {
    if (nearbyUsers.length > 0) {
      networkManager.connectToProximityVideoCall(nearbyUsers);
      nearbyUsers.forEach(userId => {
        videoCalling.shareWebcam(userId);
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600 mb-4">
              Please sign in to access the integrated meeting space.
            </p>
            <Button 
              onClick={() => window.location.href = '/login'} 
              className="w-full"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header with connection status and controls */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">SyncroSpace Meeting Room</h1>
              <Badge 
                variant={connectionStatus === 'connected' ? 'default' : connectionStatus === 'connecting' ? 'secondary' : 'destructive'}
                className="px-3 py-1"
              >
                {connectionStatus === 'connected' && '🟢 Connected'}
                {connectionStatus === 'connecting' && '🟡 Connecting...'}
                {connectionStatus === 'disconnected' && '🔴 Disconnected'}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="px-3 py-1">
                <Users className="h-4 w-4 mr-1" />
                {connectedUsers.length} online
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                <MessageSquare className="h-4 w-4 mr-1" />
                {messages.length} messages
              </Badge>
              {currentOffice && (
                <Badge variant="secondary" className="px-3 py-1">
                  📍 {currentOffice}
                </Badge>
              )}
            </div>
          </div>

          {/* Media controls */}
          <div className="flex items-center space-x-2 mt-4">
            <Button
              variant={isAudioEnabled ? "default" : "destructive"}
              size="sm"
              onClick={toggleAudio}
              className="flex items-center space-x-1"
            >
              {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              <span>{isAudioEnabled ? 'Mute' : 'Unmute'}</span>
            </Button>
            
            <Button
              variant={isVideoEnabled ? "default" : "destructive"}
              size="sm"
              onClick={toggleVideo}
              className="flex items-center space-x-1"
            >
              {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              <span>{isVideoEnabled ? 'Stop Video' : 'Start Video'}</span>
            </Button>
            
            <Button
              variant={isScreenSharing ? "secondary" : "outline"}
              size="sm"
              onClick={toggleScreenShare}
              className="flex items-center space-x-1"
            >
              <ScreenShare className="h-4 w-4" />
              <span>{isScreenSharing ? 'Stop Sharing' : 'Share Screen'}</span>
            </Button>

            {nearbyUsers.length > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={startProximityVideoCall}
                className="flex items-center space-x-1"
              >
                <Phone className="h-4 w-4" />
                <span>Call Nearby ({nearbyUsers.length})</span>
              </Button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main office space */}
          <div className="lg:col-span-3">
            <OfficeSpace
              players={connectedUsers}
              currentPlayerId={user.uid}
              onPositionChange={handlePositionChange}
              onProximityChange={handleProximityChange}
            />
          </div>

          {/* Sidebar with chat */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Meeting Participants</h3>
              <div className="space-y-2 mb-6">
                {connectedUsers.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {participant.username[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{participant.username}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {participant.isMicOn ? (
                        <Mic className="h-3 w-3 text-green-500" />
                      ) : (
                        <MicOff className="h-3 w-3 text-red-500" />
                      )}
                      {participant.isWebcamOn ? (
                        <Video className="h-3 w-3 text-green-500" />
                      ) : (
                        <VideoOff className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chat component */}
        <MeetingChat
          currentUserId={user.uid}
          currentUsername={user.displayName || user.email?.split('@')[0] || 'Anonymous'}
          nearbyUserIds={nearbyUsers}
        />
      </div>
    </div>
  );
}