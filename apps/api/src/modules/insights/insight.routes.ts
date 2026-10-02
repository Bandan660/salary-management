import { Router } from 'express';
import { BreakdownQuery, InsightFilters } from './insight.schemas';
import { getBreakdown, getSummary } from './insight.service';

export const insightsRouter = Router();

/** Org-wide (or filtered) headline numbers: headcount, payroll, median, spread. */
insightsRouter.get('/summary', async (req, res) => {
  res.json(await getSummary(InsightFilters.parse(req.query)));
});

/**
 * Pay statistics grouped by country, department, jobTitle, level or role (title + level).
 * e.g. /api/insights/breakdown?groupBy=level&country=IN&department=Engineering
 */
insightsRouter.get('/breakdown', async (req, res) => {
  const { groupBy, ...filters } = BreakdownQuery.parse(req.query);
  res.json(await getBreakdown(groupBy, filters));
});
