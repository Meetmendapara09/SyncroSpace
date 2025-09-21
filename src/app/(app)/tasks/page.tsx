'use client';

import { useState } from 'react';
import { useCollection, useDocumentData } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Kanban, List, Clock, CheckCircle, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PersonalTaskBoard } from '@/components/tasks/personal-task-board';
import { PersonalTaskList } from '@/components/tasks/personal-task-list';
import { TaskProgressView } from '@/components/tasks/task-progress-view';
import { TaskTimeTrackingView } from '@/components/tasks/task-time-tracking-view';
import { CreatePersonalTaskDialog } from '@/components/tasks/create-personal-task-dialog';

export default function PersonalTasksPage() {
  const [user] = useAuthState(auth);
  const userRef = user ? doc(db, 'users', user.uid) : null;
  const [userData, userLoading] = useDocumentData(userRef);
  const [activeView, setActiveView] = useState('board');
  
  // Get personal tasks for the current user
  const personalTasksQuery = user ? 
    query(
      collection(db, 'personalTasks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    ) : null;
    
  const [tasksSnapshot, loading, error] = useCollection(personalTasksQuery);
  
  return (
    <div className="h-full flex flex-col">
      <header className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
            <p className="text-muted-foreground">
              Manage your personal tasks, track time, and monitor progress.
            </p>
          </div>
          <CreatePersonalTaskDialog />
        </div>
      </header>
      
      <main className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="board" className="flex flex-col h-full" value={activeView} onValueChange={setActiveView}>
          <TabsList className="mb-4 self-start">
            <TabsTrigger value="board">
              <Kanban className="mr-2 h-4 w-4" />
              Board
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="mr-2 h-4 w-4" />
              List
            </TabsTrigger>
            <TabsTrigger value="time">
              <Clock className="mr-2 h-4 w-4" />
              Time Tracking
            </TabsTrigger>
            <TabsTrigger value="progress">
              <BarChart3 className="mr-2 h-4 w-4" />
              Progress
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="board" className="flex-1 overflow-x-auto">
            <PersonalTaskBoard />
          </TabsContent>
          
          <TabsContent value="list" className="flex-1">
            <PersonalTaskList />
          </TabsContent>
          
          <TabsContent value="time" className="flex-1">
            <TaskTimeTrackingView />
          </TabsContent>
          
          <TabsContent value="progress" className="flex-1">
            <TaskProgressView />
          </TabsContent>
        </Tabs>
      </main>
      
      {error && (
        <Card className="mx-4 mb-4 border-destructive bg-destructive/10">
          <CardContent className="py-4">
            <p className="text-destructive">Error loading tasks: {error.message}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}