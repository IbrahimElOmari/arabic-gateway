# TypeScript Strict Mode — Phased Activation Plan

**Status:** Planned · **Owner:** Platform team · **Target full `strict: true`:** end of Sprint +4 (≈ 8 weken vanaf vandaag).

## Baseline

`tsconfig.json` (huidig):

```json
{
  "noImplicitAny": false,
  "strictNullChecks": false,
  "noUnusedLocals": false,
  "noUnusedParameters": false
}
```

Gevolg: ~189 `any`-annotaties in `src/`, geen null-check enforcement, ongebruikte symbols zwijgen. Dit is technische schuld #1 uit het auditrapport.

## Doel

`strict: true` + `noUncheckedIndexedAccess: true` in `tsconfig.app.json`, zonder regressies, met meetbare payoff per module.

## Payoff-per-module ranking

Modules zijn geordend op **(risico × wijzigingsfrequentie) ÷ migratiekost**. We doen eerst de modules waar null/any-bugs het meeste pijn doen.

| # | Module (`src/...`) | Geschatte `any`/null risico | Payoff | Sprint |
|---|---|---|---|---|
| 1 | `lib/supabase-api.ts`, `lib/api-error.ts`, `integrations/supabase/*` | Hoog — elke query gaat erdoor | ★★★★★ | Sprint 1 |
| 2 | `contexts/AuthContext.tsx`, `contexts/ClassContext.tsx`, `hooks/use-admin-mutation.ts` | Hoog — auth = security | ★★★★★ | Sprint 1 |
| 3 | `lib/*` (format, date, sanitize, tax, export, certificate, learning-recommendations, error-*) | Midden — pure utilities, lage migratiekost | ★★★★☆ | Sprint 2 |
| 4 | `hooks/*` (notifications, gamification, helpdesk, rate-limiter, 2fa, idle-timeout, analytics) | Midden | ★★★★☆ | Sprint 2 |
| 5 | `components/auth/*`, `components/admin/*`, `components/moderation/*`, `components/security/*` | Hoog — bevat permissielogica | ★★★★☆ | Sprint 3 |
| 6 | `pages/admin/*` | Midden — admin-only, kleinere blast radius | ★★★☆☆ | Sprint 3 |
| 7 | `components/exercises/*`, `components/teacher/*`, `pages/teacher/*` | Midden | ★★★☆☆ | Sprint 4 |
| 8 | `pages/*` (overig), `components/layout/*`, `components/ui/*` | Laag — UI-glue | ★★☆☆☆ | Sprint 4 |
| 9 | `test/*`, `e2e/*` | Laag — `@ts-nocheck` waar nodig | ★☆☆☆☆ | Sprint 4 |

## Fases

### Fase 0 — Voorbereiding (week 0, halve dag)

- Baseline-meting: `npx tsc --noEmit --strict 2>&1 | tee /tmp/strict-baseline.log` → tellen per `errorCode` en per directory.
- Knowledge-doc met de top-10 patterns (bv. `supabase.from(...).single()` → `data` is `T | null`).
- CI-stap toevoegen die `tsc --noEmit` blokkerend houdt (al aanwezig).

### Fase 1 — `strictNullChecks` aan (Sprint 1, 2 weken)

1. Zet `strictNullChecks: true` in een nieuw `tsconfig.strict.json` dat alléén de modules van rij 1–2 includeert via `include`.
2. Fix de errors in die scope. Verwachte hoeveelheid: 50–100.
3. Migratie-merge: zodra rij 1–2 schoon is, zet `strictNullChecks: true` global in `tsconfig.json` en verplaats overige modules naar `// @ts-nocheck` of fix ze direct.

**Exit-criterium:** `tsc --noEmit` slaagt met `strictNullChecks: true` op de hele codebase.

### Fase 2 — `noImplicitAny` aan (Sprint 2, 2 weken)

1. Run `npx tsc --noEmit --noImplicitAny | grep -c "TS7006\|TS7031\|TS7053"` voor baseline.
2. Werk rij 3–4 af; pure utilities zijn snel typeerbaar.
3. Voor data uit Supabase: gebruik de auto-gegenereerde `Database` types uit `src/integrations/supabase/types.ts` consequent.

**Exit-criterium:** `any`-count uit `rg -n ": any\b|<any>" src | wc -l` < 30 (was 189).

### Fase 3 — Rest van `strict` flags (Sprint 3, 2 weken)

Inschakelen in volgorde: `strictFunctionTypes` → `strictBindCallApply` → `strictPropertyInitialization` → `alwaysStrict`. Modules rij 5–6 oppakken.

### Fase 4 — Full strict + extra hardening (Sprint 4, 2 weken)

```jsonc
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "noFallthroughCasesInSwitch": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

Modules rij 7–9 afronden. ESLint-regel `@typescript-eslint/no-explicit-any: "error"` aanzetten.

**Deadline volledig `strict: true`:** einde Sprint 4 (≈ 8 weken). Geen merges in `main` zonder groene `tsc --noEmit` daarna.

## Risico's & mitigatie

| Risico | Mitigatie |
|---|---|
| Brede merge-conflicten door `as`-casts | Per fase rebasen op `main`, kleine PR's per module |
| Supabase generated types lopen achter | `supabase gen types` als pre-commit hook |
| Devs voegen tijdens migratie nieuwe `any`'s toe | Per fase een ESLint-`warn` → `error` upgrade |
| Tests breken op nieuwe nullability | Tests vallen onder rij 9; `@ts-nocheck` toegestaan in `src/test/**` tot Fase 4 |

## Meetpunten per sprint

- `any`-count (`rg -n ": any\b|<any>|as any" src \| wc -l`)
- `tsc --noEmit --strict` error-count
- Aantal runtime null-pointer fouten in Sentry/error-monitor in de week na een fase
- Lines-of-code onder `// @ts-nocheck` / `// @ts-ignore`

Rapport elke sprint-review.
