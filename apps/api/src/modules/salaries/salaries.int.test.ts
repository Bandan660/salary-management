import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { createTestEmployee, resetDatabase } from '../../test/db';

const app = createApp();

beforeEach(async () => {
  await resetDatabase();
});

describe('POST /api/employees/:id/salaries', () => {
  it('appends a raise, keeps history, and makes it the current salary', async () => {
    const { id } = await createTestEmployee({
      country: 'GB',
      hireDate: '2022-01-10',
      salaries: [{ amount: '60000', effectiveDate: '2022-01-10' }],
    });

    const res = await request(app)
      .post(`/api/employees/${id}/salaries`)
      .send({ amount: '66000', effectiveDate: '2024-04-01', reason: 'Promotion' });

    expect(res.status).toBe(201);
    expect(res.body.currentSalary).toMatchObject({ amount: 66000, currency: 'GBP', reason: 'Promotion' });
    expect(res.body.salaryHistory).toHaveLength(2);
    expect(res.body.salaryHistory[0].changePercent).toBe(10);
  });

  it('accepts a future-dated raise without changing the current salary yet', async () => {
    const { id } = await createTestEmployee({ salaries: [{ amount: '100000', effectiveDate: '2022-01-10' }] });

    const res = await request(app)
      .post(`/api/employees/${id}/salaries`)
      .send({ amount: '110000', effectiveDate: '2099-01-01' });

    expect(res.status).toBe(201);
    expect(res.body.currentSalary.amount).toBe(100000);
    expect(res.body.salaryHistory[0]).toMatchObject({ amount: 110000, effectiveDate: '2099-01-01' });
  });

  it('rejects a second record on the same effective date', async () => {
    const { id } = await createTestEmployee({ salaries: [{ amount: '100000', effectiveDate: '2022-01-10' }] });

    const res = await request(app)
      .post(`/api/employees/${id}/salaries`)
      .send({ amount: '120000', effectiveDate: '2022-01-10' });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/already exists/);
  });

  it('rejects changes for inactive employees', async () => {
    const { id } = await createTestEmployee({ status: 'INACTIVE' });

    const res = await request(app)
      .post(`/api/employees/${id}/salaries`)
      .send({ amount: '1', effectiveDate: '2024-01-01' });

    expect(res.status).toBe(422);
  });

  it('validates the body', async () => {
    const { id } = await createTestEmployee();

    const res = await request(app).post(`/api/employees/${id}/salaries`).send({ amount: -5 });

    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown employee', async () => {
    const res = await request(app)
      .post('/api/employees/00000000-0000-4000-8000-000000000000/salaries')
      .send({ amount: '1000', effectiveDate: '2024-01-01' });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/employees/:id/salaries', () => {
  it('returns the history newest first', async () => {
    const { id } = await createTestEmployee({
      hireDate: '2021-01-01',
      salaries: [
        { amount: '50000', effectiveDate: '2021-01-01' },
        { amount: '55000', effectiveDate: '2022-01-01' },
      ],
    });

    const res = await request(app).get(`/api/employees/${id}/salaries`);

    expect(res.status).toBe(200);
    expect(res.body.map((s: { effectiveDate: string }) => s.effectiveDate)).toEqual(['2022-01-01', '2021-01-01']);
  });
});
