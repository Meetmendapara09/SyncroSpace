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
  limit,
  onSnapshot,
  serverTimestamp,
  getDocs,
  writeBatch,
  increment
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Shield,
  Users,
  Settings,
  Activity,
  BarChart3,
  FileText,
  Key,
  Globe,
  Database,
  Server,
  Zap,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Save,
  Copy,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Crown,
  UserCheck,
  UserX,
  UserPlus,
  Lock,
  Unlock,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  Video,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Share,
  Star,
  Heart,
  ThumbsUp,
  MessageCircle,
  Folder,
  File,
  Archive,
  Tag,
  Link,
  Smartphone,
  Monitor,
  Tablet,
  MapPin,
  Wifi,
  WifiOff,
  BellRing,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Square,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  X,
  Check,
  Info,
  HelpCircle,
  RotateCcw,
  Power,
  PowerOff
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';

// Types and Interfaces
interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalTeams: number;
  totalSpaces: number;
  totalMessages: number;
  totalFiles: number;
  storageUsed: number;
  bandwidthUsed: number;
  activeConnections: number;
  securityEvents: number;
  systemHealth: number;
  uptime: number;
}

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'user';
  status: 'active' | 'suspended' | 'pending' | 'banned';
  createdAt: any;
  lastActive: any;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  teams: string[];
  permissions: string[];
  metadata: {
    loginCount: number;
    totalSessions: number;
    avgSessionDuration: number;
    lastLoginIP: string;
    preferredLanguage: string;
    timezone: string;
  };
}

interface TeamProfile {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  ownerId: string;
  memberCount: number;
  spaceCount: number;
  storageUsed: number;
  status: 'active' | 'suspended' | 'archived';
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: any;
  settings: {
    isPrivate: boolean;
    allowGuestAccess: boolean;
    requireApproval: boolean;
    maxMembers: number;
    storageLimit: number;
    features: string[];
  };
}

interface SystemConfig {
  id: string;
  category: 'general' | 'security' | 'performance' | 'features' | 'integrations';
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  isPublic: boolean;
  updatedBy: string;
  updatedAt: any;
}

interface AnalyticsData {
  timestamp: any;
  metrics: {
    activeUsers: number;
    newSignups: number;
    messagesExchanged: number;
    filesUploaded: number;
    meetingsHeld: number;
    whiteboardSessions: number;
    apiCalls: number;
    errorRate: number;
    avgResponseTime: number;
  };
}

interface AdminDashboardProps {
  
}

