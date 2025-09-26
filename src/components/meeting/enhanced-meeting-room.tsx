'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  ScreenShare,
  ScreenShareOff,
  Users,
  MessageSquare,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import videoCalling from '@/lib/video-calling';
import { networkManager } from '@/lib/colyseus-network';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  stream?: MediaStream;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isLocal: boolean;
}

interface EnhancedMeetingRoomProps {
  meetingId: string;
  onLeave: () => void;
}

export function EnhancedMeetingRoom({ meetingId, onLeave }: EnhancedMeetingRoomProps) {
  const [user] = useAuthState(auth);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<{ [key: string]: HTMLVideoElement }>({});

  // Initialize video calling and multiplayer
  useEffect(() => {
    if (!user) return;

    const initializeCall = async () => {
      try {
        // Initialize multiplayer connection
        const success = await networkManager.joinPublicRoom({
          username: user.displayName || user.email?.split('@')[0] || 'Anonymous',
          avatar: user.photoURL || 'default',
          isMicOn: isAudioEnabled,
          isWebcamOn: isVideoEnabled
        });

        if (!success) {
          console.error('Failed to connect to multiplayer server');
        }

        // Initialize peer connection
        await videoCalling.initializePeer(user.uid);
        
        // Get user media
        const stream = await videoCalling.getUserMedia();
        if (stream && localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          setLocalStream(stream);
          
          // Add local participant
          setParticipants([{
            id: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'You',
            avatar: user.photoURL || undefined,
            stream,
            isVideoEnabled: true,
            isAudioEnabled: true,
            isLocal: true,
          }]);
        }

        // Set up event listeners
        videoCalling.on('streamReceived', ({ peerId, stream }: { peerId: string, stream: MediaStream }) => {
          setParticipants(prev => {
            const existing = prev.find(p => p.id === peerId);
            if (existing) {
              return prev.map(p => p.id === peerId ? { ...p, stream } : p);
            }
            return [...prev, {
              id: peerId,
              name: `User ${peerId.slice(0, 8)}`,
              stream,
              isVideoEnabled: true,
              isAudioEnabled: true,
              isLocal: false,
            }];
          });
        });

        videoCalling.on('callEnded', (peerId: string) => {
          setParticipants(prev => prev.filter(p => p.id !== peerId));
        });

      } catch (error) {
        console.error('Error initializing call:', error);
      }
    };

    initializeCall();

    return () => {
      videoCalling.cleanup();
      networkManager.disconnect();
    };
  }, [user]);

  const toggleVideo = () => {
    const newState = videoCalling.toggleVideo();
    setIsVideoEnabled(newState);
    
    // Update multiplayer state
    networkManager.updatePlayerStatus({
      isWebcamOn: newState
    });
  };

  const toggleAudio = () => {
    const newState = videoCalling.toggleAudio();
    setIsAudioEnabled(newState);
    
    // Update multiplayer state
    networkManager.updatePlayerStatus({
      isMicOn: newState
    });
  };

  const toggleScreenShare = async () => {
    if (!user) return;
    
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        
        if (screenShareRef.current) {
          screenShareRef.current.srcObject = screenStream;
        }
        
        setIsScreenSharing(true);
        
        // Notify other participants via multiplayer
        networkManager.startScreenShare();
        
        // Listen for screen share end
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
          setIsScreenSharing(false);
          networkManager.stopScreenShare();
          if (screenShareRef.current) {
            screenShareRef.current.srcObject = null;
          }
        });
      } catch (error) {
        console.error('Error starting screen share:', error);
      }
    } else {
      setIsScreenSharing(false);
      networkManager.stopScreenShare();
      if (screenShareRef.current?.srcObject) {
        const stream = screenShareRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        screenShareRef.current.srcObject = null;
      }
    }
  };

  const handleLeave = () => {
    videoCalling.cleanup();
    onLeave();
  };

  const getGridClass = () => {
    const count = participants.length;
    if (count <= 1) return 'grid-cols-1';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 9) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <h1 className="text-lg font-semibold">Meeting Room</h1>
          <Badge variant="secondary">{participants.length} participants</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={showChat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowChat(!showChat)}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant={showParticipants ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowParticipants(!showParticipants)}
          >
            <Users className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 p-4">
          {/* Screen Share */}
          {isScreenSharing && (
            <div className="mb-4 bg-black rounded-lg overflow-hidden">
              <video
                ref={screenShareRef}
                autoPlay
                playsInline
                className="w-full h-64 object-contain"
              />
              <div className="p-2 bg-gray-800 flex items-center justify-between">
                <span className="text-sm">Screen Share</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleScreenShare}
                >
                  <ScreenShareOff className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Participants Grid */}
          <div className={cn('grid gap-4 h-full', getGridClass())}>
            {participants.map((participant) => (
              <Card key={participant.id} className="bg-gray-800 border-gray-700 overflow-hidden">
                <div className="relative aspect-video bg-gray-900">
                  {participant.stream && participant.isVideoEnabled ? (
                    <video
                      ref={participant.isLocal ? localVideoRef : (el) => {
                        if (el && !participant.isLocal) {
                          el.srcObject = participant.stream!;
                          remoteVideosRef.current[participant.id] = el;
                        }
                      }}
                      autoPlay
                      playsInline
                      muted={participant.isLocal}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={participant.avatar} />
                        <AvatarFallback>
                          {participant.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  
                  {/* Participant Status */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    <div className="bg-black/60 rounded px-2 py-1 flex items-center gap-2">
                      <span className="text-sm font-medium">{participant.name}</span>
                      {participant.isLocal && <Badge variant="outline" className="text-xs">You</Badge>}
                    </div>
                    
                    <div className="flex gap-1">
                      {!participant.isAudioEnabled && (
                        <div className="bg-red-500 rounded p-1">
                          <MicOff className="h-3 w-3" />
                        </div>
                      )}
                      {!participant.isVideoEnabled && (
                        <div className="bg-red-500 rounded p-1">
                          <VideoOff className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold">Meeting Chat</h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <p className="text-gray-400 text-sm">Chat functionality coming soon...</p>
            </div>
          </div>
        )}

        {/* Participants Sidebar */}
        {showParticipants && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold">Participants ({participants.length})</h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={participant.avatar} />
                    <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{participant.name}</p>
                    {participant.isLocal && <p className="text-xs text-gray-400">You</p>}
                  </div>
                  <div className="flex gap-1">
                    {participant.isAudioEnabled ? (
                      <Mic className="h-4 w-4 text-green-500" />
                    ) : (
                      <MicOff className="h-4 w-4 text-red-500" />
                    )}
                    {participant.isVideoEnabled ? (
                      <Video className="h-4 w-4 text-green-500" />
                    ) : (
                      <VideoOff className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-center gap-4 p-4 bg-gray-800">
        <Button
          variant={isAudioEnabled ? 'outline' : 'destructive'}
          size="lg"
          onClick={toggleAudio}
          className="rounded-full"
        >
          {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>

        <Button
          variant={isVideoEnabled ? 'outline' : 'destructive'}
          size="lg"
          onClick={toggleVideo}
          className="rounded-full"
        >
          {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>

        <Button
          variant={isScreenSharing ? 'default' : 'outline'}
          size="lg"
          onClick={toggleScreenShare}
          className="rounded-full"
        >
          {isScreenSharing ? <ScreenShareOff className="h-5 w-5" /> : <ScreenShare className="h-5 w-5" />}
        </Button>

        <Button
          variant="destructive"
          size="lg"
          onClick={handleLeave}
          className="rounded-full"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}