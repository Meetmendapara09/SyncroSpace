'use client';

import * as React from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { Button } from '@/components/ui/button';
import {
  Camera,
  CameraOff,
  MessageSquareText,
  Mic,
  MicOff,
  PhoneOff,
  ScreenShare,
  Settings,
} from 'lucide-react';
import { 
  toggleMic, 
  toggleWebcam, 
  disconnectFromVideoCall 
} from '@/lib/redux/features/webRtc/webcamSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import videoCalling from '@/lib/video-calling';

interface FloatingActionsProps {
  isInsideOffice?: boolean;
  isWebcamEnabled?: boolean;
  isMicEnabled?: boolean;
  onToggleWebcam?: () => void;
  onToggleMic?: () => void;
  onStartScreenShare?: () => void;
  onDisconnect?: () => void;
  showChat?: boolean;
  setScreenDialogOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  setShowChat?: React.Dispatch<React.SetStateAction<boolean>>;
}

export function FloatingActions({
  isInsideOffice = false,
  isWebcamEnabled: propWebcamEnabled,
  isMicEnabled: propMicEnabled,
  onToggleWebcam,
  onToggleMic,
  onStartScreenShare,
  onDisconnect,
  showChat = false,
  setScreenDialogOpen,
  setShowChat,
}: FloatingActionsProps) {
  const dispatch = useAppDispatch();
  const myWebcamStream = useAppSelector((state) => state.webcam.myWebcamStream);
  const stateWebcamEnabled = useAppSelector((state) => state.webcam.isWebcamOn);
  const stateMicEnabled = useAppSelector((state) => state.webcam.isMicOn);
  
  // Use props if provided, otherwise use Redux state
  const isWebcamEnabled = propWebcamEnabled !== undefined ? propWebcamEnabled : stateWebcamEnabled;
  const isMicEnabled = propMicEnabled !== undefined ? propMicEnabled : stateMicEnabled;

  const handleToggleWebcam = async () => {
    if (onToggleWebcam) {
      onToggleWebcam();
    } else {
      dispatch(toggleWebcam());
      // Toggle actual webcam stream
      if (myWebcamStream && isWebcamEnabled) {
        const videoTracks = myWebcamStream.getVideoTracks();
        videoTracks.forEach(track => {
          track.enabled = !track.enabled;
        });
      }
    }
  };

  const handleToggleMic = async () => {
    if (onToggleMic) {
      onToggleMic();
    } else {
      dispatch(toggleMic());
      // Toggle actual microphone
      if (myWebcamStream && isMicEnabled) {
        const audioTracks = myWebcamStream.getAudioTracks();
        audioTracks.forEach(track => {
          track.enabled = !track.enabled;
        });
      }
    }
  };

  const handleScreenShare = () => {
    if (onStartScreenShare) {
      onStartScreenShare();
    } else {
      setScreenDialogOpen?.(true);
    }
  };

  const handleDisconnect = () => {
    dispatch(disconnectFromVideoCall());
    videoCalling.disconnectFromVideoCall();
  };

  const floatingVariants = {
    initial: { opacity: 0, y: 100 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 100 }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={floatingVariants}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
      >
        <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-xl p-4">
          <div className="flex items-center gap-3">
            {/* Chat Toggle (right side of settings) */}
            <Button
              variant="outline"
              size="icon" 
              className={cn(
                "rounded-full transition-all duration-200",
                showChat && "bg-blue-100 text-blue-600"
              )}
              onClick={() => setShowChat?.(!showChat)}
            >
              <MessageSquareText className="h-5 w-5" />
            </Button>

            {/* Microphone Toggle */}
            <Button
              variant={isMicEnabled ? "default" : "destructive"}
              size="icon"
              className={cn(
                "rounded-full transition-all duration-200",
                isMicEnabled ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
              )}
              onClick={handleToggleMic}
              disabled={!myWebcamStream}
            >
              {isMicEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>

            {/* Camera Toggle */}
            <Button
              variant={isWebcamEnabled ? "default" : "destructive"}
              size="icon"
              className={cn(
                "rounded-full transition-all duration-200",
                isWebcamEnabled ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
              )}
              onClick={handleToggleWebcam}
              disabled={!myWebcamStream}
            >
              {isWebcamEnabled ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
            </Button>

            {/* Screen Share (only show when inside office) */}
            {isInsideOffice && (
              <Button
                variant="outline"
                size="icon"
                className="rounded-full transition-all duration-200"
                onClick={handleScreenShare}
              >
                <ScreenShare className="h-5 w-5" />
              </Button>
            )}

            {/* Settings */}
            <Button
              variant="outline"
              size="icon"
              className="rounded-full transition-all duration-200"
            >
              <Settings className="h-5 w-5" />
            </Button>

            {/* Disconnect */}
            <Button
              variant="destructive"
              size="icon"
              className="rounded-full transition-all duration-200 bg-red-600 hover:bg-red-700"
              onClick={onDisconnect || (() => dispatch(disconnectFromVideoCall()))}
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex justify-center mt-2">
          <div className="flex items-center gap-2 bg-black/70 text-white px-3 py-1 rounded-full text-xs">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              myWebcamStream ? "bg-green-400" : "bg-gray-400"
            )} />
            {myWebcamStream ? "Connected" : "Disconnected"}
            {isInsideOffice && (
              <>
                <span className="mx-1">•</span>
                <span>Office Mode</span>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}