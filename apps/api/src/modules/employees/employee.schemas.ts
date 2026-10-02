import { z } from 'zod';
import { COUNTRY_CODES, DEPARTMENTS, JOB_LEVELS } from '../../domain/reference-data';
import { isoDate, moneyAmount, oneOf, optionalQuery, requiredText } from '../../lib/validation';

export const SORT_FIELDS = ['name', 'employeeCode', 'hireDate', 'country', 'department', 'jobTitle', 'level'] as const;

export const ListEmployeesQuery = z.object({
  search: optionalQuery(z.string().trim().max(100)),
  country: optionalQuery(oneOf(COUNTRY_CODES, 'country')),
  department: optionalQuery(oneOf(DEPARTMENTS, 'department')),
  jobTitle: optionalQuery(z.string().trim().max(100)),
  level: optionalQuery(z.enum(JOB_LEVELS)),
  // The directory shows current staff by default; HR can opt into leavers.
  status: z.enum(['ACTIVE', 'INACTIVE', 'ALL']).default('ACTIVE'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.enum(SORT_FIELDS).default('name'),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});
export type ListEmployeesQuery = z.infer<typeof ListEmployeesQuery>;

const email = z.string().trim().toLowerCase().pipe(z.email({ message: 'Invalid email' }).max(254));

const employeeFields = {
  firstName: requiredText(100),
  lastName: requiredText(100),
  email,
  country: oneOf(COUNTRY_CODES, 'country'),
  department: oneOf(DEPARTMENTS, 'department'),
  jobTitle: requiredText(100),
  level: z.enum(JOB_LEVELS),
  hireDate: isoDate,
};

/**
 * Creating an employee also records their starting salary. Currency is not
 * accepted from the client: it is derived from the country, which removes a
 * whole class of data-entry mistakes.
 */
export const CreateEmployeeBody = z.object({
  ...employeeFields,
  salary: z.object({
    amount: moneyAmount,
    effectiveDate: isoDate.optional(),
    reason: z.string().trim().max(200).optional(),
  }),
});
export type CreateEmployeeBody = z.infer<typeof CreateEmployeeBody>;

export const UpdateEmployeeBody = z
  .object(employeeFields)
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Provide at least one field to update' });
export type UpdateEmployeeBody = z.infer<typeof UpdateEmployeeBody>;
