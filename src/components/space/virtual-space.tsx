
'use client';
import { useState, useEffect, useRef } from 'react';
import { Avatar } from './avatar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { Button } from '../ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, CircleDot, Dot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Avatar as UiAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '../ui/card';
import { cn } from '@/lib/utils';
import { doc, setDoc, onSnapshot, DocumentData, addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import officeMapData from '@/../map.json';
import { summarizeMeeting } from '@/ai/flows/summarize-meeting';
import { useRouter } from 'next/navigation';

const GRID_SIZE = 32;
const STEP = GRID_SIZE;

interface Participant {
    uid: string;
    name: string;
    photoURL?: string;
    phoneNumber?: string;
    status?: string;
    x?: number;
    y?: number;
}

const isPositionValid = (pos: { x: number; y: number }) => {
    // Center of the avatar
    const avatarCenterX = pos.x + GRID_SIZE / 2;
    const avatarCenterY = pos.y + GRID_SIZE / 2;

    const tileX = Math.floor(avatarCenterX / GRID_SIZE);
    const tileY = Math.floor(avatarCenterY / GRID_SIZE);

    for (const layer of officeMapData.layers) {
        // Use a dedicated collision layer, e.g., named 'Tile Layer 8'
        if (layer.type === 'tilelayer' && layer.name === 'Tile Layer 8') { 
            if (tileX < 0 || tileY < 0 || tileX >= layer.width || tileY >= layer.height) {
                return false;
            }
            const tileIndex = tileY * layer.width + tileX;
            if (tileIndex >= 0 && tileIndex < layer.data.length) {
                const tileGid = layer.data[tileIndex];
                if (tileGid !== 0) {
                    return false; // Collision detected
                }
            }
        }
    }
    return true; // No collision
};


function MapRenderer() {
    return (
        <div className="absolute inset-0 bg-gray-200/50" style={{ width: `${officeMapData.width * GRID_SIZE}px`, height: `${officeMapData.height * GRID_SIZE}px`}}>
            {officeMapData.layers.map((layer, layerIndex) => {
                if (layer.type !== 'tilelayer' || layer.name === 'Tile Layer 8' ) return null;
                return (
                    <div key={layerIndex} className="absolute inset-0" style={{ zIndex: layerIndex }}>
                        {Array.from({ length: layer.height }).map((_, y) => (
                            <div key={y} className="flex" style={{ height: `${GRID_SIZE}px` }}>
                                {Array.from({ length: layer.width }).map((__, x) => {
                                    const tileIndex = y * layer.width + x;
                                    const tileGid = layer.data[tileIndex];
                                    if (tileGid === 0) {
                                        return <div key={`${x}-${y}`} style={{ width: `${GRID_SIZE}px`, height: `${GRID_SIZE}px` }} />;
                                    }

                                    let tileset;
                                    for (let i = officeMapData.tilesets.length - 1; i >= 0; i--) {
                                        if (officeMapData.tilesets[i].firstgid <= tileGid) {
                                            tileset = officeMapData.tilesets[i];
                                            break;
                                        }
                                    }
                                    
                                    if (!tileset || !(tileset as any).source) {
                                        return <div key={`${x}-${y}`} style={{ width: `${GRID_SIZE}px`, height: `${GRID_SIZE}px` }} />;
                                    }
                                    
                                    const sourceFileName = (tileset as any).source.split('/').pop().replace('.tsx', '.png');
                                    const imageUrl = `/map/${sourceFileName}`;

                                    const localTileId = tileGid - tileset.firstgid;
                                    const tilesetWidth = 8; // Assuming 8 tiles wide for all tilesets.
                                    const tileX = localTileId % tilesetWidth;
                                    const tileY = Math.floor(localTileId / tilesetWidth);

                                    return (
                                        <div
                                            key={`${x}-${y}`}
                                            style={{
                                                width: `${GRID_SIZE}px`,
                                                height: `${GRID_SIZE}px`,
                                                backgroundImage: `url(${imageUrl})`,
                                                backgroundPosition: `-${tileX * GRID_SIZE}px -${tileY * GRID_SIZE}px`,
                                                backgroundRepeat: 'no-repeat',
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )
            })}
        </div>
    );
}

export function VirtualSpace({ participants: initialParticipants, spaceId }: { participants: Participant[], spaceId: string }) {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [position, setPosition] = useState({ x: GRID_SIZE * 10, y: GRID_SIZE * 10 });
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [liveParticipants, setLiveParticipants] = useState<Participant[]>(initialParticipants);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isTogetherMode, setIsTogetherMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    if (initialParticipants.length === 0) return;

    const unsubscribes = initialParticipants.map(p => {
        const userDocRef = doc(db, 'users', p.uid);
        return onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                const updatedParticipant = { uid: doc.id, ...doc.data() } as Participant;
                setLiveParticipants(prev => {
                    const index = prev.findIndex(part => part.uid === updatedParticipant.uid);
                    if (index > -1) {
                        const newParticipants = [...prev];
                        newParticipants[index] = { ...newParticipants[index], ...updatedParticipant};
                        return newParticipants;
                    }
                    return [...prev, updatedParticipant];
                });
            }
        });
    });

    return () => unsubscribes.forEach(unsub => unsub());

  }, [initialParticipants.map(p => p.uid).join(',')]); 


  useEffect(() => {
    let stream: MediaStream;
    const getCameraPermission = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this app.',
        });
      }
    };

    getCameraPermission();

    return () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    }
  }, [toast]);
  
  const updatePositionInDb = async (newPos: {x: number, y: number}) => {
    if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { x: newPos.x, y: newPos.y }, { merge: true });
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (isTogetherMode) return;
        if (!containerRef.current) return;
      
      const mapWidth = officeMapData.width * GRID_SIZE;
      const mapHeight = officeMapData.height * GRID_SIZE;
      const avatarSize = 48;

      setPosition((prev) => {
        let newPos = {...prev};
        switch (e.key) {
          case 'ArrowUp':
            newPos.y = Math.max(0, prev.y - STEP);
            break;
          case 'ArrowDown':
            newPos.y = Math.min(mapHeight - avatarSize, prev.y + STEP);
            break;
          case 'ArrowLeft':
            newPos.x = Math.max(0, prev.x - STEP);
            break;
          case 'ArrowRight':
            newPos.x = Math.min(mapWidth - avatarSize, prev.x + STEP);
            break;
          default:
            return prev;
        }
        
        if ((newPos.x !== prev.x || newPos.y !== prev.y) && isPositionValid(newPos)) {
            updatePositionInDb(newPos);
            return newPos;
        }
        
        return prev;
      });
    };
    
    const currentRef = containerRef.current;
    currentRef?.focus();
    currentRef?.addEventListener('keydown', handleKeyDown);
    return () => {
      currentRef?.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTogetherMode, user]);
  
  const startRecording = () => {
    if (!localStream) {
        toast({ variant: 'destructive', title: 'Media stream not available.' });
        return;
    }
    const audioChunks: Blob[] = [];
    mediaRecorderRef.current = new MediaRecorder(localStream);
    mediaRecorderRef.current.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };
    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        toast({ title: 'Recording stopped', description: 'Generating meeting summary...' });
        try {
            const result = await summarizeMeeting({ audioDataUri: base64Audio });
            const messagesCollection = collection(db, `spaces/${spaceId}/messages`);
            await addDoc(messagesCollection, {
                uid: 'ai-assistant',
                name: 'AI Assistant',
                isSummary: true,
                summary: result.summary,
                actionItems: result.actionItems,
                transcript: result.transcript,
                timestamp: serverTimestamp(),
            });
            toast({ title: 'Meeting Summary Ready', description: 'The summary has been posted to the chat.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Summarization Failed', description: error.message });
        }
      };
    };
    mediaRecorderRef.current.start();
    setIsRecording(true);
    toast({ title: 'Recording Started', description: 'The meeting is now being recorded.' });
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };
  
  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleToggleCamera = () => {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            setIsCameraOff(!videoTrack.enabled);
        }
    }
  }

  const handleToggleMic = () => {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setIsMicMuted(!audioTrack.enabled);
        }
    }
  };

  const handleLeave = () => {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    router.push('/dashboard');
  }
  
  const player = liveParticipants.find(p => p.uid === user?.uid);
  const otherParticipants = liveParticipants.filter(p => p.uid !== user?.uid);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-auto bg-background focus:outline-none"
      tabIndex={0}
    >
        <div className="relative">
            <MapRenderer />

            {isTogetherMode ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm p-8">
                    <h2 className="text-2xl font-bold mb-8">Together Mode</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {liveParticipants.map(p => (
                            <Card key={p.uid} className="overflow-hidden shadow-lg">
                                <CardContent className="p-0 aspect-video flex items-center justify-center bg-muted">
                                <UiAvatar className="h-24 w-24 border-4 border-background">
                                    <AvatarImage src={p.photoURL} alt={p.name} />
                                    <AvatarFallback>{p.name?.charAt(0).toUpperCase()}</AvatarFallback>
                                </UiAvatar>
                                </CardContent>
                                <div className="p-2 text-center text-sm font-medium bg-background/80">
                                    {p.name}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    {otherParticipants.map(p => (
                        p.phoneNumber ? (
                        <a key={p.uid} href={`tel:${p.phoneNumber}`}>
                            <Avatar x={p.x || 0} y={p.y || 0} name={p.name} status={p.status} src={p.photoURL} />
                        </a>
                        ) : (
                        <Avatar key={p.uid} x={p.x || 0} y={p.y || 0} name={p.name} status={p.status} src={p.photoURL} />
                        )
                    ))}
                    {player && (
                        <Avatar
                            x={player.x || position.x}
                            y={player.y || position.y}
                            name={player.name}
                            isPlayer
                            src={player.photoURL}
                            status={player.status}
                        />
                    )}
                </>
            )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-center">
            
            <div className={cn(
                "relative w-48 h-36 mb-4 transition-all duration-300",
                isTogetherMode && "w-0 h-0 opacity-0 mb-0"
            )}>
                <video 
                    ref={videoRef} 
                    className="w-full h-full rounded-md bg-background object-cover" 
                    autoPlay 
                    muted 
                />
                 {(isCameraOff || hasCameraPermission === false) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background rounded-md border">
                        <VideoOff className="h-8 w-8 text-muted-foreground" />
                        <span className="mt-2 text-sm text-muted-foreground">Camera is off</span>
                    </div>
                )}
            </div>

             { hasCameraPermission === false && (
                <Alert variant="destructive" className="max-w-md mb-4">
                    <AlertTitle>Camera Access Required</AlertTitle>
                    <AlertDescription>
                        Please allow camera and microphone access in your browser settings to join the meeting.
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex items-center gap-4 rounded-full bg-background/80 p-3 shadow-lg backdrop-blur-sm">
                <Button variant={isMicMuted ? "destructive" : "outline"} size="icon" className="rounded-full h-12 w-12" onClick={handleToggleMic}>
                    {isMicMuted ? <MicOff /> : <Mic />}
                </Button>
                <Button variant={isCameraOff ? "destructive" : "outline"} size="icon" className="rounded-full h-12 w-12" onClick={handleToggleCamera}>
                    {isCameraOff ? <VideoOff /> : <Video />}
                </Button>
                <Button variant={isTogetherMode ? "secondary" : "outline"} size="icon" className="rounded-full h-12 w-12" onClick={() => setIsTogetherMode(!isTogetherMode)}>
                    <Users />
                </Button>
                 <Button variant={isRecording ? "destructive" : "outline"} size="icon" className="rounded-full h-12 w-12" onClick={handleToggleRecording}>
                    {isRecording ? <Dot className="animate-pulse" /> : <CircleDot />}
                </Button>
                <Button variant="destructive" size="icon" className="rounded-full h-12 w-12" onClick={handleLeave}>
                    <PhoneOff />
                </Button>
            </div>
        </div>
    </div>
  );
}
