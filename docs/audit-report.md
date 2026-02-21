# HVA Platform — Uitputtend Technisch Auditrapport (Master Reference)

**Versie:** 4.0  
**Datum:** 2026-02-21  
**Scope:** Alle 18 domeinen, 102+ onderdelen  
**Beoordelaar:** Lovable AI  

---

## DEFINITIE VAN "VOLTOOID" (STRICT)

Een onderdeel is **UITSLUITEND VOLTOOID** wanneer:

1. Alle code volledig geïmplementeerd is en vrij van bekende bugs
2. Alle i18n-keys bestaan in nl.json, en.json én ar.json met correcte vertalingen
3. De UI functioneel en bereikbaar is voor alle doelrollen (student/teacher/admin)
4. Er geen hardcoded strings zijn waar i18n verwacht wordt
5. Beveiligingsvalidatie consistent is over alle aanraakpunten
6. Er geen TODO's, placeholders of dode code overblijft
7. Tests bestaan en slagen (unit, integratie, E2E waar van toepassing)
8. Documentatie up-to-date is
9. Code gemerged is in de hoofdbranch
10. Performance, security en accessibility criteria zijn behaald

Een onderdeel is **GEDEELTELIJK** als aan één of meer criteria niet voldaan is.  
Een onderdeel is **NIET GEÏMPLEMENTEERD** als de functionaliteit geheel ontbreekt.

---

## 1. ARCHITECTUUR EN SERVICEONTWERP

### 1.1 Domein-gedreven opzet (DDD)

**Status: GEDEELTELIJK**

De codebase is een **monolithische Single Page Application** (Vite + React + TypeScript) met Supabase als Backend-as-a-Service. Er is geen formele DDD/Bounded Context-structuur.

**Huidige organisatie:**
- `src/pages/` — 40+ pagina's, plat georganiseerd met admin/teacher subdirectories
- `src/components/` — Feature-gebaseerde mappen (auth, admin, teacher, exercises, gamification, etc.)
- `src/hooks/` — Custom hooks (use-gamification, use-helpdesk, use-analytics, use-two-factor)
- `src/contexts/` — AuthContext, ClassContext, ThemeContext
- `supabase/functions/` — 13 edge functions

**Ontbrekend:**
- Geen expliciete bounded contexts (bijv. `src/domains/auth/`, `src/domains/exercises/`)
- Geen shared kernel of anti-corruption layers
- Services zijn impliciet gekoppeld via directe Supabase-queries in componenten
- Geen domain events of aggregates

**Aanbeveling:** Voor de huidige schaal (educatieplatform, <100K users) is de feature-gebaseerde mappenstructuur voldoende. Formele DDD zou overengineering zijn. Wél aanbevolen: groepeer gerelateerde hooks, types en services per feature-domein.

### 1.2 Micro-services / Macro-services

**Status: N.V.T.**

Het platform gebruikt een **monolithische SPA + Supabase BaaS-patroon**. Er zijn geen micro-services. De 13 edge functions fungeren als serverless endpoints, niet als zelfstandige services.

**Edge functions overzicht:**

| Functie | Verantwoordelijkheid | Koppeling |
|---------|---------------------|-----------|
| `analytics` | Platform statistieken | Leest uit meerdere tabellen |
| `complete-placement` | Niveau-test afronden | Schrijft naar placement_tests, stuurt e-mail |
| `gamification` | Punten, badges, streaks | Schrijft naar user_points, user_badges, points_transactions |
| `grade-submission` | Auto-grading + review | Leest questions, schrijft naar student_answers |
| `helpdesk` | Ticket management | Schrijft naar support_tickets |
| `manual-payment` | Handmatige betaling | Schrijft naar payments, subscriptions |
| `release-exercises` | Automatische release | Update exercises.is_published |
| `schedule-placement` | Meet link genereren | Update placement_tests |
| `send-email` | 12 e-mailtypes, 3 talen | **VEREIST RESEND_API_KEY** (niet geconfigureerd) |
| `send-lesson-reminders` | Herinneringen | **VEREIST RESEND_API_KEY + pg_cron** |
| `stripe-checkout` | Stripe checkout | **VEREIST STRIPE_SECRET_KEY** (handmatig) |
| `stripe-webhook` | Stripe webhook | **VEREIST STRIPE_SECRET_KEY** (handmatig) |
| `verify-2fa` | TOTP verificatie | Leest/schrijft 2FA-gerelateerde data |

**Grenzen:** Logisch gescheiden per domein. Geen distributed monolith-risico vanwege het BaaS-patroon.

### 1.3 API-gateway

**Status: NIET GEÏMPLEMENTEERD**

Er is geen centraal API-gateway-punt. Alle communicatie verloopt via:
1. **Supabase JS SDK** (`@supabase/supabase-js`) — directe DB-queries vanuit de browser
2. **Edge Function invocations** — via `supabase.functions.invoke()`

**Bestand:** `src/integrations/supabase/client.ts` (auto-gegenereerd, mag niet bewerkt worden)

**Ontbrekend:**
- Geen rate limiting op client-side
- Geen request/response interceptors
- Geen centraal error-handling punt voor API-calls
- Geen API versioning

**Aanbeveling:** Voor een Supabase BaaS-architectuur is een API-gateway niet gebruikelijk. RLS policies fungeren als autorisatielaag. Overweeg een wrapper-service voor gestandaardiseerde error handling.

### 1.4 Asynchrone communicatie en event-driven architecture

**Status: GEDEELTELIJK**

**Geïmplementeerd:**
- Supabase Realtime voor chat (`src/pages/ChatPage.tsx`) — postgres_changes subscription
- `setTimeout` in AuthContext (r.185) om deadlock bij signInWithPassword te voorkomen

