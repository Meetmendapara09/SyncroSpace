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
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDoc,
  getDocs,
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Users,
  Settings,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  UserPlus,
  Crown,
  Shield,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Check,
  X,
  Calendar,
  FileText,
  Target,
  MessageSquare,
  FolderOpen,
  CalendarDays,
  Zap,
  Building,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// Types and Interfaces
interface Team {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  coverImage?: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  memberCount: number;
  isPublic: boolean;
  category: string;
  tags: string[];
  settings: TeamSettings;
}

interface TeamSettings {
  allowMemberInvites: boolean;
  requireApproval: boolean;
  isVisible: boolean;
  allowGuestAccess: boolean;
  defaultRole: string;
}

interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  joinedAt: any;
  invitedBy?: string;
  status: 'active' | 'pending' | 'inactive';
}

interface TeamCreationProps {
  onTeamCreated?: (teamId: string) => void;
}

export function TeamCreation({ onTeamCreated }: TeamCreationProps) {
  const [user] = useAuthState(auth);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [filter, setFilter] = useState<'all' | 'my-teams' | 'public'>('all');

  // Create team form state
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    category: 'general',
    tags: [] as string[],
    isPublic: true,
    settings: {
      allowMemberInvites: true,
      requireApproval: false,
      isVisible: true,
      allowGuestAccess: false,
      defaultRole: 'member',
    } as TeamSettings,
  });

  // Edit team form state
  const [editTeam, setEditTeam] = useState<Team | null>(null);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Load user's teams and public teams
    const loadTeams = async () => {
      try {
        // Get user's team memberships
        const membershipsQuery = query(
          collection(db, 'teamMembers'),
          where('userId', '==', user.uid),
          where('status', '==', 'active')
        );

        const membershipsSnap = await getDocs(membershipsQuery);
        const userTeamIds = membershipsSnap.docs.map(doc => doc.data().teamId);

        // Get teams the user is a member of
        const userTeamsPromises = userTeamIds.map(teamId =>
          getDoc(doc(db, 'teams', teamId))
        );

        const userTeamsSnaps = await Promise.all(userTeamsPromises);
        const userTeams = userTeamsSnaps
          .filter(snap => snap.exists())
          .map(snap => ({ id: snap.id, ...snap.data() } as Team));

        // Get public teams (excluding user's teams)
        const publicTeamsQuery = query(
          collection(db, 'teams'),
          where('isPublic', '==', true),
          orderBy('createdAt', 'desc')
        );

        const publicTeamsSnap = await getDocs(publicTeamsQuery);
        const publicTeams = publicTeamsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Team))
          .filter(team => !userTeamIds.includes(team.id));

        setTeams([...userTeams, ...publicTeams]);
        setLoading(false);
      } catch (error) {
        console.error('Error loading teams:', error);
        toast({
          title: "Error",
          description: "Failed to load teams.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    loadTeams();
  }, [user]);

  // Create new team
  const createTeam = async () => {
    if (!user || !newTeam.name.trim()) return;

    try {
      const teamData = {
        name: newTeam.name.trim(),
        description: newTeam.description.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        memberCount: 1, // Creator is first member
        isPublic: newTeam.isPublic,
        category: newTeam.category,
        tags: newTeam.tags,
        settings: newTeam.settings,
      };

      const teamRef = await addDoc(collection(db, 'teams'), teamData);

      // Add creator as team member with admin role
      await addDoc(collection(db, 'teamMembers'), {
        teamId: teamRef.id,
        userId: user.uid,
        role: 'admin',
        joinedAt: serverTimestamp(),
        status: 'active',
      });

      setShowCreateTeam(false);
      resetNewTeamForm();

      toast({
        title: "Team created",
        description: `${newTeam.name} has been created successfully.`,
      });

      onTeamCreated?.(teamRef.id);

    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: "Error",
        description: "Failed to create team. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Update team
  const updateTeam = async () => {
    if (!editTeam) return;

    try {
      await updateDoc(doc(db, 'teams', editTeam.id), {
        name: editTeam.name,
        description: editTeam.description,
        category: editTeam.category,
        tags: editTeam.tags,
        isPublic: editTeam.isPublic,
        settings: editTeam.settings,
        updatedAt: serverTimestamp(),
      });

      setShowTeamSettings(false);
      setEditTeam(null);

      toast({
        title: "Team updated",
        description: "Team settings have been updated.",
      });

    } catch (error) {
      console.error('Error updating team:', error);
      toast({
        title: "Error",
        description: "Failed to update team.",
        variant: "destructive"
      });
    }
  };

  // Delete team
  const deleteTeam = async (teamId: string) => {
    try {
      // Delete team document
      await deleteDoc(doc(db, 'teams', teamId));

      // Delete all team members
      const membersQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId)
      );
      const membersSnap = await getDocs(membersQuery);
      const deletePromises = membersSnap.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      toast({
        title: "Team deleted",
        description: "Team has been deleted successfully.",
      });

    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: "Error",
        description: "Failed to delete team.",
        variant: "destructive"
      });
    }
  };

  // Join team
  const joinTeam = async (teamId: string) => {
    if (!user) return;

    try {
      await addDoc(collection(db, 'teamMembers'), {
        teamId,
        userId: user.uid,
        role: 'member',
        joinedAt: serverTimestamp(),
        status: 'active',
      });

      // Update member count
      const teamRef = doc(db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      if (teamSnap.exists()) {
        const currentCount = teamSnap.data().memberCount || 0;
        await updateDoc(teamRef, { memberCount: currentCount + 1 });
      }

      toast({
        title: "Joined team",
        description: "You have successfully joined the team.",
      });

    } catch (error) {
      console.error('Error joining team:', error);
      toast({
        title: "Error",
        description: "Failed to join team.",
        variant: "destructive"
      });
    }
  };

  // Leave team
  const leaveTeam = async (teamId: string) => {
    if (!user) return;

    try {
      const memberQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId),
        where('userId', '==', user.uid)
      );
      const memberSnap = await getDocs(memberQuery);

      if (!memberSnap.empty) {
        await deleteDoc(memberSnap.docs[0].ref);

        // Update member count
        const teamRef = doc(db, 'teams', teamId);
        const teamSnap = await getDoc(teamRef);
        if (teamSnap.exists()) {
          const currentCount = teamSnap.data().memberCount || 0;
          await updateDoc(teamRef, { memberCount: Math.max(0, currentCount - 1) });
        }
      }

      toast({
        title: "Left team",
        description: "You have left the team.",
      });

    } catch (error) {
      console.error('Error leaving team:', error);
      toast({
        title: "Error",
        description: "Failed to leave team.",
        variant: "destructive"
      });
    }
  };

  // Reset form states
  const resetNewTeamForm = () => {
    setNewTeam({
      name: '',
      description: '',
      category: 'general',
      tags: [],
      isPublic: true,
      settings: {
        allowMemberInvites: true,
        requireApproval: false,
        isVisible: true,
        allowGuestAccess: false,
        defaultRole: 'member',
      },
    });
  };

  // Filter teams based on current filter
  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         team.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    switch (filter) {
      case 'my-teams':
        // Check if user is a member (this would need to be implemented with proper membership checking)
        return true; // For now, show all
      case 'public':
        return team.isPublic;
      default:
        return true;
    }
  });

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'project':
        return <Target className="h-4 w-4" />;
      case 'department':
        return <Building className="h-4 w-4" />;
      case 'community':
        return <Users className="h-4 w-4" />;
      case 'event':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  // Check if user is member of team
  const isTeamMember = (teamId: string) => {
    // This would need proper implementation with membership checking
    return true; // Placeholder
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Teams</h2>
          <p className="text-muted-foreground">
            Create and manage teams for collaboration
          </p>
        </div>
        <Button onClick={() => setShowCreateTeam(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teams..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
          <TabsList>
            <TabsTrigger value="all">All Teams</TabsTrigger>
            <TabsTrigger value="my-teams">My Teams</TabsTrigger>
            <TabsTrigger value="public">Public Teams</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.length > 0 ? (
          filteredTeams.map(team => (
            <Card key={team.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 relative">
                {team.coverImage && (
                  <img
                    src={team.coverImage}
                    alt={team.name}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-3 right-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditTeam(team);
                        setShowTeamSettings(true);
                      }}>
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Team
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteTeam(team.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Team
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(team.category)}
                    <Badge variant={team.isPublic ? "secondary" : "outline"}>
                      {team.isPublic ? <Globe className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                      {team.isPublic ? 'Public' : 'Private'}
                    </Badge>
                  </div>
                </div>
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  {team.name}
                  {team.createdBy === user?.uid && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {team.description}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{team.memberCount} members</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {team.createdAt && format(new Date(team.createdAt.seconds * 1000), 'MMM yyyy')}
                    </span>
                  </div>
                </div>

                {team.tags && team.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {team.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {team.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{team.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>

              <CardFooter className="pt-0">
                {isTeamMember(team.id) ? (
                  <div className="flex gap-2 w-full">
                    <Button variant="outline" className="flex-1">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Open
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => leaveTeam(team.id)}
                    >
                      Leave
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => joinTeam(team.id)}
                    disabled={!team.isPublic}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {team.isPublic ? 'Join Team' : 'Request Access'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="flex items-center justify-center flex-col py-12">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'No teams found' : 'No teams yet'}
              </h3>
              <p className="text-muted-foreground mb-4 text-center max-w-md">
                {searchQuery
                  ? `No teams match your search "${searchQuery}"`
                  : 'Create your first team to start collaborating with others'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowCreateTeam(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Team
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Team Dialog */}
      <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Marketing Team"
                />
              </div>

              <div>
                <Label htmlFor="teamDescription">Description</Label>
                <Textarea
                  id="teamDescription"
                  value={newTeam.description}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your team's purpose and goals"
                  className="resize-none"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="teamCategory">Category</Label>
                <Select
                  value={newTeam.category}
                  onValueChange={(value) => setNewTeam(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="teamCategory">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="teamTags">Tags (optional)</Label>
                <Input
                  id="teamTags"
                  placeholder="Add tags separated by commas"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const tag = e.currentTarget.value.trim();
                      if (tag && !newTeam.tags.includes(tag)) {
                        setNewTeam(prev => ({
                          ...prev,
                          tags: [...prev.tags, tag]
                        }));
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                />
                {newTeam.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {newTeam.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                        <X
                          className="h-3 w-3 ml-1 cursor-pointer"
                          onClick={() => setNewTeam(prev => ({
                            ...prev,
                            tags: prev.tags.filter(t => t !== tag)
                          }))}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Team Visibility</Label>
                  <p className="text-sm text-muted-foreground">
                    Control who can see and join your team
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="isPublic" className="text-sm">
                    {newTeam.isPublic ? 'Public' : 'Private'}
                  </Label>
                  <Switch
                    id="isPublic"
                    checked={newTeam.isPublic}
                    onCheckedChange={(checked) => setNewTeam(prev => ({ ...prev, isPublic: checked }))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Member Invites</Label>
                    <p className="text-sm text-muted-foreground">
                      Members can invite others to join
                    </p>
                  </div>
                  <Switch
                    checked={newTeam.settings.allowMemberInvites}
                    onCheckedChange={(checked) => setNewTeam(prev => ({
                      ...prev,
                      settings: { ...prev.settings, allowMemberInvites: checked }
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Approval</Label>
                    <p className="text-sm text-muted-foreground">
                      New members need admin approval
                    </p>
                  </div>
                  <Switch
                    checked={newTeam.settings.requireApproval}
                    onCheckedChange={(checked) => setNewTeam(prev => ({
                      ...prev,
                      settings: { ...prev.settings, requireApproval: checked }
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Guest Access</Label>
                    <p className="text-sm text-muted-foreground">
                      External users can access limited content
                    </p>
                  </div>
                  <Switch
                    checked={newTeam.settings.allowGuestAccess}
                    onCheckedChange={(checked) => setNewTeam(prev => ({
                      ...prev,
                      settings: { ...prev.settings, allowGuestAccess: checked }
                    }))}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setShowCreateTeam(false);
              resetNewTeamForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={createTeam}
              disabled={!newTeam.name.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Settings Dialog */}
      <Dialog open={showTeamSettings} onOpenChange={setShowTeamSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Team Settings</DialogTitle>
          </DialogHeader>

          {editTeam && (
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <div>
                  <Label htmlFor="editTeamName">Team Name</Label>
                  <Input
                    id="editTeamName"
                    value={editTeam.name}
                    onChange={(e) => setEditTeam(prev => prev ? { ...prev, name: e.target.value } : null)}
                  />
                </div>

                <div>
                  <Label htmlFor="editTeamDescription">Description</Label>
                  <Textarea
                    id="editTeamDescription"
                    value={editTeam.description}
                    onChange={(e) => setEditTeam(prev => prev ? { ...prev, description: e.target.value } : null)}
                    className="resize-none"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="editTeamCategory">Category</Label>
                  <Select
                    value={editTeam.category}
                    onValueChange={(value) => setEditTeam(prev => prev ? { ...prev, category: value } : null)}
                  >
                    <SelectTrigger id="editTeamCategory">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="department">Department</SelectItem>
                      <SelectItem value="community">Community</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Team Visibility</Label>
                    <p className="text-sm text-muted-foreground">
                      Control who can see and join your team
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="editIsPublic" className="text-sm">
                      {editTeam.isPublic ? 'Public' : 'Private'}
                    </Label>
                    <Switch
                      id="editIsPublic"
                      checked={editTeam.isPublic}
                      onCheckedChange={(checked) => setEditTeam(prev => prev ? { ...prev, isPublic: checked } : null)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow Member Invites</Label>
                      <p className="text-sm text-muted-foreground">
                        Members can invite others to join
                      </p>
                    </div>
                    <Switch
                      checked={editTeam.settings.allowMemberInvites}
                      onCheckedChange={(checked) => setEditTeam(prev => prev ? {
                        ...prev,
                        settings: { ...prev.settings, allowMemberInvites: checked }
                      } : null)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Approval</Label>
                      <p className="text-sm text-muted-foreground">
                        New members need admin approval
                      </p>
                    </div>
                    <Switch
                      checked={editTeam.settings.requireApproval}
                      onCheckedChange={(checked) => setEditTeam(prev => prev ? {
                        ...prev,
                        settings: { ...prev.settings, requireApproval: checked }
                      } : null)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow Guest Access</Label>
                      <p className="text-sm text-muted-foreground">
                        External users can access limited content
                      </p>
                    </div>
                    <Switch
                      checked={editTeam.settings.allowGuestAccess}
                      onCheckedChange={(checked) => setEditTeam(prev => prev ? {
                        ...prev,
                        settings: { ...prev.settings, allowGuestAccess: checked }
                      } : null)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-2">Danger Zone</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    These actions cannot be undone. Please be certain.
                  </p>
                  <Button variant="destructive" onClick={() => deleteTeam(editTeam.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Team
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setShowTeamSettings(false);
              setEditTeam(null);
            }}>
              Cancel
            </Button>
            <Button onClick={updateTeam}>
              <Check className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}