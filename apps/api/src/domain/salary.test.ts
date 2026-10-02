import { describe, expect, it } from 'vitest';
import { resolveCurrentSalary, validateSalaryChange } from './salary';

describe('resolveCurrentSalary', () => {
  const history = [
    { effectiveDate: '2022-04-01', amount: 70000 },
    { effectiveDate: '2024-04-01', amount: 80000 },
    { effectiveDate: '2023-04-01', amount: 75000 },
  ];

  it('returns the latest record on or before the as-of date, regardless of input order', () => {
    expect(resolveCurrentSalary(history, '2025-01-01')?.amount).toBe(80000);
  });

  it('includes a record that takes effect exactly on the as-of date', () => {
    expect(resolveCurrentSalary(history, '2023-04-01')?.amount).toBe(75000);
  });

  it('ignores future-dated (scheduled) records', () => {
    const withScheduledRaise = [...history, { effectiveDate: '2026-04-01', amount: 90000 }];
    expect(resolveCurrentSalary(withScheduledRaise, '2026-03-31')?.amount).toBe(80000);
  });

  it('returns null when nothing has taken effect yet', () => {
    expect(resolveCurrentSalary(history, '2021-12-31')).toBeNull();
    expect(resolveCurrentSalary([], '2025-01-01')).toBeNull();
  });
});

describe('validateSalaryChange', () => {
  const base = { hireDate: '2022-04-01', existingEffectiveDates: ['2022-04-01', '2023-04-01'] };

  it('allows a new date on or after the hire date', () => {
    expect(validateSalaryChange({ ...base, effectiveDate: '2024-04-01' })).toBeNull();
  });

  it('rejects a date before the hire date', () => {
    expect(validateSalaryChange({ ...base, effectiveDate: '2022-03-31' })).toMatch(/before the hire date/);
  });

  it('rejects a second record on the same effective date', () => {
    expect(validateSalaryChange({ ...base, effectiveDate: '2023-04-01' })).toMatch(/already exists/);
  });
});
