'use client';

import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Video,
  VideoOff, 
  Mic,
  MicOff,
  Users,
  Clock,
  Calendar,
  Plus,
  Settings,
  PhoneCall
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedMeetingRoom } from './enhanced-meeting-room';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import videoCalling from '@/lib/video-calling';

interface MeetingPreview {
  stream: MediaStream | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

export function MeetingLobby() {
  const [user] = useAuthState(auth);
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [currentMeetingId, setCurrentMeetingId] = useState('');
  const [joinMeetingId, setJoinMeetingId] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [preview, setPreview] = useState<MeetingPreview>({
    stream: null,
    isVideoEnabled: true,
    isAudioEnabled: true,
  });
  const [isPreviewReady, setIsPreviewReady] = useState(false);

  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Initialize preview
  React.useEffect(() => {
    const initializePreview = async () => {
      try {
        if (!user) return;
        
        await videoCalling.initializePeer(user.uid);
        const stream = await videoCalling.getUserMedia();
        
        if (stream) {
          setPreview(prev => ({ ...prev, stream }));
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setIsPreviewReady(true);
        }
      } catch (error) {
        console.error('Error initializing preview:', error);
      }
    };

    initializePreview();

    return () => {
      if (preview.stream) {
        preview.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [user]);

  const togglePreviewVideo = () => {
    if (preview.stream) {
      const videoTrack = preview.stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setPreview(prev => ({ ...prev, isVideoEnabled: videoTrack.enabled }));
      }
    }
  };

  const togglePreviewAudio = () => {
    if (preview.stream) {
      const audioTrack = preview.stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setPreview(prev => ({ ...prev, isAudioEnabled: audioTrack.enabled }));
      }
    }
  };

  const createMeeting = () => {
    const meetingId = `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setCurrentMeetingId(meetingId);
    setIsInMeeting(true);
  };

  const joinMeeting = () => {
    if (joinMeetingId.trim()) {
      setCurrentMeetingId(joinMeetingId.trim());
      setIsInMeeting(true);
    }
  };

  const leaveMeeting = () => {
    setIsInMeeting(false);
    setCurrentMeetingId('');
  };

  if (isInMeeting) {
    return (
      <EnhancedMeetingRoom
        meetingId={currentMeetingId}
        onLeave={leaveMeeting}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">SyncroSpace Meetings</h1>
          <p className="text-gray-600">Connect, collaborate, and communicate seamlessly</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Preview Section */}
          <Card className="lg:sticky lg:top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Camera Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video mb-4">
                {preview.stream && preview.isVideoEnabled ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-white">
                      <VideoOff className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>Camera is off</p>
                    </div>
                  </div>
                )}
                
                {/* Preview Controls Overlay */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  <Button
                    size="sm"
                    variant={preview.isVideoEnabled ? 'secondary' : 'destructive'}
                    onClick={togglePreviewVideo}
                    className="rounded-full"
                  >
                    {preview.isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant={preview.isAudioEnabled ? 'secondary' : 'destructive'}
                    onClick={togglePreviewAudio}
                    className="rounded-full"
                  >
                    {preview.isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Status Indicator */}
                <div className="absolute top-4 right-4">
                  <Badge variant={isPreviewReady ? 'default' : 'secondary'}>
                    {isPreviewReady ? 'Ready' : 'Connecting...'}
                  </Badge>
                </div>
              </div>

              {user && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="font-semibold text-blue-600">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{user.displayName || 'User'}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meeting Actions */}
          <div className="space-y-6">
            {/* Create Meeting */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Start New Meeting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="meeting-title">Meeting Title (Optional)</Label>
                  <Input
                    id="meeting-title"
                    placeholder="Enter meeting title..."
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                  />
                </div>
                
                <Button 
                  onClick={createMeeting} 
                  className="w-full" 
                  size="lg"
                  disabled={!isPreviewReady}
                >
                  <PhoneCall className="h-5 w-5 mr-2" />
                  Start Meeting
                </Button>
              </CardContent>
            </Card>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-sm text-gray-500">
                OR
              </span>
            </div>

            {/* Join Meeting */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Join Existing Meeting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="meeting-id">Meeting ID</Label>
                  <Input
                    id="meeting-id"
                    placeholder="Enter meeting ID..."
                    value={joinMeetingId}
                    onChange={(e) => setJoinMeetingId(e.target.value)}
                  />
                </div>
                
                <Button 
                  onClick={joinMeeting} 
                  className="w-full" 
                  size="lg"
                  variant="outline"
                  disabled={!joinMeetingId.trim() || !isPreviewReady}
                >
                  <Users className="h-5 w-5 mr-2" />
                  Join Meeting
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <Clock className="h-6 w-6" />
                    <span className="text-sm">Schedule Meeting</span>
                  </Button>
                  
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <Settings className="h-6 w-6" />
                    <span className="text-sm">Meeting Settings</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900">Meeting Features</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    High-quality video and audio
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Screen sharing capability
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Real-time chat messaging
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Participant management
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}