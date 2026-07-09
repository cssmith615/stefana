# Correctness coverage notes

Last updated: 2026-06-14

---

# Loop 2 — Budget money math

## Target module

**Budget aggregation** (`src/utils/budgetUtils.ts`, new)

Underpins the budget ring chart, remaining/over-budget stat, per-category breakdown, category detail screen, and the budget PDF export.

## Root cause

Supabase returns Postgres `numeric` columns as **strings** (to preserve precision), so `Expense.amount` arrives as a string at runtime despite being typed `number`. The code used `Number(e.amount)` inline at 6 read sites. A single non-numeric/null/empty value (`null`, `""`, `"abc"`, a stored `NaN`) poisons the entire `reduce` to `NaN`, which then renders as **"$NaN"**, sets `pct` to `NaN`, and breaks the SVG ring (`strokeDashoffset = NaN`). The write site used `parseFloat(amount)`, which accepts `"12abc"` → 12, `"1.2.3"` → 1.2, and whitespace-only → `NaN` (the `!amount` guard misses `"   "`), silently storing a corrupt amount.

## Tests added

| File | Cases covered |
|------|----------------|
| `src/utils/__tests__/budgetUtils.test.ts` | `roundCents` (float drift), `toAmount` (number/string/null/undefined/empty/whitespace/`"abc"`/`"12abc"`/`"1.2.3"`/`NaN`/`±Infinity`/object/array/negative-clamp, never-NaN sweep), `parseAmountInput` (valid, `$`/comma tolerance, cent rounding, empty/whitespace/zero/negative/sci-notation/garbage/`"5."`/non-string reject), `sumExpenses` (empty, cent precision, poison-ignored), `totalsByCategory` (group/omit/empty), `budgetSummary` (under/over+clamp, null/0/neg/non-finite budget, all-poison, empty) |

26 new assertions. Run: `npm test` → **50 passed, 3 suites**. `tsc --noEmit` clean.

## Behavior before → after

- **Total / category rollups** — Before: `Number(e.amount)`; one bad row → whole total `NaN` → "$NaN" + broken ring. After: `sumExpenses` / `totalsByCategory` via `toAmount` coerce invalid amounts to `0`; total is always a finite, cent-rounded number.
- **Budget ring %** — Before: `pct` could be `NaN`, breaking `strokeDashoffset`. After: `budgetSummary` clamps `pct` to `[0,1]` and returns `0` for unset/`0`/negative/non-finite budget.
- **Add-expense input** — Before: `parseFloat` accepted trailing garbage and whitespace→`NaN`, saved silently. After: `parseAmountInput` returns `null` for any non-positive/invalid input; the modal shows an "Invalid amount" alert and refuses to save. Tolerates a leading `$` and thousands commas; rounds sub-cent to cents.
- **Float drift** — Before: `0.1 + 0.2` style sums displayed as `0.30000000000000004`. After: every amount and total cent-rounded.

## Wired call sites (7)

- `BudgetScreen`: total/remaining/pct/overBudget → `budgetSummary`; category map → `totalsByCategory`; recent-row display → `toAmount`; modal save → `parseAmountInput` (+ Alert on reject)
- `BudgetCategoryDetailScreen`: category total → `sumExpenses`; expense-row display → `toAmount`
- `exportUtils.exportBudgetPdf`: total → `sumExpenses`; category map → `totalsByCategory`; category + expense rows → `toAmount`

## Remaining known edge cases (not addressed this loop)

- **PDF HTML injection** — `exportUtils.exportBudgetPdf` interpolates raw `expense.description` and `vendor.business_name` into the HTML template; a `<`/`>` in user text can corrupt PDF layout. Security-adjacent; defer to a focused pass.
- Carried from Loop 1: **Auth email validation** (`EMAIL_PATTERN` duplicated, no tests); **Timeline `formatTime`** (malformed `HH:MM` not validated before PDF); **Share-code lookup** normalization (`getAssigneeTasks`, Supabase); **Purchases/RevenueCat** (dynamic require, needs mocks); **Screen/component layer** (no RN component tests; needs `jest-expo`).

## Status

**SHIP** for budget money-math correctness. No `NaN` or garbage amount can reach a total, the ring %, or the PDF. Test suite: 3 files, 50 assertions, all green; typecheck clean.

---

# Loop 1 — Date & export utilities

## Target module

**Date & export utilities** (`src/utils/dateUtils.ts`, `src/utils/exportFormatters.ts`)

These underpin countdown displays, checklist due-date seeding, AI planning phase, overdue-task detection, and CSV/PDF exports.

## Tests added

| File | Cases covered |
|------|----------------|
| `src/utils/__tests__/dateUtils.test.ts` | Date parsing/validation, `daysUntilEvent` (null, today, past/future, timezone stability), `subtractMonthsFromDate` (month-end clamp), `getPlanningPhase` boundaries |
| `src/utils/__tests__/exportFormatters.test.ts` | `csvCell` (comma, quote, newline, CRLF), `sanitizeFilename` (strip, truncate, empty fallback) |

Run: `npm test`

## Behavior before → after

### `daysUntilEvent`

- **Before:** Duplicated `Math.ceil((new Date(YYYY-MM-DD) - Date.now()) / day)` in 5 screens. `new Date('YYYY-MM-DD')` parses as **UTC midnight**, causing off-by-one countdowns for US users in the evening.
- **After:** Single helper using **local calendar dates**. Returns `null` for invalid/missing dates. Negative values mean the wedding date has passed.

### Checklist due-date seeding (`seedChecklistFromTemplate`)

- **Before:** `setMonth` + `toISOString()` could shift dates across timezones and overflow month-end (e.g. Mar 31 − 1 month → Mar 3).
- **After:** `subtractMonthsFromDate` clamps to the last valid day of the target month.

### Overdue / upcoming tasks (AI context)

- **Before:** `today` derived from `toISOString()` (UTC), misclassifying tasks near timezone boundaries.
- **After:** `toDateOnlyString(now)` for local-date string comparisons.

### CSV export

- **Before:** `csvCell` did not quote `\r`; empty filenames possible after sanitization.
- **After:** CRLF quoted; `sanitizeFilename` returns `'export'` when nothing remains.

### AI planning phase

- **Before:** Inline threshold logic in `buildSystemPrompt`.
- **After:** Shared `getPlanningPhase` with explicit boundary tests (unchanged user-facing thresholds).

## Wired call sites

- `DashboardScreen`, `AIAssistantScreen`, `DayOfTimelineScreen`, `ClientDetailScreen`, `ProDashboardScreen` → `daysUntilEvent`
- `eventStore.seedChecklistFromTemplate` → `subtractMonthsFromDate`
- `aiAssistant.buildSystemPrompt` → `getPlanningPhase`

## Remaining known edge cases (not addressed this loop)

- **Auth email validation** — `EMAIL_PATTERN` duplicated in SignIn/SignUp; no tests yet.
- **Expense amounts** — `Number(e.amount)` without NaN guards in budget rollups.
- **Timeline `formatTime`** — malformed `HH:MM` strings not validated before PDF export.
- **Share-code lookup** — `getAssigneeTasks` relies on Supabase; no unit tests for code normalization.
- **Purchases / RevenueCat** — dynamic require; needs integration mocks.
- **Screen/component layer** — no React Native component tests yet (would need `jest-expo` or Detox).

## Status

**SHIP** for date/export utility correctness. Test suite: 2 files, 24 assertions, all green after `npm test`.
