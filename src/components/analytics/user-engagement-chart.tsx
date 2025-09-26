'use client';

import * as React from 'react';

interface UserEngagementChartProps {
  usersData: any[] | undefined;
}

export function UserEngagementChart({ usersData }: UserEngagementChartProps) {
  // Generate mock data for the last 14 days
  const generateMockData = () => {
    const days = [];
    const baseActiveUsers = usersData?.length ? Math.floor(usersData.length * 0.6) : 50;
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const variation = Math.floor(Math.random() * 20) - 10; // ±10 variation
      days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        activeUsers: Math.max(1, baseActiveUsers + variation)
      });
    }
    return days;
  };

  const data = generateMockData();
  const maxUsers = Math.max(...data.map(d => d.activeUsers));

  return (
    <div className="space-y-4">
      <div className="h-64 flex items-end justify-between gap-1 p-4 bg-gradient-to-t from-blue-50 to-transparent rounded-lg">
        {data.map((day, index) => (
          <div key={index} className="flex flex-col items-center gap-2 flex-1">
            <div className="relative group">
              <div
                className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600 min-w-[8px]"
                style={{
                  height: `${(day.activeUsers / maxUsers) * 180}px`,
                }}
              ></div>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {day.activeUsers} users
              </div>
            </div>
            <span className="text-xs text-muted-foreground transform -rotate-45 origin-center">
              {day.date}
            </span>
          </div>
        ))}
      </div>
      
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>Last 14 days</span>
        <span>Peak: {maxUsers} users</span>
      </div>
    </div>
  );
}