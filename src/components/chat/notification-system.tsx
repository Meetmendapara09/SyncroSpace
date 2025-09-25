'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth, rtdb } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { ref as rtdbRef, onValue, update, push, set, remove, get } from 'firebase/database';
import { toast } from '@/hooks/use-toast';
import { Bell, BellOff, AtSign, Hash, MessageSquare } from 'lucide-react';

interface Notification {
  id: string;
  userId: string;
  type: 'mention' | 'reply' | 'thread' | 'direct' | 'channel' | 'space';
  sourceId: string;
  sourceName: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl: string;
  senderName?: string;
  senderAvatar?: string;
}

export function useNotifications() {
  const [user] = useAuthState(auth);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Listen for notifications
  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    
    const notificationsRef = rtdbRef(rtdb, `users/${user.uid}/notifications`);
    
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }
      
      const notificationsList = Object.entries(data).map(([id, notification]) => ({
        id,
        ...(notification as any)
      })).sort((a, b) => b.timestamp - a.timestamp);
      
      setNotifications(notificationsList as Notification[]);
      setUnreadCount(notificationsList.filter(n => !n.read).length);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user?.uid]);
  
  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.uid) return;
    
    const notificationRef = rtdbRef(rtdb, `users/${user.uid}/notifications/${notificationId}`);
    await update(notificationRef, { read: true });
  }, [user?.uid]);
  
  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.uid) return;
    
    const updates: Record<string, any> = {};
    
    notifications.forEach(notification => {
      if (!notification.read) {
        updates[`users/${user.uid}/notifications/${notification.id}/read`] = true;
      }
    });
    
    if (Object.keys(updates).length > 0) {
      await update(rtdbRef(rtdb), updates);
    }
  }, [user?.uid, notifications]);
  
  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user?.uid) return;
    
    const notificationRef = rtdbRef(rtdb, `users/${user.uid}/notifications/${notificationId}`);
    await remove(notificationRef);
  }, [user?.uid]);
  
  // Create a new notification
  const createNotification = useCallback(async (
    targetUserId: string,
    type: Notification['type'],
    sourceId: string,
    sourceName: string,
    message: string,
    actionUrl: string,
    senderName?: string,
    senderAvatar?: string
  ) => {
    // Don't send notifications to yourself
    if (user?.uid === targetUserId) return;
    
    const notificationsRef = rtdbRef(rtdb, `users/${targetUserId}/notifications`);
    const newNotificationRef = push(notificationsRef);
    
    await set(newNotificationRef, {
      userId: targetUserId,
      type,
      sourceId,
      sourceName,
      message,
      timestamp: Date.now(),
      read: false,
      actionUrl,
      senderName: senderName || user?.displayName || 'Someone',
      senderAvatar: senderAvatar || user?.photoURL || null,
    });
  }, [user]);
  
  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification
  };
}

// Helper functions for creating specific notification types
export const sendMentionNotification = async (
  createNotification: ReturnType<typeof useNotifications>['createNotification'],
  targetUserId: string,
  channelId: string,
  channelName: string,
  spaceId: string,
  messageId: string,
  messageText: string
) => {
  const shortMessage = messageText.length > 100 
    ? messageText.substring(0, 97) + '...' 
    : messageText;
    
  await createNotification(
    targetUserId,
    'mention',
    messageId,
    channelName,
    `@${shortMessage}`,
    `/space/${spaceId}/channel/${channelId}?message=${messageId}`
  );
};

export const sendReplyNotification = async (
  createNotification: ReturnType<typeof useNotifications>['createNotification'],
  targetUserId: string,
  spaceId: string,
  channelId: string,
  messageId: string,
  replyText: string
) => {
  const shortReply = replyText.length > 100 
    ? replyText.substring(0, 97) + '...' 
    : replyText;
    
  await createNotification(
    targetUserId,
    'reply',
    messageId,
    'Reply to your message',
    shortReply,
    `/space/${spaceId}/channel/${channelId}?message=${messageId}`
  );
};

