# Tá Pago Hub — CLAUDE.md

Project context and architectural decisions for Claude Code sessions.

---

## Project overview

**Tá Pago Hub** is a personal/business finance manager built with React 19 + TypeScript + Supabase. It supports multiple financial profiles per household (personal and business), bank extract imports with reconciliation, bill tracking, goals, and analytics.

**Dev:** `npm run dev` | **Build:** `npm run build` (requires Node ≥ 20, but tsc works fine on Node 18 for type-checking)

---

## Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript 5.9 + Vite 8 |
| Styling | Tailwind CSS v4 (CSS variable–based at runtime) |
| Backend / Auth | Supabase (PostgreSQL + RLS + Auth) |
| Data fetching | TanStack React Query v5 |
| Routing | React Router v7 |
| Charts | Recharts v3 |
| Icons | Lucide React |
| PWA | vite-plugin-pwa + Workbox |

---

## Architecture decisions

### Multi-profile system
Each user belongs to a `household`. Households have one or more `financial_profiles` (type: `personal` | `business`). Every data table is scoped by `financial_profile_id`. All queries must filter by `activeFinancialProfileId` from `useAuth()`.

### Theme system
- **Single source of truth:** `src/styles/themes.css` — all color overrides live here, organized by mode and accent.
- `index.css` only bootstraps Tailwind and imports `themes.css`.
- Themes work via HTML `data-*` attributes (`data-mode`, `data-accent`) set on `<html>`.
- Tailwind v4 reads CSS variables at runtime — overriding `--color-slate-*` or `--color-emerald-*` affects all utilities transparently.
- **To add a new accent:** copy a `[data-accent="..."]` block in `themes.css`, pick oklch values, add the key to `ThemeMode`/`ThemeAccent` in `src/lib/theme.ts`, and add a button in `SettingsPage.tsx`.
- **Dark mode is the default** (no overrides needed). Light mode remaps the full slate scale in `themes.css`.

### Color scale anatomy
```
slate-950  body background
slate-900  card / panel background
slate-800  input / secondary panel
slate-700  borders, dividers
slate-600  strong borders / muted dividers
slate-500  placeholder, subtle text
slate-400  secondary / muted text
slate-300  body text
slate-200  strong body text
slate-100  headings / primary text
white      button labels on colored backgrounds
```

### Bank import + reconciliation
1. User uploads CSV or OFX → `csvParser.ts` detects bank format (Nubank, Inter, Itaú, Bradesco, BB, generic).
2. Transactions inserted into `bank_transactions` in batches of 100.
3. ReconciliationPage groups debits by description, user links each group to a `bill`.
4. On save: `bank_transactions.matched_bill_entry_id` updated, `bill_entries` upserted with `actual_amount = sum of matched amounts`.

### Reconciliation memory (`description_mappings`)
- Table: `description_mappings(financial_profile_id, description, bill_id)` — unique on `(financial_profile_id, description)`.
- On save reconciliation, all description→bill decisions are upserted to this table.
- On next import, ReconciliationPage auto-applies known mappings to unreconciled debit groups (bill must still exist). Auto-matched groups show an "auto" badge.
- Migration: `supabase/migrations/002_description_mappings.sql`.

### Dashboard vs Insights
- **Dashboard (`/`):** current-month snapshot — revenue, expenses, net, status, 12-month bar chart, category pie, top 5 expenses, goals.
- **Insights (`/insights`):** annual deep-dive — YoY comparison, monthly net trend, profit margin/savings rate, stacked category spend, full category pies, top bills, MoM delta table. Labels adapt: "Lucro" for business profiles, "Saldo" for personal.

### Bill entries vs expected amounts
Dashboard and grid totals use **`actual_amount` only** (0 when no entry). Never use `expected_amount` for monthly totals — this keeps dashboard numbers consistent with the monthly grid.

### Data fetching patterns
- `staleTime: 5 min` globally.
- Queries keyed by `[queryName, activeFinancialProfileId, ...]`.
- Mutations call `qc.invalidateQueries` on success with the relevant key.
- Large `bank_transactions` reads use `range()` pagination (1000 rows/page) to bypass PostgREST's default row cap.

---

## File map (key files)

```
src/
├── styles/themes.css          ← ALL color/theme CSS variables (single source of truth)
├── index.css                  ← Tailwind import + base body styles only
├── lib/theme.ts               ← ThemeMode, ThemeAccent types + applyTheme/getStoredTheme
├── lib/csvParser.ts           ← CSV/OFX parsing (bank format detection)
├── stores/authStore.ts        ← Auth context shape + useAuth()
├── components/auth/AuthProvider.tsx  ← Auth state, profile/household loading
├── types/database.ts          ← All TypeScript types (mirrors Supabase schema)
├── hooks/
│   ├── useBankImports.ts      ← Import, transactions, reconciliation, description mappings
│   ├── useBills.ts            ← Bills + categories CRUD
│   ├── useBillEntries.ts      ← Bill entries CRUD
│   ├── useDashboard.ts        ← Dashboard data aggregation
│   ├── useInsights.ts         ← Annual insights data aggregation
│   └── useGoals.ts            ← Goals CRUD
├── pages/
│   ├── DashboardPage.tsx      ← Monthly snapshot
│   ├── InsightsPage.tsx       ← Annual analytics
│   ├── ReconciliationPage.tsx ← Bank import reconciliation
│   ├── MonthlyGridPage.tsx    ← Bills × months grid
│   └── SettingsPage.tsx       ← Theme, profile settings
└── components/layout/
    ├── Sidebar.tsx            ← Desktop nav (navItems array)
    └── MobileNav.tsx          ← Mobile bottom nav (navItems array)

supabase/migrations/
├── 001_initial_schema.sql     ← Full schema + RLS
└── 002_description_mappings.sql ← Reconciliation memory table
```

---

## Conventions

- **No `expected_amount` in totals** — always use `actual_amount` from `bill_entries`.
- **All queries filtered by `activeFinancialProfileId`** — never load data across profiles.
- **Colors in oklch** — new CSS color values should use oklch() for perceptual uniformity. Use [oklch.com](https://oklch.com) to pick values.
- **No helper abstractions for one-offs** — three similar lines is fine; don't extract unless used 3+ times.
- **Commit style:** `feat:` / `fix:` / `refactor:` prefixes, short imperative subject.
