
# Blueprint: HVA Platform naar Productie-gereedheid

## Samenvatting per domein

| # | Domein | Status | % | Kritieke openstaande issues |
|---|--------|--------|---|---------------------------|
| 1 | Architectuur & Serviceontwerp | Gedeeltelijk | 70% | Geen centraal error-handling punt; geen wrapper-service voor API-calls |
| 2 | Observability & Fault-tolerance | Niet geimplementeerd | 20% | Geen structured logging, monitoring, alerts, health-checks |
| 3 | Database, DBA & Performance | Gedeeltelijk | 85% | Indexen onbekend; use-gamification N+1 queries |
| 4 | RLS & Autorisatie | Voltooid (structureel) | 90% | Geen geautomatiseerde policy-tests |
| 5 | Caching & Async verwerking | Gedeeltelijk | 60% | use-gamification buiten TanStack Query; pg_cron niet actief |
| 6 | Front-end, PWA & Mobiel | Gedeeltelijk | 70% | Offline uitgeschakeld; geen noscript fallback |
| 7 | UX-consistentie & Ontwerp | Gedeeltelijk | 85% | 6 hardcoded kleuren; Footer aria-labels statisch |
| 8 | Testing & QA | Gedeeltelijk | 50% | Ontbrekende tests voor SettingsPage, ForgotPassword, ResetPassword, edge functions |
| 9 | Toegankelijkheid | Gedeeltelijk | 60% | Focus-obscuring door sticky header; geen font-size aanpassing |
| 10 | Instructional Design | Gedeeltelijk | 75% | Geen transcripties; geen adaptief leren |
| 11 | i18n & Lokalisatie | Gedeeltelijk | 92% | LoginForm Zod standaard EN; Footer aria-labels niet via t() |
| 12 | Beveiliging & DevSecOps | Bug + gedeeltelijk | 75% | SettingsPage.tsx:73 min 6 i.p.v. 8; geen CSP; geen dependency scanning |
| 13 | DevOps & CI/CD | Gedeeltelijk | 40% | 15+ boilerplate workflows; geen feature flags |
| 14 | Billing & Pricing | Gedeeltelijk | 30% | STRIPE_SECRET_KEY niet geconfigureerd; geen pricing-pagina |
| 15 | Support & Community | Voltooid (structureel) | 85% | Geen persistente help-widget |
| 16 | Analytics & Data Science | Gedeeltelijk | 70% | Geen privacy-vriendelijke analytics; geen A/B testing |
| 17 | Legal & Privacy | Niet geimplementeerd | 0% | Geen privacyverklaring, gebruiksvoorwaarden, cookie consent |
| 18 | Business Development | Niet geimplementeerd | 0% | Geen white-label; geen certificering |

---

## Actieplan per fase

### FASE 1: Kritieke bugs en compliance (Week 1-2)

#### Taak 1.1 - SettingsPage wachtwoord-validatie fix
- **Audit ref:** P1-1, sectie 12.4
- **Bestand:** `src/pages/SettingsPage.tsx`, regel 73
- **Actie:** Wijzig `newPassword.length < 6` naar `newPassword.length < 8`
- **Subtaken:**
  - Pas de foutmelding aan via `t('validation.passwordMin')`
  - Voeg unit test toe voor wachtwoord-validatie in SettingsPage
- **Verificatie:** Unit test slaagt; handmatig testen met wachtwoord van 7 tekens wordt geweigerd

#### Taak 1.2 - LoginForm Zod i18n
- **Audit ref:** P2-5, sectie 11.4 (I7)
- **Bestand:** `src/components/auth/LoginForm.tsx`, regels 28-31
- **Actie:** Verplaats `loginSchema` naar BINNEN de component (zoals bij RegisterForm) zodat `t()` beschikbaar is
- **Subtaken:**
  - Schema herdefiniëren met `t('validation.invalidEmail')` en `t('validation.passwordMin')`
  - Bevestig dat de keys al bestaan in nl.json/en.json/ar.json (ze bestaan, sectie 11.1)