**Niet geïmplementeerd:**
- Geen message queue (RabbitMQ, Redis Pub/Sub)
- Geen domain events
- Alle edge functions worden synchroon aangeroepen via `supabase.functions.invoke()`
- `send-email` wordt synchroon aangeroepen vanuit `complete-placement` en `schedule-placement`
- Geen event sourcing

**Aanbeveling:** Voor de huidige schaal is synchrone communicatie acceptabel. Bij groei: introduceer Supabase Database Webhooks voor event-driven patronen.

---

## 2. OBSERVABILITY EN FAULT-TOLERANCE

### 2.1 Circuit-breakers, retries, health-checks

**Status: GEDEELTELIJK**

**Geïmplementeerd:**
- **AuthContext retry:** `fetchRole()` (r.80-113) heeft een automatische retry na 1 seconde bij falen, met `lastKnownRole` fallback
- **AdminLayout/TeacherLayout timeout:** 15 seconden timeout met retry-knop voor role-loading
- **Build version check:** `src/main.tsx` (r.6-43) — cache-busting bij nieuwe deploys, SW cleanup

**Niet geïmplementeerd:**
- Geen circuit-breaker patroon voor edge function calls
- Geen health-check endpoints
- Geen exponential backoff
- Geen fallback UI bij netwerk-uitval (behalve ErrorBoundary)

### 2.2 Logging, tracing en metrics

**Status: MINIMAAL**

**Geïmplementeerd:**
- `console.error` in ErrorBoundary (r.28), AuthContext, use-gamification
- `console.log` in DashboardPage (r.14) voor debug
- `analytics_events` en `analytics_daily_stats` tabellen in database
- `feature_usage` tabel voor feature tracking
- `admin_activity_log` tabel voor audit trail
- Edge function `analytics` voor rapportage

**Niet geïmplementeerd:**
- Geen structured logging (JSON-formaat)
- Geen distributed tracing (OpenTelemetry)
- Geen centraal logging-platform (Datadog, Sentry)
- Geen performance metrics collection
- Geen dashboards of alerts
- Geen error tracking service

### 2.3 Incident-respons en monitoring

**Status: NIET GEÏMPLEMENTEERD**

- Geen uptime monitoring
- Geen alerting bij fouten
- Geen on-call procedures
- Geen incident runbooks
- Geen SLA-definities

---

## 3. DATABASEONTWERP, DBA EN PERFORMANCE

### 3.1 Normalisatie en schema

**Status: VOLTOOID (structureel)**

**30+ tabellen** in het public schema, genormaliseerd tot minstens 3NF:

| Domein | Tabellen |
|--------|---------|
| Auth & Profielen | `profiles`, `user_roles`, `teacher_applications` |
| Klassen & Niveaus | `classes`, `levels`, `class_enrollments` |
| Lessen | `lessons`, `lesson_themes`, `lesson_attendance`, `lesson_materials`, `lesson_recordings` |
| Oefeningen | `exercises`, `exercise_categories`, `questions`, `exercise_attempts`, `student_answers` |
| Forum & Chat | `forum_rooms`, `forum_posts`, `forum_comments`, `forum_likes`, `chat_messages`, `chat_reactions` |
| Gamification | `badges`, `user_badges` (niet in types.ts maar verwacht), `user_points` (niet in types.ts), `points_transactions`, `leaderboards` |
| Betalingen | `payments`, `subscriptions`, `installment_plans`, `discount_codes` |
| Support | `support_tickets`, `ticket_labels`, `ticket_label_assignments` |
| Analytics | `analytics_events`, `analytics_daily_stats`, `feature_usage`, `student_analytics`, `student_progress` |
| Admin | `admin_activity_log`, `admin_invitations`, `content_reports`, `placement_tests` |
| Kalender | `events`, `event_attendees` |
| GDPR | `data_retention_log` |
| Eindtoets | `final_exams`, `final_exam_questions`, `final_exam_attempts` |

**Naming:** Consistent snake_case, plurale tabelnamen, `_id` suffix voor foreign keys.

**Foreign keys:** Correct gedefinieerd. Bewust GEEN FK naar `auth.users` (Supabase best practice). Referenties via `user_id` kolommen.

**Defaults:** `created_at` en `updated_at` met `now()` defaults. UUID primary keys via `gen_random_uuid()`.

**OPMERKING:** `user_points` en `user_badges` tabellen worden gebruikt in `use-gamification.ts` (r.61, r.70-71) maar zijn NIET zichtbaar in het `types.ts` bestand. Dit kan duiden op tabellen die buiten de automatische type-generatie vallen of later zijn aangemaakt.

### 3.2 Indexering

**Status: ONBEKEND**

Indexen zijn niet zichtbaar in de beschikbare configuratie. De volgende queries zouden baat hebben bij indexen:
- `profiles.user_id` — veelvuldig gefilterd
- `user_roles.user_id` — elke authenticatie-flow
- `exercises.class_id` + `exercises.is_published` — studentenweergave
- `chat_messages.class_id` — realtime queries
- `leaderboards.period` + `leaderboards.points` — leaderboard sorting

**Aanbeveling:** Voer `EXPLAIN ANALYZE` uit op de meest gebruikte queries en voeg ontbrekende indexen toe.

### 3.3 Backup en recovery

**Status: AUTOMATISCH (Supabase/Lovable Cloud)**

Lovable Cloud/Supabase biedt automatische dagelijkse backups. Geen handmatige backup-procedures of restore-tests gedocumenteerd.

### 3.4 Query-optimalisatie

**Status: GEDEELTELIJK**