export function AdminDashboard({}: AdminDashboardProps) {
  const [user] = useAuthState(auth);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalTeams: 0,
    totalSpaces: 0,
    totalMessages: 0,
    totalFiles: 0,
    storageUsed: 0,
    bandwidthUsed: 0,
    activeConnections: 0,
    securityEvents: 0,
    systemHealth: 95,
    uptime: 99.9
  });
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<TeamProfile[]>([]);
  const [systemConfigs, setSystemConfigs] = useState<SystemConfig[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  
  // UI states
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamProfile | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  // Form states
  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    role: 'user' as const,
    sendInvite: true
  });

  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    isPrivate: false,
    plan: 'free' as const
  });

  const [configEdit, setConfigEdit] = useState<SystemConfig | null>(null);

  useEffect(() => {
    if (!user) return;

    // Load admin statistics
    loadAdminStats();

    // Load users
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const userList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserProfile[];
      setUsers(userList);
    });

    // Load teams
    const teamsQuery = query(
      collection(db, 'teams'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeTeams = onSnapshot(teamsQuery, (snapshot) => {
      const teamList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeamProfile[];
      setTeams(teamList);
    });

    // Load system configurations
    const configsQuery = query(
      collection(db, 'systemConfigs'),
      orderBy('category')
    );

    const unsubscribeConfigs = onSnapshot(configsQuery, (snapshot) => {
      const configList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SystemConfig[];
      setSystemConfigs(configList);
    });

    // Load analytics data (last 30 days)
    loadAnalyticsData();

    setLoading(false);

    return () => {
      unsubscribeUsers();
      unsubscribeTeams();
      unsubscribeConfigs();
    };
  }, [user]);

  const loadAdminStats = async () => {
    try {
      // In a real app, these would be aggregated from various collections
      const [usersSnapshot, teamsSnapshot, messagesSnapshot, filesSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'teams')),
        getDocs(collection(db, 'messages')),
        getDocs(collection(db, 'files'))
      ]);

      const totalUsers = usersSnapshot.size;
      const totalTeams = teamsSnapshot.size;
      const totalMessages = messagesSnapshot.size;
      const totalFiles = filesSnapshot.size;

      // Calculate active users (logged in within 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeUsers = usersSnapshot.docs.filter(doc => {
        const lastActive = doc.data().lastActive?.toDate?.();
        return lastActive && lastActive > yesterday;
      }).length;

      // Calculate storage usage
      let storageUsed = 0;
      filesSnapshot.docs.forEach(doc => {
        storageUsed += doc.data().size || 0;
      });

      setStats(prev => ({
        ...prev,
        totalUsers,
        activeUsers,
        totalTeams,
        totalMessages,
        totalFiles,
        storageUsed,
        totalSpaces: totalTeams * 3, // Estimate
        bandwidthUsed: storageUsed * 0.1, // Estimate
        activeConnections: activeUsers * 2, // Estimate
        securityEvents: 5 // Would query security events
      }));

    } catch (error) {
      console.error('Error loading admin stats:', error);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      const analyticsQuery = query(
        collection(db, 'analytics'),
        orderBy('timestamp', 'desc'),
        limit(30)
      );

      const snapshot = await getDocs(analyticsQuery);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  // Create new user
  const createUser = async () => {
    if (!newUser.email || !newUser.displayName) return;

    try {
      const userData: Partial<UserProfile> = {
        email: newUser.email,
        displayName: newUser.displayName,
        role: newUser.role,
        status: 'pending',
        createdAt: serverTimestamp(),
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        teams: [],
        permissions: [],
        metadata: {
          loginCount: 0,
          totalSessions: 0,
          avgSessionDuration: 0,
          lastLoginIP: '',
          preferredLanguage: 'en',
          timezone: 'UTC'
        }
      };

      await addDoc(collection(db, 'users'), userData);

      if (newUser.sendInvite) {
        // Send invitation email (would use email service)
        console.log('Sending invitation to:', newUser.email);
      }

      setShowUserDialog(false);
      setNewUser({
        email: '',
        displayName: '',
        role: 'user',
        sendInvite: true
      });

      toast({
        title: "User created",
        description: `User ${newUser.displayName} has been created successfully.`,
      });

    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to create user.",
        variant: "destructive"
      });
    }
  };

  // Update user status
  const updateUserStatus = async (userId: string, status: UserProfile['status']) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "User updated",
        description: `User status changed to ${status}.`,
      });

    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user status.",
        variant: "destructive"
      });
    }
  };

  // Update user role
  const updateUserRole = async (userId: string, role: UserProfile['role']) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "User updated",
        description: `User role changed to ${role}.`,
      });

    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive"
      });
    }
  };

  // Delete user
  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userId));

      toast({
        title: "User deleted",
        description: "User has been permanently deleted.",
      });

    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user.",
        variant: "destructive"
      });
    }
  };

  // Create new team
  const createTeam = async () => {
    if (!newTeam.name) return;

    try {
      const teamData: Partial<TeamProfile> = {
        name: newTeam.name,
        description: newTeam.description,
        ownerId: user!.uid,
        memberCount: 1,
        spaceCount: 0,
        storageUsed: 0,
        status: 'active',
        plan: newTeam.plan,
        createdAt: serverTimestamp(),
        settings: {
          isPrivate: newTeam.isPrivate,
          allowGuestAccess: false,
          requireApproval: true,
          maxMembers: newTeam.plan === 'free' ? 10 : newTeam.plan === 'pro' ? 100 : 1000,
          storageLimit: newTeam.plan === 'free' ? 1000000000 : newTeam.plan === 'pro' ? 10000000000 : 100000000000, // 1GB, 10GB, 100GB
          features: newTeam.plan === 'free' ? ['basic'] : newTeam.plan === 'pro' ? ['basic', 'advanced'] : ['basic', 'advanced', 'enterprise']
        }
      };

      await addDoc(collection(db, 'teams'), teamData);

      setShowTeamDialog(false);
      setNewTeam({
        name: '',
        description: '',
        isPrivate: false,
        plan: 'free'
      });

      toast({
        title: "Team created",
        description: `Team "${newTeam.name}" has been created successfully.`,
      });

    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: "Error",
        description: "Failed to create team.",
        variant: "destructive"
      });
    }
  };

  // Update system configuration
  const updateSystemConfig = async (config: SystemConfig) => {
    try {
      await updateDoc(doc(db, 'systemConfigs', config.id), {
        value: config.value,
        updatedBy: user!.uid,
        updatedAt: serverTimestamp()
      });

      setShowConfigDialog(false);
      setConfigEdit(null);

      toast({
        title: "Configuration updated",
        description: `${config.key} has been updated successfully.`,
      });

    } catch (error) {
      console.error('Error updating config:', error);
      toast({
        title: "Error",
        description: "Failed to update configuration.",
        variant: "destructive"
      });
    }
  };

  // Export data
  const exportData = async (type: 'users' | 'teams' | 'analytics') => {
    try {
      let data;
      let filename;

      switch (type) {
        case 'users':
          data = users;
          filename = 'users-export.json';
          break;
        case 'teams':
          data = teams;
          filename = 'teams-export.json';
          break;
        case 'analytics':
          data = analyticsData;
          filename = 'analytics-export.json';
          break;
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export complete",
        description: `${type} data has been exported successfully.`,
      });

    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Error",
        description: "Failed to export data.",
        variant: "destructive"
      });
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'suspended': return 'text-orange-600 bg-orange-100';
      case 'banned': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get role color
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'text-purple-600 bg-purple-100';
      case 'admin': return 'text-blue-600 bg-blue-100';
      case 'moderator': return 'text-green-600 bg-green-100';
      case 'user': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-3">
          <Crown className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage users, teams, and system settings</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button variant="outline" onClick={() => exportData('analytics')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* System Stats */}
      <div className="p-6 border-b bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Active Users</p>
                  <p className="text-2xl font-bold">{stats.activeUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">Teams</p>
                  <p className="text-2xl font-bold">{stats.totalTeams}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium">Storage</p>
                  <p className="text-2xl font-bold">{formatFileSize(stats.storageUsed)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium">System Health</p>
                  <p className="text-2xl font-bold">{stats.systemHealth}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium">Uptime</p>
                  <p className="text-2xl font-bold">{stats.uptime}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent User Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    Recent User Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {users.slice(0, 10).map((user) => (
                        <div key={user.id} className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user.displayName}</p>
                            <p className="text-sm text-muted-foreground">
                              Last active {formatDistanceToNow(user.lastActive?.toDate?.() || new Date(), { addSuffix: true })}
                            </p>
                          </div>
                          <Badge className={getStatusColor(user.status)}>
                            {user.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* System Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-green-600" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>CPU Usage</span>
                      <span>45%</span>
                    </div>
                    <Progress value={45} />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Memory Usage</span>
                      <span>62%</span>
                    </div>
                    <Progress value={62} />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Storage Usage</span>
                      <span>78%</span>
                    </div>
                    <Progress value={78} />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Network Usage</span>
                      <span>34%</span>
                    </div>
                    <Progress value={34} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-24 flex-col"
                    onClick={() => setShowUserDialog(true)}
                  >
                    <UserPlus className="h-6 w-6 mb-2" />
                    Add User
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-24 flex-col"
                    onClick={() => setShowTeamDialog(true)}
                  >
                    <Plus className="h-6 w-6 mb-2" />
                    Create Team
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-24 flex-col"
                    onClick={() => exportData('users')}
                  >
                    <Download className="h-6 w-6 mb-2" />
                    Export Data
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-24 flex-col"
                    onClick={() => setActiveTab('security')}
                  >
                    <Shield className="h-6 w-6 mb-2" />
                    Security Center
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            {/* User Filters */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={() => setShowUserDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>

            {/* Users Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Teams</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.displayName}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(user.role)}>
                            {user.role.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(user.status)}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.teams?.length || 0}</TableCell>
                        <TableCell>
                          {user.lastActive ? 
                            formatDistanceToNow(user.lastActive.toDate(), { addSuffix: true }) : 
                            'Never'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            <Select 
                              value={user.status} 
                              onValueChange={(value) => updateUserStatus(user.id, value as any)}
                            >
                              <SelectTrigger className="w-20 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="suspended">Suspend</SelectItem>
                                <SelectItem value="banned">Ban</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteUser(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Teams Management</h3>
              <Button onClick={() => setShowTeamDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <Card key={team.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={team.avatar} />
                          <AvatarFallback>{team.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{team.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{team.memberCount} members</p>
                        </div>
                      </div>
                      <Badge variant={
                        team.plan === 'enterprise' ? 'default' :
                        team.plan === 'pro' ? 'secondary' :
                        'outline'
                      }>
                        {team.plan}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm">{team.description}</p>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span>Storage Used:</span>
                        <span>{formatFileSize(team.storageUsed)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span>Spaces:</span>
                        <span>{team.spaceCount}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span>Status:</span>
                        <Badge className={getStatusColor(team.status)}>
                          {team.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Daily Active Users</p>
                      <p className="text-2xl font-bold">{stats.activeUsers}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">+12% from yesterday</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Messages Today</p>
                      <p className="text-2xl font-bold">2,543</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">+8% from yesterday</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Files Uploaded</p>
                      <p className="text-2xl font-bold">156</p>
                    </div>
                    <Upload className="h-8 w-8 text-purple-600" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">-3% from yesterday</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Meetings Held</p>
                      <p className="text-2xl font-bold">89</p>
                    </div>
                    <Video className="h-8 w-8 text-orange-600" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">+15% from yesterday</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts would go here */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <BarChart3 className="h-16 w-16 mr-4" />
                  <p>Analytics charts would be implemented here using a charting library like Recharts</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <h3 className="text-lg font-semibold">System Configuration</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries({
                general: systemConfigs.filter(c => c.category === 'general'),
                security: systemConfigs.filter(c => c.category === 'security'),
                performance: systemConfigs.filter(c => c.category === 'performance'),
                features: systemConfigs.filter(c => c.category === 'features')
              }).map(([category, configs]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="capitalize">{category} Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {configs.map((config) => (
                      <div key={config.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{config.key}</p>
                          <p className="text-sm text-muted-foreground">{config.description}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setConfigEdit(config);
                            setShowConfigDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Security Events</p>
                      <p className="text-2xl font-bold">{stats.securityEvents}</p>
                    </div>
                    <Shield className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Last 24 hours</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Failed Logins</p>
                      <p className="text-2xl font-bold">12</p>
                    </div>
                    <UserX className="h-8 w-8 text-orange-600" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">-50% from yesterday</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Sessions</p>
                      <p className="text-2xl font-bold">{stats.activeConnections}</p>
                    </div>
                    <Activity className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Current active</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Security Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-20 flex-col">
                    <Shield className="h-6 w-6 mb-2" />
                    Security Audit
                  </Button>
                  
                  <Button variant="outline" className="h-20 flex-col">
                    <Key className="h-6 w-6 mb-2" />
                    Rotate Keys
                  </Button>
                  
                  <Button variant="outline" className="h-20 flex-col">
                    <Lock className="h-6 w-6 mb-2" />
                    Force Logout
                  </Button>
                  
                  <Button variant="outline" className="h-20 flex-col">
                    <Download className="h-6 w-6 mb-2" />
                    Export Logs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                placeholder="user@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={newUser.displayName}
                onChange={(e) => setNewUser(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>
            
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendInvite"
                checked={newUser.sendInvite}
                onCheckedChange={(checked) => setNewUser(prev => ({ ...prev, sendInvite: checked as boolean }))}
              />
              <Label htmlFor="sendInvite">Send invitation email</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUserDialog(false)}>
                Cancel
              </Button>
              <Button onClick={createUser} disabled={!newUser.email || !newUser.displayName}>
                Create User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Team Dialog */}
      <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
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
              <Label htmlFor="teamPlan">Plan</Label>
              <Select value={newTeam.plan} onValueChange={(value) => setNewTeam(prev => ({ ...prev, plan: value as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPrivate"
                checked={newTeam.isPrivate}
                onCheckedChange={(checked) => setNewTeam(prev => ({ ...prev, isPrivate: checked as boolean }))}
              />
              <Label htmlFor="isPrivate">Private team (invite only)</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTeamDialog(false)}>
                Cancel
              </Button>
              <Button onClick={createTeam} disabled={!newTeam.name}>
                Create Team
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Config Edit Dialog */}
      {configEdit && (
        <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Configuration</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Setting</Label>
                <p className="font-medium">{configEdit.key}</p>
                <p className="text-sm text-muted-foreground">{configEdit.description}</p>
              </div>
              
              <div>
                <Label htmlFor="configValue">Value</Label>
                {configEdit.type === 'boolean' ? (
                  <Switch
                    checked={configEdit.value}
                    onCheckedChange={(checked) => setConfigEdit(prev => prev ? { ...prev, value: checked } : null)}
                  />
                ) : configEdit.type === 'number' ? (
                  <Input
                    id="configValue"
                    type="number"
                    value={configEdit.value}
                    onChange={(e) => setConfigEdit(prev => prev ? { ...prev, value: parseFloat(e.target.value) } : null)}
                  />
                ) : (
                  <Input
                    id="configValue"
                    value={configEdit.value}
                    onChange={(e) => setConfigEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                  />
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => updateSystemConfig(configEdit)}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}