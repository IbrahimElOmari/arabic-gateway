# Evaluatierapport — Arabic Gateway (volledige app-audit)

**Datum:** 10 augustus 2026 · **Scope:** hele app, exclusief betalingen (Paddle/Stripe) en mailing — die komen later.
**Methode:** 3 parallelle codebase-audits (frontend, backend/security, testinfra/CI) + live-database-inspectie (RLS, cron, content, storage).

---

## Eindoordeel in het kort

| Dimensie | Score | Kern |
|---|---|---|
| Structuur & opbouw | **8/10** | Volwassen architectuur; weinig dead code |
| Werking & vlotheid | **6/10** | Werkt, maar loading-states, memoïsatie en a11y zijn dun |
| Correctheid & veiligheid | **7/10** | RLS/punten uitstekend; 2 kritieke integriteitslekken |
| Volledigheid | **±85%** | Kern compleet; content-gaten + enkele losse eindjes |

**Pilot-klaar?** Bijna. Er zijn **2 kritieke bevindingen** (cron-alert-storm en client-side nakijken) die vóór een pilot met echte leerlingen moeten worden opgelost.

---

## 1. Structuur & opbouw — sterk

**Wat goed is:**
- ~60 routes in `src/App.tsx`, allemaal lazy-loaded met retry-logica; `Suspense` + `FullPageLoader`; catch-all 404 aanwezig. **Geen enkele dode link** gevonden (alle `to="..."` resolven).
- Heldere scheiding: contexts (Auth, Class, Theme) → hooks → `src/lib/*` → pages. Rollenmodel (admin/teacher/student) via aparte `user_roles`-tabel met `has_role()` security-definer — textbook-correct.
- API-laag: `apiQuery`/`apiMutate`/`apiRpc`/`apiInvoke` wrappers worden in **77 bestanden** gebruikt; slechts ±5 uitzonderingen met directe calls (`ClassPaymentSettings.tsx`, `ExtraProductsPage.tsx`, `BillingPage.tsx`, `CurriculumMapData.tsx`, `paddle.ts`, `error-logger.ts`).
- Backend: 25 edge functions met gedeelde helpers (`_shared/logger.ts`, `rate-limit.ts`, `paddle.ts`); 73 tabellen; **alle 35 security-definer functies hebben `SET search_path`** (privilege-escalatie-vector consequent gedicht).
- Database-migraties: 73× `CREATE TABLE` = 73× `ENABLE ROW LEVEL SECURITY` (1-op-1).

**Aandachtspunten:**
- `src/pages/admin/EnrollmentRequestsPage.tsx` (137 regels) is **wees-code**: nergens gerouteerd of geïmporteerd.
- `@tanstack/react-virtual` staat in `package.json` maar wordt **nergens gebruikt** — dode dependency.
- Logger-adoptie is zwak: `src/lib/logger.ts` is netjes ontworpen (no-op in prod), maar slechts **4 bestanden** gebruiken 'm; **29 rauwe `console.log/warn/error`-calls** staan verspreid in componenten (o.a. `AdminLayout`, `use-two-factor`, `ExercisePage`, `ChatPage`, upload-componenten) — die lekken naar productie-consoles.

---

## 2. Werking & vlotheid — werkt, maar inconsistent

**Wat goed is:**
- Geen N+1-querypatronen gevonden; loops over data zijn in-memory transformaties.
- Top-level error boundaries goed geregeld (`TranslatedErrorBoundary` rond de hele router).
- Auth-flow is robuust: role+profile in één RPC, fail-closed bij timeout, geen deadlocks in `onAuthStateChange`.
- Sterrenkaart heeft eigen degelijke pan/zoom-logica en gepagineerde datafetching.

**Wat ontbreekt / zwak is:**
- **Loading-states inconsistent**: slechts 7 bestanden gebruiken Skeleton-componenten; **47 pagina's** tonen een kale `Loader2`-spinner. De skeleton-primitives bestaan maar worden nauwelijks toegepast.
- **Memoïsatie minimaal**: slechts 4 bestanden gebruiken `React.memo`. Lijst-zware admin-pagina's (Users, Payments, Analytics) renderen ongememoiseerd.
- **Geen virtualisatie**: lange lijsten (forum, chat, gebruikerstabellen) renderen volledig via `.map()` (296 call-sites) terwijl de virtualisatie-dep ongebruikt meeweegt.
- **Toegankelijkheid dun**: slechts 94 `aria-*`-attributen in heel `src/`, en maar **2×** `aria-live`/`role="status"` — async laad-/foutmeldingen worden vrijwel nergens aangekondigd aan screenreaders. (shadcn/Radix dekt de basis, maar maatwerk-componenten zoals chat en oefening-spelers niet.)

---

## 3. Correctheid & veiligheid — sterk fundament, 2 kritieke lekken

