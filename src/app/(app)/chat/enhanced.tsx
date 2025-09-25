'use client';

import { useState } from 'react';
import { EnhancedMessaging } from '@/components/chat/enhanced-messaging';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Users, 
  Search, 
  Plus, 
  Hash, 
  Lock,
  Star,
  Archive,
  Settings,
  Filter,
  UserPlus,
  MessageCircle,
  Video,
  Phone,
  MoreVertical,
  Bell,
  BellOff
} from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

export default function ChatPage() {
  const [user] = useAuthState(auth);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedDM, setSelectedDM] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('channels');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - in real app, this would come from Firebase
  const channels = [
    { id: '1', name: 'general', description: 'General discussion', memberCount: 15, isPrivate: false, unreadCount: 3 },
    { id: '2', name: 'development', description: 'Development team chat', memberCount: 8, isPrivate: false, unreadCount: 0 },
    { id: '3', name: 'design', description: 'Design team collaboration', memberCount: 5, isPrivate: false, unreadCount: 1 },
    { id: '4', name: 'leadership', description: 'Leadership discussions', memberCount: 3, isPrivate: true, unreadCount: 0 },
  ];

  const directMessages = [
    { id: '1', name: 'Alice Johnson', avatar: '', status: 'online', lastMessage: 'Hey, how are you?', timestamp: '2 min ago', unreadCount: 2 },
    { id: '2', name: 'Bob Smith', avatar: '', status: 'away', lastMessage: 'Let me check that for you', timestamp: '1 hour ago', unreadCount: 0 },
    { id: '3', name: 'Carol Davis', avatar: '', status: 'offline', lastMessage: 'Thanks for your help!', timestamp: 'Yesterday', unreadCount: 1 },
  ];

  const teams = [
    { id: '1', name: 'Marketing Team', memberCount: 12, unreadCount: 5 },
    { id: '2', name: 'Engineering', memberCount: 25, unreadCount: 0 },
    { id: '3', name: 'Sales Team', memberCount: 8, unreadCount: 2 },
  ];

  const filteredChannels = channels.filter(channel => 
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDMs = directMessages.filter(dm => 
    dm.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Messages</h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 m-4">
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="dms">Direct</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
          </TabsList>

          {/* Channels Tab */}
          <TabsContent value="channels" className="flex-1 px-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-600">CHANNELS</h3>
              <Button variant="ghost" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="space-y-1">
                {filteredChannels.map((channel) => (
                  <div
                    key={channel.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors ${
                      selectedChannel === channel.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => setSelectedChannel(channel.id)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {channel.isPrivate ? (
                        <Lock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      ) : (
                        <Hash className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{channel.name}</p>
                        <p className="text-xs text-gray-500 truncate">{channel.memberCount} members</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {channel.unreadCount > 0 && (
                        <Badge variant="default" className="bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                          {channel.unreadCount}
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Direct Messages Tab */}
          <TabsContent value="dms" className="flex-1 px-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-600">DIRECT MESSAGES</h3>
              <Button variant="ghost" size="sm">
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="space-y-1">
                {filteredDMs.map((dm) => (
                  <div
                    key={dm.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors ${
                      selectedDM === dm.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => setSelectedDM(dm.id)}
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={dm.avatar} />
                        <AvatarFallback className="text-xs">{dm.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(dm.status)}`}></div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{dm.name}</p>
                        <span className="text-xs text-gray-500">{dm.timestamp}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{dm.lastMessage}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {dm.unreadCount > 0 && (
                        <Badge variant="default" className="bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                          {dm.unreadCount}
                        </Badge>
                      )}
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                          <Phone className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                          <Video className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="flex-1 px-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-600">TEAMS</h3>
              <Button variant="ghost" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="space-y-1">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Users className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{team.name}</p>
                        <p className="text-xs text-gray-500 truncate">{team.memberCount} members</p>
                      </div>
                    </div>
                    
                    {team.unreadCount > 0 && (
                      <Badge variant="default" className="bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                        {team.unreadCount}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChannel || selectedDM ? (
          <EnhancedMessaging
            channelId={selectedChannel ? selectedChannel : ""} 
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose a channel or direct message to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}