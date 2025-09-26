'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ResourceUtilizationChartProps {
  teamId: string;
  timeRange: string;
}

export function ResourceUtilizationChart({ teamId, timeRange }: ResourceUtilizationChartProps) {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [utilizationData, setUtilizationData] = useState<any[]>([]);

  useEffect(() => {
    const fetchUtilizationData = async () => {
      if (!user || !teamId) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch utilization data from our API endpoint
        const response = await fetch(`/api/teams/${teamId}/analytics/resourceUtilization?timeRange=${timeRange}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch resource utilization data');
        }

        const data = await response.json();
        setUtilizationData(data.resources || []);
      } catch (err) {
        console.error('Error fetching resource utilization data:', err);
        setError('Failed to load resource data');
        
        // Fallback to sample data for development purposes
        setUtilizationData(getSampleData());
      } finally {
        setLoading(false);
      }
    };

    fetchUtilizationData();
  }, [user, teamId, timeRange]);

  const getSampleData = () => {
    // Generate sample data for development/demo purposes
    return [
      { name: 'Team Member A', allocated: 85, utilized: 78 },
      { name: 'Team Member B', allocated: 90, utilized: 65 },
      { name: 'Team Member C', allocated: 75, utilized: 73 },
      { name: 'Team Member D', allocated: 95, utilized: 82 },
      { name: 'Team Member E', allocated: 80, utilized: 75 },
      { name: 'Team Member F', allocated: 70, utilized: 68 },
    ];
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
      <BarChart
        data={utilizationData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="name" />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Legend />
        <Bar dataKey="allocated" name="Allocated Hours (%)" fill="#8b5cf6" />
        <Bar dataKey="utilized" name="Utilized Hours (%)" fill="#0ea5e9" />
      </BarChart>
    </ResponsiveContainer>
  );
}