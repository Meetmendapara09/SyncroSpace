'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageSquare, 
  Users, 
  Clock, 
  Target,
  RefreshCw,
  Sparkles,
  BarChart3,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

interface MeetingAnalytics {
  meetingId: string;
  title: string;
  effectivenessScore: number;
  categorization: {
    isBrainstorming: boolean;
    isStatusUpdate: boolean;
    isDecisionMaking: boolean;
  };
  insights: string[];
}

export function EnhancedMeetingAnalytics() {
  const [user] = useAuthState(auth);
  const [analytics, setAnalytics] = useState<MeetingAnalytics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null);

  const fetchMeetingAnalytics = async (meetingId?: string) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const url = meetingId 
        ? `/api/bigquery/meeting-analytics?meetingId=${meetingId}`
        : `/api/bigquery/meeting-analytics?spaceId=all`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(Array.isArray(data.analytics) ? data.analytics : [data.analytics]);
      } else {
        setError(data.error || 'Failed to fetch meeting analytics');
      }
    } catch (err) {
      setError('Failed to fetch meeting analytics');
    } finally {
      setLoading(false);
    }
  };

  const analyzeBatchMeetings = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get all meeting IDs from the current analytics
      const meetingIds = analytics.map(a => a.meetingId);
      
      const response = await fetch('/api/bigquery/meeting-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingIds,
          analysisType: 'comprehensive'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.results.map((result: any) => ({
          meetingId: result.meetingId,
          title: result.title,
          effectivenessScore: result.analysis.effectiveness || 5,
          categorization: result.analysis.categorization || {
            isBrainstorming: false,
            isStatusUpdate: false,
            isDecisionMaking: false
          },
          insights: [`Analysis completed at ${new Date(result.generatedAt).toLocaleString()}`]
        })));
      } else {
        setError(data.error || 'Failed to analyze meetings');
      }
    } catch (err) {
      setError('Failed to analyze meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetingAnalytics();
  }, [user]);

  const getEffectivenessColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200';
    return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200';
  };

  const getEffectivenessLabel = (score: number) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    return 'Needs Improvement';
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            Enhanced Meeting Analytics
          </CardTitle>
          <CardDescription>Analyzing meeting effectiveness and patterns...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-red-600" />
            Enhanced Meeting Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchMeetingAnalytics()} variant="outline">
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
              <BarChart3 className="h-5 w-5 text-purple-600" />
              Enhanced Meeting Analytics
            </CardTitle>
            <CardDescription>
              AI-powered analysis of meeting effectiveness and categorization
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => fetchMeetingAnalytics()} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={analyzeBatchMeetings} variant="outline" size="sm">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Analysis
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {analytics.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No meeting analytics available</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Meetings will appear here once they are analyzed
            </p>
          </div>
        ) : (
          analytics.map((meeting) => (
            <Card key={meeting.meetingId} className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Meeting Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-lg">{meeting.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Meeting ID: {meeting.meetingId}
                      </p>
                    </div>
                    <Badge className={getEffectivenessColor(meeting.effectivenessScore)}>
                      {getEffectivenessLabel(meeting.effectivenessScore)} ({meeting.effectivenessScore}/10)
                    </Badge>
                  </div>

                  {/* Effectiveness Score */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Target className="h-5 w-5 text-purple-600" />
                      <div>
                        <h5 className="font-semibold text-purple-900 dark:text-purple-100">
                          Effectiveness Score: {meeting.effectivenessScore}/10
                        </h5>
                        <p className="text-sm text-purple-800 dark:text-purple-200">
                          AI-analyzed based on duration, participation, and outcomes
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Meeting Categorization */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className={`p-3 rounded-lg border ${meeting.categorization.isBrainstorming ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800'}`}>
                      <div className="flex items-center gap-2">
                        {meeting.categorization.isBrainstorming ? (
                          <CheckCircle className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={`text-sm font-medium ${meeting.categorization.isBrainstorming ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-600 dark:text-gray-400'}`}>
                          Brainstorming
                        </span>
                      </div>
                    </div>

                    <div className={`p-3 rounded-lg border ${meeting.categorization.isStatusUpdate ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800'}`}>
                      <div className="flex items-center gap-2">
                        {meeting.categorization.isStatusUpdate ? (
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={`text-sm font-medium ${meeting.categorization.isStatusUpdate ? 'text-blue-800 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400'}`}>
                          Status Update
                        </span>
                      </div>
                    </div>

                    <div className={`p-3 rounded-lg border ${meeting.categorization.isDecisionMaking ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800'}`}>
                      <div className="flex items-center gap-2">
                        {meeting.categorization.isDecisionMaking ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={`text-sm font-medium ${meeting.categorization.isDecisionMaking ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'}`}>
                          Decision Making
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AI Insights */}
                  {meeting.insights && meeting.insights.length > 0 && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      <div className="flex items-start gap-3">
                        <Sparkles className="h-5 w-5 text-indigo-600 mt-0.5" />
                        <div>
                          <h5 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
                            AI-Generated Insights
                          </h5>
                          <ul className="text-sm text-indigo-800 dark:text-indigo-200 space-y-1">
                            {meeting.insights.map((insight, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-indigo-600 mt-1">•</span>
                                <span>{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Summary Statistics */}
        {analytics.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-600" />
              Summary Statistics
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {analytics.length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Meetings</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {(analytics.reduce((sum, m) => sum + m.effectivenessScore, 0) / analytics.length).toFixed(1)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Effectiveness</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {analytics.filter(m => m.categorization.isBrainstorming).length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Brainstorming</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {analytics.filter(m => m.categorization.isDecisionMaking).length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Decision Making</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
