import {
  roundCents,
  toAmount,
  parseAmountInput,
  sumExpenses,
  totalsByCategory,
  budgetSummary,
} from '../budgetUtils';
import type { Expense } from '../../types';

/** Build an Expense with only the fields the budget math reads. */
function expense(amount: unknown, category = 'venue'): Expense {
  return {
    id: Math.random().toString(36).slice(2),
    event_id: 'evt',
    vendor_id: null,
    category: category as Expense['category'],
    description: 'x',
    // amount is typed `number` but arrives as a string from Supabase numeric columns
    amount: amount as number,
    expense_type: 'misc',
    paid_date: '2026-01-01',
    receipt_url: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
  };
}

describe('roundCents', () => {
  it('eliminates binary float drift', () => {
    expect(roundCents(0.1 + 0.2)).toBe(0.3);
    expect(roundCents(1.005)).toBe(1.01);
  });

  it('leaves clean values unchanged', () => {
    expect(roundCents(1234.5)).toBe(1234.5);
    expect(roundCents(0)).toBe(0);
  });
});

describe('toAmount', () => {
  it('passes through valid numbers, rounded to cents', () => {
    expect(toAmount(1234.5)).toBe(1234.5);
    expect(toAmount(1234.567)).toBe(1234.57);
    expect(toAmount(0)).toBe(0);
  });

  it('parses numeric strings (as Supabase returns them)', () => {
    expect(toAmount('1234.50')).toBe(1234.5);
    expect(toAmount('  42  ')).toBe(42);
    expect(toAmount('0')).toBe(0);
  });

  it('returns 0 for null, undefined, and empty/whitespace strings', () => {
    expect(toAmount(null)).toBe(0);
    expect(toAmount(undefined)).toBe(0);
    expect(toAmount('')).toBe(0);
    expect(toAmount('   ')).toBe(0);
  });

  it('returns 0 for non-numeric and non-finite values (never NaN)', () => {
    expect(toAmount('abc')).toBe(0);
    expect(toAmount('12abc')).toBe(0);
    expect(toAmount('1.2.3')).toBe(0);
    expect(toAmount(NaN)).toBe(0);
    expect(toAmount(Infinity)).toBe(0);
    expect(toAmount(-Infinity)).toBe(0);
    expect(toAmount({})).toBe(0);
    expect(toAmount([])).toBe(0);
  });

  it('clamps negative stored amounts to 0', () => {
    expect(toAmount(-50)).toBe(0);
    expect(toAmount('-50')).toBe(0);
  });

  it('never returns NaN for any of the poison inputs', () => {
    const poison = [null, undefined, '', '   ', 'abc', '12abc', '1.2.3', NaN, Infinity, {}, []];
    for (const p of poison) {
      expect(Number.isNaN(toAmount(p))).toBe(false);
    }
  });
});

describe('parseAmountInput', () => {
  it('accepts valid positive amounts', () => {
    expect(parseAmountInput('1200')).toBe(1200);
    expect(parseAmountInput('12.50')).toBe(12.5);
    expect(parseAmountInput('.5')).toBe(0.5);
    expect(parseAmountInput('  99.99  ')).toBe(99.99);
  });

  it('tolerates a leading $ and thousands separators', () => {
    expect(parseAmountInput('$1200')).toBe(1200);
    expect(parseAmountInput('$1,200.00')).toBe(1200);
    expect(parseAmountInput('1,234,567')).toBe(1234567);
  });

  it('rounds sub-cent precision to cents', () => {
    expect(parseAmountInput('12.555')).toBe(12.56);
  });

  it('rejects empty and whitespace-only input', () => {
    expect(parseAmountInput('')).toBeNull();
    expect(parseAmountInput('   ')).toBeNull();
  });

  it('rejects zero and negative amounts', () => {
    expect(parseAmountInput('0')).toBeNull();
    expect(parseAmountInput('0.00')).toBeNull();
    expect(parseAmountInput('-50')).toBeNull();
  });

  it('rejects non-numeric, scientific notation, and trailing garbage', () => {
    expect(parseAmountInput('abc')).toBeNull();
    expect(parseAmountInput('12abc')).toBeNull();
    expect(parseAmountInput('1.2.3')).toBeNull();
    expect(parseAmountInput('1e3')).toBeNull();
    expect(parseAmountInput('Infinity')).toBeNull();
    expect(parseAmountInput('5.')).toBeNull();
  });

  it('rejects non-string input defensively', () => {
    expect(parseAmountInput(null as unknown as string)).toBeNull();
    expect(parseAmountInput(undefined as unknown as string)).toBeNull();
  });
});

