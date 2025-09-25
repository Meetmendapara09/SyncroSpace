'use client';

import { useState, useEffect } from 'react';
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
  onSnapshot,
  serverTimestamp,
  getDocs,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Settings, 
  Plus, 
  Crown, 
  Shield, 
  User, 
  Edit, 
  Trash2, 
  Mail,
  Calendar,
  FileText,
  Lock,
  Globe,
  Search,
  MoreVertical
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Types and Interfaces
interface TeamMember {
  uid: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  joinedAt: any;
  lastActive?: any;
  department?: string;
  title?: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'suspended';
}

interface Team {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  ownerId: string;
  createdAt: any;
  updatedAt: any;
  members: TeamMember[];
  departments: Department[];
  settings: TeamSettings;
  privacy: 'public' | 'private' | 'organization';
  tags: string[];
  memberCount: number;
  channelCount: number;
}

interface Department {
  id: string;
  name: string;
  description?: string;
  members: string[];
  managerId?: string;
  color?: string;
  permissions: string[];
}

interface TeamSettings {
  allowGuestAccess: boolean;
  requireApprovalForJoining: boolean;
  allowMemberInvites: boolean;
  enableFileSharing: boolean;
  enableScreenSharing: boolean;
  enableRecording: boolean;
  retentionDays: number;
  encryptionEnabled: boolean;
}

const DEFAULT_PERMISSIONS = {
  owner: [
    'manage_team',
    'manage_members',
    'manage_channels',
    'manage_settings',
    'delete_team',
    'view_analytics',
    'manage_integrations'
  ],
  admin: [
    'manage_members',
    'manage_channels',
    'moderate_content',
    'view_analytics',
    'manage_integrations'
  ],
  member: [
    'create_channels',
    'send_messages',
    'make_calls',
    'share_files',
    'use_whiteboard'
  ],
  guest: [
    'send_messages',
    'make_calls',
    'view_channels'
  ]
};

