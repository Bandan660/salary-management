import { Prisma } from '@prisma/client';
import { fromIsoDate, todayIsoDate, toIsoDate } from '../../domain/dates';
import { findCountry, isJobTitleInDepartment } from '../../domain/reference-data';
import { resolveCurrentSalary, validateSalaryChange } from '../../domain/salary';
import { HttpError } from '../../lib/http-error';
import { prisma } from '../../lib/prisma';
import { toEmployeeDto, toSalaryHistory } from './employee.dto';
import type { CreateEmployeeBody, ListEmployeesQuery, UpdateEmployeeBody } from './employee.schemas';

const EMPLOYEE_CODE_PREFIX = 'EMP';

function orderByFor(sortBy: ListEmployeesQuery['sortBy'], dir: Prisma.SortOrder): Prisma.EmployeeOrderByWithRelationInput[] {
  // employeeCode as the final tiebreaker keeps pagination stable.
  const tiebreaker = { employeeCode: 'asc' as const };
  if (sortBy === 'name') return [{ lastName: dir }, { firstName: dir }, tiebreaker];
  if (sortBy === 'employeeCode') return [{ employeeCode: dir }];
  return [{ [sortBy]: dir }, tiebreaker];
}

/** Each search word must match at least one of name, code or email. "priya sharma" finds Priya Sharma. */
function searchFilter(search: string | undefined): Prisma.EmployeeWhereInput[] {
  if (!search) return [];
  return search
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => ({
      OR: [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { employeeCode: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ],
    }));
}

export async function listEmployees(query: ListEmployeesQuery, today = todayIsoDate()) {
  const where: Prisma.EmployeeWhereInput = {
    country: query.country,
    department: query.department,
    jobTitle: query.jobTitle,
    level: query.level,
    status: query.status === 'ALL' ? undefined : query.status,
    AND: searchFilter(query.search),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      orderBy: orderByFor(query.sortBy, query.sortDir),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        // Only the current salary: latest record already in effect.
        salaries: {
          where: { effectiveDate: { lte: fromIsoDate(today) } },
          orderBy: { effectiveDate: 'desc' },
          take: 1,
          include: { exchangeRate: true },
        },
      },
    }),
  ]);

  return {
    data: rows.map(({ salaries, ...employee }) => toEmployeeDto(employee, salaries[0] ?? null)),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
  };
}

export async function getEmployee(id: string, today = todayIsoDate()) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { salaries: { orderBy: { effectiveDate: 'asc' }, include: { exchangeRate: true } } },
  });
  if (!employee) throw HttpError.notFound('Employee not found');

  const { salaries, ...rest } = employee;
  const current = resolveCurrentSalary(
    salaries.map((record) => ({ effectiveDate: toIsoDate(record.effectiveDate), record })),
    today,
  );

  return {
    ...toEmployeeDto(rest, current?.record ?? null),
    salaryHistory: toSalaryHistory(salaries),
  };
}

function assertJobTitleMatchesDepartment(department: string, jobTitle: string) {
  if (!isJobTitleInDepartment(department, jobTitle)) {
    throw HttpError.unprocessable(`"${jobTitle}" is not a job title in ${department}`);
  }
}

async function nextEmployeeCode(tx: Prisma.TransactionClient): Promise<string> {
  const last = await tx.employee.findFirst({
    where: { employeeCode: { startsWith: EMPLOYEE_CODE_PREFIX } },
    orderBy: { employeeCode: 'desc' },
    select: { employeeCode: true },
  });
  const lastNumber = last ? Number(last.employeeCode.slice(EMPLOYEE_CODE_PREFIX.length)) : 0;
  return `${EMPLOYEE_CODE_PREFIX}${String(lastNumber + 1).padStart(5, '0')}`;
}

export async function createEmployee(input: CreateEmployeeBody) {
  assertJobTitleMatchesDepartment(input.department, input.jobTitle);

  const effectiveDate = input.salary.effectiveDate ?? input.hireDate;
  const violation = validateSalaryChange({ hireDate: input.hireDate, effectiveDate, existingEffectiveDates: [] });
  if (violation) throw HttpError.unprocessable(violation);

  const { salary, hireDate, ...fields } = input;
  // Concurrent creates could pick the same code; the unique index turns that into a 409.
  const created = await prisma.$transaction(async (tx) =>
    tx.employee.create({
      data: {
        ...fields,
        employeeCode: await nextEmployeeCode(tx),
        hireDate: fromIsoDate(hireDate),
        salaries: {
          create: {
            amount: salary.amount,
            currency: findCountry(input.country)!.currency,
            effectiveDate: fromIsoDate(effectiveDate),
            reason: salary.reason ?? 'New hire',
          },
        },
      },
    }),
  );

  return getEmployee(created.id);
}

export async function updateEmployee(id: string, patch: UpdateEmployeeBody) {
  const existing = await prisma.employee.findUnique({
    where: { id },
    include: { salaries: { orderBy: { effectiveDate: 'asc' }, take: 1 } },
  });
  if (!existing) throw HttpError.notFound('Employee not found');

  assertJobTitleMatchesDepartment(patch.department ?? existing.department, patch.jobTitle ?? existing.jobTitle);

  // Moving the hire date must not leave salary records dated before employment began.
  const firstSalary = existing.salaries[0];
  if (patch.hireDate && firstSalary && patch.hireDate > toIsoDate(firstSalary.effectiveDate)) {
    throw HttpError.unprocessable(
      `Hire date cannot be after the first salary record (${toIsoDate(firstSalary.effectiveDate)})`,
    );
  }

  const { hireDate, ...fields } = patch;
  await prisma.employee.update({
    where: { id },
    data: { ...fields, ...(hireDate && { hireDate: fromIsoDate(hireDate) }) },
  });

  return getEmployee(id);
}

export async function setEmployeeStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
  await prisma.employee.update({ where: { id }, data: { status } });
  return getEmployee(id);
}
