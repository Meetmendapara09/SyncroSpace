import { cn } from './utils';
import Peer, { MediaConnection } from 'peerjs';
import { networkManager } from './colyseus-network';

// Simple utility to sanitize user IDs for PeerJS
function sanitizeUserId(userId: string): string {
  return userId.replace(/[^0-9a-z]/gi, 'X');
}

interface CallState {
  myStream: MediaStream | null;
  peerConnections: Map<string, { call: MediaConnection; stream: MediaStream }>;
  isConnected: boolean;
}

class VideoCalling {
  private static instance: VideoCalling;
  private peer: Peer | null = null;
  private callState: CallState = {
    myStream: null,
    peerConnections: new Map(),
    isConnected: false,
  };
  private initializationPromise: Promise<Peer> | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();

  private constructor() {}

  public static getInstance(): VideoCalling {
    if (!VideoCalling.instance) {
      VideoCalling.instance = new VideoCalling();
    }
    return VideoCalling.instance;
  }

  public on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(handler);
  }

  private emit(event: string, data?: any) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  public getPeer(): Peer | null {
    return this.peer;
  }

  public getCallState(): CallState {
    return { ...this.callState };
  }

  public async initializePeer(userId: string): Promise<Peer> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.peer) {
      return Promise.resolve(this.peer);
    }

    this.initializationPromise = new Promise((resolve, reject) => {
      const sanitizedId = sanitizeUserId(userId);
      const peer = new Peer(sanitizedId);

      peer.on('open', (id: string) => {
        this.peer = peer;
        this.callState.isConnected = true;
        this.emit('connected', id);
        resolve(peer);
      });

      peer.on('call', (call: MediaConnection) => {
        if (this.callState.myStream) {
          call.answer(this.callState.myStream);
        } else {
          call.answer();
        }
        
        call.on('stream', (userStream: MediaStream) => {
          this.callState.peerConnections.set(call.peer, { call, stream: userStream });
          this.emit('streamReceived', { peerId: call.peer, stream: userStream });
        });
      });

      peer.on('error', (error: Error) => {
        console.error('Peer error:', error);
        this.emit('error', error);
        reject(error);
      });
    });

    return this.initializationPromise;
  }

  public shareWebcam(sessionId: string) {
    if (!this.peer || !this.callState.myStream) {
      console.warn('Cannot call peer - Peer or stream not initialized');
      return;
    }

    try {
      const userId = sanitizeUserId(sessionId);
      const call = this.peer.call(userId, this.callState.myStream);
      
      // Notify via multiplayer network
      networkManager.connectToVideoCall(sessionId);
      
      call.on('stream', (userStream: MediaStream) => {
        this.callState.peerConnections.set(userId, { call, stream: userStream });
        this.emit('streamReceived', { peerId: userId, stream: userStream });
      });
    } catch (err) {
      console.error('Error while sharing webcam:', err);
      this.emit('error', err);
    }
  }

  public async getUserMedia(): Promise<MediaStream | null> {
    if (this.callState.myStream) {
      return this.callState.myStream;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      this.callState.myStream = stream;
      this.emit('localStreamReady', stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      this.emit('error', error);
      return null;
    }
  }

  public toggleVideo(): boolean {
    if (!this.callState.myStream) return false;
    
    const videoTrack = this.callState.myStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      this.emit('videoToggled', videoTrack.enabled);
      return videoTrack.enabled;
    }
    return false;
  }

  public toggleAudio(): boolean {
    if (!this.callState.myStream) return false;
    
    const audioTrack = this.callState.myStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      this.emit('audioToggled', audioTrack.enabled);
      return audioTrack.enabled;
    }
    return false;
  }

  public endCall(sessionId?: string) {
    if (sessionId) {
      const userId = sanitizeUserId(sessionId);
      const connection = this.callState.peerConnections.get(userId);
      if (connection) {
        connection.call.close();
        this.callState.peerConnections.delete(userId);
        this.emit('callEnded', userId);
      }
    } else {
      // End all calls
      this.callState.peerConnections.forEach((connection, peerId) => {
        connection.call.close();
      });
      this.callState.peerConnections.clear();
      this.emit('allCallsEnded');
    }
  }

  // Disconnect from video calling (CaveVerse compatibility)
  disconnectFromVideoCall() {
    this.cleanup();
  }

  public cleanup() {
    this.endCall();
    
    if (this.callState.myStream) {
      this.callState.myStream.getTracks().forEach(track => track.stop());
      this.callState.myStream = null;
    }

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    
    this.callState.isConnected = false;
    this.initializationPromise = null;
    this.eventHandlers.clear();
  }
}

export default VideoCalling.getInstance();