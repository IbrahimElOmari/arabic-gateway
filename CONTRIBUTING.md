# Contributing

## Setup

1. Node 20+, npm 10+.
2. `npm install`
3. `npm run dev` — start Vite op `http://localhost:5173`.

## Branch-strategie

- `main` — productie. Beschermd; alleen mergen via PR met groene CI.
- `feature/<korte-naam>` — nieuwe functionaliteit.
- `fix/<korte-naam>` — bugfix.
- `chore/<korte-naam>` — refactor/docs/tooling.

## Commits

Conventional Commits:
```
feat: nieuwe live-lessen tab
fix: forum-likes consistency bij gelijktijdige updates
chore: bump tailwind 3.4.17
docs: runbook restore-procedure
```

## PR-checklist

- [ ] `npx tsc --noEmit` groen
- [ ] `npm run lint` groen
- [ ] `npm run check:i18n` groen (nl/en/ar pariteit, geen hardcoded NL)
- [ ] `npm run test:coverage` groen, coverage niet onder threshold
- [ ] Nieuwe DB-tabellen hebben RLS + tests in `src/test/rls-policies*.test.ts`
- [ ] Geen nieuwe `any` zonder `// @ts-explain: <reden>`
- [ ] Geen hardcoded kleuren — alleen semantische tokens uit `index.css`
- [ ] Screenshot/screencast in PR-beschrijving bij UI-wijziging
- [ ] Documentatie bijgewerkt indien API/contract/runbook geraakt

## Code-conventies

- **Imports:** absolute paden via `@/` alias.
- **Data-access:** ALTIJD `apiQuery`/`apiMutate`/`apiInvoke` uit `@/lib/supabase-api`. Nooit `supabase.from()` direct.
- **i18n:** `useTranslation()` + `t('key', 'fallback')`. Sleutels in alle 3 locale-bestanden.
- **Datum/getal:** alleen via `@/lib/format-utils` en `@/lib/date-utils`.
- **Mutaties op admin-data:** via `useAdminMutation` (auto audit-log).
- **Realtime:** kanaal-naam moet uniek per feature.

## Tests

- Unit: `vitest` — `src/**/*.test.ts(x)`.
- Integratie: `src/test/integration/`.
- E2E: Playwright in `e2e/`.
- Edge functions: Deno tests in `supabase/functions/**/*_test.ts`.

## Releases

Zie `docs/runbook.md`.
