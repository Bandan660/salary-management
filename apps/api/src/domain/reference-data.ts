/**
 * Reference data shared by the seed script, validation and the UI filters.
 * Exchange rates are fixed on purpose (see docs/Architecture.md): reports stay
 * reproducible and tests stay deterministic. Values are illustrative.
 */

export const RATES_AS_OF = '2026-01-01';

export const EXCHANGE_RATES_TO_USD = {
  USD: '1',
  GBP: '1.27',
  EUR: '1.08',
  INR: '0.012',
  CAD: '0.73',
  AUD: '0.66',
  SGD: '0.74',
  BRL: '0.18',
  JPY: '0.0067',
} as const;

export type CurrencyCode = keyof typeof EXCHANGE_RATES_TO_USD;

export const CURRENCY_CODES = Object.keys(EXCHANGE_RATES_TO_USD) as CurrencyCode[];

export interface Country {
  code: string;
  name: string;
  currency: CurrencyCode;
}

export const COUNTRIES: readonly Country[] = [
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'FR', name: 'France', currency: 'EUR' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'BR', name: 'Brazil', currency: 'BRL' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
];

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);

export function findCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

/** Departments and the job titles that belong to them. */
export const JOB_TITLES_BY_DEPARTMENT: Readonly<Record<string, readonly string[]>> = {
  Engineering: ['Software Engineer', 'QA Engineer', 'DevOps Engineer', 'Data Engineer'],
  Product: ['Product Manager', 'Product Analyst'],
  Design: ['Product Designer', 'UX Researcher'],
  Sales: ['Account Executive', 'Sales Development Rep', 'Sales Manager'],
  Marketing: ['Marketing Manager', 'Content Strategist'],
  Finance: ['Financial Analyst', 'Accountant'],
  'Human Resources': ['HR Business Partner', 'Recruiter'],
  Operations: ['Operations Manager', 'Operations Analyst'],
  'Customer Support': ['Support Specialist', 'Support Team Lead'],
  Legal: ['Legal Counsel', 'Paralegal'],
};

export const DEPARTMENTS = Object.keys(JOB_TITLES_BY_DEPARTMENT);

export function isJobTitleInDepartment(department: string, jobTitle: string): boolean {
  return JOB_TITLES_BY_DEPARTMENT[department]?.includes(jobTitle) ?? false;
}

export const JOB_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as const;
