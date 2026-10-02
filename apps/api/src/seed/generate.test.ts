import { describe, expect, it } from 'vitest';
import { findCountry } from '../domain/reference-data';
import { addYears, generateEmployees } from './generate';
import { SeededRandom } from './random';

const REFERENCE_DATE = '2026-09-01';

describe('SeededRandom', () => {
  it('produces the same sequence for the same seed', () => {
    const a = new SeededRandom(42);
    const b = new SeededRandom(42);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('keeps int() within inclusive bounds', () => {
    const rng = new SeededRandom(1);
    for (let i = 0; i < 1000; i++) {
      const n = rng.int(3, 5);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
    }
  });
});

describe('addYears', () => {
  it('adds whole years', () => {
    expect(addYears('2020-06-15', 3)).toBe('2023-06-15');
  });

  it('maps Feb 29 to Feb 28 in a non-leap year', () => {
    expect(addYears('2024-02-29', 1)).toBe('2025-02-28');
  });
});

describe('generateEmployees', () => {
  // 500 is plenty to exercise every rule while keeping the test fast.
  const employees = generateEmployees(500, 7, REFERENCE_DATE);

  it('is deterministic for the same seed', () => {
    expect(generateEmployees(50, 7, REFERENCE_DATE)).toEqual(employees.slice(0, 50));
  });

  it('differs for a different seed', () => {
    expect(generateEmployees(50, 8, REFERENCE_DATE)).not.toEqual(employees.slice(0, 50));
  });

  it('generates unique, sequential employee codes and unique emails', () => {
    expect(employees[0].employeeCode).toBe('EMP00001');
    expect(employees[499].employeeCode).toBe('EMP00500');
    expect(new Set(employees.map((e) => e.email)).size).toBe(500);
  });

  it('pays every employee in their country currency', () => {
    for (const employee of employees) {
      const { currency } = findCountry(employee.country)!;
      for (const salary of employee.salaries) {
        expect(salary.currency).toBe(currency);
      }
    }
  });

  it('builds a valid salary history for every employee', () => {
    for (const { hireDate, salaries } of employees) {
      expect(salaries.length).toBeGreaterThan(0);
      expect(salaries[0].effectiveDate).toBe(hireDate);
      expect(salaries[0].reason).toBe('New hire');

      const dates = salaries.map((s) => s.effectiveDate);
      expect(new Set(dates).size).toBe(dates.length);
      expect([...dates].sort()).toEqual(dates);
      expect(dates.every((d) => d <= REFERENCE_DATE)).toBe(true);
      expect(salaries.every((s) => Number(s.amount) > 0)).toBe(true);
    }
  });

  it('never cuts pay across annual reviews', () => {
    for (const { salaries } of employees) {
      for (let i = 1; i < salaries.length; i++) {
        expect(Number(salaries[i].amount)).toBeGreaterThanOrEqual(Number(salaries[i - 1].amount));
      }
    }
  });

  it('reflects the pay model: senior engineers out-earn junior ones in the same country', () => {
    const currentUsSalary = (level: string) =>
      employees
        .filter((e) => e.country === 'US' && e.department === 'Engineering' && e.level === level)
        .map((e) => Number(e.salaries[e.salaries.length - 1].amount));
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

    expect(avg(currentUsSalary('L4'))).toBeGreaterThan(avg(currentUsSalary('L1')));
  });
});
