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
import {
  Plus,
  Search,
  UserCircle2,
  UserPlus,
  Users,
  MoreHorizontal,
  Mail,
  Phone,
  Building,
  Calendar,
  Briefcase,
  GraduationCap,
  Star,
  Award,
  MapPin,
  Clock,
  User,
  UserX,
  UserCheck,
  Settings,
  Send,
  AlertCircle,
  Trash2,
  PencilLine,
  CalendarDays,
  MessageSquare,
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
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Types and Interfaces
interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role?: string;
  department?: string;
  title?: string;
  location?: string;
  phone?: string;
  bio?: string;
  joinDate?: any;
  skills?: string[];
  manager?: string;
  availability?: 'available' | 'busy' | 'out-of-office' | 'do-not-disturb';
  status?: string;
}

interface TeamDirectory {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  departments: Department[];
  roles: Role[];
  createdAt: any;
  updatedAt: any;
}

interface Department {
  id: string;
  name: string;
  description?: string;
  leadId?: string;
  members: string[];
}

interface Role {
  id: string;
  name: string;
  description?: string;
  members: string[];
}

interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: string;
  department?: string;
  joinDate: any;
  invitedBy: string;
  status: 'active' | 'pending' | 'invited' | 'inactive';
  profile?: UserProfile;
}

interface TeamDirectoryProps {
  teamId: string;
}