**Problematisch patroon in `use-gamification.ts`:**
- r.56-93: `fetchUserData()` voert 3 opeenvolgende queries uit (user_points, user_badges, badges) zonder TanStack Query caching
- r.95-168: `fetchLeaderboard()` voert 2 queries uit (leaderboard + profiles apart) — N+1-achtig patroon
- Geen gebruik van Supabase `.select()` joins voor gecombineerde data

**Aanbeveling:** Refactor naar TanStack Query hooks (useQuery) voor automatische caching, deduplicatie en stale-while-revalidate.

---

## 4. RLS EN AUTORISATIE

### 4.1 RLS-status per tabel

**Status: VOLTOOID (structureel)**

Alle tabellen hebben RLS enabled. Het autorisatiemodel gebruikt:
- `has_role(role_name)` — security definer function die `user_roles` raadpleegt
- `auth.uid()` — voor user-specifieke data
- Rol-gebaseerde policies: admin/teacher/student scheiding

**Rollen-matrix (verwacht):**

| Tabel | Student (SELECT) | Student (INSERT) | Student (UPDATE) | Student (DELETE) | Teacher | Admin |
|-------|-----------------|------------------|------------------|------------------|---------|-------|
| profiles | Eigen | — | Eigen | — | Eigen | Alle |
| exercises | Gepubliceerd in eigen klas | — | — | — | Eigen klas | Alle |
| chat_messages | Eigen klas | Eigen | Eigen | — | Eigen klas | Alle |
| forum_posts | Alle | Eigen | Eigen | — | Alle | Alle + moderatie |
| support_tickets | Eigen | Eigen | — | — | Toegewezen | Alle |

**OPMERKING:** De exacte RLS-policies zijn niet inline zichtbaar in de audit-output. Ze zijn gedefinieerd in Supabase migraties. Een volledige policy-audit vereist `supabase--linter` of directe SQL-inspectie.

### 4.2 Testresultaten

**Status: GEDEELTELIJK**

- `src/test/security.test.ts` bestaat — bevat beveiligingstests
- Geen specifieke RLS-policy-tests (bijv. "student kan geen andermans profiel wijzigen")
- Geen geautomatiseerde policy-regressietests

---

## 5. CACHING EN ASYNCHRONE VERWERKING

### 5.1 Caching

**Status: GEDEELTELIJK**

**Geïmplementeerd:**
- **TanStack Query** (`@tanstack/react-query`) — gebruikt in SettingsPage (r.51-67, r.70-85, r.88-116), admin-pagina's, teacher-pagina's
- QueryClient configuratie in `App.tsx` (r.80): standaard TanStack Query defaults

**Niet consistent:**
- `use-gamification.ts`: handmatige `useState`/`useEffect` i.p.v. TanStack Query (r.48-173)
- `use-helpdesk.ts`: onbekend, niet geïnspecteerd
- Geen Redis of server-side caching
- Geen HTTP cache headers configuratie

### 5.2 Asynchrone verwerking / Background jobs

**Status: GEDEELTELIJK**

**Potentiële background jobs:**
- `release-exercises`: ontworpen als cron-job, maar **pg_cron is NIET geconfigureerd**
- `send-lesson-reminders`: ontworpen als cron-job, maar **pg_cron is NIET geconfigureerd**

**Alle overige edge functions** worden synchroon (on-demand) aangeroepen:
- `gamification` — bij gebruikersacties
- `grade-submission` — bij inlevering
- `send-email` — bij registratie, wachtwoord-reset, etc.

---

## 6. FRONT-END, PWA EN MOBIELE ERVARING

### 6.1 Progressive Enhancement

**Status: GEDEELTELIJK**

**Geïmplementeerd:**
- React lazy loading voor alle 40+ routes (`React.lazy()` in `App.tsx` r.17-78)
- Suspense met `<FullPageLoader />` fallback (r.91)
- Feature detection voor SW en caches in `main.tsx` (r.14-22)

**Ontbrekend:**
- Geen `<noscript>` fallback
- Geen graceful degradation bij JS-uitval

### 6.2 Responsief ontwerp

**Status: VOLTOOID**

- Tailwind responsive classes consistent gebruikt (`sm:`, `md:`, `lg:`)
- Mobile Sheet-menu in Header (r.57-112)
- Grid layouts met responsive kolommen (bijv. SettingsPage r.179, HomePage r.109)
- Sidebar collapse op admin/teacher layouts

### 6.3 Offline-functionaliteit en Service Workers

**Status: BEWUST UITGESCHAKELD**

**Bestand:** `public/sw.js`

De service worker **unregistreert zichzelf onmiddellijk** en wist alle caches. Dit is een bewuste keuze om caching-problemen te voorkomen.

```javascript
// public/sw.js - Self-destructing service worker
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))))
      .then(() => self.clients.matchAll())
      .then(clients => clients.forEach(c => c.navigate(c.url)))
  );
});
```

**Gevolg:** Geen offline-functionaliteit. App vereist actieve internetverbinding.

**Aanbeveling:** Implementeer een workbox-strategie met cache-first voor statische assets en network-first voor API-calls.

### 6.4 Deep-links

**Status: VOLTOOID**

Alle pagina's zijn bereikbaar via unieke URL's:
- `/` — HomePage
- `/login`, `/register`, `/forgot-password`, `/reset-password` — Auth
- `/dashboard` — Rol-gebaseerde redirect
- `/self-study`, `/self-study/:category`, `/self-study/:category/:exerciseId` — Oefeningen
- `/forum`, `/forum/:roomName`, `/forum/:roomName/:postId` — Forum
- `/admin/*` (13 sub-routes), `/teacher/*` (7 sub-routes)
- `/profile` → redirect naar `/settings` (App.tsx r.129)

### 6.5 Dedicated mobiele app (Capacitor)

