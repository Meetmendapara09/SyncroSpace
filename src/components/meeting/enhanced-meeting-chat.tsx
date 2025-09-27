'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import {
  toggleChatWindow,
  clearUnreadCount,
  pushNewGlobalMessage,
  pushNewOfficeMessage,
} from '@/lib/redux/features/chat/chatSlice';
import { featureIntegration, eventBus } from '@/lib/feature-integration';
import { auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useSyncroSpaceFeatures } from '@/lib/hooks/use-syncrospace-features';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, MessageSquare, Users, ChevronDown, Bell, X } from 'lucide-react';

// Types
type ChatMode = 'office' | 'global';

interface ChatMessageProps {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  type: ChatMode;
  avatar?: string;
  position?: { x: number; y: number };
}

// Helper to format timestamps
const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

// Helper to get initials for avatar fallback
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// ChatNotifications component to show unread messages
export function ChatNotifications() {
  const dispatch = useAppDispatch();
  const unreadCount = useAppSelector((state) => state.chat.unreadCount);
  const recentMessages = useAppSelector((state) => {
    // Get the 3 most recent messages from both chat types
    const messages = [...state.chat.officeChatMessages, ...state.chat.globalChatMessages];
    messages.sort((a, b) => b.timestamp - a.timestamp);
    return messages.slice(0, 3);
  });
  
  if (unreadCount === 0) return null;
  
  return (
    <div className="fixed bottom-16 right-4 z-20 flex flex-col gap-2 max-w-xs">
      {recentMessages.map((message) => (
        <Card key={message.id} className="shadow-lg border-primary/20 animate-slideUp">
          <div className="flex p-2 items-center gap-2">
            <Avatar className="h-8 w-8">
              {/* Use a default avatar for all users */}
              <AvatarImage src={`/assets/characters/avatars/adam.png`} />
              <AvatarFallback>{getInitials(message.username)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium text-xs">{message.username}</p>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5"
                  onClick={() => dispatch(toggleChatWindow())}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {message.type === 'office' ? (
                  <span className="text-blue-400 mr-1">[Nearby]</span>
                ) : null}
                {message.message}
              </p>
            </div>
          </div>
        </Card>
      ))}
      
      {unreadCount > 0 && (
        <Button 
          variant="default" 
          size="sm" 
          className="ml-auto"
          onClick={() => dispatch(toggleChatWindow())}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          {unreadCount} new {unreadCount === 1 ? 'message' : 'messages'}
        </Button>
      )}
    </div>
  );
}

// Main chat component
export function MeetingChat() {
  const [user] = useAuthState(auth);
  const [chatMode, setChatMode] = useState<ChatMode>('office');
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { sendMessage } = useSyncroSpaceFeatures();
  
  const dispatch = useAppDispatch();
  const isChatOpen = useAppSelector((state) => state.chat.isChatWindowOpen);
  const officeChatMessages = useAppSelector((state) => state.chat.officeChatMessages);
  const globalChatMessages = useAppSelector((state) => state.chat.globalChatMessages);
  const currentOffice = useAppSelector((state) => state.room.currentOffice);
  const nearbyUserIds = useAppSelector((state) => state.user.nearbyUsers);
  
  // Filter messages based on chat mode
  const displayMessages = chatMode === 'office' 
    ? officeChatMessages.filter(msg => {
      // Office chat - only show messages from nearby users
      return msg.type === 'office' && 
        (nearbyUserIds.includes(msg.userId) || msg.userId === user?.uid);
    })
    : globalChatMessages;
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages]);
  
  // Clear unread count when chat window is opened
  useEffect(() => {
    if (isChatOpen) {
      dispatch(clearUnreadCount());
    }
  }, [isChatOpen, dispatch]);
  
  // Listen for message events
  useEffect(() => {
    const handleMessage = (message: ChatMessageProps) => {
      if (message.type === 'global') {
        dispatch(pushNewGlobalMessage(message));
      } else {
        dispatch(pushNewOfficeMessage(message));
      }
    };
    
    eventBus.on('message:received', handleMessage);
    
    return () => {
      eventBus.off('message:received', handleMessage);
    };
  }, [dispatch]);
  
  // Handle sending messages
  const handleSendMessage = () => {
    if (!currentMessage.trim() || !user) return;
    
    const currentUsername = user.displayName || user.email?.split('@')[0] || 'Anonymous';
    
    // For office chat, we need to know the current office
    if (currentOffice) {
      sendMessage(currentMessage.trim(), chatMode);
      setCurrentMessage('');
      
      // Focus the input field again after sending
      inputRef.current?.focus();
    }
  };
  
  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  if (!isChatOpen) {
    return (
      <Button
        className="fixed bottom-4 right-4 z-10 shadow-lg"
        onClick={() => dispatch(toggleChatWindow())}
      >
        <MessageSquare className="mr-2 h-4 w-4" />
        Chat
      </Button>
    );
  }
  
  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg z-30">
      <CardHeader className="p-3 border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="font-medium text-sm">Chat</h3>
            {displayMessages.length > 0 && (
              <Badge variant="secondary" className="h-5 text-xs">
                {displayMessages.length}
              </Badge>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => dispatch(toggleChatWindow())}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
        
        <Tabs defaultValue="office" className="w-full">
          <TabsList className="grid grid-cols-2 h-8">
            <TabsTrigger 
              value="office" 
              className="text-xs"
              onClick={() => setChatMode('office')}
            >
              <Users className="h-3 w-3 mr-1" />
              Proximity
            </TabsTrigger>
            <TabsTrigger 
              value="global" 
              className="text-xs"
              onClick={() => setChatMode('global')}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Room Chat
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-64 px-3 py-2">
          <div className="space-y-3">
            {displayMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-8 text-center">
                {chatMode === 'office' 
                  ? "Messages from nearby users will appear here." 
                  : "No messages in this room yet. Start the conversation!"}
              </div>
            ) : (
              displayMessages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.userId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                  {msg.userId !== user?.uid && (
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarImage src="/assets/characters/avatars/adam.png" />
                      <AvatarFallback>{getInitials(msg.username)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div 
                    className={`rounded-lg p-2 max-w-[85%] ${
                      msg.userId === user?.uid 
                        ? 'bg-primary text-white' 
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {msg.userId !== user?.uid && (
                      <p className="text-xs font-medium mb-1">{msg.username}</p>
                    )}
                    <p className="text-sm break-words">{msg.message}</p>
                    <p className="text-xs opacity-70 text-right mt-1">
                      {formatTimestamp(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="p-3 border-t">
        <form 
          className="flex w-full gap-2" 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
        >
          <Input
            ref={inputRef}
            placeholder={
              chatMode === 'office' 
                ? "Chat with nearby users..." 
                : "Send a message to everyone..."
            }
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            className="text-sm"
          />
          <Button type="submit" size="icon" disabled={!currentMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
      
      {chatMode === 'office' && nearbyUserIds.length === 0 && (
        <div className="bg-yellow-50 p-2 text-xs text-yellow-800 border-t">
          <Bell className="h-3 w-3 inline mr-1" /> No users nearby. Move closer to someone to chat.
        </div>
      )}
    </Card>
  );
}

export default MeetingChat;