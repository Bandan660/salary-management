import type { Employee, ExchangeRate, SalaryRecord } from '@prisma/client';
import { toIsoDate } from '../../domain/dates';
import { convertToUsd, percentChange, toMoneyNumber } from '../../domain/money';

/** Shapes returned by the API. Kept separate from Prisma models so the DB can evolve freely. */

export type SalaryWithRate = SalaryRecord & { exchangeRate: ExchangeRate };

export interface SalaryDto {
  id: string;
  amount: number;
  currency: string;
  amountUsd: number;
  effectiveDate: string;
  reason: string | null;
}

export interface SalaryHistoryEntryDto extends SalaryDto {
  /** % change vs the previous record; null for the first record or after a currency change. */
  changePercent: number | null;
}

export interface EmployeeDto {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  department: string;
  jobTitle: string;
  level: string;
  hireDate: string;
  status: string;
  currentSalary: SalaryDto | null;
}

export function toSalaryDto(record: SalaryWithRate): SalaryDto {
  return {
    id: record.id,
    amount: toMoneyNumber(record.amount),
    currency: record.currency,
    amountUsd: toMoneyNumber(convertToUsd(record.amount, record.exchangeRate.rateToUsd)),
    effectiveDate: toIsoDate(record.effectiveDate),
    reason: record.reason,
  };
}

/** @param chronological salary records ordered oldest first */
export function toSalaryHistory(chronological: readonly SalaryWithRate[]): SalaryHistoryEntryDto[] {
  return chronological
    .map((record, i) => {
      const previous = chronological[i - 1];
      const comparable = previous && previous.currency === record.currency;
      return {
        ...toSalaryDto(record),
        changePercent: comparable ? percentChange(previous.amount, record.amount) : null,
      };
    })
    .reverse(); // newest first for display
}

export function toEmployeeDto(employee: Employee, currentSalary: SalaryWithRate | null): EmployeeDto {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    country: employee.country,
    department: employee.department,
    jobTitle: employee.jobTitle,
    level: employee.level,
    hireDate: toIsoDate(employee.hireDate),
    status: employee.status,
    currentSalary: currentSalary ? toSalaryDto(currentSalary) : null,
  };
}
