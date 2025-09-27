'use client';

import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EnhancedTask, TaskPriority } from './task-types';
import { 
  BarChart3, 
  CheckCircle, 
  Clock, 
  PieChart, 
  AlertTriangle,
  Target,
  CalendarDays
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { format, isPast, isThisWeek, isThisMonth, addDays } from 'date-fns';

export function TaskProgressView() {
  const [user] = useAuthState(auth);
  
  // Get personal tasks for the current user
  const [personalTasks, loading, error] = useCollection(
    user ? query(
      collection(db, 'tasks'),
      where('assignee', '==', user.uid)
    ) : null
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px]" />
                <Skeleton className="h-3 w-[100px] mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[350px]" />
          <Skeleton className="h-[350px]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[200px]">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Error loading tasks</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tasks = personalTasks?.docs?.map(doc => ({ id: doc.id, ...doc.data() })) as EnhancedTask[] || [];
  
  // Calculate task statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;
  const todoTasks = tasks.filter(task => task.status === 'todo').length;
  const onHoldTasks = tasks.filter(task => task.status === 'on-hold').length;
  
  const overdueTasks = tasks.filter(task => 
    task.dueDate && isPast(task.dueDate.toDate()) && task.status !== 'done'
  ).length;
  
    const upcomingTasks = tasks.filter(task => 
    task.dueDate && isThisWeek(task.dueDate.toDate())
  ).length;
  
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Priority distribution
  const highPriorityTasks = tasks.filter(task => task.priority === 'high').length;
  const mediumPriorityTasks = tasks.filter(task => task.priority === 'medium').length;
  const lowPriorityTasks = tasks.filter(task => task.priority === 'low').length;

  const statusData = [
    { name: 'Completed', value: completedTasks, color: 'bg-green-500' },
    { name: 'In Progress', value: inProgressTasks, color: 'bg-blue-500' },
    { name: 'Todo', value: todoTasks, color: 'bg-gray-500' },
    { name: 'On Hold', value: onHoldTasks, color: 'bg-yellow-500' }
  ];

  const priorityData = [
    { name: 'High', value: highPriorityTasks, color: 'bg-red-500' },
    { name: 'Medium', value: mediumPriorityTasks, color: 'bg-yellow-500' },
    { name: 'Low', value: lowPriorityTasks, color: 'bg-green-500' }
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {completedTasks} completed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueTasks}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingTasks}</div>
            <p className="text-xs text-muted-foreground">
              Due this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Task Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Task Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusData.map((status, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{status.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {status.value} ({totalTasks > 0 ? Math.round((status.value / totalTasks) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${status.color}`}
                      style={{ width: `${totalTasks > 0 ? (status.value / totalTasks) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Priority Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {priorityData.map((priority, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{priority.name}</span>
                      <Badge 
                        className={cn(
                          "text-xs",
                          priority.name === 'High' && "bg-red-100 text-red-800",
                          priority.name === 'Medium' && "bg-yellow-100 text-yellow-800",
                          priority.name === 'Low' && "bg-green-100 text-green-800"
                        )}
                      >
                        {priority.value}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {totalTasks > 0 ? Math.round((priority.value / totalTasks) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${priority.color}`}
                      style={{ width: `${totalTasks > 0 ? (priority.value / totalTasks) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Recent Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tasks
              .sort((a, b) => (b.updatedAt || b.createdAt).toDate().getTime() - (a.updatedAt || a.createdAt).toDate().getTime())
              .slice(0, 5)
              .map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      task.status === 'done' && "bg-green-500",
                      task.status === 'in-progress' && "bg-blue-500",
                      task.status === 'todo' && "bg-gray-500",
                      task.status === 'on-hold' && "bg-yellow-500"
                    )} />
                    <div>
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.dueDate && format(task.dueDate.toDate(), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={cn(
                        "text-xs",
                        task.priority === 'high' && "bg-red-100 text-red-800",
                        task.priority === 'medium' && "bg-yellow-100 text-yellow-800",
                        task.priority === 'low' && "bg-green-100 text-green-800"
                      )}
                    >
                      {task.priority}
                    </Badge>
                    <Badge className="text-xs capitalize">
                      {task.status}
                    </Badge>
                  </div>
                </div>
              ))}
            
            {tasks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No tasks found. Create your first task to get started!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}