### 3.1 Wat 100% correct is
- **RLS volledig**: alle 77 publieke tabellen hebben RLS én policies (live geverifieerd, geen uitzonderingen).
- **Punten/badges server-side afgedwongen**: `award_points` alleen door admin/teacher via de gamification-function met eigen rol-check; zelf-punten is dichtgezet. Badges worden server-side berekend.
- **Cron-functions beveiligd**: `scheduler`, `release-exercises`, `send-lesson-reminders`, `cron-alert-dispatcher` eisen de service-role-sleutel (401 anders — getest).
- Edge functions hebben vrijwel overal JWT + rol-checks; `ai-translate-i18n` en `paddle-sync-product` hebben zelfs Zod-validatie.
- MCP-server (`arabic-gateway`) correct met OAuth-issuer, RLS als ingelogde gebruiker, read-only tools.

### 3.2 KRITIEK #1 — Cron-alert-storm (operationeel, nu actief)
De trigger `cron_alert_on_failure()` slaat een alert op bij **élke status** van een cron-run (`starting`, `connecting`, `sending`) — niet alleen bij `failed`:
- **61.340 onbehandelde alerts** nu, groeiend met **±864/dag** (de dispatcher draait elke 5 min × 3 statussen en **alert daarmee zichzelf** — zelfversterkend).
- Bovendien: 927× `Out of memory`-fouten in de `pg_net`-queue eind juni — waarschijnlijk mede door deze vloed.
- Gevolg: het hele alarmkanaal is onbruikbaar; een échte failure valt weg in de ruis.

### 3.3 KRITIEK #2 — Client-side nakijken + antwoordsleutel bij de leerling
- `CurriculumItemPage.tsx` berekent `is_correct`/`score` **volledig in de browser** en insert die waarden direct. De INSERT-policy op `curriculum_item_attempts` controleert alleen eigendom — **niet** of de score klopt.
- De SELECT-policy op `curriculum_items` levert de volledige rij incl. `correct_answer`/`correct_options` aan elke leerling → **de antwoordsleutel zit in de API-response**.
- Impact: via devtools kan een leerling willekeurige perfecte scores submitten. Zelfde patroon geldt voor het oudere `exercise_attempts`-systeem.
- `max_attempts` wordt eveneens **alleen client-side** afgedwongen; niets in de DB blokkeert een (n+1)-de poging via directe API-calls.
- (De RPC `submit_curriculum_attempt` + `cm_grade_answer` bestaan al server-side maar worden door de speler niet gebruikt.)

### 3.4 Overige bevindingen (hoog/midden)
- **`curriculum_progress` is dode tabel**: 0 rijen en géén codepad (frontend, trigger noch functie) schrijft er ooit naartoe. De RLS-policy staat wel INSERT/UPDATE toe — een toekomstig risico én een huidig functioneel gat (voortgangsaggregaties tonen niets).
- **`verify-2fa` zonder rate limiting**: 6-cijferige TOTP is onbegrensd te raden; `_shared/rate-limit.ts` bestaat maar wordt hier niet gebruikt. Het `two_factor_attempts`-log wordt nergens op geblokkeerd.
- **`monitor-health` is publiek aanroepbaar** (`verify_jwt=false`, geen interne check) — iedereen kan DB-probes triggeren en `cron_alerts` spammen.
- **Dubbele cron-schema's**: `send-lesson-reminders` wordt door 3 onafhankelijke schema's aangeroepen (hourly, 01:30, en via `scheduler` om 02:00). In-app notificaties de-dupen, maar **e-mailverzending de-dupeert niet** → dubbele mails mogelijk. Ook inconsistent: één job haalt de sleutel uit `current_setting`, de rest uit Vault.
- **`analytics.track_event` anoniem + ongevalideerd**: willekeurige JSON in `properties` wordt ongechecked opgeslagen; spammen kan.
- **`verify-captcha` faalt open** als `TURNSTILE_SECRET_KEY` ontbreekt — acceptabel in dev, dodelijk in prod als het per ongeluk ontbreekt.
- **`get-paddle-price`** heeft geen expliciete auth-check (laag risico).
- Early tables (`profiles`, `user_roles`, `classes`…) hebben geen expliciete GRANTs in migraties; de app werkt, dus de platform-defaults dekkend het — maar het is niet uit de repo verifieerbaar.
- Audit-doc inconsistentie: `docs/audit-report.md:651` markeert een wachtwoord-validatiebug (`< 6`) als ❌ open, maar `SettingsPage.tsx:81` gebruikt inmiddels correct `< 8` — **doc is verouderd**.

---

## 4. Volledigheid — wat is 100% af, wat ontbreekt

