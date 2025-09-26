'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, TrendingUp, Users, Target, Lightbulb, AlertCircle } from 'lucide-react';
import { BigQueryAI } from '@/lib/bigquery';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

interface ExecutiveInsight {
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
  confidence: number;
}

export function ExecutiveInsightsDashboard() {
  const [user] = useAuthState(auth);
  const [insights, setInsights] = React.useState<ExecutiveInsight[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchInsights = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Mock data for demonstration - replace with actual BigQuery call
        const mockAnalyticsData = {
          totalUsers: 150,
          activeUsers: 95,
          totalMeetings: 45,
          averageMeetingDuration: 35,
          messagesSent: 1250,
          spacesCreated: 12,
          timestamp: new Date().toISOString()
        };

        const result = await BigQueryAI.generateExecutiveInsights([mockAnalyticsData]);
        
        if (result.success && result.data) {
          // Transform BigQuery result to our expected format
          const transformedInsights: ExecutiveInsight[] = result.data.map((item: any, index: number) => ({
            category: 'AI Analysis',
            title: `Insight ${index + 1}`,
            description: item.executive_summary || 'No summary available',
            impact: 'medium' as const,
            recommendation: 'Review and take appropriate action based on this insight.',
            confidence: 75
          }));
          setInsights(transformedInsights);
        } else {
          throw new Error('Failed to generate insights');
        }
      } catch (err) {
        console.error('Error fetching executive insights:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        
        // Fallback to sample data
        setInsights([
          {
            category: 'User Engagement',
            title: 'High User Retention Rate',
            description: 'Your platform shows strong user engagement with 63% of users active in the last 7 days.',
            impact: 'high',
            recommendation: 'Continue current engagement strategies and consider expanding to new user segments.',
            confidence: 85
          },
          {
            category: 'Meeting Efficiency',
            title: 'Meeting Duration Optimization',
            description: 'Average meeting duration has decreased by 12% while maintaining high participation rates.',
            impact: 'medium',
            recommendation: 'Implement meeting templates to further improve efficiency.',
            confidence: 78
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [user]);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high': return <TrendingUp className="h-4 w-4" />;
      case 'medium': return <Target className="h-4 w-4" />;
      case 'low': return <Users className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Executive Insights
          </CardTitle>
          <CardDescription>AI-powered business intelligence and recommendations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          Executive Insights
          {error && <AlertCircle className="h-4 w-4 text-amber-500" />}
        </CardTitle>
        <CardDescription>
          AI-powered business intelligence and recommendations
          {error && <span className="text-amber-600 ml-2">(Using sample data due to connection issues)</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {insights.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No insights available at this time.</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Refresh Insights
            </Button>
          </div>
        ) : (
          insights.map((insight, index) => (
            <div key={index} className="border rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {insight.category}
                    </Badge>
                    <Badge className={`text-xs border ${getImpactColor(insight.impact)}`}>
                      {getImpactIcon(insight.impact)}
                      <span className="ml-1 capitalize">{insight.impact} Impact</span>
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-lg">{insight.title}</h4>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Confidence</div>
                  <div className="text-lg font-semibold">{insight.confidence}%</div>
                </div>
              </div>
              
              <p className="text-muted-foreground">{insight.description}</p>
              
              <div className="bg-blue-50 p-4 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Recommendation</span>
                </div>
                <p className="text-blue-800 text-sm">{insight.recommendation}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}