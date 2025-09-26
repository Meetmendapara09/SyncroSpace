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
  addDoc,
  updateDoc,
  deleteDoc,
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  Users,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Bell,
  BellOff,
  CalendarDays,
  Repeat,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Settings,
  Download,
  Upload,
  Share,
  Eye,
  EyeOff,
  Star,
  StarOff,
  Grid,
  List,
  UserPlus,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';

// Types and Interfaces
interface TeamEvent {
  id: string;
  teamId: string;
  title: string;
  description: string;
  startDate: any;
  endDate: any;
  allDay: boolean;
  location?: string;
  attendees: string[];
  organizer: string;
  type: 'meeting' | 'deadline' | 'milestone' | 'holiday' | 'training' | 'social' | 'other';
  priority: 'low' | 'medium' | 'high';
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: any;
  };
  reminders: {
    type: 'email' | 'notification';
    minutes: number;
  }[];
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility: 'public' | 'private' | 'team-only';
  createdAt: any;
  updatedAt: any;
}

interface EventResponse {
  id: string;
  eventId: string;
  userId: string;
  response: 'accepted' | 'declined' | 'tentative' | 'pending';
  respondedAt: any;
}

interface TeamCalendarProps {
  teamId: string;
}

const EVENT_TYPES = [
  { value: 'meeting', label: 'Meeting', color: 'blue' },
  { value: 'deadline', label: 'Deadline', color: 'red' },
  { value: 'milestone', label: 'Milestone', color: 'green' },
  { value: 'holiday', label: 'Holiday', color: 'purple' },
  { value: 'training', label: 'Training', color: 'orange' },
  { value: 'social', label: 'Social', color: 'pink' },
  { value: 'other', label: 'Other', color: 'gray' },
];

const EVENT_PRIORITIES = [
  { value: 'low', label: 'Low', color: 'gray' },
  { value: 'medium', label: 'Medium', color: 'yellow' },
  { value: 'high', label: 'High', color: 'red' },
];