### 4.1 Volledig afgerond (100%)
- **Auth & rollen**: registratie, login, wachtwoord-reset, 2FA-setup (TOTP + backup-codes), rollenmodel, rol-resolutie met retry — compleet en fail-closed.
- **Curriculum-speler**: alle 8 oefeningstypes (meerkeuze, meerdere-antwoorden, open-tekst, gatentekst, bestand-upload, audio-opname, rangschikken, koppelen), tashkīl-ongevoelig nakijken met `strict_tashkeel`-schakelaar, vorige/volgende-navigatie, media-verberg-logica voor luistertaken.
- **Docent-workflow**: nakijk-wachtrij (zelfstudie + klas-oefeningen), status- en leerling-filters, feedback-editor, score-herberekening na review, student-dossier, direct-chat via RPC, notificaties bij inzendingen.
- **Admin**: contentbeheer (curriculum create/edit + media-uploads via `curriculum-media` bucket), review-pagina voor native speakers, gebruikers, klassen, niveaus, feature flags (DB-backed + realtime), cron-pagina met alerts-tab, audit-logging (`useAdminMutation`), i18n-vertaaltool, FAQ/beheer, design-system-pagina.
- **Gamification**: punten, badges, streaks, leaderboards — server-side gezaghebbend.
- **Community**: forum (kamers, posts, likes, reacties), privé-chat met deelnemersmodel, content-moderatie (reports).
- **GDPR/AVG**: data-export, account-verwijdering met cascade, verwerkingsregister, cookie-consent met categorieën.
- **i18n-infra**: 1547 keys × 3 talen (nl/en/ar) in **perfecte pariteit**; RTL-ondersteuning; Amiri-font; check-script in CI.
- **MCP/agent-integraties**: OAuth-beveiligde server met 4 tools, consent-flow met `next`-redirect.
- **CI-pipeline**: lint, tsc, i18n-lint, kleuren-lint, any-budget, coverage-drempels (80/80/75), a11y+RTL-audit, visuele regressie, e2e, Lighthouse, bundle-budget (5MB), security-audit.
- **Storage**: 6 buckets met MIME- en grootte-limits, correcte public/private-verdeling, magic-byte-validatie aanwezig.

### 4.2 Content-gaten (data, geen code)
- **U16 "Wonen"-vervolg is leeg** — 0 items.
- **U25: 164 items aanwezig maar 0 gepubliceerd.**
- **U21–U24 missen Nederlandse titels** (wel 133–164 items per unit).
- Totaal: 2299 items, waarvan 2135 gepubliceerd over 24 units.
- `curriculum_progress`: 0 rijen (zie 3.4).
- Operationeel: 6 klas-antwoorden wachten op nakijk; alle cron-alerts (61k) onbehandeld.

### 4.3 Ontbrekende/losse eindjes (code & kwaliteit)
1. **BillingPage is volledig hardcoded Nederlands** — de enige onvertaalde route in de app. Plus ±10–15 verspreide hardcoded strings (o.a. `PricingPage`-toasts, `StatsCard` "vs last month", taal-toggle-labels, "Sterrenkaart"/"Herstel").
2. **Kalender-e2e-suite volledig uitgeschakeld** (14 `test.skip`); e2e draait alleen op Chromium; conditieal skips voor staging/Turnstile.
3. **Testgaten**: 7 van 25 `lib`-modules zonder enige test (`curriculum-admin`, `exercise-recompute`, `export-utils`, `date-utils`, `paddle`, `app-config`, `sync-metadata`); de meeste pagina's hebben geen eigen tests.
4. **TypeScript**: strict + `noUncheckedIndexedAccess` staan aan, maar **180× `: any` + 43× `as any`** zitten pal op het CI-budget (190) — vrijwel geen ruimte; `noUnusedLocals/Parameters` en `no-explicit-any: error` zijn nog uit.
5. **Soft-launch-checklist**: pre-launch vakjes allemaal afgevinkt, maar launch-dag/post-launch (staging-refresh, soak-test, loadtest, smoke, on-call, rollback) volledig open.
6. **Native-app-sectie** op InstallPage is "coming soon".
7. **Weespagina** `EnrollmentRequestsPage.tsx` — feature ontbreekt of code moet weg.
8. **Logger- en skeleton-adoptie** uitbreiden (zie §2).
9. **Betalingen & mailing** — bewust uitgesteld (buiten scope).

---

## 5. Aanbevolen volgorde vóór de pilot

```text
P0 (blokkerend):
  1. cron_alert_on_failure-trigger beperken tot status 'failed' + 61k alerts opschonen
  2. Server-side nakijken activeren (submit_curriculum_attempt / cm_grade_answer gebruiken)
     + antwoordvelden uit de leerling-SELECT halen + max_attempts in DB afdwingen
  3. curriculum_progress popularen (trigger op attempts) of tabel verwijderen

P1 (sterk aanbevolen):
  4. verify-2fa rate limiting; monitor-health achter service-role; captcha fail-closed in prod
  5. Cron-deduplicatie: 1 schema voor send-lesson-reminders + e-mail dedupe
  6. BillingPage + losse strings vertalen (i18n-pariteit herstellen)

P2 (voor of tijdens pilot):
  7. Content: U16 vullen, U25 publiceren, U21–U24 titels
  8. Skeletons/logger/memoïsatie breed uitrollen; aria-live op async flows
  9. Kalender-e2e heractiveren; testgaten lib-modules dichten; any-budget afbouwen
 10. Wegwerken: EnrollmentRequestsPage, react-virtual-dep, verouderde audit-doc regels
```

**Conclusie:** architectuur, security-fundament (RLS/rollen/punten), curriculum-speler, docent-workflow en i18n zijn van productieniveau. De twee P0-items — de alarm-storm en het client-side vertrouwen van scores — zijn klein in omvang maar groot in impact en bepalen nu de pilot-gereedheid.