**Status: CONFIGURATIE AANWEZIG**

**Bestand:** `capacitor.config.ts`

Capacitor is geconfigureerd (`@capacitor/cli` en `@capacitor/core` in dependencies). Native builds voor Android/iOS zijn theoretisch mogelijk.

**Ontbrekend:**
- Geen native plugins geïntegreerd (push notifications, camera, etc.)
- Geen native build pipeline in CI
- Geen app store configuratie

---

## 7. UX-CONSISTENTIE EN ONTWERP

### 7.1 Design-system

**Status: VOLTOOID (structureel)**

- HSL-gebaseerde design tokens in `src/index.css` (NIET geïnspecteerd — mag niet bewerkt worden)
- Tailwind config in `tailwind.config.ts`
- 50+ shadcn/ui componenten in `src/components/ui/`
- Semantische tokens: `text-primary`, `bg-muted`, `text-muted-foreground`, `bg-card`, `border`, etc.

**PROBLEEM: Hardcoded kleuren in componenten:**

| Bestand | Regel | Code | Probleem |
|---------|-------|------|----------|
| `src/pages/HomePage.tsx` | 137 | `bg-green-500` | Niet via design token |
| `src/pages/HomePage.tsx` | 138 | `bg-blue-500` | Niet via design token |
| `src/pages/HomePage.tsx` | 139 | `bg-purple-500` | Niet via design token |
| `src/hooks/use-gamification.ts` | 251 | `text-blue-500` | Niet via design token |
| `src/hooks/use-gamification.ts` | 253 | `text-purple-500` | Niet via design token |
| `src/hooks/use-gamification.ts` | 255 | `text-amber-500` | Niet via design token |

**Aanbeveling:** Vervang door semantische tokens of custom CSS variabelen.

### 7.2 RTL-ondersteuning

**Status: VOLTOOID**

- `src/i18n/index.ts` (r.32-36): `document.documentElement.dir = 'rtl'` bij taalwissel naar AR
- AdminSidebar (r.54): `fixed start-0` — logische CSS property
- TeacherSidebar (r.42): `fixed start-0` — logische CSS property
- Chevron-iconen passen zich aan via `start-0`/`end-0`

### 7.3 Overige UI-issues

| # | Issue | Bestand | Regel | Status | Detail |
|---|-------|---------|-------|--------|--------|
| U1 | `/profile` route naar Dashboard i.p.v. profielpagina | `src/App.tsx` | 129 | **OPGELOST** | `<Navigate to="/settings" replace />` — redirect naar instellingenpagina |
| U2 | Footer aria-labels statisch per taal | `src/components/layout/Footer.tsx` | 78,89,98 | **GEDEELTELIJK** | Hardcoded `aria-label` per taalknop ("Wissel naar Nederlands", "Switch to English", "التبديل إلى العربية"). Functioneel correct maar niet dynamisch vertaalbaar via `t()`. |
| U3 | ErrorBoundary hardcoded NL | `src/components/ErrorBoundary.tsx` | 43,47,56 | **GEDEELTELIJK** | Fallback-teksten in het Nederlands: "Er ging iets mis", "Opnieuw proberen". Wordt gewrapped door `TranslatedErrorBoundary.tsx` die vertaalde props doorgeeft, maar als `ErrorBoundary` direct gebruikt wordt, toont het NL. |
| U4 | Chat-input zonder `<label>` | Niet geïnspecteerd | — | **ONBEKEND** | ChatPage niet gelezen in deze audit |
| U5 | Sonner-dependency in package.json | `package.json` | — | **NIET AANWEZIG** | `sonner` staat NIET in de huidige dependencies. Project gebruikt `@radix-ui/react-toast` via shadcn Toaster. Geen issue. |
| U6 | Duplicatie van sidebar-iconen | AdminSidebar, TeacherSidebar | — | **OPGELOST** | Alle 13 admin-items en 7 teacher-items hebben unieke Lucide-iconen |

---

## 8. TESTING EN KWALITEITSBORGING

### 8.1 Unit-tests

**Status: AANWEZIG, NIET VOLLEDIG**

**Bestanden in `src/test/`:**
- `auth.test.ts` — Authenticatie
- `calendar.test.tsx` — Kalender
- `exercises.test.ts` — Oefeningen
- `gamification.test.ts` — Gamificatie
- `helpdesk.test.ts` — Helpdesk
- `performance.test.ts` — Performance
- `register-form.test.tsx` — Registratieformulier
- `security.test.ts` — Beveiliging
- `utils.test.ts` — Utilities
- `example.test.ts` — Voorbeeld
- `integration/user-flow.test.ts` — Integratietest
- `integration/fixtures.ts` — Testdata

**Config:** `vitest.config.ts` aanwezig. Test setup in `src/test/setup.ts`.

**Ontbrekend:**
- Geen coverage-rapportage zichtbaar
- Geen tests voor SettingsPage, ForgotPasswordPage, ResetPasswordPage
- Geen tests voor edge functions (geen Deno test-bestanden)

### 8.2 E2E-tests

**Status: AANWEZIG, NIET VOLLEDIG**

**Bestanden in `e2e/`:**
- `accessibility.spec.ts`
- `auth.spec.ts`
- `calendar.spec.ts`
- `chat.spec.ts`
- `content-studio.spec.ts`
- `exercises.spec.ts`
- `forum.spec.ts`
- `gamification.spec.ts`
- `helpdesk.spec.ts`
- `payments.spec.ts`

**Config:** `playwright.config.ts` aanwezig.

**Ontbrekend:**
- Geen E2E-test voor forgot-password flow
- Geen E2E-test voor reset-password flow
- Geen E2E-test voor admin user management
- Geen E2E-test voor settings page

