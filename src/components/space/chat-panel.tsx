'use client';

import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { 
  Send, 
  ThumbsUp, 
  Paperclip, 
  Check, 
  CheckCheck, 
  SmilePlus, 
  ImageIcon, 
  FileIcon, 
  MoreHorizontal,
  Camera,
  FileText,
  Mic,
  Clock,
  X,
  Search,
  Filter,
  ArrowUp
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, rtdb } from '@/lib/firebase';
import { ref as rtdbRef, push, serverTimestamp as rtdbTimestamp, onValue, set, update, get } from 'firebase/database';
import { uploadFile } from '@/lib/firebase-upload';
import { Skeleton } from '../ui/skeleton';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmojiPicker } from '../chat/emoji-picker';
import { SearchDialog } from '../chat/search-dialog';
import { ThreadReplyDialog } from '../chat/thread-reply-dialog';

interface Participant {
    uid: string;
    name: string;
    photoURL?: string;
    dnd?: boolean;
}

interface ChatPanelProps {
    participants: Participant[];
    spaceName: string;
    spaceId: string;
    canRead?: boolean; // optional: gate subscription based on membership/permissions
}

interface Reaction {
    emoji: string;
    users: {
        uid: string;
        name: string;
    }[];
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
    reactions?: Record<string, Reaction>; // Emoji reactions, keyed by emoji
    hasThread?: boolean; // Indicates if this message has a thread
    threadCount?: number; // Number of replies in thread
}

// Function to group messages by sender and time proximity
function groupMessages(messages: Message[]): Message[][] {
    const groups: Message[][] = [];
    let currentGroup: Message[] = [];
    let lastSender: string | null = null;
    let lastTimestamp: number | null = null;
    
    messages.forEach(message => {
        const timestamp = typeof message.timestamp === 'number' ? message.timestamp : 0;
        const messageDate = new Date(timestamp);
        const timeDiff = lastTimestamp ? timestamp - lastTimestamp : 0;
        
        // Start a new group if:
        // 1. This is a different sender, or
        // 2. More than 2 minutes passed since the last message, or
        // 3. This is a reaction (always keep reactions in their own group)
        if (
            lastSender !== message.uid || 
            timeDiff > 2 * 60 * 1000 || 
            currentGroup.length === 0 ||
            message.type === 'reaction'
        ) {
            if (currentGroup.length > 0) {
                groups.push([...currentGroup]);
            }
            currentGroup = [message];
        } else {
            currentGroup.push(message);
        }
        
        // Don't update lastSender for reactions to ensure they don't get grouped with regular messages
        if (message.type !== 'reaction') {
            lastSender = message.uid;
            lastTimestamp = timestamp;
        }
    });
    
    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }
    
    return groups;
}

