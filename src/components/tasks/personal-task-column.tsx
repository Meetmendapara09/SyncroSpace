'use client';

import { ScrollArea } from '../ui/scroll-area';
import { PersonalTaskCard } from './personal-task-card';
import { EnhancedTask, TaskStatus } from './task-types';

interface PersonalTaskColumnProps {
  title: string;
  status: TaskStatus;
  tasks: EnhancedTask[];
}

export function PersonalTaskColumn({ title, status, tasks }: PersonalTaskColumnProps) {
  // Group tasks by priority first, then sort within each priority group
  const priorityOrder = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3 };
  
  const sortedTasks = [...tasks].sort((a, b) => {
    // First sort by priority
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then sort by due date if available
    if (a.dueDate && b.dueDate) {
      return a.dueDate.toMillis() - b.dueDate.toMillis();
    }
    
    // Fall back to creation date
    return a.createdAt.toMillis() - b.createdAt.toMillis();
  });

  return (
    <div className="flex h-full w-80 flex-shrink-0 flex-col rounded-lg bg-muted/50">
      <header className="flex items-center justify-between rounded-t-lg border-b bg-muted p-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
          {tasks.length}
        </span>
      </header>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-4">
          {sortedTasks.map(task => (
            <PersonalTaskCard key={task.id} task={task} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}