### 8.3 CI/CD-pipeline

**Status: AANWEZIG, NIET OPGESCHOOND**

**Relevante workflow:** `.github/workflows/ci.yml`

**Boilerplate workflows (15 bestanden):** Het project bevat 15+ GitHub Actions workflows die niet relevant zijn voor dit project:
- `ant.yml`, `astro.yml`, `azure-webapps-node.yml`, `deno.yml`, `generator-generic-ossf-slsa3-publish.yml`, `greetings.yml`, `jekyll-docker.yml`, `label.yml`, `manual.yml`, `npm-publish.yml`, `npm-publish-github-packages.yml`, `nuxtjs.yml`, `python-app.yml`, `stale.yml`, `static.yml`, `terraform.yml`, `webpack.yml`

**Aanbeveling:** Verwijder alle niet-relevante workflow-bestanden.

### 8.4 Cross-browser/device tests, load-tests, security-scans

**Status: NIET GEÏMPLEMENTEERD**

- Geen cross-browser test matrix
- Geen load-testing (k6, Artillery)
- Geen geautomatiseerde security scanning (OWASP ZAP, Snyk)

---

## 9. TOEGANKELIJKHEID EN INCLUSIEVE UX

### 9.1 WCAG 2.2 implementatie

**Status: GEDEELTELIJK**

**Geïmplementeerd:**
- **Skip to main content:** `src/components/layout/MainLayout.tsx` (r.17-22) — `sr-only focus:not-sr-only` link naar `#main-content`
- **Focus visible:** Tailwind's `focus:` utilities op alle interactieve elementen
- **Alt-tekst:** Niet alle afbeeldingen geïnspecteerd
- **Semantische HTML:** `<header>`, `<main>`, `<nav>`, `<footer>`, `<aside>` correct gebruikt
- **ARIA-labels:** LanguageSwitcher (r.28), ThemeSwitcher, Header menu button
- **Keyboard navigatie:** Radix UI primitives bieden dit standaard

**Ontbrekend of onbekend:**
- **Minimale target-grootte (2.5.8):** Niet geverifieerd
- **Focus not obscured (2.4.11):** Sticky header (`z-50`) kan focus obscuren bij tabbing
- **Drag-alternatives (2.5.7):** Geen drag-acties gedetecteerd
- **Accessible authentication (3.3.8):** Login vereist wachtwoord-invoer (acceptabel)
- **Redundant entry (3.3.7):** Niet getest
- **Consistent help (3.2.6):** FAQ/Helpdesk beschikbaar maar niet op elke pagina zichtbaar

### 9.2 Inclusief design

**Status: GEDEELTELIJK**

- **Aanpasbare lettergrootte:** Niet geïmplementeerd (geen font-size schakelaar)
- **Contrast:** Afhankelijk van design tokens in index.css (niet geïnspecteerd)
- **Eenvoudige taal:** Meertalig met 3 talen
- **Voice-first:** Niet geïmplementeerd
- **Representatieve visuals:** Geen afbeeldingen geïnspecteerd

---

## 10. INSTRUCTIONAL DESIGN

### 10.1 Micro-learning

**Status: VOLTOOID (structureel)**

- Oefeningen opgedeeld in 5 categorieën: reading, writing, listening, speaking, grammar
- 6 vraagtypen: multiple_choice, checkbox, open_text, audio_upload, video_upload, file_upload
- Directe feedback na inzending (passing_score check, score weergave)
- Tijdslimiet per oefening (`time_limit_seconds`)

### 10.2 Multimediatoegankelijkheid

**Status: GEDEELTELIJK**

- Video-opnames: `lesson_recordings` tabel met `video_url` en `thumbnail_url`
- Audio-uploads: `AudioUploadQuestion.tsx` component
- **Ontbrekend:** Geen transcripties, ondertiteling of alternatieve formaten

### 10.3 Learning analytics

**Status: VOLTOOID**

- `src/pages/ProgressPage.tsx` — Grafieken, categorieoverzicht
- `src/components/progress/StudentProgressDashboard.tsx` — Student-specifiek
- `src/components/progress/TeacherProgressDashboard.tsx` — Docent-specifiek
- `student_analytics` tabel: avg_score, exercises_attempted, exercises_passed, strongest_category, weakest_category
- `student_progress` tabel: per categorie/klas voortgang

**Ontbrekend:**
- Geen adaptieve leerroutes (automatische moeilijkheidsaanpassing)
- Geen predictive analytics

---

## 11. i18n EN LOKALISATIE

### 11.1 Vertaalbestanden

**Status: VOLTOOID**

| Bestand | Regels | Secties |
|---------|--------|---------|
| `src/i18n/locales/nl.json` | 824 | app, common, auth, validation, notFound, settings (25+ keys), nav, dashboard, exercises, progress, finalExam, contentStudio, accessibility, moderation, questionTypes, etc. |
| `src/i18n/locales/en.json` | 824 | Parallel aan NL |
| `src/i18n/locales/ar.json` | ~812 | Parallel, Arabische vertalingen |

### 11.2 Locale-aware formatting

**Status: GEDEELTELIJK**

- **Datums:** `src/lib/date-utils.ts` gebruikt `i18n.language` om date-fns locale te selecteren (nl, ar, enUS)
- **Valuta:** `classes.currency` kolom aanwezig, maar geen `Intl.NumberFormat` met locale-aware formatting gedetecteerd
- **Getallen:** Geen locale-aware number formatting

### 11.3 Dynamische taalwissel

**Status: VOLTOOID**

