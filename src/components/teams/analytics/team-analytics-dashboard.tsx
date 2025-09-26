'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart,
  ActivitySquare,
  Users,
  CheckSquare,
  Target,
  Clock,
  Calendar,
  FileText,
} from 'lucide-react';
import { TeamPerformanceChart } from './team-performance-chart';
import { ResourceUtilizationChart } from './resource-utilization-chart';
import { TaskCompletionChart } from './task-completion-chart';
import { GoalsProgressTracker } from './goals-progress-tracker';

interface TeamAnalyticsDashboardProps {
  teamId: string;
}

export function TeamAnalyticsDashboard({ teamId }: TeamAnalyticsDashboardProps) {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [timeRange, setTimeRange] = useState('30d'); // 7d, 30d, 90d, 365d
  const [analyticsData, setAnalyticsData] = useState({
    tasksCompleted: 0,
    tasksCreated: 0,
    activeMembers: 0,
    avgCompletionTime: 0,
    resourceUtilization: 0,
    teamPerformance: 0,
    goalsProgress: 0,
    memberActivity: []
  });

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!user || !teamId) return;

      setLoading(true);
      setError(null);

      try {
        // Get team name
        const teamSnapshot = await getDoc(doc(db, 'teams', teamId));
        if (teamSnapshot.exists()) {
          setTeamName(teamSnapshot.data().name);
        }

        // Fetch analytics data from our API endpoint
        const response = await fetch(`/api/teams/${teamId}/analytics?timeRange=${timeRange}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const data = await response.json();
        setAnalyticsData(data);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [user, teamId, timeRange]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading analytics data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-destructive">
            <p>{error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setTimeRange(timeRange)} // Re-fetch data
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Analytics</h2>
          <p className="text-muted-foreground">Performance metrics for {teamName}</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last quarter</SelectItem>
              <SelectItem value="365d">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tasks Completed</p>
                <p className="text-2xl font-bold">{analyticsData.tasksCompleted}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Members</p>
                <p className="text-2xl font-bold">{analyticsData.activeMembers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Completion Time</p>
                <p className="text-2xl font-bold">{analyticsData.avgCompletionTime} hrs</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Goals Progress</p>
                <p className="text-2xl font-bold">{analyticsData.goalsProgress}%</p>
              </div>
              <Target className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="performance">
            <BarChart className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <ActivitySquare className="h-4 w-4 mr-2" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="resources">
            <Users className="h-4 w-4 mr-2" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="goals">
            <Target className="h-4 w-4 mr-2" />
            Goals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>
                Overall team performance metrics over time
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <TeamPerformanceChart teamId={teamId} timeRange={timeRange} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Task Completion</CardTitle>
              <CardDescription>
                Completed vs pending tasks over time
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <TaskCompletionChart teamId={teamId} timeRange={timeRange} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle>Resource Utilization</CardTitle>
              <CardDescription>
                How effectively the team is utilizing its resources
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResourceUtilizationChart teamId={teamId} timeRange={timeRange} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals">
          <Card>
            <CardHeader>
              <CardTitle>Goals Progress</CardTitle>
              <CardDescription>
                Progress towards team goals and OKRs
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <GoalsProgressTracker teamId={teamId} timeRange={timeRange} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}