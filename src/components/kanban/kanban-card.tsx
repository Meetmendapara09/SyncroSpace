
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Task } from './kanban-board';
import { Milestone, MoreHorizontal } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function KanbanCard({ task }: { task: Task }) {
  const { toast } = useToast();

  const moveTask = async (newStatus: Task['status']) => {
    const taskRef = doc(db, 'tasks', task.id);
    try {
      await updateDoc(taskRef, { status: newStatus });
      toast({
        title: 'Task Moved',
        description: `Task "${task.title}" moved to ${newStatus}.`
      })
    } catch(error: any) {
        toast({
            variant: 'destructive',
            title: 'Error moving task',
            description: error.message,
        })
    }
  };

  const deleteTask = async () => {
    const taskRef = doc(db, 'tasks', task.id);
    try {
      await deleteDoc(taskRef);
      toast({
        title: 'Task Deleted',
        description: `Task "${task.title}" has been deleted.`
      })
    } catch(error: any) {
        toast({
            variant: 'destructive',
            title: 'Error deleting task',
            description: error.message,
        })
    }
  }

  return (
    <Card className={cn("shadow-sm hover:shadow-md transition-shadow duration-200", task.isMilestone && "border-primary/50 bg-primary/5")}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 p-4">
        <div className="flex items-start gap-2">
            {task.isMilestone && <Milestone className="h-4 w-4 mt-1 flex-shrink-0 text-primary" />}
            <CardTitle className="text-base font-medium">{task.title}</CardTitle>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {task.status !== 'todo' && <DropdownMenuItem onClick={() => moveTask('todo')}>Move to To-Do</DropdownMenuItem>}
            {task.status !== 'in-progress' && <DropdownMenuItem onClick={() => moveTask('in-progress')}>Move to In Progress</DropdownMenuItem>}
            {task.status !== 'done' && <DropdownMenuItem onClick={() => moveTask('done')}>Move to Done</DropdownMenuItem>}
            <DropdownMenuItem onClick={deleteTask} className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      {task.description && (
         <CardContent className="p-4 pt-0">
            <p className="text-sm text-muted-foreground">{task.description}</p>
         </CardContent>
      )}
    </Card>
  );
}
