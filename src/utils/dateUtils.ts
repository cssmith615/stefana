/** Calendar-date helpers (YYYY-MM-DD). All math uses local timezone midnight. */

export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateOnly(value: string): boolean {
  return parseDateOnly(value) !== null;
}

export function parseDateOnly(value: string): { y: number; m: number; d: number } | null {
  if (!DATE_ONLY_PATTERN.test(value)) return null;

  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  return { y, m, d };
}

export function toDateOnlyString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole calendar days from `now`'s date until `eventDate`. Negative means the date has passed. */
export function daysUntilEvent(
  eventDate: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!eventDate) return null;

  const parsed = parseDateOnly(eventDate);
  if (!parsed) return null;

  const target = new Date(parsed.y, parsed.m - 1, parsed.d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Subtract whole months from a calendar date, clamping to the last valid day
 * when the target month is shorter (e.g. Mar 31 minus 1 month → Feb 28/29).
 */
export function subtractMonthsFromDate(dateStr: string, months: number): string | null {
  if (months < 0 || !Number.isInteger(months)) return null;

  const parsed = parseDateOnly(dateStr);
  if (!parsed) return null;

  const date = new Date(parsed.y, parsed.m - 1, parsed.d);
  const originalDay = parsed.d;
  date.setMonth(date.getMonth() - months);

  if (date.getDate() !== originalDay) {
    date.setDate(0);
  }

  return toDateOnlyString(date);
}

export type PlanningPhase =
  | '12+ months out'
  | '9 months out'
  | '6 months out'
  | '3 months out'
  | '1 month out'
  | 'final stretch (under 30 days!)'
  | 'wedding day has passed'
  | 'early planning (no date set)';

export function getPlanningPhase(daysUntil: number | null): PlanningPhase {
  if (daysUntil == null) return 'early planning (no date set)';
  if (daysUntil > 365) return '12+ months out';
  if (daysUntil > 270) return '9 months out';
  if (daysUntil > 180) return '6 months out';
  if (daysUntil > 90) return '3 months out';
  if (daysUntil > 30) return '1 month out';
  if (daysUntil > 0) return 'final stretch (under 30 days!)';
  return 'wedding day has passed';
}
