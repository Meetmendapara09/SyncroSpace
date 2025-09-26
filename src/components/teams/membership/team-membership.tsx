'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  onSnapshot,
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  UserPlus,
  Users,
  Search,
  MoreHorizontal,
  Mail,
  Phone,
  Crown,
  Shield,
  User,
  UserX,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  MessageSquare,
  Calendar,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Trash2,
  Edit,
  Settings,
  Plus,
  Filter,
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
interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  department?: string;
  joinedAt: any;
  invitedBy?: string;
  status: 'active' | 'pending' | 'invited' | 'inactive';
  invitedAt?: any;
  profile?: UserProfile;
}

interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  title?: string;
  department?: string;
  location?: string;
  phone?: string;
  bio?: string;
  skills?: string[];
  manager?: string;
  availability?: 'available' | 'busy' | 'out-of-office' | 'do-not-disturb';
}

interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: string;
  department?: string;
  invitedBy: string;
  invitedAt: any;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  message?: string;
}

interface TeamMembershipProps {
  teamId: string;
}

export function TeamMembership({ teamId }: TeamMembershipProps) {
  const [user] = useAuthState(auth);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [showMemberDetails, setShowMemberDetails] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');

  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'member',
    department: '',
    message: '',
  });

  useEffect(() => {
    if (!user || !teamId) return;

    setLoading(true);

    // Load team members with profiles
    const loadMembers = () => {
      const membersQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId)
      );

      return onSnapshot(membersQuery, async (snapshot) => {
        try {
          const membersList = [] as TeamMember[];

          for (const memberDoc of snapshot.docs) {
            const memberData = memberDoc.data() as TeamMember;
            memberData.id = memberDoc.id;

            // Check if current user is admin
            if (memberData.userId === user.uid) {
              setCurrentUserRole(memberData.role);
            }

            // Fetch user profile if available
            try {
              const userDoc = await getDoc(doc(db, 'users', memberData.userId));
              if (userDoc.exists()) {
                memberData.profile = {
                  id: userDoc.id,
                  ...userDoc.data()
                } as UserProfile;
              }
            } catch (error) {
              console.error(`Error fetching profile for user ${memberData.userId}:`, error);
            }

            membersList.push(memberData);
          }

          setMembers(membersList);
        } catch (error) {
          console.error('Error processing team members:', error);
        }
      });
    };

    // Load pending invitations
    const loadInvitations = () => {
      const invitationsQuery = query(
        collection(db, 'teamInvitations'),
        where('teamId', '==', teamId),
        orderBy('invitedAt', 'desc')
      );

      return onSnapshot(invitationsQuery, (snapshot) => {
        const invitationsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TeamInvitation[];

        setInvitations(invitationsList);
        setLoading(false);
      });
    };

    const unsubscribeMembers = loadMembers();
    const unsubscribeInvitations = loadInvitations();

    return () => {
      unsubscribeMembers();
      unsubscribeInvitations();
    };
  }, [user, teamId]);

  // Send invitation
  const sendInvitation = async () => {
    if (!user || !inviteForm.email.trim()) return;

    try {
      const invitationData = {
        teamId,
        email: inviteForm.email.trim(),
        role: inviteForm.role,
        department: inviteForm.department || null,
        invitedBy: user.uid,
        invitedAt: serverTimestamp(),
        status: 'pending',
        message: inviteForm.message.trim() || null,
      };

      await addDoc(collection(db, 'teamInvitations'), invitationData);

      setShowInviteMember(false);
      resetInviteForm();

      toast({
        title: "Invitation sent",
        description: `Invitation has been sent to ${inviteForm.email}`,
      });

    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error",
        description: "Failed to send invitation.",
        variant: "destructive"
      });
    }
  };

  // Update member role
  const updateMemberRole = async (memberId: string, newRole: string) => {
    if (!canManageMembers()) return;

    try {
      await updateDoc(doc(db, 'teamMembers', memberId), {
        role: newRole,
      });

      toast({
        title: "Role updated",
        description: "Member's role has been updated.",
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

  // Update member department
  const updateMemberDepartment = async (memberId: string, department: string) => {
    if (!canManageMembers()) return;

    try {
      await updateDoc(doc(db, 'teamMembers', memberId), {
        department: department || null,
      });

      toast({
        title: "Department updated",
        description: "Member's department has been updated.",
      });

    } catch (error) {
      console.error('Error updating member department:', error);
      toast({
        title: "Error",
        description: "Failed to update member department.",
        variant: "destructive"
      });
    }
  };

  // Remove member from team
  const removeMember = async (memberId: string, memberUserId: string) => {
    if (!canManageMembers() || memberUserId === user?.uid) return;

    try {
      await deleteDoc(doc(db, 'teamMembers', memberId));

      // Update team member count
      const teamRef = doc(db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      if (teamSnap.exists()) {
        const currentCount = teamSnap.data().memberCount || 0;
        await updateDoc(teamRef, { memberCount: Math.max(0, currentCount - 1) });
      }

      if (selectedMember?.id === memberId) {
        setSelectedMember(null);
        setShowMemberDetails(false);
      }

      toast({
        title: "Member removed",
        description: "Team member has been removed.",
      });

    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: "Failed to remove team member.",
        variant: "destructive"
      });
    }
  };

  // Cancel invitation
  const cancelInvitation = async (invitationId: string) => {
    try {
      await deleteDoc(doc(db, 'teamInvitations', invitationId));

      toast({
        title: "Invitation cancelled",
        description: "Invitation has been cancelled.",
      });

    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: "Error",
        description: "Failed to cancel invitation.",
        variant: "destructive"
      });
    }
  };

  // Leave team
  const leaveTeam = async () => {
    if (!user) return;

    const memberRecord = members.find(m => m.userId === user.uid);
    if (!memberRecord) return;

    try {
      await deleteDoc(doc(db, 'teamMembers', memberRecord.id));

      // Update team member count
      const teamRef = doc(db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      if (teamSnap.exists()) {
        const currentCount = teamSnap.data().memberCount || 0;
        await updateDoc(teamRef, { memberCount: Math.max(0, currentCount - 1) });
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

  // Check if current user can manage members
  const canManageMembers = () => {
    return currentUserRole === 'admin' || currentUserRole === 'owner';
  };

  // Reset invite form
  const resetInviteForm = () => {
    setInviteForm({
      email: '',
      role: 'member',
      department: '',
      message: '',
    });
  };

  // Filter members
  const filteredMembers = members.filter(member => {
    const matchesSearch = !searchQuery ||
      member.profile?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = filterRole === 'all' || member.role === filterRole;
    const matchesStatus = filterStatus === 'all' || member.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'moderator':
        return 'bg-blue-100 text-blue-800';
      case 'member':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'invited':
        return 'bg-blue-100 text-blue-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4" />;
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'moderator':
        return <UserCheck className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  // Get name initials for avatar fallback
  const getNameInitials = (name: string) => {
    if (!name) return '?';

    const nameParts = name.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();

    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading team members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Team Members</h2>
          <p className="text-muted-foreground">
            Manage team membership and permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowInviteMember(true)}
            disabled={!canManageMembers()}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Team Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{members.filter(m => m.status === 'active').length}</p>
                <p className="text-sm text-muted-foreground">Active Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{invitations.filter(i => i.status === 'pending').length}</p>
                <p className="text-sm text-muted-foreground">Pending Invites</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Crown className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{members.filter(m => m.role === 'admin' || m.role === 'owner').length}</p>
                <p className="text-sm text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <UserCheck className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{members.filter(m => m.role === 'moderator').length}</p>
                <p className="text-sm text-muted-foreground">Moderators</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="member">Member</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Members List */}
      <Tabs defaultValue="members" className="w-full">
        <TabsList>
          <TabsTrigger value="members">
            Members ({members.filter(m => m.status === 'active').length})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations ({invitations.filter(i => i.status === 'pending').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          {filteredMembers.length > 0 ? (
            <div className="space-y-2">
              {filteredMembers.map((member) => (
                <Card key={member.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        {member.profile?.photoURL ? (
                          <AvatarImage src={member.profile.photoURL} />
                        ) : null}
                        <AvatarFallback>
                          {member.profile?.displayName ? getNameInitials(member.profile.displayName) : '?'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">
                            {member.profile?.displayName || 'Unknown User'}
                          </h3>
                          <Badge className={getRoleBadgeColor(member.role)}>
                            {getRoleIcon(member.role)}
                            <span className="ml-1 capitalize">{member.role}</span>
                          </Badge>
                          <Badge className={getStatusBadgeColor(member.status)}>
                            {member.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {member.profile?.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              <span>{member.profile.email}</span>
                            </div>
                          )}

                          {member.profile?.title && (
                            <div className="flex items-center gap-1">
                              <Briefcase className="h-3.5 w-3.5" />
                              <span>{member.profile.title}</span>
                            </div>
                          )}

                          {member.department && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{member.department}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              Joined {member.joinedAt && format(new Date(member.joinedAt.seconds * 1000), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <MessageSquare className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedMember(member);
                              setShowMemberDetails(true);
                            }}>
                              <User className="h-4 w-4 mr-2" />
                              View Profile
                            </DropdownMenuItem>

                            {canManageMembers() && member.userId !== user?.uid && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  // Update role logic would go here
                                }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Change Role
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  // Update department logic would go here
                                }}>
                                  <Settings className="h-4 w-4 mr-2" />
                                  Change Department
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => removeMember(member.id, member.userId)}
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Remove from Team
                                </DropdownMenuItem>
                              </>
                            )}

                            {member.userId === user?.uid && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={leaveTeam}
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Leave Team
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-muted/30">
              <CardContent className="flex items-center justify-center flex-col py-12">
                <Users className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? 'No members found' : 'No team members'}
                </h3>
                <p className="text-muted-foreground mb-4 text-center max-w-md">
                  {searchQuery
                    ? `No team members match your search "${searchQuery}"`
                    : 'Team members will appear here once they join'}
                </p>
                {canManageMembers() && !searchQuery && (
                  <Button onClick={() => setShowInviteMember(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Members
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          {invitations.filter(i => i.status === 'pending').length > 0 ? (
            <div className="space-y-2">
              {invitations.filter(i => i.status === 'pending').map((invitation) => (
                <Card key={invitation.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {invitation.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div>
                          <h3 className="font-medium">{invitation.email}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="capitalize">
                              {invitation.role}
                            </Badge>
                            {invitation.department && (
                              <span>• {invitation.department}</span>
                            )}
                            <span>• Invited {invitation.invitedAt && format(new Date(invitation.invitedAt.seconds * 1000), 'MMM dd')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Send className="h-4 w-4 mr-2" />
                              Resend Invitation
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => cancelInvitation(invitation.id)}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel Invitation
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {invitation.message && (
                      <div className="mt-3 p-3 bg-muted/30 rounded-md">
                        <p className="text-sm">{invitation.message}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-muted/30">
              <CardContent className="flex items-center justify-center flex-col py-12">
                <Mail className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pending invitations</h3>
                <p className="text-muted-foreground mb-4 text-center max-w-md">
                  Invitations you send will appear here until they're accepted or declined
                </p>
                {canManageMembers() && (
                  <Button onClick={() => setShowInviteMember(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Send Invitation
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Invite Member Dialog */}
      <Dialog open={showInviteMember} onOpenChange={setShowInviteMember}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="inviteEmail">Email Address</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="colleague@example.com"
              />
            </div>

            <div>
              <Label htmlFor="inviteRole">Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger id="inviteRole">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="inviteDepartment">Department (optional)</Label>
              <Input
                id="inviteDepartment"
                value={inviteForm.department}
                onChange={(e) => setInviteForm(prev => ({ ...prev, department: e.target.value }))}
                placeholder="e.g., Engineering"
              />
            </div>

            <div>
              <Label htmlFor="inviteMessage">Personal Message (optional)</Label>
              <textarea
                id="inviteMessage"
                value={inviteForm.message}
                onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Add a personal message to your invitation"
                className="w-full min-h-[80px] px-3 py-2 text-sm border border-input bg-background rounded-md resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowInviteMember(false);
                resetInviteForm();
              }}>
                Cancel
              </Button>
              <Button
                onClick={sendInvitation}
                disabled={!inviteForm.email.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Invitation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Details Dialog */}
      <Dialog open={showMemberDetails} onOpenChange={setShowMemberDetails}>
        {selectedMember && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Member Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  {selectedMember.profile?.photoURL ? (
                    <AvatarImage src={selectedMember.profile.photoURL} />
                  ) : null}
                  <AvatarFallback className="text-lg">
                    {selectedMember.profile?.displayName ? getNameInitials(selectedMember.profile.displayName) : '?'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <h2 className="text-xl font-semibold">
                    {selectedMember.profile?.displayName || 'Unknown User'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getRoleBadgeColor(selectedMember.role)}>
                      {getRoleIcon(selectedMember.role)}
                      <span className="ml-1 capitalize">{selectedMember.role}</span>
                    </Badge>
                    <Badge className={getStatusBadgeColor(selectedMember.status)}>
                      {selectedMember.status}
                    </Badge>
                  </div>
                  {selectedMember.profile?.title && (
                    <p className="text-muted-foreground mt-1">{selectedMember.profile.title}</p>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="font-medium mb-3">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedMember.profile?.email && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">{selectedMember.profile.email}</p>
                      </div>
                    </div>
                  )}

                  {selectedMember.profile?.phone && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Phone</p>
                        <p className="text-sm text-muted-foreground">{selectedMember.profile.phone}</p>
                      </div>
                    </div>
                  )}

                  {selectedMember.profile?.location && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">{selectedMember.profile.location}</p>
                      </div>
                    </div>
                  )}

                  {selectedMember.department && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Department</p>
                        <p className="text-sm text-muted-foreground">{selectedMember.department}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              {selectedMember.profile?.bio && (
                <div>
                  <h3 className="font-medium mb-3">Bio</h3>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm">{selectedMember.profile.bio}</p>
                  </div>
                </div>
              )}

              {/* Skills */}
              {selectedMember.profile?.skills && selectedMember.profile.skills.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedMember.profile.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Membership Info */}
              <div>
                <h3 className="font-medium mb-3">Team Membership</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm font-medium">Joined</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedMember.joinedAt && format(new Date(selectedMember.joinedAt.seconds * 1000), 'MMMM dd, yyyy')}
                    </p>
                  </div>

                  {selectedMember.invitedBy && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium">Invited By</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedMember.invitedBy === user?.uid ? 'You' : 'Team Admin'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowMemberDetails(false);
                setSelectedMember(null);
              }}>
                Close
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}