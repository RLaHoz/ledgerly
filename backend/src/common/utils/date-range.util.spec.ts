import { resolveCurrentMonthRangeForUser } from './date-range.util';

describe('resolveCurrentMonthRangeForUser', () => {
  it('computes month start in user time zone and returns UTC boundaries', () => {
    const now = new Date('2026-03-07T00:15:00.000Z');
    const result = resolveCurrentMonthRangeForUser('Australia/Brisbane', now);

    expect(result.timeZone).toBe('Australia/Brisbane');
    expect(result.fromUtc.toISOString()).toBe('2026-02-28T14:00:00.000Z');
    expect(result.toUtc.toISOString()).toBe(now.toISOString());
  });

  it('falls back to UTC when timezone is invalid', () => {
    const now = new Date('2026-03-07T00:15:00.000Z');
    const result = resolveCurrentMonthRangeForUser('Invalid/Zone', now);

    expect(result.timeZone).toBe('UTC');
    expect(result.fromUtc.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });
});
