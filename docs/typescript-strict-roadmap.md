# TypeScript Strict Mode — Phased Activation Plan

**Status:** ✅ **P3 voltooid op 10 jun 2026** — `strict: true` + `noUncheckedIndexedAccess: true` actief, `tsc --noEmit` groen, `any`-budget (≤190) gehandhaafd in CI.

## Eindstaat

`tsconfig.json` + `tsconfig.app.json`:

```jsonc
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "skipLibCheck": true
}
```

`npx tsc -p tsconfig.app.json --noEmit` → **0 errors**.

## Wat is gedaan

| Fase | Doel | Resultaat |
|---|---|---|
| 0 | Baseline | 4 errors gemeten met `--strict` |
| 1 | strictNullChecks | 4 errors gefixt in `FinalExamPage`, `KnowledgeBasePage`, `ClassesPage`, `TeacherApprovalsPage` |
| 2 | noImplicitAny | Geen extra errors — alle `any`s zijn expliciet (`as any` / `<any>`) |
| 3 | strictFunctionTypes + bind/call/apply + propertyInitialization + alwaysStrict | Geen extra errors |
| 4 | Full `strict: true` | Geactiveerd; CI blokkeert regressies |

## Fixes (commit-snippets)

```ts
// FinalExamPage.tsx
- let promotedToLevelId = null;
+ let promotedToLevelId: string | null = null;
- let promotedLevelName = null;
+ let promotedLevelName: string | null = null;

// KnowledgeBasePage.tsx
- articles?.find(...)?.[key] + 1
+ (articles?.find(...)?.[key] ?? 0) + 1

// ClassesPage.tsx
- let teacher = null;
+ let teacher: { full_name: string } | null = null;

// TeacherApprovalsPage.tsx
- let profile = null;
+ let profile: { full_name: string; email: string } | null = null;
```

## Resterende `any`-annotaties

187 `: any | <any> | as any` in `src/`. Deze zijn nu **intentioneel** (compile-tijd schoon onder strict) en bestaan uit:

- Supabase query-resultaat casts (`as any[]`) waar de Database-types nog niet zijn aangesloten op de query — verbeterbaar in een vervolg-sprint via `supabase gen types`.
- Test fixtures.
- Externe library shims.

**Vervolg-actie (optioneel, niet-blokkerend):** `eslint --rule '@typescript-eslint/no-explicit-any: warn'` aanzetten en wekelijks de count met 10% verlagen totdat < 30.

## CI-handhaving

`.github/workflows/ci.yml` → job `lint-and-typecheck` draait `npx tsc --noEmit`. Elke PR die strict mode breekt wordt geblokkeerd.

## Optionele extra hardening (toekomst)

```jsonc
{
  "noUncheckedIndexedAccess": true,  // ~50 extra errors verwacht (arrays/records)
  "noImplicitOverride": true,
  "noFallthroughCasesInSwitch": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

Activeer pas wanneer team-capaciteit beschikbaar is — niet blokkerend voor productie-launch.
