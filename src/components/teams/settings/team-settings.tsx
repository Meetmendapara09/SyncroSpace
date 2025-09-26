'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  updateDoc,
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Settings,
  Save,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Users,
  Bell,
  Shield,
  Palette,
  Clock,
  Mail,
  MessageSquare,
  Calendar,
  FileText,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Types and Interfaces
interface TeamSettings {
  id: string;
  teamId: string;
  name: string;
  description: string;
  avatar?: string;
  coverImage?: string;
  visibility: 'public' | 'private' | 'invite-only';
  allowMemberInvites: boolean;
  requireApprovalForJoins: boolean;
  defaultRole: string;
  timezone: string;
  workingHours: {
    start: string;
    end: string;
    days: string[];
  };
  notifications: {
    email: boolean;
    inApp: boolean;
    taskUpdates: boolean;
    memberJoins: boolean;
    deadlineReminders: boolean;
  };
  features: {
    tasks: boolean;
    goals: boolean;
    calendar: boolean;
    files: boolean;
    chat: boolean;
    analytics: boolean;
  };
  integrations: {
    slack: boolean;
    googleCalendar: boolean;
    microsoftTeams: boolean;
    jira: boolean;
  };
  createdAt: any;
  updatedAt: any;
}

interface TeamSettingsProps {
  teamId: string;
}

const DEFAULT_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

const DEFAULT_WORKING_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
];

