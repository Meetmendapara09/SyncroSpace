'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  MoreVertical, 
  Hash, 
  LockIcon, 
  Users, 
  Settings,
  Edit2,
  Trash2,
  Bell,
  BellOff,
  UserPlus,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { auth, rtdb, firestore } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { ref as rtdbRef, set, push, update, remove, onValue } from 'firebase/database';
import { doc, setDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Channel {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  createdBy: string;
  createdAt: any;
  members?: string[];
  type: 'text' | 'voice' | 'video';
  unreadCount?: number;
  lastMessage?: {
    text: string;
    timestamp: any;
    senderName: string;
  };
}

interface ChannelCategory {
  id: string;
  name: string;
  order: number;
  collapsed?: boolean;
}

interface ChannelManagerProps {
  spaceId: string;
  userId?: string;
  isAdmin?: boolean;
}

export function ChannelManager({ spaceId, userId, isAdmin = false }: ChannelManagerProps) {
  const [user] = useAuthState(auth);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<ChannelCategory[]>([]);
  const [categoryCollapse, setCategoryCollapse] = useState<Record<string, boolean>>({});
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [newChannelData, setNewChannelData] = useState({
    name: '',
    description: '',
    isPrivate: false,
    type: 'text' as 'text' | 'voice' | 'video',
    categoryId: ''
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editChannel, setEditChannel] = useState<Channel | null>(null);
  
  // Fetch channels and categories
  useEffect(() => {
    if (!spaceId) return;

    // Fetch channels
    const channelsRef = rtdbRef(rtdb, `spaces/${spaceId}/channels`);
    const unsubscribeChannels = onValue(channelsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setChannels([]);
        return;
      }
      
      const channelList = Object.entries(data).map(([id, channel]) => ({
        id,
        ...(channel as any)
      }));
      
      setChannels(channelList as Channel[]);
    });
    
    // Fetch categories
    const categoriesRef = rtdbRef(rtdb, `spaces/${spaceId}/channel-categories`);
    const unsubscribeCategories = onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        // Create default category if none exists
        const defaultCategoryRef = push(categoriesRef);
        set(defaultCategoryRef, {
          name: 'Channels',
          order: 0,
          collapsed: false,
        });
        
        setCategories([{
          id: defaultCategoryRef.key || 'default',
          name: 'Channels',
          order: 0,
          collapsed: false
        }]);
        return;
      }
      
      const categoryList = Object.entries(data).map(([id, category]) => ({
        id,
        ...(category as any)
      }));
      
      // Sort by order
      categoryList.sort((a, b) => a.order - b.order);
      
      setCategories(categoryList as ChannelCategory[]);
      
      // Update collapse state
      const collapseState: Record<string, boolean> = {};
      categoryList.forEach((cat: any) => {
        collapseState[cat.id] = cat.collapsed || false;
      });
      setCategoryCollapse(collapseState);
    });
    
    return () => {
      unsubscribeChannels();
      unsubscribeCategories();
    };
  }, [spaceId]);

  // Create a new channel
  const handleCreateChannel = async () => {
    if (!user || !spaceId || !newChannelData.name.trim()) return;
    
    try {
      const channelName = newChannelData.name.trim().toLowerCase().replace(/\s+/g, '-');
      const channelsRef = rtdbRef(rtdb, `spaces/${spaceId}/channels`);
      const newChannelRef = push(channelsRef);
      
      await set(newChannelRef, {
        name: channelName,
        description: newChannelData.description,
        isPrivate: newChannelData.isPrivate,
        type: newChannelData.type,
        createdBy: user.uid,
        createdAt: Date.now(),
        members: newChannelData.isPrivate ? [user.uid] : null,
        categoryId: newChannelData.categoryId || categories[0]?.id || 'default'
      });
      
      setCreateChannelOpen(false);
      setNewChannelData({
        name: '',
        description: '',
        isPrivate: false,
        type: 'text',
        categoryId: ''
      });
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  };

  // Create a new category
  const handleCreateCategory = async () => {
    if (!user || !spaceId || !newCategoryName.trim()) return;
    
    try {
      const categoriesRef = rtdbRef(rtdb, `spaces/${spaceId}/channel-categories`);
      const newCategoryRef = push(categoriesRef);
      
      await set(newCategoryRef, {
        name: newCategoryName.trim(),
        order: categories.length,
        collapsed: false
      });
      
      setCreateCategoryOpen(false);
      setNewCategoryName('');
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  // Toggle category collapse
  const toggleCategoryCollapse = async (categoryId: string) => {
    if (!spaceId) return;
    
    const newCollapseState = !categoryCollapse[categoryId];
    setCategoryCollapse(prev => ({ ...prev, [categoryId]: newCollapseState }));
    
    // Update in database
    try {
      const categoryRef = rtdbRef(rtdb, `spaces/${spaceId}/channel-categories/${categoryId}`);
      update(categoryRef, { collapsed: newCollapseState });
    } catch (error) {
      console.error('Error updating category collapse state:', error);
    }
  };
  
  // Handle channel click
  const handleChannelClick = (channelId: string) => {
    // Navigate to channel
    console.log('Navigate to channel:', channelId);
    // window.location.href = `/space/${spaceId}/channel/${channelId}`;
  };
  
  // Delete channel
  const handleDeleteChannel = async (channelId: string) => {
    if (!spaceId || !isAdmin) return;
    
    try {
      const channelRef = rtdbRef(rtdb, `spaces/${spaceId}/channels/${channelId}`);
      await remove(channelRef);
    } catch (error) {
      console.error('Error deleting channel:', error);
    }
  };

  // Edit channel
  const handleUpdateChannel = async () => {
    if (!editChannel || !spaceId) return;
    
    try {
      const channelRef = rtdbRef(rtdb, `spaces/${spaceId}/channels/${editChannel.id}`);
      await update(channelRef, {
        name: editChannel.name,
        description: editChannel.description,
        isPrivate: editChannel.isPrivate,
        type: editChannel.type,
        categoryId: editChannel.categoryId
      });
      
      setEditChannel(null);
    } catch (error) {
      console.error('Error updating channel:', error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 flex justify-between items-center border-b">
        <h2 className="text-sm font-semibold">Channels</h2>
        {isAdmin && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCreateChannelOpen(true)}
              title="Create Channel"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCreateCategoryOpen(true)}
              title="Create Category"
            >
              <FolderPlusIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      <ScrollArea className="flex-1 px-1">
        {categories.map(category => (
          <div key={category.id} className="mt-2">
            <div
              className="flex justify-between items-center px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => toggleCategoryCollapse(category.id)}
            >
              <span className="uppercase tracking-wider">{category.name}</span>
              <span className="text-xs">{categoryCollapse[category.id] ? '+' : '-'}</span>
            </div>
            
            {!categoryCollapse[category.id] && (
              <div className="space-y-0.5 ml-1">
                {channels
                  .filter(channel => channel.categoryId === category.id)
                  .map(channel => (
                    <ChannelItem
                      key={channel.id}
                      channel={channel}
                      isAdmin={isAdmin}
                      onClick={() => handleChannelClick(channel.id)}
                      onDelete={() => handleDeleteChannel(channel.id)}
                      onEdit={() => setEditChannel(channel)}
                    />
                  ))}
              </div>
            )}
          </div>
        ))}
      </ScrollArea>
      
      {/* Create Channel Dialog */}
      <Dialog open={createChannelOpen} onOpenChange={setCreateChannelOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Channel Name</Label>
              <Input
                id="name"
                placeholder="new-channel"
                value={newChannelData.name}
                onChange={(e) => setNewChannelData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="What is this channel about?"
                value={newChannelData.description}
                onChange={(e) => setNewChannelData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                className="w-full px-3 py-2 bg-background border border-input rounded-md"
                value={newChannelData.categoryId}
                onChange={(e) => setNewChannelData(prev => ({ ...prev, categoryId: e.target.value }))}
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Channel Type</Label>
              <RadioGroup
                value={newChannelData.type}
                onValueChange={(value: 'text' | 'voice' | 'video') => 
                  setNewChannelData(prev => ({ ...prev, type: value }))
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="text" id="text" />
                  <Label htmlFor="text">Text</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="voice" id="voice" />
                  <Label htmlFor="voice">Voice</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="video" id="video" />
                  <Label htmlFor="video">Video</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="private"
                checked={newChannelData.isPrivate}
                onCheckedChange={(checked) => 
                  setNewChannelData(prev => ({ ...prev, isPrivate: checked === true }))
                }
              />
              <Label htmlFor="private">Private channel</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateChannelOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateChannel}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create Category Dialog */}
      <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                placeholder="General"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCategoryOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCategory}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Channel Dialog */}
      {editChannel && (
        <Dialog open={!!editChannel} onOpenChange={(open) => !open && setEditChannel(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Channel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Channel Name</Label>
                <Input
                  id="edit-name"
                  placeholder="channel-name"
                  value={editChannel.name}
                  onChange={(e) => setEditChannel(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description (optional)</Label>
                <Input
                  id="edit-description"
                  placeholder="What is this channel about?"
                  value={editChannel.description || ''}
                  onChange={(e) => setEditChannel(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  value={editChannel.categoryId}
                  onChange={(e) => setEditChannel(prev => prev ? { ...prev, categoryId: e.target.value } : null)}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-private"
                  checked={editChannel.isPrivate}
                  onCheckedChange={(checked) => 
                    setEditChannel(prev => prev ? { ...prev, isPrivate: checked === true } : null)
                  }
                />
                <Label htmlFor="edit-private">Private channel</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditChannel(null)}>Cancel</Button>
              <Button onClick={handleUpdateChannel}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Helper icon component for folder plus
function FolderPlusIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path>
      <line x1="12" y1="10" x2="12" y2="16"></line>
      <line x1="9" y1="13" x2="15" y2="13"></line>
    </svg>
  );
}

// Channel item component
interface ChannelItemProps {
  channel: Channel;
  isAdmin: boolean;
  onClick: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function ChannelItem({ channel, isAdmin, onClick, onDelete, onEdit }: ChannelItemProps) {
  const getChannelIcon = () => {
    if (channel.type === 'voice') return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>;
    if (channel.type === 'video') return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"></path><rect width="14" height="12" x="2" y="6" rx="2" ry="2"></rect></svg>;
    return channel.isPrivate ? <LockIcon size={16} /> : <Hash size={16} />;
  };
  
  return (
    <div 
      className={cn(
        "group flex items-center justify-between rounded-md px-2 py-1.5 text-sm",
        "hover:bg-muted cursor-pointer",
        channel.unreadCount ? "font-medium" : ""
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{getChannelIcon()}</span>
        <span>{channel.name}</span>
        {channel.unreadCount ? (
          <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
            {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
          </span>
        ) : null}
      </div>
      
      {isAdmin && (
        <div className="opacity-0 group-hover:opacity-100 flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit2 className="mr-2 h-4 w-4" />
                <span>Edit channel</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
                <UserPlus className="mr-2 h-4 w-4" />
                <span>Invite members</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-500 focus:text-red-500" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (confirm('Are you sure you want to delete this channel? This action cannot be undone.')) {
                    onDelete();
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete channel</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}