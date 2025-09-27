'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { featureIntegration, eventBus } from '@/lib/feature-integration';
import videoCalling from '@/lib/video-calling';
import { useSessionPersistence } from '@/lib/hooks/use-session-persistence';

/**
 * A component to test various functionalities of SyncroSpace
 */
export function DiagnosticTool() {
  const [user] = useAuthState(auth);
  const { lastSession, isRestoring, restoreSession } = useSessionPersistence();
  const [status, setStatus] = useState<Record<string, string>>({});
  
  // Initialize on mount
  useEffect(() => {
    if (!user) return;
    
    checkStatus();
    
    // Listen for relevant events
    eventBus.on('character:selected', () => updateStatus('character', 'Character selected'));
    eventBus.on('room:joined', () => updateStatus('room', 'Room joined'));
    eventBus.on('position:updated', () => updateStatus('position', 'Position updated'));
    
    return () => {
      eventBus.removeAllListeners();
    };
  }, [user]);
  
  const updateStatus = (key: string, value: string) => {
    setStatus(prev => ({ ...prev, [key]: `${value} (${new Date().toLocaleTimeString()})` }));
  };
  
  const checkStatus = async () => {
    updateStatus('user', user ? `Logged in as ${user.email}` : 'Not logged in');
    
    try {
      // Check session
      if (lastSession) {
        updateStatus('session', `Last session found in room: ${lastSession.roomId}`);
      } else {
        updateStatus('session', 'No session found');
      }
      
      // Check WebRTC
      try {
        const hasMedia = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (hasMedia) {
          updateStatus('media', 'Media access granted');
          hasMedia.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        updateStatus('media', `Media access error: ${err}`);
      }
    } catch (err) {
      console.error('Error checking status:', err);
    }
  };
  
  const testRestoreSession = async () => {
    try {
      updateStatus('restore', 'Attempting to restore session...');
      const result = await restoreSession();
      updateStatus('restore', result ? 'Session restored successfully' : 'Session restore failed');
    } catch (err) {
      updateStatus('restore', `Error restoring session: ${err}`);
    }
  };
  
  const testWebRTC = async () => {
    try {
      updateStatus('webrtc', 'Initializing WebRTC...');
      const stream = await videoCalling.getUserMedia();
      if (stream) {
        updateStatus('webrtc', 'WebRTC stream acquired');
        stream.getTracks().forEach(track => track.stop());
      } else {
        updateStatus('webrtc', 'Failed to get media stream');
      }
    } catch (err) {
      updateStatus('webrtc', `WebRTC error: ${err}`);
    }
  };
  
  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>SyncroSpace Diagnostic Tool</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Current Status:</h3>
            {Object.entries(status).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm border-b pb-1 mb-1">
                <span className="font-medium capitalize">{key}:</span> 
                <span>{value}</span>
              </div>
            ))}
          </div>
          
          <div className="space-y-2 pt-4">
            <Button onClick={checkStatus} variant="outline" className="w-full">
              Refresh Status
            </Button>
            
            <Button onClick={testRestoreSession} variant="outline" className="w-full">
              Test Session Restore
            </Button>
            
            <Button onClick={testWebRTC} variant="outline" className="w-full">
              Test WebRTC
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default DiagnosticTool;