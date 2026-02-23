
# Blueprint v2: HVA Platform — Volledig Verbeterplan

**Datum:** 2026-02-23  
**Basis:** Voortgangsrapport 23-02-2026 + `docs/audit-report.md` v4.0  
**Scope:** Alle 19 domeinen, alleen taken die binnen de Lovable-uitvoeringsomgeving voltooid kunnen worden  
**Uitsluiting:** Handmatige acties (API-keys invoeren, pg_cron verificatie, juridische review)

---

## Definitie van "Voltooid" (strikt)

1. Code volledig geïmplementeerd, vrij van bugs, geen TODO's
2. i18n-keys in nl.json, en.json, ar.json
3. UI functioneel voor alle rollen (student/teacher/admin)
4. Unit-test (Vitest) en/of E2E-test (Playwright) aanwezig en slagend
5. Geen hardcoded strings, magic values of dode code
6. Gemerged in hoofdbranch
7. Performance, security, accessibility criteria behaald

---

## FASE 6: API-gateway, Design Tokens & Legal-integratie

### 6.1 — Supabase API-wrapper met gecentraliseerde error-handling
- **Audit ref:** 1.3, voortgangsrapport §1
- **Huidige status:** 0% — geen wrapper, directe `supabase.from()` en `supabase.functions.invoke()` calls overal
- **Acties:**
  1. Maak `src/lib/supabase-api.ts` met:
     - `apiQuery<T>(table, query)` wrapper rond `.from()` die errors normaliseert
     - `apiInvoke<T>(functionName, body)` wrapper rond `.functions.invoke()` met retry (1x), timeout (15s), en structured error response
     - Centraal error-logging via `console.error` met context (function name, user id, timestamp)
     - Versie-header `X-App-Version` meesturen (uit `app-config.ts`)
  2. Maak `src/lib/api-error.ts` met `ApiError` class en `isApiError()` type guard
  3. Refactor de 3 meest-gebruikte hooks (`use-helpdesk.ts`, `use-gamification.ts`, `use-analytics.ts`) om de wrapper te gebruiken
- **Tests:**
  - Unit-test `src/test/supabase-api.test.ts`: test error normalisatie, retry bij 500, timeout
- **Afhankelijkheden:** Geen
- **Acceptatiecriteria:** Alle 3 hooks gebruiken de wrapper; errors worden uniform afgehandeld; unit-test slaagt
- **Complexiteit:** Medium (2-3 uur)

### 6.2 — Design tokens `success` en `warning` in Tailwind config
- **Audit ref:** 7.1, voortgangsrapport §7.1
- **Huidige status:** CSS variabelen `--success` en `--warning` bestaan in `index.css` (r.38-43, r.100-105) maar zijn NIET gemapped in `tailwind.config.ts`
- **Acties:**
  1. Voeg aan `tailwind.config.ts` `theme.extend.colors` toe:
     ```
     success: { DEFAULT: "hsl(var(--success))", foreground: "hsl(var(--success-foreground))" },
     warning: { DEFAULT: "hsl(var(--warning))", foreground: "hsl(var(--warning-foreground))" },
     ```
  2. Verifieer dat `bg-success`, `text-success`, `bg-warning`, `text-warning` correct renderen in light+dark mode
- **Tests:**
  - Visuele verificatie (screenshot) van HomePage met de tokens
  - Grep: geen directe `bg-green-`, `bg-blue-`, `text-amber-`, `text-purple-` in `src/`
- **Afhankelijkheden:** Geen
- **Acceptatiecriteria:** Tokens renderen correct; grep levert 0 directe kleur-hits op
- **Complexiteit:** Laag (15 min)

### 6.3 — Hardcoded-kleur linter regel
- **Audit ref:** 7.1
- **Huidige status:** Geen detectie van magic values
- **Acties:**
  1. Voeg een ESLint regel of custom script `scripts/lint-colors.sh` toe dat regex zoekt op `(bg|text|border|ring)-(red|green|blue|yellow|purple|amber|orange|pink|indigo|violet|cyan|teal|emerald|lime|sky|fuchsia|rose)-\d` in `src/` bestanden
  2. Documenteer het gebruik in README.md
- **Tests:** Script retourneert 0 matches
- **Complexiteit:** Laag (30 min)

