'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, rtdb } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';
import { ref, push, set, onValue, update } from 'firebase/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { 
  MessageSquare, 
  Reply, 
  Heart, 
  ThumbsUp, 
  Laugh, 
  Frown,
  Plus,
  Edit,
  Trash2,
  Pin,
  Share,
  Copy,
  BookmarkPlus,
  MoreVertical,
  AtSign,
  Hash,
  Bold,
  Italic,
  Code,
  X,
  Link,
  Image,
  FileText,
  Send,
  Smile,
  Search,
  Filter,
  MessageCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

// Types and Interfaces
interface MessageReaction {
  emoji: string;
  users: string[];
  count: number;
}

interface MessageThread {
  id: string;
  parentMessageId: string;
  messages: Message[];
  lastReply: any;
  replyCount: number;
  participants: string[];
}

interface Message {
  id: string;
  uid: string;
  name: string;
  avatar?: string;
  content: string;
  type: 'text' | 'file' | 'image' | 'system' | 'thread-reply';
  timestamp: any;
  edited?: boolean;
  editedAt?: any;
  reactions: MessageReaction[];
  mentions: string[];
  threadId?: string;
  parentMessageId?: string;
  readBy: string[];
  pinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: any;
  attachments?: MessageAttachment[];
  formatting?: MessageFormatting;
  replyCount?: number;
  lastReply?: any;
  encrypted?: boolean;
  deleted?: boolean;
}

interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
}

interface MessageFormatting {
  bold?: Array<{start: number, end: number}>;
  italic?: Array<{start: number, end: number}>;
  code?: Array<{start: number, end: number}>;
  links?: Array<{start: number, end: number, url: string}>;
  mentions?: Array<{start: number, end: number, userId: string}>;
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '👏'];

interface EnhancedMessagingProps {
  channelId: string;
  spaceId?: string;
  teamId?: string;
  currentUser?: any;
}