- **Verificatie:** Taalwissel naar AR/EN toont gelokaliseerde Zod-foutberichten

#### Taak 1.3 - Privacyverklaring en Gebruiksvoorwaarden
- **Audit ref:** P4-1, P4-2, sectie 17
- **Actie:** 
  - Maak `src/pages/PrivacyPage.tsx` met privacybeleid (NL/EN/AR via i18n)
  - Maak `src/pages/TermsPage.tsx` met gebruiksvoorwaarden (NL/EN/AR via i18n)
  - Registreer routes `/privacy` en `/terms` in `src/App.tsx`
  - Voeg links toe aan Footer.tsx
  - Voeg verplichte checkbox toe aan RegisterForm met link naar voorwaarden
- **Subtaken:**
  - Vertaalkeys toevoegen aan nl.json, en.json, ar.json (privacy.*, terms.*)
  - Juridische teksten opstellen (placeholder die later door jurist aangevuld wordt)
- **Verificatie:** Routes bereikbaar; checkbox blokkeert registratie als niet aangevinkt; teksten in 3 talen

#### Taak 1.4 - Cookie consent banner
- **Audit ref:** P4-3, sectie 17.2
- **Actie:**
  - Maak `src/components/CookieConsent.tsx` met accept/reject/preferences opties
  - Sla keuze op in localStorage
  - Blokkeer analytics tracking tot consent gegeven is
  - Voeg component toe aan `src/App.tsx`
- **Subtaken:**
  - i18n keys voor cookiebanner-teksten
  - Link naar privacyverklaring vanuit banner
- **Verificatie:** Banner verschijnt bij eerste bezoek; analytics_events worden pas weggeschreven na accept

#### Taak 1.5 - RESEND_API_KEY configureren
- **Audit ref:** P2-1, sectie 1.2, 12.3
- **Actie:** Secret toevoegen via Lovable Cloud secrets management
- **Afhankelijkheid:** Gebruiker moet een Resend-account aanmaken en API-key opgeven
- **Verificatie:** `send-email` edge function retourneert 200 bij test-aanroep

#### Taak 1.6 - Registratie-redirect na succes
- **Audit ref:** P2-2, sectie 1 (punt 11)
- **Bestand:** `src/contexts/AuthContext.tsx`, regels 227-231
- **Actie:** Na succesvolle signUp, navigate naar `/login` met state `{ registered: true }`; op LoginPage een melding tonen "Controleer je e-mail"
- **Subtaken:**
  - AuthContext: return `{ error: null, success: true }` na signUp
  - RegisterPage: bij success navigate naar `/login`
  - LoginPage: check `location.state?.registered` en toon info-toast
  - i18n keys: `auth.checkEmail`, `auth.registrationComplete`
- **Verificatie:** Registratie leidt naar login-pagina met vertaald succesbericht

---

### FASE 2: Functionaliteit en i18n (Week 2-3)

#### Taak 2.1 - Notificatie-instellingen persistentie
- **Audit ref:** P2-3, sectie 6 (punt 62)
- **Actie:**
  - Database migratie: voeg `email_notifications` (boolean, default true), `lesson_reminders` (boolean, default true), `exercise_notifications` (boolean, default true) toe aan `profiles` tabel
  - SettingsPage.tsx: laad waarden bij mount via profile data; sla op via useMutation bij toggle-change
- **Subtaken:**
  - SQL migratie met ALTER TABLE
  - Update SettingsPage om uit profile te lezen
  - Debounce toggle-saves (optioneel)
- **Verificatie:** Toggles behouden hun waarde na page reload; waarden zichtbaar in database

#### Taak 2.2 - Footer aria-labels via i18n
- **Audit ref:** P3-4, sectie 7.3 (U2), sectie 11.4 (I8)
- **Bestand:** `src/components/layout/Footer.tsx`, regels 78, 88, 98
- **Actie:** Vervang hardcoded aria-labels door `t('accessibility.switchToNL')`, `t('accessibility.switchToEN')`, `t('accessibility.switchToAR')`
- **Subtaken:**
  - Voeg 3 keys toe aan nl.json, en.json, ar.json
