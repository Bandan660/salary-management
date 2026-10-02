/**
 * Salary dates are calendar dates (Postgres DATE), not instants.
 * We handle them as 'YYYY-MM-DD' strings so the server's timezone can never
 * shift a date by one day. Such strings also compare correctly as text.
 */

export type IsoDate = string;

/** Prisma returns DATE columns as a Date at UTC midnight. */
export function toIsoDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function fromIsoDate(isoDate: IsoDate): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function todayIsoDate(now: Date = new Date()): IsoDate {
  return toIsoDate(now);
}
