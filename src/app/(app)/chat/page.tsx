
'use client';

import { useState, useEffect } from 'react';
import { 
  MessageSquareText, 
  Users, 
  Clock, 
  Star, 
  Search, 
  MessageSquarePlus,
  ChevronRight
} from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';

export default function ChatPage() {
  const [user] = useAuthState(auth);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load recent conversations and suggested users
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch recent chats - implement proper query based on your data structure
        const recentQuery = query(
          collection(db, 'users'),
          where('uid', '!=', user.uid),
          limit(5)
        );
        const recentSnapshot = await getDocs(recentQuery);
        setRecentChats(recentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch suggested users - could be based on team, common projects, etc.
        const suggestedQuery = query(
          collection(db, 'users'),
          where('uid', '!=', user.uid),
          limit(3)
        );
        const suggestedSnapshot = await getDocs(suggestedQuery);
        setSuggestedUsers(suggestedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching chat data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return (
    <div className="flex flex-col h-full border-l bg-white dark:bg-slate-950 p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-sm text-muted-foreground mt-1">Chat with your team members and collaborators</p>
        </div>
        <Button size="sm">
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          className="pl-10" 
          placeholder="Search conversations or users..." 
        />
      </div>

      {loading ? (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-40" />
            </div>
            <Skeleton className="h-60" />
          </div>
        </div>
      ) : (
        <>
          {/* Suggested Users Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-lg">Suggested Contacts</h2>
              </div>
              <Button variant="ghost" size="sm" className="text-xs">
                See all <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suggestedUsers.map((user) => (
                <Link href={`/chat/${user.uid}`} key={user.uid}>
                  <Card className="h-full hover:border-primary hover:shadow-sm transition-all duration-200">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <Avatar className="h-16 w-16 mb-3 mt-3">
                        <AvatarImage src={user.photoURL} alt={user.name} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{user.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{user.jobTitle || 'Team Member'}</p>
                        <Button size="sm" variant="outline" className="mt-3 w-full">
                          Message
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}

              {suggestedUsers.length === 0 && (
                <div className="col-span-3 p-8 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No suggested contacts available.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Conversations Section */}
          <div>
            <div className="flex items-center mb-4 gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Recent Conversations</h2>
            </div>
            <ScrollArea className="h-[calc(100vh-25rem)] pr-4">
              {recentChats.length > 0 ? (
                <div className="space-y-3">
                  {recentChats.map((chat) => (
                    <Link href={`/chat/${chat.uid}`} key={chat.uid} className="block">
                      <div className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={chat.photoURL} alt={chat.name} />
                          <AvatarFallback>{getInitials(chat.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between">
                            <h3 className="font-medium truncate">{chat.name}</h3>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">10:23 AM</span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">Click to start a conversation...</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center p-4">
                  <div className="bg-muted/50 p-6 rounded-full mb-4">
                    <MessageSquareText className="h-12 w-12 text-primary/60" />
                  </div>
                  <h3 className="text-lg font-medium">No Recent Conversations</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                    Start chatting with your team members by selecting them from the sidebar or searching above.
                  </p>
                  <Button className="mt-4">
                    <MessageSquarePlus className="h-4 w-4 mr-2" />
                    Start a Conversation
                  </Button>
                </div>
              )}
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}
