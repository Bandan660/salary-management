import type { IsoDate } from './dates';

export interface DatedSalary {
  effectiveDate: IsoDate;
}

/**
 * The current salary is the most recent record that has already taken effect.
 * Future-dated records (scheduled raises) are ignored until their date arrives.
 */
export function resolveCurrentSalary<T extends DatedSalary>(records: readonly T[], asOf: IsoDate): T | null {
  let current: T | null = null;
  for (const record of records) {
    if (record.effectiveDate > asOf) continue;
    if (!current || record.effectiveDate > current.effectiveDate) {
      current = record;
    }
  }
  return current;
}

export interface SalaryChangeInput {
  hireDate: IsoDate;
  effectiveDate: IsoDate;
  existingEffectiveDates: readonly IsoDate[];
}

/**
 * Business rules for adding a salary record. Returns a reason when the change
 * is invalid, or null when it is allowed.
 */
export function validateSalaryChange({ hireDate, effectiveDate, existingEffectiveDates }: SalaryChangeInput): string | null {
  if (effectiveDate < hireDate) {
    return `Effective date ${effectiveDate} is before the hire date ${hireDate}`;
  }
  if (existingEffectiveDates.includes(effectiveDate)) {
    return `A salary record already exists for ${effectiveDate}`;
  }
  return null;
}
