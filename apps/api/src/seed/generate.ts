import { Prisma } from '@prisma/client';
import type { IsoDate } from '../domain/dates';
import {
  EXCHANGE_RATES_TO_USD,
  JOB_LEVELS,
  JOB_TITLES_BY_DEPARTMENT,
  findCountry,
} from '../domain/reference-data';
import { SeededRandom } from './random';

/**
 * Pure, deterministic generator for realistic demo data.
 * Same (count, seed, referenceDate) always yields identical output.
 * Writing to the database lives in run.ts so this stays fast to unit test.
 */

type JobLevel = (typeof JOB_LEVELS)[number];

export interface SeedSalary {
  amount: string;
  currency: string;
  effectiveDate: IsoDate;
  reason: string;
}

export interface SeedEmployee {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  department: string;
  jobTitle: string;
  level: JobLevel;
  hireDate: IsoDate;
  status: 'ACTIVE' | 'INACTIVE';
  salaries: SeedSalary[];
}

// Headcount mix: weights, not percentages.
const COUNTRY_WEIGHTS = { US: 30, IN: 25, GB: 10, DE: 8, CA: 6, FR: 5, SG: 5, AU: 4, BR: 4, JP: 3 };
const DEPARTMENT_WEIGHTS = {
  Engineering: 35,
  Sales: 15,
  'Customer Support': 12,
  Operations: 8,
  Product: 7,
  Marketing: 6,
  Design: 5,
  Finance: 5,
  'Human Resources': 4,
  Legal: 3,
};
const LEVEL_WEIGHTS: Record<JobLevel, number> = { L1: 20, L2: 28, L3: 25, L4: 15, L5: 8, L6: 4 };

// Pay model (annual, USD-equivalent): level base x department x country market x noise.
const LEVEL_BASE_USD: Record<JobLevel, number> = { L1: 70_000, L2: 90_000, L3: 115_000, L4: 145_000, L5: 185_000, L6: 235_000 };
const DEPARTMENT_PAY_FACTOR: Record<string, number> = {
  Engineering: 1.0,
  Product: 1.0,
  Legal: 1.05,
  Design: 0.9,
  Sales: 0.9,
  Finance: 0.9,
  Marketing: 0.85,
  'Human Resources': 0.8,
  Operations: 0.8,
  'Customer Support': 0.6,
};
const COUNTRY_MARKET_FACTOR: Record<string, number> = {
  US: 1.0, GB: 0.8, DE: 0.8, FR: 0.72, IN: 0.28, CA: 0.8, AU: 0.82, SG: 0.85, BR: 0.35, JP: 0.65,
};

