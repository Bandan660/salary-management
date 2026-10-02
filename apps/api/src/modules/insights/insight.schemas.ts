import { z } from 'zod';
import { COUNTRY_CODES, DEPARTMENTS, JOB_LEVELS } from '../../domain/reference-data';
import { oneOf, optionalQuery } from '../../lib/validation';

/** Filters narrow the population; every insight is computed over active employees only. */
export const InsightFilters = z.object({
  country: optionalQuery(oneOf(COUNTRY_CODES, 'country')),
  department: optionalQuery(oneOf(DEPARTMENTS, 'department')),
  jobTitle: optionalQuery(z.string().trim().max(100)),
  level: optionalQuery(z.enum(JOB_LEVELS)),
});
export type InsightFilters = z.infer<typeof InsightFilters>;

export const GROUP_BY_OPTIONS = ['country', 'department', 'jobTitle', 'level', 'role'] as const;
export type GroupBy = (typeof GROUP_BY_OPTIONS)[number];

export const BreakdownQuery = InsightFilters.extend({
  groupBy: z.enum(GROUP_BY_OPTIONS),
});
