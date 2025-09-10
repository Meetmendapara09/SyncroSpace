
'use client';

import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { KanbanColumn } from './kanban-column';
import { Skeleton } from '../ui/skeleton';
import { CreateTaskDialog } from './create-task-dialog';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: any;
  isMilestone?: boolean;
}

const columns: { title: string; status: TaskStatus }[] = [
  { title: 'To-Do', status: 'todo' },
  { title: 'In Progress', status: 'in-progress' },
  { title: 'Done', status: 'done' },
];

export function KanbanBoard() {
  const [tasksSnapshot, loading, error] = useCollection(
    query(collection(db, 'tasks'), orderBy('createdAt', 'desc'))
  );

  const tasks = tasksSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[] | undefined;

  const getTasksByStatus = (status: TaskStatus) => {
    if (!tasks) return [];
    return tasks.filter(task => task.status === status);
  };
  
  return (
    <div className="flex h-full min-h-[600px] items-start gap-6">
       {loading && [...Array(3)].map((_, i) => (
            <div key={i} className="flex h-full w-80 flex-col gap-4 rounded-lg bg-muted/50 p-4">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
       ))}
      {!loading && columns.map(column => (
        <KanbanColumn
          key={column.status}
          title={column.title}
          status={column.status}
          tasks={getTasksByStatus(column.status)}
        >
             {column.status === 'todo' && <CreateTaskDialog />}
        </KanbanColumn>
      ))}
       {error && <p className="text-destructive mt-4">Error loading tasks: {error.message}</p>}
    </div>
  );
}
