import { Prisma } from '@prisma/client';
import { z } from 'zod';

/** Reusable zod building blocks for request validation. */

export const isoDate = z.iso.date({ message: 'Expected a date in YYYY-MM-DD format' });

export const uuidParam = z.object({ id: z.uuid({ message: 'Invalid id' }) });

export const requiredText = (max: number) => z.string().trim().min(1, 'Required').max(max);

export const oneOf = (values: readonly string[], label: string) =>
  z.string().refine((v) => values.includes(v), { message: `Unknown ${label}` });

/** Query strings send "" for cleared filters; treat that as "not provided". */
export const optionalQuery = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

/**
 * Money input: number or numeric string, positive, at most 2 decimals.
 * Returned as a string so it reaches the database without float rounding.
 */
export const moneyAmount = z
  .union([z.number(), z.string().trim()])
  .transform((value, ctx) => {
    let amount: Prisma.Decimal;
    try {
      amount = new Prisma.Decimal(value);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Amount must be a number' });
      return z.NEVER;
    }
    if (amount.lte(0)) ctx.addIssue({ code: 'custom', message: 'Amount must be positive' });
    if (amount.decimalPlaces() > 2) ctx.addIssue({ code: 'custom', message: 'Amount can have at most 2 decimals' });
    if (amount.gte(1e10)) ctx.addIssue({ code: 'custom', message: 'Amount is too large' });
    return amount.toFixed(2);
  });
