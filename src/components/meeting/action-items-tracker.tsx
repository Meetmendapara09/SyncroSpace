'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, MoreHorizontal, Calendar as CalendarIcon, User, Clock, CalendarClock, Check, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getInitials } from '@/lib/utils';
import { ActionItem } from '@/lib/meeting-templates';
import { ActionItemsService } from '@/lib/meeting-notes-service';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

// Schema for action item form validation
const actionItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  assignedTo: z.array(z.string()).min(1, "At least one assignee is required"),
  dueDate: z.date().optional(),
  priority: z.enum(['low', 'medium', 'high']),
});

interface ActionItemsProps {
  meetingId: string;
  readOnly?: boolean;
}

export function ActionItemsTracker({ meetingId, readOnly = false }: ActionItemsProps) {
  const [user] = useAuthState(auth);
  const [actionItems, setActionItems] = React.useState<ActionItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<ActionItem | null>(null);
  const [filteredStatus, setFilteredStatus] = React.useState<string | null>(null);

  const form = useForm<z.infer<typeof actionItemSchema>>({
    resolver: zodResolver(actionItemSchema),
    defaultValues: {
      title: "",
      description: "",
      assignedTo: [],
      priority: "medium",
    },
  });

  // Fetch action items
  React.useEffect(() => {
    async function fetchActionItems() {
      if (!user) return;
      
      setLoading(true);
      try {
        const items = await ActionItemsService.getActionItemsByMeeting(meetingId);
        setActionItems(items);
      } catch (error) {
        console.error('Error fetching action items:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchActionItems();
  }, [meetingId, user]);

  // Handle creating new action item
  const handleCreateActionItem = async (data: z.infer<typeof actionItemSchema>) => {
    if (!user) return;
    
    try {
      // Use the function signature from the service
      const actionItemId = await ActionItemsService.createActionItem(
        data.title,
        data.assignedTo,
        meetingId,
        "action-items-section", // Default section ID
        user.uid,
        data.description || '',
        data.dueDate ? data.dueDate.toISOString() : undefined,
        data.priority
      );
      
      // Refresh action items from the service
      const updatedItems = await ActionItemsService.getActionItemsByMeeting(meetingId);
      setActionItems(updatedItems);
      
      // Close dialog and reset form
      setShowAddDialog(false);
      form.reset();
    } catch (error) {
      console.error('Error creating action item:', error);
    }
  };

  // Handle updating an action item
  const handleUpdateActionItem = async (data: z.infer<typeof actionItemSchema>) => {
    if (!editingItem || !user) return;
    
    try {
      const updatedItem: Partial<ActionItem> = {
        title: data.title,
        description: data.description || '',
        assignedTo: data.assignedTo,
        dueDate: data.dueDate ? data.dueDate.toISOString() : undefined,
        priority: data.priority
      };
      
      await ActionItemsService.updateActionItem(editingItem.id, updatedItem);
      
      // Update the item in the state
      setActionItems(prev => 
        prev.map(item => 
          item.id === editingItem.id 
            ? { ...item, ...updatedItem, updatedAt: new Date().toISOString() } 
            : item
        )
      );
      
      // Close dialog and reset
      setShowEditDialog(false);
      setEditingItem(null);
      form.reset();
    } catch (error) {
      console.error('Error updating action item:', error);
    }
  };

  // Toggle action item status
  const toggleActionItemStatus = async (actionItem: ActionItem) => {
    if (!user) return;
    
    const newStatus = actionItem.status === 'completed' ? 'in-progress' : 'completed';
    
    try {
      await ActionItemsService.updateActionItem(actionItem.id, {
        status: newStatus
      });
      
      // Update the item in the state
      setActionItems(prev => 
        prev.map(item => 
          item.id === actionItem.id 
            ? { 
                ...item, 
                status: newStatus,
                updatedAt: new Date().toISOString(),
              } 
            : item
        )
      );
    } catch (error) {
      console.error('Error updating action item status:', error);
    }
  };

  // Delete action item
  const deleteActionItem = async (actionItemId: string) => {
    if (!user) return;
    
    try {
      await ActionItemsService.deleteActionItem(actionItemId);
      
      // Remove the item from the state
      setActionItems(prev => prev.filter(item => item.id !== actionItemId));
    } catch (error) {
      console.error('Error deleting action item:', error);
    }
  };

  // Open edit dialog
  const openEditDialog = (actionItem: ActionItem) => {
    setEditingItem(actionItem);
    
    form.reset({
      title: actionItem.title,
      description: actionItem.description || '',
      assignedTo: actionItem.assignedTo,
      dueDate: actionItem.dueDate ? new Date(actionItem.dueDate) : undefined,
      priority: actionItem.priority,
    });
    
    setShowEditDialog(true);
  };

  // Filter action items
  const filteredActionItems = filteredStatus 
    ? actionItems.filter(item => item.status === filteredStatus)
    : actionItems;

  // Count items by status
  const completedCount = actionItems.filter(item => item.status === 'completed').length;
  const inProgressCount = actionItems.filter(item => item.status === 'in-progress').length;

  // Sort items - incomplete first, then by priority and due date
  const sortedActionItems = [...filteredActionItems].sort((a, b) => {
    // Status: in-progress first
    if (a.status !== b.status) {
      return a.status === 'in-progress' ? -1 : 1;
    }
    
    // Priority: high > medium > low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (a.priority !== b.priority) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    
    // Due date: sooner first
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    
    // Items with due dates before those without
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    
    return 0;
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Action Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-muted rounded w-1/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
              <div className="h-8 w-8 bg-muted rounded-full"></div>
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
          <CardTitle>Action Items</CardTitle>
          <div className="text-sm text-muted-foreground mt-1">
            {inProgressCount} in progress, {completedCount} completed
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {filteredStatus === 'completed' ? 'Completed' : 
                 filteredStatus === 'in-progress' ? 'In Progress' : 
                 'All Items'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilteredStatus(null)}>
                All Items
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilteredStatus('in-progress')}>
                In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilteredStatus('completed')}>
                Completed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {!readOnly && (
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {sortedActionItems.length > 0 ? (
          sortedActionItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-start justify-between p-3 border rounded-lg",
                item.status === 'completed' && "bg-muted/50",
                item.dueDate && new Date(item.dueDate) < new Date() && 
                item.status !== 'completed' && "border-destructive/30"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <Checkbox 
                    checked={item.status === 'completed'}
                    onCheckedChange={() => toggleActionItemStatus(item)}
                    disabled={readOnly}
                  />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-medium",
                      item.status === 'completed' && "line-through text-muted-foreground"
                    )}>
                      {item.title}
                    </span>
                    
                    <Badge variant={
                      item.priority === 'high' ? 'destructive' : 
                      item.priority === 'medium' ? 'default' : 
                      'secondary'
                    } className="ml-1">
                      {item.priority}
                    </Badge>
                  </div>
                  
                  {item.description && (
                    <p className={cn(
                      "text-sm text-muted-foreground",
                      item.status === 'completed' && "line-through"
                    )}>
                      {item.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    {item.assignedTo.map((assignee, i) => (
                      <div key={i} className="flex items-center">
                        <Avatar className="h-4 w-4 mr-1">
                          <AvatarFallback className="text-[10px]">
                            {getInitials(assignee)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{assignee}</span>
                      </div>
                    ))}
                    
                    {item.dueDate && (
                      <div className={cn(
                        "flex items-center",
                        new Date(item.dueDate) < new Date() && 
                        item.status !== 'completed' && "text-destructive"
                      )}>
                        {new Date(item.dueDate) < new Date() && 
                         item.status !== 'completed' ? (
                          <AlertCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <CalendarClock className="h-3 w-3 mr-1" />
                        )}
                        <span>{format(new Date(item.dueDate), 'MMM d')}</span>
                      </div>
                    )}
                    
                    {item.status === 'completed' && (
                      <div className="flex items-center">
                        <Check className="h-3 w-3 mr-1" />
                        <span>
                          Completed {format(new Date(item.updatedAt), 'MMM d')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {!readOnly && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(item)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => toggleActionItemStatus(item)}
                      className="text-primary"
                    >
                      {item.status === 'completed' ? 'Mark Incomplete' : 'Mark Complete'}
                    </DropdownMenuItem>
                    <Separator className="my-1" />
                    <DropdownMenuItem 
                      onClick={() => deleteActionItem(item.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <div className="mx-auto bg-muted rounded-full w-12 h-12 flex items-center justify-center mb-3">
              <Check className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No Action Items</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              {filteredStatus ? 
                `No ${filteredStatus} action items found. Try changing the filter.` :
                'There are no action items yet. Add items to track tasks from this meeting.'}
            </p>
            
            {!readOnly && !filteredStatus && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            )}
          </div>
        )}
      </CardContent>
      
      {/* Add Action Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Action Item</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateActionItem)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter action item title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter details about this action item" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input 
                            placeholder="Enter email address"
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
                      </FormControl>
                      
                      {field.value.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {field.value.map((assignee, index) => (
                            <Badge 
                              key={index}
                              variant="secondary"
                              className="pl-1 flex items-center gap-1"
                            >
                              <User className="h-3 w-3" />
                              {assignee}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 ml-1 rounded-full"
                                onClick={() => {
                                  const newAssignees = [...field.value];
                                  newAssignees.splice(index, 1);
                                  field.onChange(newAssignees);
                                }}
                              >
                                <span className="text-xs">×</span>
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={field.value}
                            onChange={field.onChange}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Due Date (Optional)</FormLabel>
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
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Action Item</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Action Item Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Action Item</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateActionItem)} className="space-y-4">
              {/* Same form fields as Add Dialog */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter action item title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter details about this action item" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input 
                            placeholder="Enter email address"
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
                      </FormControl>
                      
                      {field.value.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {field.value.map((assignee, index) => (
                            <Badge 
                              key={index}
                              variant="secondary"
                              className="pl-1 flex items-center gap-1"
                            >
                              <User className="h-3 w-3" />
                              {assignee}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 ml-1 rounded-full"
                                onClick={() => {
                                  const newAssignees = [...field.value];
                                  newAssignees.splice(index, 1);
                                  field.onChange(newAssignees);
                                }}
                              >
                                <span className="text-xs">×</span>
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={field.value}
                            onChange={field.onChange}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Due Date (Optional)</FormLabel>
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
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditingItem(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Update Action Item</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}