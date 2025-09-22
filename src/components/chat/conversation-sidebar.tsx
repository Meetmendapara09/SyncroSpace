
'use client';

import React, { useState, useEffect } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, limit, getDocs, doc } from 'firebase/firestore';
import { db, auth, rtdb } from '@/lib/firebase';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuthState } from 'react-firebase-hooks/auth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { 
  MessageSquarePlus, 
  Users,
  Search,
  CircleDot,
  Star,
  Bell,
  MoreHorizontal,
  X,
  UsersRound
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { ref as rtdbRef, onValue } from 'firebase/database';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface User {
  id: string;
  uid: string;
  name: string;
  photoURL?: string;
  jobTitle?: string;
  email?: string;
  lastSeen?: any;
  status?: 'online' | 'offline' | 'away' | 'dnd';
  favorite?: boolean;
}

function UserStatus({ status }: { status?: string }) {
  let statusColor = 'bg-gray-400'; // default/offline
  
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
  }
  
  return (
    <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ${statusColor} border-2 border-white dark:border-slate-900`}></span>
  );
}

function ConversationListItem({ convo }: { convo: User }) {
    const [user] = useAuthState(auth);
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);
    const [lastMessage, setLastMessage] = useState<string | null>(null);
    const [lastMessageTime, setLastMessageTime] = useState<string | null>(null);

    const getConversationId = (uid1: string, uid2: string) => {
        return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
    }

    const conversationId = user ? getConversationId(user.uid, convo.uid) : null;

    // Get unread message count and last message from RTDB
    useEffect(() => {
      if (!user || !conversationId) return;
      
      // Reference to the conversation's messages in RTDB
      const conversationRef = rtdbRef(rtdb, `spaces/${conversationId}/messages`);
      
      const unsubscribe = onValue(conversationRef, (snapshot) => {
        if (!snapshot.exists()) return;
        
        const data = snapshot.val();
        const messages = Object.values(data || {});
        
        if (messages.length === 0) return;
        
        // Count unread messages
        const unreadMessages = (messages as any[]).filter(msg => 
          msg.uid !== user.uid && (!msg.readBy || !msg.readBy.includes(user.uid))
        );
        
        setUnreadCount(unreadMessages.length);
        
        // Get last message
        const sortedMessages = [...(messages as any[])].sort((a, b) => b.timestamp - a.timestamp);
        if (sortedMessages.length > 0) {
          const latest = sortedMessages[0];
          
          // Format timestamp
          const date = new Date(latest.timestamp);
          const now = new Date();
          let formattedTime;
          
          if (date.toDateString() === now.toDateString()) {
            // Today, show time
            formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } else {
            // Not today, show date
            formattedTime = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
          }
          
          // Format message based on type
          let messageText;
          if (latest.type === 'image') {
            messageText = '📷 Image';
          } else if (latest.type === 'file') {
            messageText = '📎 File: ' + (latest.fileName || 'Attachment');
          } else if (latest.type === 'reaction') {
            messageText = '👍 Reaction';
          } else {
            messageText = latest.message;
          }
          
          // Truncate message if too long
          if (messageText && messageText.length > 30) {
            messageText = messageText.substring(0, 27) + '...';
          }
          
          setLastMessage(messageText);
          setLastMessageTime(formattedTime);
        }
      });
      
      return () => unsubscribe();
    }, [user, conversationId, convo.uid]);
    
    const isActive = pathname === `/chat/${convo.uid}`;
    
    return (
        <Link
            href={`/chat/${convo.uid}`}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 transition-all hover:bg-muted relative",
                isActive 
                  ? "bg-muted text-primary border-l-4 border-primary pl-2" 
                  : "text-muted-foreground"
            )}
            >
            <div className="relative">
              <Avatar className="h-10 w-10">
                  <AvatarImage src={convo.photoURL} alt={convo.name} />
                  <AvatarFallback>{getInitials(convo.name)}</AvatarFallback>
              </Avatar>
              <UserStatus status={convo.status} />
            </div>
            <div className="truncate flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <p className={cn("font-medium", isActive && "font-semibold", unreadCount > 0 && "font-semibold")}>{convo.name}</p>
                  {lastMessageTime && <span className="text-xs text-muted-foreground whitespace-nowrap">{lastMessageTime}</span>}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {lastMessage || (convo.jobTitle || 'No recent messages')}
                </p>
            </div>
            {unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 w-5 justify-center p-0">{unreadCount}</Badge>
            )}
        </Link>
    );
}

export function ConversationSidebar() {
  const [user] = useAuthState(auth);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [favoriteUsers, setFavoriteUsers] = useState<User[]>([]);

  // Get all users for conversations
  const usersQuery = user 
    ? query(collection(db, 'users'), where('uid', '!=', user.uid))
    : null;
  const [usersSnapshot, loading, error] = useCollection(usersQuery);

  const conversations = usersSnapshot?.docs.map(doc => ({ 
    id: doc.id, 
    name: doc.data().name || 'Unknown', // Ensure 'name' is included
    email: doc.data().email || '', // Ensure 'email' is included
    ...doc.data(),
    // Simulate some online statuses for demo purposes
    status: Math.random() > 0.7 ? 'online' : Math.random() > 0.5 ? 'away' : 'offline',
    favorite: Math.random() > 0.8 // Random favorites for demo
  })) || [];
  
  // Update filtered results when search changes or conversations load
  useEffect(() => {
    if (searchQuery) {
      const filtered = conversations.filter(convo => 
        convo.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        convo.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        convo.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase())
      ).map(convo => ({
        ...convo,
        uid: convo.uid || convo.id // Ensure 'uid' is included
      }));
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(conversations);
    }
    
    // Set favorites
    setFavoriteUsers(conversations.filter(convo => convo.favorite));
  }, [searchQuery, conversations]);
  
  // Get which users to display based on active tab
  const getDisplayedUsers = () => {
    switch(activeTab) {
      case 'favorites':
        return favoriteUsers;
      case 'online':
        return filteredUsers.filter(u => u.status === 'online');
      default:
        return filteredUsers;
    }
  };

  const displayedUsers = getDisplayedUsers();
  const onlineCount = filteredUsers.filter(u => u.status === 'online').length;

  return (
    <div className="hidden h-full flex-col border-r bg-white dark:bg-slate-950 md:flex">
      <div className="flex h-16 items-center justify-between border-b px-6">
        <div className="flex items-center gap-2">
          <UsersRound className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Messages</h1>
          {onlineCount > 0 && (
            <Badge variant="outline" className="ml-1 bg-green-500/10 text-green-500 border-green-200">
              {onlineCount} online
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" title="New Message">
          <MessageSquarePlus className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9" 
            placeholder="Search messages..." 
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </div>
      
      <div className="px-3 pt-3">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="online">
              Online ({onlineCount})
            </TabsTrigger>
            <TabsTrigger value="favorites">
              Favorites ({favoriteUsers.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-0.5">
          {loading && (
            <div className="space-y-3 p-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                    {i % 3 === 0 && <Skeleton className="h-5 w-5 rounded-full" />}
                </div>
              ))}
            </div>
          )}
          
          {!loading && displayedUsers.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery 
                ? `No users found matching "${searchQuery}"`
                : activeTab === 'online' 
                  ? 'No users are currently online'
                  : activeTab === 'favorites'
                    ? 'You have no favorite contacts'
                    : 'No conversations available'}
            </div>
          )}
          
          {!loading && displayedUsers.map((convo: User) => (
            <ConversationListItem key={convo.uid} convo={convo} />
          ))}
          
          {error && <p className="p-4 text-sm text-destructive">Error loading conversations.</p>}
        </nav>
      </ScrollArea>
      
      {user && (
        <div className="p-3 border-t flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.photoURL || undefined} />
            <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{user.displayName || user.email?.split('@')[0]}</p>
            <div className="flex items-center gap-1">
              <CircleDot className="h-3 w-3 text-green-500" />
              <span className="text-xs text-muted-foreground">Online</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Bell className="h-4 w-4 mr-2" />
                Notification Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Users className="h-4 w-4 mr-2" />
                Manage Contacts
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