describe('sumExpenses', () => {
  it('returns 0 for an empty list', () => {
    expect(sumExpenses([])).toBe(0);
  });

  it('sums valid amounts with cent precision', () => {
    expect(sumExpenses([expense(0.1), expense(0.2)])).toBe(0.3);
    expect(sumExpenses([expense('1000'), expense('250.50')])).toBe(1250.5);
  });

  it('ignores poison amounts instead of returning NaN for the whole total', () => {
    const total = sumExpenses([expense('1000'), expense(null), expense('abc'), expense('250')]);
    expect(total).toBe(1250);
    expect(Number.isNaN(total)).toBe(false);
  });
});

describe('totalsByCategory', () => {
  it('groups and sums per category, NaN-safe', () => {
    const result = totalsByCategory([
      expense('100', 'venue'),
      expense('50', 'venue'),
      expense('abc', 'venue'),
      expense('200', 'catering'),
    ]);
    expect(result.venue).toBe(150);
    expect(result.catering).toBe(200);
  });

  it('omits categories with no expenses', () => {
    const result = totalsByCategory([expense('100', 'venue')]);
    expect(result.catering).toBeUndefined();
    expect(Object.keys(result)).toEqual(['venue']);
  });

  it('returns an empty object for no expenses', () => {
    expect(totalsByCategory([])).toEqual({});
  });
});

describe('budgetSummary', () => {
  it('computes spent, remaining, pct, and overBudget under budget', () => {
    const s = budgetSummary(10000, [expense('2500'), expense('1500')]);
    expect(s.totalSpent).toBe(4000);
    expect(s.remaining).toBe(6000);
    expect(s.pct).toBeCloseTo(0.4);
    expect(s.overBudget).toBe(false);
  });

  it('flags overspending and clamps pct to 1', () => {
    const s = budgetSummary(1000, [expense('1500')]);
    expect(s.totalSpent).toBe(1500);
    expect(s.remaining).toBe(-500);
    expect(s.pct).toBe(1);
    expect(s.overBudget).toBe(true);
  });

  it('treats null/zero/negative/non-finite budget as no budget (pct 0)', () => {
    for (const b of [null, undefined, 0, -1000, NaN, Infinity]) {
      const s = budgetSummary(b as number, [expense('500')]);
      expect(s.pct).toBe(0);
      expect(s.totalSpent).toBe(500);
      expect(s.remaining).toBe(-500);
      expect(s.overBudget).toBe(true);
    }
  });

  it('never produces NaN even when every amount is poison', () => {
    const s = budgetSummary(5000, [expense(null), expense('abc'), expense(NaN)]);
    expect(s.totalSpent).toBe(0);
    expect(s.remaining).toBe(5000);
    expect(s.pct).toBe(0);
    expect(s.overBudget).toBe(false);
    expect(Number.isNaN(s.pct)).toBe(false);
  });

  it('handles an empty expense list', () => {
    const s = budgetSummary(8000, []);
    expect(s.totalSpent).toBe(0);
    expect(s.remaining).toBe(8000);
    expect(s.pct).toBe(0);
    expect(s.overBudget).toBe(false);
  });
});
