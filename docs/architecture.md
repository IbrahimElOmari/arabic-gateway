# Architectuur

## Stack

- **Frontend:** React 18 + Vite + TypeScript (strict) + Tailwind + shadcn/ui.
- **Backend:** Lovable Cloud (Supabase): Postgres 15 + RLS + Edge Functions (Deno) + Storage + Auth + pg_cron + Realtime.
- **i18n:** i18next met `nl` (default), `en`, `ar` (RTL).
- **State:** TanStack Query v5; lokale state via React.
- **Testing:** Vitest + Testing Library + Playwright.

## Hoog-niveau diagram

```text
┌──────────────────────┐
│  React SPA (Vite)    │  i18next · TanStack Query
└────────┬─────────────┘
         │ HTTPS / WSS
         ▼
┌──────────────────────────────────────────────────┐
│            Lovable Cloud (Supabase)              │
│  ┌────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐  │
│  │ PostgREST │ Auth   │ │ Storage │ │ Realtime│  │
│  └────┬───┘ └────┬───┘ └────┬────┘ └────┬───┘  │
│       │          │          │           │       │
│       ▼          ▼          ▼           ▼       │
│  ┌──────────────────────────────────────────┐  │
│  │       Postgres 15 (RLS + pg_cron)        │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │      Edge Functions (Deno)               │  │
│  │  send-email · analytics · gamification   │  │
│  │  stripe-* · helpdesk · scheduler · ...   │  │
│  └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

## Data-access regel

Alle frontend-queries gaan via `src/lib/supabase-api.ts` (`apiQuery`/`apiMutate`/`apiInvoke`). Directe `supabase.from()` is verboden — afgedwongen door code-review.

## Beveiliging

- RLS op elke tabel (`pg_policies` review per migratie).
- 2FA via `verify-2fa` edge function + `useTwoFactor` hook.
- Audit-log via `useAdminMutation` wrapper.
- Storage: privé-buckets met short-lived signed URLs.

## Performance

- Code-splitting per route (React.lazy).
- `@tanstack/react-virtual` voor lijsten > 50 items.
- Content-specifieke skeletons (geen generieke spinner).
- Bundle budget 5 MB (CI-gate).

## Observability

- Edge functions: gestructureerde JSON logs via `_shared/logger.ts`.
- Client errors: `error-monitor.ts` → analytics edge function.
- Cron-status: `/admin/cron-jobs`.