export function TeamSettingsComponent({ teamId }: TeamSettingsProps) {
  const [user] = useAuthState(auth);
  const [settings, setSettings] = useState<TeamSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');

  // Form state
  const [formData, setFormData] = useState<Partial<TeamSettings>>({});

  useEffect(() => {
    if (!user || !teamId) return;

    setLoading(true);

    // Load team settings
    const loadSettings = () => {
      const settingsRef = doc(db, 'teamSettings', teamId);

      return onSnapshot(settingsRef, async (doc) => {
        if (doc.exists()) {
          const settingsData = { id: doc.id, ...doc.data() } as TeamSettings;
          setSettings(settingsData);
          setFormData(settingsData);
        } else {
          // Create default settings
          await createDefaultSettings();
        }
        setLoading(false);
      });
    };

    // Get current user's role
    const getCurrentUserRole = async () => {
      const memberQuery = collection(db, 'teamMembers');
      const memberDoc = await getDoc(doc(memberQuery, `${teamId}_${user.uid}`));
      if (memberDoc.exists()) {
        const memberData = memberDoc.data();
        setCurrentUserRole(memberData.role || 'member');
      }
    };

    const unsubscribeSettings = loadSettings();
    getCurrentUserRole();

    return () => {
      unsubscribeSettings();
    };
  }, [user, teamId]);

  // Create default settings
  const createDefaultSettings = async () => {
    const defaultSettings: Omit<TeamSettings, 'id'> = {
      teamId,
      name: 'New Team',
      description: '',
      visibility: 'private',
      allowMemberInvites: true,
      requireApprovalForJoins: false,
      defaultRole: 'member',
      timezone: 'UTC',
      workingHours: {
        start: '09:00',
        end: '17:00',
        days: DEFAULT_WORKING_DAYS,
      },
      notifications: {
        email: true,
        inApp: true,
        taskUpdates: true,
        memberJoins: true,
        deadlineReminders: true,
      },
      features: {
        tasks: true,
        goals: true,
        calendar: true,
        files: true,
        chat: true,
        analytics: true,
      },
      integrations: {
        slack: false,
        googleCalendar: false,
        microsoftTeams: false,
        jira: false,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await updateDoc(doc(db, 'teamSettings', teamId), defaultSettings);
    } catch (error) {
      console.error('Error creating default settings:', error);
    }
  };

  // Save settings
  const saveSettings = async () => {
    if (!settings || !canManageSettings()) return;

    setSaving(true);

    try {
      await updateDoc(doc(db, 'teamSettings', teamId), {
        ...formData,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Settings saved",
        description: "Team settings have been updated successfully.",
      });

    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Update form field
  const updateField = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Update nested field
  const updateNestedField = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev as any)[parent],
        [field]: value,
      },
    }));
  };

  // Check if current user can manage settings
  const canManageSettings = () => {
    return currentUserRole === 'admin' || currentUserRole === 'owner';
  };

  // Handle file upload (placeholder)
  const handleFileUpload = (field: 'avatar' | 'coverImage') => {
    // In a real implementation, this would handle file upload to storage
    toast({
      title: "Feature not implemented",
      description: "File upload functionality will be added in a future update.",
    });
  };

  // Get visibility icon
  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="h-4 w-4" />;
      case 'invite-only':
        return <Shield className="h-4 w-4" />;
      default:
        return <Lock className="h-4 w-4" />;
    }
  };

  // Get visibility description
  const getVisibilityDescription = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'Anyone can find and join this team';
      case 'invite-only':
        return 'Members can only join with an invitation';
      default:
        return 'Only team members can see this team';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading team settings...</p>
        </div>
      </div>
    );
  }

  if (!settings || !canManageSettings()) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground">
            You don't have permission to manage team settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Team Settings</h2>
          <p className="text-muted-foreground">
            Configure your team's preferences and features
          </p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Information</CardTitle>
              <CardDescription>
                Basic information about your team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Team Avatar */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  {formData.avatar ? (
                    <AvatarImage src={formData.avatar} />
                  ) : (
                    <AvatarFallback className="text-lg">
                      {formData.name?.charAt(0).toUpperCase() || 'T'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" onClick={() => handleFileUpload('avatar')}>
                    <Upload className="h-4 w-4 mr-2" />
                    Change Avatar
                  </Button>
                  {formData.avatar && (
                    <Button variant="outline" size="sm" className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              {/* Team Name */}
              <div>
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  value={formData.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Enter team name"
                />
              </div>

              {/* Team Description */}
              <div>
                <Label htmlFor="teamDescription">Description</Label>
                <Textarea
                  id="teamDescription"
                  value={formData.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Describe your team..."
                  rows={3}
                />
              </div>

              {/* Timezone */}
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={formData.timezone || 'UTC'}
                  onValueChange={(value) => updateField('timezone', value)}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Working Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Working Hours</CardTitle>
              <CardDescription>
                Set your team's default working hours
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="workStart">Start Time</Label>
                  <Input
                    id="workStart"
                    type="time"
                    value={formData.workingHours?.start || '09:00'}
                    onChange={(e) => updateNestedField('workingHours', 'start', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="workEnd">End Time</Label>
                  <Input
                    id="workEnd"
                    type="time"
                    value={formData.workingHours?.end || '17:00'}
                    onChange={(e) => updateNestedField('workingHours', 'end', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Working Days</Label>
                <div className="flex gap-2 mt-2">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                    <Button
                      key={day}
                      variant={formData.workingHours?.days?.includes(day) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const currentDays = formData.workingHours?.days || [];
                        const newDays = currentDays.includes(day)
                          ? currentDays.filter(d => d !== day)
                          : [...currentDays, day];
                        updateNestedField('workingHours', 'days', newDays);
                      }}
                    >
                      {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Access</CardTitle>
              <CardDescription>
                Control who can see and join your team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Visibility */}
              <div>
                <Label className="text-base font-medium">Team Visibility</Label>
                <div className="mt-3 space-y-3">
                  {[
                    { value: 'private', label: 'Private', icon: Lock },
                    { value: 'invite-only', label: 'Invite Only', icon: Shield },
                    { value: 'public', label: 'Public', icon: Globe },
                  ].map(({ value, label, icon: Icon }) => (
                    <div
                      key={value}
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.visibility === value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => updateField('visibility', value)}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <div>
                          <div className="font-medium">{label}</div>
                          <div className="text-sm text-muted-foreground">
                            {getVisibilityDescription(value)}
                          </div>
                        </div>
                      </div>
                      {formData.visibility === value && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Member Management */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Allow Member Invites</Label>
                    <p className="text-sm text-muted-foreground">
                      Let team members invite others to join
                    </p>
                  </div>
                  <Switch
                    checked={formData.allowMemberInvites || false}
                    onCheckedChange={(checked) => updateField('allowMemberInvites', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Require Approval for Joins</Label>
                    <p className="text-sm text-muted-foreground">
                      New members need admin approval to join
                    </p>
                  </div>
                  <Switch
                    checked={formData.requireApprovalForJoins || false}
                    onCheckedChange={(checked) => updateField('requireApprovalForJoins', checked)}
                  />
                </div>
              </div>

              {/* Default Role */}
              <div>
                <Label htmlFor="defaultRole">Default Role for New Members</Label>
                <Select
                  value={formData.defaultRole || 'member'}
                  onValueChange={(value) => updateField('defaultRole', value)}
                >
                  <SelectTrigger id="defaultRole">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Settings */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Features</CardTitle>
              <CardDescription>
                Enable or disable team features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { key: 'tasks', label: 'Task Management', icon: CheckCircle, description: 'Create and manage team tasks' },
                  { key: 'goals', label: 'Goals & OKRs', icon: BarChart3, description: 'Set and track team objectives' },
                  { key: 'calendar', label: 'Team Calendar', icon: Calendar, description: 'Schedule events and meetings' },
                  { key: 'files', label: 'File Sharing', icon: FileText, description: 'Share and organize team files' },
                  { key: 'chat', label: 'Team Chat', icon: MessageSquare, description: 'Real-time messaging and channels' },
                  { key: 'analytics', label: 'Analytics & Reports', icon: BarChart3, description: 'View team performance metrics' },
                ].map(({ key, label, icon: Icon, description }) => (
                  <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{label}</div>
                        <div className="text-sm text-muted-foreground">{description}</div>
                      </div>
                    </div>
                    <Switch
                      checked={formData.features?.[key as keyof typeof formData.features] || false}
                      onCheckedChange={(checked) => updateNestedField('features', key, checked)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how and when team members receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notification Channels */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Send notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={formData.notifications?.email || false}
                    onCheckedChange={(checked) => updateNestedField('notifications', 'email', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      In-App Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Show notifications within the app
                    </p>
                  </div>
                  <Switch
                    checked={formData.notifications?.inApp || false}
                    onCheckedChange={(checked) => updateNestedField('notifications', 'inApp', checked)}
                  />
                </div>
              </div>

              {/* Notification Types */}
              <div>
                <Label className="text-base font-medium mb-4 block">Notification Types</Label>
                <div className="space-y-3">
                  {[
                    { key: 'taskUpdates', label: 'Task Updates', description: 'When tasks are created, updated, or completed' },
                    { key: 'memberJoins', label: 'Member Joins', description: 'When new members join the team' },
                    { key: 'deadlineReminders', label: 'Deadline Reminders', description: 'Reminders for upcoming deadlines' },
                  ].map(({ key, label, description }) => (
                    <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{label}</div>
                        <div className="text-sm text-muted-foreground">{description}</div>
                      </div>
                      <Switch
                        checked={formData.notifications?.[key as keyof typeof formData.notifications] || false}
                        onCheckedChange={(checked) => updateNestedField('notifications', key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Settings */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Third-Party Integrations</CardTitle>
              <CardDescription>
                Connect your team with external services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { key: 'slack', label: 'Slack', description: 'Connect with Slack for notifications and messaging' },
                  { key: 'googleCalendar', label: 'Google Calendar', description: 'Sync team events with Google Calendar' },
                  { key: 'microsoftTeams', label: 'Microsoft Teams', description: 'Integrate with Microsoft Teams' },
                  { key: 'jira', label: 'Jira', description: 'Connect with Atlassian Jira for project management' },
                ].map(({ key, label, description }) => (
                  <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{label}</div>
                      <div className="text-sm text-muted-foreground">{description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {formData.integrations?.[key as keyof typeof formData.integrations] ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Connected
                        </Badge>
                      )}
                      <Switch
                        checked={formData.integrations?.[key as keyof typeof formData.integrations] || false}
                        onCheckedChange={(checked) => updateNestedField('integrations', key, checked)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}