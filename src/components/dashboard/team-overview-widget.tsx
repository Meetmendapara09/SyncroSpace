'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Users, Plus, TrendingUp, Calendar, Target } from 'lucide-react';
import Link from 'next/link';

interface TeamOverviewWidgetProps {
  size?: 'small' | 'medium' | 'large';
}

export function TeamOverviewWidget({ size = 'medium' }: TeamOverviewWidgetProps) {
  const [user] = useAuthState(auth);
  const [teams, setTeams] = React.useState<any[]>([]);
  const [recentActivities, setRecentActivities] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;

    // Fetch user's teams
    const teamsQuery = query(
      collection(db, 'teams'),
      where('members', 'array-contains', user.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribeTeams = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeams(teamsData);
    });

    // Fetch recent team activities (tasks, goals, etc.)
    const activitiesQuery = query(
      collection(db, 'teamTasks'),
      where('assignees', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc'),
      limit(3)
    );

    const unsubscribeActivities = onSnapshot(activitiesQuery, (snapshot) => {
      const activitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'task'
      }));
      setRecentActivities(activitiesData);
      setLoading(false);
    });

    return () => {
      unsubscribeTeams();
      unsubscribeActivities();
    };
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Overview
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/teams">
              <Plus className="h-4 w-4 mr-1" />
              Manage
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Teams Summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Active Teams</span>
          </div>
          <Badge variant="secondary">{teams.length}</Badge>
        </div>

        {/* Recent Teams */}
        {teams.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Your Teams</h4>
            <div className="space-y-2">
              {teams.slice(0, size === 'small' ? 2 : 3).map((team) => (
                <div key={team.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={team.avatar} />
                      <AvatarFallback className="text-xs">
                        {team.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{team.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {team.members?.length || 0} members
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activities */}
        {recentActivities.length > 0 && size !== 'small' && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Recent Activity</h4>
            <div className="space-y-2">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  <Target className="h-4 w-4 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.status} • {activity.priority}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link href="/teams">
              <Users className="h-4 w-4 mr-1" />
              View Teams
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link href="/calendar">
              <Calendar className="h-4 w-4 mr-1" />
              Team Calendar
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}