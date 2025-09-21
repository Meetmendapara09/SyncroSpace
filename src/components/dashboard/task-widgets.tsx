'use client';

import * as React from 'react';
import { Widget } from '@/components/dashboard/widget';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { useCollection, useDocumentData } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, limit, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, isPast, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { EnhancedTask } from '../tasks/task-types';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface TaskWidgetProps {
  id: string;
  size: 'small' | 'medium' | 'large' | 'full';
  title: string;
  isEditing: boolean;
  isMoving: boolean;
  onRemove: (id: string) => void;
  onSizeChange?: (id: string, size: string) => void;
}

export function UpcomingTasksWidget({
  id,
  size,
  title,
  isEditing,
  isMoving,
  onRemove,
  onSizeChange,
}: TaskWidgetProps) {
  const [user] = useAuthState(auth);
  const [tab, setTab] = React.useState<'upcoming' | 'overdue'>('upcoming');
  
  // Query for tasks
  const tasksQuery = user ? 
    query(
      collection(db, 'personalTasks'),
      where('userId', '==', user.uid),
      where('status', 'in', ['todo', 'in-progress', 'on-hold']),
      orderBy('dueDate'),
      limit(10)
    ) : null;
    
  const [snapshot, loading, error] = useCollection(tasksQuery);

  // Extract tasks
  const tasks = React.useMemo(() => {
    if (!snapshot) return [];
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EnhancedTask[];
  }, [snapshot]);

  // Filter tasks
  const overdueTasks = React.useMemo(() => {
    return tasks.filter(task => 
      task.dueDate && isPast(task.dueDate.toDate()) && !isToday(task.dueDate.toDate())
    );
  }, [tasks]);

  const upcomingTasks = React.useMemo(() => {
    return tasks.filter(task => 
      task.dueDate && 
      (isToday(task.dueDate.toDate()) || 
       isTomorrow(task.dueDate.toDate()) ||
       isThisWeek(task.dueDate.toDate()))
    );
  }, [tasks]);

  // Format due date
  const formatDueDate = (dueDate: any) => {
    const date = dueDate.toDate();
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isThisWeek(date)) return format(date, 'EEEE'); // Day name
    return format(date, 'MMM d'); // Month day
  };

  // Priority badges
  const getPriorityBadge = (priority: string) => {
    switch(priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-amber-500">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  return (
    <Widget
      id={id}
      type="tasks"
      title={title}
      size={size}
      isEditing={isEditing}
      isMoving={isMoving}
      onRemove={onRemove}
      onSizeChange={onSizeChange}
    >
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
          <p>Error loading tasks</p>
        </div>
      ) : (
        <>
          {overdueTasks.length > 0 || upcomingTasks.length > 0 ? (
            <Tabs value={tab} onValueChange={(value) => setTab(value as any)} className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="upcoming" className="flex-1">
                  Upcoming ({upcomingTasks.length})
                </TabsTrigger>
                <TabsTrigger value="overdue" className="flex-1">
                  Overdue ({overdueTasks.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="pt-4 space-y-3">
                {upcomingTasks.length > 0 ? (
                  upcomingTasks.map((task) => (
                    <div key={task.id} className="border rounded-lg p-3 shadow-sm">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">{task.title}</h4>
                        {getPriorityBadge(task.priority)}
                      </div>
                      
                      <div className="flex gap-3 mt-2 text-xs text-muted-foreground items-center">
                        <div className={cn(
                          "flex items-center gap-1",
                          task.dueDate && isToday(task.dueDate.toDate()) && "text-amber-500",
                        )}>
                          <Clock className="h-3 w-3" />
                          {task.dueDate && formatDueDate(task.dueDate)}
                        </div>
                        <Progress value={task.progress} className="h-1.5 flex-1" />
                        <span>{task.progress}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    No upcoming tasks
                  </p>
                )}
              </TabsContent>

              <TabsContent value="overdue" className="pt-4 space-y-3">
                {overdueTasks.length > 0 ? (
                  overdueTasks.map((task) => (
                    <div key={task.id} className="border rounded-lg p-3 shadow-sm border-destructive/30 bg-destructive/5">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">{task.title}</h4>
                        {getPriorityBadge(task.priority)}
                      </div>
                      
                      <div className="flex gap-3 mt-2 text-xs items-center">
                        <div className="flex items-center gap-1 text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          Due {task.dueDate ? format(task.dueDate.toDate(), 'MMM d') : 'unknown'}
                        </div>
                        <Progress value={task.progress} className="h-1.5 flex-1" />
                        <span>{task.progress}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    No overdue tasks
                  </p>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-6">
              <CheckCircle2 className="h-10 w-10 text-primary/50 mb-2" />
              <p className="text-center text-muted-foreground">All caught up!</p>
              <p className="text-center text-xs text-muted-foreground">
                No upcoming or overdue tasks
              </p>
            </div>
          )}
        </>
      )}
    </Widget>
  );
}