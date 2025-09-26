'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number;
  dueDate: string;
  status: 'on-track' | 'at-risk' | 'completed' | 'not-started';
}

interface GoalsProgressTrackerProps {
  teamId: string;
  timeRange: string;
}

export function GoalsProgressTracker({ teamId, timeRange }: GoalsProgressTrackerProps) {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    const fetchGoalsData = async () => {
      if (!user || !teamId) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch goals data from our API endpoint
        const response = await fetch(`/api/teams/${teamId}/analytics/goalsProgress?timeRange=${timeRange}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch goals progress data');
        }

        const data = await response.json();
        setGoals(data.goals || []);
      } catch (err) {
        console.error('Error fetching goals progress data:', err);
        setError('Failed to load goals data');
        
        // Fallback to sample data for development purposes
        setGoals(getSampleData());
      } finally {
        setLoading(false);
      }
    };

    fetchGoalsData();
  }, [user, teamId, timeRange]);

  const getSampleData = (): Goal[] => {
    // Generate sample data for development/demo purposes
    return [
      {
        id: '1',
        title: 'Increase Team Productivity',
        description: 'Improve team productivity by 15% through better task management and resource allocation',
        progress: 68,
        dueDate: '2023-12-15',
        status: 'on-track'
      },
      {
        id: '2',
        title: 'Reduce Project Delivery Time',
        description: 'Reduce average project delivery time by 10% through process optimization',
        progress: 42,
        dueDate: '2023-11-30',
        status: 'at-risk'
      },
      {
        id: '3',
        title: 'Complete Team Training Program',
        description: 'Ensure all team members complete the required training modules',
        progress: 100,
        dueDate: '2023-10-15',
        status: 'completed'
      },
      {
        id: '4',
        title: 'Improve Code Quality Metrics',
        description: 'Increase test coverage and reduce technical debt across all repositories',
        progress: 75,
        dueDate: '2023-12-20',
        status: 'on-track'
      },
      {
        id: '5',
        title: 'Implement New Collaboration Tools',
        description: 'Adopt and integrate new collaboration tools into the team workflow',
        progress: 30,
        dueDate: '2024-01-10',
        status: 'on-track'
      },
      {
        id: '6',
        title: 'Cross-functional Knowledge Sharing',
        description: 'Implement a regular knowledge sharing program across different teams',
        progress: 0,
        dueDate: '2024-02-28',
        status: 'not-started'
      },
    ];
  };

  const getStatusIcon = (status: Goal['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'on-track':
        return <Circle className="h-5 w-5 text-blue-500" />;
      case 'at-risk':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'not-started':
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: Goal['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'on-track':
        return 'text-blue-500';
      case 'at-risk':
        return 'text-yellow-500';
      case 'not-started':
        return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4">
        {goals.map((goal) => (
          <Card key={goal.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(goal.status)}
                    <h3 className="font-semibold">{goal.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{goal.description}</p>
                </div>
                <span className={`text-sm font-medium ${getStatusColor(goal.status)}`}>
                  {goal.status.replace('-', ' ')}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Progress</span>
                  <span className="text-sm font-medium">{goal.progress}%</span>
                </div>
                <Progress value={goal.progress} />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Due: {new Date(goal.dueDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}