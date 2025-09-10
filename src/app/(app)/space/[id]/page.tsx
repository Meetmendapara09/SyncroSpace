
'use client';

import * as React from 'react';
import { VirtualSpace } from '@/components/space/virtual-space';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatPanel } from '@/components/space/chat-panel';
import { Hash, Users, UserPlus } from 'lucide-react';
import { useDocument, useCollection } from 'react-firebase-hooks/firestore';
import { doc, collection, query, where, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { InviteDialog } from '@/components/space/invite-dialog';
import { Button } from '@/components/ui/button';

export default function SpacePage({ params }: { params: { id: string } }) {
  const { id } = React.use(params);
  const spaceRef = doc(db, 'spaces', id);
  const [spaceSnapshot, spaceLoading, spaceError] = useDocument(spaceRef);
  
  const spaceData = spaceSnapshot?.data();
  const memberIds = spaceData?.members || [];

  const usersRef = collection(db, 'users');
  // Firestore 'in' queries are limited to 30 elements.
  // For larger spaces, you'd need a more complex solution like fetching users individually or restructuring data.
  const usersQuery = memberIds.length > 0 ? query(usersRef, where('uid', 'in', memberIds.slice(0, 30))) : null;
  const [usersSnapshot, usersLoading, usersError] = useCollection(usersQuery);

  const participants = usersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)) || [];
  
  const loading = spaceLoading || (memberIds.length > 0 && usersLoading);
  
  // Set meeting to active when component mounts and inactive when it unmounts
  React.useEffect(() => {
    if (spaceSnapshot?.exists()) {
      updateDoc(doc(db, 'spaces', id), { activeMeeting: true });
      
      return () => {
        updateDoc(doc(db, 'spaces', id), { activeMeeting: false });
      }
    }
  }, [id, spaceSnapshot]);
  
  return (
    <div className="grid h-[calc(100vh-theme(spacing.14))] grid-cols-1 lg:grid-cols-[1fr_350px]">
      <div className="flex flex-col bg-background">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6">
          {loading ? (
            <Skeleton className="h-6 w-48" />
          ) : spaceSnapshot?.exists() ? (
            <>
                <h1 className="flex items-center gap-2 text-lg font-semibold">
                <Hash className="h-5 w-5" />
                <span>{spaceData?.name}</span>
                </h1>
                <InviteDialog spaceId={id} spaceName={spaceData?.name || ''}>
                    <Button variant="outline" size="sm">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite
                    </Button>
                </InviteDialog>
            </>
          ) : (
             <h1 className="flex items-center gap-2 text-lg font-semibold text-destructive">
                Space not found
            </h1>
          )}
          <div className="ml-auto flex items-center gap-2">
            {loading ? (
                <Skeleton className="h-8 w-24" />
            ) : (
                <>
                    <div className="flex -space-x-2 overflow-hidden">
                    {participants.slice(0, 3).map(p => (
                        <Avatar key={p.uid} className="inline-block border-2 border-background h-8 w-8">
                            <AvatarImage src={p.photoURL} />
                            <AvatarFallback>{p.name?.[0]}</AvatarFallback>
                        </Avatar>
                    ))}
                    </div>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {participants.length}
                    </span>
                </>
            )}
          </div>
        </header>
        <div className="flex-1 relative">
             {spaceSnapshot?.exists() ? (
                <VirtualSpace participants={participants} spaceId={id} />
             ) : (
                <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">This space does not exist or you do not have permission to view it.</p>
                </div>
            )}
        </div>
      </div>
      <div className="hidden flex-col border-l bg-muted/40 lg:flex">
        <ChatPanel 
            participants={participants} 
            spaceId={id}
            spaceName={spaceData?.name || ''} 
        />
      </div>
    </div>
  );
}
