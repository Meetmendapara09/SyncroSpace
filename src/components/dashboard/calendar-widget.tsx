'use client';

import * as React from 'react';
import { Widget } from '@/components/dashboard/widget';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar as CalendarIcon, Clock, MapPin, Users, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, isThisWeek, addDays } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';

interface CalendarWidgetProps {
  id: string;
  size: 'small' | 'medium' | 'large' | 'full';
  title: string;
  isEditing: boolean;
  isMoving: boolean;
  onRemove: (id: string) => void;
  onSizeChange?: (id: string, size: string) => void;
}

interface Meeting {
  id: string;
  title: string;
  startTime: Timestamp;
  endTime: Timestamp;
  location?: string;
  isVirtual?: boolean;
  description?: string;
  attendees?: string[];
  organizer?: string;
}

export function CalendarEventsWidget({
  id,
  size,
  title,
  isEditing,
  isMoving,
  onRemove,
  onSizeChange,
}: CalendarWidgetProps) {
  const [user] = useAuthState(auth);
  const [view, setView] = React.useState<'list' | 'calendar'>('list');
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  
  // Current date at midnight
  const today = React.useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  
  // End of next week
  const endOfNextWeek = React.useMemo(() => {
    return addDays(today, 14);
  }, [today]);
  
  // Query for meetings
  const meetingsQuery = user ? 
    query(
      collection(db, 'meetings'),
      where('attendees', 'array-contains', user.uid),
      where('startTime', '>=', Timestamp.fromDate(today)),
      where('startTime', '<=', Timestamp.fromDate(endOfNextWeek)),
      orderBy('startTime'),
      limit(20)
    ) : null;
    
  const [snapshot, loading, error] = useCollection(meetingsQuery);

  // Extract meetings
  const meetings = React.useMemo(() => {
    if (!snapshot) return [];
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Meeting[];
  }, [snapshot]);

  // Filter meetings for today and upcoming
  const todayMeetings = React.useMemo(() => {
    return meetings.filter(meeting => 
      isToday(meeting.startTime.toDate())
    );
  }, [meetings]);

  const upcomingMeetings = React.useMemo(() => {
    return meetings.filter(meeting => 
      !isToday(meeting.startTime.toDate())
    );
  }, [meetings]);

  // Group meetings by date for calendar view
  const meetingsByDate = React.useMemo(() => {
    const grouped: Record<string, Meeting[]> = {};
    
    meetings.forEach(meeting => {
      const dateStr = format(meeting.startTime.toDate(), 'yyyy-MM-dd');
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(meeting);
    });
    
    return grouped;
  }, [meetings]);

  // Days with meetings for calendar highlighting
  const daysWithMeetings = React.useMemo(() => {
    return Object.keys(meetingsByDate).map(dateStr => new Date(dateStr));
  }, [meetingsByDate]);

  // Format time
  const formatMeetingTime = (meeting: Meeting) => {
    const start = format(meeting.startTime.toDate(), 'h:mm a');
    const end = format(meeting.endTime.toDate(), 'h:mm a');
    return `${start} - ${end}`;
  };

  // Format date heading
  const formatDateHeading = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isThisWeek(date)) return format(date, 'EEEE'); // Day name
    return format(date, 'MMMM d'); // Month day
  };

  return (
    <Widget
      id={id}
      type="calendar"
      title={title}
      size={size}
      isEditing={isEditing}
      isMoving={isMoving}
      onRemove={onRemove}
      onSizeChange={onSizeChange}
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Badge 
            variant={view === 'list' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setView('list')}
          >
            List
          </Badge>
          <Badge 
            variant={view === 'calendar' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setView('calendar')}
          >
            Calendar
          </Badge>
        </div>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-5 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center text-destructive">
          <p>Error loading calendar events</p>
        </div>
      ) : (
        <>
          {view === 'list' ? (
            <div className="space-y-6">
              {/* Today's meetings */}
              {todayMeetings.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 text-primary">Today</h3>
                  <div className="space-y-2">
                    {todayMeetings.map((meeting) => (
                      <div key={meeting.id} className="border rounded-lg p-3 shadow-sm">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium">{meeting.title}</h4>
                          {meeting.isVirtual && (
                            <Badge variant="outline" className="border-blue-400 text-blue-500 bg-blue-50">
                              <Video className="h-3 w-3 mr-1" />
                              Virtual
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-1 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatMeetingTime(meeting)}
                          </div>
                          
                          {meeting.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {meeting.location}
                            </div>
                          )}
                          
                          {meeting.attendees && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {meeting.attendees.length} attendees
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Upcoming meetings */}
              {upcomingMeetings.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Upcoming</h3>
                  <div className="space-y-2">
                    {upcomingMeetings.slice(0, 5).map((meeting) => (
                      <div key={meeting.id} className="border rounded-lg p-3 shadow-sm">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium">{meeting.title}</h4>
                          {meeting.isVirtual && (
                            <Badge variant="outline" className="border-blue-400 text-blue-500 bg-blue-50">
                              <Video className="h-3 w-3 mr-1" />
                              Virtual
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-1 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {formatDateHeading(meeting.startTime.toDate())}
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatMeetingTime(meeting)}
                          </div>
                          
                          {meeting.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {meeting.location}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {upcomingMeetings.length > 5 && (
                      <div className="text-center text-sm text-muted-foreground pt-2">
                        +{upcomingMeetings.length - 5} more upcoming meetings
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {meetings.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-6">
                  <CalendarIcon className="h-10 w-10 text-primary/50 mb-2" />
                  <p className="text-center text-muted-foreground">No upcoming meetings</p>
                  <p className="text-center text-xs text-muted-foreground">
                    Your calendar is clear for the next two weeks
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border shadow-sm"
                modifiers={{
                  hasMeeting: (date) => 
                    daysWithMeetings.some(d => 
                      d.getDate() === date.getDate() && 
                      d.getMonth() === date.getMonth() && 
                      d.getFullYear() === date.getFullYear()
                    )
                }}
                modifiersClassNames={{
                  hasMeeting: "bg-primary/10 font-medium text-primary"
                }}
              />
              
              {date && meetingsByDate[format(date, 'yyyy-MM-dd')] && (
                <div className="w-full mt-4 space-y-2">
                  <h3 className="text-sm font-medium">
                    {formatDateHeading(date)} · {meetingsByDate[format(date, 'yyyy-MM-dd')].length} meetings
                  </h3>
                  
                  {meetingsByDate[format(date, 'yyyy-MM-dd')].map((meeting) => (
                    <div key={meeting.id} className="border rounded-lg p-3 shadow-sm">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">{meeting.title}</h4>
                        {meeting.isVirtual && (
                          <Badge variant="outline" className="border-blue-400 text-blue-500 bg-blue-50">
                            <Video className="h-3 w-3 mr-1" />
                            Virtual
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatMeetingTime(meeting)}
                        </div>
                        
                        {meeting.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {meeting.location}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {date && (!meetingsByDate[format(date, 'yyyy-MM-dd')] || 
                        meetingsByDate[format(date, 'yyyy-MM-dd')].length === 0) && (
                <div className="w-full mt-4 text-center text-muted-foreground py-6">
                  <p>No meetings on {format(date, 'MMMM d')}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Widget>
  );
}