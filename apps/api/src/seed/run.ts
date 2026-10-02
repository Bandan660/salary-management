import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { fromIsoDate } from '../domain/dates';
import { EXCHANGE_RATES_TO_USD, RATES_AS_OF } from '../domain/reference-data';
import { prisma } from '../lib/prisma';
import { generateEmployees } from './generate';

/**
 * Seeds the database with 10,000 deterministic employees.
 * Usage: npm run db:seed -w apps/api
 *
 * Wipes existing data first, so it refuses to run in production unless
 * SEED_ALLOW_PRODUCTION=true is set explicitly.
 */

const EMPLOYEE_COUNT = Number(process.env.SEED_EMPLOYEE_COUNT ?? 10_000);
const SEED = 20260101;
// Fixed "today" for generation so the dataset is identical whenever it's run.
const REFERENCE_DATE = '2026-09-01';
const BATCH_SIZE = 2_000;

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PRODUCTION !== 'true') {
    throw new Error('Refusing to wipe a production database. Set SEED_ALLOW_PRODUCTION=true to override.');
  }

  const started = performance.now();
  const employees = generateEmployees(EMPLOYEE_COUNT, SEED, REFERENCE_DATE);

  const employeeRows: Prisma.EmployeeCreateManyInput[] = [];
  const salaryRows: Prisma.SalaryRecordCreateManyInput[] = [];
  for (const { salaries, hireDate, ...employee } of employees) {
    const id = randomUUID();
    employeeRows.push({ ...employee, id, hireDate: fromIsoDate(hireDate) });
    for (const salary of salaries) {
      salaryRows.push({ ...salary, employeeId: id, effectiveDate: fromIsoDate(salary.effectiveDate) });
    }
  }

  // One transaction: either the full dataset lands or nothing changes.
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe('TRUNCATE TABLE salary_records, employees, exchange_rates');

      await tx.exchangeRate.createMany({
        data: Object.entries(EXCHANGE_RATES_TO_USD).map(([currency, rateToUsd]) => ({
          currency,
          rateToUsd,
          asOf: fromIsoDate(RATES_AS_OF),
        })),
      });

      for (let i = 0; i < employeeRows.length; i += BATCH_SIZE) {
        await tx.employee.createMany({ data: employeeRows.slice(i, i + BATCH_SIZE) });
      }
      for (let i = 0; i < salaryRows.length; i += BATCH_SIZE) {
        await tx.salaryRecord.createMany({ data: salaryRows.slice(i, i + BATCH_SIZE) });
      }
    },
    { timeout: 120_000 },
  );

  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(`Seeded ${employeeRows.length} employees and ${salaryRows.length} salary records in ${seconds}s`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
