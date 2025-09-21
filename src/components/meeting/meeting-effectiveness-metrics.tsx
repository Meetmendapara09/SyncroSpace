'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { format, subDays, startOfMonth, endOfMonth, differenceInMinutes, parseISO } from 'date-fns';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MeetingEffectivenessProps {
  meetingId: string;
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
}

export function MeetingEffectivenessMetrics({ meetingId, timeRange = 'month' }: MeetingEffectivenessProps) {
  const [user] = useAuthState(auth);
  const [metrics, setMetrics] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedTab, setSelectedTab] = React.useState<string>('overview');

  // Fetch metrics data
  React.useEffect(() => {
    async function fetchMetrics() {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Get meeting data
        const meetingRef = collection(db, 'meetings');
        const meetingQuery = query(meetingRef, where('id', '==', meetingId));
        const meetingSnapshot = await getDocs(meetingQuery);
        
        if (meetingSnapshot.empty) {
          throw new Error('Meeting not found');
        }
        
        const meetingData = meetingSnapshot.docs[0].data();
        
        // Get action items for this meeting
        const actionItemsRef = collection(db, 'actionItems');
        const actionItemsQuery = query(actionItemsRef, where('meetingId', '==', meetingId));
        const actionItemsSnapshot = await getDocs(actionItemsQuery);
        const actionItems = actionItemsSnapshot.docs.map(doc => doc.data());
        
        // Get notes for this meeting
        const notesRef = collection(db, 'meetingNotes');
        const notesQuery = query(notesRef, where('meetingId', '==', meetingId));
        const notesSnapshot = await getDocs(notesQuery);
        const notes = notesSnapshot.docs.map(doc => doc.data());
        
        // Calculate meeting duration
        const startDate = parseISO(meetingData.startDateTime);
        const endDate = parseISO(meetingData.endDateTime);
        const durationMinutes = differenceInMinutes(endDate, startDate);
        
        // Calculate action item completion rate
        const completedActionItems = actionItems.filter((item: any) => item.status === 'completed').length;
        const totalActionItems = actionItems.length;
        const completionRate = totalActionItems > 0 
          ? Math.round((completedActionItems / totalActionItems) * 100) 
          : 0;
        
        // Calculate participation rate based on attendees
        const expectedAttendees = meetingData.attendees?.length || 0;
        const actualAttendees = expectedAttendees; // Assuming all invited attendees joined
        const participationRate = expectedAttendees > 0 
          ? Math.round((actualAttendees / expectedAttendees) * 100) 
          : 0;
        
        // Calculate notes engagement (based on sections filled)
        let notesEngagement = 0;
        if (notes.length > 0) {
          const sections = notes[0].sections || [];
          const filledSections = sections.filter((section: any) => 
            section.content && section.content.length > 0
          ).length;
          const totalSections = sections.length;
          notesEngagement = totalSections > 0 
            ? Math.round((filledSections / totalSections) * 100) 
            : 0;
        }
        
        setMetrics({
          durationMinutes,
          totalActionItems,
          completedActionItems,
          completionRate,
          participationRate,
          notesEngagement,
          startDate,
          endDate
        });
      } catch (err: any) {
        console.error('Error fetching meeting metrics:', err);
        setError(err.message || 'An error occurred fetching meeting metrics');
      } finally {
        setLoading(false);
      }
    }
    
    fetchMetrics();
  }, [user, meetingId, timeRange]);

  // Render loading state
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Meeting Effectiveness</CardTitle>
          <CardDescription>Loading metrics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-64 flex items-center justify-center">
            <div className="animate-pulse w-10 h-10 rounded-full bg-muted"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Meeting Effectiveness</CardTitle>
          <CardDescription className="text-destructive">Error loading metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render no data state
  if (!metrics) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Meeting Effectiveness</CardTitle>
          <CardDescription>No metrics available for this meeting yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Metrics will become available after the meeting has concluded and action items have been tracked.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const actionItemsData = {
    labels: ['Completed', 'In Progress'],
    datasets: [
      {
        label: 'Action Items',
        data: [metrics.completedActionItems, metrics.totalActionItems - metrics.completedActionItems],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 159, 64, 0.6)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const engagementData = {
    labels: ['Participation', 'Notes Engagement', 'Action Item Completion'],
    datasets: [
      {
        label: 'Meeting Engagement (%)',
        data: [
          metrics.participationRate,
          metrics.notesEngagement,
          metrics.completionRate
        ],
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Meeting Effectiveness Metrics</CardTitle>
        <CardDescription>
          Performance insights for this meeting
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="actionItems">Action Items</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{metrics.durationMinutes} min</div>
                  <p className="text-sm text-muted-foreground">Meeting Duration</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{metrics.completionRate}%</div>
                  <p className="text-sm text-muted-foreground">Action Completion</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{metrics.participationRate}%</div>
                  <p className="text-sm text-muted-foreground">Participation Rate</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="text-base">Action Item Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <Doughnut 
                      data={actionItemsData} 
                      options={{ 
                        responsive: true,
                        maintainAspectRatio: false,
                      }} 
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="text-base">Engagement Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <Bar 
                      data={engagementData} 
                      options={{ 
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                              callback: function(value: any) {
                                return value + '%';
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="actionItems">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Action Item Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <Doughnut 
                    data={actionItemsData} 
                    options={{ 
                      responsive: true,
                      maintainAspectRatio: false,
                    }} 
                  />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Total Action Items:</span>
                    <span className="font-medium">{metrics.totalActionItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed:</span>
                    <span className="font-medium">{metrics.completedActionItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completion Rate:</span>
                    <span className="font-medium">{metrics.completionRate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="engagement">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Meeting Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <Bar 
                    data={engagementData} 
                    options={{ 
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100,
                          ticks: {
                            callback: function(value: any) {
                              return value + '%';
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Participation Rate:</span>
                    <span className="font-medium">{metrics.participationRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Notes Engagement:</span>
                    <span className="font-medium">{metrics.notesEngagement}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Action Item Completion:</span>
                    <span className="font-medium">{metrics.completionRate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}