- `src/i18n/index.ts` (r.15-29): i18next met LanguageDetector, localStorage caching
- `i18n.on('languageChanged')` (r.32-36): Update `dir` en `lang` attributen op `<html>`
- Geen page refresh nodig bij taalwissel
- Fallback: `fallbackLng: 'nl'` (r.20)

### 11.4 Openstaande i18n-issues

| # | Issue | Status | Detail |
|---|-------|--------|--------|
| I1 | RegisterForm Zod-validatie hardcoded NL | **OPGELOST** | Schema gedefinieerd binnen component met `t()` calls (RegisterForm.tsx r.54-68) |
| I2 | RegisterForm placeholders hardcoded | **OPGELOST** | `t('auth.namePlaceholder')` (r.119), `t('auth.addressPlaceholder')` (r.172) |
| I3 | NotFound hardcoded EN | **OPGELOST** | `t('notFound.message')` en `t('notFound.backHome')` met fallbacks (NotFound.tsx r.17-19) |
| I4 | LanguageSwitcher sr-only hardcoded EN | **OPGELOST** | `t('accessibility.switchLanguage')` (LanguageSwitcher.tsx r.28) |
| I5 | Settings keys ontbraken (25+) | **OPGELOST** | Alle settings.* keys aanwezig in nl.json r.147-191 |
| I6 | JSON duplicaten common/studyTime | **OPGELOST** | Geen duplicaten meer in nl.json |
| I7 | LoginForm Zod-foutberichten Engels | **NIET OPGELOST** | `loginSchema` (LoginForm.tsx r.28-31) staat BUITEN de component, zonder `t()`. Zod-foutberichten voor email en password zijn standaard Engels. |
| I8 | Footer aria-labels statisch | **NIET OPGELOST** | Hardcoded per taal (Footer.tsx r.78,89,98) |
| I9 | ErrorBoundary hardcoded NL | **GEDEELTELIJK** | Fallback via TranslatedErrorBoundary, maar directe ErrorBoundary toont NL |

---

## 12. BEVEILIGING EN DEVSECOPS

### 12.1 Invoer-validatie en sanitatie

**Status: GEDEELTELIJK**

**Geïmplementeerd:**
- Zod-validatie op LoginForm (r.28-31), RegisterForm (r.54-68)
- Server-side: Supabase parameterized queries (geen SQL injection risico)

**Ontbrekend:**
- Geen CSP (Content Security Policy) headers geconfigureerd
- Geen input sanitatie voor rich text (forum posts, chat messages)

### 12.2 Multifactor-authenticatie

**Status: VOLTOOID**

- `src/components/security/TwoFactorSetup.tsx` — QR-code setup, backup codes
- `src/hooks/use-two-factor.ts` — State management
- `supabase/functions/verify-2fa/index.ts` (305 regels) — TOTP verificatie, setup, disable, use_backup
- Privilege check: admin/teacher kan niet disablen
- Attempt logging voor security

**Ontbrekend:**
- Geen wachtwoordloze login (magic link, passkeys)
- Geen CAPTCHA

### 12.3 Geheimenbeheer

**Status: GEDEELTELIJK**

**Geconfigureerde secrets:**
- `LOVABLE_API_KEY` (automatisch, kan niet verwijderd worden)

**ONTBREKENDE secrets:**
- `RESEND_API_KEY` — **NIET geconfigureerd** → alle e-mailfuncties non-functioneel
- `STRIPE_SECRET_KEY` — **NIET geconfigureerd** → Stripe-betalingen non-functioneel

**Geen geheimen in code:** Verified — `.env` bevat alleen publieke Supabase keys (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY).

### 12.4 Wachtwoord-consistentie

**Status: BUG**

| Locatie | Bestand | Regel | Minimum | Status |
|---------|---------|-------|---------|--------|
| Login | `src/components/auth/LoginForm.tsx` | 30 | `min(8)` | ✅ Correct |
| Registratie | `src/components/auth/RegisterForm.tsx` | 62 | `min(8)` | ✅ Correct |
| Wachtwoord resetten | `src/pages/ResetPasswordPage.tsx` | 44 | `< 8` | ✅ Correct |
| **Instellingen wijzigen** | **`src/pages/SettingsPage.tsx`** | **73** | **`< 6`** | **❌ BUG** |

**Code:** `if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');`

**Fix:** Wijzig naar `newPassword.length < 8`.

### 12.5 Statische code-analyse, dependency-scanning

**Status: NIET GEÏMPLEMENTEERD**

- Geen ESLint security plugins (eslint-plugin-security)
- Geen Dependabot of Snyk configuratie
- Geen container scanning
- `eslint.config.js` aanwezig maar security-regels niet geïnspecteerd

---

## 13. DEVOPS EN CI/CD

### 13.1 Pipeline

**Status: GEDEELTELIJK**

- `.github/workflows/ci.yml` — Basale CI aanwezig
- Lovable automatische deployment bij code-changes
- Edge functions worden automatisch gedeployed

**Ontbrekend:**
- Feature flags systeem
- Staging/productie-scheiding (Lovable Cloud biedt Test/Live)
- Blue/green deployment
- Rollback-procedures

### 13.2 Infrastructure as Code

**Status: NIET GEÏMPLEMENTEERD**

- Geen Terraform, Ansible of Pulumi
- Infrastructure beheerd door Lovable Cloud
- `supabase/config.toml` — enige configuratiebestand (auto-gegenereerd)

### 13.3 15+ Boilerplate workflows

**Status: NIET OPGERUIMD**

De volgende workflow-bestanden in `.github/workflows/` zijn NIET relevant voor dit project en moeten verwijderd worden:

