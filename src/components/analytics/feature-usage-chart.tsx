
"use client"

import { Pie, PieChart } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart"
import { CardDescription } from "../ui/card"

const chartData = [
  { feature: "Virtual Space", usage: 275, fill: "var(--color-space)" },
  { feature: "Kanban Board", usage: 200, fill: "var(--color-board)" },
  { feature: "Chat", usage: 187, fill: "var(--color-chat)" },
  { feature: "AI Suggestions", usage: 173, fill: "var(--color-ai)" },
  { feature: "Account Settings", usage: 90, fill: "var(--color-account)" },
]

const chartConfig = {
  usage: {
    label: "Usage",
  },
  space: {
    label: "Virtual Space",
    color: "hsl(var(--chart-1))",
  },
  board: {
    label: "Kanban Board",
    color: "hsl(var(--chart-2))",
  },
  chat: {
    label: "Chat",
    color: "hsl(var(--chart-3))",
  },
  ai: {
    label: "AI Suggestions",
    color: "hsl(var(--chart-4))",
  },
  account: {
    label: "Account Settings",
    color: "hsl(var(--chart-5))",
  },
}

export function FeatureUsageChart() {
  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square max-h-[300px]"
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Pie
          data={chartData}
          dataKey="usage"
          nameKey="feature"
          innerRadius={60}
          strokeWidth={5}
        >
        </Pie>
        <ChartLegend
            content={<ChartLegendContent nameKey="feature" />}
            className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
        />
      </PieChart>
    </ChartContainer>
  )
}
