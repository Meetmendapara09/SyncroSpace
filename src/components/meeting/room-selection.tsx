'use client';

import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { setRoomJoined, setIsLoading } from '@/lib/redux/features/room/roomSlice';
import { ArrowLeft, LockIcon, LoaderIcon, Users, Globe } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import videoCalling from '@/lib/video-calling';
import { setMyWebcamStream } from '@/lib/redux/features/webRtc/webcamSlice';

interface RoomDeciderProps {
  onJoinRoom: (roomId: string, isPublic: boolean) => void;
}

export function RoomDecider({ onJoinRoom }: RoomDeciderProps) {
  const [showPublicRoom, setShowPublicRoom] = useState(false);
  const [showCreateOrJoinCustomRoom, setShowCreateOrJoinCustomRoom] = useState(false);
  const isLoading = useAppSelector((state) => state.room.isLoading);

  if (showPublicRoom) {
    return (
      <PublicRoomJoin 
        onBack={() => setShowPublicRoom(false)}
        onJoinRoom={onJoinRoom}
      />
    );
  }

  if (showCreateOrJoinCustomRoom) {
    return (
      <CustomRoomOptions 
        onBack={() => setShowCreateOrJoinCustomRoom(false)}
        onJoinRoom={onJoinRoom}
      />
    );
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Connecting to SyncroSpace
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl text-center">
          Welcome to SyncroSpace
        </CardTitle>
        <CardDescription className="text-center">
          Choose how you'd like to connect with your team
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Button
          className="w-full cursor-pointer h-12 flex items-center gap-3"
          onClick={() => setShowPublicRoom(true)}
        >
          <Globe className="h-5 w-5" />
          Join Public Room
        </Button>
        <Button
          className="w-full cursor-pointer h-12 flex items-center gap-3"
          variant="outline"
          onClick={() => setShowCreateOrJoinCustomRoom(true)}
        >
          <Users className="h-5 w-5" />
          Create/Join Custom Room
        </Button>
      </CardContent>
    </Card>
  );
}

interface PublicRoomJoinProps {
  onBack: () => void;
  onJoinRoom: (roomId: string, isPublic: boolean) => void;
}

function PublicRoomJoin({ onBack, onJoinRoom }: PublicRoomJoinProps) {
  const [user] = useAuthState(auth);
  const [username, setUsername] = useState(user?.displayName || '');
  const isLoading = useAppSelector((state) => state.room.isLoading);
  const myWebcamStream = useAppSelector((state) => state.webcam.myWebcamStream);
  const dispatch = useAppDispatch();

  const handlePublicRoomJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    dispatch(setIsLoading(true));
    // Generate a public room ID
    const publicRoomId = `public-${Date.now()}`;
    onJoinRoom(publicRoomId, true);
  };

  const handleStartWebcam = async () => {
    try {
      const stream = await videoCalling.getUserMedia();
      if (stream) {
        dispatch(setMyWebcamStream(stream));
      }
    } catch (error) {
      console.error('Failed to start webcam:', error);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="relative text-2xl text-center">
          <ArrowLeft
            className="cursor-pointer text-gray-500 absolute left-0 top-1"
            onClick={onBack}
          />
          Join Public Room
        </CardTitle>
        <CardDescription className="text-center">
          Public rooms are for meeting new people and getting familiar with the platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-6 items-center">
        {myWebcamStream && (
          <div className="flex-shrink-0">
            <video
              ref={(video) => {
                if (video && myWebcamStream) {
                  video.srcObject = myWebcamStream;
                }
              }}
              autoPlay
              playsInline
              muted
              className="w-48 h-36 object-cover rounded-lg bg-gray-900"
            />
          </div>
        )}
        
        <div className="flex-1 space-y-4">
          <form className="grid gap-4" onSubmit={handlePublicRoomJoin}>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username..."
              />
            </div>
            
            <Button
              className="w-full cursor-pointer"
              type="submit"
              disabled={isLoading || !username.trim()}
            >
              {isLoading ? (
                <>
                  Joining Room <LoaderIcon className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                "Join Room"
              )}
            </Button>
          </form>
          
          {!myWebcamStream ? (
            <Button
              className="w-full cursor-pointer"
              variant="outline"
              onClick={handleStartWebcam}
            >
              Start Webcam
            </Button>
          ) : (
            <div className="flex gap-3 justify-center">
              <Button variant="outline" size="icon">
                📷
              </Button>
              <Button variant="outline" size="icon">
                🎤
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface CustomRoomOptionsProps {
  onBack: () => void;
  onJoinRoom: (roomId: string, isPublic: boolean) => void;
}

function CustomRoomOptions({ onBack, onJoinRoom }: CustomRoomOptionsProps) {
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const availableRooms = useAppSelector((state) => state.room.availableRooms);

  if (showCreateRoom) {
    return (
      <CreateCustomRoom 
        onBack={() => setShowCreateRoom(false)}
        onJoinRoom={onJoinRoom}
      />
    );
  }

  if (showJoinRoom) {
    return (
      <JoinCustomRoom 
        onBack={() => setShowJoinRoom(false)}
        onJoinRoom={onJoinRoom}
      />
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="relative text-2xl text-center">
          <ArrowLeft
            className="cursor-pointer text-gray-500 absolute left-0 top-1"
            onClick={onBack}
          />
          Custom Rooms
        </CardTitle>
        <CardDescription className="text-center">
          Create your own room or join an existing one
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Button
          className="w-full cursor-pointer h-12"
          onClick={() => setShowCreateRoom(true)}
        >
          Create New Room
        </Button>
        
        <Button
          className="w-full cursor-pointer h-12"
          variant="outline"
          onClick={() => setShowJoinRoom(true)}
        >
          Join Existing Room
        </Button>

        {availableRooms.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Available Rooms:</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {availableRooms.map((room) => (
                <div
                  key={room.roomId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{room.roomName}</p>
                    <p className="text-sm text-gray-600">{room.roomId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {room.hasPassword && <LockIcon className="h-4 w-4 text-gray-400" />}
                    <Button
                      size="sm"
                      onClick={() => onJoinRoom(room.roomId, false)}
                    >
                      Join
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simplified placeholder components
function CreateCustomRoom({ onBack, onJoinRoom }: { onBack: () => void; onJoinRoom: (roomId: string, isPublic: boolean) => void }) {
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const roomId = `custom-${roomName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
    onJoinRoom(roomId, false);
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="relative text-2xl text-center">
          <ArrowLeft className="cursor-pointer text-gray-500 absolute left-0 top-1" onClick={onBack} />
          Create Room
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleCreate}>
          <div>
            <Label htmlFor="roomName">Room Name</Label>
            <Input
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter room name..."
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password (Optional)</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty for no password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={!roomName.trim()}>
            Create Room
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function JoinCustomRoom({ onBack, onJoinRoom }: { onBack: () => void; onJoinRoom: (roomId: string, isPublic: boolean) => void }) {
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    onJoinRoom(roomId, false);
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="relative text-2xl text-center">
          <ArrowLeft className="cursor-pointer text-gray-500 absolute left-0 top-1" onClick={onBack} />
          Join Room
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleJoin}>
          <div>
            <Label htmlFor="roomId">Room ID</Label>
            <Input
              id="roomId"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID..."
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password if required..."
            />
          </div>
          <Button type="submit" className="w-full" disabled={!roomId.trim()}>
            Join Room
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}