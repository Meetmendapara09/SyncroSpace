'use client';

import React from 'react';
import { AIMonitoringDashboard } from '@/components/admin/ai-monitoring-dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminAIMonitoringPage() {
  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard: AI Services</h1>
      
      <Tabs defaultValue="monitoring">
        <TabsList className="mb-6">
          <TabsTrigger value="monitoring">Service Monitoring</TabsTrigger>
          <TabsTrigger value="analytics">Usage Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="monitoring">
          <AIMonitoringDashboard />
        </TabsContent>
        
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Usage by Service</CardTitle>
                <CardDescription>
                  Total calls made to each AI service over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  [Usage Chart Placeholder]
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Error Rate Trends</CardTitle>
                <CardDescription>
                  Error rates across all AI services over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  [Error Rate Chart Placeholder]
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Latency Distribution</CardTitle>
                <CardDescription>
                  Response time distribution for AI services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  [Latency Distribution Chart Placeholder]
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>AI Service Settings</CardTitle>
              <CardDescription>
                Configure thresholds, timeouts, and fallback behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground">
                Settings panel to be implemented. This would allow configuring:
                <ul className="list-disc pl-6 mt-2">
                  <li>Circuit breaker thresholds</li>
                  <li>Retry policies</li>
                  <li>Timeout durations</li>
                  <li>Fallback content</li>
                  <li>Alert thresholds</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}