
'use client';

import React, { useEffect, useState } from 'react';
import { ChatPanel } from '@/components/space/chat-panel';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PhoneCall, Video, MoreHorizontal, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useParams } from 'next/navigation';
import { getInitials } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export default function UserChat() {
  const params = useParams<{ id: string }>();
  const [user] = useAuthState(auth);
  const [recipientData, setRecipientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get the other user's data
  useEffect(() => {
    async function fetchRecipientData() {
      if (!params || !params.id) {
        setError('No user ID provided');
        setLoading(false);
        return;
      }
      
      try {
        if (!params || !params.id) {
          setError('No user ID provided');
          setLoading(false);
          return;
        }
        const recipientRef = doc(db, 'users', params.id);
        const recipientSnap = await getDoc(recipientRef);
        
        if (recipientSnap.exists()) {
          setRecipientData(recipientSnap.data());
        } else {
          setError('User not found');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching recipient data:', err);
        setError('Failed to load user information');
        setLoading(false);
      }
    }
    
    fetchRecipientData();
  }, [params?.id]);
  
  // Generate a unique space ID for the conversation
  const getConversationId = () => {
    if (!user || !params?.id) return null;
    return user.uid < params.id 
      ? `${user.uid}_${params.id}` 
      : `${params.id}_${user.uid}`;
  };
  
  const conversationId = getConversationId();
  const participants = recipientData 
    ? [
        { 
          uid: params?.id || '', 
          name: recipientData.name || 'Unknown User', 
          photoURL: recipientData.photoURL,
          status: recipientData.status || 'online' 
        },
        { 
          uid: user?.uid || '', 
          name: user?.displayName || 'You',
          photoURL: user?.photoURL || undefined,
          status: 'online'
        }
      ]
    : [];
  
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 p-4 border-b">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex ml-auto gap-2">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
        <div className="flex-1 p-8 flex justify-center">
          <Skeleton className="h-80 w-full max-w-3xl rounded-lg" />
        </div>
      </div>
    );
  }
  
  if (error || !recipientData) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold mb-2">
            {error || 'Unable to load conversation'}
          </h2>
          <p className="text-muted-foreground">
            There was a problem loading this conversation. Please try again or contact support.
          </p>
          <Button className="mt-4" onClick={() => window.location.href = '/chat'}>
            Return to Chat
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <header className="flex items-center justify-between gap-4 p-4 border-b h-16">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={recipientData.photoURL} />
              <AvatarFallback>{getInitials(recipientData.name || 'Unknown User')}</AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-slate-900"></span>
          </div>
          <div>
            <h2 className="text-base font-semibold leading-tight">
              {recipientData.name || 'Unknown User'}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {recipientData.jobTitle || 'No title'}
              </span>
              <Badge variant="outline" className="text-[10px] h-4 px-1 bg-green-500/10 text-green-600 border-green-200">
                Online
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="Voice call">
            <PhoneCall className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Video call">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Add people">
            <UserPlus className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View profile</DropdownMenuItem>
              <DropdownMenuItem>Search in conversation</DropdownMenuItem>
              <DropdownMenuItem>Mute notifications</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Block user</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      
      <div className="flex-1 overflow-hidden">
        {conversationId ? (
          <ChatPanel 
            participants={participants}
            spaceName={recipientData.name || 'Chat'}
            spaceId={conversationId}
            canRead={true}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-muted-foreground">Unable to load conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
