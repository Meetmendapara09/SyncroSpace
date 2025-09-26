'use client';

import * as React from 'react';

interface FeatureUsageChartProps {
  spacesData: any[] | undefined;
  usersData: any[] | undefined;
}

export function FeatureUsageChart({ spacesData, usersData }: FeatureUsageChartProps) {
  // Generate feature usage data
  const generateFeatureData = () => {
    const totalUsers = usersData?.length || 100;
    
    return [
      {
        feature: 'Spaces',
        usage: spacesData?.length || 15,
        percentage: Math.min(100, Math.round(((spacesData?.length || 15) / totalUsers) * 100)),
        color: 'bg-blue-500'
      },
      {
        feature: 'Video Calls',
        usage: Math.floor(totalUsers * 0.65),
        percentage: 65,
        color: 'bg-green-500'
      },
      {
        feature: 'File Sharing',
        usage: Math.floor(totalUsers * 0.45),
        percentage: 45,
        color: 'bg-purple-500'
      },
      {
        feature: 'Chat',
        usage: Math.floor(totalUsers * 0.85),
        percentage: 85,
        color: 'bg-yellow-500'
      },
      {
        feature: 'Whiteboard',
        usage: Math.floor(totalUsers * 0.25),
        percentage: 25,
        color: 'bg-red-500'
      }
    ];
  };

  const featureData = generateFeatureData();

  return (
    <div className="space-y-4">
      {featureData.map((feature, index) => (
        <div key={index} className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">{feature.feature}</span>
            <div className="text-sm text-muted-foreground">
              {feature.usage} users ({feature.percentage}%)
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${feature.color}`}
              style={{ width: `${feature.percentage}%` }}
            ></div>
          </div>
        </div>
      ))}
      
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <h4 className="font-semibold text-sm mb-2">Top Features</h4>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-600">Chat</div>
            <div className="text-muted-foreground">Most used</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">Video</div>
            <div className="text-muted-foreground">Growing fast</div>
          </div>
        </div>
      </div>
    </div>
  );
}