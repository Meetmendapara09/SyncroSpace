'use client';

import { Card, CardContent, CardHeader } from '../ui/card';
import { EnhancedTask, TaskStatus, TaskPriority } from './task-types';
import { Milestone, MoreHorizontal, Clock, Calendar, Tag, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { doc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { useState } from 'react';
import { EditTaskForm } from './edit-task-form';
import { formatDistanceToNow, isPast, format } from 'date-fns';

// Priority and status styling
const priorityStyles: Record<TaskPriority, { bg: string, text: string, icon?: JSX.Element }> = {
  'urgent': { 
    bg: 'bg-red-100 dark:bg-red-900/20', 
    text: 'text-red-600 dark:text-red-400',
    icon: <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
  },
  'high': { 
    bg: 'bg-orange-100 dark:bg-orange-900/20', 
    text: 'text-orange-600 dark:text-orange-400' 
  },
  'medium': { 
    bg: 'bg-blue-100 dark:bg-blue-900/20', 
    text: 'text-blue-600 dark:text-blue-400' 
  },
  'low': { 
    bg: 'bg-green-100 dark:bg-green-900/20', 
    text: 'text-green-600 dark:text-green-400' 
  }
};

export function PersonalTaskCard({ task }: { task: EnhancedTask }) {
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTimeTrackingActive, setIsTimeTrackingActive] = useState(false);
  const [currentTimeEntryId, setCurrentTimeEntryId] = useState<string | null>(null);

  // Format time spent on task
  const formatTimeSpent = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`;
  };

  // Move task to a different status
  const moveTask = async (newStatus: TaskStatus) => {
    const taskRef = doc(db, 'personalTasks', task.id);
    try {
      await updateDoc(taskRef, { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      // If moving to done, set progress to 100%
      if (newStatus === 'done' && task.progress < 100) {
        await updateDoc(taskRef, { progress: 100 });
      }
      
      toast({
        title: 'Task Updated',
        description: `Task moved to ${newStatus.replace('-', ' ')}.`
      });
    } catch(error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating task',
        description: error.message,
      });
    }
  };

  // Delete task
  const deleteTask = async () => {
    const taskRef = doc(db, 'personalTasks', task.id);
    try {
      await deleteDoc(taskRef);
      toast({
        title: 'Task Deleted',
        description: `Task "${task.title}" has been deleted.`
      });
    } catch(error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting task',
        description: error.message,
      });
    }
  };

  // Toggle time tracking
  const toggleTimeTracking = async () => {
    const taskRef = doc(db, 'personalTasks', task.id);
    
    try {
      if (!isTimeTrackingActive) {
        // Start time tracking
        const newTimeEntry = {
          id: crypto.randomUUID(),
          startTime: serverTimestamp()
        };
        
        await updateDoc(taskRef, {
          'timeTracking.timeEntries': [...(task.timeTracking?.timeEntries || []), newTimeEntry],
          updatedAt: serverTimestamp()
        });
        
        setCurrentTimeEntryId(newTimeEntry.id);
        setIsTimeTrackingActive(true);
        
        toast({
          title: 'Time Tracking Started',
          description: `Started tracking time for "${task.title}"`
        });
      } else {
        // Stop time tracking
        if (!currentTimeEntryId) return;
        
        // Find the current time entry
        const timeEntries = [...(task.timeTracking?.timeEntries || [])];
        // Use index as the identifier since TimeEntry doesn't have an id property
        const entryIndex = timeEntries.findIndex((_, index) => index.toString() === currentTimeEntryId);
        
        if (entryIndex !== -1) {
          // Calculate duration
          const now = new Date();
          const startTime = timeEntries[entryIndex].startTime.toDate();
          const durationInSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
          
          // Update the time entry with a Timestamp instead of FieldValue
          timeEntries[entryIndex] = {
            ...timeEntries[entryIndex],
            endTime: Timestamp.now(), // Use Timestamp.now() instead of serverTimestamp()
            duration: durationInSeconds
          };
          
          // Calculate total time
          const totalTime = (task.timeTracking?.totalTime || 0) + durationInSeconds;
          
          await updateDoc(taskRef, {
            'timeTracking.timeEntries': timeEntries,
            'timeTracking.totalTime': totalTime,
            updatedAt: serverTimestamp()
          });
          
          setIsTimeTrackingActive(false);
          setCurrentTimeEntryId(null);
          
          toast({
            title: 'Time Tracking Stopped',
            description: `Recorded ${formatTimeSpent(durationInSeconds)} for "${task.title}"`
          });
        }
      }
    } catch(error: any) {
      toast({
        variant: 'destructive',
        title: 'Error tracking time',
        description: error.message,
      });
    }
  };

  // Format due date
  const formatDueDate = () => {
    if (!task.dueDate) return null;
    
    const dueDate = task.dueDate.toDate();
    const isPastDue = isPast(dueDate) && task.status !== 'done';
    
    return (
      <div className="flex items-center gap-1.5">
        <Calendar className={cn(
          "h-3.5 w-3.5", 
          isPastDue ? "text-red-500" : "text-muted-foreground"
        )} />
        <span className={cn(
          "text-xs",
          isPastDue ? "font-medium text-red-500" : "text-muted-foreground"
        )}>
          {isPastDue ? 'Overdue: ' : ''}
          {formatDistanceToNow(dueDate, { addSuffix: true })}
        </span>
      </div>
    );
  };

  return (
    <>
      <Card className={cn(
        "shadow-sm hover:shadow-md transition-shadow duration-200",
        task.isMilestone && "border-primary/50 bg-primary/5",
        priorityStyles[task.priority]?.bg
      )}>
        <CardHeader className="flex flex-row items-start justify-between gap-2 p-3 pb-2">
          <div className="flex items-start gap-2">
            {task.isMilestone && (
              <Milestone className="h-4 w-4 mt-1 flex-shrink-0 text-primary" />
            )}
            <div className="flex flex-col gap-1">
              <h3 className={cn(
                "text-base font-medium line-clamp-2",
                task.status === 'done' && "line-through opacity-70"
              )}>
                {task.title}
              </h3>
              <div className="flex flex-wrap gap-1.5 items-center">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs px-1.5 py-0", 
                    priorityStyles[task.priority]?.text
                  )}
                >
                  {priorityStyles[task.priority]?.icon}
                  <span className="ml-1">{task.priority}</span>
                </Badge>
                
                {task.tags?.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {task.tags.slice(0, 2).join(', ')}
                      {task.tags.length > 2 && '...'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                Edit
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={toggleTimeTracking}>
                {isTimeTrackingActive ? 'Stop Timer' : 'Start Timer'}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                disabled={task.status === 'todo'} 
                onClick={() => moveTask('todo')}
              >
                Move to To-Do
              </DropdownMenuItem>
              <DropdownMenuItem 
                disabled={task.status === 'in-progress'} 
                onClick={() => moveTask('in-progress')}
              >
                Move to In Progress
              </DropdownMenuItem>
              <DropdownMenuItem 
                disabled={task.status === 'on-hold'} 
                onClick={() => moveTask('on-hold')}
              >
                Move to On Hold
              </DropdownMenuItem>
              <DropdownMenuItem 
                disabled={task.status === 'done'} 
                onClick={() => moveTask('done')}
              >
                Mark as Done
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={deleteTask} 
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        
        <CardContent className="px-3 pb-3 pt-0 space-y-2">
          {task.description && (
            <p className={cn(
              "text-xs text-muted-foreground line-clamp-2", 
              task.status === 'done' && "opacity-70"
            )}>
              {task.description}
            </p>
          )}
          
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Progress: {task.progress}%
              </span>
              {isTimeTrackingActive && (
                <span className="text-xs font-medium text-primary animate-pulse flex items-center">
                  <Clock className="h-3 w-3 mr-1" /> Recording...
                </span>
              )}
            </div>
            <Progress value={task.progress} className="h-1.5" />
          </div>
          
          <div className="flex flex-col gap-1.5 pt-1 text-xs">
            {formatDueDate()}
            
            {((task.timeTracking?.totalTime ?? 0) > 0 || isTimeTrackingActive) && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {formatTimeSpent(task.timeTracking?.totalTime || 0)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <EditTaskForm 
            task={task}
            onComplete={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}