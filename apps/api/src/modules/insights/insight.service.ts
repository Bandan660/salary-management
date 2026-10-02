import { Prisma } from '@prisma/client';
import { todayIsoDate, type IsoDate } from '../../domain/dates';
import { toMoneyNumber } from '../../domain/money';
import { RATES_AS_OF } from '../../domain/reference-data';
import { prisma } from '../../lib/prisma';
import type { GroupBy, InsightFilters } from './insight.schemas';

/**
 * Pay analytics, computed entirely in Postgres: 10k employees aggregate in
 * milliseconds and only the summary rows cross the wire.
 *
 * Population: ACTIVE employees, using each one's current salary (latest record
 * effective on or before today), normalized to USD with the fixed rate table.
 */

/** Group-by options map to whitelisted columns; user input never becomes SQL. */
const GROUP_COLUMNS: Record<GroupBy, { column: string; key: string }[]> = {
  country: [{ column: 'country', key: 'country' }],
  department: [{ column: 'department', key: 'department' }],
  jobTitle: [{ column: 'job_title', key: 'jobTitle' }],
  level: [{ column: 'level', key: 'level' }],
  role: [
    { column: 'job_title', key: 'jobTitle' },
    { column: 'level', key: 'level' },
  ],
};

interface StatsRow {
  headcount: number;
  total_usd: Prisma.Decimal | null;
  min_usd: Prisma.Decimal | null;
  p25_usd: Prisma.Decimal | null;
  median_usd: Prisma.Decimal | null;
  p75_usd: Prisma.Decimal | null;
  max_usd: Prisma.Decimal | null;
  average_usd: Prisma.Decimal | null;
}

export interface PayStats {
  headcount: number;
  totalUsd: number;
  minUsd: number | null;
  p25Usd: number | null;
  medianUsd: number | null;
  p75Usd: number | null;
  maxUsd: number | null;
  averageUsd: number | null;
}

function currentSalaryCte(today: IsoDate) {
  return Prisma.sql`
    WITH current_salary AS (
      SELECT DISTINCT ON (s.employee_id) s.employee_id, s.amount * r.rate_to_usd AS usd
      FROM salary_records s
      JOIN exchange_rates r ON r.currency = s.currency
      WHERE s.effective_date <= ${today}::date
      ORDER BY s.employee_id, s.effective_date DESC
    )`;
}

const STATS_COLUMNS = Prisma.sql`
  count(*)::int AS headcount,
  round(sum(c.usd), 2) AS total_usd,
  round(min(c.usd), 2) AS min_usd,
  round((percentile_cont(0.25) WITHIN GROUP (ORDER BY c.usd))::numeric, 2) AS p25_usd,
  round((percentile_cont(0.5) WITHIN GROUP (ORDER BY c.usd))::numeric, 2) AS median_usd,
  round((percentile_cont(0.75) WITHIN GROUP (ORDER BY c.usd))::numeric, 2) AS p75_usd,
  round(max(c.usd), 2) AS max_usd,
  round(avg(c.usd), 2) AS average_usd`;

function whereClause(filters: InsightFilters) {
  const conditions = [Prisma.sql`e.status = 'ACTIVE'`];
  if (filters.country) conditions.push(Prisma.sql`e.country = ${filters.country}`);
  if (filters.department) conditions.push(Prisma.sql`e.department = ${filters.department}`);
  if (filters.jobTitle) conditions.push(Prisma.sql`e.job_title = ${filters.jobTitle}`);
  if (filters.level) conditions.push(Prisma.sql`e.level = ${filters.level}::"JobLevel"`);
  return Prisma.join(conditions, ' AND ');
}

const money = (value: Prisma.Decimal | null) => (value === null ? null : toMoneyNumber(value));

function toPayStats(row: StatsRow): PayStats {
  return {
    headcount: row.headcount,
    totalUsd: money(row.total_usd) ?? 0,
    minUsd: money(row.min_usd),
    p25Usd: money(row.p25_usd),
    medianUsd: money(row.median_usd),
    p75Usd: money(row.p75_usd),
    maxUsd: money(row.max_usd),
    averageUsd: money(row.average_usd),
  };
}

export async function getSummary(filters: InsightFilters, today = todayIsoDate()) {
  const [row] = await prisma.$queryRaw<(StatsRow & { countries: number; departments: number })[]>`
    ${currentSalaryCte(today)}
    SELECT ${STATS_COLUMNS},
      count(DISTINCT e.country)::int AS countries,
      count(DISTINCT e.department)::int AS departments
    FROM employees e
    JOIN current_salary c ON c.employee_id = e.id
    WHERE ${whereClause(filters)}`;

  return {
    ...toPayStats(row),
    countries: row.countries,
    departments: row.departments,
    currency: 'USD',
    asOf: today,
    ratesAsOf: RATES_AS_OF,
  };
}

export async function getBreakdown(groupBy: GroupBy, filters: InsightFilters, today = todayIsoDate()) {
  const groups = GROUP_COLUMNS[groupBy];
  const groupColumns = Prisma.join(groups.map((g) => Prisma.raw(`e.${g.column}`)));
  // Levels read naturally in order (L1..L6); other groupings by biggest payroll first.
  const orderBy = groupBy === 'level' || groupBy === 'role' ? groupColumns : Prisma.sql`total_usd DESC`;

  const rows = await prisma.$queryRaw<(StatsRow & Record<string, unknown>)[]>`
    ${currentSalaryCte(today)}
    SELECT ${groupColumns}, ${STATS_COLUMNS}
    FROM employees e
    JOIN current_salary c ON c.employee_id = e.id
    WHERE ${whereClause(filters)}
    GROUP BY ${groupColumns}
    ORDER BY ${orderBy}`;

  return {
    groupBy,
    currency: 'USD',
    asOf: today,
    ratesAsOf: RATES_AS_OF,
    rows: rows.map((row) => ({
      group: Object.fromEntries(groups.map((g) => [g.key, String(row[g.column])])),
      ...toPayStats(row),
    })),
  };
}
