"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FilterSelect } from "@/components/filter-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMeta } from "@/hooks/use-meta";
import { api, toQueryString } from "@/lib/api";
import { formatCount, formatDate, formatUsdCompact } from "@/lib/format";
import type { GroupBy, InsightBreakdown, InsightSummary } from "@/lib/types";
import { PayChart, type PayChartRow } from "./pay-chart";
import { PayTable } from "./pay-table";
import { StatTile } from "./stat-tile";

const GROUP_BY_LABELS: Record<GroupBy, string> = {
  country: "Country",
  department: "Department",
  level: "Level",
  jobTitle: "Job title",
  role: "Role (title + level)",
};

/** More bars than this stops being readable; the table below always has every row. */
const MAX_CHART_ROWS = 20;

interface Filters {
  country?: string;
  department?: string;
  level?: string;
}

export function InsightsDashboard() {
  const meta = useMeta();
  const [groupBy, setGroupBy] = useState<GroupBy>("country");
  const [filters, setFilters] = useState<Filters>({});
  const qs = toQueryString({ ...filters });

  const summary = useQuery({
    queryKey: ["insights", "summary", filters],
    queryFn: () => api<InsightSummary>(`/insights/summary${qs}`),
    placeholderData: keepPreviousData,
  });
  const breakdown = useQuery({
    queryKey: ["insights", "breakdown", groupBy, filters],
    queryFn: () => api<InsightBreakdown>(`/insights/breakdown${toQueryString({ groupBy, ...filters })}`),
    placeholderData: keepPreviousData,
  });

  const rows: PayChartRow[] =
    breakdown.data?.rows.map((row) => ({
      ...row,
      label:
        groupBy === "country"
          ? meta.countryName(row.group.country)
          : groupBy === "role"
            ? `${row.group.jobTitle} · ${row.group.level}`
            : Object.values(row.group).join(" · "),
    })) ?? [];

  // Too many groups for a readable chart: show the largest by headcount, keep original order.
  let chartRows = rows;
  if (rows.length > MAX_CHART_ROWS) {
    const largest = new Set([...rows].sort((a, b) => b.headcount - a.headcount).slice(0, MAX_CHART_ROWS));
    chartRows = rows.filter((r) => largest.has(r));
  }
  // Levels read best in L1..L6 order; everything else ranks by median, highest first.
  if (groupBy !== "level" && groupBy !== "role") {
    chartRows = [...chartRows].sort((a, b) => (b.medianUsd ?? 0) - (a.medianUsd ?? 0));
  }

  const s = summary.data;
  const groupLabel = GROUP_BY_LABELS[groupBy];
  const error = summary.error ?? breakdown.error;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">How ACME pays people</h1>
          <p className="text-sm text-muted-foreground">
            Active employees&apos; current annual base salary, converted to USD
            {s && ` at fixed rates as of ${formatDate(s.ratesAsOf)}`}.
          </p>
        </div>
      </div>

      {/* Filters live in one row and apply to everything below. */}
      <div className="flex flex-wrap gap-2">
        <FilterSelect
          label="Group by"
          value={groupBy}
          onChange={(v) => setGroupBy((v as GroupBy) ?? "country")}
          options={Object.entries(GROUP_BY_LABELS).map(([value, label]) => ({ value, label }))}
          includeAll={false}
          className="w-60"
        />
        <FilterSelect
          label="Country"
          value={filters.country}
          onChange={(country) => setFilters((f) => ({ ...f, country }))}
          options={meta.data?.countries.map((c) => ({ value: c.code, label: c.name })) ?? []}
        />
        <FilterSelect
          label="Department"
          value={filters.department}
          onChange={(department) => setFilters((f) => ({ ...f, department }))}
          options={meta.data?.departments.map((d) => ({ value: d.name, label: d.name })) ?? []}
        />
        <FilterSelect
          label="Level"
          value={filters.level}
          onChange={(level) => setFilters((f) => ({ ...f, level }))}
          options={meta.data?.levels.map((l) => ({ value: l, label: l })) ?? []}
          className="w-32"
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load insights: {error.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Headcount"
          value={s && formatCount(s.headcount)}
          caption={s && `${s.countries} countries · ${s.departments} departments`}
        />
        <StatTile label="Annual payroll" value={s && formatUsdCompact(s.totalUsd)} caption="Total base salary, USD" />
        <StatTile
          label="Median salary"
          value={s && formatUsdCompact(s.medianUsd)}
          caption={s && `Average ${formatUsdCompact(s.averageUsd)}`}
        />
        <StatTile
          label="Middle 50% earn"
          value={s && (s.headcount ? `${formatUsdCompact(s.p25Usd)}–${formatUsdCompact(s.p75Usd)}` : "—")}
          caption="25th to 75th percentile"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Median salary by {groupLabel.toLowerCase()}</CardTitle>
          <CardDescription>
            Hover a bar for the spread and headcount.
            {chartRows.length < rows.length &&
              ` Showing the ${MAX_CHART_ROWS} largest of ${rows.length} groups; the table lists all.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {breakdown.isPending ? (
            <Skeleton className="h-72 w-full" />
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No active employees match these filters.</p>
          ) : (
            <PayChart rows={chartRows} />
          )}
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pay statistics by {groupLabel.toLowerCase()}</CardTitle>
            <CardDescription>All figures in USD.</CardDescription>
          </CardHeader>
          <CardContent>
            <PayTable rows={rows} groupLabel={groupLabel} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
