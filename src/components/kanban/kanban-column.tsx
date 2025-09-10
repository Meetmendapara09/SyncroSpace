
import { ScrollArea } from '../ui/scroll-area';
import { KanbanCard } from './kanban-card';
import { Task } from './kanban-board';

interface KanbanColumnProps {
  title: string;
  status: string;
  tasks: Task[];
  children?: React.ReactNode;
}

export function KanbanColumn({ title, tasks, children }: KanbanColumnProps) {
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
          {tasks.map(task => (
            <KanbanCard key={task.id} task={task} />
          ))}
           {children}
        </div>
      </ScrollArea>
    </div>
  );
}
