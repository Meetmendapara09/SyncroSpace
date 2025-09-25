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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar as CalendarIcon,
  Clock,
  Users,
  Video,
  Phone,
  MapPin,
  Link,
  Bell,
  Repeat,
  Plus,
  Edit,
  Trash2,
  Copy,
  Share,
  Download,
  Upload,
  Search,
  Filter,
  Settings,
  Play,
  Pause,
  Square,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  ScreenShare,
  MessageSquare,
  Hand,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Check,
  AlertCircle,
  Mail,
  Globe
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// Types and Interfaces
interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: any;
  endTime: any;
  timezone: string;
  type: 'video' | 'audio' | 'in-person';
  location?: string;
  meetingLink?: string;
  teamId?: string;
  spaceId?: string;
  channelId?: string;
  organizer: {
    uid: string;
    name: string;
    email: string;
    avatar?: string;
  };
  attendees: MeetingAttendee[];
  recurrence?: MeetingRecurrence;
  reminders: MeetingReminder[];
  agenda: MeetingAgendaItem[];
  recordings: MeetingRecording[];
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  privacy: 'public' | 'private' | 'team';
  maxAttendees?: number;
  requireApproval: boolean;
  allowRecording: boolean;
  allowChat: boolean;
  createdAt: any;
  updatedAt: any;
  tags: string[];
  importance: 'low' | 'medium' | 'high' | 'urgent';
}

interface MeetingAttendee {
  uid: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'invited' | 'accepted' | 'declined' | 'maybe' | 'no-response';
  role: 'organizer' | 'presenter' | 'attendee';
  joinedAt?: any;
  leftAt?: any;
  duration?: number;
}

interface MeetingRecurrence {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // every X days/weeks/months/years
  daysOfWeek?: number[]; // for weekly recurrence (0 = Sunday)
  dayOfMonth?: number; // for monthly recurrence
  endType: 'never' | 'count' | 'date';
  endCount?: number;
  endDate?: any;
  exceptions?: any[]; // dates to exclude
}

interface MeetingReminder {
  id: string;
  type: 'email' | 'notification' | 'sms';
  minutesBefore: number;
  sent: boolean;
}

interface MeetingAgendaItem {
  id: string;
  title: string;
  description?: string;
  duration: number; // in minutes
  presenter?: string;
  completed: boolean;
  order: number;
}

interface MeetingRecording {
  id: string;
  title: string;
  url: string;
  duration: number;
  size: number;
  createdAt: any;
  thumbnailUrl?: string;
  transcription?: string;
  highlights?: string[];
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'meeting' | 'reminder' | 'deadline' | 'holiday';
  meeting?: Meeting;
  color: string;
  allDay: boolean;
}

const TIMEZONE_OPTIONS = [
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
  'Asia/Kolkata'
];

