'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Send, ArrowLeft, Clock, CheckCheck, Check, SmilePlus, Paperclip, FileText, ImageIcon, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth, rtdb } from '@/lib/firebase';
import { ref as rtdbRef, push, serverTimestamp, onValue, set, update } from 'firebase/database';
import { useAuthState } from 'react-firebase-hooks/auth';
import { EmojiPicker } from './emoji-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ThreadReplyProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string | null;
  spaceId: string;
  channelId?: string; // Optional for DMs
}

interface Message {
  id: string;
  uid: string;
  name: string;
  avatar?: string;
  message: string;
  type: 'text' | 'reaction' | 'image' | 'file' | 'audio';
  timestamp: any;
  readBy?: string[];
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  replyToId?: string;
  replyToName?: string;
  replyToMessage?: string;
  reactions?: Record<string, Reaction>;
  threadId?: string;
  isThreadReply?: boolean;
}

interface Reaction {
  users: Array<{
    uid: string;
    name: string;
  }>;
}

export function ThreadReplyDialog({ isOpen, onClose, messageId, spaceId, channelId }: ThreadReplyProps) {
  const [user] = useAuthState(auth);
  const [parentMessage, setParentMessage] = useState<Message | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [newReply, setNewReply] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch parent message and thread replies
  useEffect(() => {
    if (!isOpen || !messageId || !spaceId) return;

    // First get the parent message
    const parentMessageRef = rtdbRef(rtdb, `spaces/${spaceId}/messages/${messageId}`);
    const unsubParent = onValue(parentMessageRef, (snapshot) => {
      const messageData = snapshot.val();
      if (messageData) {
        setParentMessage({ ...messageData, id: messageId });
      }
      setLoading(false);
    });

    // Then get thread replies
    const threadRef = rtdbRef(rtdb, `spaces/${spaceId}/threads/${messageId}`);
    const unsubThread = onValue(threadRef, (snapshot) => {
      const threadData = snapshot.val();
      const replies = threadData
        ? Object.entries(threadData).map(([id, data]) => ({ 
            ...(data as any), 
            id,
            isThreadReply: true,
            threadId: messageId
          }))
        : [];
      replies.sort((a, b) => ((a as Message).timestamp || 0) - ((b as Message).timestamp || 0));
      setThreadMessages(replies as Message[]);
      setLoading(false);
    });

    return () => {
      unsubParent();
      unsubThread();
    };
  }, [isOpen, messageId, spaceId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!user || !messageId || !spaceId || (!newReply.trim() && !file)) return;

    try {
      const threadRef = rtdbRef(rtdb, `spaces/${spaceId}/threads/${messageId}`);
      const replyRef = push(threadRef);
      
      const replyData = {
        uid: user.uid,
        name: user.displayName || 'Anonymous',
        avatar: user.photoURL || '',
        message: newReply.trim(),
        type: 'text',
        timestamp: serverTimestamp(),
        readBy: [user.uid]
      };

      // Update thread count on parent message if this is first reply
      if (threadMessages.length === 0) {
        const parentRef = rtdbRef(rtdb, `spaces/${spaceId}/messages/${messageId}`);
        update(parentRef, {
          hasThread: true,
          threadCount: 1
        });
      } else {
        // Increment thread count
        const parentRef = rtdbRef(rtdb, `spaces/${spaceId}/messages/${messageId}`);
        update(parentRef, {
          threadCount: threadMessages.length + 1
        });
      }

      // Set the reply
      await set(replyRef, replyData);
      setNewReply('');
    } catch (error) {
      console.error('Failed to send reply:', error);
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setNewReply(prev => prev + emoji);
    setShowEmoji(false);
    // Focus input after selecting emoji
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Format time
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  // Format date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return 'Today';
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric'
    });
  };

  // Get message status (read/delivered)
  const getMessageStatus = (message: Message) => {
    if (!message.readBy) return <Check className="h-4 w-4" />;
    return message.readBy.length > 1 
      ? <CheckCheck className="h-4 w-4 text-blue-500" /> 
      : <Check className="h-4 w-4" />;
  };

  // Calculate file size display
  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 lg:hidden" 
              onClick={onClose}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-base">Thread</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Original message */}
          {parentMessage && (
            <div className="border-b p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={parentMessage.avatar} alt={parentMessage.name} />
                  <AvatarFallback>{parentMessage.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center">
                    <span className="font-medium text-sm">{parentMessage.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {formatDate(parentMessage.timestamp)} at {formatTime(parentMessage.timestamp)}
                    </span>
                  </div>
                  
                  <div className="text-sm">
                    {parentMessage.type === 'text' ? (
                      <p>{parentMessage.message}</p>
                    ) : parentMessage.type === 'image' ? (
                      <div>
                        <div className="mt-1 relative rounded-md overflow-hidden max-w-[240px]">
                          <img 
                            src={parentMessage.message} 
                            alt="Image" 
                            className="object-cover rounded-md max-w-full"
                          />
                        </div>
                        {parentMessage.fileName && (
                          <p className="mt-1 text-xs opacity-70">{parentMessage.fileName}</p>
                        )}
                      </div>
                    ) : parentMessage.type === 'file' ? (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="bg-background rounded p-2">
                          <FileText className="h-6 w-6 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <a
                            href={parentMessage.message}
                            download={parentMessage.fileName || true}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:underline truncate block"
                          >
                            {parentMessage.fileName || 'Download file'}
                          </a>
                          {parentMessage.fileSize && (
                            <span className="text-xs opacity-70">
                              {formatFileSize(parentMessage.fileSize)}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  
                  {/* Thread count */}
                  <div className="flex items-center text-xs text-primary mt-1">
                    <span>{threadMessages.length} {threadMessages.length === 1 ? 'reply' : 'replies'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Thread messages */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {threadMessages.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No replies yet</p>
                  <p className="text-sm mt-1">Be the first to reply to this thread</p>
                </div>
              ) : (
                threadMessages.map((message) => (
                  <div key={message.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.avatar} alt={message.name} />
                      <AvatarFallback>{message.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="font-medium text-sm">{message.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      
                      <div className="text-sm mt-1">
                        {message.type === 'text' && <p>{message.message}</p>}
                        {message.type === 'image' && (
                          <div className="mt-1 relative rounded-md overflow-hidden max-w-[240px]">
                            <img 
                              src={message.message} 
                              alt="Image" 
                              className="object-cover rounded-md max-w-full"
                            />
                          </div>
                        )}
                        {message.type === 'file' && (
                          <div className="flex items-center gap-2 mt-1">
                            <FileText className="h-5 w-5 text-blue-500" />
                            <a
                              href={message.message}
                              download={message.fileName || true}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium hover:underline"
                            >
                              {message.fileName || 'Download file'}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          {/* Reply input */}
          <div className="border-t p-4">
            <form onSubmit={handleSendReply} className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  placeholder="Reply in thread..."
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  className="pr-10"
                  disabled={!user}
                  ref={inputRef}
                />
                <Popover open={showEmoji} onOpenChange={(open) => {
                  setShowEmoji(open);
                }}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 bottom-1/2 transform translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <SmilePlus className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="end" className="p-0 border-none">
                    <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                  </PopoverContent>
                </Popover>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={!user}
                    className="shrink-0"
                    title="Attach"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="top" className="w-56 p-2">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => {
                        fileInputRef.current!.accept = 'image/*';
                        fileInputRef.current?.click();
                      }}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => {
                        fileInputRef.current!.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt';
                        fileInputRef.current?.click();
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Upload Document
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => {
                        fileInputRef.current!.accept = 'audio/*';
                        fileInputRef.current?.click();
                      }}
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      Upload Audio
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setFile(e.target.files[0]);
                  }
                }}
              />
              
              <Button
                type="submit"
                disabled={!newReply.trim() && !file}
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}