- **Verificatie:** Screen reader leest correcte taal-specifieke label voor bij elke taalknop

#### Taak 2.3 - Hardcoded Tailwind kleuren vervangen
- **Audit ref:** P3-3, sectie 7.1
- **Bestanden:**
  - `src/pages/HomePage.tsx` regels 137-139: `bg-green-500`, `bg-blue-500`, `bg-purple-500`
  - `src/hooks/use-gamification.ts` regels 250, 252, 254: `text-blue-500`, `text-purple-500`, `text-amber-500`
- **Actie:** Definieer semantische CSS variabelen (bijv. `--color-level-beginner`, `--color-rarity-rare`) in index.css en gebruik die in Tailwind config of inline
- **Verificatie:** Kleuren passen zich aan bij themawissel (light/dark)

#### Taak 2.4 - use-gamification refactor naar TanStack Query
- **Audit ref:** P3-1, sectie 3.4, 5.1
- **Bestand:** `src/hooks/use-gamification.ts` (274 regels)
- **Actie:** Vervang handmatige useState/useEffect/useCallback door:
  - `useQuery(['gamification', 'points', userId])` voor punten
  - `useQuery(['gamification', 'badges', userId])` voor badges
  - `useQuery(['gamification', 'leaderboard', period])` voor leaderboard
  - `useMutation` voor updateStreak, awardPoints, checkBadges
- **Subtaken:**
  - Behoud getRarityColor als pure utility (geen refactor nodig)
  - Invalidate queries na mutaties
- **Verificatie:** Geen `useEffect` of `useState` voor data-fetching; stale-while-revalidate werkt; geen dubbele requests

#### Taak 2.5 - Data export voor gebruikers (GDPR portability)
- **Audit ref:** P4-4, sectie 16.2
- **Actie:**
  - Voeg "Exporteer mijn gegevens" knop toe aan SettingsPage profiel-tab
  - Maak edge function `export-user-data` die profiel, voortgang, analytics en berichten bundelt als JSON
  - Download als .json bestand
- **Subtaken:**
  - i18n keys voor export-knop en bevestiging
  - Rate limiting op export (max 1x per 24 uur)
- **Verificatie:** Download bevat alle persoonlijke data; functie werkt voor alle rollen

---

### FASE 3: Code-kwaliteit en DevOps (Week 3-4)

#### Taak 3.1 - Verwijder boilerplate GitHub workflows
- **Audit ref:** P3-2, sectie 8.3
- **Actie:** Verwijder 17 niet-relevante workflow-bestanden:
  ```
  ant.yml, astro.yml, azure-webapps-node.yml, deno.yml,
  generator-generic-ossf-slsa3-publish.yml, greetings.yml,
  jekyll-docker.yml, label.yml, manual.yml, node.js.yml,
  npm-publish.yml, npm-publish-github-packages.yml, nuxtjs.yml,
  python-app.yml, stale.yml, static.yml, terraform.yml, webpack.yml
  ```
- **Behoud:** `ci.yml` (relevante pipeline)
- **Verificatie:** Alleen ci.yml blijft; CI pipeline draait succesvol

#### Taak 3.2 - ErrorBoundary i18n-hardening
- **Audit ref:** P3-5, sectie 7.3 (U3)
- **Bestand:** `src/components/ErrorBoundary.tsx`, regels 43, 47, 56
- **Actie:** Laat ErrorBoundary altijd via TranslatedErrorBoundary wrappen; verwijder directe imports van ErrorBoundary in andere bestanden of voeg fallback-props toe
- **Verificatie:** Grep op `<ErrorBoundary` toont geen directe imports zonder vertaalde props

#### Taak 3.3 - Tests toevoegen voor ontbrekende pagina's
- **Audit ref:** sectie 8.1, 8.2
- **Actie:**
  - Unit tests: `src/test/settings.test.tsx`, `src/test/forgot-password.test.tsx`, `src/test/reset-password.test.tsx`
  - E2E tests: `e2e/settings.spec.ts`, `e2e/forgot-password.spec.ts`