### 6.4 — Footer links naar /privacy en /terms
- **Audit ref:** 17.1, voortgangsrapport §17.1
- **Huidige status:** 0% — Footer bevat GEEN links naar /privacy of /terms (geverifieerd: Footer.tsx r.1-113)
- **Acties:**
  1. Voeg in `src/components/layout/Footer.tsx` een nieuwe kolom toe met:
     - `<Link to="/privacy">{t('footer.privacyPolicy')}</Link>`
     - `<Link to="/terms">{t('footer.termsOfService')}</Link>`
  2. Verifieer dat i18n keys `footer.privacyPolicy` en `footer.termsOfService` bestaan (ze bestaan al)
- **Tests:**
  - Unit-test: Footer rendert links met correcte href
- **Afhankelijkheden:** PrivacyPage en TermsPage bestaan al
- **Acceptatiecriteria:** Links zichtbaar in Footer; navigeren naar correcte pagina's
- **Complexiteit:** Laag (15 min)

### 6.5 — Verplichte terms-checkbox in RegisterForm
- **Audit ref:** 17.1 (P4-2), voortgangsrapport §17.1
- **Huidige status:** 0% — Geen checkbox (geverifieerd: RegisterForm.tsx bevat geen `agreeTerms`)
- **Acties:**
  1. Voeg aan `RegisterForm.tsx` een `agreeTerms: z.literal(true)` veld toe aan het Zod schema
  2. Voeg een Checkbox FormField toe met label: `t('auth.agreeTerms')` en links naar `/terms` en `/privacy`
  3. Voeg i18n keys toe: `auth.agreeTerms` in nl/en/ar
- **Tests:**
  - Unit-test `src/test/register-form.test.tsx`: verifieer dat submit geblokkeerd is zonder checkbox
- **Afhankelijkheden:** Taak 6.4 (links moeten bestaan)
- **Acceptatiecriteria:** Registratie onmogelijk zonder akkoord; links werken; 3 talen
- **Complexiteit:** Laag (30 min)

### 6.6 — Cookie consent koppelen aan analytics tracking
- **Audit ref:** 16.1, 17.2, voortgangsrapport §16.1, §17.2
- **Huidige status:** Cookie consent banner bestaat maar blokkeert tracking NIET
- **Acties:**
  1. Maak `src/lib/cookie-consent.ts` met:
     - `getCookieConsent(): 'accepted' | 'rejected' | null`
     - `hasAnalyticsConsent(): boolean`
  2. In `src/hooks/use-analytics.ts` r.46: voeg `if (!hasAnalyticsConsent()) return;` toe aan het begin van `trackEvent`
  3. In `src/hooks/use-analytics.ts` r.74: voeg dezelfde check toe aan `trackPageView`
- **Tests:**
  - Unit-test `src/test/analytics-consent.test.ts`:
    - localStorage `cookie_consent` = `'rejected'` → `trackEvent` doet niets
    - localStorage `cookie_consent` = `'accepted'` → `trackEvent` roept supabase aan
    - localStorage `cookie_consent` niet gezet → `trackEvent` doet niets (opt-in model)
- **Afhankelijkheden:** CookieConsent component bestaat al
- **Acceptatiecriteria:** Analytics events worden NIET verzonden zonder consent; unit-test slaagt
- **Complexiteit:** Medium (1 uur)

---

## FASE 7: Observability & Logging

### 7.1 — Unit-test voor structured logger
- **Audit ref:** 2.2, voortgangsrapport §2.2
- **Huidige status:** `logger.ts` bestaat (76 regels) maar heeft geen test
- **Acties:**
  1. Maak `supabase/functions/_shared/logger_test.ts` met Deno-tests:
     - `createLogger()` retourneert correct object
     - `info/warn/error` produceren JSON met verwachte velden
     - `withTiming` meet duur correct
     - `setUserId` voegt user_id toe aan logs
- **Tests:** `supabase--test-edge-functions`
- **Complexiteit:** Laag (30 min)

### 7.2 — Client-side error logging service
- **Audit ref:** 2.2
- **Huidige status:** Client-side errors via `console.error` alleen
- **Acties:**
  1. Maak `src/lib/error-logger.ts` met:
     - `logError(error, context)` die error + context naar `analytics` edge function stuurt met `eventType: 'client_error'`
     - Debounce: max 5 errors per minuut per sessie
     - Respecteert cookie consent
  2. Integreer in `ErrorBoundary.tsx` r.28: vervang `console.error` door `logError()`
  3. Integreer in `AuthContext.tsx`: catch blokken
