'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Clock, Users, MessageSquare, Video } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

interface MeetingAnalytics {
  totalMeetings: number;
  averageDuration: number;
  participationRate: number;
  effectivenessScore: number;
  categories: {
    category: string;
    count: number;
    percentage: number;
  }[];
}

export function EnhancedMeetingAnalytics() {
  const [user] = useAuthState(auth);
  const [analytics, setAnalytics] = React.useState<MeetingAnalytics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Mock meeting data for demonstration
        const mockMeetingData = {
          id: 'meeting-123',
          title: 'Team Standup',
          duration: 30,
          participants: ['user1', 'user2', 'user3'],
          transcript: 'This is a sample meeting transcript discussing project progress...',
          actionItems: ['Complete feature X', 'Review design mockups'],
          date: new Date().toISOString()
        };

        // Call API route instead of direct BigQuery import
        const response = await fetch('/api/analytics/meeting-analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.uid,
            meetingData: mockMeetingData
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
          setAnalytics({
            totalMeetings: 45,
            averageDuration: 32,
            participationRate: 85,
            effectivenessScore: Math.round((result.data?.effectiveness?.score || 75) * 10) / 10,
            categories: [
              { category: 'Standup', count: 18, percentage: 40 },
              { category: 'Planning', count: 12, percentage: 27 },
              { category: 'Review', count: 9, percentage: 20 },
              { category: 'Brainstorming', count: 6, percentage: 13 }
            ]
          });
        } else {
          throw new Error('Failed to analyze meetings');
        }
      } catch (err) {
        console.error('Error fetching meeting analytics:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        
        // Fallback to sample data
        setAnalytics({
          totalMeetings: 42,
          averageDuration: 28,
          participationRate: 82,
          effectivenessScore: 7.8,
          categories: [
            { category: 'Standup', count: 16, percentage: 38 },
            { category: 'Planning', count: 11, percentage: 26 },
            { category: 'Review', count: 10, percentage: 24 },
            { category: 'Other', count: 5, percentage: 12 }
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  const getEffectivenessColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-blue-600" />
            Enhanced Meeting Analytics
          </CardTitle>
          <CardDescription>AI-powered insights into meeting effectiveness and patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-blue-600" />
            Enhanced Meeting Analytics
          </CardTitle>
          <CardDescription>AI-powered insights into meeting effectiveness and patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No meeting data available for analysis.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-blue-600" />
          Enhanced Meeting Analytics
          {error && <Badge className="ml-2 bg-amber-100 text-amber-800">Sample Data</Badge>}
        </CardTitle>
        <CardDescription>AI-powered insights into meeting effectiveness and patterns</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <BarChart3 className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold text-blue-900">{analytics.totalMeetings}</div>
            <div className="text-sm text-blue-700">Total Meetings</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Clock className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold text-green-900">{analytics.averageDuration}m</div>
            <div className="text-sm text-green-700">Avg Duration</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Users className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold text-purple-900">{analytics.participationRate}%</div>
            <div className="text-sm text-purple-700">Participation</div>
          </div>
          
          <div className={`text-center p-4 rounded-lg ${getEffectivenessColor(analytics.effectivenessScore)}`}>
            <MessageSquare className="h-6 w-6 mx-auto mb-2" />
            <div className="text-2xl font-bold">{analytics.effectivenessScore}/10</div>
            <div className="text-sm">Effectiveness</div>
          </div>
        </div>

        {/* Meeting Categories */}
        <div className="space-y-4">
          <h4 className="font-semibold">Meeting Categories</h4>
          <div className="space-y-3">
            {analytics.categories.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="font-medium">{category.category}</div>
                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                    {category.count} meetings
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-muted-foreground">{category.percentage}%</div>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-900">AI Insights</span>
          </div>
          <p className="text-blue-800 text-sm">
            Your meetings show strong engagement with {analytics.participationRate}% participation rate. 
            Consider implementing action item tracking to improve the {analytics.effectivenessScore}/10 effectiveness score. 
            The {analytics.averageDuration}-minute average duration suggests efficient time management.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}