export const sendThreadNotification = async (
  createNotification: ReturnType<typeof useNotifications>['createNotification'],
  targetUserId: string,
  spaceId: string,
  channelId: string,
  threadId: string,
  replyText: string
) => {
  const shortReply = replyText.length > 100 
    ? replyText.substring(0, 97) + '...' 
    : replyText;
    
  await createNotification(
    targetUserId,
    'thread',
    threadId,
    'New reply in thread',
    shortReply,
    `/space/${spaceId}/channel/${channelId}?thread=${threadId}`
  );
};

export const sendDirectMessageNotification = async (
  createNotification: ReturnType<typeof useNotifications>['createNotification'],
  targetUserId: string,
  dmChannelId: string,
  messageText: string,
  senderName?: string
) => {
  const shortMessage = messageText.length > 100 
    ? messageText.substring(0, 97) + '...' 
    : messageText;
    
  await createNotification(
    targetUserId,
    'direct',
    dmChannelId,
    senderName || 'New message',
    shortMessage,
    `/chat/${dmChannelId}`
  );
};

// UI component for notifications
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'mention':
        return <AtSign className="h-4 w-4 text-blue-500" />;
      case 'reply':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'thread':
        return <MessageSquare className="h-4 w-4 text-indigo-500" />;
      case 'direct':
        return <MessageSquare className="h-4 w-4 text-red-500" />;
      case 'channel':
        return <Hash className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };
  
  const handleClick = async () => {
    await onMarkAsRead(notification.id);
    window.location.href = notification.actionUrl;
  };
  
  return (
    <div 
      className={`p-3 border-b last:border-none ${notification.read ? '' : 'bg-muted/40'} cursor-pointer hover:bg-muted/60`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="font-medium text-sm">{notification.sourceName}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <div className="text-sm mt-0.5 break-all line-clamp-2">{notification.message}</div>
          {notification.senderName && (
            <div className="text-xs text-muted-foreground mt-1">
              From {notification.senderName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook for handling mentions in messages
export function useMentionNotifications(
  createNotification: ReturnType<typeof useNotifications>['createNotification']
) {
  // Process message text to find and notify mentioned users
  const processMentions = useCallback(async (
    messageText: string,
    channelId: string, 
    channelName: string,
    spaceId: string,
    messageId: string
  ) => {
    // Match @username or @display name patterns
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const mentions = messageText.match(mentionRegex);
    
    if (!mentions || mentions.length === 0) return;
    
    // Get all users in the space
    const spaceUsersRef = rtdbRef(rtdb, `spaces/${spaceId}/members`);
    const snapshot = await get(spaceUsersRef);
    const spaceUsers = snapshot.val() || {};
    
    // For each mention, find the user and send notification
    for (const mention of mentions) {
      const username = mention.substring(1).toLowerCase(); // Remove @ and lowercase
      
      // Find user with matching username or display name
      const matchingUser = Object.entries(spaceUsers).find(([uid, userData]: [string, any]) => {
        const displayName = userData.displayName?.toLowerCase() || '';
        const userUsername = userData.username?.toLowerCase() || '';
        return userUsername === username || displayName === username;
      });
      
      if (matchingUser) {
        const [userId] = matchingUser;
        await sendMentionNotification(
          createNotification,
          userId,
          channelId,
          channelName,
          spaceId,
          messageId,
          messageText
        );
      }
    }
  }, [createNotification]);
  
  return { processMentions };
}

// Middleware to watch for new messages and detect mentions
export function useNotificationMiddleware() {
  const { createNotification } = useNotifications();
  const { processMentions } = useMentionNotifications(createNotification);
  const [user] = useAuthState(auth);
  
  // Watch for new messages to detect mentions and send notifications
  useEffect(() => {
    if (!user?.uid) return;
    
    // Listen for new messages in all spaces
    const spacesRef = rtdbRef(rtdb, 'spaces');
    
    // This is a simplified version - in a real app you'd need to optimize this
    // to only listen to spaces the user is part of
    const unsubscribe = onValue(spacesRef, async (snapshot) => {
      const spaces = snapshot.val();
      if (!spaces) return;
      
      // Process each space's messages
      for (const [spaceId, spaceData] of Object.entries(spaces)) {
        const spaceObj = spaceData as any;
        
        // Check if user is member of this space
        if (!spaceObj.members || !spaceObj.members[user.uid]) continue;
        
        // Process channels
        if (spaceObj.channels) {
          for (const [channelId, channelData] of Object.entries(spaceObj.channels)) {
            const channel = channelData as any;
            
            // If private channel, check if user is a member
            if (channel.isPrivate && (!channel.members || !channel.members.includes(user.uid))) {
              continue;
            }
            
            // Watch for new messages in channel
            const messagesRef = rtdbRef(rtdb, `spaces/${spaceId}/channels/${channelId}/messages`);
            onValue(messagesRef, async (msgSnapshot) => {
              const messages = msgSnapshot.val();
              if (!messages) return;
              
              // Process only the last 50 messages (for performance)
              const recentMessages = Object.entries(messages)
                .sort(([, a]: [string, any], [, b]: [string, any]) => b.timestamp - a.timestamp)
                .slice(0, 50);
              
              for (const [messageId, messageData] of recentMessages) {
                const msg = messageData as any;
                
                // Skip messages older than 5 minutes
                const msgTime = msg.timestamp || 0;
                const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
                if (msgTime < fiveMinutesAgo) continue;
                
                // Skip own messages
                if (msg.uid === user.uid) continue;
                
                // Process mentions
                if (msg.type === 'text' && msg.message) {
                  processMentions(
                    msg.message,
                    channelId,
                    channel.name || 'Unknown Channel',
                    spaceId,
                    messageId
                  );
                }
                
                // Process replies to user's messages
                if (msg.replyToId) {
                  const repliedMsgRef = rtdbRef(rtdb, `spaces/${spaceId}/channels/${channelId}/messages/${msg.replyToId}`);
                  const repliedMsgSnapshot = await get(repliedMsgRef);
                  const repliedMsg = repliedMsgSnapshot.val();
                  
                  if (repliedMsg && repliedMsg.uid === user.uid) {
                    sendReplyNotification(
                      createNotification,
                      user.uid,
                      spaceId,
                      channelId,
                      messageId,
                      msg.message || 'New reply to your message'
                    );
                  }
                }
              }
            });
          }
        }
        
        // Process direct messages (DMs)
        if (spaceObj.dms) {
          for (const [dmId, dmData] of Object.entries(spaceObj.dms)) {
            const dm = dmData as any;
            
            // Check if DM involves current user
            const participants = dm.participants || [];
            if (!participants.includes(user.uid)) continue;
            
            // Get other participant
            const otherUser = participants.find((uid: string) => uid !== user.uid);
            if (!otherUser) continue;
            
            // Watch for new messages
            const dmMessagesRef = rtdbRef(rtdb, `spaces/${spaceId}/dms/${dmId}/messages`);
            onValue(dmMessagesRef, async (msgSnapshot) => {
              const messages = msgSnapshot.val();
              if (!messages) return;
              
              // Process only the last 20 DMs (for performance)
              const recentMessages = Object.entries(messages)
                .sort(([, a]: [string, any], [, b]: [string, any]) => b.timestamp - a.timestamp)
                .slice(0, 20);
              
              for (const [messageId, messageData] of recentMessages) {
                const msg = messageData as any;
                
                // Skip messages older than 5 minutes
                const msgTime = msg.timestamp || 0;
                const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
                if (msgTime < fiveMinutesAgo) continue;
                
                // Skip own messages
                if (msg.uid === user.uid) continue;
                
                // Notify about new DM
                sendDirectMessageNotification(
                  createNotification,
                  user.uid,
                  dmId,
                  msg.message || 'New direct message',
                  msg.name || 'Someone'
                );
              }
            });
          }
        }
        
        // Process threads
        if (spaceObj.threads) {
          for (const [threadId, threadData] of Object.entries(spaceObj.threads)) {
            const thread = threadData as any;
            
            // Check if thread involves current user (by checking parentMessage)
            const parentMessageRef = rtdbRef(rtdb, `spaces/${spaceId}/messages/${threadId}`);
            const parentMsgSnapshot = await get(parentMessageRef);
            const parentMsg = parentMsgSnapshot.val();
            
            let shouldWatchThread = false;
            let channelId = '';
            
            if (parentMsg) {
              channelId = parentMsg.channelId || '';
              
              // If user created the thread or has participated, watch it
              if (parentMsg.uid === user.uid) {
                shouldWatchThread = true;
              } else {
                // Check if user has participated in this thread
                const participantIds = Object.values(thread)
                  .map((msg: any) => msg.uid)
                  .filter(Boolean);
                  
                shouldWatchThread = participantIds.includes(user.uid);
              }
            }
            
            if (!shouldWatchThread) continue;
            
            // Watch for new thread replies
            const threadRepliesRef = rtdbRef(rtdb, `spaces/${spaceId}/threads/${threadId}`);
            onValue(threadRepliesRef, async (repliesSnapshot) => {
              const replies = repliesSnapshot.val();
              if (!replies) return;
              
              // Process only the last 20 replies (for performance)
              const recentReplies = Object.entries(replies)
                .sort(([, a]: [string, any], [, b]: [string, any]) => b.timestamp - a.timestamp)
                .slice(0, 20);
              
              for (const [replyId, replyData] of recentReplies) {
                const reply = replyData as any;
                
                // Skip replies older than 5 minutes
                const replyTime = reply.timestamp || 0;
                const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
                if (replyTime < fiveMinutesAgo) continue;
                
                // Skip own replies
                if (reply.uid === user.uid) continue;
                
                // Notify about new thread reply
                sendThreadNotification(
                  createNotification,
                  user.uid,
                  spaceId,
                  channelId,
                  threadId,
                  reply.message || 'New reply in thread'
                );
              }
            });
          }
        }
      }
    });
    
    return () => unsubscribe();
  }, [user?.uid, createNotification, processMentions]);
  
  return null; // This hook is used for side effects only
}

// UI Component for notification center
export function NotificationCenter() {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications();
  const [open, setOpen] = useState(false);
  
  // Initialize notification listener middleware
  useNotificationMiddleware();
  
  // Show a toast when new notifications arrive
  useEffect(() => {
    if (unreadCount > 0) {
      toast({
        title: `You have ${unreadCount} new notification${unreadCount > 1 ? 's' : ''}`,
        description: "Click to view them",
        action: (
          <button 
            className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm"
            onClick={() => setOpen(true)}
          >
            View
          </button>
        ),
      });
    }
  }, [unreadCount]);
  
  return (
    <div>
      {/* Notification bell icon with badge */}
      <div className="relative">
        <button 
          className="p-2 rounded-md hover:bg-muted"
          onClick={() => setOpen(!open)}
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        
        {/* Notification dropdown */}
        {open && (
          <div className="absolute right-0 mt-2 w-80 bg-background border shadow-lg rounded-md overflow-hidden z-50">
            <div className="p-3 border-b flex justify-between items-center">
              <h3 className="font-medium">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  className="text-xs text-primary hover:underline"
                  onClick={markAllAsRead}
                >
                  Mark all as read
                </button>
              )}
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <BellOff className="h-5 w-5 mx-auto mb-2" />
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onDelete={deleteNotification}
                  />
                ))
              )}
            </div>
            
            {notifications.length > 0 && (
              <div className="p-2 border-t text-center">
                <button 
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    // Navigate to notifications page
                    window.location.href = '/notifications';
                    setOpen(false);
                  }}
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}