- **Tests:**
  - Unit-test: verifieer debounce werkt; verifieer consent check
- **Complexiteit:** Medium (1 uur)

### 7.3 — Health-check edge function
- **Audit ref:** 2.1
- **Huidige status:** Geen health-check endpoints
- **Acties:**
  1. Maak `supabase/functions/health/index.ts`:
     - GET → `{ status: "ok", timestamp, version }`
     - Test database connectivity via `supabase.from('levels').select('id').limit(1)`
     - Retourneer 503 bij falen
  2. Voeg `[functions.health] verify_jwt = false` toe aan `supabase/config.toml` — **NB: config.toml is auto-generated, dus dit moet via de standaard Supabase configuratie**
- **Tests:**
  - `supabase--curl_edge_functions` GET /health → 200
- **Complexiteit:** Laag (30 min)

---

## FASE 8: Caching, Database & Types

### 8.1 — use-helpdesk refactor naar TanStack Query
- **Audit ref:** 5.1, voortgangsrapport §5.1
- **Huidige status:** `use-helpdesk.ts` (255 regels) gebruikt handmatige `useState`/`useEffect` voor data-fetching
- **Acties:**
  1. Refactor `fetchTickets` naar `useQuery(['helpdesk', 'tickets', filters])`
  2. Refactor `fetchLabels` naar `useQuery(['helpdesk', 'labels'])`
  3. Refactor `createTicket`, `updateTicket`, `addResponse` naar `useMutation` met `invalidateQueries`
  4. Verwijder handmatige `useState` voor tickets/labels/loading
  5. Behoud `getStatusColor`/`getPriorityColor` als pure utility functions
- **Tests:**
  - Unit-test: verifieer dat hook retourneert verwachte interface; geen `useEffect` voor data-fetching
- **Afhankelijkheden:** Geen
- **Acceptatiecriteria:** Geen `useState`/`useEffect` voor data-fetching; stale-while-revalidate werkt
- **Complexiteit:** Medium (1-2 uur)

### 8.2 — Leaderboard-index toevoegen
- **Audit ref:** 3.2, voortgangsrapport §3.2
- **Huidige status:** Ontbreekt
- **Acties:**
  1. Database migratie:
     ```sql
     CREATE INDEX IF NOT EXISTS idx_leaderboards_period_points 
       ON leaderboards(period, period_start, points DESC);
     ```
- **Tests:** Index bestaat na migratie
- **Complexiteit:** Laag (5 min)

### 8.3 — Workaround voor ontbrekende types (user_points, user_badges)
- **Audit ref:** 3.1, voortgangsrapport §3.1
- **Huidige status:** `(profile as any)` casts; tabellen niet in `types.ts` (read-only)
- **Acties:**
  1. Maak `src/types/gamification.ts` met handmatige type-definities:
     ```ts
     export interface UserPoints { id: string; user_id: string; total_points: number; ... }
     export interface UserBadge { id: string; user_id: string; badge_id: string; ... }
     ```
  2. Gebruik deze types in `use-gamification.ts` i.p.v. `any` casts
  3. Verwijder alle `(profile as any)` casts in `SettingsPage.tsx` door profile-type uit te breiden
- **Tests:** `npx tsc --noEmit` slaagt zonder any-gerelateerde errors
- **Complexiteit:** Medium (1 uur)

---

## FASE 9: Testing & QA

### 9.1 — Wachtwoordvalidatie unit-test
- **Audit ref:** 12.4, voortgangsrapport §12.4
- **Huidige status:** Bug gefixed maar geen test
- **Acties:**
  1. Voeg test toe aan `src/test/settings.test.tsx`:
     - Wachtwoord van 7 tekens → error
     - Wachtwoord van 8 tekens → geaccepteerd
- **Complexiteit:** Laag (15 min)

### 9.2 — CookieConsent test
- **Acties:**
  1. `src/test/cookie-consent.test.tsx`:
     - Banner verschijnt als geen consent in localStorage
     - Accept → localStorage gezet; banner verdwijnt
     - Reject → localStorage gezet; banner verdwijnt
- **Complexiteit:** Laag (30 min)

### 9.3 — PricingPage test
- **Acties:**
  1. `src/test/pricing.test.tsx`:
     - Pagina rendert zonder crash
     - Toont loading state initieel
     - i18n keys worden correct getoond
