'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { auth, rtdb } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { ref as rtdbRef, update, get, push, set, remove, onValue } from 'firebase/database';
import { Settings, Users, Shield, Bell, UserPlus, UserX, Search, Plus } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  createdBy: string;
  createdAt: any;
  members?: string[];
  type: 'text' | 'voice' | 'video';
}

interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role?: 'admin' | 'moderator' | 'member';
  status?: 'online' | 'idle' | 'dnd' | 'offline';
}

interface ChannelSettingsProps {
  spaceId: string;
  channelId: string;
  isAdmin?: boolean;
  onClose: () => void;
}

export function ChannelSettings({ spaceId, channelId, isAdmin = false, onClose }: ChannelSettingsProps) {
  const [user] = useAuthState(auth);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [channelMembers, setChannelMembers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editedChannel, setEditedChannel] = useState<Partial<Channel>>({});
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<string[]>([]);
  
  // Fetch channel data
  useEffect(() => {
    if (!spaceId || !channelId) return;
    
    const channelRef = rtdbRef(rtdb, `spaces/${spaceId}/channels/${channelId}`);
    
    const unsubscribe = onValue(channelRef, (snapshot) => {
      const channelData = snapshot.val();
      if (channelData) {
        setChannel({
          id: channelId,
          ...channelData
        });
        setEditedChannel({
          name: channelData.name,
          description: channelData.description || '',
          isPrivate: channelData.isPrivate || false
        });
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [spaceId, channelId]);
  
  // Fetch members and all users
  useEffect(() => {
    if (!spaceId || !channel) return;
    
    // Function to load users
    const loadUsers = async () => {
      try {
        // Get all space members
        const spaceUsersRef = rtdbRef(rtdb, `spaces/${spaceId}/members`);
        const spaceUsersSnapshot = await get(spaceUsersRef);
        const spaceUsersData = spaceUsersSnapshot.val() || {};
        
        // Format users data
        const users: User[] = Object.entries(spaceUsersData).map(([uid, userData]: [string, any]) => ({
          uid,
          displayName: userData.displayName || 'Unknown',
          email: userData.email || '',
          photoURL: userData.photoURL || '',
          role: userData.role || 'member',
          status: userData.status || 'offline'
        }));
        
        setAllUsers(users);
        
        // For private channels, get channel members
        if (channel.isPrivate && channel.members) {
          const memberUsers = users.filter(u => 
            channel.members?.includes(u.uid)
          );
          setChannelMembers(memberUsers);
        } else {
          // For public channels, all space members are channel members
          setChannelMembers(users);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    loadUsers();
  }, [spaceId, channel]);
  
  // Save channel changes
  const handleSaveChanges = async () => {
    if (!spaceId || !channelId || !user) return;
    
    try {
      const channelRef = rtdbRef(rtdb, `spaces/${spaceId}/channels/${channelId}`);
      await update(channelRef, editedChannel);
      onClose();
    } catch (error) {
      console.error('Error updating channel:', error);
    }
  };
  
  // Add users to channel
  const handleAddUsers = async () => {
    if (!spaceId || !channelId || !channel?.isPrivate || !selectedUsersToAdd.length) return;
    
    try {
      const currentMembers = channel.members || [];
      const newMembers = [...new Set([...currentMembers, ...selectedUsersToAdd])];
      
      const channelRef = rtdbRef(rtdb, `spaces/${spaceId}/channels/${channelId}`);
      await update(channelRef, { members: newMembers });
      
      setSelectedUsersToAdd([]);
    } catch (error) {
      console.error('Error adding users to channel:', error);
    }
  };
  
  // Remove user from channel
  const handleRemoveUser = async (userId: string) => {
    if (!spaceId || !channelId || !channel?.isPrivate) return;
    
    try {
      const currentMembers = channel.members || [];
      const newMembers = currentMembers.filter(id => id !== userId);
      
      const channelRef = rtdbRef(rtdb, `spaces/${spaceId}/channels/${channelId}`);
      await update(channelRef, { members: newMembers });
    } catch (error) {
      console.error('Error removing user from channel:', error);
    }
  };
  
  // Toggle user selection for adding to channel
  const toggleSelectUser = (userId: string) => {
    setSelectedUsersToAdd(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  // Filter users by search query
  const filteredUsers = searchQuery
    ? allUsers.filter(u => 
        u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allUsers;
  
  // Filter out users that are already members
  const nonMemberUsers = filteredUsers.filter(u => 
    !channelMembers.some(m => m.uid === u.uid)
  );
  
  if (loading) {
    return (
      <div className="p-8 text-center">
        <p>Loading channel settings...</p>
      </div>
    );
  }
  
  if (!channel) {
    return (
      <div className="p-8 text-center">
        <p>Channel not found</p>
      </div>
    );
  }
  
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Channel Settings - #{channel.name}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid grid-cols-3 mx-4 my-2">
              <TabsTrigger value="general" className="flex gap-2 items-center">
                <Settings className="h-4 w-4" />
                <span>General</span>
              </TabsTrigger>
              <TabsTrigger value="members" className="flex gap-2 items-center">
                <Users className="h-4 w-4" />
                <span>Members</span>
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex gap-2 items-center" disabled={!isAdmin}>
                <Shield className="h-4 w-4" />
                <span>Permissions</span>
              </TabsTrigger>
            </TabsList>
            
            <ScrollArea className="flex-1 px-6 py-4">
              <TabsContent value="general" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="channel-name">Channel Name</Label>
                  <Input
                    id="channel-name"
                    value={editedChannel.name || ''}
                    onChange={(e) => setEditedChannel(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="channel-description">Description</Label>
                  <Input
                    id="channel-description"
                    value={editedChannel.description || ''}
                    onChange={(e) => setEditedChannel(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What is this channel about?"
                    disabled={!isAdmin}
                  />
                </div>
                
                {isAdmin && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="channel-private"
                      checked={editedChannel.isPrivate || false}
                      onCheckedChange={(checked) => 
                        setEditedChannel(prev => ({ ...prev, isPrivate: checked === true }))
                      }
                      disabled={!isAdmin}
                    />
                    <Label htmlFor="channel-private">Private Channel</Label>
                  </div>
                )}
                
                {isAdmin && (
                  <div className="pt-4">
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this channel? This action cannot be undone.')) {
                          // Delete channel logic
                          const channelRef = rtdbRef(rtdb, `spaces/${spaceId}/channels/${channelId}`);
                          remove(channelRef)
                            .then(() => onClose())
                            .catch(error => console.error('Error deleting channel:', error));
                        }
                      }}
                    >
                      Delete Channel
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="members" className="space-y-4">
                {channel.isPrivate && isAdmin && (
                  <>
                    <div className="space-y-2">
                      <Label>Add Members</Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search users by name or email"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                      
                      {nonMemberUsers.length > 0 ? (
                        <ScrollArea className="h-48 border rounded-md">
                          <div className="p-2 space-y-1">
                            {nonMemberUsers.map(u => (
                              <div 
                                key={u.uid}
                                className="flex items-center justify-between p-2 hover:bg-muted rounded-md"
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={u.photoURL || ''} />
                                    <AvatarFallback>{u.displayName?.[0] || '?'}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="text-sm font-medium">{u.displayName}</div>
                                    <div className="text-xs text-muted-foreground">{u.email}</div>
                                  </div>
                                </div>
                                <Checkbox
                                  checked={selectedUsersToAdd.includes(u.uid)}
                                  onCheckedChange={() => toggleSelectUser(u.uid)}
                                />
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          No additional users to add
                        </div>
                      )}
                      
                      {selectedUsersToAdd.length > 0 && (
                        <Button onClick={handleAddUsers} className="w-full mt-2">
                          <UserPlus className="mr-2 h-4 w-4" />
                          Add {selectedUsersToAdd.length} {selectedUsersToAdd.length === 1 ? 'User' : 'Users'}
                        </Button>
                      )}
                    </div>
                    
                    <div className="border-t pt-4 mt-4">
                      <Label className="mb-2 block">Current Members ({channelMembers.length})</Label>
                    </div>
                  </>
                )}
                
                <ScrollArea className={`${channel.isPrivate && isAdmin ? 'h-48' : 'h-96'} border rounded-md`}>
                  <div className="p-2 space-y-1">
                    {channelMembers.map(member => (
                      <div 
                        key={member.uid}
                        className="flex items-center justify-between p-2 hover:bg-muted rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.photoURL || ''} />
                            <AvatarFallback>{member.displayName?.[0] || '?'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{member.displayName}</span>
                              {member.role === 'admin' && (
                                <span className="text-xs bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full">Admin</span>
                              )}
                              {member.role === 'moderator' && (
                                <span className="text-xs bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-full">Mod</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">{member.email}</div>
                          </div>
                        </div>
                        
                        {isAdmin && channel.isPrivate && member.uid !== user?.uid && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveUser(member.uid)}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="permissions" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Channel Permissions</h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="perm-send-messages">Send Messages</Label>
                      <Checkbox id="perm-send-messages" defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="perm-embed-links">Embed Links</Label>
                      <Checkbox id="perm-embed-links" defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="perm-attach-files">Attach Files</Label>
                      <Checkbox id="perm-attach-files" defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="perm-mention-everyone">Mention @everyone</Label>
                      <Checkbox id="perm-mention-everyone" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="perm-manage-messages">Manage Messages</Label>
                      <Checkbox id="perm-manage-messages" />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
        
        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {isAdmin && activeTab === 'general' && (
            <Button onClick={handleSaveChanges}>Save Changes</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}