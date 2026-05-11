
## Doel
Eén compleet, bewijsgebaseerd referentiedocument waarmee een externe IT'er of AI-ontwikkelaar de hele app begrijpt zonder hem live te hoeven zien. Elke uitspraak wordt onderbouwd met bestandspad (+ regelnummer waar relevant) of een live DB-query. Geen samenvattingen, geen aannames.

## Aanpak (script-gedreven, reproduceerbaar)
Ik schrijf één Node-script dat de codebase scant en een Markdown-rapport bouwt. Vervolgens converteer ik de Markdown naar DOCX (pandoc) en PDF (pandoc + wkhtmltopdf/weasyprint). Drie bestanden komen in `/mnt/documents/`.

### Inhoud van het rapport (volledige inventaris)

1. **Meta & methodologie**
   - Genereerdatum, commit-state, gebruikte tools, hoe elk feit te verifiëren is.

2. **Tech stack & build**
   - Versies uit `package.json` (deps + devDeps, één tabel per categorie).
   - Vite-, Tailwind-, TS-, ESLint-, Vitest-, Playwright-, Capacitor-config samenvattingen mét bestandsverwijzing.
   - Build/CI-pipeline uit `.github/workflows/ci.yml`.

3. **Mappenstructuur (volledig)**
   - Recursieve tree van `src/`, `supabase/`, `scripts/`, `e2e/`, `public/`, `docs/` met regelaantallen per bestand.

4. **Routing-matrix**
   - Elke `<Route>` uit `src/App.tsx`: pad, component, lazy/eager, beschermd ja/nee, vereiste rol/rollen, bestandspad van de pagina.

5. **Pagina-inventaris**
   - Per pagina in `src/pages/**`: bestand, regelaantal, geïmporteerde hooks/wrappers, gebruikte i18n-namespaces (gedetecteerd via `t('…')` regex), gebruikte tabellen/RPC's (regex op `apiQuery|apiRpc|apiInvoke|apiMutate|.from\(`), gebruikte edge functions (`functions.invoke`).

6. **Componenten-inventaris**
   - Per map onder `src/components/**`: lijst met bestand + regelaantal + korte declaratielijst (geëxporteerde namen via regex `export (default |const |function )`).
   - Aparte sectie voor alle shadcn/ui-primitives in `src/components/ui/`.

7. **Hooks, contexts, libs**
   - Lijst met geëxporteerde symbolen per bestand in `src/hooks/`, `src/contexts/`, `src/lib/`.

8. **Features per rol** (gedreven door routing-matrix + role-checks)
   - Public, Student, Teacher, Admin: welke routes en welke pagina-bestanden.

9. **i18n-status**
   - Aantal sleutels per locale (`nl/en/ar.json`) — geteld via flatten.
   - Top-level namespaces.
   - Drift NL↔EN en NL↔AR (sleutels die ontbreken) — exact aantal + voorbeelden.
   - Verwijzing naar `scripts/check-i18n.mjs`, `scripts/ai-fill-i18n.mjs` en de admin-pagina.

10. **Database (live, via psql/MCP)**
    - Lijst van alle publieke tabellen + kolommen + types + nullables (uit `information_schema`).
    - Per tabel: rijaantal, of RLS aanstaat, aantal RLS-policies, lijst van policy-namen + commando.
    - Volledige SQL van elke RLS-policy (uit `pg_policies`).
    - Alle DB-functies (al getoond in context) inclusief `SECURITY DEFINER`-status — woordelijk overgenomen.
    - Triggers (geen aanwezig — bevestigd).
    - Enums (`app_role`, `points_action`, etc.) via `pg_type`.

11. **Auth & rollen**
    - Bewijs uit `ProtectedRoute.tsx`, `AuthContext.tsx`, `has_role`/`get_user_role`/`get_user_with_context`.
    - Live telling van users per rol uit `user_roles`.
    - 2FA-flow: `useTwoFactor`, `TwoFactorSetup`, edge function `verify-2fa`.

12. **Edge functions**
    - Per map in `supabase/functions/`: bestandsregels in `index.ts`, gedetecteerde HTTP-routes/handlers, gebruikte secrets, `verify_jwt`-instelling uit `supabase/config.toml`.

13. **Storage**
    - Buckets (uit context: lesson-recordings, lesson-materials, student-uploads, avatars, exercise-media) + public/private.
    - Storage RLS-policies (live query op `storage.objects`).
    - Upload-validatie uit `src/lib/upload-validation.ts` en `student-upload-path.ts`.

14. **Testdekking**
    - Lijst van elk testbestand in `src/test/` en `e2e/` met regelaantal en aantal `it(/test(`-blokken (regex-telling).
    - Vitest-config en Playwright-config samenvattingen.

15. **Secrets & integraties**
    - Lijst van geconfigureerde secrets (namen, geen waarden).
    - Lovable AI Gateway gebruik (zoek op `LOVABLE_API_KEY` / `lovable.dev/v1`).

16. **Security-postuur**
    - Resultaten van Supabase linter (live).
    - Bevestiging dat geen `auth.users` foreign keys bestaan (regex over migraties + schema).

17. **Bekende workflows / scripts**
    - Inhoud van elk script in `scripts/` (samenvatting + commando uit `package.json` indien gekoppeld).

18. **Memory / project-conventies**
    - Volledige content van elke `mem://` file als appendix.

19. **Appendix A — bestand-voor-bestand index**
    - Alfabetische tabel: pad | regels | bytes | type.

### Technische uitvoering (tooling)
- Node-script `/tmp/build-app-report.mjs` doet code-scan en schrijft `/tmp/report.md`.
- Live DB-info via `psql` (of `supabase--read_query` als `PGHOST` ontbreekt).
- Markdown → DOCX via `pandoc`.
- Markdown → PDF via `pandoc --pdf-engine=weasyprint` (fallback: wkhtmltopdf via nix; fallback 2: `md-to-pdf` via npx).
- QA: na generatie open ik DOCX en PDF, render eerste + laatste pagina's naar JPEG en inspecteer op clipping/overflow. Fix indien nodig en regenereer.

### Output
Drie bestanden in `/mnt/documents/`:
- `app-stand-van-zaken.md`
- `app-stand-van-zaken.docx`
- `app-stand-van-zaken.pdf`

Aan het eind plaats ik drie `<lov-artifact>`-tags zodat je ze direct kunt downloaden, plus een korte slotzin.

### Wat ik bewust NIET doe
- Geen interpretatie/oordeel ("goed/slecht/risico"). Alleen feiten.
- Geen wijzigingen aan de code of database.
- Geen voorstellen voor verbeteringen tenzij je daar later om vraagt.
