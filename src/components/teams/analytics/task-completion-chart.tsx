'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TaskCompletionChartProps {
  teamId: string;
  timeRange: string;
}

export function TaskCompletionChart({ teamId, timeRange }: TaskCompletionChartProps) {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taskData, setTaskData] = useState<any[]>([]);

  useEffect(() => {
    const fetchTaskData = async () => {
      if (!user || !teamId) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch task data from our API endpoint
        const response = await fetch(`/api/teams/${teamId}/analytics/taskCompletion?timeRange=${timeRange}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch task completion data');
        }

        const data = await response.json();
        setTaskData(data.tasks || []);
      } catch (err) {
        console.error('Error fetching task completion data:', err);
        setError('Failed to load task data');
        
        // Fallback to sample data for development purposes
        setTaskData(getSampleData());
      } finally {
        setLoading(false);
      }
    };

    fetchTaskData();
  }, [user, teamId, timeRange]);

  const getSampleData = () => {
    // Generate sample data for development/demo purposes
    const sampleData = [];
    const now = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const completed = Math.floor(5 + Math.random() * 10);
      const created = Math.floor(completed + Math.random() * 5);
      const pending = created - completed + Math.floor(Math.random() * 5);
      
      sampleData.push({
        date: dateStr,
        completed,
        created,
        pending
      });
    }
    
    return sampleData;
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
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={taskData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Area type="monotone" dataKey="created" name="Tasks Created" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
        <Area type="monotone" dataKey="completed" name="Tasks Completed" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
        <Area type="monotone" dataKey="pending" name="Tasks Pending" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
      </AreaChart>
    </ResponsiveContainer>
  );
}