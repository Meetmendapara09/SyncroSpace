'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, Calendar as CalendarIcon, Plus, Clock, Check, X, MoreHorizontal, Mail, CalendarClock } from 'lucide-react';
import { format, addDays, addMinutes, isToday, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getInitials } from '@/lib/utils';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';

interface Reminder {
  id: string;
  meetingId: string;
  title: string;
  message?: string;
  remindAt: string | Date;
  createdBy: string;
  createdByName?: string;
  createdByEmail?: string;
  recipients: string[];
  status: 'pending' | 'sent' | 'cancelled';
  remindType: 'email' | 'notification' | 'both';
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Reminder form schema
const reminderSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  message: z.string().optional(),
  remindAt: z.date({
    required_error: "Reminder date is required",
  }),
  recipients: z.array(z.string().email("Invalid email address")).min(1, "At least one recipient is required"),
  remindType: z.enum(["email", "notification", "both"], {
    required_error: "Reminder type is required",
  }),
});

// Quick reminder presets
const reminderPresets = [
  { label: "1 day after meeting", getValue: (meetingDate: Date) => addDays(meetingDate, 1) },
  { label: "3 days after meeting", getValue: (meetingDate: Date) => addDays(meetingDate, 3) },
  { label: "1 week after meeting", getValue: (meetingDate: Date) => addDays(meetingDate, 7) },
  { label: "30 minutes before meeting", getValue: (meetingDate: Date) => addMinutes(meetingDate, -30) },
];

interface FollowUpReminderProps {
  meetingId: string;
  meetingTitle: string;
  meetingDate: string | Date;
  participants: string[];
  readOnly?: boolean;
}

