import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { createTestEmployee, resetDatabase } from '../../test/db';

const app = createApp();

const validNewEmployee = {
  firstName: 'Priya',
  lastName: 'Sharma',
  email: 'Priya.Sharma@Acme.example',
  country: 'IN',
  department: 'Engineering',
  jobTitle: 'Software Engineer',
  level: 'L3',
  hireDate: '2024-06-01',
  salary: { amount: 2400000 },
};

beforeEach(async () => {
  await resetDatabase();
});

describe('GET /api/employees', () => {
  it('paginates and reports totals', async () => {
    for (let i = 0; i < 3; i++) await createTestEmployee();

    const res = await request(app).get('/api/employees?pageSize=2&page=2');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
    expect(res.body.data).toHaveLength(1);
  });

  it('filters by country and searches across name words', async () => {
    await createTestEmployee({ firstName: 'Priya', lastName: 'Sharma', country: 'IN' });
    await createTestEmployee({ firstName: 'Priya', lastName: 'Patel', country: 'IN' });
    await createTestEmployee({ firstName: 'Priya', lastName: 'Sharma', country: 'GB' });

    const res = await request(app).get('/api/employees').query({ country: 'IN', search: 'priya sharma' });

    expect(res.body.total).toBe(1);
    expect(res.body.data[0]).toMatchObject({ lastName: 'Sharma', country: 'IN' });
  });

  it('hides inactive employees unless asked', async () => {
    await createTestEmployee({ status: 'ACTIVE' });
    await createTestEmployee({ status: 'INACTIVE' });

    expect((await request(app).get('/api/employees')).body.total).toBe(1);
    expect((await request(app).get('/api/employees?status=ALL')).body.total).toBe(2);
  });

  it('includes the current salary with a USD equivalent, ignoring future-dated records', async () => {
    await createTestEmployee({
      country: 'IN',
      hireDate: '2020-01-01',
      salaries: [
        { amount: '1000000', effectiveDate: '2020-01-01' },
        { amount: '1500000', effectiveDate: '2023-01-01' },
        { amount: '9999999', effectiveDate: '2099-01-01' },
      ],
    });

    const [employee] = (await request(app).get('/api/employees')).body.data;

    expect(employee.currentSalary).toMatchObject({ amount: 1500000, currency: 'INR', amountUsd: 18000 });
  });

  it('rejects invalid query parameters', async () => {
    const res = await request(app).get('/api/employees?pageSize=1000&country=XX');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');
  });
});

describe('POST /api/employees', () => {
  it('creates an employee with a generated code and a starting salary in local currency', async () => {
    const res = await request(app).post('/api/employees').send(validNewEmployee);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      employeeCode: 'EMP00001',
      email: 'priya.sharma@acme.example',
      status: 'ACTIVE',
      currentSalary: { amount: 2400000, currency: 'INR', effectiveDate: '2024-06-01', reason: 'New hire' },
    });
    expect(res.body.salaryHistory).toHaveLength(1);
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/employees').send(validNewEmployee);
    const res = await request(app).post('/api/employees').send(validNewEmployee);

    expect(res.status).toBe(409);
  });

  it('rejects a job title that does not belong to the department', async () => {
    const res = await request(app)
      .post('/api/employees')
      .send({ ...validNewEmployee, department: 'Sales' });

    expect(res.status).toBe(422);
  });

  it('rejects a starting salary dated before the hire date', async () => {
    const res = await request(app)
      .post('/api/employees')
      .send({ ...validNewEmployee, salary: { amount: 100, effectiveDate: '2024-05-31' } });

    expect(res.status).toBe(422);
  });

  it('reports every validation problem at once', async () => {
    const res = await request(app).post('/api/employees').send({ firstName: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.details.length).toBeGreaterThan(3);
  });
});

describe('GET /api/employees/:id', () => {
  it('returns salary history newest first with percentage changes', async () => {
    const { id } = await createTestEmployee({
      hireDate: '2021-01-01',
      salaries: [
        { amount: '80000', effectiveDate: '2021-01-01' },
        { amount: '86000', effectiveDate: '2022-01-01' },
      ],
    });

    const res = await request(app).get(`/api/employees/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.salaryHistory.map((s: { amount: number; changePercent: number | null }) => [s.amount, s.changePercent])).toEqual([
      [86000, 7.5],
      [80000, null],
    ]);
  });

  it('returns 404 for an unknown id and 400 for a malformed one', async () => {
    expect((await request(app).get('/api/employees/00000000-0000-4000-8000-000000000000')).status).toBe(404);
    expect((await request(app).get('/api/employees/not-a-uuid')).status).toBe(400);
  });
});

describe('PATCH /api/employees/:id', () => {
  it('updates fields and validates department/title against the merged result', async () => {
    const { id } = await createTestEmployee();

    const ok = await request(app).patch(`/api/employees/${id}`).send({ level: 'L4' });
    expect(ok.status).toBe(200);
    expect(ok.body.level).toBe('L4');

    const bad = await request(app).patch(`/api/employees/${id}`).send({ department: 'Sales' });
    expect(bad.status).toBe(422);
  });

  it('refuses to move the hire date after the first salary record', async () => {
    const { id } = await createTestEmployee({ hireDate: '2022-01-10' });

    const res = await request(app).patch(`/api/employees/${id}`).send({ hireDate: '2022-02-01' });

    expect(res.status).toBe(422);
  });
});

describe('deactivate / reactivate', () => {
  it('soft-deletes and restores an employee, keeping salary history', async () => {
    const { id } = await createTestEmployee();

    const off = await request(app).post(`/api/employees/${id}/deactivate`);
    expect(off.body.status).toBe('INACTIVE');
    expect(off.body.salaryHistory).toHaveLength(1);

    const on = await request(app).post(`/api/employees/${id}/reactivate`);
    expect(on.body.status).toBe('ACTIVE');
  });
});

describe('GET /api/meta', () => {
  it('returns reference data for dropdowns', async () => {
    const res = await request(app).get('/api/meta');

    expect(res.status).toBe(200);
    expect(res.body.countries).toContainEqual({ code: 'IN', name: 'India', currency: 'INR' });
    expect(res.body.levels).toEqual(['L1', 'L2', 'L3', 'L4', 'L5', 'L6']);
  });
});
