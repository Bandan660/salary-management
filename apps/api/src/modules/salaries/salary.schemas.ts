import { z } from 'zod';
import { isoDate, moneyAmount } from '../../lib/validation';

export const AddSalaryBody = z.object({
  amount: moneyAmount,
  effectiveDate: isoDate,
  reason: z.string().trim().min(1).max(200).optional(),
});
export type AddSalaryBody = z.infer<typeof AddSalaryBody>;
