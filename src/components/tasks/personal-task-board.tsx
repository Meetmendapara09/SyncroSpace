'use client';

import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { PersonalTaskColumn } from './personal-task-column';
import { Skeleton } from '../ui/skeleton';
import { EnhancedTask, TaskStatus } from './task-types';

const columns: { title: string; status: TaskStatus }[] = [
  { title: 'To-Do', status: 'todo' },
  { title: 'In Progress', status: 'in-progress' },
  { title: 'On Hold', status: 'on-hold' },
  { title: 'Done', status: 'done' },
];

export function PersonalTaskBoard() {
  const [user] = useAuthState(auth);
  
  const personalTasksQuery = user ? 
    query(
      collection(db, 'personalTasks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    ) : null;
    
  const [tasksSnapshot, loading, error] = useCollection(personalTasksQuery);

  const tasks = tasksSnapshot?.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  })) as EnhancedTask[] | undefined;

  const getTasksByStatus = (status: TaskStatus) => {
    if (!tasks) return [];
    return tasks.filter(task => task.status === status);
  };
  
  return (
    <div className="flex h-full min-h-[600px] items-start gap-6 pb-6 overflow-x-auto">
      {loading && [...Array(4)].map((_, i) => (
        <div key={i} className="flex h-full w-80 flex-col gap-4 rounded-lg bg-muted/50 p-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
      
      {!loading && columns.map(column => (
        <PersonalTaskColumn
          key={column.status}
          title={column.title}
          status={column.status}
          tasks={getTasksByStatus(column.status)}
        />
      ))}
      
      {error && <p className="text-destructive mt-4">Error loading tasks: {error.message}</p>}
    </div>
  );
}