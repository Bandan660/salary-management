import { describe, expect, it } from 'vitest';
import { fromIsoDate, toIsoDate, todayIsoDate } from './dates';

describe('dates', () => {
  it('round-trips an ISO date without timezone shifts', () => {
    expect(toIsoDate(fromIsoDate('2024-02-29'))).toBe('2024-02-29');
  });

  it('uses the UTC calendar date', () => {
    // 23:30 in UTC is already the next day in India (UTC+5:30); we must still say the 1st.
    expect(todayIsoDate(new Date('2026-03-01T23:30:00Z'))).toBe('2026-03-01');
  });
});
