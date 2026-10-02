import { describe, expect, it } from 'vitest';
import {
  COUNTRIES,
  CURRENCY_CODES,
  DEPARTMENTS,
  JOB_TITLES_BY_DEPARTMENT,
  isJobTitleInDepartment,
} from './reference-data';

describe('reference data integrity', () => {
  it('every country uses a currency that has an exchange rate', () => {
    for (const country of COUNTRIES) {
      expect(CURRENCY_CODES).toContain(country.currency);
    }
  });

  it('country codes are unique', () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('job titles are unique across departments', () => {
    const titles = DEPARTMENTS.flatMap((d) => JOB_TITLES_BY_DEPARTMENT[d]);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe('isJobTitleInDepartment', () => {
  it('accepts a title that belongs to the department', () => {
    expect(isJobTitleInDepartment('Engineering', 'Software Engineer')).toBe(true);
  });

  it('rejects a title from another department or an unknown department', () => {
    expect(isJobTitleInDepartment('Sales', 'Software Engineer')).toBe(false);
    expect(isJobTitleInDepartment('Unknown', 'Software Engineer')).toBe(false);
  });
});
