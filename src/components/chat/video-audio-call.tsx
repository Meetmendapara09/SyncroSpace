'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, rtdb } from '@/lib/firebase';
import {
  doc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { ref, push, set, onValue, remove } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneCall,
  PhoneOff,
  MonitorSmartphone,
  MonitorUp,
  Users,
  UserPlus,
  Pin,
  MessageSquare,
  Settings,
  MoreVertical,
  Phone,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Share2,
  Hand,
  ScreenShare,
  LayoutGrid,
  CirclePlus,
  Clock,
  X,
  UserRoundPlus,
  Link as LinkIcon,
  Copy,
  Check
} from 'lucide-react';
import {
  createRoom,
  joinRoom,
  hangUp,
  startLocalMedia,
  RoomHandles
} from '@/lib/webrtc';
import { toast } from '@/hooks/use-toast';

// Interface definitions
interface CallParticipant {
  uid: string;
  name: string;
  avatar?: string;
  stream?: MediaStream;
  audio: boolean;
  video: boolean;
  screenShare: boolean;
  speaking: boolean;
  handRaised: boolean;
  isPinned?: boolean;
  isLocal: boolean;
}

interface CallState {
  id: string;
  createdBy: string;
  createdAt: Date | any;
  title?: string;
  status: 'connecting' | 'ongoing' | 'ended';
  participants: CallParticipant[];
  spaceId?: string;
  channelId?: string;
}

