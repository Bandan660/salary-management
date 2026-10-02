import { describe, expect, it } from 'vitest';
import { convertToUsd, percentChange, toMoneyNumber } from './money';

describe('convertToUsd', () => {
  it('multiplies by the rate', () => {
    expect(convertToUsd('1000000', '0.012').toString()).toBe('12000');
  });

  it('rounds half-up to cents', () => {
    // 1234.5 * 0.0067 = 8.27115 -> 8.27
    expect(convertToUsd('1234.5', '0.0067').toFixed(2)).toBe('8.27');
    // 0.125 USD rounds up, not to even
    expect(convertToUsd('0.125', '1').toFixed(2)).toBe('0.13');
  });

  it('avoids floating point drift', () => {
    // In plain JS, 0.1 * 3 === 0.30000000000000004
    expect(convertToUsd('0.1', '3').toString()).toBe('0.3');
  });

  it('rejects non-positive rates', () => {
    expect(() => convertToUsd('100', '0')).toThrow(RangeError);
    expect(() => convertToUsd('100', '-1.2')).toThrow(RangeError);
  });
});

describe('percentChange', () => {
  it('computes a raise as a positive percentage', () => {
    expect(percentChange('80000', '86000')).toBe(7.5);
  });

  it('computes a cut as a negative percentage', () => {
    expect(percentChange('100000', '90000')).toBe(-10);
  });

  it('rounds to one decimal place', () => {
    expect(percentChange('3', '4')).toBe(33.3);
  });

  it('rejects a non-positive previous amount', () => {
    expect(() => percentChange('0', '100')).toThrow(RangeError);
  });
});

describe('toMoneyNumber', () => {
  it('serializes to a number with at most two decimals', () => {
    expect(toMoneyNumber('1234.567')).toBe(1234.57);
    expect(toMoneyNumber('50000')).toBe(50000);
  });
});