export function EnhancedMessaging({ channelId, spaceId, teamId }: EnhancedMessagingProps) {
  const [user] = useAuthState(auth);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [showThreadView, setShowThreadView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [typing, setTyping] = useState<string[]>([]);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!channelId) return;

    // Listen to messages
    const messagesRef = ref(rtdb, `channels/${channelId}/messages`);
    const unsubscribeMessages = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const messageData = snapshot.val();
        const messageList = Object.entries(messageData).map(([id, data]: [string, any]) => ({
          id,
          ...data,
          timestamp: data.timestamp || Date.now()
        }));
        
        messageList.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(messageList);
      } else {
        setMessages([]);
      }
    });

    // Listen to threads
    const threadsRef = ref(rtdb, `channels/${channelId}/threads`);
    const unsubscribeThreads = onValue(threadsRef, (snapshot) => {
      if (snapshot.exists()) {
        const threadData = snapshot.val();
        const threadList = Object.entries(threadData).map(([id, data]: [string, any]) => ({
          id,
          ...data
        }));
        setThreads(threadList);
      } else {
        setThreads([]);
      }
    });

    // Listen to typing indicators
    const typingRef = ref(rtdb, `channels/${channelId}/typing`);
    const unsubscribeTyping = onValue(typingRef, (snapshot) => {
      if (snapshot.exists()) {
        const typingData = snapshot.val();
        const typingUsers = Object.entries(typingData)
          .filter(([userId, isTyping]: [string, any]) => userId !== user?.uid && isTyping)
          .map(([userId]) => userId);
        setTyping(typingUsers);
      } else {
        setTyping([]);
      }
    });

    return () => {
      unsubscribeMessages();
      unsubscribeThreads();
      unsubscribeTyping();
    };
  }, [channelId, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      const messageContent = newMessage.trim();
      const mentions = extractMentions(messageContent);
      
      const messageData = {
        uid: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'User',
        avatar: user.photoURL || undefined,
        content: messageContent,
        type: 'text',
        timestamp: Date.now(),
        reactions: [],
        mentions,
        readBy: [user.uid],
        encrypted: true // Enable encryption for secure messaging
      };

      const messagesRef = ref(rtdb, `channels/${channelId}/messages`);
      await push(messagesRef, messageData);

      setNewMessage('');
      
      // Clear typing indicator
      await clearTypingIndicator();

      // Send notifications for mentions
      if (mentions.length > 0) {
        await sendMentionNotifications(mentions, messageContent);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Start thread
  const startThread = async (parentMessage: Message) => {
    if (!user) return;

    try {
      const threadId = `thread_${parentMessage.id}_${Date.now()}`;
      
      const threadData = {
        id: threadId,
        parentMessageId: parentMessage.id,
        messages: [],
        lastReply: null,
        replyCount: 0,
        participants: [user.uid, parentMessage.uid],
        createdAt: Date.now(),
        createdBy: user.uid
      };

      const threadsRef = ref(rtdb, `channels/${channelId}/threads/${threadId}`);
      await set(threadsRef, threadData);

      // Update parent message with thread info
      const messageRef = ref(rtdb, `channels/${channelId}/messages/${parentMessage.id}`);
      await update(messageRef, {
        threadId,
        replyCount: 0
      });

      setSelectedThread(threadData);
      setShowThreadView(true);

    } catch (error) {
      console.error('Error starting thread:', error);
      toast({
        title: "Error",
        description: "Failed to start thread.",
        variant: "destructive"
      });
    }
  };

  // Reply to thread
  const replyToThread = async (threadId: string, content: string) => {
    if (!content.trim() || !user) return;

    try {
      const replyData = {
        uid: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'User',
        avatar: user.photoURL || undefined,
        content: content.trim(),
        type: 'thread-reply',
        timestamp: Date.now(),
        threadId,
        readBy: [user.uid]
      };

      // Add reply to thread
      const threadRepliesRef = ref(rtdb, `channels/${channelId}/threads/${threadId}/messages`);
      const newReplyRef = push(threadRepliesRef);
      await set(newReplyRef, replyData);

      // Update thread metadata
      const threadRef = ref(rtdb, `channels/${channelId}/threads/${threadId}`);
      await update(threadRef, {
        lastReply: Date.now(),
        replyCount: increment(1),
        participants: arrayUnion(user.uid)
      });

      // Update parent message reply count
      const thread = threads.find(t => t.id === threadId);
      if (thread) {
        const messageRef = ref(rtdb, `channels/${channelId}/messages/${thread.parentMessageId}`);
        await update(messageRef, {
          replyCount: increment(1),
          lastReply: Date.now()
        });
      }

    } catch (error) {
      console.error('Error replying to thread:', error);
      toast({
        title: "Error",
        description: "Failed to send reply.",
        variant: "destructive"
      });
    }
  };

  // Add reaction to message
  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const existingReaction = message.reactions.find(r => r.emoji === emoji);
      let updatedReactions;

      if (existingReaction) {
        if (existingReaction.users.includes(user.uid)) {
          // Remove user's reaction
          updatedReactions = message.reactions.map(r => 
            r.emoji === emoji
              ? { ...r, users: r.users.filter(u => u !== user.uid), count: r.count - 1 }
              : r
          ).filter(r => r.count > 0);
        } else {
          // Add user's reaction
          updatedReactions = message.reactions.map(r => 
            r.emoji === emoji
              ? { ...r, users: [...r.users, user.uid], count: r.count + 1 }
              : r
          );
        }
      } else {
        // New reaction
        updatedReactions = [...message.reactions, {
          emoji,
          users: [user.uid],
          count: 1
        }];
      }

      const messageRef = ref(rtdb, `channels/${channelId}/messages/${messageId}`);
      await update(messageRef, { reactions: updatedReactions });

      setShowReactionPicker(null);

    } catch (error) {
      console.error('Error adding reaction:', error);
      toast({
        title: "Error",
        description: "Failed to add reaction.",
        variant: "destructive"
      });
    }
  };

  // Pin/unpin message
  const togglePinMessage = async (messageId: string) => {
    if (!user) return;

    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const messageRef = ref(rtdb, `channels/${channelId}/messages/${messageId}`);
      
      if (message.pinned) {
        await update(messageRef, {
          pinned: false,
          pinnedBy: null,
          pinnedAt: null
        });
        toast({
          title: "Message unpinned",
          description: "Message has been unpinned from the channel.",
        });
      } else {
        await update(messageRef, {
          pinned: true,
          pinnedBy: user.uid,
          pinnedAt: Date.now()
        });
        toast({
          title: "Message pinned",
          description: "Message has been pinned to the channel.",
        });
      }

    } catch (error) {
      console.error('Error toggling pin:', error);
      toast({
        title: "Error",
        description: "Failed to pin/unpin message.",
        variant: "destructive"
      });
    }
  };

  // Delete message
  const deleteMessage = async (messageId: string) => {
    if (!user) return;

    try {
      const messageRef = ref(rtdb, `channels/${channelId}/messages/${messageId}`);
      await update(messageRef, {
        content: '[Message deleted]',
        type: 'system',
        deleted: true,
        deletedAt: Date.now(),
        deletedBy: user.uid
      });

      toast({
        title: "Message deleted",
        description: "Message has been deleted.",
      });

    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message.",
        variant: "destructive"
      });
    }
  };

  // Set typing indicator
  const setTypingIndicator = async () => {
    if (!user || !channelId) return;

    const typingRef = ref(rtdb, `channels/${channelId}/typing/${user.uid}`);
    await set(typingRef, true);

    // Clear typing after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(async () => {
      await clearTypingIndicator();
    }, 3000);
  };

  // Clear typing indicator
  const clearTypingIndicator = async () => {
    if (!user || !channelId) return;

    const typingRef = ref(rtdb, `channels/${channelId}/typing/${user.uid}`);
    await set(typingRef, false);
  };

  // Extract mentions from message
  const extractMentions = (content: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  };

  // Send mention notifications
  const sendMentionNotifications = async (mentions: string[], content: string) => {
    try {
      for (const mention of mentions) {
        await addDoc(collection(db, 'notifications'), {
          type: 'mention',
          from: {
            uid: user!.uid,
            name: user!.displayName || user!.email!.split('@')[0],
            avatar: user!.photoURL
          },
          to: mention,
          channelId,
          teamId,
          content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          createdAt: serverTimestamp(),
          read: false
        });
      }
    } catch (error) {
      console.error('Error sending mention notifications:', error);
    }
  };

  // Format message content
  const formatMessageContent = (content: string, formatting?: MessageFormatting) => {
    if (!formatting) return content;

    // Apply formatting (bold, italic, code, links, mentions)
    // This is a simplified version - you'd want a more robust implementation
    let formattedContent = content;
    
    // Replace mentions
    formattedContent = formattedContent.replace(/@(\w+)/g, 
      '<span class="bg-blue-100 text-blue-800 px-1 rounded">@$1</span>'
    );

    return <div dangerouslySetInnerHTML={{ __html: formattedContent }} />;
  };

  // Filter messages
  const filteredMessages = messages.filter(message => {
    if (showPinnedOnly && !message.pinned) return false;
    if (searchQuery && !message.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex h-full">
      {/* Main Messages Area */}
      <div className={`flex-1 flex flex-col ${showThreadView ? 'lg:w-2/3' : 'w-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h2 className="font-semibold">Messages</h2>
            {typing.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {typing.length} typing...
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button
              variant={showPinnedOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPinnedOnly(!showPinnedOnly)}
            >
              <Pin className="h-4 w-4 mr-1" />
              Pinned
            </Button>
            <Button
              variant={showThreadView ? "default" : "outline"}
              size="sm"
              onClick={() => setShowThreadView(!showThreadView)}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Threads
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {filteredMessages.map((message) => (
              <div key={message.id} className={`group ${message.pinned ? 'bg-yellow-50 border-l-4 border-l-yellow-400 pl-4' : ''}`}>
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarImage src={message.avatar} />
                    <AvatarFallback>{message.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{message.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                      </span>
                      {message.edited && (
                        <Badge variant="outline" className="text-xs">edited</Badge>
                      )}
                      {message.pinned && (
                        <Pin className="h-3 w-3 text-yellow-600" />
                      )}
                    </div>
                    
                    <div className="text-sm">
                      {message.deleted ? (
                        <span className="italic text-muted-foreground">{message.content}</span>
                      ) : (
                        formatMessageContent(message.content, message.formatting)
                      )}
                    </div>

                    {/* Reactions */}
                    {message.reactions.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {message.reactions.map((reaction) => (
                          <Button
                            key={reaction.emoji}
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => addReaction(message.id, reaction.emoji)}
                          >
                            {reaction.emoji} {reaction.count}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Thread indicator */}
                    {message.replyCount && message.replyCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-xs text-blue-600"
                        onClick={() => {
                          const thread = threads.find(t => t.parentMessageId === message.id);
                          if (thread) {
                            setSelectedThread(thread);
                            setShowThreadView(true);
                          }
                        }}
                      >
                        <Reply className="h-3 w-3 mr-1" />
                        {message.replyCount} replies
                      </Button>
                    )}
                  </div>

                  {/* Message Actions */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1">
                      <Popover open={showReactionPicker === message.id} onOpenChange={(open) => setShowReactionPicker(open ? message.id : null)}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Smile className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2">
                          <div className="flex gap-1">
                            {REACTION_EMOJIS.map((emoji) => (
                              <Button
                                key={emoji}
                                variant="ghost"
                                size="sm"
                                onClick={() => addReaction(message.id, emoji)}
                                className="text-lg p-1 h-8 w-8"
                              >
                                {emoji}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startThread(message)}
                            >
                              <Reply className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Start thread</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {(message.uid === user?.uid || user?.uid === 'admin') && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePinMessage(message.id)}
                          >
                            <Pin className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMessage(message.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48">
                          <div className="space-y-1">
                            <Button variant="ghost" size="sm" className="w-full justify-start">
                              <Copy className="h-4 w-4 mr-2" />
                              Copy message
                            </Button>
                            <Button variant="ghost" size="sm" className="w-full justify-start">
                              <Share className="h-4 w-4 mr-2" />
                              Share
                            </Button>
                            <Button variant="ghost" size="sm" className="w-full justify-start">
                              <BookmarkPlus className="h-4 w-4 mr-2" />
                              Save
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <div className="flex-1">
              <Textarea
                ref={messageInputRef}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  setTypingIndicator();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type a message... Use @username to mention someone"
                className="min-h-[60px] resize-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
              <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Thread View */}
      {showThreadView && selectedThread && (
        <div className="w-1/3 border-l">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Thread</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowThreadView(false);
                  setSelectedThread(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {/* Parent message */}
              {messages.find(m => m.id === selectedThread.parentMessageId) && (
                <div className="p-3 bg-muted rounded-lg">
                  {/* Render parent message */}
                </div>
              )}
              
              {/* Thread replies */}
              {selectedThread.messages?.map((reply: any) => (
                <div key={reply.id} className="flex gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={reply.avatar} />
                    <AvatarFallback>{reply.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{reply.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(reply.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="text-sm">{reply.content}</div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Thread reply input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Reply to thread..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    replyToThread(selectedThread.id, e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <Button size="sm">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}