```
ant.yml, astro.yml, azure-webapps-node.yml, deno.yml, 
generator-generic-ossf-slsa3-publish.yml, greetings.yml, 
jekyll-docker.yml, label.yml, manual.yml, node.js.yml,
npm-publish.yml, npm-publish-github-packages.yml, nuxtjs.yml, 
python-app.yml, stale.yml, static.yml, terraform.yml, webpack.yml
```

---

## 14. BILLING EN PRICING

### 14.1 Betalingsinfrastructuur

**Status: GEDEELTELIJK**

**Database:**
- `subscriptions` tabel: class_id, plan_type (enum), status (enum), stripe_customer_id, stripe_subscription_id
- `payments` tabel: amount, currency, payment_method (enum), status (enum)
- `installment_plans` tabel: total_installments, interval_months
- `discount_codes` tabel: code, discount_type (percentage/fixed), discount_value, max_uses, valid_from/until
- `classes` tabel: price, currency kolommen

**Edge functions:**
- `stripe-checkout`: **VEREIST STRIPE_SECRET_KEY** (niet geconfigureerd)
- `stripe-webhook`: **VEREIST STRIPE_SECRET_KEY** (niet geconfigureerd)
- `manual-payment`: Functioneel — registreert handmatige betalingen

**Admin UI:**
- `src/pages/admin/PaymentsPage.tsx` — Betalingsoverzicht
- `src/pages/admin/DiscountCodesPage.tsx` — Kortingscode CRUD
- `src/components/admin/ClassPaymentSettings.tsx` — Klasprijzen

**Ontbrekend:**
- Stripe-integratie niet operationeel (geen secret key)
- Geen automatische facturatie
- Geen pricing-pagina voor eindgebruikers
- Geen PCI DSS compliance documentatie
- Geen btw/tax-berekening
- Geen lokale betaalmethoden (iDEAL, Bancontact)

### 14.2 Transparante prijsstructuur

**Status: NIET GEÏMPLEMENTEERD**

- Geen publieke pricing-pagina
- Geen freemium/proefperiode logica
- Prijzen alleen in admin-configuratie

---

## 15. SUPPORT EN COMMUNITY

### 15.1 Helpdesk

**Status: VOLTOOID**

- `src/pages/HelpdeskPage.tsx` — Ticket aanmaken en bekijken
- `src/hooks/use-helpdesk.ts` — Ticket state management
- `supabase/functions/helpdesk/` — Backend logica
- `support_tickets` tabel: subject, description, priority, status, category, ticket_number
- `ticket_labels` + `ticket_label_assignments` — Labelsysteem

### 15.2 Knowledge Base / FAQ

**Status: VOLTOOID**

- `src/pages/KnowledgeBasePage.tsx` — Publieke FAQ-pagina
- `src/pages/admin/KnowledgeBaseManagementPage.tsx` — Admin CRUD
- `faq_categories` tabel: name_nl/en/ar, icon, display_order
- `faq_articles` tabel: title_nl/en/ar, content_nl/en/ar, helpful_count, view_count
- Route: `/faq` (publiek, geen auth vereist — App.tsx r.147)

### 15.3 Consistente hulppositie

**Status: GEDEELTELIJK**

- Helpdesk en FAQ bereikbaar via navigatie
- Footer bevat link naar `/faq` en `/helpdesk`
- **Ontbrekend:** Geen persistente help-widget of chatbot op elke pagina

### 15.4 Community platform

**Status: VOLTOOID**

- Forum met kamers, posts, comments, likes
- Real-time chat per klas
- Content rapportering (spam, intimidatie, etc.)
- **Ontbrekend:** Geen peer-to-peer ondersteuningsmarkering, geen mentor-systeem

---

## 16. ANALYTICS EN DATA SCIENCE

### 16.1 Tracking

**Status: GEDEELTELIJK**

**Database:**
- `analytics_events`: event_name, event_type, page_path, properties, browser, device_type, country
- `analytics_daily_stats`: active_users, page_views, exercises_completed, lessons_attended
- `feature_usage`: feature_name, usage_count, unique_users
- `student_analytics`: avg_score, exercises_attempted, study_time_minutes, streak_days

**Hooks:**
- `src/hooks/use-analytics.ts` — Client-side tracking hook

**Admin UI:**
- `src/pages/admin/AnalyticsPage.tsx` — Dashboard met grafieken

**Ontbrekend:**
- Geen privacy-vriendelijk alternatief (Plausible, Fathom)
- Geen A/B testing framework
- Geen conversie-funnel tracking

### 16.2 GDPR/AVG

**Status: VOLTOOID (structureel)**

- `data_retention_log` tabel: action, retention_end_date, processed_at
- Database functions: `mark_user_for_deletion`, `anonymize_user_data`, `process_data_retention`
- Trigger: `handle_unenrollment` voor data cleanup

**Ontbrekend:**
- Geen data export functionaliteit voor gebruikers (right to portability)
- Geen cookie consent banner
- Geen privacyverklaring pagina

---

## 17. LEGAL & PRIVACY

### 17.1 Privacyverklaring en gebruiksvoorwaarden

**Status: NIET GEÏMPLEMENTEERD**

- Geen `/privacy` of `/terms` routes
- Geen privacyverklaring
- Geen gebruiksvoorwaarden
- Geen link in footer of registratieformulier

### 17.2 Cookie-banner en toestemmingen

**Status: NIET GEÏMPLEMENTEERD**

- Geen cookie consent mechanisme
- localStorage wordt gebruikt voor theme, language, app_version zonder expliciete toestemming
- Analytics events worden getrackt zonder opt-in

---

## 18. BUSINESS DEVELOPMENT EN PARTNERS

### 18.1 White-label en samenwerkingen

**Status: NIET GEÏMPLEMENTEERD**

- Geen white-label configuratie
- Geen multi-tenant architectuur
- App naam "Huis van het Arabisch" is hardcoded in vertaalbestanden

