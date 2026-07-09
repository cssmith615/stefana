/**
 * Budget money math. All amounts are USD with cent precision.
 *
 * Why this exists: Supabase returns Postgres `numeric` columns as *strings*
 * (to preserve precision), so `Expense.amount` arrives as a string at runtime
 * even though it is typed `number`. A single malformed value (`null`, `""`,
 * `"abc"`, `NaN`) passed through `Number()` poisons an entire `reduce` into
 * `NaN`, which then renders as "$NaN" and breaks the budget ring. Every read of
 * an amount must go through `toAmount`; every total through `sumExpenses`.
 */

import type { Expense } from '../types';

/** Round to whole cents to avoid binary float drift (0.1 + 0.2 → 0.30, not 0.30000000000000004). */
export function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Coerce a stored expense amount to a safe, finite, non-negative number.
 * Accepts `number` or numeric `string`. Anything invalid → `0` (never `NaN`),
 * so one bad row can't corrupt a total. Negative stored values are clamped to 0.
 */
export function toAmount(value: unknown): number {
  let n: number;
  if (typeof value === 'number') {
    n = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return 0;
    n = Number(trimmed);
  } else {
    return 0;
  }
  if (!Number.isFinite(n) || n < 0) return 0;
  return roundCents(n);
}

/**
 * Strict parser for user-typed amounts (Add Expense modal).
 * Returns a positive, cent-rounded number, or `null` when the input is not a
 * valid positive amount — the caller must reject `null` rather than silently
 * storing `NaN`. Tolerates a leading `$` and thousands separators; rejects
 * empty/whitespace, scientific notation, trailing garbage, multiple dots,
 * negatives, and zero.
 */
export function parseAmountInput(raw: string): number | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().replace(/^\$/, '').replace(/,/g, '');
  if (!/^\d*\.?\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return roundCents(n);
}

/** NaN-safe sum of expense amounts. Empty list → 0. */
export function sumExpenses(expenses: Expense[]): number {
  return roundCents(expenses.reduce((s, e) => s + toAmount(e.amount), 0));
}

/** Per-category spent totals, NaN-safe. Categories with no expenses are absent. */
export function totalsByCategory(expenses: Expense[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const e of expenses) {
    map[e.category] = roundCents((map[e.category] ?? 0) + toAmount(e.amount));
  }
  return map;
}

export interface BudgetSummary {
  totalSpent: number;
  remaining: number;
  /** Fraction of budget used, clamped to [0, 1]. 0 when the budget is unset or non-positive. */
  pct: number;
  overBudget: boolean;
}

/**
 * Roll up spending against a target budget. Safe for a `null`, `0`, negative,
 * or non-finite `totalBudget`. `pct` is clamped to [0, 1] for ring rendering;
 * `remaining`/`overBudget` still reflect the true (possibly negative) balance.
 */
export function budgetSummary(
  totalBudget: number | null | undefined,
  expenses: Expense[],
): BudgetSummary {
  const budget = Number.isFinite(totalBudget as number) && (totalBudget as number) > 0
    ? (totalBudget as number)
    : 0;
  const totalSpent = sumExpenses(expenses);
  const remaining = roundCents(budget - totalSpent);
  const pct = budget > 0 ? Math.min(totalSpent / budget, 1) : 0;
  return { totalSpent, remaining, pct, overBudget: remaining < 0 };
}
