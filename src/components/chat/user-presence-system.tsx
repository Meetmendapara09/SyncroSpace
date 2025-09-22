'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  doc, 
  updateDoc, 
  onSnapshot,
  serverTimestamp, 
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { ref, onValue, set } from 'firebase/database';
import { auth, db, rtdb } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  CircleDot,
  UserRound,
  Clock,
  CalendarClock,
  Moon,
  PanelRightClose,
  MessageSquareMore,
  UserRoundCog,
  Users,
  Clock3,
  BellOff,
  MoreHorizontal,
  User,
  UserCheck,
  UserX,
  MessageCircle,
  Phone,
  Video,
  AtSign,
  AlertCircle,
  Coffee
} from 'lucide-react';

// Types for user presence
export type UserStatus = 'online' | 'away' | 'dnd' | 'offline' | 'invisible';

export interface UserPresence {
  uid: string;
  status: UserStatus;
  statusMessage?: string;
  lastActive: number | null;
  lastSeen?: number | null;
  isTyping?: boolean;
  typingIn?: string | null;
  device?: string;
  inactivityTimeout?: number;
  notifications?: {
    muted: boolean;
    mutedUntil?: number;
    mutedChannels?: string[];
    mutedUsers?: string[];
  };
}

interface UserStatusOption {
  value: UserStatus;
  label: string;
  icon: React.ReactNode;
  description: string;
}

// Status options
const STATUS_OPTIONS: UserStatusOption[] = [
  {
    value: 'online',
    label: 'Online',
    icon: <CircleDot className="h-4 w-4 text-green-500" />,
    description: 'You\'re active and visible to others'
  },
  {
    value: 'away',
    label: 'Away',
    icon: <Clock className="h-4 w-4 text-yellow-500" />,
    description: 'You\'re away from your computer'
  },
  {
    value: 'dnd',
    label: 'Do Not Disturb',
    icon: <CircleDot className="h-4 w-4 text-red-500" />,
    description: 'You won\'t receive notifications'
  },
  {
    value: 'invisible',
    label: 'Invisible',
    icon: <CircleDot className="h-4 w-4 text-gray-400" />,
    description: 'Appear offline to others'
  },
];

// Custom status presets
const STATUS_PRESETS = [
  { message: '🏠 Working from home', clearAfter: 8 * 60 * 60 * 1000 }, // 8 hours
  { message: '🥪 Out for lunch', clearAfter: 1 * 60 * 60 * 1000 }, // 1 hour
  { message: '📱 On mobile', clearAfter: 8 * 60 * 60 * 1000 }, // 8 hours
  { message: '🤒 Out sick', clearAfter: 24 * 60 * 60 * 1000 }, // 24 hours
  { message: '✈️ On vacation', clearAfter: 7 * 24 * 60 * 60 * 1000 }, // 1 week
  { message: '🎧 In a meeting', clearAfter: 1 * 60 * 60 * 1000 }, // 1 hour
  { message: '☕ Taking a break', clearAfter: 15 * 60 * 1000 }, // 15 minutes
];

const AUTO_AWAY_TIMEOUT = 5 * 60 * 1000; // 5 minutes of inactivity

// Time since active formatter
const formatTimeSince = (timestamp: number | null): string => {
  if (!timestamp) return 'Never';
  
  const now = Date.now();
  const diffMs = now - timestamp;
  
  // Less than a minute
  if (diffMs < 60000) {
    return 'Just now';
  }
  
  // Less than an hour
  if (diffMs < 3600000) {
    const mins = Math.floor(diffMs / 60000);
    return `${mins}m ago`;
  }
  
  // Less than a day
  if (diffMs < 86400000) {
    const hours = Math.floor(diffMs / 3600000);
    return `${hours}h ago`;
  }
  
  // Less than a week
  if (diffMs < 604800000) {
    const days = Math.floor(diffMs / 86400000);
    return `${days}d ago`;
  }
  
  // Format date
  const date = new Date(timestamp);
  return date.toLocaleDateString();
};

