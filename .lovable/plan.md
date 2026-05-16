# Volledig Auditrapport — Plan

Dit is een puur informatief rapport. Er worden geen wijzigingen aan code of database uitgevoerd.

## Aanpak

Het rapport bestaat uit 14 secties. Door de omvang wordt het opgesplitst in **5 delen**, elk in een aparte chat-respons:

- **Deel 1/5** — Sectie 1 (Codebase inventaris) + Sectie 2 (Database volledig)
- **Deel 2/5** — Sectie 3 (Storage) + Sectie 4 (Edge Functions) + Sectie 5 (Auth & Security)
- **Deel 3/5** — Sectie 6 (Dependencies) + Sectie 7 (TypeScript & codekwaliteit) + Sectie 8 (Testen)
- **Deel 4/5** — Sectie 9 (i18n) + Sectie 10 (Performance/bundle) + Sectie 11 (CI/CD)
- **Deel 5/5** — Sectie 12 (Feature status matrix) + Sectie 13 (Configuratiebestanden) + Sectie 14 (Migraties)

## Methode per sectie

- **Codebase**: `find`, `wc -l`, `rg` voor inventaris, imports, hooks, lib-exports.
- **Database**: `supabase--read_query` op `information_schema`, `pg_catalog`, `pg_policies`, `pg_proc`, `pg_trigger`, `pg_indexes`, `pg_enum`, `pg_views`, `cron.job`, `pg_extension`. Rijaantallen via `SELECT count(*)`.
- **Storage**: `storage.buckets` + `pg_policies` voor `storage.objects`.
- **Edge functions**: bestandsinspectie + `supabase/config.toml`.
- **Auth/CSP/env**: `supabase/config.toml`, `index.html`, `vite.config.ts`, `.env.example`, `rg` in functies.
- **Vulns/outdated**: `npm audit --json`, `npm outdated --json`.
- **TS/ESLint/tests**: `npx tsc --noEmit`, `npx eslint`, `npx vitest run`, `npx vitest --coverage`.
- **i18n**: `node scripts/check-i18n.mjs`, sleutel-tellingen via `jq`.
- **Build**: `npm run build` met chunk-output.
- **Feature matrix**: per feature `rg` naar relevante componenten/routes/hooks om status te bepalen.
- **Configs/migraties**: directe `cat` van bestanden.

## Beperkingen vooraf gemeld

- Sommige commando's (`npm run build`, `vitest --coverage`, `playwright`) kunnen tot enkele minuten duren; ik draai ze binnen de 600s timeout-grens en rapporteer fouten exact als ze optreden.
- Indien een commando faalt of een bestand ontbreekt, wordt dit expliciet vermeld met de foutmelding (geen weglatingen).

Na akkoord begin ik direct met Deel 1/5.
