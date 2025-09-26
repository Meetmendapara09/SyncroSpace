'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TeamPerformanceChartProps {
  teamId: string;
  timeRange: string;
}

export function TeamPerformanceChart({ teamId, timeRange }: TeamPerformanceChartProps) {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [performanceData, setPerformanceData] = useState<any[]>([]);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      if (!user || !teamId) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch performance data from our API endpoint
        const response = await fetch(`/api/teams/${teamId}/analytics/performanceMetrics?timeRange=${timeRange}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch performance data');
        }

        const data = await response.json();
        setPerformanceData(data.metrics || []);
      } catch (err) {
        console.error('Error fetching performance data:', err);
        setError('Failed to load performance data');
        
        // Fallback to sample data for development purposes
        setPerformanceData(getSampleData());
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, [user, teamId, timeRange]);

  const getSampleData = () => {
    // Generate sample data for development/demo purposes
    const sampleData = [];
    const now = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      sampleData.push({
        date: dateStr,
        productivity: Math.floor(65 + Math.random() * 30),
        collaboration: Math.floor(60 + Math.random() * 35),
        taskCompletion: Math.floor(50 + Math.random() * 45),
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
      <LineChart
        data={performanceData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="date" />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="productivity" stroke="#0ea5e9" activeDot={{ r: 8 }} strokeWidth={2} />
        <Line type="monotone" dataKey="collaboration" stroke="#8b5cf6" strokeWidth={2} />
        <Line type="monotone" dataKey="taskCompletion" stroke="#10b981" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}