// User status indicator component
export function UserStatusIndicator({ 
  status, 
  size = 'md',
  className = ''
}: { 
  status?: UserStatus; 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  let statusColor = 'bg-gray-400'; // default/offline
  let sizeClass = 'h-3 w-3';
  
  if (size === 'sm') sizeClass = 'h-2 w-2';
  if (size === 'lg') sizeClass = 'h-4 w-4';
  
  switch(status) {
    case 'online':
      statusColor = 'bg-green-500';
      break;
    case 'away':
      statusColor = 'bg-yellow-500';
      break;
    case 'dnd':
      statusColor = 'bg-red-500';
      break;
    case 'invisible':
      statusColor = 'bg-gray-400';
      break;
  }
  
  return (
    <span className={`${sizeClass} rounded-full ${statusColor} border-2 border-background ${className}`}></span>
  );
}

// User presence provider context
export const UserPresenceContext = React.createContext<{
  currentUserPresence: UserPresence | null;
  updateUserStatus: (status: UserStatus) => void;
  updateStatusMessage: (message: string, clearAfter?: number | null) => void;
  clearStatusMessage: () => void;
}>({
  currentUserPresence: null,
  updateUserStatus: () => {},
  updateStatusMessage: () => {},
  clearStatusMessage: () => {},
});

// Provider component
export function UserPresenceProvider({ children }: { children: React.ReactNode }) {
  const [user] = useAuthState(auth);
  const [currentUserPresence, setCurrentUserPresence] = useState<UserPresence | null>(null);
  const [activityTimeout, setActivityTimeout] = useState<NodeJS.Timeout | null>(null);
  const [clearStatusTimeout, setClearStatusTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Initialize user presence when they log in
  useEffect(() => {
    if (!user) return;
    
    // Reference to the user's presence in RTDB
    const userPresenceRef = ref(rtdb, `presence/${user.uid}`);
    
    // Setup initial presence
    const initialPresence: UserPresence = {
      uid: user.uid,
      status: 'online',
      lastActive: Date.now(),
      device: detectDevice(),
      inactivityTimeout: AUTO_AWAY_TIMEOUT,
      notifications: {
        muted: false
      }
    };
    
    // Update RTDB with user presence
    set(userPresenceRef, initialPresence);
    setCurrentUserPresence(initialPresence);
    
    // Listen for presence changes
    const unsubscribe = onValue(userPresenceRef, (snapshot) => {
      if (snapshot.exists()) {
        const presenceData = snapshot.val() as UserPresence;
        setCurrentUserPresence(presenceData);
      }
    });
    
    // Set up activity tracking
    setupActivityTracking(userPresenceRef);
    
    // Set up disconnect handling
    const connectedRef = ref(rtdb, '.info/connected');
    const disconnectUnsubscribe = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        // On disconnect, update the user status to offline and timestamp
        set(userPresenceRef, {
          ...initialPresence,
          status: 'offline',
          lastSeen: serverTimestamp(),
        });
      }
    });
    
    // Update Firestore user record with online status
    updateDoc(doc(db, 'users', user.uid), {
      status: 'online',
      lastActive: new Date(),
    });
    
    return () => {
      // Clean up listeners
      unsubscribe();
      disconnectUnsubscribe();
      
      // Clear any pending timeouts
      if (activityTimeout) clearTimeout(activityTimeout);
      if (clearStatusTimeout) clearTimeout(clearStatusTimeout);
      
      // Set user as offline when they disconnect
      set(userPresenceRef, {
        uid: user.uid,
        status: 'offline',
        lastSeen: Date.now(),
      });
      
      // Update Firestore
      updateDoc(doc(db, 'users', user.uid), {
        status: 'offline',
        lastSeen: new Date(),
      });
    };
  }, [user]);
  
  // Setup activity tracking to detect when user goes away
  const setupActivityTracking = (presenceRef: any) => {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    let activityTimer: NodeJS.Timeout | null = null;
    
    // Function to update last active time
    const updateActivity = () => {
      if (!currentUserPresence) return;
      
      // Only update if not already online (to reduce writes)
      if (currentUserPresence.status === 'away') {
        updateUserStatus('online');
      }
      
      // Update last active timestamp
      set(presenceRef, {
        ...currentUserPresence,
        lastActive: Date.now(),
      });
      
      // Reset inactivity timer
      if (activityTimer) clearTimeout(activityTimer);
      activityTimer = setTimeout(() => {
        // Only change to away if currently online (don't change dnd or invisible)
        if (currentUserPresence && currentUserPresence.status === 'online') {
          updateUserStatus('away');
        }
      }, AUTO_AWAY_TIMEOUT);
      
      setActivityTimeout(activityTimer);
    };
    
    // Set up event listeners for activity
    activityEvents.forEach(event => {
      window.addEventListener(event, updateActivity);
    });
    
    // Initial activity tracking timer
    activityTimer = setTimeout(() => {
      if (currentUserPresence && currentUserPresence.status === 'online') {
        updateUserStatus('away');
      }
    }, AUTO_AWAY_TIMEOUT);
    setActivityTimeout(activityTimer);
    
    // Return cleanup function
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      if (activityTimer) clearTimeout(activityTimer);
    };
  };
  
  // Detect user device
  const detectDevice = (): string => {
    const userAgent = navigator.userAgent;
    
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
    if (/Android/i.test(userAgent)) return 'Android';
    if (/Windows/i.test(userAgent)) return 'Windows';
    if (/Mac/i.test(userAgent)) return 'Mac';
    if (/Linux/i.test(userAgent)) return 'Linux';
    
    return 'Unknown';
  };
  
  // Function to update user status
  const updateUserStatus = (status: UserStatus) => {
    if (!user || !currentUserPresence) return;
    
    const userPresenceRef = ref(rtdb, `presence/${user.uid}`);
    const updatedPresence = {
      ...currentUserPresence,
      status,
      lastActive: Date.now(),
    };
    
    set(userPresenceRef, updatedPresence);
    setCurrentUserPresence(updatedPresence);
    
    // Also update in Firestore
    updateDoc(doc(db, 'users', user.uid), {
      status,
      lastActive: new Date(),
    });
  };
  
  // Function to update status message
  const updateStatusMessage = (statusMessage: string, clearAfter: number | null = null) => {
    if (!user || !currentUserPresence) return;
    
    const userPresenceRef = ref(rtdb, `presence/${user.uid}`);
    const updatedPresence = {
      ...currentUserPresence,
      statusMessage,
      lastActive: Date.now(),
    };
    
    set(userPresenceRef, updatedPresence);
    setCurrentUserPresence(updatedPresence);
    
    // Clear any existing timeout
    if (clearStatusTimeout) clearTimeout(clearStatusTimeout);
    
    // Set timeout to clear the status message if needed
    if (clearAfter) {
      const timeout = setTimeout(() => {
        clearStatusMessage();
      }, clearAfter);
      setClearStatusTimeout(timeout);
    }
  };
  
  // Function to clear status message
  const clearStatusMessage = () => {
    if (!user || !currentUserPresence) return;
    
    const userPresenceRef = ref(rtdb, `presence/${user.uid}`);
    const updatedPresence = {
      ...currentUserPresence,
      statusMessage: undefined,
    };
    
    set(userPresenceRef, updatedPresence);
    setCurrentUserPresence(updatedPresence);
    
    // Clear any existing timeout
    if (clearStatusTimeout) clearTimeout(clearStatusTimeout);
  };
  
  const value = {
    currentUserPresence,
    updateUserStatus,
    updateStatusMessage,
    clearStatusMessage,
  };
  
  return (
    <UserPresenceContext.Provider value={value}>
      {children}
    </UserPresenceContext.Provider>
  );
}

