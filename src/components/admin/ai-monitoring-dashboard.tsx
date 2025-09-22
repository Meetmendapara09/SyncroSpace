'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getAllAIMetrics, resetCircuitBreaker } from '@/lib/ai-error-handler';
import { RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

// AI Service status monitoring dashboard
export function AIMonitoringDashboard() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  const fetchMetrics = () => {
    const currentMetrics = getAllAIMetrics();
    setMetrics(currentMetrics);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    fetchMetrics();
    
    let intervalId: NodeJS.Timeout | null = null;
    
    if (autoRefresh) {
      intervalId = setInterval(fetchMetrics, 10000); // Update every 10 seconds
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh]);

  const handleReset = (operation: string) => {
    resetCircuitBreaker(operation);
    fetchMetrics();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed': return 'bg-green-500';
      case 'half-open': return 'bg-yellow-500';
      case 'open': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 0.95) return 'bg-green-500';
    if (rate >= 0.8) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">AI Services Health Dashboard</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
          </Button>
          <Button variant="outline" size="icon" onClick={fetchMetrics}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {metrics.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No AI operations have been monitored yet.
          </CardContent>
        </Card>
      ) : (
        metrics.map((metric) => (
          <Card key={metric.operation}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{metric.operation}</CardTitle>
                  <CardDescription>
                    {metric.totalCalls} total calls, {metric.recentErrors} recent errors
                  </CardDescription>
                </div>
                <Badge 
                  className={`${getStatusColor(metric.circuitStatus)} text-white`}
                >
                  {metric.circuitStatus.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>Success Rate</span>
                  <span>{(metric.successRate * 100).toFixed(1)}%</span>
                </div>
                <Progress 
                  value={metric.successRate * 100} 
                  className={getSuccessRateColor(metric.successRate)}
                />
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <div className="text-sm font-medium">Avg Latency</div>
                    <div className="text-2xl font-bold">
                      {metric.avgLatency.toFixed(0)}ms
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Status</div>
                    <div className="flex items-center gap-2">
                      {metric.circuitStatus === 'closed' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="capitalize">{metric.circuitStatus}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              {metric.circuitStatus !== 'closed' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleReset(metric.operation)}
                >
                  Reset Circuit
                </Button>
              )}
            </CardFooter>
          </Card>
        ))
      )}
    </div>
  );
}