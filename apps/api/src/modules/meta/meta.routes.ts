import { Router } from 'express';
import { COUNTRIES, JOB_LEVELS, JOB_TITLES_BY_DEPARTMENT, RATES_AS_OF } from '../../domain/reference-data';

/** Reference data for UI dropdowns, so the frontend never hard-codes these lists. */
export const metaRouter = Router();

metaRouter.get('/', (_req, res) => {
  res.json({
    countries: COUNTRIES,
    departments: Object.entries(JOB_TITLES_BY_DEPARTMENT).map(([name, jobTitles]) => ({ name, jobTitles })),
    levels: JOB_LEVELS,
    ratesAsOf: RATES_AS_OF,
  });
});