// Format date with smart display (today, yesterday, or date)
function formatMessageDate(timestamp: any): string {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    
    // Set both dates to midnight for date comparison
    const dateDay = new Date(date);
    dateDay.setHours(0, 0, 0, 0);
    
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // Future date check (important for scheduled messages)
    if (dateDay.getTime() === tomorrow.getTime()) {
        return 'Tomorrow';
    }
    
    // Same day
    if (dateDay.getTime() === today.getTime()) {
        return 'Today';
    }
    
    // Yesterday
    if (dateDay.getTime() === yesterday.getTime()) {
        return 'Yesterday';
    }
    
    // Within last week, show day name
    const daysDiff = Math.floor((today.getTime() - dateDay.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 0 && daysDiff < 7) {
        return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    
    // Within next week (future scheduled messages)
    if (daysDiff < 0 && daysDiff > -7) {
        return 'Next ' + date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    
    // Otherwise show date with month name
    return date.toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
}

export function ChatPanel({ participants, spaceName, spaceId, canRead = true }: ChatPanelProps) {
    const [user] = useAuthState(auth);
    const [newMessage, setNewMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [groupedMessages, setGroupedMessages] = useState<Message[][]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [activeEmojiMessage, setActiveEmojiMessage] = useState<string | null>(null);
    // Removed duplicate declaration of scrollToMessageId
    const [threadReplyOpen, setThreadReplyOpen] = useState(false);
    const [activeThreadMessage, setActiveThreadMessage] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [searchDialogOpen, setSearchDialogOpen] = useState(false);
    const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(null);
    
    // Helper functions
    const getParticipant = (uid: string | undefined) => {
        if (!uid) return null;
        return participants.find(p => p.uid === uid);
    };

    const getMessageStatus = (message: Message) => {
        const totalParticipants = participants.length;
        const readCount = message.readBy?.length || 0;

        if (readCount >= totalParticipants) {
            return <CheckCheck className="h-4 w-4 text-blue-500" />;
        }
        if (readCount > 1) {
            return <CheckCheck className="h-4 w-4 text-slate-500" />;
        }
        return <Check className="h-4 w-4 text-slate-500" />;
    };

    const formatTime = (timestamp: any, includeDate: boolean = false) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        
        // Default time format
        const timeFormat = { hour: '2-digit', minute: '2-digit' } as const;
        
        // If message is not from today, include more date info
        if (includeDate || date.toDateString() !== now.toDateString()) {
            if (now.getFullYear() !== date.getFullYear()) {
                // Different year
                return date.toLocaleString([], { 
                    ...timeFormat,
                    month: 'short',
                    day: 'numeric',
                    year: '2-digit'
                });
            } else {
                // Same year, different day
                return date.toLocaleString([], { 
                    ...timeFormat,
                    month: 'short',
                    day: 'numeric'
                });
            }
        }
        
        // Just time for today's messages
        return date.toLocaleTimeString([], timeFormat);
    };
    
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    
    // Create grouped messages when messages change
    useEffect(() => {
        setGroupedMessages(groupMessages(messages));
    }, [messages]);

    // Real-time listener for messages
    useEffect(() => {
        if (!spaceId) {
            console.log('No spaceId provided to chat panel');
            return;
        }
        if (!canRead) {
            setLoading(false);
            setError('You do not have access to view messages in this space.');
            return;
        }
        const messagesRef = rtdbRef(rtdb, `spaces/${spaceId}/messages`);
        const unsubscribe = onValue(messagesRef, (snapshot) => {
            const val = snapshot.val();
            const messagesData = val
                ? Object.entries(val).map(([id, data]) =>
                    typeof data === 'object' && data !== null
                        ? { ...(data as Message), id }
                        : { id, timestamp: 0 }
                  )
                : [];
            messagesData.sort((a, b) => ((a as Message).timestamp || 0) - ((b as Message).timestamp || 0));
            setMessages(messagesData as Message[]);
            setLoading(false);
            setError(null);
        }, (err) => {
            setError(`Failed to load messages: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [spaceId, canRead]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [groupedMessages]);
    
    // Scroll to specific message when searching
    useEffect(() => {
        if (scrollToMessageId) {
            const messageElement = document.getElementById(`msg-${scrollToMessageId}`);
            if (messageElement) {
                messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                messageElement.classList.add('highlight-message');
                setTimeout(() => {
                    messageElement.classList.remove('highlight-message');
                }, 2000);
            }
            setScrollToMessageId(null);
        }
    }, [scrollToMessageId]);

    // Mark messages as read
    useEffect(() => {
        if (!user || messages.length === 0 || !spaceId) return;
        
        // Find messages that current user hasn't read yet
        const unreadMessages = messages.filter(msg => 
            msg.uid !== user.uid && 
            (!msg.readBy || !msg.readBy.includes(user.uid))
        );
        
        // Update each unread message
        unreadMessages.forEach(msg => {
            const msgRef = rtdbRef(rtdb, `spaces/${spaceId}/messages/${msg.id}`);
            const readBy = Array.isArray(msg.readBy) ? [...msg.readBy, user.uid] : [user.uid];
            update(msgRef, { readBy });
        });
    }, [messages, user, spaceId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !file) || !user || !spaceId) {
            console.log('Cannot send message:', { hasMessage: !!newMessage.trim(), hasUser: !!user, hasSpaceId: !!spaceId, hasFile: !!file });
            return;
        }
        try {
            const senderName = user.displayName || user.email?.split('@')[0] || 'User';
            let messageContent = newMessage.trim();
            let fileUrl = null;
            let fileType = 'text';
            if (file) {
                setUploadProgress(0);
                fileUrl = await uploadFile(file, 'chat', (progress) => {
                    setUploadProgress(progress);
                });
                messageContent = fileUrl;
                if (file.type.startsWith('image/')) {
                    fileType = 'image';
                } else if (file.type.startsWith('audio/')) {
                    fileType = 'audio';
                } else {
                    fileType = 'file';
                }
            }
            
            const msgRef = rtdbRef(rtdb, `spaces/${spaceId}/messages`);
            const newMsgRef = push(msgRef);
            
            const messageData: any = {
                uid: user.uid,
                name: senderName,
                avatar: user.photoURL || null,
                message: messageContent,
                type: fileType,
                timestamp: Date.now(),
                readBy: [user.uid],
            };
            
            // Add file data if present
            if (file) {
                messageData.fileName = file.name;
                messageData.fileType = file.type;
                messageData.fileSize = file.size;
            }
            
            // Add reply data if replying to another message
            if (replyingTo) {
                messageData.replyToId = replyingTo.id;
                messageData.replyToMessage = replyingTo.message;
                messageData.replyToName = replyingTo.name;
            }
            
            await set(newMsgRef, messageData);
            setNewMessage('');
            setFile(null);
            setReplyingTo(null);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            console.error('Error sending message:', err);
            setError(`Failed to send message: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setUploadProgress(0);
        }
    };

    const handleSendReaction = async (emoji: string = '👍', targetMessageId?: string) => {
        if (!user || !spaceId) return;

        // If a target message is provided, add a reaction to that message
        if (targetMessageId) {
            try {
                const senderName = user.displayName || user.email?.split('@')[0] || 'User';
                const msgRef = rtdbRef(rtdb, `spaces/${spaceId}/messages/${targetMessageId}`);
                
                // Get the current message to see if it already has reactions
                const snapshot = await get(msgRef);
                const currentMessage = snapshot.val();
                
                if (!currentMessage) {
                    console.error('Message not found');
                    return;
                }
                
                const existingReactions = currentMessage.reactions || {};
                
                // Check if the emoji already exists in reactions
                if (existingReactions[emoji]) {
                    // Check if user already reacted with this emoji
                    const userReacted = existingReactions[emoji].users.some(
                        (u: any) => u.uid === user.uid
                    );
                    
                    if (!userReacted) {
                        // Add user to existing emoji reaction
                        existingReactions[emoji].users.push({
                            uid: user.uid,
                            name: senderName
                        });
                    } else {
                        // Remove user from this reaction (toggle off)
                        existingReactions[emoji].users = existingReactions[emoji].users.filter(
                            (u: any) => u.uid !== user.uid
                        );
                        
                        // If no users left for this emoji, remove the reaction
                        if (existingReactions[emoji].users.length === 0) {
                            delete existingReactions[emoji];
                        }
                    }
                } else {
                    // Add new emoji reaction
                    existingReactions[emoji] = {
                        emoji,
                        users: [{
                            uid: user.uid,
                            name: senderName
                        }]
                    };
                }
                
                // Update the message with new reactions
                await update(msgRef, { reactions: existingReactions });
            } catch (err) {
                console.error('Error adding reaction to message:', err);
                setError('Failed to add reaction');
            }
        } else {
            // Send a standalone reaction message (original behavior)
            try {
                const senderName = user.displayName || user.email?.split('@')[0] || 'User';
                const msgRef = rtdbRef(rtdb, `spaces/${spaceId}/messages`);
                const newMsgRef = push(msgRef);
                await set(newMsgRef, {
                    uid: user.uid,
                    name: senderName,
                    avatar: user.photoURL || null,
                    message: emoji,
                    type: 'reaction',
                    timestamp: Date.now(),
                    readBy: [user.uid],
                });
            } catch (err) {
                console.error('Error sending reaction message:', err);
                setError('Failed to send reaction');
            }
        }
    };
    
    // Handle opening a thread reply
    const handleOpenThread = (messageId: string) => {
        setActiveThreadMessage(messageId);
        setThreadReplyOpen(true);
    };
    
    // Handle closing thread reply dialog
    const handleCloseThread = () => {
        setActiveThreadMessage(null);
        setThreadReplyOpen(false);
    };
    
    // Handle emoji selection
    const handleEmojiSelect = (emoji: string) => {
        // If there's an active message for reaction, send reaction instead of adding to message
        if (activeEmojiMessage) {
            handleSendReaction(emoji, activeEmojiMessage);
            setActiveEmojiMessage(null);
            setShowEmoji(false);
            return;
        }
        
        // Otherwise add emoji to message input
        setNewMessage(prev => prev + emoji);
        setShowEmoji(false);
        // Focus input after selecting emoji
        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
    };

    

    // Calculates file size display
    const formatFileSize = (size: number) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Get file icon based on file type with more detailed file types
    const getFileIcon = (fileType: string, fileName?: string) => {
        // Check by MIME type first
        if (fileType?.startsWith('image/')) {
            return <ImageIcon className="h-4 w-4 text-blue-500" />;
        }
        
        if (fileType?.startsWith('audio/')) {
            return <Mic className="h-4 w-4 text-green-500" />;
        }
        
        if (fileType?.startsWith('video/')) {
            return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-purple-500">
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>;
        }
        
        // Then check file extension if name is available
        if (fileName) {
            const extension = fileName.split('.').pop()?.toLowerCase();
            
            // Documents
            if (['pdf'].includes(extension || '')) {
                return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-red-500">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>;
            }
            
            // Office documents
            if (['doc', 'docx', 'odt', 'rtf'].includes(extension || '')) {
                return <FileText className="h-4 w-4 text-blue-600" />;
            }
            
            // Spreadsheets
            if (['xls', 'xlsx', 'csv', 'ods'].includes(extension || '')) {
                return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-green-600">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="9" y1="3" x2="9" y2="21"></line>
                    <line x1="15" y1="3" x2="15" y2="21"></line>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="3" y1="15" x2="21" y2="15"></line>
                </svg>;
            }
            
            // Code files
            if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'java', 'c', 'cpp', 'php', 'rb'].includes(extension || '')) {
                return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-amber-600">
                    <polyline points="16 18 22 12 16 6"></polyline>
                    <polyline points="8 6 2 12 8 18"></polyline>
                </svg>;
            }
            
            // Archive files
            if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) {
                return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-amber-500">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>;
            }
        }
        
        // Default file icon
        return <FileIcon className="h-4 w-4 text-gray-500" />;
    };

    // Helper to render message reactions
    const renderMessageReactions = (reactions?: Record<string, Reaction>, messageId?: string) => {
        if (!reactions || Object.keys(reactions).length === 0) {
            return null;
        }
        
        return (
            <div className="flex flex-wrap gap-1 mt-1 -ml-1">
                {Object.entries(reactions).map(([emoji, reaction]) => {
                    const count = reaction.users.length;
                    const hasReacted = user && reaction.users.some(u => u.uid === user?.uid);
                    
                    return (
                        <button
                            key={emoji}
                            onClick={() => messageId && handleSendReaction(emoji, messageId)}
                            className={cn(
                                "flex items-center gap-1 rounded-full py-0.5 px-2 text-xs transition-colors",
                                hasReacted 
                                    ? "bg-primary/20 hover:bg-primary/30" 
                                    : "bg-muted hover:bg-muted/80"
                            )}
                            title={reaction.users.map(u => u.name).join(', ')}
                        >
                            <span>{emoji}</span>
                            <span>{count}</span>
                        </button>
                    );
                })}
            </div>
        );
    };
    
    // Check if Firebase is properly configured
    // RTDB always initialized if Firebase is configured

    if (loading) {
        return (
            <div className="flex h-full flex-col">
                <ScrollArea className="flex-1">
                    <div className="space-y-4 p-4">
                        <Skeleton className="h-16 w-3/4" />
                        <Skeleton className="h-16 w-3/4 ml-auto" />
                        <Skeleton className="h-16 w-3/4" />
                    </div>
                </ScrollArea>
                <div className="border-t bg-muted/50 p-4">
                    <div className="flex gap-2">
                        <Input placeholder="Loading..." disabled className="flex-1" />
                        <Button disabled><Send className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex-1 overflow-hidden">
                {/* Chat header with search */}
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                    <h3 className="text-sm font-medium">{spaceName}</h3>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setSearchDialogOpen(true)}
                            title="Search messages"
                        >
                            <Search className="h-4 w-4" />
                        </Button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Filter messages"
                                >
                                    <Filter className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent side="bottom" className="w-56 p-2">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Filter by</p>
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center space-x-2">
                                            <input type="checkbox" id="filter-files" className="rounded" />
                                            <label htmlFor="filter-files" className="text-sm">Files & Images</label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <input type="checkbox" id="filter-links" className="rounded" />
                                            <label htmlFor="filter-links" className="text-sm">Links</label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <input type="checkbox" id="filter-mentions" className="rounded" />
                                            <label htmlFor="filter-mentions" className="text-sm">Mentions</label>
                                        </div>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <ScrollArea className="h-[calc(100%-40px)]" ref={scrollAreaRef}>
                    <div className="space-y-6 p-4 pt-6">
                        {error && (
                            <div className="text-center text-red-500 text-sm p-2 bg-red-50 rounded">
                                {error}
                            </div>
                        )}
                        {!error && !canRead && (
                            <div className="text-center text-muted-foreground text-sm p-4">
                                You don't have permission to view messages here. Ask an admin to invite you to this space.
                            </div>
                        )}
                        
                        {messages.length === 0 && !error && (
                            <div className="flex flex-col items-center justify-center h-[50vh] text-center text-muted-foreground">
                                <div className="bg-muted/30 p-6 rounded-full mb-4">
                                    <Send className="h-10 w-10 opacity-20" />
                                </div>
                                <h3 className="font-medium text-lg mb-1">No messages yet</h3>
                                <p className="text-sm max-w-xs">
                                    Start the conversation by sending your first message in this space.
                                </p>
                            </div>
                        )}

                        {/* Message groups */}
                        {groupedMessages.map((group, groupIndex) => {
                            const firstMessage = group[0];
                            const isOwnMessage = firstMessage?.uid === user?.uid;
                            const participant = getParticipant(firstMessage?.uid);
                            
                            // Show date separator when needed
                            const showDateSeparator = groupIndex === 0 || 
                                (groupIndex > 0 && formatMessageDate(firstMessage.timestamp) !== 
                                formatMessageDate(groupedMessages[groupIndex-1][0].timestamp));
                            
                            return (
                                <React.Fragment key={`group-${firstMessage?.id || groupIndex}`}>
                                    {/* Date separator */}
                                    {showDateSeparator && (
                                        <div className="flex items-center justify-center my-6">
                                            <div className="bg-muted/30 text-muted-foreground text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
                                                <Clock className="h-3 w-3" />
                                                {formatMessageDate(firstMessage.timestamp)}
                                            </div>
                                        </div>
                                    )}
                                
                                    <div 
                                        className={cn(
                                            "flex gap-2",
                                            isOwnMessage ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        {/* Avatar only on left for other people's messages */}
                                        {!isOwnMessage && (
                                            <div className="flex flex-col items-end pt-1">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={firstMessage.avatar || participant?.photoURL} />
                                                    <AvatarFallback className="text-xs">
                                                        {firstMessage.name?.charAt(0) || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </div>
                                        )}
                                        
                                        <div className="flex flex-col max-w-[75%] space-y-1">
                                            {/* Sender name for other people */}
                                            {!isOwnMessage && (
                                                <p className="text-xs font-medium ml-1">
                                                    {firstMessage.name}
                                                </p>
                                            )}
                                            
                                            {/* Message bubbles */}
                                            <div className="flex flex-col space-y-1">
                                                {group.map((msg, i) => {
                                                    const isReaction = msg.type === 'reaction';
                                                    const isFirst = i === 0;
                                                    const isLast = i === group.length - 1;
                                                    
                                                    // Determine bubble style based on position in group
                                                    const bubbleStyle = isOwnMessage
                                                        ? isFirst && isLast
                                                            ? "rounded-lg" 
                                                            : isFirst
                                                                ? "rounded-lg rounded-br-sm"
                                                                : isLast
                                                                    ? "rounded-lg rounded-tr-sm"
                                                                    : "rounded-lg rounded-r-sm"
                                                        : isFirst && isLast
                                                            ? "rounded-lg"
                                                            : isFirst
                                                                ? "rounded-lg rounded-bl-sm"
                                                                : isLast
                                                                    ? "rounded-lg rounded-tl-sm"
                                                                    : "rounded-lg rounded-l-sm";
                                                    
                                                    return (
                                                        <div 
                                                            id={`msg-${msg.id}`}
                                                            key={msg.id}
                                                            className={cn(
                                                                isReaction 
                                                                    ? "bg-transparent p-1 text-2xl" 
                                                                    : `p-3 ${bubbleStyle} shadow-sm`,
                                                                isOwnMessage
                                                                    ? "bg-primary text-primary-foreground ml-auto" 
                                                                    : "bg-muted/70 mr-auto",
                                                                "relative group message-bubble"
                                                            )}
                                                        >
                                                            {/* Reply reference if this message is a reply */}
                                                            {msg.replyToId && (
                                                                <div className="text-xs mb-1.5 px-2 py-1 border-l-2 border-muted-foreground/30 bg-muted-foreground/10 rounded-sm">
                                                                    <p className="font-medium mb-0.5">{msg.replyToName}</p>
                                                                    <p className="opacity-70 truncate">{msg.replyToMessage}</p>
                                                                </div>
                                                            )}
                                                            
                                                            {/* Message content based on type */}
                                                            {msg.type === 'image' ? (
                                                                <div className="relative">
                                                                    <OptimizedImage
                                                                        src={msg.message}
                                                                        alt={msg.fileName || 'image'}
                                                                        className="max-w-xs max-h-60 rounded"
                                                                        width={320}
                                                                        height={240}
                                                                        sizes="320px"
                                                                    />
                                                                    {msg.fileName && (
                                                                        <div className="mt-1 text-xs opacity-70 flex items-center gap-1">
                                                                            <ImageIcon className="h-3 w-3" />
                                                                            <span className="truncate">{msg.fileName}</span>
                                                                            {msg.fileSize && (
                                                                                <span className="ml-auto">
                                                                                    {formatFileSize(msg.fileSize)}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : msg.type === 'file' ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="bg-background rounded p-2">
                                                                        <FileText className="h-8 w-8 text-blue-500" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <a
                                                                            href={msg.message}
                                                                            download={msg.fileName || true}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-sm font-medium hover:underline truncate block"
                                                                        >
                                                                            {msg.fileName || 'Download file'}
                                                                        </a>
                                                                        {msg.fileSize && (
                                                                            <span className="text-xs opacity-70">
                                                                                {formatFileSize(msg.fileSize)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ) : msg.type === 'audio' ? (
                                                                <div>
                                                                    <audio 
                                                                        controls 
                                                                        src={msg.message}
                                                                        className="max-w-full"
                                                                    >
                                                                        Your browser does not support audio playback.
                                                                    </audio>
                                                                    {msg.fileName && (
                                                                        <div className="mt-1 text-xs opacity-70">
                                                                            {msg.fileName}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <p className={`${isReaction ? 'leading-none' : ''}`}>
                                                                    {msg.message}
                                                                </p>
                                                            )}
                                                            
                                                            {/* Render message reactions */}
                                                            {renderMessageReactions(msg.reactions, msg.id)}
                                                            
                                                            {/* Thread replies indicator */}
                                                            {msg.hasThread && (
                                                                <div 
                                                                    className="flex items-center gap-1 mt-2 text-xs text-primary cursor-pointer hover:underline"
                                                                    onClick={() => handleOpenThread(msg.id)}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                                                    </svg>
                                                                    <span>
                                                                        {msg.threadCount} {msg.threadCount === 1 ? 'reply' : 'replies'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            
                                                            {/* Message status and timestamp */}
                                                            {isLast && isOwnMessage && !isReaction && (
                                                                <div className="flex justify-end items-center gap-1 mt-1">
                                                                    <span className="text-[10px] opacity-70">
                                                                        {formatTime(msg.timestamp)}
                                                                    </span>
                                                                    {getMessageStatus(msg)}
                                                                </div>
                                                            )}
                                                            
                                                            {/* Timestamp for non-own messages */}
                                                            {isLast && !isOwnMessage && !isReaction && (
                                                                <div className="flex justify-start items-center mt-1">
                                                                    <span className="text-[10px] opacity-70">
                                                                        {formatTime(msg.timestamp)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            
                                                            {/* Message actions that appear on hover */}
                                                            <div className={cn(
                                                                "absolute -top-8 p-1 rounded-md bg-background border shadow-sm opacity-0 transition-opacity flex gap-1",
                                                                isOwnMessage ? "right-0" : "left-0",
                                                                "group-hover:opacity-100"
                                                            )}>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-7 w-7" 
                                                                    title="Reply"
                                                                    onClick={() => setReplyingTo(msg)}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                        <polyline points="9 17 4 12 9 7" />
                                                                        <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                                                                    </svg>
                                                                </Button>
                                                                
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-7 w-7" 
                                                                    title="Start thread"
                                                                    onClick={() => handleOpenThread(msg.id)}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                                                        <path d="M14 9.5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z"></path>
                                                                        <path d="M16 13.5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z"></path>
                                                                    </svg>
                                                                </Button>
                                                                
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="icon" 
                                                                            className="h-7 w-7" 
                                                                            title="React"
                                                                        >
                                                                            <SmilePlus className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent side="top" align="center" className="p-0 border-none w-64">
                                                                        <div className="p-2 bg-muted/30 border-b">
                                                                            <p className="text-xs font-medium">Quick Reactions</p>
                                                                        </div>
                                                                        <div className="grid grid-cols-8 gap-1 p-2">
                                                                            {['👍', '❤️', '😂', '😮', '😢', '👏', '🎉', '🔥'].map(emoji => (
                                                                                <button
                                                                                    key={emoji}
                                                                                    className="w-8 h-8 flex items-center justify-center text-lg hover:bg-muted rounded cursor-pointer transition-colors"
                                                                                    onClick={() => handleSendReaction(emoji, msg.id)}
                                                                                >
                                                                                    {emoji}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                        <div className="p-2 border-t bg-muted/30 flex justify-between items-center">
                                                                            <p className="text-xs font-medium">All Emojis</p>
                                                                            <Button 
                                                                                variant="ghost" 
                                                                                size="sm" 
                                                                                className="h-7 text-xs"
                                                                                onClick={() => {
                                                                                    setActiveEmojiMessage(msg.id);
                                                                                    setShowEmoji(true);
                                                                                }}
                                                                            >
                                                                                Open Picker
                                                                            </Button>
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>
                                                                
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="icon" 
                                                                            className="h-7 w-7" 
                                                                            title="More options"
                                                                        >
                                                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent 
                                                                        side={isOwnMessage ? "left" : "right"}
                                                                        className="w-32 p-1"
                                                                    >
                                                                        <div className="text-xs space-y-1">
                                                                            {isOwnMessage && (
                                                                                <Button 
                                                                                    variant="ghost" 
                                                                                    className="w-full justify-start h-8 px-2 text-xs" 
                                                                                >
                                                                                    Edit message
                                                                                </Button>
                                                                            )}
                                                                            <Button 
                                                                                variant="ghost" 
                                                                                className="w-full justify-start h-8 px-2 text-xs" 
                                                                            >
                                                                                Copy text
                                                                            </Button>
                                                                            <Button 
                                                                                variant="ghost" 
                                                                                className="w-full justify-start h-8 px-2 text-xs" 
                                                                            >
                                                                                Forward
                                                                            </Button>
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                        <div ref={messagesEndRef} />
                        
                        {/* Typing indicator */}
                        {isTyping && (
                            <div className="flex items-start gap-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>U</AvatarFallback>
                                </Avatar>
                                <div className="bg-muted rounded-full px-4 py-2 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce"></span>
                                    <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                    <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Reply indicator */}
            {replyingTo && (
                <div className="px-4 pt-2 pb-0">
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2 pr-3">
                        <div className="w-1 self-stretch bg-primary/50 rounded-full"></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{replyingTo.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                                {replyingTo.type === 'image' 
                                    ? '📷 Image' 
                                    : replyingTo.type === 'file' 
                                        ? `📎 ${replyingTo.fileName || 'File'}`
                                        : replyingTo.message}
                            </p>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => setReplyingTo(null)}
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            )}

            {/* File preview */}
            {file && (
                <div className="px-4 pt-2 pb-0">
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2 pr-3">
                        {file.type.startsWith('image/') ? (
                            <div className="h-12 w-12 relative rounded overflow-hidden border bg-muted/30">
                                <OptimizedImage 
                                    src={URL.createObjectURL(file)} 
                                    alt="Preview"
                                    className="h-full w-full"
                                    fill
                                    objectFit="cover"
                                />
                            </div>
                        ) : (
                            <div className="h-12 w-12 rounded overflow-hidden border bg-muted/30 flex items-center justify-center">
                                {getFileIcon(file.type)}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                            </p>
                            {uploadProgress > 0 && uploadProgress < 100 && (
                                <div className="w-full bg-muted/50 rounded-full h-1 mt-1">
                                    <div 
                                        className="bg-primary h-1 rounded-full" 
                                        style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                </div>
                            )}
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => {
                                setFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            )}

            <div className="border-t bg-background p-4">
                <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                    <div className="flex-1 relative">
                        <Input
                            placeholder={`Message ${spaceName}`}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className={cn(
                                "flex-1 pr-10", 
                                replyingTo || file ? "rounded-t-none border-t-0" : ""
                            )}
                            disabled={!user || !spaceId}
                            ref={inputRef}
                        />
                        <Popover open={showEmoji} onOpenChange={(open) => {
                            setShowEmoji(open);
                            if (!open) {
                                setActiveEmojiMessage(null);
                            }
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
                    <div className="flex gap-1">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    disabled={!user || !spaceId}
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
                        
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={!user || !spaceId}
                                    className="shrink-0"
                                >
                                    <ThumbsUp className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent side="top" className="p-0 border-none w-64">
                                <div className="p-2 bg-muted/30 border-b">
                                    <p className="text-xs font-medium">Quick Reactions</p>
                                </div>
                                <div className="grid grid-cols-8 gap-1 p-2">
                                    {['👍', '❤️', '😂', '😮', '😢', '👏', '🎉', '🔥'].map(emoji => (
                                        <button
                                            key={emoji}
                                            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-muted rounded cursor-pointer transition-colors"
                                            onClick={() => handleSendReaction(emoji)}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                        
                        <Button
                            type="submit"
                            disabled={(!newMessage.trim() && !file) || !user || !spaceId}
                            className="shrink-0"
                            variant="primary"
                        >
                            <Send className="h-4 w-4 mr-1" />
                            Send
                        </Button>
                    </div>
                </form>
            </div>
            
            {/* Search Dialog */}
            <SearchDialog 
                isOpen={searchDialogOpen}
                onClose={() => setSearchDialogOpen(false)}
                messages={messages}
                onMessageSelect={(messageId) => setScrollToMessageId(messageId)}
            />
            
            {/* Thread Reply Dialog */}
            <ThreadReplyDialog
                isOpen={threadReplyOpen}
                onClose={handleCloseThread}
                messageId={activeThreadMessage}
                spaceId={spaceId}
            />
        </div>
    );

}