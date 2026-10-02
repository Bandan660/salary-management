/** Response shapes of the Express API (mirrors apps/api DTOs). */

export type JobLevel = "L1" | "L2" | "L3" | "L4" | "L5" | "L6";
export type EmployeeStatus = "ACTIVE" | "INACTIVE";

export interface Salary {
  id: string;
  amount: number;
  currency: string;
  amountUsd: number;
  effectiveDate: string;
  reason: string | null;
}

export interface SalaryHistoryEntry extends Salary {
  changePercent: number | null;
}

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  department: string;
  jobTitle: string;
  level: JobLevel;
  hireDate: string;
  status: EmployeeStatus;
  currentSalary: Salary | null;
}

export interface EmployeeDetail extends Employee {
  salaryHistory: SalaryHistoryEntry[];
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Meta {
  countries: { code: string; name: string; currency: string }[];
  departments: { name: string; jobTitles: string[] }[];
  levels: JobLevel[];
  ratesAsOf: string;
}

export interface PayStats {
  headcount: number;
  totalUsd: number;
  minUsd: number | null;
  p25Usd: number | null;
  medianUsd: number | null;
  p75Usd: number | null;
  maxUsd: number | null;
  averageUsd: number | null;
}

export interface InsightSummary extends PayStats {
  countries: number;
  departments: number;
  currency: "USD";
  asOf: string;
  ratesAsOf: string;
}

export type GroupBy = "country" | "department" | "jobTitle" | "level" | "role";

export interface InsightBreakdown {
  groupBy: GroupBy;
  asOf: string;
  ratesAsOf: string;
  rows: (PayStats & { group: Record<string, string> })[];
}

export interface ValidationIssue {
  path: (string | number)[];
  message: string;
}
