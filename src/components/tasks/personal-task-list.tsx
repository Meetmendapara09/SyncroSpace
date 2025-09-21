'use client';

import { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, ArrowUpDown, Search, Tag } from 'lucide-react';
import { EnhancedTask, TaskPriority } from './task-types';
import { format, isPast } from 'date-fns';
import { PersonalTaskCard } from './personal-task-card';
import { cn } from '@/lib/utils';

type SortField = 'priority' | 'dueDate' | 'progress' | 'timeSpent' | 'createdAt';
type SortDirection = 'asc' | 'desc';

// Priority level for sorting
const priorityLevel: Record<TaskPriority, number> = {
  'urgent': 3,
  'high': 2,
  'medium': 1,
  'low': 0
};

export function PersonalTaskList() {
  const [user] = useAuthState(auth);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterTag, setFilterTag] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<EnhancedTask | null>(null);
  
  // Get personal tasks for current user
  const personalTasksQuery = user ? 
    query(
      collection(db, 'personalTasks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    ) : null;
    
  const [tasksSnapshot, loading, error] = useCollection(personalTasksQuery);

  // Convert to task objects
  const tasks = tasksSnapshot?.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  })) as EnhancedTask[] | undefined;

  // Format time spent on task
  const formatTimeSpent = (seconds: number): string => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`;
  };

  // Filter tasks based on search and tags
  const filteredTasks = tasks?.filter(task => {
    const searchMatch = !searchTerm || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const tagMatch = !filterTag || task.tags?.includes(filterTag);
    
    return searchMatch && tagMatch;
  });

  // Get all unique tags from tasks
  const allTags = tasks ? 
    [...new Set(tasks.flatMap(task => task.tags || []))].sort() : 
    [];

  // Sort tasks
  const sortedTasks = filteredTasks ? [...filteredTasks].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'priority':
        comparison = (priorityLevel[b.priority] || 0) - (priorityLevel[a.priority] || 0);
        break;
      case 'dueDate':
        // Handle tasks without due date
        if (!a.dueDate && !b.dueDate) comparison = 0;
        else if (!a.dueDate) comparison = 1;
        else if (!b.dueDate) comparison = -1;
        else comparison = a.dueDate.toMillis() - b.dueDate.toMillis();
        break;
      case 'progress':
        comparison = a.progress - b.progress;
        break;
      case 'timeSpent':
        comparison = (a.timeTracking?.totalTime || 0) - (b.timeTracking?.totalTime || 0);
        break;
      case 'createdAt':
        comparison = a.createdAt.toMillis() - b.createdAt.toMillis();
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  }) : [];

  // Toggle sort direction or change sort field
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="rounded-lg border">
          <div className="p-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full my-2" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading tasks: {error.message}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search tasks by title, description or tag..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="w-full sm:w-60">
          <select 
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
          >
            <option value="">All Tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedTask && (
        <div className="rounded-lg border p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Task Details</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedTask(null)}>
              Close
            </Button>
          </div>
          <PersonalTaskCard task={selectedTask} />
        </div>
      )}
      
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Task</TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 -ml-3 p-2 h-auto font-semibold"
                  onClick={() => handleSort('priority')}
                >
                  Priority
                  <ArrowUpDown size={14} className={cn(
                    sortField === 'priority' && "text-primary",
                    sortField === 'priority' && sortDirection === 'asc' && "rotate-180"
                  )} />
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 -ml-3 p-2 h-auto font-semibold"
                  onClick={() => handleSort('progress')}
                >
                  Progress
                  <ArrowUpDown size={14} className={cn(
                    sortField === 'progress' && "text-primary",
                    sortField === 'progress' && sortDirection === 'asc' && "rotate-180"
                  )} />
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 -ml-3 p-2 h-auto font-semibold"
                  onClick={() => handleSort('dueDate')}
                >
                  <Calendar size={14} />
                  Due Date
                  <ArrowUpDown size={14} className={cn(
                    sortField === 'dueDate' && "text-primary",
                    sortField === 'dueDate' && sortDirection === 'asc' && "rotate-180"
                  )} />
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 -ml-3 p-2 h-auto font-semibold"
                  onClick={() => handleSort('timeSpent')}
                >
                  <Clock size={14} />
                  Time
                  <ArrowUpDown size={14} className={cn(
                    sortField === 'timeSpent' && "text-primary",
                    sortField === 'timeSpent' && sortDirection === 'asc' && "rotate-180"
                  )} />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks && sortedTasks.length > 0 ? (
              sortedTasks.map(task => (
                <TableRow key={task.id} onClick={() => setSelectedTask(task)} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className={cn(
                        "font-medium", 
                        task.status === 'done' && "line-through opacity-70"
                      )}>
                        {task.title}
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <Badge variant="outline" className="text-xs py-0">{task.status.replace('-', ' ')}</Badge>
                        {task.tags?.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs py-0 flex items-center gap-1">
                            <Tag size={10} />
                            {tag}
                          </Badge>
                        ))}
                        {(task.tags?.length || 0) > 2 && (
                          <Badge variant="secondary" className="text-xs py-0">
                            +{task.tags!.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "capitalize",
                        task.priority === 'urgent' && "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
                        task.priority === 'high' && "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
                        task.priority === 'medium' && "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
                        task.priority === 'low' && "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
                      )}
                    >
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="w-full flex items-center gap-2">
                      <Progress value={task.progress} className="w-full h-2" />
                      <span className="text-xs">{task.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {task.dueDate ? (
                      <span className={cn(
                        "text-sm",
                        isPast(task.dueDate.toDate()) && task.status !== 'done' && "text-red-500 font-medium"
                      )}>
                        {format(task.dueDate.toDate(), 'MMM d, yyyy')}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not set</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {formatTimeSpent(task.timeTracking?.totalTime || 0)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No tasks found. {searchTerm && "Try a different search term."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}