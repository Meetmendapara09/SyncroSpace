'use client';

import { db } from '@/lib/firebase';
import { collection, doc, onSnapshot, setDoc, addDoc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';

const STUN_SERVERS: RTCIceServer[] = [
  { urls: [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
  ]}
];

// Exported handles for room management
export interface RoomHandles {
  peerConnections: { [uid: string]: RTCPeerConnection };
  localStream: MediaStream;
  remoteStreams: { [uid: string]: MediaStream };
  hangUp: () => void;
}

// Create a new WebRTC room
export async function createRoom(spaceId: string, callId: string, localStream: MediaStream): Promise<RoomHandles> {
  const peerConnection = new RTCPeerConnection({ iceServers: STUN_SERVERS });
  const remoteStream = new MediaStream();
  const roomRef = doc(db, `spaces/${spaceId}/rooms/${callId}`);
  const callerCandidatesRef = collection(roomRef, 'callerCandidates');
  const calleeCandidatesRef = collection(roomRef, 'calleeCandidates');

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  peerConnection.ontrack = event => {
    event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
  };

  peerConnection.onicecandidate = async event => {
    if (event.candidate) {
      await addDoc(callerCandidatesRef, event.candidate.toJSON());
    }
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  await setDoc(roomRef, { offer: { type: offer.type, sdp: offer.sdp } }, { merge: true });

  const unsubscribe = onSnapshot(roomRef, async snapshot => {
    const data = snapshot.data();
    if (!peerConnection.currentRemoteDescription && data?.answer) {
      const answer = new RTCSessionDescription(data.answer);
      await peerConnection.setRemoteDescription(answer);
    }
  });

  const unsubscribeCandidates = onSnapshot(calleeCandidatesRef, snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        peerConnection.addIceCandidate(candidate);
      }
    });
  });

  // Implementation for room creation, signaling, and peer connection setup
  // Return RoomHandles
  const handles: RoomHandles = {
    peerConnections: {},
    localStream,
    remoteStreams: {},
    hangUp: function () {
      Object.values(handles.peerConnections).forEach(pc => (pc as RTCPeerConnection).close());
      handles.localStream.getTracks().forEach(track => track.stop());
    }
  };
  return handles;
}

// Join an existing WebRTC room
export async function joinRoom(spaceId: string, callId: string, localStream: MediaStream): Promise<RoomHandles> {
  const peerConnection = new RTCPeerConnection({ iceServers: STUN_SERVERS });
  const remoteStream = new MediaStream();
  const roomRef = doc(db, `spaces/${spaceId}/rooms/${callId}`);
  const callerCandidatesRef = collection(roomRef, 'callerCandidates');
  const calleeCandidatesRef = collection(roomRef, 'calleeCandidates');

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  peerConnection.ontrack = event => {
    event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
  };

  peerConnection.onicecandidate = async event => {
    if (event.candidate) {
      await addDoc(calleeCandidatesRef, event.candidate.toJSON());
    }
  };

  const roomSnapshot = await getDoc(roomRef);
  const roomData = roomSnapshot.data();
  if (!roomData?.offer) {
    throw new Error('Room offer not found');
  }
  await peerConnection.setRemoteDescription(new RTCSessionDescription(roomData.offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  await updateDoc(roomRef, { answer: { type: answer.type, sdp: answer.sdp } });

  const unsubscribeCandidates = onSnapshot(callerCandidatesRef, snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        peerConnection.addIceCandidate(candidate);
      }
    });
  });

  // Implementation for joining room, signaling, and peer connection setup
  // Return RoomHandles
  const handles: RoomHandles = {
    peerConnections: {},
    localStream,
    remoteStreams: {},
    hangUp: function () {
      Object.values(handles.peerConnections).forEach(pc => (pc as RTCPeerConnection).close());
      handles.localStream.getTracks().forEach(track => track.stop());
    }
  };
  return handles;
}

// Start local media (camera/mic)
export async function startLocalMedia(options: { video: boolean; audio: boolean }): Promise<MediaStream> {
  return await navigator.mediaDevices.getUserMedia(options);
}

// Hang up and clean up resources
export function hangUp(handles: RoomHandles) {
  Object.values(handles.peerConnections).forEach(pc => pc.close());
  handles.localStream.getTracks().forEach(track => track.stop());
}