export function TeamCalendar({ teamId }: TeamCalendarProps) {
  const [user] = useAuthState(auth);
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [responses, setResponses] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TeamEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');

  // Create event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    allDay: false,
    location: '',
    type: 'meeting',
    priority: 'medium',
    visibility: 'team-only',
    recurrence: {
      frequency: 'none' as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly',
      interval: 1,
      endDate: '',
    },
    reminders: [] as { type: 'email' | 'notification'; minutes: number }[],
  });

  useEffect(() => {
    if (!user || !teamId) return;

    setLoading(true);

    // Load team events
    const loadEvents = () => {
      const eventsQuery = query(
        collection(db, 'teamEvents'),
        where('teamId', '==', teamId),
        orderBy('startDate', 'asc')
      );

      return onSnapshot(eventsQuery, (snapshot) => {
        const eventsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TeamEvent[];

        setEvents(eventsList);
        setLoading(false);
      });
    };

    // Load event responses
    const loadResponses = () => {
      const responsesQuery = query(
        collection(db, 'eventResponses'),
        where('userId', '==', user.uid)
      );

      return onSnapshot(responsesQuery, (snapshot) => {
        const responsesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as EventResponse[];

        setResponses(responsesList);
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

    const unsubscribeEvents = loadEvents();
    const unsubscribeResponses = loadResponses();
    getCurrentUserRole();

    return () => {
      unsubscribeEvents();
      unsubscribeResponses();
    };
  }, [user, teamId]);

  // Create new event
  const createEvent = async () => {
    if (!user) return;

    try {
      const startDateTime = eventForm.allDay
        ? new Date(eventForm.startDate)
        : new Date(`${eventForm.startDate}T${eventForm.startTime}`);

      const endDateTime = eventForm.allDay
        ? new Date(eventForm.endDate)
        : new Date(`${eventForm.endDate}T${eventForm.endTime}`);

      const eventData = {
        teamId,
        title: eventForm.title.trim(),
        description: eventForm.description.trim(),
        startDate: startDateTime,
        endDate: endDateTime,
        allDay: eventForm.allDay,
        location: eventForm.location.trim() || null,
        attendees: [], // Will be populated when inviting attendees
        organizer: user.uid,
        type: eventForm.type,
        priority: eventForm.priority,
        recurrence: eventForm.recurrence.frequency !== 'none' ? {
          frequency: eventForm.recurrence.frequency,
          interval: eventForm.recurrence.interval,
          endDate: eventForm.recurrence.endDate ? new Date(eventForm.recurrence.endDate) : null,
        } : null,
        reminders: eventForm.reminders,
        status: 'confirmed',
        visibility: eventForm.visibility,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'teamEvents'), eventData);

      setShowCreateEvent(false);
      resetEventForm();

      toast({
        title: "Event created",
        description: `Event "${eventForm.title}" has been created.`,
      });

    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event.",
        variant: "destructive"
      });
    }
  };

  // Update event
  const updateEvent = async (eventId: string, updates: Partial<TeamEvent>) => {
    if (!canManageEvents()) return;

    try {
      await updateDoc(doc(db, 'teamEvents', eventId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Event updated",
        description: "Event has been updated successfully.",
      });

    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Error",
        description: "Failed to update event.",
        variant: "destructive"
      });
    }
  };

  // Delete event
  const deleteEvent = async (eventId: string) => {
    if (!canManageEvents()) return;

    try {
      await deleteDoc(doc(db, 'teamEvents', eventId));

      toast({
        title: "Event deleted",
        description: "Event has been deleted.",
      });

    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event.",
        variant: "destructive"
      });
    }
  };

  // Respond to event invitation
  const respondToEvent = async (eventId: string, response: 'accepted' | 'declined' | 'tentative') => {
    if (!user) return;

    try {
      const existingResponse = responses.find(r => r.eventId === eventId);

      if (existingResponse) {
        await updateDoc(doc(db, 'eventResponses', existingResponse.id), {
          response,
          respondedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'eventResponses'), {
          eventId,
          userId: user.uid,
          response,
          respondedAt: serverTimestamp(),
        });
      }

      toast({
        title: "Response recorded",
        description: `You have ${response} this event.`,
      });

    } catch (error) {
      console.error('Error responding to event:', error);
      toast({
        title: "Error",
        description: "Failed to record response.",
        variant: "destructive"
      });
    }
  };

  // Check if current user can manage events
  const canManageEvents = () => {
    return currentUserRole === 'admin' || currentUserRole === 'owner' || currentUserRole === 'moderator';
  };

  // Reset event form
  const resetEventForm = () => {
    setEventForm({
      title: '',
      description: '',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      allDay: false,
      location: '',
      type: 'meeting',
      priority: 'medium',
      visibility: 'team-only',
      recurrence: {
        frequency: 'none',
        interval: 1,
        endDate: '',
      },
      reminders: [],
    });
  };

  // Get events for current view
  const getEventsForView = () => {
    let start: Date, end: Date;

    switch (view) {
      case 'month':
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        break;
      case 'week':
        start = startOfWeek(currentDate);
        end = endOfWeek(currentDate);
        break;
      case 'day':
        start = currentDate;
        end = currentDate;
        break;
      default:
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
    }

    return events.filter(event => {
      const eventStart = new Date(event.startDate.seconds * 1000);
      const eventEnd = new Date(event.endDate.seconds * 1000);

      // Check if event overlaps with current view
      return eventStart <= end && eventEnd >= start;
    }).filter(event => {
      // Apply filters
      const matchesSearch = !searchQuery ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = filterType === 'all' || event.type === filterType;

      return matchesSearch && matchesType;
    });
  };

  // Get event type color
  const getEventTypeColor = (type: string) => {
    const eventType = EVENT_TYPES.find(t => t.value === type);
    return eventType?.color || 'gray';
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    const priorityType = EVENT_PRIORITIES.find(p => p.value === priority);
    return priorityType?.color || 'gray';
  };

  // Get user's response to event
  const getUserResponse = (eventId: string) => {
    return responses.find(r => r.eventId === eventId)?.response || 'pending';
  };

  // Format event time
  const formatEventTime = (event: TeamEvent) => {
    if (event.allDay) return 'All day';

    const start = new Date(event.startDate.seconds * 1000);
    const end = new Date(event.endDate.seconds * 1000);

    const startTime = format(start, 'HH:mm');
    const endTime = format(end, 'HH:mm');

    if (isSameDay(start, end)) {
      return `${startTime} - ${endTime}`;
    } else {
      return `${format(start, 'MMM dd HH:mm')} - ${format(end, 'MMM dd HH:mm')}`;
    }
  };

  // Navigate calendar
  const navigateCalendar = (direction: 'prev' | 'next' | 'today') => {
    switch (direction) {
      case 'prev':
        setCurrentDate(prev => view === 'month' ? subMonths(prev, 1) : new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000));
        break;
      case 'next':
        setCurrentDate(prev => view === 'month' ? addMonths(prev, 1) : new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000));
        break;
      case 'today':
        setCurrentDate(new Date());
        break;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading team calendar...</p>
        </div>
      </div>
    );
  }

  const eventsForView = getEventsForView();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Team Calendar</h2>
          <p className="text-muted-foreground">
            Schedule and manage team events
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigateCalendar('today')}
          >
            <CalendarDays className="h-4 w-4 mr-2" />
            Today
          </Button>
          <Button
            onClick={() => setShowCreateEvent(true)}
            disabled={!canManageEvents()}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      {/* Calendar Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigateCalendar('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <h3 className="text-lg font-semibold">
                {format(currentDate, view === 'month' ? 'MMMM yyyy' : view === 'week' ? "'Week of' MMM dd" : 'MMM dd, yyyy')}
              </h3>

              <Button variant="outline" size="sm" onClick={() => navigateCalendar('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Tabs value={view} onValueChange={(value) => setView(value as 'month' | 'week' | 'day')}>
                <TabsList>
                  <TabsTrigger value="month">Month</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="day">Day</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center font-medium text-sm text-muted-foreground border-b">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {view === 'month' && (
              <>
                {eachDayOfInterval({
                  start: startOfWeek(startOfMonth(currentDate)),
                  end: endOfWeek(endOfMonth(currentDate))
                }).map((date) => {
                  const dayEvents = eventsForView.filter(event => {
                    const eventDate = new Date(event.startDate.seconds * 1000);
                    return isSameDay(eventDate, date);
                  });

                  const isCurrentMonth = isSameMonth(date, currentDate);
                  const isToday = isSameDay(date, new Date());

                  return (
                    <div
                      key={date.toISOString()}
                      className={`min-h-[120px] p-2 border cursor-pointer hover:bg-muted/50 ${
                        !isCurrentMonth ? 'text-muted-foreground bg-muted/20' : ''
                      } ${isToday ? 'bg-primary/10 border-primary' : ''}`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <div className="text-sm font-medium mb-1">
                        {format(date, 'd')}
                      </div>

                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className={`text-xs p-1 rounded bg-${getEventTypeColor(event.type)}-100 text-${getEventTypeColor(event.type)}-800 truncate`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                              setShowEventDetails(true);
                            }}
                          >
                            {event.allDay ? '●' : '○'} {event.title}
                          </div>
                        ))}

                        {dayEvents.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
          <CardDescription>
            {eventsForView.length} event{eventsForView.length !== 1 ? 's' : ''} in current view
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eventsForView.length > 0 ? (
            <div className="space-y-2">
              {eventsForView.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => {
                    setSelectedEvent(event);
                    setShowEventDetails(true);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full bg-${getEventTypeColor(event.type)}-500`} />

                    <div className="flex-1">
                      <h3 className="font-medium">{event.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          <span>{format(new Date(event.startDate.seconds * 1000), 'MMM dd')}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{formatEventTime(event)}</span>
                        </div>

                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={`bg-${getEventTypeColor(event.type)}-100 text-${getEventTypeColor(event.type)}-800`}>
                      {EVENT_TYPES.find(t => t.value === event.type)?.label}
                    </Badge>

                    <Badge className={`bg-${getPriorityColor(event.priority)}-100 text-${getPriorityColor(event.priority)}-800`}>
                      {event.priority}
                    </Badge>

                    {event.attendees.length > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>{event.attendees.length}</span>
                      </div>
                    )}

                    {canManageEvents() && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Event
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteEvent(event.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Event
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CalendarIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No events found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterType !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No events scheduled for this period'}
              </p>
              {canManageEvents() && (
                <Button onClick={() => setShowCreateEvent(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Event
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Event Dialog */}
      <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <Label htmlFor="eventTitle">Event Title</Label>
                <Input
                  id="eventTitle"
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter event title"
                />
              </div>

              <div>
                <Label htmlFor="eventDescription">Description</Label>
                <textarea
                  id="eventDescription"
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the event..."
                  className="w-full min-h-[80px] px-3 py-2 text-sm border border-input bg-background rounded-md resize-none"
                />
              </div>

              {/* Date and Time */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allDay"
                    checked={eventForm.allDay}
                    onChange={(e) => setEventForm(prev => ({ ...prev, allDay: e.target.checked }))}
                  />
                  <Label htmlFor="allDay">All day event</Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={eventForm.startDate}
                      onChange={(e) => setEventForm(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>

                  {!eventForm.allDay && (
                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={eventForm.startTime}
                        onChange={(e) => setEventForm(prev => ({ ...prev, startTime: e.target.value }))}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={eventForm.endDate}
                      onChange={(e) => setEventForm(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>

                  {!eventForm.allDay && (
                    <div>
                      <Label htmlFor="endTime">End Time</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={eventForm.endTime}
                        onChange={(e) => setEventForm(prev => ({ ...prev, endTime: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Location and Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="eventLocation">Location (optional)</Label>
                  <Input
                    id="eventLocation"
                    value={eventForm.location}
                    onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., Conference Room A"
                  />
                </div>

                <div>
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select
                    value={eventForm.type}
                    onValueChange={(value) => setEventForm(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger id="eventType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Priority and Visibility */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="eventPriority">Priority</Label>
                  <Select
                    value={eventForm.priority}
                    onValueChange={(value) => setEventForm(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger id="eventPriority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_PRIORITIES.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="eventVisibility">Visibility</Label>
                  <Select
                    value={eventForm.visibility}
                    onValueChange={(value) => setEventForm(prev => ({ ...prev, visibility: value }))}
                  >
                    <SelectTrigger id="eventVisibility">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="team-only">Team Only</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setShowCreateEvent(false);
              resetEventForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={createEvent}
              disabled={!eventForm.title.trim() || !eventForm.startDate || !eventForm.endDate}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Details Dialog */}
      <Dialog open={showEventDetails} onOpenChange={setShowEventDetails}>
        {selectedEvent && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedEvent.title}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Event Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(new Date(selectedEvent.startDate.seconds * 1000), 'MMM dd, yyyy')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{formatEventTime(selectedEvent)}</span>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedEvent.location}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedEvent.attendees.length} attendees</span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex gap-2">
                <Badge className={`bg-${getEventTypeColor(selectedEvent.type)}-100 text-${getEventTypeColor(selectedEvent.type)}-800`}>
                  {EVENT_TYPES.find(t => t.value === selectedEvent.type)?.label}
                </Badge>
                <Badge className={`bg-${getPriorityColor(selectedEvent.priority)}-100 text-${getPriorityColor(selectedEvent.priority)}-800`}>
                  {selectedEvent.priority} priority
                </Badge>
              </div>

              {/* Description */}
              {selectedEvent.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                </div>
              )}

              {/* Response Actions */}
              <div>
                <h4 className="font-medium mb-3">Your Response</h4>
                <div className="flex gap-2">
                  {[
                    { value: 'accepted', label: 'Accept', icon: CheckCircle },
                    { value: 'tentative', label: 'Maybe', icon: Clock },
                    { value: 'declined', label: 'Decline', icon: XCircle },
                  ].map(({ value, label, icon: Icon }) => (
                    <Button
                      key={value}
                      variant={getUserResponse(selectedEvent.id) === value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => respondToEvent(selectedEvent.id, value as any)}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowEventDetails(false);
                setSelectedEvent(null);
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