- **Complexiteit:** Laag (20 min)

### 9.4 — HelpWidget test
- **Acties:**
  1. `src/test/help-widget.test.tsx`:
     - Widget rendert floating button
     - Click opent menu met FAQ en Support links
     - Links navigeren correct
- **Complexiteit:** Laag (20 min)

### 9.5 — Coverage-rapportage in CI
- **Audit ref:** 8.3, voortgangsrapport §8.3
- **Huidige status:** `ci.yml` bevat `npm run test:coverage` maar geen threshold
- **Acties:**
  1. Voeg aan `vitest.config.ts` coverage-configuratie toe:
     ```ts
     coverage: { reporter: ['text', 'lcov'], thresholds: { lines: 60, functions: 60, statements: 60 } }
     ```
  2. Verifieer dat CI faalt bij <60% coverage
- **Tests:** CI pipeline draait
- **Complexiteit:** Laag (15 min)

### 9.6 — Playwright E2E tests voor ontbrekende flows
- **Audit ref:** 8.2
- **Acties:**
  1. `e2e/settings.spec.ts`: profiel-tab laden, wachtwoord wijzigen flow
  2. `e2e/legal.spec.ts`: /privacy en /terms bereikbaar; Footer links werken
  3. `e2e/cookie-consent.spec.ts`: banner verschijnt; accept/reject werkt
  4. `e2e/pricing.spec.ts`: /pricing rendert correct
- **Complexiteit:** Medium (1-2 uur)

---

## FASE 10: Toegankelijkheid & Inclusieve UX

### 10.1 — Chat-input label toevoegen
- **Audit ref:** 7.3 (U4), voortgangsrapport §7.3
- **Huidige status:** Onbekend — ChatPage niet geïnspecteerd
- **Acties:**
  1. Inspecteer `src/pages/ChatPage.tsx`
  2. Voeg `<label>` of `aria-label={t('chat.messageInput')}` toe aan het chat-input veld
  3. Voeg i18n key toe als die ontbreekt
- **Tests:** axe-core scan of handmatige verificatie
- **Complexiteit:** Laag (15 min)

### 10.2 — axe-core integratie in tests
- **Audit ref:** 9.1
- **Huidige status:** Geen automatische accessibility scanning
- **Acties:**
  1. Installeer `@axe-core/playwright` (of `vitest-axe`)
  2. Voeg axe-core check toe aan `e2e/accessibility.spec.ts` voor de 5 meest bezochte pagina's: /, /login, /register, /dashboard, /faq
  3. Corrigeer alle critical/serious violations
- **Tests:** E2E accessibility test slaagt
- **Complexiteit:** Medium (1-2 uur)

### 10.3 — Font-size schakelaar
- **Audit ref:** 9.2
- **Huidige status:** Niet geïmplementeerd
- **Acties:**
  1. Voeg aan `src/contexts/ThemeContext.tsx` een `fontSize` state toe ('normal' | 'large' | 'extra-large')
  2. Pas `<html>` element `font-size` aan (100% / 112.5% / 125%)
  3. Voeg toggle toe aan SettingsPage onder "Accessibility" tab
  4. Persist in localStorage en profile.preferred_font_size
  5. i18n keys voor de 3 opties
- **Tests:** Unit-test: font-size klasse wordt correct gezet
- **Complexiteit:** Medium (1 uur)

---

## FASE 11: Instructional Design

### 11.1 — Transcriptie-upload UI voor docenten
- **Audit ref:** 10.2, voortgangsrapport §10.2
- **Huidige status:** Database kolom `transcript` bestaat op `lesson_recordings`, maar geen UI
- **Acties:**
  1. In `src/pages/teacher/TeacherRecordingsPage.tsx`: voeg "Upload transcript" textarea toe per recording
  2. Save via `supabase.from('lesson_recordings').update({ transcript })` 
  3. In `src/pages/RecordingsPage.tsx` (student-weergave): toon transcript als collapsible panel naast video
  4. i18n keys: `recordings.transcript`, `recordings.uploadTranscript`, `recordings.showTranscript`
- **Tests:**
  - Unit-test: transcript-veld rendert; save-knop roept update aan
- **Complexiteit:** Medium (1-2 uur)

