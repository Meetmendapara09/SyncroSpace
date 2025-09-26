'use client';

import * as React from 'react';

interface TeamActivityChartProps {
  spacesData: any[] | undefined;
}

export function TeamActivityChart({ spacesData }: TeamActivityChartProps) {
  // Generate activity data based on spaces
  const generateActivityData = () => {
    const days = [];
    const baseActivity = spacesData?.length ? spacesData.length * 8 : 40;
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const variation = Math.floor(Math.random() * 30) - 15;
      const weekendReduction = isWeekend ? -20 : 0;
      
      days.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        messages: Math.max(5, baseActivity + variation + weekendReduction),
        date: date.toLocaleDateString()
      });
    }
    return days;
  };

  const activityData = generateActivityData();
  const maxMessages = Math.max(...activityData.map(d => d.messages));

  return (
    <div className="space-y-4">
      <div className="h-48 flex items-end justify-between gap-2 p-4 bg-gradient-to-t from-green-50 to-transparent rounded-lg">
        {activityData.map((day, index) => (
          <div key={index} className="flex flex-col items-center gap-2 flex-1">
            <div className="relative group">
              <div
                className="w-full bg-green-500 rounded-t transition-all duration-300 hover:bg-green-600 min-w-[12px]"
                style={{
                  height: `${(day.messages / maxMessages) * 120}px`,
                }}
              ></div>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {day.messages} messages
              </div>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {day.day}
            </span>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-lg font-bold text-green-600">
            {Math.round(activityData.reduce((sum, day) => sum + day.messages, 0) / 7)}
          </div>
          <div className="text-green-700">Daily Average</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-lg font-bold text-blue-600">{maxMessages}</div>
          <div className="text-blue-700">Peak Day</div>
        </div>
      </div>
    </div>
  );
}