// Hook to use user presence
export const useUserPresence = () => React.useContext(UserPresenceContext);

// Component to show and set user's status
export function UserPresenceControl() {
  const { currentUserPresence, updateUserStatus, updateStatusMessage, clearStatusMessage } = useUserPresence();
  const [statusText, setStatusText] = useState('');
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusDuration, setStatusDuration] = useState<number | null>(null);
  
  // Handle status update from dropdown
  const handleStatusChange = (status: UserStatus) => {
    updateUserStatus(status);
  };
  
  // Handle custom status message submission
  const handleStatusMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusText.trim()) return;
    
    updateStatusMessage(statusText, statusDuration);
    setShowStatusDialog(false);
  };
  
  // Handle preset selection
  const handlePresetSelect = (preset: typeof STATUS_PRESETS[number]) => {
    updateStatusMessage(preset.message, preset.clearAfter);
    setShowStatusDialog(false);
  };
  
  return (
    <>
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
              <UserStatusIndicator 
                status={currentUserPresence?.status} 
                className="absolute bottom-0 right-0" 
              />
              <span className="sr-only">Toggle user status</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-xs font-medium text-muted-foreground p-1">
                Set your status
              </p>
              {STATUS_OPTIONS.map(option => (
                <button
                  key={option.value}
                  className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-md ${currentUserPresence?.status === option.value ? 'bg-muted' : 'hover:bg-muted'}`}
                  onClick={() => handleStatusChange(option.value)}
                >
                  {option.icon}
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </div>
                </button>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowStatusDialog(true)}>
              <MessageSquareMore className="h-4 w-4 mr-2" />
              Set a custom status
            </DropdownMenuItem>
            {currentUserPresence?.statusMessage && (
              <DropdownMenuItem onClick={() => clearStatusMessage()}>
                <X className="h-4 w-4 mr-2" />
                Clear status message
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {currentUserPresence?.statusMessage ? (
          <div className="flex items-center gap-1">
            <span className="text-sm truncate max-w-[100px] text-muted-foreground">
              {currentUserPresence.statusMessage}
            </span>
          </div>
        ) : (
          <button 
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setShowStatusDialog(true)}
          >
            Set a status...
          </button>
        )}
      </div>
      
      {/* Custom status dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set your status</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleStatusMessageSubmit} className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <UserStatusIndicator status={currentUserPresence?.status} size="md" />
              <div className="relative flex-1">
                <Input
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="What's your status?"
                  className="pr-10"
                />
                {statusText && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setStatusText('')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2">Clear after</p>
              <div className="flex flex-wrap gap-2">
                <Button 
                  type="button"
                  variant={statusDuration === null ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setStatusDuration(null)}
                >
                  Never
                </Button>
                <Button 
                  type="button"
                  variant={statusDuration === 1 * 60 * 60 * 1000 ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setStatusDuration(1 * 60 * 60 * 1000)}
                >
                  1 hour
                </Button>
                <Button 
                  type="button"
                  variant={statusDuration === 4 * 60 * 60 * 1000 ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setStatusDuration(4 * 60 * 60 * 1000)}
                >
                  4 hours
                </Button>
                <Button 
                  type="button"
                  variant={statusDuration === 24 * 60 * 60 * 1000 ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setStatusDuration(24 * 60 * 60 * 1000)}
                >
                  Today
                </Button>
                <Button 
                  type="button"
                  variant={statusDuration === 7 * 24 * 60 * 60 * 1000 ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setStatusDuration(7 * 24 * 60 * 60 * 1000)}
                >
                  This week
                </Button>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2">Suggestions</p>
              <div className="space-y-1">
                {STATUS_PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    className="flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md hover:bg-muted"
                    onClick={() => handlePresetSelect(preset)}
                  >
                    <span>{preset.message}</span>
                    <span className="text-xs text-muted-foreground">
                      {preset.clearAfter === 15 * 60 * 1000 && '15m'}
                      {preset.clearAfter === 60 * 60 * 1000 && '1h'}
                      {preset.clearAfter === 8 * 60 * 60 * 1000 && '8h'}
                      {preset.clearAfter === 24 * 60 * 60 * 1000 && '1d'}
                      {preset.clearAfter === 7 * 24 * 60 * 60 * 1000 && '1w'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="ghost" type="button" onClick={() => setShowStatusDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!statusText.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Component to show a list of users with their presence
export function UsersPresenceList({ 
  spaceId,
  compact = false 
}: { 
  spaceId?: string;
  compact?: boolean;
}) {
  const [user] = useAuthState(auth);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchUsers = async () => {
      setLoading(true);
      try {
        // Create query based on space or all users
        let usersQuery;
        
        if (spaceId) {
          // Get users in this space
          usersQuery = query(
            collection(db, 'spaceMembers'),
            where('spaceId', '==', spaceId)
          );
          
          const membersSnapshot = await getDocs(usersQuery);
          const memberIds = membersSnapshot.docs.map(doc => doc.data().userId);
          
          // Get user details for each member
          const usersData = [];
          for (const memberId of memberIds) {
            const userRef = doc(db, 'users', memberId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              usersData.push({
                id: userSnap.id,
                ...userSnap.data(),
              });
            }
          }
          
          setUsers(usersData);
        } else {
          // Get all users
          usersQuery = query(collection(db, 'users'));
          const usersSnapshot = await getDocs(usersQuery);
          
          const usersData = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          
          setUsers(usersData);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching users:', err);
        setLoading(false);
      }
    };
    
    fetchUsers();
    
    // Also subscribe to presence updates in RTDB
    const presenceRef = ref(rtdb, 'presence');
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      if (!snapshot.exists()) return;
      
      const presenceData = snapshot.val();
      
      // Update users with real-time presence data
      setUsers(prev => prev.map(user => ({
        ...user,
        presence: presenceData[user.id],
      })));
    });
    
    return () => unsubscribe();
  }, [user, spaceId]);
  
  // Group users by status
  const onlineUsers = users.filter(u => u.presence?.status === 'online');
  const awayUsers = users.filter(u => u.presence?.status === 'away');
  const dndUsers = users.filter(u => u.presence?.status === 'dnd');
  const offlineUsers = users.filter(u => !u.presence || u.presence.status === 'offline' || u.presence.status === 'invisible');
  
  // Sort each group by name
  const sortByName = (a: any, b: any) => (a.name || a.displayName || '').localeCompare(b.name || b.displayName || '');
  onlineUsers.sort(sortByName);
  awayUsers.sort(sortByName);
  dndUsers.sort(sortByName);
  offlineUsers.sort(sortByName);
  
  const renderUserItem = (userData: any, status: UserStatus = 'offline') => {
    // Get user's actual status from their presence data, fallback to parameter
    const userStatus = userData.presence?.status || status;
    const statusMessage = userData.presence?.statusMessage;
    const userName = userData.name || userData.displayName || 'Unknown User';
    
    return (
      <div key={userData.id} className={`flex items-center ${compact ? 'py-1 px-2' : 'p-2'} hover:bg-muted rounded-md`}>
        <div className="relative mr-3">
          <Avatar className={compact ? "h-6 w-6" : "h-8 w-8"}>
            <AvatarImage src={userData.photoURL} />
            <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
          </Avatar>
          <UserStatusIndicator 
            status={userStatus}
            size={compact ? 'sm' : 'md'}
            className="absolute bottom-0 right-0" 
          />
        </div>
        
        <div className={`flex-1 min-w-0 ${compact ? 'text-sm' : ''}`}>
          <div className="flex items-baseline justify-between">
            <p className={`truncate font-medium ${compact ? 'text-xs' : 'text-sm'}`}>{userName}</p>
            {!compact && userData.presence?.lastActive && (
              <span className="text-xs text-muted-foreground">
                {userStatus === 'online' ? 'Active' : formatTimeSince(userData.presence.lastActive)}
              </span>
            )}
          </div>
          
          {statusMessage && (
            <p className="text-xs text-muted-foreground truncate">{statusMessage}</p>
          )}
        </div>
        
        {!compact && (
          <div className="ml-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Video className="h-4 w-4 mr-2" />
                  Video
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="h-4 w-4 mr-2" />
                  View profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Add to favorites
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <AtSign className="h-4 w-4 mr-2" />
                  Mention
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <BellOff className="h-4 w-4 mr-2" />
                  Mute notifications
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  <UserX className="h-4 w-4 mr-2" />
                  Block
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <div className="space-y-1 flex-1">
              <div className="h-4 bg-muted animate-pulse rounded-md" style={{ width: `${50 + Math.random() * 40}%` }} />
              <div className="h-3 bg-muted animate-pulse rounded-md opacity-70" style={{ width: `${30 + Math.random() * 30}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <ScrollArea className={`${compact ? '' : 'p-2'}`}>
      {onlineUsers.length > 0 && (
        <div className="mb-4">
          <p className={`font-medium text-xs text-muted-foreground mb-1 ${compact ? 'px-2' : 'px-1'}`}>
            Online — {onlineUsers.length}
          </p>
          <div className="space-y-0.5">
            {onlineUsers.map(user => renderUserItem(user, 'online'))}
          </div>
        </div>
      )}
      
      {awayUsers.length > 0 && (
        <div className="mb-4">
          <p className={`font-medium text-xs text-muted-foreground mb-1 ${compact ? 'px-2' : 'px-1'}`}>
            Away — {awayUsers.length}
          </p>
          <div className="space-y-0.5">
            {awayUsers.map(user => renderUserItem(user, 'away'))}
          </div>
        </div>
      )}
      
      {dndUsers.length > 0 && (
        <div className="mb-4">
          <p className={`font-medium text-xs text-muted-foreground mb-1 ${compact ? 'px-2' : 'px-1'}`}>
            Do Not Disturb — {dndUsers.length}
          </p>
          <div className="space-y-0.5">
            {dndUsers.map(user => renderUserItem(user, 'dnd'))}
          </div>
        </div>
      )}
      
      {offlineUsers.length > 0 && (
        <div>
          <p className={`font-medium text-xs text-muted-foreground mb-1 ${compact ? 'px-2' : 'px-1'}`}>
            Offline — {offlineUsers.length}
          </p>
          <div className="space-y-0.5">
            {offlineUsers.map(user => renderUserItem(user, 'offline'))}
          </div>
        </div>
      )}
    </ScrollArea>
  );
}

// Export the main user presence panel
export function UserPresencePanel() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-medium flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Presence
        </h2>
        <Badge variant="outline" className="bg-green-500/10 text-green-500">
          <CircleDot className="h-3 w-3 mr-1" /> Online
        </Badge>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <UsersPresenceList />
      </div>
      
      <div className="p-4 border-t">
        <UserPresenceControl />
      </div>
    </div>
  );
}