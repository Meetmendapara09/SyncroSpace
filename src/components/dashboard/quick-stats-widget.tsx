'use client';

import * as React from 'react';
import { Widget } from '@/components/dashboard/widget';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { useCollection, useDocumentData } from 'react-firebase-hooks/firestore';
import { collection, query, where, doc, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, 
  ArrowUpRight, 
  ArrowDownRight, 
  Users, 
  MessageCircle, 
  CheckCircle2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickStatsWidgetProps {
  id: string;
  size: 'small' | 'medium' | 'large' | 'full';
  title: string;
  isEditing: boolean;
  isMoving: boolean;
  onRemove: (id: string) => void;
  onSizeChange?: (id: string, size: string) => void;
}

export function QuickStatsWidget({
  id,
  size,
  title,
  isEditing,
  isMoving,
  onRemove,
  onSizeChange,
}: QuickStatsWidgetProps) {
  const [user] = useAuthState(auth);
  
  // Get user document
  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData, userLoading] = useDocumentData(userDocRef);
  
  // Tasks stats
  const taskQuery = user ? 
    query(
      collection(db, 'personalTasks'),
      where('userId', '==', user.uid)
    ) : null;
    
  const [taskSnapshot, taskLoading] = useCollection(taskQuery);
  
  // Messages stats
  const messageQuery = user ? 
    query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    ) : null;
    
  const [messageSnapshot, messageLoading] = useCollection(messageQuery);
  
  // Team stats
  const teamQuery = user && userData?.teams ? 
    query(
      collection(db, 'teams'),
      where('name', 'in', userData.teams)
    ) : null;
    
  const [teamSnapshot, teamLoading] = useCollection(teamQuery);
  
  // Calculate task stats
  const taskStats = React.useMemo(() => {
    if (!taskSnapshot) return { total: 0, completed: 0, overdue: 0 };
    
    const tasks = taskSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const total = tasks.length;
    const completed = tasks.filter((task: any) => task.status === 'done').length;
    const overdue = tasks.filter((task: any) => 
      task.dueDate && 
      task.dueDate.toDate() < new Date() &&
      task.status !== 'done'
    ).length;
    
    // Calculate completion rate change
    let changeRate = 0;
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const completedThisWeek = tasks.filter((task: any) => 
      task.status === 'done' && 
      task.updatedAt && 
      task.updatedAt.toDate() > lastWeek
    ).length;
    
    const completedEarlier = tasks.filter((task: any) => 
      task.status === 'done' && 
      task.updatedAt && 
      task.updatedAt.toDate() <= lastWeek
    ).length;
    
    // Only calculate change rate if there are enough data points
    if (completedEarlier > 0) {
      changeRate = Math.round(((completedThisWeek - completedEarlier) / completedEarlier) * 100);
    }
    
    return { 
      total, 
      completed, 
      overdue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      changeRate
    };
  }, [taskSnapshot]);

  // Calculate message stats
  const messageStats = React.useMemo(() => {
    if (!messageSnapshot) return { total: 0, unread: 0 };
    
    const conversations = messageSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const total = conversations.length;
    
    // Check for unread flag in user's message state
    const unread = conversations.filter((convo: any) => {
      if (!user || !user.uid || !convo.messageState) return false;
      const userMessageState = convo.messageState[user.uid];
      return userMessageState && userMessageState.unreadCount > 0;
    }).length;
    
    return { total, unread };
  }, [messageSnapshot, user]);

  // Calculate team stats
  const teamStats = React.useMemo(() => {
    if (!teamSnapshot) return { total: 0, members: 0, activeProjects: 0 };
    
    const teams = teamSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const total = teams.length;
    
    // Sum members across all teams
    const members = teams.reduce((sum: number, team: any) => {
      return sum + (team.members?.length || 0);
    }, 0);
    
    // Count active projects
    const activeProjects = teams.reduce((sum: number, team: any) => {
      return sum + (team.projects?.filter((p: any) => p.status === 'active')?.length || 0);
    }, 0);
    
    return { total, members, activeProjects };
  }, [teamSnapshot]);

  const loading = userLoading || taskLoading || messageLoading || teamLoading;

  return (
    <Widget
      id={id}
      type="stats"
      title={title}
      size={size}
      isEditing={isEditing}
      isMoving={isMoving}
      onRemove={onRemove}
      onSizeChange={onSizeChange}
    >
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className={cn(
          "grid gap-4",
          size === 'small' && "grid-cols-2",
          size === 'medium' && "grid-cols-2",
          size === 'large' && "grid-cols-3",
          size === 'full' && "grid-cols-4",
        )}>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Tasks Completion</p>
            <p className="text-2xl font-bold">{taskStats.completionRate}%</p>
            <div className={cn(
              "flex items-center text-xs",
              (taskStats.changeRate || 0) >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {(taskStats.changeRate || 0) >= 0 ? (
                <ArrowUpRight className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-1" />
              )}
              {Math.abs(taskStats.changeRate || 0)}% from last week
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Overdue Tasks</p>
            <p className="text-2xl font-bold">{taskStats.overdue}</p>
            <div className="text-xs text-muted-foreground">
              of {taskStats.total} total tasks
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Teams</p>
            <p className="text-2xl font-bold">{teamStats.total}</p>
            <div className="flex items-center text-xs text-muted-foreground">
              <Users className="h-3 w-3 mr-1" />
              {teamStats.members} members
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Unread Messages</p>
            <p className="text-2xl font-bold">{messageStats.unread}</p>
            <div className="flex items-center text-xs text-muted-foreground">
              <MessageCircle className="h-3 w-3 mr-1" />
              {messageStats.total} conversations
            </div>
          </div>
          
          {size === 'large' || size === 'full' ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Active Projects</p>
              <p className="text-2xl font-bold">{teamStats.activeProjects}</p>
              <div className="text-xs text-muted-foreground">
                across all teams
              </div>
            </div>
          ) : null}
          
          {size === 'large' || size === 'full' ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Completed Tasks</p>
              <p className="text-2xl font-bold">{taskStats.completed}</p>
              <div className="flex items-center text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {taskStats.completed > 0 && taskStats.total > 0 ? 
                  Math.round((taskStats.completed / taskStats.total) * 100) : 0}% completion rate
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Widget>
  );
}