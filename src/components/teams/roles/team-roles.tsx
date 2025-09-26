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
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Crown,
  Shield,
  UserCheck,
  User,
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Users,
  FileText,
  Calendar,
  MessageSquare,
  BarChart3,
  FolderOpen,
  Bell,
  Key,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';

// Types and Interfaces
interface TeamRole {
  id: string;
  teamId: string;
  name: string;
  description: string;
  permissions: Permission[];
  color: string;
  icon: string;
  isDefault: boolean;
  isSystem: boolean;
  createdAt: any;
  updatedAt: any;
  memberCount: number;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'team' | 'members' | 'content' | 'settings' | 'analytics';
  enabled: boolean;
}

interface TeamRolesProps {
  teamId: string;
}

const DEFAULT_PERMISSIONS: Permission[] = [
  // Team Management
  { id: 'team:view', name: 'View Team', description: 'View team information and members', category: 'team', enabled: true },
  { id: 'team:edit', name: 'Edit Team', description: 'Edit team name, description, and settings', category: 'team', enabled: false },
  { id: 'team:delete', name: 'Delete Team', description: 'Delete the team', category: 'team', enabled: false },

  // Member Management
  { id: 'members:view', name: 'View Members', description: 'View team member list and profiles', category: 'members', enabled: true },
  { id: 'members:invite', name: 'Invite Members', description: 'Send invitations to new members', category: 'members', enabled: false },
  { id: 'members:remove', name: 'Remove Members', description: 'Remove members from the team', category: 'members', enabled: false },
  { id: 'members:manage_roles', name: 'Manage Roles', description: 'Assign and change member roles', category: 'members', enabled: false },

  // Content Management
  { id: 'content:create', name: 'Create Content', description: 'Create tasks, goals, and other content', category: 'content', enabled: true },
  { id: 'content:edit', name: 'Edit Content', description: 'Edit existing content', category: 'content', enabled: true },
  { id: 'content:delete', name: 'Delete Content', description: 'Delete content created by others', category: 'content', enabled: false },
  { id: 'content:manage_files', name: 'Manage Files', description: 'Upload, organize, and delete team files', category: 'content', enabled: true },

  // Settings
  { id: 'settings:view', name: 'View Settings', description: 'View team settings and configuration', category: 'settings', enabled: true },
  { id: 'settings:edit', name: 'Edit Settings', description: 'Modify team settings and configuration', category: 'settings', enabled: false },

  // Analytics
  { id: 'analytics:view', name: 'View Analytics', description: 'View team performance and analytics', category: 'analytics', enabled: true },
  { id: 'analytics:export', name: 'Export Analytics', description: 'Export analytics data and reports', category: 'analytics', enabled: false },
];

const DEFAULT_ROLES: Omit<TeamRole, 'id' | 'teamId' | 'createdAt' | 'updatedAt' | 'memberCount'>[] = [
  {
    name: 'Owner',
    description: 'Full access to all team features and settings',
    permissions: DEFAULT_PERMISSIONS.map(p => ({ ...p, enabled: true })),
    color: 'purple',
    icon: 'crown',
    isDefault: false,
    isSystem: true,
  },
  {
    name: 'Admin',
    description: 'Manage team members and most settings',
    permissions: DEFAULT_PERMISSIONS.map(p => ({
      ...p,
      enabled: !['team:delete', 'settings:edit'].includes(p.id)
    })),
    color: 'red',
    icon: 'shield',
    isDefault: false,
    isSystem: true,
  },
  {
    name: 'Moderator',
    description: 'Moderate content and manage some members',
    permissions: DEFAULT_PERMISSIONS.map(p => ({
      ...p,
      enabled: ['team:view', 'members:view', 'members:invite', 'content:create', 'content:edit', 'content:manage_files', 'analytics:view'].includes(p.id)
    })),
    color: 'blue',
    icon: 'user-check',
    isDefault: false,
    isSystem: true,
  },
  {
    name: 'Member',
    description: 'Standard team member with basic access',
    permissions: DEFAULT_PERMISSIONS.map(p => ({
      ...p,
      enabled: ['team:view', 'members:view', 'content:create', 'content:edit', 'content:manage_files', 'analytics:view'].includes(p.id)
    })),
    color: 'green',
    icon: 'user',
    isDefault: true,
    isSystem: true,
  },
];

