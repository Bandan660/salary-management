import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { createTestEmployee, resetDatabase } from '../../test/db';

const app = createApp();

/**
 * Hand-built population with easy numbers. Current USD salaries of active staff:
 *   US Eng  Software Engineer L3: 100k, 120k, 140k
 *   US Eng  Software Engineer L4: 160k
 *   IN Eng  Software Engineer L3: 2,500,000 INR x 0.012 = 30k
 *   US Sales Account Executive L2: 80k
 * Sorted: 30k, 80k, 100k, 120k, 140k, 160k
 */
beforeEach(async () => {
  await resetDatabase();
  const engineer = { department: 'Engineering', jobTitle: 'Software Engineer', hireDate: '2020-01-01' };

  await createTestEmployee({
    ...engineer,
    level: 'L3',
    // The 2099 raise is scheduled, so 100k is the current salary.
    salaries: [
      { amount: '90000', effectiveDate: '2020-01-01' },
      { amount: '100000', effectiveDate: '2023-01-01' },
      { amount: '999999', effectiveDate: '2099-01-01' },
    ],
  });
  await createTestEmployee({ ...engineer, level: 'L3', salaries: [{ amount: '120000', effectiveDate: '2020-01-01' }] });
  await createTestEmployee({ ...engineer, level: 'L3', salaries: [{ amount: '140000', effectiveDate: '2020-01-01' }] });
  await createTestEmployee({ ...engineer, level: 'L4', salaries: [{ amount: '160000', effectiveDate: '2020-01-01' }] });
  await createTestEmployee({
    ...engineer,
    level: 'L3',
    country: 'IN',
    salaries: [{ amount: '2500000', effectiveDate: '2020-01-01' }],
  });
  await createTestEmployee({
    department: 'Sales',
    jobTitle: 'Account Executive',
    level: 'L2',
    hireDate: '2020-01-01',
    salaries: [{ amount: '80000', effectiveDate: '2020-01-01' }],
  });
  // Leavers are excluded from pay analytics.
  await createTestEmployee({ ...engineer, status: 'INACTIVE', salaries: [{ amount: '1000000', effectiveDate: '2020-01-01' }] });
});

describe('GET /api/insights/summary', () => {
  it('computes org-wide stats over active staff in USD', async () => {
    const res = await request(app).get('/api/insights/summary');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      headcount: 6,
      totalUsd: 630000,
      minUsd: 30000,
      // percentile_cont interpolates: P25 at position 1.25 -> 80k + 0.25 * 20k
      p25Usd: 85000,
      medianUsd: 110000,
      p75Usd: 135000,
      maxUsd: 160000,
      averageUsd: 105000,
      countries: 2,
      departments: 2,
      currency: 'USD',
    });
  });

  it('applies filters', async () => {
    const res = await request(app).get('/api/insights/summary?country=US');

    expect(res.body).toMatchObject({ headcount: 5, medianUsd: 120000, countries: 1 });
  });

  it('returns zero headcount and null stats when nothing matches', async () => {
    const res = await request(app).get('/api/insights/summary?department=Legal');

    expect(res.body).toMatchObject({ headcount: 0, totalUsd: 0, medianUsd: null });
  });
});

describe('GET /api/insights/breakdown', () => {
  it('groups by country, biggest payroll first', async () => {
    const res = await request(app).get('/api/insights/breakdown?groupBy=country');

    expect(res.status).toBe(200);
    expect(res.body.rows.map((r: { group: object; headcount: number; totalUsd: number }) => [r.group, r.headcount, r.totalUsd])).toEqual([
      [{ country: 'US' }, 5, 600000],
      [{ country: 'IN' }, 1, 30000],
    ]);
  });

  it('groups by role (title + level) within a department, across countries', async () => {
    const res = await request(app).get('/api/insights/breakdown?groupBy=role&department=Engineering');

    expect(res.body.rows).toEqual([
      expect.objectContaining({
        group: { jobTitle: 'Software Engineer', level: 'L3' },
        headcount: 4,
        minUsd: 30000,
        medianUsd: 110000,
        maxUsd: 140000,
      }),
      expect.objectContaining({ group: { jobTitle: 'Software Engineer', level: 'L4' }, headcount: 1, medianUsd: 160000 }),
    ]);
  });

  it('orders levels naturally', async () => {
    const res = await request(app).get('/api/insights/breakdown?groupBy=level');

    expect(res.body.rows.map((r: { group: { level: string } }) => r.group.level)).toEqual(['L2', 'L3', 'L4']);
  });

  it('rejects an unknown groupBy', async () => {
    const res = await request(app).get('/api/insights/breakdown?groupBy=salary;DROP TABLE employees');

    expect(res.status).toBe(400);
  });
});
