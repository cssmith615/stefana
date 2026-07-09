import {
  daysUntilEvent,
  getPlanningPhase,
  isValidDateOnly,
  parseDateOnly,
  subtractMonthsFromDate,
  toDateOnlyString,
} from '../dateUtils';

describe('parseDateOnly / isValidDateOnly', () => {
  it('accepts valid YYYY-MM-DD dates', () => {
    expect(parseDateOnly('2026-06-15')).toEqual({ y: 2026, m: 6, d: 15 });
    expect(isValidDateOnly('2024-02-29')).toBe(true);
  });

  it('rejects invalid calendar dates', () => {
    expect(parseDateOnly('2026-02-30')).toBeNull();
    expect(parseDateOnly('2026-13-01')).toBeNull();
    expect(parseDateOnly('2026-00-10')).toBeNull();
  });

  it('rejects malformed strings', () => {
    expect(parseDateOnly('')).toBeNull();
    expect(parseDateOnly('06/15/2026')).toBeNull();
    expect(parseDateOnly('2026-6-15')).toBeNull();
  });
});

describe('toDateOnlyString', () => {
  it('formats local calendar components with zero padding', () => {
    const date = new Date(2026, 5, 5);
    expect(toDateOnlyString(date)).toBe('2026-06-05');
  });
});

describe('daysUntilEvent', () => {
  const noon = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0);

  it('returns null for missing or invalid dates', () => {
    expect(daysUntilEvent(null)).toBeNull();
    expect(daysUntilEvent(undefined)).toBeNull();
    expect(daysUntilEvent('')).toBeNull();
    expect(daysUntilEvent('not-a-date')).toBeNull();
  });

  it('returns 0 when the event is today (local calendar)', () => {
    const now = noon(2026, 6, 14);
    expect(daysUntilEvent('2026-06-14', now)).toBe(0);
  });

  it('counts whole calendar days ahead', () => {
    const now = noon(2026, 6, 14);
    expect(daysUntilEvent('2026-06-15', now)).toBe(1);
    expect(daysUntilEvent('2026-06-13', now)).toBe(-1);
  });

  it('avoids UTC parsing off-by-one for US timezones', () => {
    // Old code: new Date('2026-06-15') is UTC midnight, which is still June 14 evening in US zones.
    const eveningLocal = new Date(2026, 5, 14, 20, 0, 0);
    expect(daysUntilEvent('2026-06-15', eveningLocal)).toBe(1);
  });

  it('is stable regardless of time-of-day on the reference date', () => {
    const morning = new Date(2026, 5, 14, 1, 0, 0);
    const lateNight = new Date(2026, 5, 14, 23, 59, 59);
    expect(daysUntilEvent('2026-06-20', morning)).toBe(6);
    expect(daysUntilEvent('2026-06-20', lateNight)).toBe(6);
  });
});

describe('subtractMonthsFromDate', () => {
  it('subtracts whole months on normal dates', () => {
    expect(subtractMonthsFromDate('2026-06-15', 6)).toBe('2025-12-15');
    expect(subtractMonthsFromDate('2026-01-10', 1)).toBe('2025-12-10');
  });

  it('clamps when the target month is shorter (month-end overflow)', () => {
    expect(subtractMonthsFromDate('2026-03-31', 1)).toBe('2026-02-28');
    expect(subtractMonthsFromDate('2024-03-31', 1)).toBe('2024-02-29');
    expect(subtractMonthsFromDate('2026-05-31', 1)).toBe('2026-04-30');
  });

  it('returns null for invalid inputs', () => {
    expect(subtractMonthsFromDate('2026-02-30', 1)).toBeNull();
    expect(subtractMonthsFromDate('2026-06-15', -1)).toBeNull();
    expect(subtractMonthsFromDate('2026-06-15', 1.5)).toBeNull();
  });

  it('returns the same date when subtracting zero months', () => {
    expect(subtractMonthsFromDate('2026-06-15', 0)).toBe('2026-06-15');
  });
});

describe('getPlanningPhase', () => {
  it('maps null to early planning', () => {
    expect(getPlanningPhase(null)).toBe('early planning (no date set)');
  });

  it('covers boundary thresholds inclusively', () => {
    expect(getPlanningPhase(366)).toBe('12+ months out');
    expect(getPlanningPhase(365)).toBe('9 months out');
    expect(getPlanningPhase(271)).toBe('9 months out');
    expect(getPlanningPhase(270)).toBe('6 months out');
    expect(getPlanningPhase(181)).toBe('6 months out');
    expect(getPlanningPhase(180)).toBe('3 months out');
    expect(getPlanningPhase(91)).toBe('3 months out');
    expect(getPlanningPhase(90)).toBe('1 month out');
    expect(getPlanningPhase(31)).toBe('1 month out');
    expect(getPlanningPhase(30)).toBe('final stretch (under 30 days!)');
    expect(getPlanningPhase(1)).toBe('final stretch (under 30 days!)');
    expect(getPlanningPhase(0)).toBe('wedding day has passed');
    expect(getPlanningPhase(-10)).toBe('wedding day has passed');
  });
});