export function TeamRoles({ teamId }: TeamRolesProps) {
  const [user] = useAuthState(auth);
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [editingRole, setEditingRole] = useState<TeamRole | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');

  // Create/Edit role form state
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    color: 'gray',
    icon: 'user',
    permissions: DEFAULT_PERMISSIONS.map(p => ({ ...p, enabled: false })),
  });

  useEffect(() => {
    if (!user || !teamId) return;

    setLoading(true);

    // Load team roles
    const loadRoles = () => {
      const rolesQuery = query(
        collection(db, 'teamRoles'),
        where('teamId', '==', teamId),
        orderBy('createdAt', 'asc')
      );

      return onSnapshot(rolesQuery, async (snapshot) => {
        const rolesList = [] as TeamRole[];

        for (const roleDoc of snapshot.docs) {
          const roleData = roleDoc.data() as TeamRole;
          roleData.id = roleDoc.id;

          // Count members with this role
          const membersQuery = query(
            collection(db, 'teamMembers'),
            where('teamId', '==', teamId),
            where('role', '==', roleData.name.toLowerCase())
          );
          const membersSnapshot = await getDocs(membersQuery);
          roleData.memberCount = membersSnapshot.size;

          // Check if current user has this role
          if (roleData.name.toLowerCase() === currentUserRole) {
            // User has this role
          }

          rolesList.push(roleData);
        }

        // If no roles exist, create default roles
        if (rolesList.length === 0) {
          await createDefaultRoles();
        } else {
          setRoles(rolesList);
        }

        setLoading(false);
      });
    };

    // Get current user's role
    const getCurrentUserRole = async () => {
      const memberQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId),
        where('userId', '==', user.uid)
      );
      const memberSnapshot = await getDocs(memberQuery);
      if (!memberSnapshot.empty) {
        const memberData = memberSnapshot.docs[0].data();
        setCurrentUserRole(memberData.role || 'member');
      }
    };

    const unsubscribeRoles = loadRoles();
    getCurrentUserRole();

    return () => {
      unsubscribeRoles();
    };
  }, [user, teamId, currentUserRole]);

  // Create default roles
  const createDefaultRoles = async () => {
    try {
      const defaultRoles = DEFAULT_ROLES.map(role => ({
        ...role,
        teamId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        memberCount: 0,
      }));

      const createdRoles = [] as TeamRole[];

      for (const role of defaultRoles) {
        const docRef = await addDoc(collection(db, 'teamRoles'), role);
        createdRoles.push({
          ...role,
          id: docRef.id,
        } as TeamRole);
      }

      setRoles(createdRoles);
    } catch (error) {
      console.error('Error creating default roles:', error);
      toast({
        title: "Error",
        description: "Failed to create default roles.",
        variant: "destructive"
      });
    }
  };

  // Create new role
  const createRole = async () => {
    if (!canManageRoles()) return;

    try {
      const newRole = {
        teamId,
        name: roleForm.name.trim(),
        description: roleForm.description.trim(),
        permissions: roleForm.permissions,
        color: roleForm.color,
        icon: roleForm.icon,
        isDefault: false,
        isSystem: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        memberCount: 0,
      };

      await addDoc(collection(db, 'teamRoles'), newRole);

      setShowCreateRole(false);
      resetRoleForm();

      toast({
        title: "Role created",
        description: `Role "${roleForm.name}" has been created.`,
      });

    } catch (error) {
      console.error('Error creating role:', error);
      toast({
        title: "Error",
        description: "Failed to create role.",
        variant: "destructive"
      });
    }
  };

  // Update existing role
  const updateRole = async () => {
    if (!editingRole || !canManageRoles()) return;

    try {
      await updateDoc(doc(db, 'teamRoles', editingRole.id), {
        name: roleForm.name.trim(),
        description: roleForm.description.trim(),
        permissions: roleForm.permissions,
        color: roleForm.color,
        icon: roleForm.icon,
        updatedAt: serverTimestamp(),
      });

      setEditingRole(null);
      resetRoleForm();

      toast({
        title: "Role updated",
        description: `Role "${roleForm.name}" has been updated.`,
      });

    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update role.",
        variant: "destructive"
      });
    }
  };

  // Delete role
  const deleteRole = async (roleId: string, roleName: string) => {
    if (!canManageRoles()) return;

    // Check if role has members
    const role = roles.find(r => r.id === roleId);
    if (role && role.memberCount > 0) {
      toast({
        title: "Cannot delete role",
        description: "This role has active members. Please reassign them first.",
        variant: "destructive"
      });
      return;
    }

    try {
      await updateDoc(doc(db, 'teamRoles', roleId), {
        isDefault: false, // Mark as deleted by removing default status
      });

      toast({
        title: "Role deleted",
        description: `Role "${roleName}" has been deleted.`,
      });

    } catch (error) {
      console.error('Error deleting role:', error);
      toast({
        title: "Error",
        description: "Failed to delete role.",
        variant: "destructive"
      });
    }
  };

  // Check if current user can manage roles
  const canManageRoles = () => {
    return currentUserRole === 'admin' || currentUserRole === 'owner';
  };

  // Reset role form
  const resetRoleForm = () => {
    setRoleForm({
      name: '',
      description: '',
      color: 'gray',
      icon: 'user',
      permissions: DEFAULT_PERMISSIONS.map(p => ({ ...p, enabled: false })),
    });
  };

  // Start editing role
  const startEditingRole = (role: TeamRole) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description,
      color: role.color,
      icon: role.icon,
      permissions: role.permissions,
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingRole(null);
    resetRoleForm();
  };

  // Update permission
  const updatePermission = (permissionId: string, enabled: boolean) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.map(p =>
        p.id === permissionId ? { ...p, enabled } : p
      ),
    }));
  };

  // Get role icon component
  const getRoleIcon = (iconName: string) => {
    switch (iconName) {
      case 'crown':
        return <Crown className="h-5 w-5" />;
      case 'shield':
        return <Shield className="h-5 w-5" />;
      case 'user-check':
        return <UserCheck className="h-5 w-5" />;
      case 'user':
        return <User className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  // Get role color classes
  const getRoleColorClasses = (color: string) => {
    switch (color) {
      case 'purple':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'red':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'blue':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'green':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'orange':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Group permissions by category
  const groupPermissionsByCategory = (permissions: Permission[]) => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach(permission => {
      if (!groups[permission.category]) {
        groups[permission.category] = [];
      }
      groups[permission.category].push(permission);
    });
    return groups;
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'team':
        return <Users className="h-4 w-4" />;
      case 'members':
        return <UserCheck className="h-4 w-4" />;
      case 'content':
        return <FileText className="h-4 w-4" />;
      case 'settings':
        return <Settings className="h-4 w-4" />;
      case 'analytics':
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading team roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Team Roles & Permissions</h2>
          <p className="text-muted-foreground">
            Manage role-based access control and permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCreateRole(true)}
            disabled={!canManageRoles()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <Card key={role.id} className={`relative ${editingRole?.id === role.id ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getRoleColorClasses(role.color)}`}>
                    {getRoleIcon(role.icon)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {role.memberCount} member{role.memberCount !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                </div>

                {canManageRoles() && !role.isSystem && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => startEditingRole(role)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Role
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteRole(role.id, role.name)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Role
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {role.description}
              </p>

              {/* Permission Summary */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Permissions</h4>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {Object.entries(groupPermissionsByCategory(role.permissions)).map(([category, perms]) => {
                    const enabledCount = perms.filter(p => p.enabled).length;
                    return (
                      <div key={category} className="flex items-center gap-1">
                        {getCategoryIcon(category)}
                        <span className="capitalize">{category}</span>
                        <span className="text-muted-foreground">
                          ({enabledCount}/{perms.length})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* System/Default badges */}
              <div className="flex gap-2 mt-4">
                {role.isSystem && (
                  <Badge variant="outline" className="text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    System
                  </Badge>
                )}
                {role.isDefault && (
                  <Badge variant="outline" className="text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Default
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Role Dialog */}
      <Dialog open={showCreateRole || !!editingRole} onOpenChange={(open) => {
        if (!open) {
          setShowCreateRole(false);
          setEditingRole(null);
          resetRoleForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? 'Edit Role' : 'Create New Role'}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="roleName">Role Name</Label>
                  <Input
                    id="roleName"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Project Manager"
                  />
                </div>

                <div>
                  <Label htmlFor="roleColor">Color</Label>
                  <Select
                    value={roleForm.color}
                    onValueChange={(value) => setRoleForm(prev => ({ ...prev, color: value }))}
                  >
                    <SelectTrigger id="roleColor">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gray">Gray</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="yellow">Yellow</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
                      <SelectItem value="orange">Orange</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="roleDescription">Description</Label>
                <textarea
                  id="roleDescription"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this role can do..."
                  className="w-full min-h-[80px] px-3 py-2 text-sm border border-input bg-background rounded-md resize-none"
                />
              </div>

              {/* Permissions */}
              <div>
                <h3 className="text-lg font-medium mb-4">Permissions</h3>
                <div className="space-y-6">
                  {Object.entries(groupPermissionsByCategory(roleForm.permissions)).map(([category, permissions]) => (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        {getCategoryIcon(category)}
                        <h4 className="font-medium capitalize">{category} Permissions</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {permissions.map((permission) => (
                          <div key={permission.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h5 className="text-sm font-medium">{permission.name}</h5>
                                {permission.enabled ? (
                                  <Eye className="h-3 w-3 text-green-600" />
                                ) : (
                                  <EyeOff className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {permission.description}
                              </p>
                            </div>
                            <Switch
                              checked={permission.enabled}
                              onCheckedChange={(checked) => updatePermission(permission.id, checked)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setShowCreateRole(false);
              setEditingRole(null);
              resetRoleForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={editingRole ? updateRole : createRole}
              disabled={!roleForm.name.trim() || !roleForm.description.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              {editingRole ? 'Update Role' : 'Create Role'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}