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
  Target,
  RefreshCw,
  Sparkles,
  Activity,
  BarChart3,
  LineChart
} from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

interface UserForecast {
  forecast: string;
  historicalData: {
    userId: string;
    engagementScore: number;
    lastActiveDate: string;
    spaceInteractions: number;
    meetingCount: number;
    avgMeetingDuration: number;
    activityPattern: string;
  };
  horizon: number;
  generatedAt: string;
}

export function UserEngagementForecast() {
  const [user] = useAuthState(auth);
  const [forecast, setForecast] = useState<UserForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [horizon, setHorizon] = useState(30);

  const fetchForecast = async (days: number = 30) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/bigquery/user-forecast?userId=${user.uid}&horizon=${days}`);
      const data = await response.json();
      
      if (data.success) {
        setForecast(data);
      } else {
        setError(data.error || 'Failed to fetch forecast');
      }
    } catch (err) {
      setError('Failed to fetch user engagement forecast');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast(horizon);
  }, [user, horizon]);

  const getActivityPatternColor = (pattern: string) => {
    switch (pattern) {
      case 'highly_active': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200';
      case 'moderately_active': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low_activity': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getActivityPatternLabel = (pattern: string) => {
    switch (pattern) {
      case 'highly_active': return 'Highly Active';
      case 'moderately_active': return 'Moderately Active';
      case 'low_activity': return 'Low Activity';
      default: return 'New User';
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-blue-600" />
            User Engagement Forecast
          </CardTitle>
          <CardDescription>Predicting future user engagement patterns...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
            {[...Array(3)].map((_, i) => (
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
            <LineChart className="h-5 w-5 text-red-600" />
            User Engagement Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchForecast(horizon)} variant="outline">
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
              <LineChart className="h-5 w-5 text-blue-600" />
              User Engagement Forecast
            </CardTitle>
            <CardDescription>
              AI-powered prediction of user engagement for the next {horizon} days
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={horizon} 
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
            </select>
            <Button onClick={() => fetchForecast(horizon)} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI-Generated Forecast */}
        {forecast?.forecast && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  AI-Generated Forecast
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                  {forecast.forecast}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Engagement Metrics */}
        {forecast?.historicalData && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/20 border-green-200/50 dark:border-green-800/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 dark:text-green-400 text-sm font-medium">Engagement Score</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {forecast.historicalData.engagementScore}/100
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200/50 dark:border-purple-800/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Space Interactions</p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      {forecast.historicalData.spaceInteractions}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200/50 dark:border-blue-800/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Meeting Count</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {forecast.historicalData.meetingCount}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Activity Pattern Analysis */}
        {forecast?.historicalData && (
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-600" />
              Activity Pattern Analysis
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Pattern</p>
                      <Badge className={getActivityPatternColor(forecast.historicalData.activityPattern)}>
                        {getActivityPatternLabel(forecast.historicalData.activityPattern)}
                      </Badge>
                    </div>
                    <BarChart3 className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Meeting Duration</p>
                      <p className="text-2xl font-bold text-indigo-600">
                        {Math.round(forecast.historicalData.avgMeetingDuration)}m
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-indigo-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Forecast Horizon */}
        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Forecast Horizon</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Next {horizon} days
              </p>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
              AI-Powered
            </Badge>
          </div>
        </div>

        {/* Generated Timestamp */}
        {forecast?.generatedAt && (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-4 border-t">
            Generated at: {new Date(forecast.generatedAt).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
