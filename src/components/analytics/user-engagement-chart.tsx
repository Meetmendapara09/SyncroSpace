
"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
  { date: "2024-07-01", users: 186 },
  { date: "2024-07-02", users: 305 },
  { date: "2024-07-03", users: 237 },
  { date: "2024-07-04", users: 73 },
  { date: "2024-07-05", users: 209 },
  { date: "2024-07-06", users: 214 },
  { date: "2024-07-07", users: 289 },
  { date: "2024-07-08", users: 198 },
  { date: "2024-07-09", users: 345 },
  { date: "2024-07-10", users: 256 },
  { date: "2024-07-11", users: 189 },
  { date: "2024-07-12", users: 321 },
  { date: "2024-07-13", users: 147 },
  { date: "2024-07-14", users: 432 },
]

const chartConfig = {
  users: {
    label: "Active Users",
    color: "hsl(var(--primary))",
  },
}

export function UserEngagementChart() {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <BarChart
            data={chartData}
            margin={{
                top: 5,
                right: 10,
                left: 10,
                bottom: 0,
            }}
            >
            <CartesianGrid vertical={false} />
            <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
            />
            <YAxis />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="users" fill="var(--color-users)" radius={4} />
        </BarChart>
    </ChartContainer>
  )
}