export function FollowUpReminders({
  meetingId,
  meetingTitle,
  meetingDate,
  participants,
  readOnly = false,
}: FollowUpReminderProps) {
  const [user] = useAuthState(auth);
  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [tab, setTab] = React.useState<'all' | 'pending' | 'sent'>('all');
  
  const meetingDateObj = new Date(meetingDate);
  
  const form = useForm<z.infer<typeof reminderSchema>>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: `Follow-up for "${meetingTitle}"`,
      message: `This is a reminder about our meeting "${meetingTitle}". Please make sure to review your action items and complete any assigned tasks.`,
      recipients: participants,
      remindType: "both",
    },
  });

  // Fetch reminders
  React.useEffect(() => {
    async function fetchReminders() {
      if (!user || !meetingId) return;
      
      setLoading(true);
      try {
        const remindersQuery = query(
          collection(db, 'reminders'),
          where('meetingId', '==', meetingId)
        );
        
        const querySnapshot = await getDocs(remindersQuery);
        const reminderData: Reminder[] = [];
        
        querySnapshot.forEach((doc) => {
          reminderData.push({ 
            id: doc.id, 
            ...doc.data() 
          } as Reminder);
        });
        
        setReminders(reminderData);
      } catch (error) {
        console.error('Error fetching reminders:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchReminders();
  }, [user, meetingId]);

  // Create new reminder
  const handleCreateReminder = async (data: z.infer<typeof reminderSchema>) => {
    if (!user || !meetingId) return;
    
    try {
      const newReminder = {
        meetingId,
        title: data.title,
        message: data.message || '',
        remindAt: data.remindAt,
        createdBy: user.uid,
        createdByName: user.displayName || '',
        createdByEmail: user.email || '',
        recipients: data.recipients,
        status: 'pending',
        remindType: data.remindType,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, 'reminders'), newReminder);
      
      setReminders(prev => [
        ...prev,
        { 
          id: docRef.id, 
          ...newReminder,
          remindAt: data.remindAt.toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Reminder
      ]);
      
      setShowAddDialog(false);
      form.reset({
        title: `Follow-up for "${meetingTitle}"`,
        message: `This is a reminder about our meeting "${meetingTitle}". Please make sure to review your action items and complete any assigned tasks.`,
        recipients: participants,
        remindType: "both",
      });
    } catch (error) {
      console.error('Error creating reminder:', error);
    }
  };

  // Cancel a reminder
  const handleCancelReminder = async (reminderId: string) => {
    if (!user) return;
    
    try {
      await updateDoc(doc(db, 'reminders', reminderId), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
      
      setReminders(prev => 
        prev.map(reminder => 
          reminder.id === reminderId 
            ? { ...reminder, status: 'cancelled', updatedAt: new Date().toISOString() } 
            : reminder
        )
      );
    } catch (error) {
      console.error('Error cancelling reminder:', error);
    }
  };

  // Delete a reminder
  const handleDeleteReminder = async (reminderId: string) => {
    if (!user) return;
    
    try {
      await deleteDoc(doc(db, 'reminders', reminderId));
      setReminders(prev => prev.filter(reminder => reminder.id !== reminderId));
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };
  
  // Apply filter based on selected tab
  const filteredReminders = reminders.filter(reminder => {
    if (tab === 'all') return true;
    return reminder.status === tab;
  });

  // Handle preset selection
  const handlePresetSelection = (preset: typeof reminderPresets[number]) => {
    form.setValue("remindAt", preset.getValue(meetingDateObj));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Follow-up Reminders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-muted rounded w-1/3"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
              <div className="h-8 w-24 bg-muted rounded"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle>Follow-up Reminders</CardTitle>
          <div className="text-sm text-muted-foreground mt-1">
            {reminders.filter(r => r.status === 'pending').length} pending, 
            {reminders.filter(r => r.status === 'sent').length} sent
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Tabs value={tab} onValueChange={(value) => setTab(value as any)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {!readOnly && (
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Reminder
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {filteredReminders.length > 0 ? (
          filteredReminders
            .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime())
            .map((reminder) => (
              <div
                key={reminder.id}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg",
                  reminder.status === 'sent' && "bg-muted/50",
                  reminder.status === 'cancelled' && "bg-muted/30 border-dashed",
                  reminder.status === 'pending' && isPast(new Date(reminder.remindAt)) && "border-destructive/30"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-medium">{reminder.title}</span>
                    
                    <Badge variant={
                      reminder.status === 'sent' ? 'secondary' : 
                      reminder.status === 'cancelled' ? 'outline' :
                      isPast(new Date(reminder.remindAt)) ? 'destructive' : 'default'
                    }>
                      {reminder.status === 'sent' ? 'Sent' :
                       reminder.status === 'cancelled' ? 'Cancelled' :
                       isPast(new Date(reminder.remindAt)) ? 'Overdue' : 'Pending'}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <CalendarClock className="h-4 w-4 mr-1.5" />
                      <span>
                        {isToday(new Date(reminder.remindAt)) 
                          ? `Today at ${format(new Date(reminder.remindAt), 'h:mm a')}` 
                          : format(new Date(reminder.remindAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-1.5" />
                      <span>{reminder.recipients.length} recipient{reminder.recipients.length !== 1 ? 's' : ''}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Bell className="h-4 w-4 mr-1.5" />
                      <span>
                        {reminder.remindType === 'both' ? 'Email & Notification' : 
                         reminder.remindType === 'email' ? 'Email only' :
                         'Notification only'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {!readOnly && reminder.status === 'pending' && (
                  <div className="flex items-center gap-2 mt-4 sm:mt-0">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCancelReminder(reminder.id)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteReminder(reminder.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
        ) : (
          <div className="text-center py-8">
            <div className="mx-auto bg-muted rounded-full w-12 h-12 flex items-center justify-center mb-3">
              <Bell className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No Reminders</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              {tab !== 'all' ? 
                `No ${tab} reminders found. Try changing the filter.` :
                'There are no follow-up reminders set for this meeting.'}
            </p>
            
            {!readOnly && tab === 'all' && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Reminder
              </Button>
            )}
          </div>
        )}
      </CardContent>
      
      {/* Add Reminder Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Follow-up Reminder</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateReminder)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter reminder title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter reminder message" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="remindAt"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Remind When</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP p")
                              ) : (
                                <span>Pick a date and time</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 sm:min-w-[400px]" align="start">
                          <div className="p-3 border-b">
                            <div className="text-sm font-medium mb-2">Quick presets</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {reminderPresets.map((preset, i) => (
                                <Button
                                  key={i}
                                  size="sm"
                                  variant="outline"
                                  type="button"
                                  onClick={() => handlePresetSelection(preset)}
                                  className="justify-start text-xs"
                                >
                                  {preset.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) {
                                const currentTime = field.value || new Date();
                                date.setHours(
                                  currentTime.getHours(),
                                  currentTime.getMinutes()
                                );
                                field.onChange(date);
                              }
                            }}
                            initialFocus
                          />
                          <div className="p-3 border-t">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium">Time:</div>
                              <div className="flex items-center space-x-2">
                                <Input
                                  type="time"
                                  value={field.value ? format(field.value, "HH:mm") : ""}
                                  onChange={(e) => {
                                    const [hours, minutes] = e.target.value.split(':');
                                    const newDate = field.value || new Date();
                                    newDate.setHours(parseInt(hours), parseInt(minutes));
                                    field.onChange(new Date(newDate));
                                  }}
                                  className="w-24"
                                />
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="remindType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reminder Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a reminder type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="email">Email only</SelectItem>
                          <SelectItem value="notification">Notification only</SelectItem>
                          <SelectItem value="both">Both Email & Notification</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="recipients"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipients</FormLabel>
                    <FormControl>
                      <div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {participants.map((participant, index) => (
                            <Badge 
                              key={index}
                              variant={field.value.includes(participant) ? "default" : "outline"}
                              className="cursor-pointer pl-1.5 pr-2 py-1 text-xs"
                              onClick={() => {
                                if (field.value.includes(participant)) {
                                  field.onChange(field.value.filter(p => p !== participant));
                                } else {
                                  field.onChange([...field.value, participant]);
                                }
                              }}
                            >
                              <Avatar className="h-4 w-4 mr-1">
                                <AvatarFallback className="text-[8px]">
                                  {getInitials(participant)}
                                </AvatarFallback>
                              </Avatar>
                              {participant}
                              <span className="ml-1.5">
                                {field.value.includes(participant) ? 
                                  <Check className="h-3 w-3" /> : 
                                  <Plus className="h-3 w-3" />}
                              </span>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Input 
                            placeholder="Add additional email"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.currentTarget.value) {
                                e.preventDefault();
                                const email = e.currentTarget.value.trim();
                                if (email && !field.value.includes(email)) {
                                  field.onChange([...field.value, email]);
                                  e.currentTarget.value = '';
                                }
                              }
                            }}
                          />
                          <Button 
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const input = document.activeElement as HTMLInputElement;
                              if (input && input.value) {
                                const email = input.value.trim();
                                if (email && !field.value.includes(email)) {
                                  field.onChange([...field.value, email]);
                                  input.value = '';
                                }
                              }
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Select meeting participants or add additional email addresses.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Reminder</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}