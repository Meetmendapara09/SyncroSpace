'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Users, Calendar, MapPin, Video, ArrowLeft, Edit, Plus, Share, CalendarClock } from 'lucide-react';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import Link from 'next/link';
import { getInitials } from '@/lib/utils';
import { MeetingNotesComponent } from '@/components/meeting/meeting-notes';
import { ActionItemsTracker } from '@/components/meeting/action-items-tracker';
import { FollowUpReminders } from '@/components/meeting/follow-up-reminders';
import { TemplateSelectDialog } from '@/components/meeting/template-select-dialog';
import { MeetingEffectivenessMetrics } from '@/components/meeting/meeting-effectiveness-metrics';
import { format, isToday, isYesterday, isTomorrow, parseISO } from 'date-fns';

interface MeetingData {
  id: string;
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  attendees: string[];
  creatorId: string;
  creatorName: string;
  status: string;
  spaceId?: string;
  location?: string;
  calendarEventId?: string;
}

export default function MeetingPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params?.id as string;
  const [user] = useAuthState(auth);
  const [tab, setTab] = useState('details');
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
  const meetingDocRef = doc(db, 'meetings', meetingId);
  const [meetingData, meetingLoading, meetingError] = useDocumentData(meetingDocRef);

  const isUserInvited = user?.email && meetingData?.attendees?.includes(user.email);
  const isCreator = user?.uid === meetingData?.creatorId;
  
  // Format meeting date for display
  const formatMeetingDate = (date: string) => {
    const meetingDate = parseISO(date);
    if (isToday(meetingDate)) {
      return `Today at ${format(meetingDate, 'h:mm a')}`;
    } else if (isYesterday(meetingDate)) {
      return `Yesterday at ${format(meetingDate, 'h:mm a')}`;
    } else if (isTomorrow(meetingDate)) {
      return `Tomorrow at ${format(meetingDate, 'h:mm a')}`;
    } else {
      return format(meetingDate, 'EEE, MMM d, yyyy \'at\' h:mm a');
    }
  };

  // Handle template selection
  const handleTemplateSelect = async (templateId: string) => {
    if (!meetingData) return;
    
    // Close the dialog
    setShowTemplateDialog(false);
    
    // Navigate to notes tab
    setTab("notes");
    
    // Create new notes from template
    // This would be implemented in the MeetingNotesService
    console.log('Creating notes from template:', templateId);
  };
  if (meetingLoading) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-8 w-64 bg-muted animate-pulse rounded"></div>
            <div className="h-4 w-40 bg-muted animate-pulse rounded"></div>
          </div>
          <div className="h-10 w-24 bg-muted animate-pulse rounded"></div>
        </div>
        
        <div className="h-64 w-full bg-muted animate-pulse rounded"></div>
      </div>
    );
  }

  if (meetingError || !meetingData) {
    return (
      <div className="container py-10 text-center">
        <h2 className="text-2xl font-semibold mb-2">Meeting Not Found</h2>
        <p className="text-muted-foreground mb-6">The meeting you're looking for doesn't exist or you don't have permission to view it.</p>
        <Button asChild>
          <Link href="/meeting">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Meetings
          </Link>
        </Button>
      </div>
    );
  }

  if (!isUserInvited && !isCreator) {
    return (
      <div className="container py-10 text-center">
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-6">You don't have permission to view this meeting.</p>
        <Button asChild>
          <Link href="/meeting">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Meetings
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/meeting" className="text-muted-foreground hover:text-foreground text-sm flex items-center">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Meetings
            </Link>
          </div>
          <h1 className="text-2xl font-semibold">{meetingData.title}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-2 items-center mt-1">
            <div className="flex items-center text-muted-foreground">
              <Clock className="h-4 w-4 mr-1.5" />
              <span className="text-sm">{formatMeetingDate(meetingData.startDateTime)}</span>
            </div>
            
            {meetingData.location && (
              <div className="flex items-center text-muted-foreground">
                <Video className="h-4 w-4 mr-1.5" />
                <span className="text-sm">{meetingData.location}</span>
              </div>
            )}
            
            <Badge variant={
              new Date(meetingData.startDateTime) > new Date() ? "outline" :
              new Date(meetingData.endDateTime) < new Date() ? "secondary" :
              "default"
            }>
              {new Date(meetingData.startDateTime) > new Date() ? "Upcoming" :
              new Date(meetingData.endDateTime) < new Date() ? "Completed" :
              "In Progress"}
            </Badge>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowActions(!showActions)}>
            <Edit className="h-4 w-4 mr-2" />
            Actions
          </Button>
          
          <Button>
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
      
      {showActions && (
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setShowTemplateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Notes Template
            </Button>
            <Button variant="outline" onClick={() => router.push(`/calendar/event?meetingId=${meetingId}`)}>
              <Calendar className="h-4 w-4 mr-2" />
              Add to Calendar
            </Button>
            <Button variant="outline" onClick={() => console.log('Edit meeting')}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Meeting
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="action-items">Action Items</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meeting Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {meetingData.description ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Description</h3>
                  <p className="text-sm">{meetingData.description}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No description provided</p>
              )}
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Participants ({meetingData.attendees?.length || 0})
                </h3>
                
                {meetingData.attendees && meetingData.attendees.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {meetingData.attendees.map((participant: string, index: number) => (
                      <div 
                        key={index} 
                        className="flex items-center bg-muted rounded-full pl-1 pr-3 py-1"
                      >
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarFallback>{getInitials(participant)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{participant}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No participants added</p>
                )}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center">
                  <CalendarClock className="h-4 w-4 mr-2" />
                  Schedule
                </h3>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-medium">Start:</span> {format(parseISO(meetingData.startDateTime), 'PPpp')}
                  </div>
                  <div>
                    <span className="font-medium">End:</span> {format(parseISO(meetingData.endDateTime), 'PPpp')}
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span> {
                      Math.round(
                        (parseISO(meetingData.endDateTime).getTime() - parseISO(meetingData.startDateTime).getTime()) / 1000 / 60
                      )
                    } minutes
                  </div>
                </div>
              </div>
              
              {meetingData.location && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Location</h3>
                  <div className="flex items-center">
                    {meetingData.location.includes('http') ? (
                      <a 
                        href={meetingData.location} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline flex items-center"
                      >
                        <Video className="mr-2 h-4 w-4" />
                        Join Video Meeting
                      </a>
                    ) : (
                      <span className="flex items-center">
                        <MapPin className="mr-2 h-4 w-4" />
                        {meetingData.location}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Created by</h3>
                <div className="flex items-center">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarFallback>{getInitials(meetingData.creatorName)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{meetingData.creatorName}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notes">
          <MeetingNotesComponent meetingId={meetingId} />
        </TabsContent>
        
        <TabsContent value="action-items">
          <ActionItemsTracker meetingId={meetingId} />
        </TabsContent>
        
        <TabsContent value="reminders">
          <FollowUpReminders 
            meetingId={meetingId} 
            meetingTitle={meetingData.title}
            meetingDate={meetingData.startDateTime}
            participants={meetingData.attendees || []}
          />
        </TabsContent>
        
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Calendar Integration</CardTitle>
              <CardDescription>Connect this meeting with your calendar</CardDescription>
            </CardHeader>
            <CardContent>
              {meetingData.calendarEventId ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Connected Calendar Event</h3>
                    <Button variant="ghost" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      Open in Calendar
                    </Button>
                  </div>
                  
                  <Card className="overflow-hidden border">
                    <div className="bg-primary h-1"></div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{meetingData.title}</h4>
                          <div className="flex items-center text-muted-foreground mt-1">
                            <CalendarClock className="h-4 w-4 mr-1" />
                            <span className="text-sm">
                              {format(parseISO(meetingData.startDateTime), 'PPp')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium mb-2">No Calendar Events</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    This meeting is not yet connected to any calendar events.
                    Add it to your calendar to receive reminders and manage scheduling.
                  </p>
                  <Button onClick={() => router.push(`/calendar/event?meetingId=${meetingId}`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Calendar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="metrics">
          <MeetingEffectivenessMetrics meetingId={meetingId} />
        </TabsContent>
      </Tabs>
      
      <TemplateSelectDialog 
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        onSelectTemplate={handleTemplateSelect}
      />
    </div>
  );
}
