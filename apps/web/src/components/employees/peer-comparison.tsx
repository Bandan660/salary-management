"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMeta } from "@/hooks/use-meta";
import { api, toQueryString } from "@/lib/api";
import { formatMoney, formatPercent } from "@/lib/format";
import type { Employee, InsightSummary } from "@/lib/types";

/**
 * "Is this person paid in line with peers?" Peers = active staff with the same
 * job title, level and country, compared in USD.
 */
export function PeerComparison({ employee }: { employee: Employee }) {
  const meta = useMeta();
  const peers = useQuery({
    queryKey: ["insights", "summary", "peers", employee.country, employee.jobTitle, employee.level],
    queryFn: () =>
      api<InsightSummary>(
        `/insights/summary${toQueryString({ country: employee.country, jobTitle: employee.jobTitle, level: employee.level })}`,
      ),
  });

  const salaryUsd = employee.currentSalary?.amountUsd;
  const p = peers.data;
  const vsMedian = p?.medianUsd && salaryUsd ? Math.round(((salaryUsd - p.medianUsd) / p.medianUsd) * 1000) / 10 : null;

  let position = "";
  if (p && salaryUsd !== undefined && p.p25Usd !== null && p.p75Usd !== null) {
    position =
      salaryUsd < p.p25Usd ? "Below the middle 50% of peers" : salaryUsd > p.p75Usd ? "Above the middle 50% of peers" : "Within the middle 50% of peers";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compared with peers</CardTitle>
        <CardDescription>
          {employee.jobTitle} · {employee.level} in {meta.countryName(employee.country)}
          {p && ` (${p.headcount} active, including this employee)`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {peers.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : !p || p.headcount < 2 || salaryUsd === undefined ? (
          <p className="text-sm text-muted-foreground">Not enough peers to compare.</p>
        ) : (
          <div className="grid gap-3">
            <div>
              <p className="text-2xl font-semibold tabular-nums">{formatPercent(vsMedian)}</p>
              <p className="text-sm text-muted-foreground">vs peer median · {position}</p>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-sm">
              <PeerStat label="P25" value={formatMoney(p.p25Usd, "USD")} />
              <PeerStat label="Median" value={formatMoney(p.medianUsd, "USD")} />
              <PeerStat label="P75" value={formatMoney(p.p75Usd, "USD")} />
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PeerStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