### 11.2 — Placeholder voor adaptieve leerroutes
- **Audit ref:** 10.3 (P5-5)
- **Huidige status:** 0%
- **Acties:**
  1. Maak `src/lib/learning-recommendations.ts` met:
     - `getRecommendedExercise(studentAnalytics, availableExercises)` → returns exercise ID
     - Logica: prioriteer `weakest_category` met oefeningen die nog niet gedaan zijn
  2. Toon in `StudentDashboard.tsx` een "Aanbevolen oefening" card met link
  3. i18n keys: `dashboard.recommendedExercise`, `dashboard.basedOnProgress`
- **Tests:**
  - Unit-test `src/test/learning-recommendations.test.ts`: verifieer algoritme
- **Complexiteit:** Medium (1-2 uur)

---

## FASE 12: i18n & Formatting

### 12.1 — Locale-aware number formatter
- **Audit ref:** 11.2
- **Huidige status:** Alleen `PricingPage` gebruikt `Intl.NumberFormat`; rest niet
- **Acties:**
  1. Voeg toe aan `src/lib/date-utils.ts` (of nieuw `src/lib/format-utils.ts`):
     ```ts
     export function formatNumber(value: number, locale?: string): string
     export function formatCurrency(value: number, currency: string, locale?: string): string
     export function formatPercent(value: number, locale?: string): string
     ```
  2. Pas toe in: PricingPage, admin PaymentsPage, ProgressPage (scores), GamificationPage (punten)
- **Tests:**
  - Unit-test: `formatCurrency(100, 'EUR', 'nl')` → `€ 100,00`; `formatCurrency(100, 'EUR', 'ar')` → Arabische notatie
- **Complexiteit:** Medium (1 uur)

### 12.2 — ESLint regel voor onvertaalde strings (optioneel)
- **Audit ref:** 11
- **Acties:**
  1. Installeer `eslint-plugin-i18next`
  2. Configureer in `eslint.config.js`: `i18next/no-literal-string` als warning
  3. Excludeer test-bestanden
- **Tests:** Lint draait zonder crashes; rapporteert bekende violations
- **Complexiteit:** Laag (30 min)

---

## FASE 13: Security & DevSecOps

### 13.1 — CSP versterken (verwijder unsafe-eval)
- **Audit ref:** 12.1, voortgangsrapport §12.1
- **Huidige status:** CSP meta-tag bevat `'unsafe-inline' 'unsafe-eval'`
- **Acties:**
  1. Verwijder `'unsafe-eval'` uit de CSP meta-tag in `index.html` r.10
  2. Test of de app nog correct laadt (Vite productie-build gebruikt geen eval)
  3. Als het breekt: voeg nonce-based script loading toe
- **Tests:**
  - E2E-test: app laadt zonder CSP violations in console
- **Complexiteit:** Laag-Medium (30-60 min, afhankelijk van Vite build)

### 13.2 — XSS-sanitatie voor rich text (DOMPurify)
- **Audit ref:** 12.1
- **Huidige status:** Geen input sanitatie voor forum/chat
- **Acties:**
  1. Installeer `dompurify` + `@types/dompurify`
  2. Maak `src/lib/sanitize.ts`:
     ```ts
     import DOMPurify from 'dompurify';
     export function sanitizeHtml(dirty: string): string { return DOMPurify.sanitize(dirty); }
     ```
  3. Pas toe in: ForumPostPage (post content rendering), ChatPage (message rendering)
- **Tests:**
  - Unit-test: `sanitizeHtml('<script>alert(1)</script>')` → leeg
- **Complexiteit:** Medium (1 uur)

### 13.3 — Secret-validatie in edge functions
- **Audit ref:** 12.3
- **Huidige status:** Edge functions crashen silently als secrets ontbreken
- **Acties:**
  1. Maak `supabase/functions/_shared/validate-env.ts`:
     ```ts
     export function requireEnv(name: string): string {
       const val = Deno.env.get(name);
       if (!val) throw new Error(`Missing required secret: ${name}`);
       return val;
     }
     ```
  2. Gebruik in `send-email/index.ts`: `const resendKey = requireEnv('RESEND_API_KEY');`
  3. Gebruik in `stripe-checkout/index.ts` en `stripe-webhook/index.ts`: `requireEnv('STRIPE_SECRET_KEY')`
  4. Retourneer 503 met duidelijke foutmelding als secret ontbreekt