// WebRTC video/audio call component
export function VideoAudioCall({
  callId,
  spaceId,
  channelId,
  onClose
}: {
  callId: string;
  spaceId?: string;
  channelId?: string;
  onClose: () => void;
}) {
  const [user] = useAuthState(auth);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [callState, setCallState] = useState<CallState | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [layout, setLayout] = useState<'grid' | 'spotlight'>('grid');
  const [pinnedParticipant, setPinnedParticipant] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [roomHandles, setRoomHandles] = useState<RoomHandles | null>(null);
  
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null) as React.MutableRefObject<HTMLVideoElement | null>;
  const participantVideosRef = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const speakingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize call
  useEffect(() => {
    if (!user || !callId) return;
    
    const initializeCall = async () => {
      try {
        setLoading(true);
        
        // Check if call exists
        const callRef = doc(db, 'calls', callId);
        const callSnapshot = await getDoc(callRef);
        
        if (!callSnapshot.exists()) {
          // Create new call
          await updateDoc(callRef, {
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            status: 'ongoing',
            participants: [{
              uid: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'User',
              avatar: user.photoURL || undefined,
              audio: true,
              video: true,
              screenShare: false,
              speaking: false,
              handRaised: false,
              isLocal: true
            }],
            ...(spaceId && { spaceId }),
            ...(channelId && { channelId }),
          });
        } else {
          // Join existing call
          const callData = callSnapshot.data();
          
          if (callData.status === 'ended') {
            setError('This call has ended');
            setLoading(false);
            return;
          }
          
          // Add participant to call
          await updateDoc(callRef, {
            participants: [...(callData.participants || []), {
              uid: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'User',
              avatar: user.photoURL || undefined,
              audio: true,
              video: true,
              screenShare: false,
              speaking: false,
              handRaised: false,
              isLocal: true
            }]
          });
          
          // Send join notification
          if (channelId) {
            const messagesRef = ref(rtdb, `spaces/${channelId}/messages`);
            const newMsgRef = push(messagesRef);
            
            await set(newMsgRef, {
              uid: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'User',
              avatar: user.photoURL || null,
              message: `joined the call`,
              type: 'call-update',
              callId: callId,
              action: 'join',
              timestamp: Date.now(),
              readBy: [user.uid],
            });
          }
        }
        
        // Set up WebRTC
        await setupLocalMedia();
        
        // Listen for call updates
        const unsubscribeCallListener = onSnapshot(callRef, (snapshot) => {
          if (!snapshot.exists()) {
            onClose();
            return;
          }
          
          const data = snapshot.data();
          setCallState({
            id: snapshot.id,
            ...data,
            participants: data.participants || [],
          } as CallState);
          
          // Update local participant states
          const localParticipant = data.participants?.find((p: CallParticipant) => p.uid === user.uid);
          if (localParticipant) {
            setAudioEnabled(localParticipant.audio);
            setVideoEnabled(localParticipant.video);
            setScreenShareEnabled(localParticipant.screenShare);
            setHandRaised(localParticipant.handRaised);
          }
        });
        
        // Listen for chat messages if in a channel
        let unsubscribeChat: (() => void) | undefined;
        if (channelId) {
          const chatRef = ref(rtdb, `spaces/${channelId}/messages`);
          unsubscribeChat = onValue(chatRef, (snapshot) => {
            if (!snapshot.exists()) return;
            
            const data = snapshot.val();
            const messages = Object.entries(data || {})
              .map(([id, msg]) => ({ id, ...(msg as any) }))
              .filter(msg => 
                (msg.type === 'text' || msg.type === 'call-update') && 
                new Date(msg.timestamp).getTime() > Date.now() - 3600000 // Last hour only
              )
              .sort((a, b) => a.timestamp - b.timestamp);
            
            setChatMessages(messages);
          });
        }
        
        // Set up WebRTC connections
        if (callSnapshot.exists()) {
          await setupWebRTC(callId);
        } else {
          // Create WebRTC room
          const stream = await startLocalMedia({ video: true, audio: true });
          const handles = await createRoom(spaceId || 'global', callId, stream);
          setRoomHandles(handles);
          
          if (localVideoRef.current && stream) {
            localVideoRef.current.srcObject = stream;
          }
        }
        
        setLoading(false);
        
        // Clean up when component unmounts
        return () => {
          unsubscribeCallListener();
          if (unsubscribeChat) unsubscribeChat();
          cleanupCall();
        };
      } catch (err) {
        console.error('Error initializing call:', err);
        setError(`Failed to initialize call: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };
    
    initializeCall();
    
    // Set up full screen handler
    const handleFullScreenChange = () => {
      setFullScreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, [user, callId, spaceId, channelId]);
  
  // Set up WebRTC
  const setupWebRTC = async (callId: string) => {
    try {
      // Start local media
      const stream = await startLocalMedia({ video: true, audio: true });
      setLocalStream(stream);
      
      // Join the WebRTC room
      const handles = await joinRoom(spaceId || 'global', callId, stream);
      setRoomHandles(handles);
      
      // Set local video
      if (localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Monitor speaking for local participant
      setupAudioAnalyser(stream);
    } catch (err) {
      console.error('Error setting up WebRTC:', err);
      setError(`Failed to set up call: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  // Set up local media
  const setupLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Set up audio analyzer to detect when speaking
      setupAudioAnalyser(stream);
      
      return stream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError(`Failed to access camera/microphone: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return null;
    }
  };
  
  // Set up audio analyzer to detect when speaking
  const setupAudioAnalyser = (stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      const audioSource = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      audioSource.connect(analyser);
      
      audioContextRef.current = audioContext;
      audioAnalyserRef.current = analyser;
      
      // Start monitoring audio levels
      detectSpeaking();
    } catch (err) {
      console.error('Error setting up audio analyzer:', err);
    }
  };
  
  // Detect if the user is speaking
  const detectSpeaking = () => {
    if (!audioAnalyserRef.current) return;
    
    const analyser = audioAnalyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      
      // Threshold for speaking
      const isSpeakingNow = average > 15;
      
      if (isSpeakingNow !== isSpeaking) {
        // Debounce speaking state
        if (speakingTimerRef.current) {
          clearTimeout(speakingTimerRef.current);
        }
        
        speakingTimerRef.current = setTimeout(() => {
          setIsSpeaking(isSpeakingNow);
          
          // Update speaking status in the call state
          if (user && callState) {
            const callRef = doc(db, 'calls', callState.id);
            updateDoc(callRef, {
              participants: callState.participants.map(p => 
                p.uid === user.uid 
                  ? { ...p, speaking: isSpeakingNow } 
                  : p
              )
            }).catch(err => console.error('Error updating speaking status:', err));
          }
        }, 300);
      }
      
      // Continue monitoring
      requestAnimationFrame(checkAudioLevel);
    };
    
    // Start checking
    checkAudioLevel();
  };
  
  // Toggle audio
  const toggleAudio = async () => {
    if (!localStream || !user || !callState) return;
    
    const newState = !audioEnabled;
    
    // Update local stream tracks
    localStream.getAudioTracks().forEach(track => {
      track.enabled = newState;
    });
    
    setAudioEnabled(newState);
    
    // Update in Firestore
    const callRef = doc(db, 'calls', callState.id);
    await updateDoc(callRef, {
      participants: callState.participants.map(p => 
        p.uid === user.uid ? { ...p, audio: newState } : p
      )
    });
  };
  
  // Toggle video
  const toggleVideo = async () => {
    if (!localStream || !user || !callState) return;
    
    const newState = !videoEnabled;
    
    // Update local stream tracks
    localStream.getVideoTracks().forEach(track => {
      track.enabled = newState;
    });
    
    setVideoEnabled(newState);
    
    // Update in Firestore
    const callRef = doc(db, 'calls', callState.id);
    await updateDoc(callRef, {
      participants: callState.participants.map(p => 
        p.uid === user.uid ? { ...p, video: newState } : p
      )
    });
  };
  
  // Toggle screen sharing
  const toggleScreenShare = async () => {
    if (!user || !callState) return;
    
    try {
      if (screenShareEnabled) {
        // Stop screen sharing
        if (screenShareStream) {
          screenShareStream.getTracks().forEach(track => track.stop());
          setScreenShareStream(null);
        }
        
        setScreenShareEnabled(false);
        
        // Update in Firestore
        const callRef = doc(db, 'calls', callState.id);
        await updateDoc(callRef, {
          participants: callState.participants.map(p => 
            p.uid === user.uid ? { ...p, screenShare: false } : p
          )
        });
      } else {
        // Start screen sharing
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        setScreenShareStream(stream);
        
        if (screenShareRef.current) {
          screenShareRef.current.srcObject = stream;
        }
        
        setScreenShareEnabled(true);
        
        // Update in Firestore
        const callRef = doc(db, 'calls', callState.id);
        await updateDoc(callRef, {
          participants: callState.participants.map(p => 
            p.uid === user.uid ? { ...p, screenShare: true } : p
          )
        });
        
        // Handle when user stops sharing via browser UI
        stream.getVideoTracks()[0].addEventListener('ended', async () => {
          setScreenShareEnabled(false);
          setScreenShareStream(null);
          
          // Update in Firestore
          const callRef = doc(db, 'calls', callState.id);
          await updateDoc(callRef, {
            participants: callState.participants.map(p => 
              p.uid === user.uid ? { ...p, screenShare: false } : p
            )
          });
        });
      }
    } catch (err) {
      console.error('Error toggling screen share:', err);
      toast({
        title: "Screen Share Failed",
        description: err instanceof Error ? err.message : 'Failed to share screen',
        variant: "destructive",
      });
    }
  };
  
  // Toggle raised hand
  const toggleRaisedHand = async () => {
    if (!user || !callState) return;
    
    const newState = !handRaised;
    setHandRaised(newState);
    
    // Update in Firestore
    const callRef = doc(db, 'calls', callState.id);
    await updateDoc(callRef, {
      participants: callState.participants.map(p => 
        p.uid === user.uid ? { ...p, handRaised: newState } : p
      )
    });
    
    // Send message to channel
    if (channelId) {
      const messagesRef = ref(rtdb, `spaces/${channelId}/messages`);
      const newMsgRef = push(messagesRef);
      
      await set(newMsgRef, {
        uid: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'User',
        avatar: user.photoURL || null,
        message: newState ? 'raised their hand' : 'lowered their hand',
        type: 'call-update',
        callId: callState.id,
        action: newState ? 'raise-hand' : 'lower-hand',
        timestamp: Date.now(),
        readBy: [user.uid],
      });
    }
  };
  
  // Toggle participant pin
  const togglePinParticipant = async (participantId: string) => {
    if (pinnedParticipant === participantId) {
      setPinnedParticipant(null);
      setLayout('grid');
    } else {
      setPinnedParticipant(participantId);
      setLayout('spotlight');
    }
  };
  
  // Send chat message
  const sendChatMessage = async () => {
    if (!messageInput.trim() || !user || !channelId) return;
    
    try {
      const messagesRef = ref(rtdb, `spaces/${channelId}/messages`);
      const newMsgRef = push(messagesRef);
      
      await set(newMsgRef, {
        uid: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'User',
        avatar: user.photoURL || null,
        message: messageInput.trim(),
        type: 'text',
        callId: callId, // Tag message with callId
        timestamp: Date.now(),
        readBy: [user.uid],
      });
      
      setMessageInput('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };
  
  // Leave call
  const leaveCall = async () => {
    if (!user || !callState) return;
    
    try {
      // Remove participant from call
      const callRef = doc(db, 'calls', callState.id);
      const updatedParticipants = callState.participants.filter(
        p => p.uid !== user.uid
      );
      
      if (updatedParticipants.length === 0) {
        // Last person to leave - end the call
        await updateDoc(callRef, {
          status: 'ended',
          endedAt: serverTimestamp(),
          participants: []
        });
      } else {
        // Update participants list
        await updateDoc(callRef, {
          participants: updatedParticipants
        });
      }
      
      // Send leave notification
      if (channelId) {
        const messagesRef = ref(rtdb, `spaces/${channelId}/messages`);
        const newMsgRef = push(messagesRef);
        
        await set(newMsgRef, {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'User',
          avatar: user.photoURL || null,
          message: `left the call`,
          type: 'call-update',
          callId: callId,
          action: 'leave',
          timestamp: Date.now(),
          readBy: [user.uid],
        });
      }
      
      // Clean up WebRTC
      cleanupCall();
      
      // Close dialog
      onClose();
    } catch (err) {
      console.error('Error leaving call:', err);
    }
  };
  
  // Invite users to call
  const inviteToCall = async (userId: string) => {
    if (!user || !callState) return;
    
    try {
      // Send notification to user
      const notificationRef = collection(db, 'notifications');
      await addDoc(notificationRef, {
        type: 'call-invite',
        callId: callState.id,
        callTitle: callState.title,
        from: {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'User',
          avatar: user.photoURL || null
        },
        to: userId,
        createdAt: serverTimestamp(),
        read: false,
        ...(spaceId && { spaceId }),
        ...(channelId && { channelId }),
      });
      
      toast({
        title: "Invitation sent",
        description: "User has been invited to join the call",
      });
    } catch (err) {
      console.error('Error inviting user:', err);
    }
  };
  
  // Toggle fullscreen
  const toggleFullScreen = () => {
    if (!videoContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(err => {
        console.error('Error attempting to enable full-screen mode:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };
  
  // Cleanup call resources
  const cleanupCall = () => {
    // Stop local media tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Stop screen share
    if (screenShareStream) {
      screenShareStream.getTracks().forEach(track => track.stop());
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    // Clean up timers
    if (speakingTimerRef.current) {
      clearTimeout(speakingTimerRef.current);
    }
    
    // Clean up WebRTC
    if (roomHandles) {
      hangUp(roomHandles);
    }
  };
  
  // Copy invite link
  const copyInviteLink = () => {
    const url = `${window.location.origin}/join-call/${callId}`;
    navigator.clipboard.writeText(url);
    
    toast({
      title: "Link copied",
      description: "Invitation link copied to clipboard",
    });
  };
  
  // Calculate video layout
  const getVideoLayoutClass = () => {
    if (!callState || !callState.participants) return "grid-cols-1";
    
    const totalParticipants = callState.participants.length;
    const hasScreenShare = callState.participants.some(p => p.screenShare);
    
    if (layout === 'spotlight' || hasScreenShare || pinnedParticipant) {
      return "grid-cols-1";
    }
    
    if (totalParticipants <= 1) return "grid-cols-1";
    if (totalParticipants <= 2) return "grid-cols-1 md:grid-cols-2";
    if (totalParticipants <= 4) return "grid-cols-2";
    if (totalParticipants <= 6) return "grid-cols-2 md:grid-cols-3";
    return "grid-cols-3 md:grid-cols-4";
  };
  
  // Render participant video
  const renderParticipantVideo = (participant: CallParticipant) => {
    const isLocal = participant.uid === user?.uid;
    const isPinned = pinnedParticipant === participant.uid;
    const isScreenSharing = participant.screenShare;
    
    return (
      <div 
        key={participant.uid}
        className={cn(
          "relative overflow-hidden rounded-lg bg-slate-900",
          isPinned || isScreenSharing ? "col-span-full row-span-full" : "",
          isPinned ? "ring-2 ring-primary" : ""
        )}
      >
        <video
          ref={el => {
            if (isLocal) {
              if (localVideoRef && 'current' in localVideoRef) {
                (localVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
              }
            } else {
              if (participantVideosRef.current) {
                participantVideosRef.current[participant.uid] = el;
              }
            }
          }}
          autoPlay
          playsInline
          muted={isLocal}
          className={cn(
            "h-full w-full object-cover",
            !participant.video && "hidden"
          )}
        />
        
        {!participant.video && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
            <Avatar className="h-20 w-20">
              <AvatarImage src={participant.avatar} />
              <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        )}
        
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 rounded-md bg-black/60 px-3 py-1 text-white">
          <div className="flex items-center gap-2">
            {participant.speaking && (
              <div className="h-2 w-2 rounded-full bg-green-500" />
            )}
            
            <span className="truncate text-sm font-medium">
              {participant.name} {isLocal && "(You)"}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5">
            {participant.handRaised && (
              <Hand className="h-4 w-4 text-yellow-400" />
            )}
            {!participant.audio && (
              <MicOff className="h-4 w-4 text-red-400" />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-slate-700"
              onClick={() => togglePinParticipant(participant.uid)}
            >
              <Pin className="h-3 w-3" />
              <span className="sr-only">
                {isPinned ? "Unpin" : "Pin"} {participant.name}
              </span>
            </Button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render screen share
  const renderScreenShare = () => {
    const screenSharer = callState?.participants.find(p => p.screenShare);
    
    if (!screenSharer) return null;
    
    return (
      <div className="col-span-full row-span-2 relative overflow-hidden rounded-lg bg-slate-900">
        <video
          ref={el => {
            if (screenSharer.uid === user?.uid && screenShareRef.current) {
              screenShareRef.current.srcObject = el?.srcObject || null;
            }
          }}
          autoPlay
          playsInline
          className="h-full w-full object-contain"
        />
        
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-md bg-black/60 px-3 py-1 text-white">
          <div className="flex items-center gap-2">
            <ScreenShare className="h-4 w-4 text-blue-400" />
            <span className="text-sm">{screenSharer.name}'s screen</span>
          </div>
          
          {screenSharer.uid === user?.uid && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs hover:bg-red-500/20 hover:text-red-400"
              onClick={toggleScreenShare}
            >
              <ScreenShare className="h-3.5 w-3.5 mr-1" />
              Stop sharing
            </Button>
          )}
        </div>
      </div>
    );
  };
  
  // If loading or error
  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-4 text-muted-foreground">Setting up your call...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <PhoneOff className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-medium">Call Error</h3>
        <p className="mt-2 text-muted-foreground">{error}</p>
        <Button variant="outline" className="mt-4" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex justify-between items-center px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <PhoneCall className="h-5 w-5 text-green-500" />
          <h2 className="font-medium">
            {callState?.title || `Call (${callState?.participants.length || 0} participants)`}
          </h2>
          <Badge variant="outline" className="ml-2">
            {formatCallDuration(callState?.createdAt)}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full"
                  onClick={copyInviteLink}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy invite link</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full"
                  onClick={() => setShowChat(!showChat)}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle chat</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full"
                  onClick={toggleFullScreen}
                >
                  {fullScreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{fullScreen ? 'Exit fullscreen' : 'Fullscreen'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Main video area */}
        <div 
          ref={videoContainerRef}
          className="relative flex-1 overflow-hidden bg-slate-950"
        >
          <div 
            className={cn(
              "h-full w-full grid gap-2 p-2",
              getVideoLayoutClass(),
              screenShareEnabled || callState?.participants.some(p => p.screenShare) ? "grid-rows-[2fr_1fr]" : "grid-rows-1"
            )}
          >
            {/* Screen share view */}
            {(screenShareEnabled || callState?.participants.some(p => p.screenShare)) && renderScreenShare()}
            
            {/* Participant videos */}
            {callState?.participants.map(participant => renderParticipantVideo(participant))}
          </div>
        </div>
        
        {/* Side panel (chat/participants) */}
        {showChat && (
          <div className="w-80 border-l flex flex-col">
            <div className="border-b p-2">
              <Tabs defaultValue="chat">
                <TabsList className="w-full">
                  <TabsTrigger value="chat">Chat</TabsTrigger>
                  <TabsTrigger value="participants">
                    Participants ({callState?.participants.length || 0})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="chat" className="mt-2">
                  <div className="flex flex-col h-[calc(100vh-12rem)]">
                    <ScrollArea className="flex-1 p-2">
                      {chatMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
                          <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                          <p className="text-sm">No messages yet</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {chatMessages.map(message => (
                            <div key={message.id} className="flex gap-2">
                              <Avatar className="h-6 w-6 mt-0.5">
                                <AvatarImage src={message.avatar} />
                                <AvatarFallback>{message.name?.charAt(0) || 'U'}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-baseline gap-2">
                                  <span className="font-medium text-sm">{message.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                                </div>
                                <p className="text-sm">{message.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                    
                    <div className="p-2 border-t mt-auto">
                      <div className="flex items-center gap-2">
                        <Input 
                          value={messageInput}
                          onChange={e => setMessageInput(e.target.value)}
                          placeholder="Type a message..."
                          onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                        />
                        <Button onClick={sendChatMessage} disabled={!messageInput.trim()}>
                          Send
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="participants" className="mt-2">
                  <ScrollArea className="h-[calc(100vh-12rem)]">
                    <div className="p-2 space-y-2">
                      {callState?.participants.map(participant => (
                        <div 
                          key={participant.uid}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                        >
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={participant.avatar} />
                                <AvatarFallback>{participant.name?.charAt(0) || 'U'}</AvatarFallback>
                              </Avatar>
                              {participant.speaking && (
                                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {participant.name} {participant.uid === user?.uid && "(You)"}
                              </p>
                              <div className="flex items-center gap-1.5">
                                {!participant.audio && (
                                  <MicOff className="h-3 w-3 text-red-400" />
                                )}
                                {!participant.video && (
                                  <VideoOff className="h-3 w-3 text-red-400" />
                                )}
                                {participant.screenShare && (
                                  <ScreenShare className="h-3 w-3 text-blue-400" />
                                )}
                                {participant.handRaised && (
                                  <Hand className="h-3 w-3 text-yellow-400" />
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {pinnedParticipant === participant.uid && (
                            <Badge variant="secondary" className="text-xs">
                              Pinned
                            </Badge>
                          )}
                        </div>
                      ))}
                      
                      <Separator />
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                        Invite People
                      </Button>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>
      
      {/* Call controls */}
      <div className="flex items-center justify-between p-3 border-t bg-slate-950/50 backdrop-blur">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-muted-foreground"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-5 w-5" />
          </Button>
          
          <Button 
            variant={handRaised ? "secondary" : "ghost"} 
            size="icon" 
            className={cn("rounded-full", handRaised && "text-yellow-500")}
            onClick={toggleRaisedHand}
          >
            <Hand className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant={audioEnabled ? "ghost" : "secondary"} 
            size="icon" 
            className={cn("rounded-full", !audioEnabled && "bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-500")}
            onClick={toggleAudio}
          >
            {audioEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </Button>
          
          <Button 
            variant={videoEnabled ? "ghost" : "secondary"} 
            size="icon" 
            className={cn("rounded-full", !videoEnabled && "bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-500")}
            onClick={toggleVideo}
          >
            {videoEnabled ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </Button>
          
          <Button 
            variant={screenShareEnabled ? "secondary" : "ghost"} 
            size="icon" 
            className={cn("rounded-full", screenShareEnabled && "bg-blue-500/10 text-blue-500")}
            onClick={toggleScreenShare}
          >
            {screenShareEnabled ? (
              <ScreenShare className="h-5 w-5" />
            ) : (
              <ScreenShare className="h-5 w-5" />
            )}
          </Button>
          
          <Button 
            variant="destructive" 
            size="icon" 
            className="rounded-full"
            onClick={leaveCall}
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={() => setLayout(layout === 'grid' ? 'spotlight' : 'grid')}
          >
            <LayoutGrid className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={() => setShowChat(!showChat)}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Settings dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Call Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Audio Input</h3>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Default Microphone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Microphone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Video Input</h3>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Default Camera" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Camera</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Noise Suppression</h3>
                <p className="text-sm text-muted-foreground">
                  Reduce background noise
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Echo Cancellation</h3>
                <p className="text-sm text-muted-foreground">
                  Remove echo from your audio
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Auto Gain Control</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically adjust microphone volume
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper functions
function formatCallDuration(startTime: any): string {
  if (!startTime) return '00:00';
  
  const start = startTime.toDate ? startTime.toDate() : new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  
  const hours = Math.floor(diffSecs / 3600);
  const minutes = Math.floor((diffSecs % 3600) / 60);
  const seconds = diffSecs % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Helper function for class names
function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}

// Call button component
export function CallButton({
  type = 'audio',
  userId,
  spaceId,
  channelId,
}: {
  type?: 'audio' | 'video';
  userId?: string;
  spaceId?: string;
  channelId?: string;
}) {
  const [user] = useAuthState(auth);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  
  // Start call
  const startCall = async () => {
    if (!user) return;
    
    try {
      // Create new call ID
      const newCallId = uuidv4();
      setCallId(newCallId);
      
      // Open call dialog
      setShowCallDialog(true);
      
      // Send message to channel if in a channel
      if (channelId) {
        const messagesRef = ref(rtdb, `spaces/${channelId}/messages`);
        const newMsgRef = push(messagesRef);
        
        await set(newMsgRef, {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'User',
          avatar: user.photoURL || null,
          message: `started a ${type} call`,
          type: 'call-update',
          callId: newCallId,
          callType: type,
          action: 'start',
          timestamp: Date.now(),
          readBy: [user.uid],
        });
      }
    } catch (err) {
      console.error('Error starting call:', err);
    }
  };
  
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={startCall}
            >
              {type === 'audio' ? (
                <Phone className="h-[1.2rem] w-[1.2rem]" />
              ) : (
                <Video className="h-[1.2rem] w-[1.2rem]" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Start {type} call</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
        <DialogContent className="max-w-5xl p-0 h-[90vh]">
          {callId && (
            <VideoAudioCall
              callId={callId}
              spaceId={spaceId}
              channelId={channelId}
              onClose={() => setShowCallDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}