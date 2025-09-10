
'use client';

import { KanbanBoard } from '@/components/kanban/kanban-board';
import { TaskList } from '@/components/kanban/task-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Kanban, List } from 'lucide-react';

export default function BoardPage() {
  return (
    <div className="h-full flex flex-col">
      <header className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
                <p className="text-muted-foreground">
                    Organize your work and track progress. Choose your preferred view.
                </p>
            </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8">
         <Tabs defaultValue="board" className="flex flex-col h-full">
            <TabsList className="mb-4 self-start">
                <TabsTrigger value="board">
                    <Kanban className="mr-2 h-4 w-4" />
                    Board
                </TabsTrigger>
                <TabsTrigger value="list">
                    <List className="mr-2 h-4 w-4" />
                    List
                </TabsTrigger>
            </TabsList>
            <TabsContent value="board" className="flex-1 overflow-x-auto">
                <KanbanBoard />
            </TabsContent>
            <TabsContent value="list" className="flex-1">
                <TaskList />
            </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
