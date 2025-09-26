'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Send,
  MessageCircle,
  MessageSquare,
  PlusCircle,
  MoreHorizontal,
  Pin,
  ThumbsUp,
  Reply,
  Trash2,
  Edit,
  Search,
  Users,
  AlertCircle,
  Bell,
  Megaphone,
  Check,
  FileText,
  Image,
  Link,
  PaperclipIcon,
  AtSign,
  Smile,
  X,
  Bookmark,
  EyeOff,
  Volume2,
} from 'lucide-react';

// Types and Interfaces
interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

interface Channel {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  type: 'general' | 'announcements' | 'project' | 'topic';
  createdBy: string;
  createdAt: any;
  members?: string[];
  isPrivate: boolean;
}

interface Message {
  id: string;
  channelId: string;
  content: string;
  sender: string;
  senderName?: string;
  senderPhotoURL?: string;
  createdAt: any;
  updatedAt?: any;
  isEdited: boolean;
  isPinned: boolean;
  isAnnouncement: boolean;
  reactions?: MessageReaction[];
  attachments?: MessageAttachment[];
  mentions?: string[];
  replies?: Message[];
  replyTo?: string;
}

interface MessageReaction {
  type: string;
  users: string[];
}

interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  thumbnailUrl?: string;
  size?: number;
}

interface Announcement {
  id: string;
  teamId: string;
  title: string;
  content: string;
  author: string;
  authorName?: string;
  authorPhotoURL?: string;
  createdAt: any;
  updatedAt?: any;
  isPinned: boolean;
  isImportant: boolean;
  attachments?: MessageAttachment[];
  readBy?: string[];
}

interface TeamCommunicationProps {
  teamId: string;
}