- **Subtaken:**
  - Test wachtwoord-validatie (min 8 tekens) in SettingsPage
  - Test registratie-redirect flow
  - Test cookie consent verschijnt bij eerste bezoek
- **Verificatie:** `npm run test` slaagt; coverage >= 60%

#### Taak 3.4 - Database indexen analyseren en toevoegen
- **Audit ref:** sectie 3.2
- **Actie:** SQL migratie met:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
  CREATE INDEX IF NOT EXISTS idx_exercises_class_published ON exercises(class_id, is_published);
  CREATE INDEX IF NOT EXISTS idx_chat_messages_class_id ON chat_messages(class_id);
  ```
- **Verificatie:** Indexen bestaan; query-performance verbeterd (controleer via analytics)

---

### FASE 4: Observability, Security en PWA (Week 4-6)

#### Taak 4.1 - Structured logging in edge functions
- **Audit ref:** sectie 2.2
- **Actie:** Maak een `supabase/functions/_shared/logger.ts` utility die JSON-formatted logs uitschrijft met `level`, `function_name`, `request_id`, `duration_ms`, `error`
- **Subtaken:**
  - Integreer in alle 13 edge functions
  - Voeg request-id header toe voor tracing
- **Verificatie:** Edge function logs tonen structured JSON; fouten bevatten stack traces

#### Taak 4.2 - CSP headers via edge function
- **Audit ref:** P5-2, sectie 12.1
- **Actie:** Configureer Content-Security-Policy headers. Aangezien Lovable Cloud de hosting beheert, voeg een meta-tag toe aan `index.html`:
  ```html
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co;">
  ```
- **Verificatie:** Browser console toont geen CSP-violations bij normaal gebruik; XSS-payloads worden geblokkeerd

#### Taak 4.3 - Skip-to-content en focus-management
- **Audit ref:** sectie 9.1
- **Bestanden:** `src/components/layout/MainLayout.tsx` (r.17-22 - al aanwezig)
- **Actie:** Verifieer dat skip-link correct werkt; controleer dat sticky header (z-50) focus niet verbergt
- **Subtaken:**
  - Voeg `scroll-margin-top` toe aan `#main-content` zodat gefocuste elementen niet achter header verdwijnen
  - Test met Tab-navigatie door de gehele app
- **Verificatie:** Tab-navigatie toont altijd het gefocuste element volledig; skip-link springt naar content

#### Taak 4.4 - pg_cron configureren
- **Audit ref:** P2-4, sectie 5.2
- **Actie:** Activeer pg_cron en pg_net extensies; configureer cron-jobs:
  - `release-exercises`: dagelijks om 06:00 UTC
  - `send-lesson-reminders`: elk uur
- **Verificatie:** Cron-jobs zichtbaar in database; exercises worden automatisch gepubliceerd op release_date

---

### FASE 5: Lange-termijn innovaties (Week 6+)

#### Taak 5.1 - Offline-functionaliteit (PWA)
- **Audit ref:** P5-1, sectie 6.3
- **Actie:** Vervang self-destructing SW door Workbox met:
  - Cache-first voor statische assets (JS, CSS, images)
  - Network-first voor API-calls
  - Offline fallback-pagina
