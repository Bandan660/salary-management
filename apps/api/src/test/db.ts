import { Prisma } from '@prisma/client';
import { fromIsoDate } from '../domain/dates';
import { EXCHANGE_RATES_TO_USD, RATES_AS_OF, findCountry } from '../domain/reference-data';
import { prisma } from '../lib/prisma';

/**
 * Wipe all tables and restore exchange rates. Guarded so it can only ever
 * run against a database whose name ends in "_test".
 */
export async function resetDatabase() {
  const dbName = new URL(process.env.DATABASE_URL ?? '').pathname.slice(1);
  if (!dbName.endsWith('_test')) {
    throw new Error(`Refusing to reset non-test database "${dbName}"`);
  }

  await prisma.$executeRawUnsafe('TRUNCATE TABLE salary_records, employees, exchange_rates');
  await prisma.exchangeRate.createMany({
    data: Object.entries(EXCHANGE_RATES_TO_USD).map(([currency, rateToUsd]) => ({
      currency,
      rateToUsd,
      asOf: fromIsoDate(RATES_AS_OF),
    })),
  });
}

let sequence = 0;

interface TestEmployeeOptions {
  firstName?: string;
  lastName?: string;
  country?: string;
  department?: string;
  jobTitle?: string;
  level?: Prisma.EmployeeCreateInput['level'];
  hireDate?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  /** Salary history in the employee's local currency. */
  salaries?: { amount: string; effectiveDate: string }[];
}

/** Insert an employee directly (bypassing the API) as a test fixture. */
export async function createTestEmployee(options: TestEmployeeOptions = {}) {
  sequence += 1;
  const country = options.country ?? 'US';
  const hireDate = options.hireDate ?? '2022-01-10';
  const salaries = options.salaries ?? [{ amount: '100000', effectiveDate: hireDate }];

  return prisma.employee.create({
    data: {
      employeeCode: `EMP${String(sequence).padStart(5, '0')}`,
      firstName: options.firstName ?? 'Test',
      lastName: options.lastName ?? `Person${sequence}`,
      email: `test${sequence}@acme.example`,
      country,
      department: options.department ?? 'Engineering',
      jobTitle: options.jobTitle ?? 'Software Engineer',
      level: options.level ?? 'L3',
      hireDate: fromIsoDate(hireDate),
      status: options.status ?? 'ACTIVE',
      salaries: {
        create: salaries.map((s) => ({
          amount: s.amount,
          currency: findCountry(country)!.currency,
          effectiveDate: fromIsoDate(s.effectiveDate),
        })),
      },
    },
  });
}