- **Tests:**
  - Deno test: `requireEnv('NONEXISTENT')` throws
- **Complexiteit:** Laag (30 min)

### 13.4 — Data export rate limiting
- **Audit ref:** 16.2
- **Huidige status:** Geen rate limiting op `export-user-data`
- **Acties:**
  1. In `supabase/functions/export-user-data/index.ts`:
     - Query `data_retention_log` voor recente exports van deze user
     - Als export < 24u geleden → retourneer 429 met `{ error: 'rate_limited', retry_after_hours: X }`
     - Na succesvolle export → insert in `data_retention_log`
- **Tests:**
  - `supabase--curl_edge_functions`: eerste call → 200; tweede call binnen 24u → 429
- **Complexiteit:** Laag (30 min)

---

## FASE 14: DevOps & CI/CD

### 14.1 — CI uitbreiden met security scanning
- **Audit ref:** 8.4, 12.5, 13.1
- **Acties:**
  1. Voeg aan `.github/workflows/ci.yml` toe:
     ```yaml
     security-audit:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: '20', cache: 'npm' }
         - run: npm ci
         - run: npm audit --audit-level=high
     ```
  2. Voeg Lighthouse CI stap toe aan build job:
     ```yaml
     - name: Lighthouse CI
       run: |
         npm install -g @lhci/cli
         lhci autorun --upload.target=temporary-public-storage
     ```
- **Tests:** CI pipeline draait succesvol
- **Complexiteit:** Medium (1 uur)

### 14.2 — Feature flags module
- **Audit ref:** 13.1
- **Acties:**
  1. Maak `src/lib/feature-flags.ts`:
     ```ts
     const FLAGS: Record<string, boolean> = {
       OFFLINE_MODE: false,
       ADAPTIVE_LEARNING: false,
       CERTIFICATE_GENERATION: false,
     };
     export function isFeatureEnabled(flag: string): boolean { return FLAGS[flag] ?? false; }
     ```
  2. Gebruik in code: `if (isFeatureEnabled('ADAPTIVE_LEARNING')) { ... }`
  3. Later uitbreidbaar naar database-tabel voor runtime configuratie
- **Tests:** Unit-test: flag aan → true; flag uit → false; onbekende flag → false
- **Complexiteit:** Laag (20 min)

---

## FASE 15: Billing & Pricing

### 15.1 — PricingPage uitbreiden met discount codes
- **Audit ref:** 14.2
- **Huidige status:** Basispagina zonder korting-integratie
- **Acties:**
  1. Voeg discount code input toe aan PricingPage
  2. Valideer code via `supabase.from('discount_codes').select()` met filters
  3. Toon originele prijs doorgestreept + korting-prijs
  4. i18n keys: `pricing.discountCode`, `pricing.applyCode`, `pricing.invalidCode`, `pricing.discountApplied`
- **Tests:**
  - Unit-test: geldige code toont korting; ongeldige code toont error
- **Complexiteit:** Medium (1-2 uur)

### 15.2 — BTW/tax helper
- **Audit ref:** 14.1
- **Acties:**
  1. Maak `src/lib/tax-utils.ts`:
     ```ts
     const TAX_RATES: Record<string, number> = { NL: 0.21, BE: 0.21, DE: 0.19, default: 0 };
     export function calculateTax(amount: number, countryCode: string): { net: number; tax: number; total: number }
     ```
  2. Gebruik in PricingPage om btw apart te tonen
  3. i18n keys: `pricing.inclVat`, `pricing.exclVat`, `pricing.vatRate`
- **Tests:** Unit-test: NL 21% correct berekend
- **Complexiteit:** Laag (30 min)

---

## FASE 16: Support & Community

### 16.1 — E2E tests voor Helpdesk en Knowledge Base
- **Audit ref:** 15
- **Acties:**
  1. Breid `e2e/helpdesk.spec.ts` uit met:
     - Navigeer naar /helpdesk → pagina laadt
     - FAQ zoekfunctie werkt
  2. Maak `e2e/knowledge-base.spec.ts`:
     - /faq laadt categorieën
     - Artikel openen werkt
- **Complexiteit:** Laag (30 min)

### 16.2 — HelpWidget configureerbaar maken
- **Audit ref:** 15.3
- **Huidige status:** Widget altijd zichtbaar
- **Acties:**
  1. Voeg een `showHelpWidget` prop toe aan `HelpWidget.tsx` (default: true)
  2. In `app-config.ts`: `helpWidget: { enabled: true, position: 'bottom-end' }`
  3. In `App.tsx`: `{config.helpWidget.enabled && <HelpWidget />}`