export function TeamCommunication({ teamId }: TeamCommunicationProps) {
  const [user] = useAuthState(auth);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Form states
  const [newChannel, setNewChannel] = useState({
    name: '',
    description: '',
    type: 'general' as const,
    isPrivate: false,
  });
  
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    isImportant: false,
  });

  useEffect(() => {
    if (!user || !teamId) return;

    setLoading(true);

    // Load channels
    const channelsQuery = query(
      collection(db, 'channels'),
      where('teamId', '==', teamId)
    );
    
    const unsubscribeChannels = onSnapshot(channelsQuery, (snapshot) => {
      const channelList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Channel[];
      
      setChannels(channelList);
      
      // Select first channel if none selected
      if (channelList.length > 0 && !selectedChannelId) {
        const generalChannel = channelList.find(c => c.type === 'general');
        setSelectedChannelId(generalChannel?.id || channelList[0].id);
      }
    });

    // Load team announcements
    const announcementsQuery = query(
      collection(db, 'announcements'),
      where('teamId', '==', teamId),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribeAnnouncements = onSnapshot(announcementsQuery, async (snapshot) => {
      const announcementsList = [] as Announcement[];
      
      for (const announcementDoc of snapshot.docs) {
        const announcementData = announcementDoc.data() as Announcement;
        announcementData.id = announcementDoc.id;
        
        // Add author info if not in cache
        if (announcementData.author && !users.has(announcementData.author)) {
          try {
            const userDoc = await getDoc(doc(db, 'users', announcementData.author));
            if (userDoc.exists()) {
              const userData = userDoc.data() as User;
              userData.id = userDoc.id;
              
              setUsers(prev => new Map(prev).set(userData.id, userData));
              
              announcementData.authorName = userData.displayName;
              announcementData.authorPhotoURL = userData.photoURL;
            }
          } catch (error) {
            console.error('Error fetching user:', error);
          }
        } else if (users.has(announcementData.author)) {
          const userData = users.get(announcementData.author)!;
          announcementData.authorName = userData.displayName;
          announcementData.authorPhotoURL = userData.photoURL;
        }
        
        announcementsList.push(announcementData);
      }
      
      setAnnouncements(announcementsList);
    });

    setLoading(false);

    return () => {
      unsubscribeChannels();
      unsubscribeAnnouncements();
    };
  }, [user, teamId]);

  // Load messages when channel changes
  useEffect(() => {
    if (!selectedChannelId) return;
    
    setMessages([]);
    
    const messagesQuery = query(
      collection(db, 'messages'),
      where('channelId', '==', selectedChannelId),
      orderBy('createdAt', 'asc')
    );
    
    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const messagesList = [] as Message[];
      
      for (const messageDoc of snapshot.docs) {
        const messageData = messageDoc.data() as Message;
        messageData.id = messageDoc.id;
        
        // Add sender info if not in cache
        if (messageData.sender && !users.has(messageData.sender)) {
          try {
            const userDoc = await getDoc(doc(db, 'users', messageData.sender));
            if (userDoc.exists()) {
              const userData = userDoc.data() as User;
              userData.id = userDoc.id;
              
              setUsers(prev => new Map(prev).set(userData.id, userData));
              
              messageData.senderName = userData.displayName;
              messageData.senderPhotoURL = userData.photoURL;
            }
          } catch (error) {
            console.error('Error fetching user:', error);
          }
        } else if (users.has(messageData.sender)) {
          const userData = users.get(messageData.sender)!;
          messageData.senderName = userData.displayName;
          messageData.senderPhotoURL = userData.photoURL;
        }
        
        messagesList.push(messageData);
      }
      
      setMessages(messagesList);
      scrollToBottom();
    });
    
    return () => unsubscribe();
  }, [selectedChannelId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Create new channel
  const createChannel = async () => {
    if (!user || !teamId || !newChannel.name.trim()) return;
    
    try {
      const channelData = {
        teamId,
        name: newChannel.name.trim(),
        description: newChannel.description.trim(),
        type: newChannel.type,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        isPrivate: newChannel.isPrivate,
      };
      
      const docRef = await addDoc(collection(db, 'channels'), channelData);
      
      setShowNewChannel(false);
      resetChannelForm();
      setSelectedChannelId(docRef.id);
      
      toast({
        title: "Channel created",
        description: `${newChannel.name} channel has been created.`,
      });
      
    } catch (error) {
      console.error('Error creating channel:', error);
      toast({
        title: "Error",
        description: "Failed to create channel.",
        variant: "destructive"
      });
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!user || !selectedChannelId || !messageText.trim()) return;
    
    try {
      if (editingMessage) {
        // Update existing message
        await updateDoc(doc(db, 'messages', editingMessage.id), {
          content: messageText.trim(),
          updatedAt: serverTimestamp(),
          isEdited: true,
        });
        
        setEditingMessage(null);
      } else {
        // Create new message
        const messageData = {
          channelId: selectedChannelId,
          content: messageText.trim(),
          sender: user.uid,
          senderName: user.displayName,
          senderPhotoURL: user.photoURL || null,
          createdAt: serverTimestamp(),
          isEdited: false,
          isPinned: false,
          isAnnouncement: false,
          reactions: [],
          mentions: extractMentions(messageText),
        };
        
        await addDoc(collection(db, 'messages'), messageData);
      }
      
      setMessageText('');
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive"
      });
    }
  };

  // Create announcement
  const createAnnouncement = async () => {
    if (!user || !teamId || !newAnnouncement.title.trim() || !newAnnouncement.content.trim()) return;
    
    try {
      const announcementData = {
        teamId,
        title: newAnnouncement.title.trim(),
        content: newAnnouncement.content.trim(),
        author: user.uid,
        authorName: user.displayName,
        authorPhotoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        isPinned: false,
        isImportant: newAnnouncement.isImportant,
        readBy: [user.uid],
      };
      
      await addDoc(collection(db, 'announcements'), announcementData);
      
      setShowNewAnnouncement(false);
      resetAnnouncementForm();
      
      toast({
        title: "Announcement created",
        description: "Your announcement has been published.",
      });
      
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast({
        title: "Error",
        description: "Failed to create announcement.",
        variant: "destructive"
      });
    }
  };

  // Pin or unpin message
  const togglePinMessage = async (message: Message) => {
    try {
      await updateDoc(doc(db, 'messages', message.id), {
        isPinned: !message.isPinned,
      });
      
      toast({
        title: message.isPinned ? "Message unpinned" : "Message pinned",
        description: message.isPinned 
          ? "Message has been removed from pinned messages." 
          : "Message has been added to pinned messages.",
      });
      
    } catch (error) {
      console.error('Error pinning/unpinning message:', error);
      toast({
        title: "Error",
        description: "Failed to pin/unpin message.",
        variant: "destructive"
      });
    }
  };

  // Pin or unpin announcement
  const togglePinAnnouncement = async (announcement: Announcement) => {
    try {
      await updateDoc(doc(db, 'announcements', announcement.id), {
        isPinned: !announcement.isPinned,
      });
      
      toast({
        title: announcement.isPinned ? "Announcement unpinned" : "Announcement pinned",
        description: announcement.isPinned 
          ? "Announcement has been removed from pinned announcements." 
          : "Announcement has been added to pinned announcements.",
      });
      
    } catch (error) {
      console.error('Error pinning/unpinning announcement:', error);
      toast({
        title: "Error",
        description: "Failed to pin/unpin announcement.",
        variant: "destructive"
      });
    }
  };

  // Mark announcement as read
  const markAnnouncementAsRead = async (announcement: Announcement) => {
    if (!user || !announcement.id) return;
    
    // Skip if already marked as read
    if (announcement.readBy?.includes(user.uid)) return;
    
    try {
      await updateDoc(doc(db, 'announcements', announcement.id), {
        readBy: [...(announcement.readBy || []), user.uid],
      });
      
    } catch (error) {
      console.error('Error marking announcement as read:', error);
    }
  };

  // Delete message
  const deleteMessage = async (messageId: string) => {
    try {
      await deleteDoc(doc(db, 'messages', messageId));
      
      toast({
        title: "Message deleted",
        description: "Message has been deleted.",
      });
      
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message.",
        variant: "destructive"
      });
    }
  };

  // Delete announcement
  const deleteAnnouncement = async (announcementId: string) => {
    try {
      await deleteDoc(doc(db, 'announcements', announcementId));
      
      toast({
        title: "Announcement deleted",
        description: "Announcement has been deleted.",
      });
      
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast({
        title: "Error",
        description: "Failed to delete announcement.",
        variant: "destructive"
      });
    }
  };

  // Add reaction to message
  const addReaction = async (messageId: string, reactionType: string) => {
    if (!user) return;
    
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) return;
      
      const messageData = messageDoc.data() as Message;
      let reactions = messageData.reactions || [];
      
      const existingReaction = reactions.findIndex(r => r.type === reactionType);
      if (existingReaction >= 0) {
        // Check if user already reacted
        const userIndex = reactions[existingReaction].users.indexOf(user.uid);
        
        if (userIndex >= 0) {
          // Remove user from reaction
          reactions[existingReaction].users.splice(userIndex, 1);
          
          // Remove reaction if no users left
          if (reactions[existingReaction].users.length === 0) {
            reactions.splice(existingReaction, 1);
          }
        } else {
          // Add user to existing reaction
          reactions[existingReaction].users.push(user.uid);
        }
      } else {
        // Add new reaction type
        reactions.push({
          type: reactionType,
          users: [user.uid]
        });
      }
      
      await updateDoc(messageRef, { reactions });
      
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast({
        title: "Error",
        description: "Failed to add reaction.",
        variant: "destructive"
      });
    }
  };

  // Extract mentions from message text (e.g. @username)
  const extractMentions = (text: string): string[] => {
    const mentions = [];
    const mentionRegex = /@(\w+)/g;
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  };

  // Format message timestamp
  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp.seconds * 1000);
    const now = new Date();
    
    // If today, show time only
    if (date.toDateString() === now.toDateString()) {
      return format(date, 'h:mm a');
    }
    
    // If this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return format(date, 'MMM d');
    }
    
    // Otherwise show with year
    return format(date, 'MMM d, yyyy');
  };

  // Format time relative to now (e.g. "2 hours ago")
  const formatRelativeTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp.seconds * 1000);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  // Reset form states
  const resetChannelForm = () => {
    setNewChannel({
      name: '',
      description: '',
      type: 'general',
      isPrivate: false,
    });
  };

  const resetAnnouncementForm = () => {
    setNewAnnouncement({
      title: '',
      content: '',
      isImportant: false,
    });
  };

  // Get name initials for avatar fallback
  const getNameInitials = (name: string) => {
    if (!name) return '?';
    
    const nameParts = name.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  // Get channel icon based on type
  const getChannelIcon = (type: Channel['type']) => {
    switch (type) {
      case 'general':
        return <MessageSquare className="h-4 w-4" />;
      case 'announcements':
        return <Megaphone className="h-4 w-4" />;
      case 'project':
        return <FileText className="h-4 w-4" />;
      case 'topic':
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  // Render message content with formatted mentions
  const renderMessageContent = (content: string) => {
    return content.split(/(@\w+)/).map((part, index) => {
      if (part.startsWith('@')) {
        return <span key={index} className="text-primary font-medium">{part}</span>;
      }
      return part;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading team communications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)]">
      <Tabs defaultValue="chat" className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="chat" className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>Chat</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center gap-1">
              <Megaphone className="h-4 w-4" />
              <span>Announcements</span>
              {announcements.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {announcements.filter(a => !a.readBy?.includes(user?.uid || '')).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8"
              onClick={() => setShowNewChannel(true)}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              New Channel
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8"
              onClick={() => setShowNewAnnouncement(true)}
            >
              <Megaphone className="h-4 w-4 mr-2" />
              New Announcement
            </Button>
          </div>
        </div>
        
        <TabsContent value="chat" className="h-full flex-1 m-0 flex border rounded-md overflow-hidden">
          {/* Channels sidebar */}
          <div className="w-56 border-r bg-muted/30 flex flex-col">
            <div className="p-3 border-b">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Channels</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => setShowNewChannel(true)}
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search channels"
                  className="h-8 pl-7 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-1">
                {channels.filter(c => 
                  c.name.toLowerCase().includes(searchQuery.toLowerCase())
                ).map(channel => (
                  <Button
                    key={channel.id}
                    variant={selectedChannelId === channel.id ? "secondary" : "ghost"}
                    className={`w-full justify-start text-sm h-8 ${
                      selectedChannelId === channel.id ? 'font-medium' : 'font-normal'
                    }`}
                    onClick={() => setSelectedChannelId(channel.id)}
                  >
                    <div className="flex items-center w-full overflow-hidden">
                      {getChannelIcon(channel.type)}
                      <span className="ml-2 truncate">
                        {channel.name}
                      </span>
                      {channel.isPrivate && (
                        <EyeOff className="h-3 w-3 ml-auto text-muted-foreground" />
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            {selectedChannelId ? (
              <>
                {/* Channel header */}
                <div className="p-3 border-b flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-lg flex items-center">
                      {getChannelIcon(channels.find(c => c.id === selectedChannelId)?.type || 'general')}
                      <span className="ml-2">
                        {channels.find(c => c.id === selectedChannelId)?.name}
                      </span>
                    </h3>
                    {channels.find(c => c.id === selectedChannelId)?.description && (
                      <p className="text-sm text-muted-foreground">
                        {channels.find(c => c.id === selectedChannelId)?.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-8">
                      <Users className="h-4 w-4 mr-2" />
                      <span>Members</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No messages yet</h3>
                      <p className="text-muted-foreground mb-4 max-w-md">
                        Be the first to start the conversation in this channel
                      </p>
                      <Button onClick={() => {
                        const textarea = document.getElementById('messageInput');
                        textarea?.focus();
                      }}>
                        Start Conversation
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Pinned messages */}
                      {messages.some(m => m.isPinned) && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                            <Pin className="h-4 w-4" />
                            <span>Pinned Messages</span>
                          </div>
                          <div className="space-y-2">
                            {messages.filter(m => m.isPinned).map(message => (
                              <div
                                key={`pinned-${message.id}`}
                                className="bg-muted/40 p-2 rounded-md text-sm"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <Avatar className="h-5 w-5">
                                    {message.senderPhotoURL ? (
                                      <AvatarImage src={message.senderPhotoURL} />
                                    ) : null}
                                    <AvatarFallback className="text-xs">
                                      {getNameInitials(message.senderName || '')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">
                                    {message.senderName || 'Unknown'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatMessageTime(message.createdAt)}
                                  </span>
                                </div>
                                <p className="ml-7">{message.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Regular messages */}
                      {messages.map((message) => (
                        <div key={message.id} className="group">
                          <div className="flex gap-3">
                            <Avatar>
                              {message.senderPhotoURL ? (
                                <AvatarImage src={message.senderPhotoURL} />
                              ) : null}
                              <AvatarFallback>
                                {getNameInitials(message.senderName || '')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {message.senderName || 'Unknown'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatMessageTime(message.createdAt)}
                                </span>
                                {message.isEdited && (
                                  <span className="text-xs text-muted-foreground">(edited)</span>
                                )}
                                {message.isPinned && (
                                  <Pin className="h-3 w-3 text-muted-foreground" />
                                )}
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex items-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0"
                                    onClick={() => {
                                      setEditingMessage(message);
                                      setMessageText(message.content);
                                      
                                      // Focus on input
                                      setTimeout(() => {
                                        const textarea = document.getElementById('messageInput');
                                        textarea?.focus();
                                      }, 100);
                                    }}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => togglePinMessage(message)}>
                                        <Pin className="h-4 w-4 mr-2" />
                                        {message.isPinned ? 'Unpin Message' : 'Pin Message'}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
                                        <Reply className="h-4 w-4 mr-2" />
                                        Reply
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
                                        <Bookmark className="h-4 w-4 mr-2" />
                                        Save
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        className="text-destructive"
                                        onClick={() => deleteMessage(message.id)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              <div className="mt-1">
                                <p className="whitespace-pre-wrap">
                                  {renderMessageContent(message.content)}
                                </p>
                              </div>
                              
                              {/* Reactions */}
                              {message.reactions && message.reactions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {message.reactions.map((reaction, index) => (
                                    <Button
                                      key={`${message.id}-${index}`}
                                      variant="outline"
                                      size="sm"
                                      className={`h-6 text-xs px-2 ${
                                        reaction.users.includes(user?.uid || '') 
                                          ? 'bg-primary/10' 
                                          : ''
                                      }`}
                                      onClick={() => addReaction(message.id, reaction.type)}
                                    >
                                      {reaction.type} {reaction.users.length}
                                    </Button>
                                  ))}
                                </div>
                              )}
                              
                              {/* Quick reaction buttons */}
                              <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={() => addReaction(message.id, '👍')}
                                  >
                                    👍
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={() => addReaction(message.id, '❤️')}
                                  >
                                    ❤️
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={() => addReaction(message.id, '😄')}
                                  >
                                    😄
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 text-xs px-2"
                                    onClick={() => {
                                      // Show emoji picker (would be implemented with an emoji picker library)
                                    }}
                                  >
                                    <Smile className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
                
                {/* Message input */}
                <div className="p-3 border-t">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <Textarea
                        id="messageInput"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder={
                          editingMessage 
                            ? "Edit your message..." 
                            : `Message ${channels.find(c => c.id === selectedChannelId)?.name}`
                        }
                        className="min-h-[60px] pr-10"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                      />
                      <div className="absolute right-2 bottom-2 flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <PaperclipIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <AtSign className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Smile className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Button 
                      onClick={sendMessage} 
                      disabled={!messageText.trim()}
                      className="self-end h-10"
                    >
                      {editingMessage ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Save
                        </>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                    {editingMessage && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="self-end h-10"
                        onClick={() => {
                          setEditingMessage(null);
                          setMessageText('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No channel selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select a channel from the sidebar or create a new one
                </p>
                <Button onClick={() => setShowNewChannel(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Channel
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="announcements" className="flex-1 m-0">
          <div className="flex flex-col h-full">
            {/* Announcements header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-medium flex items-center">
                  <Megaphone className="h-5 w-5 mr-2" />
                  Team Announcements
                </h3>
                <p className="text-sm text-muted-foreground">
                  Important updates and announcements for the team
                </p>
              </div>
              <Button onClick={() => setShowNewAnnouncement(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Announcement
              </Button>
            </div>
            
            {/* Announcements list */}
            <div className="flex-1 space-y-4 overflow-auto pr-1">
              {/* Pinned announcements */}
              {announcements.some(a => a.isPinned) && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-sm font-medium mb-3">
                    <Pin className="h-4 w-4" />
                    <span>Pinned Announcements</span>
                  </div>
                  {announcements.filter(a => a.isPinned).map(announcement => (
                    <Card 
                      key={`pinned-${announcement.id}`} 
                      className="mb-3 bg-muted/20 hover:shadow transition-shadow"
                      onClick={() => markAnnouncementAsRead(announcement)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={`${announcement.isImportant ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                              {announcement.isImportant ? 'Important' : 'Announcement'}
                            </Badge>
                            <div className="flex items-center">
                              <Pin className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  togglePinAnnouncement(announcement);
                                }}>
                                  <Pin className="h-4 w-4 mr-2" />
                                  Unpin
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteAnnouncement(announcement.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <CardTitle className="text-lg mt-1">{announcement.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap">{announcement.content}</p>
                      </CardContent>
                      <CardFooter className="pt-0 text-sm text-muted-foreground flex justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            {announcement.authorPhotoURL ? (
                              <AvatarImage src={announcement.authorPhotoURL} />
                            ) : null}
                            <AvatarFallback className="text-xs">
                              {getNameInitials(announcement.authorName || '')}
                            </AvatarFallback>
                          </Avatar>
                          <span>{announcement.authorName || 'Unknown'}</span>
                        </div>
                        <div>
                          {formatRelativeTime(announcement.createdAt)}
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
              
              {/* Regular announcements */}
              {announcements.filter(a => !a.isPinned).length > 0 ? (
                announcements.filter(a => !a.isPinned).map(announcement => (
                  <Card 
                    key={announcement.id} 
                    className={`group hover:shadow transition-shadow ${
                      !announcement.readBy?.includes(user?.uid || '') 
                        ? 'border-l-4 border-l-primary' 
                        : ''
                    }`}
                    onClick={() => markAnnouncementAsRead(announcement)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge className={`${announcement.isImportant ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                          {announcement.isImportant ? 'Important' : 'Announcement'}
                        </Badge>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinAnnouncement(announcement);
                            }}
                          >
                            <Pin className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteAnnouncement(announcement.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <CardTitle className="text-lg mt-1">{announcement.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{announcement.content}</p>
                    </CardContent>
                    <CardFooter className="pt-0 text-sm text-muted-foreground flex justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          {announcement.authorPhotoURL ? (
                            <AvatarImage src={announcement.authorPhotoURL} />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {getNameInitials(announcement.authorName || '')}
                          </AvatarFallback>
                        </Avatar>
                        <span>{announcement.authorName || 'Unknown'}</span>
                      </div>
                      <div>
                        {formatRelativeTime(announcement.createdAt)}
                      </div>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <Megaphone className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-medium mb-2">No announcements</h3>
                  <p className="text-muted-foreground mb-6">
                    There are no team announcements yet
                  </p>
                  <Button onClick={() => setShowNewAnnouncement(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Announcement
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Create Channel Dialog */}
      <Dialog open={showNewChannel} onOpenChange={setShowNewChannel}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="channelName">Channel Name</Label>
              <Input
                id="channelName"
                value={newChannel.name}
                onChange={(e) => setNewChannel(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., project-discussion"
              />
            </div>
            
            <div>
              <Label htmlFor="channelDescription">Description (optional)</Label>
              <Textarea
                id="channelDescription"
                value={newChannel.description}
                onChange={(e) => setNewChannel(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What's this channel about?"
                className="resize-none"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="channelType">Channel Type</Label>
              <Select
                value={newChannel.type}
                onValueChange={(value) => setNewChannel(prev => ({ ...prev, type: value as any }))}
              >
                <SelectTrigger id="channelType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="announcements">Announcements</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="topic">Topic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="private"
                checked={newChannel.isPrivate}
                onChange={(e) => setNewChannel(prev => ({ ...prev, isPrivate: e.target.checked }))}
                className="rounded border-gray-300 h-4 w-4 text-primary focus:ring-primary"
              />
              <Label htmlFor="private" className="text-sm font-normal">
                Make this a private channel
              </Label>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowNewChannel(false);
                resetChannelForm();
              }}>
                Cancel
              </Button>
              <Button 
                onClick={createChannel}
                disabled={!newChannel.name.trim()}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Channel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Create Announcement Dialog */}
      <Dialog open={showNewAnnouncement} onOpenChange={setShowNewAnnouncement}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="announcementTitle">Title</Label>
              <Input
                id="announcementTitle"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Announcement title"
              />
            </div>
            
            <div>
              <Label htmlFor="announcementContent">Content</Label>
              <Textarea
                id="announcementContent"
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your announcement here..."
                className="min-h-[200px]"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="important"
                checked={newAnnouncement.isImportant}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, isImportant: e.target.checked }))}
                className="rounded border-gray-300 h-4 w-4 text-primary focus:ring-primary"
              />
              <div className="flex items-center gap-1">
                <Label htmlFor="important" className="text-sm font-normal">
                  Mark as important
                </Label>
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowNewAnnouncement(false);
                resetAnnouncementForm();
              }}>
                Cancel
              </Button>
              <Button 
                onClick={createAnnouncement}
                disabled={!newAnnouncement.title.trim() || !newAnnouncement.content.trim()}
              >
                <Volume2 className="h-4 w-4 mr-2" />
                Publish Announcement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}