const REMINDER_OPTIONS = [
  { label: '5 minutes before', value: 5 },
  { label: '10 minutes before', value: 10 },
  { label: '15 minutes before', value: 15 },
  { label: '30 minutes before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '2 hours before', value: 120 },
  { label: '1 day before', value: 1440 },
  { label: '1 week before', value: 10080 }
];

interface CalendarMeetingSystemProps {
  teamId?: string;
  spaceId?: string;
  channelId?: string;
}

export function CalendarMeetingSystem({ teamId, spaceId, channelId }: CalendarMeetingSystemProps) {
  const [user] = useAuthState(auth);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [showMeetingDetails, setShowMeetingDetails] = useState<Meeting | null>(null);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Create meeting form state
  const [newMeeting, setNewMeeting] = useState<Partial<Meeting>>({
    title: '',
    description: '',
    startTime: null,
    endTime: null,
    timezone: 'UTC',
    type: 'video',
    location: '',
    attendees: [],
    reminders: [{ id: uuidv4(), type: 'notification', minutesBefore: 15, sent: false }],
    agenda: [],
    privacy: 'team',
    requireApproval: false,
    allowRecording: true,
    allowChat: true,
    importance: 'medium',
    tags: []
  });

  // Agenda item form
  const [newAgendaItem, setNewAgendaItem] = useState({
    title: '',
    description: '',
    duration: 15,
    presenter: ''
  });

  useEffect(() => {
    if (!user) return;

    // Load meetings
    let meetingsQuery = query(
      collection(db, 'meetings'),
      orderBy('startTime', 'asc')
    );

    if (teamId) {
      meetingsQuery = query(
        collection(db, 'meetings'),
        where('teamId', '==', teamId),
        orderBy('startTime', 'asc')
      );
    }

    const unsubscribeMeetings = onSnapshot(meetingsQuery, (snapshot) => {
      const meetingList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Meeting[];
      
      setMeetings(meetingList);
      
      // Convert meetings to calendar events
      const calendarEvents: CalendarEvent[] = meetingList.map(meeting => ({
        id: meeting.id,
        title: meeting.title,
        start: meeting.startTime?.toDate ? meeting.startTime.toDate() : new Date(meeting.startTime),
        end: meeting.endTime?.toDate ? meeting.endTime.toDate() : new Date(meeting.endTime),
        type: 'meeting',
        meeting,
        color: getEventColor(meeting.type, meeting.importance),
        allDay: false
      }));
      
      setEvents(calendarEvents);
      setLoading(false);
    });

    return () => unsubscribeMeetings();
  }, [user, teamId]);

  // Create new meeting
  const createMeeting = async () => {
    if (!user || !newMeeting.title || !newMeeting.startTime || !newMeeting.endTime) return;

    try {
      const meetingData: Partial<Meeting> = {
        ...newMeeting,
        id: uuidv4(),
        organizer: {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email!,
          avatar: user.photoURL
        },
        attendees: [
          {
            uid: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'User',
            email: user.email!,
            avatar: user.photoURL,
            status: 'accepted',
            role: 'organizer'
          },
          ...(newMeeting.attendees || [])
        ],
        status: 'scheduled',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(teamId && { teamId }),
        ...(spaceId && { spaceId }),
        ...(channelId && { channelId })
      };

      await addDoc(collection(db, 'meetings'), meetingData);

      // Send invitations
      await sendMeetingInvitations(meetingData as Meeting);

      setShowCreateMeeting(false);
      resetMeetingForm();

      toast({
        title: "Meeting created",
        description: `"${newMeeting.title}" has been scheduled.`,
      });

    } catch (error) {
      console.error('Error creating meeting:', error);
      toast({
        title: "Error",
        description: "Failed to create meeting. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Send meeting invitations
  const sendMeetingInvitations = async (meeting: Meeting) => {
    try {
      for (const attendee of meeting.attendees) {
        if (attendee.uid !== user?.uid) {
          await addDoc(collection(db, 'notifications'), {
            type: 'meeting-invitation',
            meetingId: meeting.id,
            meetingTitle: meeting.title,
            startTime: meeting.startTime,
            from: {
              uid: user!.uid,
              name: user!.displayName || user!.email!.split('@')[0],
              email: user!.email
            },
            to: attendee.uid,
            createdAt: serverTimestamp(),
            read: false
          });
        }
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
    }
  };

  // Join meeting
  const joinMeeting = async (meeting: Meeting) => {
    if (!user) return;

    try {
      // Update attendee status
      const updatedAttendees = meeting.attendees.map(attendee =>
        attendee.uid === user.uid
          ? { ...attendee, joinedAt: serverTimestamp(), status: 'accepted' as const }
          : attendee
      );

      await updateDoc(doc(db, 'meetings', meeting.id), {
        attendees: updatedAttendees,
        status: 'ongoing',
        updatedAt: serverTimestamp()
      });

      setActiveMeeting(meeting);

      toast({
        title: "Joined meeting",
        description: `You have joined "${meeting.title}".`,
      });

    } catch (error) {
      console.error('Error joining meeting:', error);
      toast({
        title: "Error",
        description: "Failed to join meeting.",
        variant: "destructive"
      });
    }
  };

  // Leave meeting
  const leaveMeeting = async (meeting: Meeting) => {
    if (!user) return;

    try {
      const updatedAttendees = meeting.attendees.map(attendee =>
        attendee.uid === user.uid
          ? { ...attendee, leftAt: serverTimestamp() }
          : attendee
      );

      await updateDoc(doc(db, 'meetings', meeting.id), {
        attendees: updatedAttendees,
        updatedAt: serverTimestamp()
      });

      setActiveMeeting(null);

      toast({
        title: "Left meeting",
        description: `You have left "${meeting.title}".`,
      });

    } catch (error) {
      console.error('Error leaving meeting:', error);
    }
  };

  // Update meeting status
  const updateMeetingStatus = async (meetingId: string, status: Meeting['status']) => {
    try {
      await updateDoc(doc(db, 'meetings', meetingId), {
        status,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Meeting updated",
        description: `Meeting status changed to ${status}.`,
      });

    } catch (error) {
      console.error('Error updating meeting:', error);
      toast({
        title: "Error",
        description: "Failed to update meeting status.",
        variant: "destructive"
      });
    }
  };

  // Delete meeting
  const deleteMeeting = async (meetingId: string) => {
    try {
      await deleteDoc(doc(db, 'meetings', meetingId));

      toast({
        title: "Meeting deleted",
        description: "Meeting has been permanently deleted.",
      });

    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast({
        title: "Error",
        description: "Failed to delete meeting.",
        variant: "destructive"
      });
    }
  };

  // Add agenda item
  const addAgendaItem = () => {
    if (!newAgendaItem.title.trim()) return;

    const agendaItem: MeetingAgendaItem = {
      id: uuidv4(),
      ...newAgendaItem,
      completed: false,
      order: (newMeeting.agenda?.length || 0) + 1
    };

    setNewMeeting(prev => ({
      ...prev,
      agenda: [...(prev.agenda || []), agendaItem]
    }));

    setNewAgendaItem({
      title: '',
      description: '',
      duration: 15,
      presenter: ''
    });
  };

  // Reset meeting form
  const resetMeetingForm = () => {
    setNewMeeting({
      title: '',
      description: '',
      startTime: null,
      endTime: null,
      timezone: 'UTC',
      type: 'video',
      location: '',
      attendees: [],
      reminders: [{ id: uuidv4(), type: 'notification', minutesBefore: 15, sent: false }],
      agenda: [],
      privacy: 'team',
      requireApproval: false,
      allowRecording: true,
      allowChat: true,
      importance: 'medium',
      tags: []
    });
  };

  // Get event color based on type and importance
  const getEventColor = (type: Meeting['type'], importance: Meeting['importance']) => {
    const baseColors = {
      video: '#3B82F6',
      audio: '#10B981',
      'in-person': '#F59E0B'
    };

    const importanceMultiplier = {
      low: 0.6,
      medium: 0.8,
      high: 1.0,
      urgent: 1.2
    };

    return baseColors[type] + Math.floor(255 * importanceMultiplier[importance]).toString(16);
  };

  // Get meetings for selected date
  const getMeetingsForDate = (date: Date) => {
    return meetings.filter(meeting => {
      const meetingDate = meeting.startTime?.toDate ? meeting.startTime.toDate() : new Date(meeting.startTime);
      return isSameDay(meetingDate, date);
    });
  };

  // Filter meetings based on search and status
  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = !searchQuery || 
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || meeting.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Calendar & Meetings</h1>
          
          {/* View Mode Selector */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
            <TabsList>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="agenda">Agenda</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Meetings</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => setShowCreateMeeting(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Meeting
          </Button>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Calendar View */}
        <div className="flex-1 p-4">
          {viewMode === 'month' && (
            <div className="space-y-4">
              {/* Month Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold">
                  {format(selectedDate, 'MMMM yyyy')}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Calendar Component */}
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </div>
          )}

          {viewMode === 'agenda' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Upcoming Meetings</h2>
              <div className="space-y-2">
                {filteredMeetings
                  .filter(meeting => new Date(meeting.startTime?.toDate ? meeting.startTime.toDate() : meeting.startTime) >= new Date())
                  .slice(0, 10)
                  .map((meeting) => (
                    <Card key={meeting.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4" onClick={() => setShowMeetingDetails(meeting)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getEventColor(meeting.type, meeting.importance) }}
                            />
                            <div>
                              <h3 className="font-semibold">{meeting.title}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {format(meeting.startTime?.toDate ? meeting.startTime.toDate() : new Date(meeting.startTime), 'MMM d, h:mm a')}
                                  {' - '}
                                  {format(meeting.endTime?.toDate ? meeting.endTime.toDate() : new Date(meeting.endTime), 'h:mm a')}
                                </span>
                                <Users className="h-4 w-4 ml-2" />
                                <span>{meeting.attendees.length} attendees</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              meeting.status === 'scheduled' ? 'default' :
                              meeting.status === 'ongoing' ? 'destructive' :
                              meeting.status === 'completed' ? 'secondary' : 'outline'
                            }>
                              {meeting.status}
                            </Badge>
                            {meeting.type === 'video' && <Video className="h-4 w-4" />}
                            {meeting.type === 'audio' && <Phone className="h-4 w-4" />}
                            {meeting.type === 'in-person' && <MapPin className="h-4 w-4" />}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Today's Meetings Sidebar */}
        <div className="w-80 border-l p-4">
          <div className="space-y-4">
            <h3 className="font-semibold">
              {format(selectedDate, 'EEEE, MMMM d')}
            </h3>
            
            <div className="space-y-2">
              {getMeetingsForDate(selectedDate).map((meeting) => (
                <Card key={meeting.id} className="cursor-pointer hover:shadow-sm transition-shadow">
                  <CardContent className="p-3" onClick={() => setShowMeetingDetails(meeting)}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{meeting.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {meeting.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {format(meeting.startTime?.toDate ? meeting.startTime.toDate() : new Date(meeting.startTime), 'h:mm a')}
                          {' - '}
                          {format(meeting.endTime?.toDate ? meeting.endTime.toDate() : new Date(meeting.endTime), 'h:mm a')}
                        </span>
                      </div>
                      {meeting.status === 'ongoing' && (
                        <Button size="sm" className="w-full" onClick={(e) => {
                          e.stopPropagation();
                          joinMeeting(meeting);
                        }}>
                          <Video className="h-3 w-3 mr-1" />
                          Join Meeting
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {getMeetingsForDate(selectedDate).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No meetings scheduled for this day
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Meeting Dialog */}
      <Dialog open={showCreateMeeting} onOpenChange={setShowCreateMeeting}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule New Meeting</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="meetingTitle">Meeting Title</Label>
                <Input
                  id="meetingTitle"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter meeting title"
                />
              </div>

              <div>
                <Label htmlFor="meetingDescription">Description</Label>
                <Textarea
                  id="meetingDescription"
                  value={newMeeting.description}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Meeting description (optional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={newMeeting.startTime ? format(new Date(newMeeting.startTime), "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, startTime: new Date(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>End Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={newMeeting.endTime ? format(new Date(newMeeting.endTime), "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, endTime: new Date(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Meeting Type</Label>
                  <Select
                    value={newMeeting.type}
                    onValueChange={(value) => setNewMeeting(prev => ({ ...prev, type: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video Call</SelectItem>
                      <SelectItem value="audio">Audio Call</SelectItem>
                      <SelectItem value="in-person">In-Person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Timezone</Label>
                  <Select
                    value={newMeeting.timezone}
                    onValueChange={(value) => setNewMeeting(prev => ({ ...prev, timezone: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newMeeting.type === 'in-person' && (
                <div>
                  <Label htmlFor="meetingLocation">Location</Label>
                  <Input
                    id="meetingLocation"
                    value={newMeeting.location}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Meeting location"
                  />
                </div>
              )}
            </div>

            {/* Agenda */}
            <div className="space-y-4">
              <Label>Agenda</Label>
              <div className="space-y-2">
                {newMeeting.agenda?.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <span className="text-sm font-medium">{index + 1}.</span>
                    <span className="flex-1 text-sm">{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.duration}m</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewMeeting(prev => ({
                        ...prev,
                        agenda: prev.agenda?.filter(a => a.id !== item.id)
                      }))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Agenda item title"
                  value={newAgendaItem.title}
                  onChange={(e) => setNewAgendaItem(prev => ({ ...prev, title: e.target.value }))}
                />
                <Input
                  type="number"
                  placeholder="Duration (min)"
                  value={newAgendaItem.duration}
                  onChange={(e) => setNewAgendaItem(prev => ({ ...prev, duration: parseInt(e.target.value) || 15 }))}
                  className="w-32"
                />
                <Button onClick={addAgendaItem} disabled={!newAgendaItem.title.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <Label>Meeting Settings</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Allow Recording</Label>
                  <Switch
                    checked={newMeeting.allowRecording}
                    onCheckedChange={(checked) => setNewMeeting(prev => ({ ...prev, allowRecording: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Allow Chat</Label>
                  <Switch
                    checked={newMeeting.allowChat}
                    onCheckedChange={(checked) => setNewMeeting(prev => ({ ...prev, allowChat: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Require Approval to Join</Label>
                  <Switch
                    checked={newMeeting.requireApproval}
                    onCheckedChange={(checked) => setNewMeeting(prev => ({ ...prev, requireApproval: checked }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateMeeting(false)}>
                Cancel
              </Button>
              <Button onClick={createMeeting} disabled={!newMeeting.title || !newMeeting.startTime || !newMeeting.endTime}>
                Schedule Meeting
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meeting Details Dialog */}
      {showMeetingDetails && (
        <Dialog open={!!showMeetingDetails} onOpenChange={() => setShowMeetingDetails(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{showMeetingDetails.title}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">
                    {format(showMeetingDetails.startTime?.toDate ? showMeetingDetails.startTime.toDate() : new Date(showMeetingDetails.startTime), 'MMM d, yyyy h:mm a')}
                    {' - '}
                    {format(showMeetingDetails.endTime?.toDate ? showMeetingDetails.endTime.toDate() : new Date(showMeetingDetails.endTime), 'h:mm a')}
                  </span>
                </div>
                <Badge variant={
                  showMeetingDetails.status === 'scheduled' ? 'default' :
                  showMeetingDetails.status === 'ongoing' ? 'destructive' :
                  showMeetingDetails.status === 'completed' ? 'secondary' : 'outline'
                }>
                  {showMeetingDetails.status}
                </Badge>
              </div>

              {showMeetingDetails.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground mt-1">{showMeetingDetails.description}</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Attendees ({showMeetingDetails.attendees.length})</Label>
                <div className="mt-2 space-y-2">
                  {showMeetingDetails.attendees.map((attendee) => (
                    <div key={attendee.uid} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={attendee.avatar} />
                          <AvatarFallback>{attendee.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{attendee.name}</span>
                        {attendee.role === 'organizer' && (
                          <Badge variant="outline" className="text-xs">Organizer</Badge>
                        )}
                      </div>
                      <Badge variant={
                        attendee.status === 'accepted' ? 'default' :
                        attendee.status === 'declined' ? 'destructive' :
                        attendee.status === 'maybe' ? 'secondary' : 'outline'
                      } className="text-xs">
                        {attendee.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {showMeetingDetails.agenda.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Agenda</Label>
                  <div className="mt-2 space-y-2">
                    {showMeetingDetails.agenda.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{index + 1}.</span>
                        <span className="flex-1">{item.title}</span>
                        <span className="text-muted-foreground">{item.duration}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {showMeetingDetails.status === 'scheduled' && (
                  <Button onClick={() => joinMeeting(showMeetingDetails)}>
                    <Video className="h-4 w-4 mr-2" />
                    Join Meeting
                  </Button>
                )}
                
                {showMeetingDetails.status === 'ongoing' && activeMeeting?.id === showMeetingDetails.id && (
                  <Button variant="destructive" onClick={() => leaveMeeting(showMeetingDetails)}>
                    <Square className="h-4 w-4 mr-2" />
                    Leave Meeting
                  </Button>
                )}

                {showMeetingDetails.organizer.uid === user?.uid && (
                  <>
                    <Button variant="outline" onClick={() => updateMeetingStatus(showMeetingDetails.id, 'cancelled')}>
                      Cancel Meeting
                    </Button>
                    <Button variant="destructive" onClick={() => deleteMeeting(showMeetingDetails.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}