- **Tests:** Unit-test: widget rendert niet als disabled
- **Complexiteit:** Laag (15 min)

---

## FASE 17: Business Development

### 17.1 — app-config.ts integreren in Header, Footer, manifest.json
- **Audit ref:** 18.1, voortgangsrapport §18.1
- **Huidige status:** Config-bestand bestaat maar wordt nergens gebruikt
- **Acties:**
  1. In `src/components/layout/Header.tsx`: import `config` en gebruik `config.appNameShort` i.p.v. hardcoded "HVA"
  2. In `src/components/layout/Footer.tsx`: gebruik `config.appNameShort`
  3. In `index.html`: gebruik `config.appName` in `<title>` — NB: dit is statisch, dus voeg een comment toe dat dit gesynchroniseerd moet worden
  4. In `src/components/Logo.tsx`: gebruik `config.logo.src` en `config.logo.alt`
  5. In `public/manifest.json`: documenteer dat dit gesynchroniseerd moet worden met app-config
- **Tests:** Grep op hardcoded "HVA" in componenten → alleen in config
- **Complexiteit:** Medium (1 uur)

### 17.2 — Certificaat-generatie placeholder
- **Audit ref:** 18.3
- **Acties:**
  1. Maak `src/lib/certificate-utils.ts`:
     ```ts
     export interface CertificateData {
       studentName: string;
       levelName: string;
       completedAt: Date;
       score: number;
     }
     export function generateCertificateHtml(data: CertificateData): string { /* HTML template */ }
     ```
  2. Voeg "Download certificaat" knop toe op ProgressPage wanneer een niveau voltooid is (feature flag: `CERTIFICATE_GENERATION`)
  3. i18n keys: `progress.downloadCertificate`, `progress.certificateTitle`
- **Tests:** Unit-test: `generateCertificateHtml` retourneert geldige HTML met studentnaam
- **Complexiteit:** Medium (1 uur)

---

## FASE 18: Progressive Enhancement & PWA

### 18.1 — Noscript fallback
- **Audit ref:** 6.1
- **Acties:**
  1. Voeg aan `index.html` toe na `<div id="root">`:
     ```html
     <noscript>
       <div style="padding:2rem;text-align:center;font-family:sans-serif">
         <h1>JavaScript vereist</h1>
         <p>Deze applicatie vereist JavaScript. Schakel JavaScript in of neem contact op via support@huisvanhetarabisch.nl</p>
       </div>
     </noscript>
     ```
- **Tests:** Disable JS in browser → noscript-bericht zichtbaar
- **Complexiteit:** Laag (5 min)

### 18.2 — ErrorBoundary directe import blokkeren
- **Audit ref:** 7.3 (U3)
- **Huidige status:** ErrorBoundary is exporteerbaar; alle huidige imports gaan via TranslatedErrorBoundary
- **Acties:**
  1. Voeg JSDoc `@internal` tag toe aan ErrorBoundary export
  2. Voeg comment toe: `// Use TranslatedErrorBoundary instead of importing this directly`
  3. Overweeg: hernoem naar `_ErrorBoundary` of verplaats naar `components/internal/`
- **Tests:** Grep: geen directe `<ErrorBoundary` imports buiten TranslatedErrorBoundary
- **Complexiteit:** Laag (10 min)

---

## AFHANKELIJKHEDEN-MATRIX

```
6.2 (design tokens) ← geen
6.3 (color linter)  ← 6.2
6.4 (footer links)  ← geen (pagina's bestaan)
6.5 (terms checkbox) ← 6.4
6.6 (consent→analytics) ← geen
7.1 (logger test)   ← geen
7.2 (error logging) ← 6.1 (API wrapper)
7.3 (health-check)  ← geen
8.1 (helpdesk refactor) ← 6.1 (optioneel, kan ook zonder wrapper)
8.2 (leaderboard idx) ← geen
8.3 (gamification types) ← geen
9.1-9.4 (unit tests) ← geen
9.5 (coverage CI)   ← geen
9.6 (E2E tests)     ← 6.4, 6.5, 6.6
10.1 (chat label)   ← geen
10.2 (axe-core)     ← geen
10.3 (font-size)    ← geen
11.1 (transcriptie) ← geen
11.2 (adaptief)     ← geen
12.1 (formatter)    ← geen
13.1 (CSP)          ← geen
13.2 (DOMPurify)    ← geen
13.3 (secret-val)   ← geen
13.4 (rate limit)   ← geen
14.1 (CI security)  ← geen
14.2 (feature flags) ← geen
15.1 (discount)     ← geen
15.2 (BTW)          ← 12.1
16.1 (E2E support)  ← geen
17.1 (app-config)   ← geen
17.2 (certificaat)  ← 14.2 (feature flag)
18.1 (noscript)     ← geen
18.2 (ErrorBoundary) ← geen
```

