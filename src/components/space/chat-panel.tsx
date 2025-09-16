'use client';

import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, ThumbsUp, Paperclip, Check, CheckCheck } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import { Separator } from '../ui/separator';

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
}

interface Message {
    id: string;
    uid: string;
    name: string;
    avatar?: string;
    message: string;
    type: 'text' | 'reaction';
    timestamp: any;
    readBy?: string[];
}

export function ChatPanel({ participants, spaceName, spaceId }: ChatPanelProps) {
    const [user] = useAuthState(auth);
    const [newMessage, setNewMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Real-time listener for messages
    useEffect(() => {
        if (!spaceId) {
            console.log('No spaceId provided to chat panel');
            return;
        }

        console.log('Setting up chat listener for space:', spaceId);
        const messagesRef = collection(db, 'spaces', spaceId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                console.log('Messages snapshot received:', snapshot.docs.length, 'messages');
                const messagesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp
                })) as Message[];
                
                setMessages(messagesData);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Error fetching messages:', err);
                setError(`Failed to load messages: ${err.message}`);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [spaceId]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Mark messages as read
    useEffect(() => {
        if (!user || messages.length === 0) return;

        const unreadMessages = messages.filter(msg => 
            msg.uid !== user.uid && 
            !msg.readBy?.includes(user.uid)
        );

        if (unreadMessages.length > 0) {
            const batch = unreadMessages.map(msg => {
                const messageRef = doc(db, 'spaces', spaceId, 'messages', msg.id);
                return updateDoc(messageRef, {
                    readBy: arrayUnion(user.uid)
                });
            });

            Promise.all(batch).catch(console.error);
        }
    }, [messages, user, spaceId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !spaceId) {
            console.log('Cannot send message:', { hasMessage: !!newMessage.trim(), hasUser: !!user, hasSpaceId: !!spaceId });
            return;
        }

        try {
            const senderName = user.displayName || user.email?.split('@')[0] || 'User';
            console.log('Sending message:', { senderName, message: newMessage.trim(), spaceId });
            
            await addDoc(collection(db, 'spaces', spaceId, 'messages'), {
                uid: user.uid,
                name: senderName,
                avatar: user.photoURL || null,
                message: newMessage.trim(),
                type: 'text',
                timestamp: serverTimestamp(),
                readBy: [user.uid],
            });

            console.log('Message sent successfully');
            setNewMessage('');
        } catch (err) {
            console.error('Error sending message:', err);
            setError(`Failed to send message: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    const handleSendReaction = async () => {
        if (!user || !spaceId) return;

        try {
            const senderName = user.displayName || user.email?.split('@')[0] || 'User';
            
            await addDoc(collection(db, 'spaces', spaceId, 'messages'), {
                uid: user.uid,
                name: senderName,
                avatar: user.photoURL || null,
                message: '👍',
                type: 'reaction',
                timestamp: serverTimestamp(),
                readBy: [user.uid],
            });
        } catch (err) {
            console.error('Error sending reaction:', err);
            setError('Failed to send reaction');
        }
    };

    const getParticipant = (uid: string) => participants.find(p => p.uid === uid);

    const getMessageStatus = (message: Message) => {
        const totalParticipants = participants.length;
        const readCount = message.readBy?.length || 0;

        if (readCount >= totalParticipants) {
            return <CheckCheck className="h-4 w-4 text-blue-400" />;
        }
        if (readCount > 1) {
            return <CheckCheck className="h-4 w-4" />;
        }
        return <Check className="h-4 w-4" />;
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Check if Firebase is properly configured
    if (!db) {
        return (
            <div className="flex h-full flex-col">
                <ScrollArea className="flex-1">
                    <div className="p-4 text-center text-muted-foreground">
                        <p className="text-sm">Firebase not configured</p>
                        <p className="text-xs mt-2">Please check your environment variables</p>
                    </div>
                </ScrollArea>
                <div className="border-t bg-muted/50 p-4">
                    <div className="flex gap-2">
                        <Input placeholder="Chat unavailable" disabled className="flex-1" />
                        <Button disabled><Send className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>
        );
    }

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
            <ScrollArea className="flex-1" ref={scrollAreaRef}>
                <div className="space-y-4 p-4">
                    {error && (
                        <div className="text-center text-red-500 text-sm p-2 bg-red-50 rounded">
                            {error}
                        </div>
                    )}
                    
                    {messages.length === 0 && !error && (
                        <div className="text-center text-muted-foreground text-sm p-4">
                            No messages yet. Start the conversation!
                        </div>
                    )}

                    {messages.map((msg) => {
                        const participant = getParticipant(msg.uid);
                        const isReaction = msg.type === 'reaction';
                        const isOwnMessage = msg.uid === user?.uid;

                        return (
                            <div
                                key={msg.id}
                                className={`flex items-start gap-3 ${
                                    isOwnMessage ? 'flex-row-reverse' : ''
                                }`}
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={msg.avatar || participant?.photoURL} />
                                    <AvatarFallback className="text-xs">
                                        {msg.name?.charAt(0) || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                
                                <div
                                    className={`max-w-[75%] rounded-lg p-3 text-sm ${
                                        isOwnMessage
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted'
                                    } ${isReaction ? 'bg-transparent p-1 text-2xl' : ''}`}
                                >
                                    {!isReaction && (
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <p className="font-semibold text-xs">{msg.name}</p>
                                            <p className="text-xs opacity-70">
                                                {formatTime(msg.timestamp)}
                                            </p>
                                        </div>
                                    )}
                                    
                                    <p className={`${isReaction ? 'leading-none' : ''}`}>
                                        {msg.message}
                                    </p>
                                    
                                    {isOwnMessage && !isReaction && (
                                        <div className="flex justify-end items-center mt-1">
                                            {getMessageStatus(msg)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            <div className="border-t bg-muted/50 p-4">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                        placeholder={`Message ${spaceName}`}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1"
                        disabled={!user || !spaceId}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleSendReaction}
                        disabled={!user || !spaceId}
                        className="shrink-0"
                    >
                        <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <Button
                        type="submit"
                        disabled={!newMessage.trim() || !user || !spaceId}
                        className="shrink-0"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}