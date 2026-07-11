"use client";

import { Area, EvilAreaChart, Grid, Tooltip, XAxis, YAxis } from "@/components/evilcharts/charts/area-chart";

const chartConfig = {
  sent: { label: "Sent", colors: { light: ["var(--chart-1)"], dark: ["var(--chart-1)"] } },
};

export function EmailsTrendChart({ data }: { data: { date: string; sent: number }[] }) {
  return (
    <EvilAreaChart config={chartConfig} data={data} className="h-64" animationType="left-to-right">
      <Grid />
      <XAxis dataKey="date" />
      <YAxis allowDecimals={false} />
      <Tooltip />
      <Area dataKey="sent" />
    </EvilAreaChart>
  );
}
