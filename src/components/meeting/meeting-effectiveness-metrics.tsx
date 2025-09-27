'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Target, TrendingUp } from 'lucide-react';

interface MeetingEffectivenessMetricsProps {
  meetingId: string;
}

export function MeetingEffectivenessMetrics({ meetingId }: MeetingEffectivenessMetricsProps) {
  // Mock data - in real implementation, fetch from API
  const metrics = {
    overallScore: 85,
    timeUtilization: 92,
    participationRate: 78,
    actionItemsCreated: 5,
    followUpRate: 80,
    attendanceRate: 95,
    recommendations: [
      "Schedule follow-up meetings for action items",
      "Encourage participation from quiet members",
      "Consider shorter meeting duration"
    ]
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Meeting Effectiveness Score
          </CardTitle>
          <CardDescription>
            Overall assessment of meeting productivity and efficiency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className={`text-4xl font-bold ${getScoreColor(metrics.overallScore)}`}>
              {metrics.overallScore}%
            </div>
            <Badge className={getScoreBadge(metrics.overallScore)}>
              {metrics.overallScore >= 80 ? "Excellent" : 
               metrics.overallScore >= 60 ? "Good" : "Needs Improvement"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Utilization</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.timeUtilization}%</div>
            <Progress value={metrics.timeUtilization} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Meeting stayed on track
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participation Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.participationRate}%</div>
            <Progress value={metrics.participationRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Active member engagement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action Items</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.actionItemsCreated}</div>
            <p className="text-xs text-muted-foreground">
              Items created for follow-up
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.attendanceRate}%</div>
            <Progress value={metrics.attendanceRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Expected attendees present
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>
            Suggestions to improve future meetings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {metrics.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start gap-2">
                <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                <span className="text-sm">{recommendation}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}