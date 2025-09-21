'use client';

import { useState, useEffect, useRef } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { EnhancedTask, TimeEntry } from './task-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Timestamp } from 'firebase/firestore';
import { format, differenceInSeconds } from 'date-fns';
import { Check, Clock, MoreVertical, Pause, Play, RotateCcw, Trash } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody,
  TableCell,
  TableHead,
  TableHeader, 
  TableRow
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Helper function to format seconds to HH:MM:SS
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  
  if (minutes > 0 || hours > 0) {
    parts.push(`${minutes}m`);
  }
  
  parts.push(`${secs}s`);
  
  return parts.join(' ');
};

// Helper to format date
const formatDate = (timestamp: Timestamp): string => {
  return format(timestamp.toDate(), 'MMM d, yyyy h:mm a');
};

export function TaskTimeTrackingView() {
  const [user] = useAuthState(auth);
  const [activeTask, setActiveTask] = useState<EnhancedTask | null>(null);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualTaskId, setManualTaskId] = useState<string | null>(null);
  const [manualDuration, setManualDuration] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  
  // Store interval ID for timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get personal tasks for the current user
  const personalTasksQuery = user ? 
    query(
      collection(db, 'personalTasks'),
      where('userId', '==', user.uid),
    ) : null;
    
  const [tasksSnapshot, loading, error] = useCollection(personalTasksQuery);

  // Convert to task objects
  const tasks = tasksSnapshot?.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  })) as EnhancedTask[] | undefined;

  // Apply filters to tasks
  const filteredTasks = filterStatus 
    ? tasks?.filter(task => filterStatus === 'all' || task.status === filterStatus)
    : tasks;

  // Load active timer if exists
  useEffect(() => {
    if (!tasks) return;
    
    // Find task with active timer
    const taskWithActiveTimer = tasks.find(task => 
      task.timeTracking?.activeTimer?.startTime !== undefined
    );
    
    if (taskWithActiveTimer) {
      setActiveTask(taskWithActiveTimer);
      setTimerRunning(true);
      
      // Calculate elapsed time
      const startTime = taskWithActiveTimer.timeTracking?.activeTimer?.startTime.toDate();
      if (startTime) {
        const initialElapsed = differenceInSeconds(new Date(), startTime);
        setElapsedTime(initialElapsed);
      }
    }
  }, [tasks]);
  
  // Update timer every second
  useEffect(() => {
    if (timerRunning && activeTask) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerRunning, activeTask]);

  const handleStartTimer = async (task: EnhancedTask) => {
    if (activeTask) {
      toast({
        title: "Timer Already Running",
        description: `Stop the current timer for "${activeTask.title}" before starting a new one.`,
        variant: "destructive"
      });
      return;
    }
    
    try {
      const now = Timestamp.now();
      const timeTracking = task.timeTracking || {
        totalTime: 0,
        timeEntries: [],
      };
      
      await updateDoc(doc(db, 'personalTasks', task.id), {
        'timeTracking.activeTimer': {
          startTime: now,
          description: ''
        }
      });
      
      setActiveTask(task);
      setTimerRunning(true);
      setElapsedTime(0);
      
      toast({
        title: "Timer Started",
        description: `Tracking time for "${task.title}"`,
      });
    } catch (err) {
      console.error('Failed to start timer:', err);
      toast({
        title: "Failed to Start Timer",
        description: "An error occurred while starting the timer.",
        variant: "destructive"
      });
    }
  };
  
  const handleStopTimer = async () => {
    if (!activeTask || !timerRunning) return;
    
    try {
      const taskRef = doc(db, 'personalTasks', activeTask.id);
      const now = Timestamp.now();
      const startTime = activeTask.timeTracking?.activeTimer?.startTime;
      
      if (!startTime) return;
      
      // Calculate duration in seconds
      const duration = elapsedTime;
      
      // Create new time entry
      const newEntry: TimeEntry = {
        startTime,
        endTime: now,
        duration,
        description: activeTask.timeTracking?.activeTimer?.description || '',
      };
      
      // Update the task
      const updatedTotalTime = (activeTask.timeTracking?.totalTime || 0) + duration;
      const updatedTimeEntries = [...(activeTask.timeTracking?.timeEntries || []), newEntry];
      
      await updateDoc(taskRef, {
        'timeTracking.totalTime': updatedTotalTime,
        'timeTracking.timeEntries': updatedTimeEntries,
        'timeTracking.activeTimer': null,
      });
      
      setActiveTask(null);
      setTimerRunning(false);
      setElapsedTime(0);
      
      toast({
        title: "Timer Stopped",
        description: `Added ${formatTime(duration)} to "${activeTask.title}"`,
      });
    } catch (err) {
      console.error('Failed to stop timer:', err);
      toast({
        title: "Failed to Stop Timer",
        description: "An error occurred while stopping the timer.",
        variant: "destructive"
      });
    }
  };
  
  const handleAddManualEntry = async () => {
    if (!manualTaskId || !manualDuration) {
      toast({
        title: "Invalid Entry",
        description: "Please select a task and specify duration",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const durationInSeconds = parseDuration(manualDuration);
      
      if (durationInSeconds <= 0) {
        toast({
          title: "Invalid Duration",
          description: "Please enter a valid duration (e.g., '1h 30m')",
          variant: "destructive"
        });
        return;
      }
      
      const task = tasks?.find(t => t.id === manualTaskId);
      if (!task) return;
      
      const taskRef = doc(db, 'personalTasks', manualTaskId);
      const now = Timestamp.now();
      
      // Create new time entry
      const newEntry: TimeEntry = {
        startTime: Timestamp.fromDate(new Date(now.toDate().getTime() - durationInSeconds * 1000)),
        endTime: now,
        duration: durationInSeconds,
        description: manualDescription,
      };
      
      // Update the task
      const updatedTotalTime = (task.timeTracking?.totalTime || 0) + durationInSeconds;
      const updatedTimeEntries = [...(task.timeTracking?.timeEntries || []), newEntry];
      
      await updateDoc(taskRef, {
        'timeTracking.totalTime': updatedTotalTime,
        'timeTracking.timeEntries': updatedTimeEntries,
      });
      
      setManualEntryOpen(false);
      setManualTaskId(null);
      setManualDuration('');
      setManualDescription('');
      
      toast({
        title: "Time Entry Added",
        description: `Added ${formatTime(durationInSeconds)} to "${task.title}"`,
      });
    } catch (err) {
      console.error('Failed to add manual entry:', err);
      toast({
        title: "Failed to Add Entry",
        description: "An error occurred while adding the time entry.",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteEntry = async (taskId: string, entryIndex: number) => {
    try {
      const task = tasks?.find(t => t.id === taskId);
      if (!task || !task.timeTracking?.timeEntries) return;
      
      const entry = task.timeTracking.timeEntries[entryIndex];
      if (!entry) return;
      
      const taskRef = doc(db, 'personalTasks', taskId);
      
      // Remove the entry and update total time
      const updatedEntries = task.timeTracking.timeEntries.filter((_, i) => i !== entryIndex);
      const updatedTotalTime = task.timeTracking.totalTime - entry.duration;
      
      await updateDoc(taskRef, {
        'timeTracking.totalTime': updatedTotalTime,
        'timeTracking.timeEntries': updatedEntries,
      });
      
      toast({
        title: "Time Entry Deleted",
        description: `Removed ${formatTime(entry.duration)} from "${task.title}"`,
      });
    } catch (err) {
      console.error('Failed to delete entry:', err);
      toast({
        title: "Failed to Delete Entry",
        description: "An error occurred while deleting the time entry.",
        variant: "destructive"
      });
    }
  };
  
  // Helper to parse duration from string like "1h 30m 45s" to seconds
  const parseDuration = (input: string): number => {
    let totalSeconds = 0;
    
    // Handle hours
    const hoursMatch = input.match(/(\d+)\s*h/i);
    if (hoursMatch) {
      totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
    }
    
    // Handle minutes
    const minutesMatch = input.match(/(\d+)\s*m(?!s)/i);
    if (minutesMatch) {
      totalSeconds += parseInt(minutesMatch[1], 10) * 60;
    }
    
    // Handle seconds
    const secondsMatch = input.match(/(\d+)\s*s/i);
    if (secondsMatch) {
      totalSeconds += parseInt(secondsMatch[1], 10);
    }
    
    // If input is just a number, interpret as minutes
    if (!hoursMatch && !minutesMatch && !secondsMatch) {
      const justNumber = input.match(/^(\d+)$/);
      if (justNumber) {
        totalSeconds = parseInt(justNumber[1], 10) * 60;
      }
    }
    
    return totalSeconds;
  };
  
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-60" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading tasks: {error.message}</p>;
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <h3 className="text-xl font-medium mb-2">No tasks found</h3>
          <p className="text-muted-foreground">Create tasks to start tracking time.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Timer Display */}
      <Card className={cn(
        "border-2",
        activeTask ? "border-primary" : "border-muted"
      )}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            {activeTask ? "Active Timer" : "Timer"}
          </CardTitle>
          <CardDescription>
            {activeTask 
              ? `Currently tracking time for "${activeTask.title}"`
              : "No active timer running"
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              {activeTask && (
                <div className="text-3xl font-mono font-bold">
                  {formatTime(elapsedTime)}
                </div>
              )}
            </div>
            
            <div>
              {activeTask ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleStopTimer}
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Stop Timer
                </Button>
              ) : (
                <Dialog open={manualEntryOpen} onOpenChange={setManualEntryOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Add Manual Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Manual Time Entry</DialogTitle>
                      <DialogDescription>
                        Record time you've spent on a task.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label htmlFor="task">Task</Label>
                        <Select 
                          value={manualTaskId || ''}
                          onValueChange={setManualTaskId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a task" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {tasks.map(task => (
                                <SelectItem key={task.id} value={task.id}>
                                  {task.title}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="duration">Duration</Label>
                        <Input
                          id="duration"
                          value={manualDuration}
                          onChange={(e) => setManualDuration(e.target.value)}
                          placeholder="e.g., 1h 30m or 90m"
                        />
                        <p className="text-xs text-muted-foreground">
                          Format as 1h 30m, 90m, or 1.5h
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Input
                          id="description"
                          value={manualDescription}
                          onChange={(e) => setManualDescription(e.target.value)}
                          placeholder="What were you working on?"
                        />
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setManualEntryOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddManualEntry}>
                        <Check className="h-4 w-4 mr-1" />
                        Add Entry
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardContent>
        
        {!activeTask && (
          <CardFooter className="flex justify-between border-t bg-muted/50 px-6 py-3">
            <div className="flex items-center space-x-2">
              <Label htmlFor="filter-status">Filter:</Label>
              <Select 
                value={filterStatus || 'all'}
                onValueChange={setFilterStatus}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All tasks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tasks</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredTasks?.length} tasks available
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Tasks List for Timer */}
      {!activeTask && (
        <Card>
          <CardHeader>
            <CardTitle>Start Timer</CardTitle>
            <CardDescription>
              Select a task to start tracking time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {filteredTasks?.map(task => (
                <div 
                  key={task.id} 
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <h4 className="font-medium">{task.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {task.timeTracking?.totalTime 
                        ? `Tracked: ${formatTime(task.timeTracking.totalTime)}`
                        : 'No time tracked'}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleStartTimer(task)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </Button>
                </div>
              ))}
              
              {filteredTasks?.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No matching tasks found
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      
      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Time Entries</CardTitle>
          <CardDescription>
            History of your tracked time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks?.flatMap(task => 
                (task.timeTracking?.timeEntries || [])
                  .map((entry, entryIndex) => ({
                    task,
                    entry,
                    entryIndex
                  }))
              )
              .sort((a, b) => {
                // Sort by most recent first
                const dateA = a.entry.endTime?.toDate() || new Date(0);
                const dateB = b.entry.endTime?.toDate() || new Date(0);
                return dateB.getTime() - dateA.getTime();
              })
              .slice(0, 10) // Show only last 10 entries
              .map(({ task, entry, entryIndex }) => (
                <TableRow key={`${task.id}-${entryIndex}`}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>
                    {entry.endTime ? formatDate(entry.endTime) : 'N/A'}
                  </TableCell>
                  <TableCell>{formatTime(entry.duration)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {entry.description || '-'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteEntry(task.id, entryIndex)}
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Delete Entry
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              
              {tasks?.every(task => !task.timeTracking?.timeEntries?.length) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No time entries found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}