import { fromIsoDate, toIsoDate } from '../../domain/dates';
import { findCountry } from '../../domain/reference-data';
import { validateSalaryChange } from '../../domain/salary';
import { HttpError } from '../../lib/http-error';
import { prisma } from '../../lib/prisma';
import { getEmployee } from '../employees/employee.service';
import type { AddSalaryBody } from './salary.schemas';

/**
 * Record a salary change as a new history entry (never an overwrite).
 * Future effective dates are allowed: they act as scheduled raises and only
 * become the current salary once their date arrives.
 */
export async function addSalaryRecord(employeeId: string, input: AddSalaryBody) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { salaries: { select: { effectiveDate: true } } },
  });
  if (!employee) throw HttpError.notFound('Employee not found');
  if (employee.status === 'INACTIVE') {
    throw HttpError.unprocessable('Cannot change the salary of an inactive employee');
  }

  const violation = validateSalaryChange({
    hireDate: toIsoDate(employee.hireDate),
    effectiveDate: input.effectiveDate,
    existingEffectiveDates: employee.salaries.map((s) => toIsoDate(s.effectiveDate)),
  });
  if (violation) throw HttpError.unprocessable(violation);

  await prisma.salaryRecord.create({
    data: {
      employeeId,
      amount: input.amount,
      // Paid in the currency of the employee's current country.
      currency: findCountry(employee.country)!.currency,
      effectiveDate: fromIsoDate(input.effectiveDate),
      reason: input.reason,
    },
  });

  return getEmployee(employeeId);
}
