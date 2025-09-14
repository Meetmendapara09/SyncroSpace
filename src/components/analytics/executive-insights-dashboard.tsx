'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  MessageSquare, 
  Brain, 
  Target,
  BarChart3,
  RefreshCw,
  Sparkles,
  Activity
} from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

interface ExecutiveInsights {
  insights: string;
  analytics: {
    userRole: string;
    isAdmin: boolean;
    metrics: {
      totalUsers: number;
      totalSpaces: number;
      totalMeetings: number;
      activeUsers: number;
      activeSpaces: number;
    };
    trends: {
      userGrowth: number;
      spaceUtilization: any[];
      meetingPatterns: any[];
    };
  };
  generatedAt: string;
}

export function ExecutiveInsightsDashboard() {
  const [user] = useAuthState(auth);
  const [insights, setInsights] = useState<ExecutiveInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async (period: string = 'weekly') => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/bigquery/executive-insights?period=${period}&userId=${user.uid}`);
      const data = await response.json();
      
      if (data.success) {
        setInsights(data);
      } else {
        setError(data.error || 'Failed to fetch insights');
      }
    } catch (err) {
      setError('Failed to fetch executive insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [user]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI-Powered Executive Insights
          </CardTitle>
          <CardDescription>Generating intelligent business insights...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-red-600" />
            Executive Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchInsights()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              AI-Powered Executive Insights
            </CardTitle>
            <CardDescription>
              Intelligent analysis of team performance and business metrics
            </CardDescription>
          </div>
          <Button onClick={() => fetchInsights()} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Role Indicator */}
        {insights?.analytics && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Viewing data as: <span className="font-semibold">{insights.analytics.userRole}</span>
                {insights.analytics.isAdmin && (
                  <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    System-wide view
                  </Badge>
                )}
                {!insights.analytics.isAdmin && (
                  <Badge variant="outline" className="ml-2">
                    Personal view
                  </Badge>
                )}
              </span>
            </div>
          </div>
        )}

        {/* AI-Generated Insights */}
        {insights?.insights && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  AI-Generated Insights
                </h4>
                <p className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed">
                  {insights.insights}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        {insights?.analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200/50 dark:border-blue-800/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Total Users</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {insights.analytics.metrics.totalUsers}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">Active Users</p>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                      {insights.analytics.metrics.activeUsers}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200/50 dark:border-purple-800/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Total Spaces</p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      {insights.analytics.metrics.totalSpaces}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/20 border-amber-200/50 dark:border-amber-800/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-600 dark:text-amber-400 text-sm font-medium">Total Meetings</p>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                      {insights.analytics.metrics.totalMeetings}
                    </p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Growth Trends */}
        {insights?.analytics?.trends && (
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Growth Trends
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">New Users This Week</p>
                      <p className="text-2xl font-bold text-green-600">
                        +{insights.analytics.trends.userGrowth}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Growth
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Space Utilization</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {insights.analytics.trends.spaceUtilization.length}
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Generated Timestamp */}
        {insights?.generatedAt && (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-4 border-t">
            Generated at: {new Date(insights.generatedAt).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
