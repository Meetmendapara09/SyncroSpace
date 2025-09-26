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
  const personalTasksQuery = user ? 
    query(
      collection(db, 'personalTasks'),
      where('userId', '==', user.uid),
    ) : null;
    
  const [tasksSnapshot, loading, error] = useCollection(personalTasksQuery);

  // Convert to task objects
  const tasks = tasksSnapshot?.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  })) as EnhancedTask[] | undefined;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading tasks: {error.message}</p>;
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <h3 className="text-xl font-medium mb-2">No tasks found</h3>
          <p className="text-muted-foreground">Create tasks to see progress analytics.</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const averageProgress = tasks.length > 0
    ? Math.round(tasks.reduce((acc, task) => acc + task.progress, 0) / tasks.length)
    : 0;
    
  const totalTimeSpent = tasks.reduce((acc, task) => acc + (task.timeTracking?.totalTime || 0), 0);
  
  // Format time spent
  const formatTotalTimeSpent = (seconds: number): string => {
    if (seconds < 60) return `${seconds} seconds`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''}${remainingMinutes > 0 ? ` ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}` : ''}`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    return `${days} day${days !== 1 ? 's' : ''}${remainingHours > 0 ? ` ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}` : ''}`;
  };

  // Status distribution for pie chart
  const statusCount = tasks.reduce((acc: Record<string, number>, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {});
  
  const statusData = Object.entries(statusCount).map(([status, count]) => ({
    name: status === 'in-progress' ? 'In Progress' : 
          status === 'on-hold' ? 'On Hold' : 
          status.charAt(0).toUpperCase() + status.slice(1),
    value: count
  }));
  
  // Priority distribution
  const priorityCount = tasks.reduce((acc: Record<TaskPriority, number>, task) => {
    acc[task.priority] = (acc[task.priority] || 0) + 1;
    return acc;
  }, {} as Record<TaskPriority, number>);
  
  const priorityData = Object.entries(priorityCount).map(([priority, count]) => ({
    name: priority.charAt(0).toUpperCase() + priority.slice(1),
    count
  }));
  
  // Time spent data for bar chart
  // Group time by day for the last 7 days
  const timeByDay: Record<string, number> = {};
  
  // Initialize with zero values for last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = addDays(new Date(), -i);
    const dateKey = format(date, 'yyyy-MM-dd');
    timeByDay[dateKey] = 0;
  }
  
  // Sum up time entries
  tasks.forEach(task => {
    if (!task.timeTracking?.timeEntries) return;
    
    task.timeTracking.timeEntries.forEach(entry => {
      if (!entry.startTime || !entry.endTime || !entry.duration) return;
      
      const entryDate = format(entry.startTime.toDate(), 'yyyy-MM-dd');
      if (timeByDay[entryDate] !== undefined) {
        timeByDay[entryDate] += entry.duration;
      }
    });
  });
  
  // Format for chart
  const timeData = Object.entries(timeByDay).map(([date, seconds]) => ({
    date: format(new Date(date), 'MMM d'),
    hours: Math.round((seconds / 3600) * 100) / 100 // Convert to hours with 2 decimal places
  }));

  // Due date distribution
  const now = new Date();
  const overdueTasks = tasks.filter(task => 
    task.dueDate && 
    isPast(task.dueDate.toDate()) && 
    task.status !== 'done'
  ).length;
  
  const dueSoonTasks = tasks.filter(task => 
    task.dueDate && 
    !isPast(task.dueDate.toDate()) &&
    isPast(addDays(task.dueDate.toDate(), -3)) &&
    task.status !== 'done'
  ).length;
  
  const dueThisWeekTasks = tasks.filter(task => 
    task.dueDate && 
    isThisWeek(task.dueDate.toDate()) && 
    !isPast(task.dueDate.toDate()) &&
    !isPast(addDays(task.dueDate.toDate(), -3)) &&
    task.status !== 'done'
  ).length;
  
  const dueThisMonthTasks = tasks.filter(task => 
    task.dueDate && 
    isThisMonth(task.dueDate.toDate()) && 
    !isThisWeek(task.dueDate.toDate()) &&
    task.status !== 'done'
  ).length;
  
  // Colors for charts
  const statusColors = {
    'todo': '#9333ea', // Purple
    'in-progress': '#3b82f6', // Blue
    'on-hold': '#f59e0b', // Amber
    'done': '#10b981', // Emerald
  };
  
  const priorityColors = {
    'urgent': '#ef4444', // Red
    'high': '#f59e0b', // Amber
    'medium': '#3b82f6', // Blue
    'low': '#10b981', // Emerald
  };
  
  const COLORS = ['#9333ea', '#3b82f6', '#f59e0b', '#10b981', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Target className="h-4 w-4 mr-2 text-primary" />
              Task Completion
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-2xl font-bold">
              {completedTasks}/{totalTasks}
            </div>
            <div className="mt-2">
              <Progress value={completionRate} className="h-2" />
              <p className="text-xs mt-1 text-muted-foreground">
                {completionRate}% completion rate
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <BarChart3 className="h-4 w-4 mr-2 text-primary" />
              Average Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-2xl font-bold">
              {averageProgress}%
            </div>
            <div className="mt-2">
              <Progress value={averageProgress} className="h-2" />
              <p className="text-xs mt-1 text-muted-foreground">
                Average across all tasks
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2 text-primary" />
              Time Spent
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-2xl font-bold">
              {formatTotalTimeSpent(totalTimeSpent)}
            </div>
            <p className="text-xs mt-1 text-muted-foreground">
              Total tracked time on all tasks
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2 text-primary" />
              Upcoming Due Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            {overdueTasks > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-500 font-medium">Overdue</span>
                <Badge variant="destructive">{overdueTasks}</Badge>
              </div>
            )}
            
            {dueSoonTasks > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-500 font-medium">Due Soon (3 days)</span>
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                  {dueSoonTasks}
                </Badge>
              </div>
            )}
            
            {dueThisWeekTasks > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm">This Week</span>
                <Badge variant="outline">{dueThisWeekTasks}</Badge>
              </div>
            )}
            
            {dueThisMonthTasks > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm">This Month</span>
                <Badge variant="outline">{dueThisMonthTasks}</Badge>
              </div>
            )}
            
            {overdueTasks === 0 && dueSoonTasks === 0 && dueThisWeekTasks === 0 && dueThisMonthTasks === 0 && (
              <div className="text-sm text-muted-foreground">No upcoming due dates</div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Task Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => {
                      const status = entry.name.toLowerCase();
                      const color = statusColors[status === 'in progress' ? 'in-progress' : 
                                                status === 'on hold' ? 'on-hold' : 
                                                status.toLowerCase() as keyof typeof statusColors] || COLORS[index % COLORS.length];
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Time Tracking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarDays className="h-5 w-5 mr-2" />
              Time Tracked (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timeData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => [`${value} hours`, 'Time Spent']} />
                  <Legend />
                  <Bar dataKey="hours" fill="#3b82f6" name="Hours Tracked" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Priority Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Task Priority Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[100px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={priorityData}
                layout="vertical"
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="count" 
                  name="Number of Tasks" 
                  background={{ fill: '#eee' }}
                >
                  {priorityData.map((entry, index) => {
                    const priority = entry.name.toLowerCase() as keyof typeof priorityColors;
                    return <Cell key={`cell-${index}`} fill={priorityColors[priority]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {Object.entries(priorityColors).map(([priority, color]) => (
              <Badge 
                key={priority} 
                variant="outline"
                className="flex items-center gap-1"
                style={{ backgroundColor: color + '20', color, borderColor: color + '40' }}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}