export function TeamManagementSystem({ spaceId }: { spaceId?: string }) {
  const [user] = useAuthState(auth);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showInviteMembers, setShowInviteMembers] = useState(false);
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // New team form state
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    privacy: 'private' as const,
    tags: [] as string[],
    allowGuestAccess: false,
    requireApproval: true
  });

  // Invite members form state
  const [inviteForm, setInviteForm] = useState({
    emails: '',
    role: 'member' as const,
    department: '',
    message: ''
  });

  useEffect(() => {
    if (!user) return;

    // Load user's teams
    const teamsQuery = query(
      collection(db, 'teams'),
      where('members', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
      const teamList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Team[];
      
      setTeams(teamList);
      if (teamList.length > 0 && !selectedTeam) {
        setSelectedTeam(teamList[0]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Create new team
  const createTeam = async () => {
    if (!user || !newTeam.name.trim()) return;

    try {
      const teamData: Partial<Team> = {
        name: newTeam.name.trim(),
        description: newTeam.description.trim(),
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        privacy: newTeam.privacy,
        tags: newTeam.tags,
        members: [{
          uid: user.uid,
          email: user.email!,
          name: user.displayName || user.email!.split('@')[0],
          avatar: user.photoURL || undefined,
          role: 'owner',
          joinedAt: serverTimestamp(),
          permissions: DEFAULT_PERMISSIONS.owner,
          status: 'active'
        }],
        departments: [{
          id: 'general',
          name: 'General',
          description: 'Default department for all team members',
          members: [user.uid],
          permissions: DEFAULT_PERMISSIONS.member
        }],
        settings: {
          allowGuestAccess: newTeam.allowGuestAccess,
          requireApprovalForJoining: newTeam.requireApproval,
          allowMemberInvites: true,
          enableFileSharing: true,
          enableScreenSharing: true,
          enableRecording: false,
          retentionDays: 365,
          encryptionEnabled: true
        },
        memberCount: 1,
        channelCount: 0
      };

      await addDoc(collection(db, 'teams'), teamData);
      
      setShowCreateTeam(false);
      setNewTeam({
        name: '',
        description: '',
        privacy: 'private',
        tags: [],
        allowGuestAccess: false,
        requireApproval: true
      });

      toast({
        title: "Team created",
        description: `${newTeam.name} has been created successfully.`,
      });

    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: "Error",
        description: "Failed to create team. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Invite members to team
  const inviteMembers = async () => {
    if (!selectedTeam || !inviteForm.emails.trim()) return;

    try {
      const emailList = inviteForm.emails
        .split(',')
        .map(email => email.trim())
        .filter(email => email);

      for (const email of emailList) {
        // Create invitation record
        await addDoc(collection(db, 'teamInvitations'), {
          teamId: selectedTeam.id,
          teamName: selectedTeam.name,
          invitedBy: {
            uid: user!.uid,
            name: user!.displayName || user!.email!.split('@')[0],
            email: user!.email
          },
          invitedEmail: email,
          role: inviteForm.role,
          department: inviteForm.department || 'general',
          message: inviteForm.message,
          createdAt: serverTimestamp(),
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });
      }

      setShowInviteMembers(false);
      setInviteForm({
        emails: '',
        role: 'member',
        department: '',
        message: ''
      });

      toast({
        title: "Invitations sent",
        description: `Invited ${emailList.length} members to ${selectedTeam.name}.`,
      });

    } catch (error) {
      console.error('Error inviting members:', error);
      toast({
        title: "Error",
        description: "Failed to send invitations. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Update member role
  const updateMemberRole = async (memberId: string, newRole: TeamMember['role']) => {
    if (!selectedTeam) return;

    try {
      const updatedMembers = selectedTeam.members.map(member =>
        member.uid === memberId
          ? { ...member, role: newRole, permissions: DEFAULT_PERMISSIONS[newRole] }
          : member
      );

      await updateDoc(doc(db, 'teams', selectedTeam.id), {
        members: updatedMembers,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Role updated",
        description: "Member role has been updated successfully.",
      });

    } catch (error) {
      console.error('Error updating member role:', error);
      toast({
        title: "Error",
        description: "Failed to update member role.",
        variant: "destructive"
      });
    }
  };

  // Remove member from team
  const removeMember = async (memberId: string) => {
    if (!selectedTeam || memberId === selectedTeam.ownerId) return;

    try {
      const updatedMembers = selectedTeam.members.filter(member => member.uid !== memberId);

      await updateDoc(doc(db, 'teams', selectedTeam.id), {
        members: updatedMembers,
        memberCount: updatedMembers.length,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Member removed",
        description: "Member has been removed from the team.",
      });

    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: "Failed to remove member.",
        variant: "destructive"
      });
    }
  };

  // Get role icon
  const getRoleIcon = (role: TeamMember['role']) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin': return <Shield className="h-4 w-4 text-blue-500" />;
      case 'member': return <User className="h-4 w-4 text-green-500" />;
      case 'guest': return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get role color
  const getRoleColor = (role: TeamMember['role']) => {
    switch (role) {
      case 'owner': return 'bg-yellow-100 text-yellow-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'member': return 'bg-green-100 text-green-800';
      case 'guest': return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Manage your teams, members, and permissions</p>
        </div>
        <Button onClick={() => setShowCreateTeam(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Teams Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Teams
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                <div className="space-y-2 p-4">
                  {teams.map(team => (
                    <div
                      key={team.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedTeam?.id === team.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedTeam(team)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={team.avatar} />
                          <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{team.name}</p>
                          <p className="text-sm opacity-80">{team.memberCount} members</p>
                        </div>
                        {team.privacy === 'private' && (
                          <Lock className="h-4 w-4 opacity-60" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {selectedTeam ? (
            <Tabs defaultValue="members" className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="members">Members</TabsTrigger>
                  <TabsTrigger value="departments">Departments</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowInviteMembers(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Invite Members
                  </Button>
                  <Button variant="outline" onClick={() => setShowTeamSettings(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </div>

              {/* Team Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedTeam.avatar} />
                      <AvatarFallback className="text-2xl">
                        {selectedTeam.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold">{selectedTeam.name}</h2>
                        <Badge variant="outline" className={getRoleColor(
                          selectedTeam.members.find(m => m.uid === user?.uid)?.role || 'guest'
                        )}>
                          {selectedTeam.members.find(m => m.uid === user?.uid)?.role}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{selectedTeam.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{selectedTeam.memberCount} members</span>
                        <span>{selectedTeam.channelCount} channels</span>
                        <span>Created {selectedTeam.createdAt?.toDate?.()?.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <TabsContent value="members" className="space-y-4">
                {/* Search and Filters */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="owner">Owners</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                      <SelectItem value="member">Members</SelectItem>
                      <SelectItem value="guest">Guests</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Members List */}
                <div className="grid gap-4">
                  {selectedTeam.members
                    .filter(member => 
                      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      member.email.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(member => (
                    <Card key={member.uid}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{member.name}</p>
                                {getRoleIcon(member.role)}
                              </div>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                              {member.title && (
                                <p className="text-sm text-muted-foreground">{member.title}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getRoleColor(member.role)}>
                              {member.role}
                            </Badge>
                            <Badge variant="outline" className={
                              member.status === 'active' ? 'text-green-600' : 'text-gray-600'
                            }>
                              {member.status}
                            </Badge>
                            {member.uid !== selectedTeam.ownerId && (
                              <div className="flex gap-1">
                                <Select
                                  value={member.role}
                                  onValueChange={(value) => updateMemberRole(member.uid, value as TeamMember['role'])}
                                >
                                  <SelectTrigger className="w-24 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="guest">Guest</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeMember(member.uid)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="departments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Departments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Department management coming soon...</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Team Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Team settings management coming soon...</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Team Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Team analytics and insights coming soon...</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Team Selected</h3>
                  <p className="text-muted-foreground mb-4">
                    Select a team from the sidebar or create a new one to get started.
                  </p>
                  <Button onClick={() => setShowCreateTeam(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Team Dialog */}
      <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                value={newTeam.name}
                onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter team name"
              />
            </div>
            <div>
              <Label htmlFor="teamDescription">Description</Label>
              <Textarea
                id="teamDescription"
                value={newTeam.description}
                onChange={(e) => setNewTeam(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the team"
              />
            </div>
            <div>
              <Label>Privacy</Label>
              <Select
                value={newTeam.privacy}
                onValueChange={(value) => setNewTeam(prev => ({ ...prev, privacy: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateTeam(false)}>
                Cancel
              </Button>
              <Button onClick={createTeam} disabled={!newTeam.name.trim()}>
                Create Team
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Members Dialog */}
      <Dialog open={showInviteMembers} onOpenChange={setShowInviteMembers}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Members</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="inviteEmails">Email Addresses</Label>
              <Textarea
                id="inviteEmails"
                value={inviteForm.emails}
                onChange={(e) => setInviteForm(prev => ({ ...prev, emails: e.target.value }))}
                placeholder="Enter email addresses separated by commas"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="inviteMessage">Welcome Message (Optional)</Label>
              <Textarea
                id="inviteMessage"
                value={inviteForm.message}
                onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Welcome to our team!"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInviteMembers(false)}>
                Cancel
              </Button>
              <Button onClick={inviteMembers} disabled={!inviteForm.emails.trim()}>
                Send Invitations
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}