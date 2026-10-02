import { Prisma } from '@prisma/client';

/**
 * Money math uses Decimal (never floating point) so totals don't drift.
 * Values become plain numbers only at the API boundary, rounded to cents.
 */
const Decimal = Prisma.Decimal;
type DecimalValue = Prisma.Decimal.Value;

/** Convert an amount in local currency to USD, rounded half-up to cents. */
export function convertToUsd(amount: DecimalValue, rateToUsd: DecimalValue): Prisma.Decimal {
  const rate = new Decimal(rateToUsd);
  if (rate.lte(0)) {
    throw new RangeError('Exchange rate must be positive');
  }
  return new Decimal(amount).mul(rate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** Percentage change from `previous` to `next`, rounded to one decimal place. */
export function percentChange(previous: DecimalValue, next: DecimalValue): number {
  const prev = new Decimal(previous);
  if (prev.lte(0)) {
    throw new RangeError('Previous amount must be positive');
  }
  return new Decimal(next).minus(prev).div(prev).mul(100).toDecimalPlaces(1).toNumber();
}

/** Serialize a Decimal for JSON responses. */
export function toMoneyNumber(value: DecimalValue): number {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}