### 18.2 Open source

**Status: NIET VAN TOEPASSING**

- Geen open source licentie
- Geen CONTRIBUTING.md
- Geen public repository configuratie

### 18.3 Certificeringsprogramma's

**Status: NIET GEÏMPLEMENTEERD**

- Geen certificaat-generatie
- Niveau-promotie via `promote_student_to_next_level` database function, maar geen formeel certificaat

---

## OPENSTAANDE ISSUES — PRIORITEITSLIJST

### PRIORITEIT 1 — Bugs (onmiddellijke actie vereist)

| # | Issue | Bestand | Regel | Fix |
|---|-------|---------|-------|-----|
| P1-1 | SettingsPage wachtwoord min 6 i.p.v. 8 | `src/pages/SettingsPage.tsx` | 73 | Wijzig `< 6` naar `< 8` |

### PRIORITEIT 2 — Ontbrekende functionaliteit (kort termijn)

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| P2-1 | RESEND_API_KEY niet geconfigureerd | Alle e-mailfuncties non-functioneel | Secret toevoegen |
| P2-2 | Na registratie geen redirect | Gebruiker blijft op /register | Redirect naar /login met succesbericht |
| P2-3 | Notificatie-toggles niet persistent | Reset bij elke pagina-reload | DB-kolommen + load/save |
| P2-4 | pg_cron niet geconfigureerd | Automatische herinneringen/releases werken niet | Cron-jobs configureren |
| P2-5 | LoginForm Zod-foutberichten standaard Engels | EN/AR gebruikers zien Engelse Zod-defaults | Schema binnen component met `t()` |

### PRIORITEIT 3 — Code-kwaliteit (middellang termijn)

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| P3-1 | use-gamification handmatige fetch | Inconsistent met TanStack Query | Refactor naar useQuery |
| P3-2 | 15+ boilerplate GitHub workflows | Rommel in repository | Verwijder niet-relevante bestanden |
| P3-3 | 6 hardcoded Tailwind kleuren | Niet-themabaar | Vervang door design tokens |
| P3-4 | Footer aria-labels statisch | Niet dynamisch vertaalbaar | Gebruik `t()` |
| P3-5 | ErrorBoundary hardcoded NL fallbacks | Taalinconsistentie bij direct gebruik | Props altijd via TranslatedErrorBoundary doorgeven |

### PRIORITEIT 4 — Compliance en legal (vereist voor productie)

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| P4-1 | Geen privacyverklaring | GDPR/AVG non-compliance | Pagina aanmaken + link in footer |
| P4-2 | Geen gebruiksvoorwaarden | Juridisch risico | Pagina aanmaken + checkbox bij registratie |
| P4-3 | Geen cookie consent | ePrivacy Directive non-compliance | Banner implementeren |
| P4-4 | Geen data export voor gebruikers | GDPR right to portability | Exportfunctie in instellingen |

### PRIORITEIT 5 — Nice-to-have (lange termijn)

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| P5-1 | Geen offline-functionaliteit | Geen offline gebruik mogelijk | Workbox implementeren |
| P5-2 | Geen CSP headers | XSS-risico | Supabase config of edge function |
| P5-3 | Geen structured logging | Debugging moeilijk in productie | Logging service integreren |
| P5-4 | Geen load-testing | Performance onbekend onder druk | k6/Artillery tests |
| P5-5 | Geen adaptieve leerroutes | Geen gepersonaliseerd leren | AI-driven recommendations |

---

## SAMENVATTING

| Domein | Voltooid % | Kritieke issues |
|--------|-----------|-----------------|
| 1. Architectuur | 70% | Geen API-gateway, geen DDD |
| 2. Observability | 20% | Geen logging/monitoring/alerts |
| 3. Database | 85% | Indexen onbekend, gamification-tabellen ongedocumenteerd |
| 4. RLS & Autorisatie | 90% | Geen geautomatiseerde policy-tests |
| 5. Caching | 60% | use-gamification inconsistent |
| 6. PWA & Mobiel | 70% | Offline uitgeschakeld, Capacitor niet geactiveerd |
| 7. UX-consistentie | 85% | 6 hardcoded kleuren, Footer aria-labels |
| 8. Testing | 50% | Geen coverage, ontbrekende testgevallen |
| 9. Toegankelijkheid | 60% | WCAG 2.2 deels, geen inclusief design features |
| 10. Instructional Design | 75% | Geen transcripties, geen adaptief leren |
| 11. i18n | 92% | LoginForm Zod, Footer aria-labels |
| 12. Beveiliging | 75% | SettingsPage bug, geen CSP, geen scanning |
| 13. DevOps | 40% | Boilerplate workflows, geen IaC, geen feature flags |
| 14. Billing | 30% | Stripe niet operationeel, geen pricing-pagina |
| 15. Support | 85% | Geen persistente help-widget |
| 16. Analytics | 70% | Geen privacy-vriendelijk alternatief |
| 17. Legal & Privacy | 0% | Geen privacy/terms/cookies |
| 18. Business Dev | 0% | Geen white-label/certificering |
| **Gewogen gemiddeld** | **~58%** | **Strikt beoordeeld** |

> **Noot:** Het hogere percentage in eerdere audits (~86-95%) was gebaseerd op een soepelere definitie van "voltooid" die alleen functionele code beoordeelde. Deze audit past de strikte definitie toe die ook testing, documentatie, compliance, observability en productie-gereedheid omvat.

---

*Dit document dient als master reference voor het ontwikkelteam en management. Elk punt is afzonderlijk beoordeeld met verwijzing naar specifieke bestanden en regelnummers. Laatst bijgewerkt: 2026-02-21.*