- **Verificatie:** App laadt zonder internet (statische pagina's); toont offline-melding bij data-requests

#### Taak 5.2 - Persistente help-widget
- **Audit ref:** sectie 15.3
- **Actie:** Maak een floating help-button component dat op elke pagina zichtbaar is en linkt naar FAQ/Helpdesk
- **Verificatie:** Widget zichtbaar op alle pagina's; opent FAQ in modal of navigeert naar /faq

#### Taak 5.3 - Pricing-pagina
- **Audit ref:** sectie 14.2
- **Actie:** Maak `src/pages/PricingPage.tsx` die klassprijzen toont met korting-toepassing; route `/pricing`
- **Afhankelijkheid:** STRIPE_SECRET_KEY configuratie (handmatig, buiten scope)
- **Verificatie:** Publiek toegankelijk; toont prijzen in correcte valuta

#### Taak 5.4 - Transcripties en ondertiteling
- **Audit ref:** sectie 10.2
- **Actie:** Voeg `transcript` kolom toe aan `lesson_recordings` tabel; UI voor transcriptie-upload door docenten; weergave naast video-player
- **Verificatie:** Docent kan transcriptie uploaden; student ziet tekst naast video

#### Taak 5.5 - White-label configuratie
- **Audit ref:** sectie 18.1
- **Actie:** Verplaats app-naam, logo en kleuren naar een configuratiebestand of database-tabel zodat meerdere instanties mogelijk zijn
- **Verificatie:** App-naam wijzigbaar zonder code-aanpassing

---

## Mijlpalen en tijdslijn

```text
Week 1-2: FASE 1 - Kritieke bugs en compliance
  |-- Taak 1.1: SettingsPage wachtwoord fix
  |-- Taak 1.2: LoginForm Zod i18n
  |-- Taak 1.3: Privacy + Terms pagina's
  |-- Taak 1.4: Cookie consent banner
  |-- Taak 1.5: RESEND_API_KEY configureren
  |-- Taak 1.6: Registratie-redirect

Week 2-3: FASE 2 - Functionaliteit en i18n
  |-- Taak 2.1: Notificatie-persistentie (DB migratie)
  |-- Taak 2.2: Footer aria-labels i18n
  |-- Taak 2.3: Hardcoded kleuren vervangen
  |-- Taak 2.4: use-gamification refactor
  |-- Taak 2.5: GDPR data export

Week 3-4: FASE 3 - Code-kwaliteit en DevOps
  |-- Taak 3.1: Boilerplate workflows verwijderen
  |-- Taak 3.2: ErrorBoundary i18n-hardening
  |-- Taak 3.3: Ontbrekende tests toevoegen
  |-- Taak 3.4: Database indexen

Week 4-6: FASE 4 - Observability, Security en PWA
  |-- Taak 4.1: Structured logging
  |-- Taak 4.2: CSP headers
  |-- Taak 4.3: Focus-management
  |-- Taak 4.4: pg_cron configureren

Week 6+: FASE 5 - Lange-termijn innovaties
  |-- Taak 5.1-5.5: Offline, help-widget, pricing, transcripties, white-label
```

---

## Verificatiecriteria per taak

| Taak | Test type | Criterium |
|------|-----------|-----------|
| 1.1 | Unit test | Wachtwoord van 7 tekens wordt geweigerd in SettingsPage |
| 1.2 | Handmatig | Zod-fouten verschijnen in AR bij taalwissel |
| 1.3 | E2E test | /privacy en /terms routes renderen correct in 3 talen |
| 1.4 | E2E test | Cookie banner verschijnt; analytics geblokkeerd voor consent |
| 1.5 | Edge function test | `send-email` retourneert 200 met test-payload |
| 1.6 | E2E test | Registratie leidt naar /login met succesbericht |
| 2.1 | Integratie test | Toggle -> reload -> toggle staat behouden |
| 2.2 | Accessibility audit | aria-labels dynamisch per taal |
| 2.3 | Visueel | Kleuren passen aan bij dark/light thema |
| 2.4 | Unit test | Geen useState/useEffect voor data-fetching in hook |
| 2.5 | Handmatig | Download bevat profiel + voortgangsdata |
| 3.1 | CI | Pipeline slaagt met alleen ci.yml |
| 3.2 | Grep | Geen directe ErrorBoundary imports zonder props |
| 3.3 | Coverage | >= 60% lines/functions/statements |
| 3.4 | SQL | `\di` toont verwachte indexen |
| 4.1 | Log inspectie | Edge function logs in JSON-formaat |
| 4.2 | Browser console | Geen CSP violations bij normaal gebruik |
| 4.3 | Keyboard test | Tab-navigatie toont altijd gefocust element |
| 4.4 | DB query | `cron.job` tabel bevat 2 geplande taken |