const NAMES: Record<string, { first: string[]; last: string[] }> = {
  IN: {
    first: ['Aarav', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Sneha', 'Arjun', 'Kavya', 'Rahul', 'Isha', 'Aditya', 'Meera'],
    last: ['Sharma', 'Patel', 'Iyer', 'Reddy', 'Gupta', 'Nair', 'Mehta', 'Rao', 'Das', 'Pradhan', 'Kulkarni', 'Singh'],
  },
  JP: {
    first: ['Haruto', 'Yui', 'Sota', 'Hina', 'Ren', 'Aoi', 'Yuto', 'Sakura'],
    last: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura'],
  },
  BR: {
    first: ['Lucas', 'Julia', 'Gabriel', 'Beatriz', 'Mateus', 'Larissa', 'Rafael', 'Camila'],
    last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira', 'Almeida', 'Lima'],
  },
  EU: {
    first: ['Lukas', 'Emma', 'Felix', 'Léa', 'Jonas', 'Chloé', 'Paul', 'Hannah', 'Louis', 'Mia'],
    last: ['Müller', 'Schmidt', 'Martin', 'Bernard', 'Fischer', 'Dubois', 'Weber', 'Moreau', 'Wagner', 'Laurent'],
  },
  DEFAULT: {
    first: ['James', 'Olivia', 'Liam', 'Emma', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Chloe', 'Wei', 'Grace'],
    last: ['Smith', 'Johnson', 'Brown', 'Taylor', 'Wilson', 'Clark', 'Lee', 'Walker', 'Hall', 'Young', 'Tan', 'Wright'],
  },
};

function namePoolFor(country: string) {
  if (country === 'IN' || country === 'JP' || country === 'BR') return NAMES[country];
  if (country === 'DE' || country === 'FR') return NAMES.EU;
  return NAMES.DEFAULT;
}

const EARLIEST_HIRE_YEAR = 2015;
const ANNUAL_RAISE_PROBABILITY = 0.85;
const INACTIVE_RATE = 0.03;

/** Add whole years to an ISO date; Feb 29 falls back to Feb 28 in non-leap years. */
export function addYears(isoDate: IsoDate, years: number): IsoDate {
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = new Date(Date.UTC(y + years, m - 1, d));
  if (target.getUTCMonth() !== m - 1) target.setUTCDate(0);
  return target.toISOString().slice(0, 10);
}

function randomHireDate(rng: SeededRandom, referenceDate: IsoDate): IsoDate {
  const start = Date.UTC(EARLIEST_HIRE_YEAR, 0, 1);
  const end = Date.parse(`${referenceDate}T00:00:00Z`) - 30 * 86_400_000;
  return new Date(start + Math.floor(rng.next() * (end - start))).toISOString().slice(0, 10);
}

/** Round to a "human" salary figure: nearest 100 for most currencies, 10,000 for JPY. */
function roundSalary(amount: number, currency: string): string {
  const step = currency === 'JPY' ? 10_000 : 100;
  return String(Math.max(step, Math.round(amount / step) * step));
}

function buildSalaryHistory(
  rng: SeededRandom,
  currentLocal: number,
  currency: string,
  hireDate: IsoDate,
  referenceDate: IsoDate,
): SeedSalary[] {
  // Anniversaries since hire that have already passed; a raise may happen on each.
  const raiseDates: IsoDate[] = [];
  for (let k = 1; addYears(hireDate, k) <= referenceDate; k++) {
    if (rng.chance(ANNUAL_RAISE_PROBABILITY)) raiseDates.push(addYears(hireDate, k));
  }

  // Walk backwards from today's salary so the latest record matches the pay model.
  const amounts = [currentLocal];
  for (let i = 0; i < raiseDates.length; i++) {
    amounts.unshift(amounts[0] / (1 + rng.float(0.03, 0.1)));
  }

  return [hireDate, ...raiseDates].map((effectiveDate, i) => ({
    amount: roundSalary(amounts[i], currency),
    currency,
    effectiveDate,
    reason: i === 0 ? 'New hire' : 'Annual review',
  }));
}

export function generateEmployees(count: number, seed: number, referenceDate: IsoDate): SeedEmployee[] {
  const rng = new SeededRandom(seed);
  const employees: SeedEmployee[] = [];

  for (let i = 1; i <= count; i++) {
    const country = rng.weighted(COUNTRY_WEIGHTS);
    const { currency } = findCountry(country)!;
    const department = rng.weighted(DEPARTMENT_WEIGHTS);
    const jobTitle = rng.pick(JOB_TITLES_BY_DEPARTMENT[department]);
    const level = rng.weighted(LEVEL_WEIGHTS);
    const names = namePoolFor(country);
    const firstName = rng.pick(names.first);
    const lastName = rng.pick(names.last);
    const employeeCode = `EMP${String(i).padStart(5, '0')}`;
    const hireDate = randomHireDate(rng, referenceDate);

    const usdEquivalent =
      LEVEL_BASE_USD[level] * DEPARTMENT_PAY_FACTOR[department] * COUNTRY_MARKET_FACTOR[country] * rng.float(0.85, 1.15);
    const currentLocal = new Prisma.Decimal(usdEquivalent).div(EXCHANGE_RATES_TO_USD[currency]).toNumber();

    employees.push({
      employeeCode,
      firstName,
      lastName,
      // The code keeps emails unique even when names repeat. Uses a reserved domain.
      email: `${asciiSlug(firstName)}.${asciiSlug(lastName)}.${employeeCode.toLowerCase()}@acme.example`,
      country,
      department,
      jobTitle,
      level,
      hireDate,
      status: rng.chance(INACTIVE_RATE) ? 'INACTIVE' : 'ACTIVE',
      salaries: buildSalaryHistory(rng, currentLocal, currency, hireDate, referenceDate),
    });
  }

  return employees;
}

function asciiSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}
