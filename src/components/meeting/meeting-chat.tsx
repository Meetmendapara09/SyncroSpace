'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Users, Globe, X } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { addMessage, toggleChatWindow } from '@/lib/redux/features/chat/chatSlice';
import { networkManager } from '@/lib/colyseus-network';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

type ChatMode = 'office' | 'global';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  type: ChatMode;
}

interface MeetingChatProps {
  currentUserId: string;
  currentUsername: string;
  nearbyUserIds: string[];
}

export function MeetingChat({ 
  currentUserId, 
  currentUsername, 
  nearbyUserIds 
}: MeetingChatProps) {
  const dispatch = useAppDispatch();
  const [currentMessage, setCurrentMessage] = useState('');
  const [chatMode, setChatMode] = useState<ChatMode>('office');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Redux state
  const isChatWindowOpen = useAppSelector((state) => state.chat.isChatWindowOpen);
  const messages = useAppSelector((state) => state.chat.messages);
  const unreadCount = useAppSelector((state) => state.chat.unreadCount);
  const currentOffice = useAppSelector((state) => state.room.currentOffice);

  // Filter messages based on chat mode
  const filteredMessages = messages.filter(msg => {
    if (chatMode === 'global') {
      return msg.type === 'global';
    } else {
      // Office chat - only show messages from nearby users
      return msg.type === 'office' && 
             (nearbyUserIds.includes(msg.userId) || msg.userId === currentUserId);
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: currentUserId,
      username: currentUsername,
      message: currentMessage.trim(),
      timestamp: Date.now(),
      type: chatMode,
    };

    // Send via Colyseus network
    if (chatMode === 'global') {
      networkManager.sendGlobalMessage(currentUsername, currentMessage.trim());
    } else {
      // For office chat, we need to know the current office
      if (currentOffice) {
        networkManager.sendOfficeMessage(currentUsername, currentMessage.trim(), currentOffice as any);
      }
    }

    // Also dispatch to local Redux store
    dispatch(addMessage(newMessage));
    setCurrentMessage('');
  };

  const toggleChat = () => {
    dispatch(toggleChatWindow());
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isChatWindowOpen) {
    return (
      <div className="fixed bottom-24 right-6 z-50">
        <Button
          onClick={toggleChat}
          className="relative bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg"
        >
          <Users className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 bg-red-500 text-white px-2 py-1 text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 w-80 h-96 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">Chat</h3>
          <div className="flex gap-1">
            <button
              onClick={() => setChatMode('office')}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                chatMode === 'office'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Users className="h-3 w-3" />
              Nearby ({nearbyUserIds.length})
            </button>
            <button
              onClick={() => setChatMode('global')}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                chatMode === 'global'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Globe className="h-3 w-3" />
              Global
            </button>
          </div>
        </div>
        <Button
          onClick={toggleChat}
          variant="ghost"
          size="sm"
          className="p-1 h-auto"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {filteredMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {chatMode === 'office' 
                  ? 'Move closer to other participants to start chatting!' 
                  : 'No global messages yet. Start the conversation!'}
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.userId === currentUserId ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-3 py-2 ${
                    msg.userId === currentUserId
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {msg.userId !== currentUserId && (
                    <div className="text-xs font-medium mb-1 opacity-70">
                      {msg.username}
                    </div>
                  )}
                  <p className="text-sm break-words">{msg.message}</p>
                </div>
                <span className="text-xs text-gray-500 mt-1">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <Input
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            placeholder={
              chatMode === 'office' 
                ? 'Message nearby participants...' 
                : 'Message everyone...'
            }
            className="flex-1"
          />
          <Button
            type="submit"
            size="sm"
            className="px-3"
            disabled={!currentMessage.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {chatMode === 'office' && nearbyUserIds.length === 0 && (
          <p className="text-xs text-amber-600 mt-2">
            ⚠️ No one nearby to receive your message
          </p>
        )}
      </form>
    </div>
  );
}

// Simple notification component for new messages
export function ChatNotifications() {
  const messages = useAppSelector((state) => state.chat.messages);
  const isChatWindowOpen = useAppSelector((state) => state.chat.isChatWindowOpen);
  const [visibleNotifications, setVisibleNotifications] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!isChatWindowOpen && messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      const isOwnMessage = false; // Would need to check against current user
      
      if (!isOwnMessage) {
        setVisibleNotifications(prev => [...prev, latestMessage]);
        
        // Auto-hide notification after 5 seconds
        setTimeout(() => {
          setVisibleNotifications(prev => 
            prev.filter(notif => notif.id !== latestMessage.id)
          );
        }, 5000);
      }
    }
  }, [messages, isChatWindowOpen]);

  if (visibleNotifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-50 space-y-2">
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-sm animate-in slide-in-from-right"
        >
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
              {notification.username[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm truncate">{notification.username}</p>
                {notification.type === 'office' ? (
                  <Users className="h-3 w-3 text-blue-500" />
                ) : (
                  <Globe className="h-3 w-3 text-green-500" />
                )}
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
            </div>
            <button
              onClick={() => setVisibleNotifications(prev => 
                prev.filter(notif => notif.id !== notification.id)
              )}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}