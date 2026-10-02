"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { formatCount, formatUsdCompact } from "@/lib/format";
import type { PayStats } from "@/lib/types";

export interface PayChartRow extends PayStats {
  label: string;
}

const chartConfig = {
  medianUsd: { label: "Median salary (USD)", color: "var(--chart-1)" },
} satisfies ChartConfig;

const BAR_ROW_HEIGHT = 30;

/**
 * Median salary per group as horizontal bars (long group names stay readable).
 * Single series: one hue, no legend; the card title names the measure.
 * The tooltip adds the spread so the median is never read in isolation.
 */
export function PayChart({ rows }: { rows: PayChartRow[] }) {
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto w-full"
      style={{ height: Math.max(rows.length * BAR_ROW_HEIGHT + 40, 120) }}
    >
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={formatUsdCompact} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={170}
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={{ fontSize: 12 }}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={({ active, payload }) => {
            const row = payload?.[0]?.payload as PayChartRow | undefined;
            if (!active || !row) return null;
            return (
              <div className="grid min-w-44 gap-1 rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
                <p className="font-medium">{row.label}</p>
                <TooltipLine label="Median" value={formatUsdCompact(row.medianUsd)} strong />
                <TooltipLine label="Middle 50%" value={`${formatUsdCompact(row.p25Usd)} – ${formatUsdCompact(row.p75Usd)}`} />
                <TooltipLine label="Range" value={`${formatUsdCompact(row.minUsd)} – ${formatUsdCompact(row.maxUsd)}`} />
                <TooltipLine label="Headcount" value={formatCount(row.headcount)} />
              </div>
            );
          }}
        />
        <Bar dataKey="medianUsd" fill="var(--color-medianUsd)" radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ChartContainer>
  );
}

function TooltipLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>{value}</span>
    </div>
  );
}
