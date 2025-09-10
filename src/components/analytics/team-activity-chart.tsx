
"use client"

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

const chartData = [
  { date: "2024-07-08", general: 222, "design-team": 150, random: 50 },
  { date: "2024-07-09", general: 254, "design-team": 180, random: 75 },
  { date: "2024-07-10", general: 289, "design-team": 205, random: 90 },
  { date: "2024-07-11", general: 198, "design-team": 250, random: 110 },
  { date: "2024-07-12", general: 321, "design-team": 190, random: 130 },
  { date: "2024-07-13", general: 350, "design-team": 280, random: 150 },
  { date: "2024-07-14", general: 310, "design-team": 310, random: 170 },
]

const chartConfig = {
  general: {
    label: "#general",
    color: "hsl(var(--primary))",
  },
  "design-team": {
    label: "#design-team",
    color: "hsl(var(--chart-2))",
  },
  random: {
    label: "#random",
    color: "hsl(var(--muted-foreground))",
  },
}

export function TeamActivityChart() {
  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <LineChart
        data={chartData}
        margin={{
          top: 24,
          right: 24,
          bottom: 24,
          left: 24,
        }}
      >
        <CartesianGrid vertical={false} />
         <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
        />
        <YAxis />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(value, payload) => new Date(payload[0]?.payload.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
              })}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          dataKey="general"
          type="monotone"
          stroke="var(--color-general)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          dataKey="design-team"
          type="monotone"
          stroke="var(--color-design-team)"
          strokeWidth={2}
          dot={false}
        />
         <Line
          dataKey="random"
          type="monotone"
          stroke="var(--color-random)"
          strokeWidth={2}
          dot={false}
          strokeDasharray="5 5"
        />
      </LineChart>
    </ChartContainer>
  )
}
