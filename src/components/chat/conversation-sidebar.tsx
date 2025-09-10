
'use client';

import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuthState } from 'react-firebase-hooks/auth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import { Badge } from '../ui/badge';

function ConversationListItem({ convo }: { convo: any }) {
    const [user] = useAuthState(auth);
    const pathname = usePathname();

    const getConversationId = (uid1: string, uid2: string) => {
        return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
    }

    const conversationId = user ? getConversationId(user.uid, convo.id) : null;
    
    // Ensure the query is not created until the user ID is available
    const messagesQuery = (user && conversationId) ? query(
        collection(db, 'conversations', conversationId, 'messages'),
        where('readBy', 'not-in', [[user.uid]]),
    ) : null;

    const [unreadMessagesSnapshot, unreadLoading] = useCollection(messagesQuery);

    const unreadCount = unreadMessagesSnapshot?.docs.filter(doc => doc.data().uid !== user?.uid).length || 0;
    
    return (
        <Link
            href={`/chat/${convo.id}`}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted relative",
                pathname === `/chat/${convo.id}` && "bg-muted text-primary"
            )}
            >
            <Avatar className="h-10 w-10">
                <AvatarImage src={convo.photoURL} alt={convo.name} />
                <AvatarFallback>{getInitials(convo.name)}</AvatarFallback>
            </Avatar>
            <div className="truncate flex-1">
                <p className="font-semibold">{convo.name}</p>
                <p className="text-xs">{convo.jobTitle || 'No title'}</p>
            </div>
            {unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 w-5 justify-center p-0">{unreadCount}</Badge>
            )}
        </Link>
    );
}

export function ConversationSidebar() {
  const [user] = useAuthState(auth);

  const usersQuery = user 
    ? query(collection(db, 'users'), where('uid', '!=', user.uid))
    : null;
  const [usersSnapshot, loading, error] = useCollection(usersQuery);

  const conversations = usersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];

  return (
    <div className="hidden h-full flex-col border-r bg-muted/40 md:flex">
      <div className="flex h-14 items-center border-b px-6">
        <h1 className="text-lg font-semibold">Conversations</h1>
      </div>
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {loading && (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
              ))}
            </div>
          )}
          {conversations.map((convo: any) => (
            <ConversationListItem key={convo.id} convo={convo} />
          ))}
           {error && <p className="p-4 text-sm text-destructive">Error loading users.</p>}
        </nav>
      </ScrollArea>
    </div>
  );
}
