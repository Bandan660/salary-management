import { describe, expect, it } from 'vitest';
import { isoDate, moneyAmount, optionalQuery } from './validation';
import { z } from 'zod';

describe('moneyAmount', () => {
  it('accepts numbers and numeric strings and normalizes to 2 decimals', () => {
    expect(moneyAmount.parse(85000)).toBe('85000.00');
    expect(moneyAmount.parse(' 1234.5 ')).toBe('1234.50');
  });

  it.each([
    ['zero', 0],
    ['negative', -100],
    ['too many decimals', '10.123'],
    ['not a number', 'abc'],
    ['too large', 1e10],
  ])('rejects %s', (_label, value) => {
    expect(moneyAmount.safeParse(value).success).toBe(false);
  });
});

describe('isoDate', () => {
  it('accepts YYYY-MM-DD and rejects other formats or impossible dates', () => {
    expect(isoDate.safeParse('2024-02-29').success).toBe(true);
    expect(isoDate.safeParse('2023-02-29').success).toBe(false);
    expect(isoDate.safeParse('01/02/2024').success).toBe(false);
  });
});

describe('optionalQuery', () => {
  it('treats an empty query value as not provided', () => {
    const schema = optionalQuery(z.string().length(2));
    expect(schema.parse('')).toBeUndefined();
    expect(schema.parse('IN')).toBe('IN');
  });
});