export function TeamDirectory({ teamId }: TeamDirectoryProps) {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [teamDirectory, setTeamDirectory] = useState<TeamDirectory | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'list' | 'grid'>('grid');
  
  // Dialogs state
  const [showAddMember, setShowAddMember] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [showMemberDetail, setShowMemberDetail] = useState(false);
  const [showEditDepartment, setShowEditDepartment] = useState(false);
  const [showEditRole, setShowEditRole] = useState(false);
  
  // Form states
  const [newInvite, setNewInvite] = useState({
    email: '',
    role: '',
    department: '',
    message: '',
  });
  
  const [newDepartment, setNewDepartment] = useState({
    id: '',
    name: '',
    description: '',
    leadId: '',
  });
  
  const [newRole, setNewRole] = useState({
    id: '',
    name: '',
    description: '',
  });

  useEffect(() => {
    if (!user || !teamId) return;

    setLoading(true);

    // Load team directory structure
    const fetchTeamDirectory = async () => {
      try {
        const directoryQuery = query(
          collection(db, 'teamDirectories'),
          where('teamId', '==', teamId)
        );
        
        const directorySnap = await getDocs(directoryQuery);
        
        if (!directorySnap.empty) {
          const directoryData = {
            id: directorySnap.docs[0].id,
            ...directorySnap.docs[0].data()
          } as TeamDirectory;
          
          setTeamDirectory(directoryData);
        } else {
          // Create default directory if none exists
          createDefaultDirectory();
        }
      } catch (error) {
        console.error('Error fetching team directory:', error);
        toast({
          title: "Error",
          description: "Failed to load team directory.",
          variant: "destructive"
        });
      }
    };

    // Load team members with profiles
    const fetchTeamMembers = () => {
      const membersQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId)
      );

      return onSnapshot(membersQuery, async (snapshot) => {
        try {
          const members = [] as TeamMember[];
          
          for (const memberDoc of snapshot.docs) {
            const memberData = memberDoc.data() as TeamMember;
            memberData.id = memberDoc.id;
            
            // Fetch user profile if available
            if (memberData.userId) {
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
            }
            
            members.push(memberData);
          }
          
          setTeamMembers(members);
        } catch (error) {
          console.error('Error processing team members:', error);
        }
      });
    };

    fetchTeamDirectory();
    const unsubscribe = fetchTeamMembers();
    
    setLoading(false);
    
    return () => {
      unsubscribe();
    };
  }, [user, teamId]);

  // Create default team directory structure
  const createDefaultDirectory = async () => {
    try {
      const defaultDirectory: Omit<TeamDirectory, 'id'> = {
        teamId,
        name: 'Team Directory',
        departments: [
          {
            id: `dept-${Date.now()}-1`,
            name: 'General',
            description: 'Default department',
            members: []
          }
        ],
        roles: [
          {
            id: `role-${Date.now()}-1`,
            name: 'Member',
            description: 'Regular team member',
            members: []
          },
          {
            id: `role-${Date.now()}-2`,
            name: 'Admin',
            description: 'Team administrator',
            members: [user!.uid]
          }
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'teamDirectories'), defaultDirectory);
      
      setTeamDirectory({
        id: docRef.id,
        ...defaultDirectory,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
    } catch (error) {
      console.error('Error creating default directory:', error);
      toast({
        title: "Error",
        description: "Failed to create team directory structure.",
        variant: "destructive"
      });
    }
  };

  // Add department to directory
  const addDepartment = async () => {
    if (!teamDirectory || !newDepartment.name.trim()) return;
    
    try {
      const departmentId = newDepartment.id || `dept-${Date.now()}`;
      
      const newDept: Department = {
        id: departmentId,
        name: newDepartment.name.trim(),
        description: newDepartment.description.trim(),
        leadId: newDepartment.leadId || undefined,
        members: []
      };
      
      const updatedDepartments = [...teamDirectory.departments, newDept];
      
      await updateDoc(doc(db, 'teamDirectories', teamDirectory.id), {
        departments: updatedDepartments,
        updatedAt: serverTimestamp()
      });
      
      setShowEditDepartment(false);
      resetDepartmentForm();
      
      toast({
        title: "Department added",
        description: `${newDepartment.name} department has been added.`,
      });
      
    } catch (error) {
      console.error('Error adding department:', error);
      toast({
        title: "Error",
        description: "Failed to add department.",
        variant: "destructive"
      });
    }
  };

  // Add role to directory
  const addRole = async () => {
    if (!teamDirectory || !newRole.name.trim()) return;
    
    try {
      const roleId = newRole.id || `role-${Date.now()}`;
      
      const newRoleObj: Role = {
        id: roleId,
        name: newRole.name.trim(),
        description: newRole.description.trim(),
        members: []
      };
      
      const updatedRoles = [...teamDirectory.roles, newRoleObj];
      
      await updateDoc(doc(db, 'teamDirectories', teamDirectory.id), {
        roles: updatedRoles,
        updatedAt: serverTimestamp()
      });
      
      setShowEditRole(false);
      resetRoleForm();
      
      toast({
        title: "Role added",
        description: `${newRole.name} role has been added.`,
      });
      
    } catch (error) {
      console.error('Error adding role:', error);
      toast({
        title: "Error",
        description: "Failed to add role.",
        variant: "destructive"
      });
    }
  };

  // Send invitation to join team
  const sendInvitation = async () => {
    if (!user || !teamId || !newInvite.email.trim() || !newInvite.role.trim()) return;
    
    try {
      const inviteData = {
        email: newInvite.email.trim(),
        teamId,
        role: newInvite.role,
        department: newInvite.department || null,
        invitedBy: user.uid,
        status: 'invited',
        invitedAt: serverTimestamp(),
        message: newInvite.message.trim() || null
      };
      
      await addDoc(collection(db, 'teamInvitations'), inviteData);
      
      setShowInviteMember(false);
      resetInviteForm();
      
      toast({
        title: "Invitation sent",
        description: `Invitation has been sent to ${newInvite.email}`,
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

  // Update member department
  const updateMemberDepartment = async (memberId: string, departmentId: string) => {
    try {
      await updateDoc(doc(db, 'teamMembers', memberId), {
        department: departmentId
      });
      
      toast({
        title: "Department updated",
        description: "Member's department has been updated.",
      });
      
    } catch (error) {
      console.error('Error updating member department:', error);
      toast({
        title: "Error",
        description: "Failed to update department.",
        variant: "destructive"
      });
    }
  };

  // Update member role
  const updateMemberRole = async (memberId: string, roleId: string) => {
    try {
      await updateDoc(doc(db, 'teamMembers', memberId), {
        role: roleId
      });
      
      toast({
        title: "Role updated",
        description: "Member's role has been updated.",
      });
      
    } catch (error) {
      console.error('Error updating member role:', error);
      toast({
        title: "Error",
        description: "Failed to update role.",
        variant: "destructive"
      });
    }
  };

  // Remove team member
  const removeMember = async (memberId: string) => {
    try {
      await deleteDoc(doc(db, 'teamMembers', memberId));
      
      if (selectedMember?.id === memberId) {
        setSelectedMember(null);
        setShowMemberDetail(false);
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

  // Reset form states
  const resetInviteForm = () => {
    setNewInvite({
      email: '',
      role: '',
      department: '',
      message: '',
    });
  };

  const resetDepartmentForm = () => {
    setNewDepartment({
      id: '',
      name: '',
      description: '',
      leadId: '',
    });
  };

  const resetRoleForm = () => {
    setNewRole({
      id: '',
      name: '',
      description: '',
    });
  };

  // Filter members by search query
  const filteredMembers = teamMembers.filter(member => {
    const searchLower = searchQuery.toLowerCase();
    
    return (
      member.profile?.displayName?.toLowerCase().includes(searchLower) ||
      member.profile?.email?.toLowerCase().includes(searchLower) ||
      member.profile?.title?.toLowerCase().includes(searchLower) ||
      member.profile?.department?.toLowerCase().includes(searchLower) ||
      member.role?.toLowerCase().includes(searchLower)
    );
  });

  // Helper to get department name by ID
  const getDepartmentName = (departmentId: string) => {
    if (!teamDirectory) return 'Unknown';
    
    const department = teamDirectory.departments.find(dept => dept.id === departmentId);
    return department?.name || 'Unknown';
  };

  // Helper to get role name by ID
  const getRoleName = (roleId: string) => {
    if (!teamDirectory) return 'Unknown';
    
    const role = teamDirectory.roles.find(r => r.id === roleId);
    return role?.name || 'Unknown';
  };

  // Get availability badge color
  const getAvailabilityColor = (availability: UserProfile['availability']) => {
    switch (availability) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'busy':
        return 'bg-yellow-100 text-yellow-800';
      case 'out-of-office':
        return 'bg-red-100 text-red-800';
      case 'do-not-disturb':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  // Generate avatar fallback from name
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
          <p>Loading team directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Team Directory</h2>
          <p className="text-muted-foreground">
            Manage team members, departments, and roles
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowInviteMember(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => {
                resetDepartmentForm();
                setShowEditDepartment(true);
              }}>
                <Building className="h-4 w-4 mr-2" />
                Add Department
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                resetRoleForm();
                setShowEditRole(true);
              }}>
                <Briefcase className="h-4 w-4 mr-2" />
                Add Role
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Building className="h-4 w-4 mr-2" />
                Edit Departments
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Briefcase className="h-4 w-4 mr-2" />
                Edit Roles
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search and view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('grid')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <rect width="7" height="7" x="3" y="3" />
              <rect width="7" height="7" x="14" y="3" />
              <rect width="7" height="7" x="3" y="14" />
              <rect width="7" height="7" x="14" y="14" />
            </svg>
            <span className="ml-2 hidden md:inline-block">Grid</span>
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('list')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <span className="ml-2 hidden md:inline-block">List</span>
          </Button>
        </div>
      </div>

      {/* Department filter tabs */}
      {teamDirectory && teamDirectory.departments.length > 1 && (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid grid-cols-2 sm:flex sm:w-auto">
            <TabsTrigger value="all">All Members</TabsTrigger>
            {teamDirectory.departments.map((dept) => (
              <TabsTrigger key={dept.id} value={dept.id} className="hidden sm:inline-flex">
                {dept.name}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              {teamDirectory.departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Tabs>
      )}

      {/* Members display */}
      {filteredMembers.length > 0 ? (
        view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMembers.map((member) => (
              <Card key={member.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div 
                    className="flex flex-col items-center text-center cursor-pointer"
                    onClick={() => {
                      setSelectedMember(member);
                      setShowMemberDetail(true);
                    }}
                  >
                    <div className="relative">
                      <Avatar className="h-20 w-20">
                        {member.profile?.photoURL ? (
                          <AvatarImage src={member.profile.photoURL} />
                        ) : null}
                        <AvatarFallback className="text-lg">
                          {member.profile?.displayName ? getNameInitials(member.profile.displayName) : '?'}
                        </AvatarFallback>
                      </Avatar>
                      {member.profile?.availability && (
                        <Badge 
                          className={`absolute bottom-0 right-0 rounded-full ${
                            getAvailabilityColor(member.profile.availability)
                          }`}
                        >
                          {member.profile.availability}
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="font-medium text-lg mt-3">
                      {member.profile?.displayName || 'Unknown User'}
                    </h3>
                    
                    {member.profile?.title && (
                      <p className="text-muted-foreground text-sm">
                        {member.profile.title}
                      </p>
                    )}
                    
                    <div className="mt-2 space-y-1 w-full">
                      {member.department && (
                        <p className="text-xs flex items-center justify-center gap-1">
                          <Building className="h-3 w-3 text-muted-foreground" />
                          <span>{getDepartmentName(member.department)}</span>
                        </p>
                      )}
                      
                      {member.role && (
                        <Badge variant="outline" className="font-normal">
                          {getRoleName(member.role)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="bg-muted/30 p-3 flex justify-between items-center">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setSelectedMember(member);
                        setShowMemberDetail(true);
                      }}>
                        <User className="h-4 w-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => removeMember(member.id)}
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Remove from Team
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMembers.map((member) => (
              <Card key={member.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-4">
                    <div 
                      className="relative cursor-pointer"
                      onClick={() => {
                        setSelectedMember(member);
                        setShowMemberDetail(true);
                      }}
                    >
                      <Avatar>
                        {member.profile?.photoURL ? (
                          <AvatarImage src={member.profile.photoURL} />
                        ) : null}
                        <AvatarFallback>
                          {member.profile?.displayName ? getNameInitials(member.profile.displayName) : '?'}
                        </AvatarFallback>
                      </Avatar>
                      {member.profile?.availability && (
                        <Badge 
                          className={`absolute -bottom-1 -right-1 h-3 w-3 p-0 rounded-full ${
                            getAvailabilityColor(member.profile.availability)
                          }`}
                        />
                      )}
                    </div>
                    
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => {
                        setSelectedMember(member);
                        setShowMemberDetail(true);
                      }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="font-medium">
                            {member.profile?.displayName || 'Unknown User'}
                          </h3>
                          
                          {member.profile?.title && (
                            <p className="text-sm text-muted-foreground">
                              {member.profile.title}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1 sm:mt-0">
                          {member.department && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              <span>{getDepartmentName(member.department)}</span>
                            </div>
                          )}
                          
                          {member.role && (
                            <Badge variant="outline" className="font-normal">
                              {getRoleName(member.role)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {member.profile?.email && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{member.profile.email}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedMember(member);
                            setShowMemberDetail(true);
                          }}>
                            <User className="h-4 w-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => removeMember(member.id)}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Remove from Team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <Card className="bg-muted/30">
          <CardContent className="flex items-center justify-center flex-col py-12">
            <UserCircle2 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? 'No members found' : 'No team members yet'}
            </h3>
            <p className="text-muted-foreground mb-4 text-center max-w-md">
              {searchQuery 
                ? `No team members match your search query "${searchQuery}"`
                : 'Start building your team by inviting members'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowInviteMember(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Members
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invite Member Dialog */}
      <Dialog open={showInviteMember} onOpenChange={setShowInviteMember}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="memberEmail">Email Address</Label>
              <Input
                id="memberEmail"
                type="email"
                value={newInvite.email}
                onChange={(e) => setNewInvite(prev => ({ ...prev, email: e.target.value }))}
                placeholder="colleague@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="memberRole">Role</Label>
              <Select
                value={newInvite.role}
                onValueChange={(value) => setNewInvite(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger id="memberRole">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {teamDirectory?.roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="memberDepartment">Department</Label>
              <Select
                value={newInvite.department}
                onValueChange={(value) => setNewInvite(prev => ({ ...prev, department: value }))}
              >
                <SelectTrigger id="memberDepartment">
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {teamDirectory?.departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="inviteMessage">Personal Message (optional)</Label>
              <Textarea
                id="inviteMessage"
                value={newInvite.message}
                onChange={(e) => setNewInvite(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Add a personal message to your invitation"
                className="resize-none"
                rows={3}
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
                disabled={!newInvite.email.trim() || !newInvite.role.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Invitation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Department Dialog */}
      <Dialog open={showEditDepartment} onOpenChange={setShowEditDepartment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="departmentName">Department Name</Label>
              <Input
                id="departmentName"
                value={newDepartment.name}
                onChange={(e) => setNewDepartment(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Engineering"
              />
            </div>
            
            <div>
              <Label htmlFor="departmentDescription">Description (optional)</Label>
              <Textarea
                id="departmentDescription"
                value={newDepartment.description}
                onChange={(e) => setNewDepartment(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the department's function"
                className="resize-none"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="departmentLead">Department Lead (optional)</Label>
              <Select
                value={newDepartment.leadId}
                onValueChange={(value) => setNewDepartment(prev => ({ ...prev, leadId: value }))}
              >
                <SelectTrigger id="departmentLead">
                  <SelectValue placeholder="Select department lead" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.userId}>
                      {member.profile?.displayName || 'Unknown User'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowEditDepartment(false);
                resetDepartmentForm();
              }}>
                Cancel
              </Button>
              <Button 
                onClick={addDepartment}
                disabled={!newDepartment.name.trim()}
              >
                <Building className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Role Dialog */}
      <Dialog open={showEditRole} onOpenChange={setShowEditRole}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="roleName">Role Name</Label>
              <Input
                id="roleName"
                value={newRole.name}
                onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Developer"
              />
            </div>
            
            <div>
              <Label htmlFor="roleDescription">Description (optional)</Label>
              <Textarea
                id="roleDescription"
                value={newRole.description}
                onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the role's responsibilities"
                className="resize-none"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowEditRole(false);
                resetRoleForm();
              }}>
                Cancel
              </Button>
              <Button 
                onClick={addRole}
                disabled={!newRole.name.trim()}
              >
                <Briefcase className="h-4 w-4 mr-2" />
                Add Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Detail Dialog */}
      <Dialog open={showMemberDetail} onOpenChange={setShowMemberDetail}>
        {selectedMember && (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Member Profile</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left column */}
              <div className="md:col-span-1">
                <div className="flex flex-col items-center text-center p-4 bg-muted/30 rounded-lg">
                  <Avatar className="h-24 w-24">
                    {selectedMember.profile?.photoURL ? (
                      <AvatarImage src={selectedMember.profile.photoURL} />
                    ) : null}
                    <AvatarFallback className="text-xl">
                      {selectedMember.profile?.displayName ? 
                        getNameInitials(selectedMember.profile.displayName) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <h3 className="font-medium text-lg mt-4">
                    {selectedMember.profile?.displayName || 'Unknown User'}
                  </h3>
                  
                  {selectedMember.profile?.title && (
                    <p className="text-muted-foreground">
                      {selectedMember.profile.title}
                    </p>
                  )}
                  
                  <div className="mt-3 space-y-2 w-full">
                    {selectedMember.department && (
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>{getDepartmentName(selectedMember.department)}</span>
                      </div>
                    )}
                    
                    {selectedMember.role && (
                      <Badge variant="outline" className="font-normal text-sm">
                        {getRoleName(selectedMember.role)}
                      </Badge>
                    )}
                    
                    {selectedMember.profile?.availability && (
                      <Badge className={getAvailabilityColor(selectedMember.profile.availability)}>
                        {selectedMember.profile.availability}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t w-full">
                    <div className="flex justify-center gap-3">
                      {selectedMember.profile?.email && (
                        <Button variant="outline" size="sm">
                          <Mail className="h-4 w-4 mr-2" />
                          Email
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Skills and expertise */}
                {selectedMember.profile?.skills && selectedMember.profile.skills.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Skills & Expertise</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedMember.profile.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Join date */}
                {selectedMember.joinDate && (
                  <div className="mt-4 flex items-center text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4 mr-2" />
                    <span>
                      Joined {format(new Date(selectedMember.joinDate.seconds * 1000), 'MMMM dd, yyyy')}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Right column */}
              <div className="md:col-span-2">
                <Tabs defaultValue="info">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="info">Information</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>
                  
                  {/* Info tab */}
                  <TabsContent value="info" className="space-y-6 pt-4">
                    {selectedMember.profile?.bio && (
                      <div>
                        <h4 className="font-medium mb-2">Bio</h4>
                        <p className="text-muted-foreground">
                          {selectedMember.profile.bio}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-medium mb-3">Contact Information</h4>
                      <div className="space-y-3">
                        {selectedMember.profile?.email && (
                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedMember.profile.email}</span>
                          </div>
                        )}
                        
                        {selectedMember.profile?.phone && (
                          <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedMember.profile.phone}</span>
                          </div>
                        )}
                        
                        {selectedMember.profile?.location && (
                          <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedMember.profile.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-3">Team Role</h4>
                        <div className="space-y-2">
                          <div>
                            <Label>Department</Label>
                            <Select
                              value={selectedMember.department || ''}
                              onValueChange={(value) => updateMemberDepartment(selectedMember.id, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                              <SelectContent>
                                {teamDirectory?.departments.map((dept) => (
                                  <SelectItem key={dept.id} value={dept.id}>
                                    {dept.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Role</Label>
                            <Select
                              value={selectedMember.role || ''}
                              onValueChange={(value) => updateMemberRole(selectedMember.id, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                {teamDirectory?.roles.map((role) => (
                                  <SelectItem key={role.id} value={role.id}>
                                    {role.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      
                      {selectedMember.profile?.manager && (
                        <div>
                          <h4 className="font-medium mb-3">Reports To</h4>
                          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                            <Avatar>
                              <AvatarFallback>
                                {selectedMember.profile.manager.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{selectedMember.profile.manager}</p>
                              <p className="text-sm text-muted-foreground">Manager</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  {/* Activity tab */}
                  <TabsContent value="activity" className="pt-4">
                    <div className="bg-muted/30 p-6 rounded-lg text-center">
                      <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <h4 className="text-lg font-medium mb-2">No recent activity</h4>
                      <p className="text-muted-foreground">
                        Activity tracking is not available or no recent activity has been recorded
                      </p>
                    </div>
                  </TabsContent>
                  
                  {/* Settings tab */}
                  <TabsContent value="settings" className="pt-4 space-y-6">
                    <div>
                      <h4 className="font-medium mb-3">Team Member Options</h4>
                      <div className="space-y-4">
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium">Remove from Team</h5>
                                <p className="text-sm text-muted-foreground">
                                  Remove this member from the team
                                </p>
                              </div>
                              <Button 
                                variant="destructive"
                                onClick={() => {
                                  removeMember(selectedMember.id);
                                  setShowMemberDetail(false);
                                }}
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Remove
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium">Change Role</h5>
                                <p className="text-sm text-muted-foreground">
                                  Update member's role in the team
                                </p>
                              </div>
                              <Select
                                value={selectedMember.role || ''}
                                onValueChange={(value) => updateMemberRole(selectedMember.id, value)}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {teamDirectory?.roles.map((role) => (
                                    <SelectItem key={role.id} value={role.id}>
                                      {role.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                    
                    <div className="text-center pt-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        User ID: {selectedMember.userId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Membership ID: {selectedMember.id}
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}