
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import Link from 'next/link';
import {
  LifeBuoy,
  LogOut,
  Settings,
  User,
  PanelLeft,
  Bell,
  KanbanSquare,
} from 'lucide-react';
import { useSidebar } from '../ui/sidebar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData, useCollection } from 'react-firebase-hooks/firestore';
import { auth, db } from '@/lib/firebase';
import { doc, collection, query, orderBy, where } from 'firebase/firestore';
import { getInitials } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';

export function AppHeader() {
  const { toggleSidebar } = useSidebar();
  const [user, loading] = useAuthState(auth);
  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData, userDataLoading] = useDocumentData(userDocRef);

  const notificationsQuery = user 
    ? query(collection(db, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc'))
    : null;
  const [notificationsSnapshot, notificationsLoading] = useCollection(notificationsQuery);

  const photoUrl = userData?.photoURL || user?.photoURL;
  const displayName = userData?.name || user?.displayName;
  const unreadNotifications = notificationsSnapshot?.docs.filter(doc => !doc.data().read).length || 0;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Button
        size="icon"
        variant="outline"
        onClick={toggleSidebar}
      >
        <PanelLeft className="h-5 w-5" />
        <span className="sr-only">Toggle Menu</span>
      </Button>

      <div className="flex-1" />

       <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="overflow-hidden rounded-full relative"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0">{unreadNotifications}</Badge>
            )}
            <span className="sr-only">Toggle Notifications</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[350px]">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notificationsLoading ? (
             <DropdownMenuItem>Loading...</DropdownMenuItem>
          ) : notificationsSnapshot?.docs.length === 0 ? (
            <DropdownMenuItem>
                <div className="text-center text-sm text-muted-foreground py-4">No new notifications</div>
            </DropdownMenuItem>
          ) : (
             notificationsSnapshot?.docs.map(doc => {
                 const notification = doc.data();
                 return (
                    <DropdownMenuItem key={doc.id} asChild>
                        <Link href={notification.link || '#'}>
                            <KanbanSquare className="mr-2 h-4 w-4" />
                            <div className="text-sm">
                                <p className="font-semibold">{notification.title}</p>
                                <p className="text-xs text-muted-foreground">{notification.body}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {notification.createdAt?.toDate().toLocaleString()}
                                </p>
                            </div>
                        </Link>
                    </DropdownMenuItem>
                 )
             })
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/notifications" className="justify-center text-sm">
              View all notifications
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="overflow-hidden rounded-full"
            disabled={loading || userDataLoading}
          >
            {loading || userDataLoading ? (
              <Skeleton className="h-full w-full rounded-full" />
            ) : (
                <Avatar>
                    <AvatarImage
                        src={photoUrl}
                        alt={displayName || ''}
                    />
                    <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                </Avatar>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/account">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/support">
                <LifeBuoy className="mr-2 h-4 w-4" />
                Support
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => auth.signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
