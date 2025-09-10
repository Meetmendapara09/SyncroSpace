
'use client';

import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SendHorizonal, ThumbsUp, FileText, CheckSquare, Paperclip, Check, CheckCheck } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { useCollection, useDocumentData } from 'react-firebase-hooks/firestore';
import { collection, addDoc, serverTimestamp, query, orderBy, doc, writeBatch, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import { usePathname } from 'next/navigation';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import Image from 'next/image';
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

type MessageStatusType = 'sent' | 'delivered' | 'read';

function MessageStatus({ status }: { status: MessageStatusType }) {
    if (status === 'read') {
        return <CheckCheck className="h-4 w-4 text-blue-400" />;
    }
    if (status === 'delivered') {
        return <CheckCheck className="h-4 w-4" />;
    }
    return <Check className="h-4 w-4" />;
}

const createNotification = async (
    recipientId: string, 
    title: string, 
    body: string, 
    link: string
) => {
    const recipientDoc = await getDoc(doc(db, 'users', recipientId));
    if (recipientDoc.exists() && recipientDoc.data().dnd) {
        // Do not send notification if user has Do Not Disturb enabled
        return;
    }

    const notificationsRef = collection(db, 'users', recipientId, 'notifications');
    await addDoc(notificationsRef, {
        title,
        body,
        link,
        read: false,
        createdAt: serverTimestamp(),
    });
};


export function ChatPanel({ participants, spaceName, spaceId }: ChatPanelProps) {
  const [user] = useAuthState(auth);
  const pathname = usePathname();
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showedNewMessageSeparator, setShowedNewMessageSeparator] = useState(false);
  
  const isDirectMessage = pathname.includes('/chat/');
  const collectionPath = isDirectMessage 
    ? `conversations/${spaceId}/messages`
    : `spaces/${spaceId}/messages`;

  const messagesQuery = query(collection(db, collectionPath), orderBy('timestamp', 'asc'));
  const [messagesSnapshot, loading, error] = useCollection(messagesQuery);

  const messages = messagesSnapshot?.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp?.toDate()
  })) || [];

  const [currentUserData] = useDocumentData(user ? doc(db, 'users', user.uid) : null);
  
  const firstUnreadIndex = useMemo(() => {
    if (showedNewMessageSeparator || !user) return -1;
    return messages.findIndex(msg => msg.uid !== user.uid && !msg.readBy?.includes(user.uid));
  }, [messages, user, showedNewMessageSeparator]);


  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages.length]); // Use length to depend on new messages
  
  // Mark messages as read
  useEffect(() => {
    if (!messagesSnapshot || !user) return;
    
    const batch = writeBatch(db);
    let hasUnread = false;

    messagesSnapshot.docs.forEach(document => {
      const message = document.data();
      // Mark as read if message is not from current user and hasn't been read by them
      if (message.uid !== user.uid && !message.readBy?.includes(user.uid)) {
        const messageRef = doc(db, collectionPath, document.id);
        batch.update(messageRef, {
            readBy: arrayUnion(user.uid)
        });
        hasUnread = true;
      }
    });

    if (hasUnread) {
        batch.commit().catch(console.error);
        if (firstUnreadIndex !== -1) {
            setShowedNewMessageSeparator(true);
        }
    }
  }, [messagesSnapshot, user, collectionPath, firstUnreadIndex]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !user || !currentUserData) return;
    
    const senderName = currentUserData.name;
    const link = isDirectMessage ? `/chat/${user.uid}` : `/space/${spaceId}`;


    await addDoc(collection(db, collectionPath), {
        uid: user.uid,
        name: senderName,
        avatar: currentUserData.photoURL,
        message: newMessage,
        type: 'text',
        timestamp: serverTimestamp(),
        readBy: [user.uid],
    });

    // Handle notifications for mentions
    if (newMessage.includes('@all')) {
        const notificationTitle = `New mention in ${spaceName}`;
        const notificationBody = `${senderName}: ${newMessage}`;
        
        participants.forEach(p => {
            if (p.uid !== user.uid) {
                createNotification(p.uid, notificationTitle, notificationBody, link);
            }
        });

    } else {
        let notifiedUsers: string[] = [];
        participants.forEach(p => {
            if (p.uid !== user.uid && newMessage.includes(`@${p.name}`) && !notifiedUsers.includes(p.uid)) {
                const notificationTitle = `You were mentioned in ${spaceName}`;
                const notificationBody = `${senderName}: ${newMessage}`;
                createNotification(p.uid, notificationTitle, notificationBody, link);
                notifiedUsers.push(p.uid);
            }
        });

        // Send a generic notification to non-mentioned participants in a DM
        if(isDirectMessage) {
            participants.forEach(p => {
                if (p.uid !== user.uid && !notifiedUsers.includes(p.uid)) {
                    const notificationTitle = `New message from ${senderName}`;
                    const notificationBody = newMessage;
                     createNotification(p.uid, notificationTitle, notificationBody, link);
                }
            });
        }
    }


    setNewMessage('');
  };
  
  const handleSendReaction = async () => {
    if (!user || !currentUserData) return;


    await addDoc(collection(db, collectionPath), {
      uid: user.uid,
      name: currentUserData.name,
      avatar: currentUserData.photoURL,
      message: '👍',
      type: 'reaction',
      timestamp: serverTimestamp(),
      readBy: [user.uid],
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user || !currentUserData) return;
    const file = e.target.files[0];
    
    // In a real app, you would upload the file to a storage service (e.g., Firebase Storage)
    // and get a download URL. For now, we'll just simulate this.
    const messageType = file.type.startsWith('image/') ? 'image' : 'file';

    await addDoc(collection(db, collectionPath), {
        uid: user.uid,
        name: currentUserData.name,
        avatar: currentUserData.photoURL,
        type: messageType,
        fileName: file.name,
        fileURL: URL.createObjectURL(file), // Placeholder with local blob URL
        timestamp: serverTimestamp(),
        readBy: [user.uid],
    });
  };

  const getParticipant = (uid: string) => participants.find(p => p.uid === uid);

  const getMessageStatus = (message: any): MessageStatusType => {
      const totalParticipants = participants.length;
      const readCount = message.readBy?.length || 0;

      if (readCount >= totalParticipants) {
          return 'read';
      }
      if (readCount > 1) {
          return 'delivered';
      }
      return 'sent';
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="space-y-6 p-4 sm:p-6">
          {loading && (
            <div className="space-y-4">
                <Skeleton className="h-16 w-3/4" />
                <Skeleton className="h-16 w-3/4 ml-auto" />
                <Skeleton className="h-16 w-3/4" />
            </div>
          )}
          {!loading && messages.map((msg: any, index) => {
            const participant = getParticipant(msg.uid);
            const isReaction = msg.type === 'reaction';
            const messageStatus = getMessageStatus(msg);
            
            const messageContent = (
                <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                    msg.uid === user?.uid ? 'flex-row-reverse' : ''
                }`}
                >
                <Avatar className="h-10 w-10">
                    <AvatarImage src={msg.avatar || participant?.photoURL} />
                    <AvatarFallback>{msg.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div
                    className={`max-w-[75%] rounded-lg p-3 text-sm shadow-sm ${
                    msg.uid === user?.uid
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background'
                    } ${isReaction ? 'bg-transparent shadow-none p-1 text-2xl' : ''}`}
                >
                  {!isReaction && (
                    <div className='flex items-baseline gap-2'>
                      <p className="font-semibold">{msg.name}</p>
                      <p className='text-xs text-muted-foreground/80'>{msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  )}
                    {msg.type === 'image' ? (
                        <Image src={msg.fileURL} alt={msg.fileName || 'Uploaded image'} width={200} height={200} className="rounded-md mt-2" />
                    ) : msg.type === 'file' ? (
                        <a href={msg.fileURL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded-md hover:bg-muted">
                           <FileText className="h-6 w-6" /> 
                           <span>{msg.fileName}</span>
                        </a>
                    ) : (
                        <p className={`mt-1 ${isReaction ? 'leading-none' : ''}`}>{msg.message}</p>
                    )}
                     {msg.uid === user?.uid && !isReaction && (
                        <div className="flex justify-end items-center mt-1">
                            <MessageStatus status={messageStatus} />
                        </div>
                    )}
                </div>
                </div>
            );
            
            if (msg.isSummary) {
                return (
                    <div key={msg.id} className="relative rounded-lg border bg-background p-4 my-4">
                        <div className="absolute -top-3 -left-3 bg-primary text-primary-foreground rounded-full p-1.5">
                            <FileText className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold mb-2 text-base">Meeting Summary</h3>
                        <p className="text-sm text-muted-foreground mb-4">{msg.summary}</p>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><CheckSquare className="h-4 w-4 text-primary" /> Action Items</h4>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                            {msg.actionItems.map((item: string, index: number) => <li key={index}>{item}</li>)}
                        </ul>
                         <Accordion type="single" collapsible className="w-full mt-2">
                            <AccordionItem value="item-1">
                                <AccordionTrigger className="text-xs pt-2">View Full Transcript</AccordionTrigger>
                                <AccordionContent className="text-xs text-muted-foreground whitespace-pre-wrap">
                                    {msg.transcript}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                         <p className='text-xs text-muted-foreground/80 mt-4 text-right'>{msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                )
            }
            
            if (index === firstUnreadIndex) {
                return (
                    <React.Fragment key={`separator-${msg.id}`}>
                        <div className="relative my-4">
                            <Separator />
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background px-2">
                                <span className="text-xs font-semibold text-muted-foreground">New Messages</span>
                            </div>
                        </div>
                        {messageContent}
                    </React.Fragment>
                );
            }

            return messageContent;

          })}
           {error && <p className="text-destructive text-center">Error loading messages.</p>}
        </div>
      </ScrollArea>
      <div className="border-t bg-muted/50 p-4">
        <form onSubmit={handleSendMessage} className="relative">
          <Input
            placeholder={`Message ${spaceName}`}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="pr-28 bg-background"
            disabled={!user || !spaceId}
          />
           <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          <div className="absolute inset-y-0 right-2 flex items-center">
            <Button variant="ghost" size="icon" type="button" className='hover:bg-transparent' onClick={() => fileInputRef.current?.click()} disabled={!user || !spaceId}>
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" type="button" className='hover:bg-transparent' onClick={handleSendReaction} disabled={!user || !spaceId}>
              <ThumbsUp className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" type="submit" disabled={!newMessage}>
              <SendHorizonal className="h-5 w-5 text-primary" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