---

## PRIORITEITSVOLGORDE (aanbevolen uitvoering)

### Batch 1 — Quick wins & compliance (parallel uitvoerbaar)
| Taak | Complexiteit | Impact |
|------|-------------|--------|
| 6.2 Design tokens in Tailwind | Laag | Hoog — fixt onzekere kleuren |
| 6.4 Footer links privacy/terms | Laag | Hoog — compliance |
| 6.6 Cookie consent → analytics | Medium | Kritiek — GDPR compliance |
| 18.1 Noscript fallback | Laag | Medium |
| 18.2 ErrorBoundary blokkeren | Laag | Laag |
| 13.3 Secret-validatie | Laag | Hoog — betere foutmeldingen |

### Batch 2 — Testing & kwaliteit
| Taak | Complexiteit | Impact |
|------|-------------|--------|
| 6.5 Terms checkbox | Laag | Hoog — compliance |
| 9.1-9.4 Unit tests | Laag | Hoog — coverage |
| 9.5 Coverage CI | Laag | Hoog — CI kwaliteit |
| 7.1 Logger test | Laag | Medium |
| 14.2 Feature flags | Laag | Medium |

### Batch 3 — Refactoring & observability
| Taak | Complexiteit | Impact |
|------|-------------|--------|
| 6.1 API wrapper | Medium | Hoog — code kwaliteit |
| 8.1 Helpdesk refactor | Medium | Medium |
| 8.3 Gamification types | Medium | Medium — TypeScript correctheid |
| 7.2 Client error logging | Medium | Medium |
| 7.3 Health-check | Laag | Medium |

### Batch 4 — Features & UX
| Taak | Complexiteit | Impact |
|------|-------------|--------|
| 10.1 Chat-input label | Laag | Medium — a11y |
| 10.2 axe-core integratie | Medium | Hoog — a11y |
| 10.3 Font-size schakelaar | Medium | Medium — a11y |
| 11.1 Transcriptie UI | Medium | Medium |
| 12.1 Number formatter | Medium | Medium |
| 15.1 Discount codes | Medium | Medium |

### Batch 5 — Innovatie & lange termijn
| Taak | Complexiteit | Impact |
|------|-------------|--------|
| 11.2 Adaptieve leerroutes | Medium | Hoog — USP |
| 13.1 CSP versterken | Medium | Hoog — security |
| 13.2 DOMPurify | Medium | Hoog — security |
| 14.1 CI security | Medium | Medium |
| 17.1 App-config integratie | Medium | Medium |
| 17.2 Certificaat placeholder | Medium | Medium |
| 13.4 Rate limiting | Laag | Medium |
| 15.2 BTW helper | Laag | Laag |

### Batch 6 — E2E & polish
| Taak | Complexiteit | Impact |
|------|-------------|--------|
| 9.6 Playwright E2E | Medium | Hoog — test coverage |
| 16.1 E2E support | Laag | Medium |
| 16.2 HelpWidget config | Laag | Laag |
| 6.3 Color linter | Laag | Laag |
| 12.2 i18n lint | Laag | Laag |
| 8.2 Leaderboard index | Laag | Laag |

---

## SAMENVATTING

| Metriek | Waarde |
|---------|--------|
| Totaal taken | 40 |
| Laag complexiteit | 22 |
| Medium complexiteit | 18 |
| Geschatte totaaltijd | 25-35 uur |
| Verwacht resultaat | 85-90% voltooid (strikt) |
| Resterende 10-15% | Handmatige acties (secrets, juridische review, load-testing, Capacitor builds) |

---

*Dit plan vervangt het vorige plan.md. Laatst bijgewerkt: 2026-02-23.*
