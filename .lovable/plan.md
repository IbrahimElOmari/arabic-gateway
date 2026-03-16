

# Uitgebreid Platformrapport — HVA (12 maart 2026)

---

## DEEL 1: ALLE ROUTES EN PAGINA'S

### Publieke Routes (geen login vereist)

| Route | Pagina | Status | Voltooiing |
|-------|--------|--------|------------|
| `/` | `HomePage` — Hero sectie, feature cards (6 categorieën), niveaus uitleg, CTA | Volledig werkend, redirect naar `/dashboard` als ingelogd | 95% |
| `/login` | `LoginPage` → `LoginForm` — Email/wachtwoord login, Zod validatie (min 8 chars), show/hide wachtwoord, redirect na succes | Werkend, schema binnen component met i18n | 95% |
| `/register` | `RegisterPage` → `RegisterForm` — Volledige naam, email, telefoon, adres, geboortedatum, studieniveau, wachtwoord+bevestiging, terms checkbox | Werkend, e-mail verificatie vereist | 95% |
| `/forgot-password` | `ForgotPasswordPage` — E-mail invoer voor wachtwoord reset link | UI werkend, **afhankelijk van RESEND_API_KEY** voor daadwerkelijke e-mail | 50% |
| `/reset-password` | `ResetPasswordPage` — Nieuw wachtwoord instellen via reset token | UI werkend, afhankelijk van e-mail functionaliteit | 50% |
| `/privacy` | `PrivacyPage` — Privacybeleid (statische content) | Werkend | 100% |
| `/terms` | `TermsPage` — Algemene voorwaarden (statische content) | Werkend | 100% |
| `/pricing` | `PricingPage` — Klassen tonen met prijs, BTW berekening, kortingscode validatie, inschrijf-knop | Werkend, leest uit `classes` tabel, kortingscode validatie actief | 90% |
| `/faq` | `KnowledgeBasePage` — FAQ categorieën, zoekfunctie, accordion artikelen, helpful/not-helpful voting, view count tracking | Werkend, meertalig (NL/EN/AR) | 95% |
| `/install` | `InstallPage` — PWA installatie instructies | UI werkend, PWA service worker is self-destructing | 40% |
| `*` (catch-all) | `NotFound` — 404 pagina | Werkend | 100% |

### Beschermde Routes — Student

| Route | Pagina | Functionaliteit | Voltooiing |
|-------|--------|----------------|------------|
| `/dashboard` | `DashboardPage` → `StudentDashboard` — Voortgangsoverzicht (%), oefeningen voltooid, streak, punten, aanbevolen oefening, quick actions | Werkend met TanStack Query, adaptieve aanbevelingen via `learning-recommendations.ts` | 90% |
| `/self-study` | `SelfStudyPage` — 5 oefencategorieën (lezen, schrijven, luisteren, spreken, grammatica) met voortgang per categorie | Werkend, haalt categorieën + student_progress op | 95% |
| `/self-study/:category` | `CategoryPage` — Oefeningenlijst per categorie, status badges (voltooid/bezig/vergrendeld), breadcrumbs, publicatie-aware | Werkend, tijdsgebaseerde vrijgave, RLS-beschermd | 90% |
| `/self-study/:category/:exerciseId` | `ExercisePage` (470 regels) — Volledige oefeninterface: multiple choice, checkbox, open tekst, audio/video/file upload, timer, voortgangsbalk, automatische beoordeling, handmatige submit | Werkend, 6 vraagtypen, attempt tracking, score berekening | 90% |
| `/final-exam/:examId` | `FinalExamPage` (476 regels) — Eindtoets interface, timer, automatische score berekening, resultaatscherm met confetti-achtige UI | Werkend, vragen geladen uit `final_exam_questions` | 85% |
| `/live-lessons` | `LiveLessonsPage` — Aankomende lessen tonen (gefilterd op ingeschreven klassen), Meet link, status badge | Werkend, enrollment-gefilterd voor studenten, staff ziet alles | 95% |
| `/recordings` | `RecordingsPage` — Lesopnames bekijken, transcript viewer (collapsible), video URL | Werkend, enrollment-gebaseerde RLS | 90% |
| `/forum` | `ForumPage` — Forum kamers overzicht, iconen, post counts, meertalige namen | Werkend, 4 voorgedefinieerde kamers | 95% |
| `/forum/:roomName` | `ForumRoomPage` (269 regels) — Posts in een kamer, nieuwe post aanmaken, likes, pin/lock status, content rapportering | Werkend, CRUD + moderation features | 90% |
| `/forum/:roomName/:postId` | `ForumPostPage` — Individuele post met comments, likes, rapportering | Werkend | 90% |
| `/chat` | `ChatPage` (362 regels) — Realtime klaschats, emoji reacties, per-klas kanalen, content rapportering | Werkend met realtime subscription, emoji picker, enrollment-gebaseerde filtering | 90% |
| `/calendar` | `CalendarPage` (486 regels) — Maandkalender, events CRUD (admin/teacher), event types (all/level/class/user), kleurcodering per type, attendees | Werkend, volledige CRUD voor staff, read-only voor studenten | 90% |
| `/progress` | `ProgressPage` (176 regels) — Voortgang per niveau/klas, certificaat generatie (feature flag: UIT), exercise attempts visualisatie | Werkend, certificaatgeneratie achter feature flag | 80% |
| `/gamification` | `GamificationPage` → `GamificationDashboard` (257 regels) — Punten, badges (earned + alle), leaderboards (weekly/monthly/all-time), streak tracking, rarity kleuren | Werkend via TanStack Query + `use-gamification` hook | 90% |
| `/helpdesk` | `HelpdeskPage` (447 regels) — Ticket aanmaken (6 categorieën), ticket lijst, detail view met responses, prioriteit/status filters, staff tools | Werkend, ticketnummer generatie, interne notities voor staff | 95% |
| `/settings` | `SettingsPage` (454 regels) — 4 tabs: Profiel (naam/telefoon/adres/avatar upload), Beveiliging (wachtwoord wijzigen + 2FA setup), Notificaties (3 toggles persistent), Weergave (light/dark/system, professional/playful stijl, lettergrootte) | Werkend, alle wijzigingen persistent via Supabase | 95% |
| `/profile` | Redirect → `/settings` | Werkend | 100% |

### Beschermde Routes — Leerkracht (role: teacher of admin)

| Route | Pagina | Functionaliteit | Voltooiing |
|-------|--------|----------------|------------|
| `/teacher` | `TeacherDashboard` — Stats (studenten, klassen, pending reviews, opnames), aankomende lessen, quick actions | Werkend, data gefilterd op teacher's klassen | 90% |
| `/teacher/content-studio` | `ContentStudioPage` (303 regels) — Centraal contentbeheer: klassenselectie, tabs voor zelfstudie/lessen/opnames/oefeningen/toetsen/planning | Werkend, klassenselectie vereist, admin ziet alle klassen | 85% |
| `/teacher/lessons` | `TeacherLessonsPage` (317 regels) — Lessen CRUD: aanmaken, bewerken, verwijderen, Meet link, klas toewijzen, planning | Werkend, volledig CRUD | 90% |
| `/teacher/recordings` | `TeacherRecordingsPage` (269 regels) — Video upload naar Supabase Storage, les koppeling, transcript invoer, voortgangsbalk upload | Werkend, file upload + metadata opslag | 85% |
| `/teacher/exercises` | `TeacherExercisesPage` (418 regels) — Oefeningen CRUD, ExerciseBuilder component, publiceren/depubliceren, vrijgave instellingen, categorie/klas toewijzing | Werkend, volledig CRUD + release scheduling | 90% |
| `/teacher/materials` | `TeacherMaterialsPage` (318 regels) — Lesmateriaal upload (PDF, video, documenten), les/opname koppeling, CRUD | Werkend, file upload + metadata | 85% |
| `/teacher/submissions` | `TeacherSubmissionsPage` (339 regels) — Ingediende antwoorden bekijken, feedback geven, score toekennen, approve/reject, tabs pending/reviewed | Werkend, volledige review workflow | 90% |

### Beschermde Routes — Admin (role: admin)

| Route | Pagina | Functionaliteit | Voltooiing |
|-------|--------|----------------|------------|
| `/admin` | `AdminDashboard` — Stats (gebruikers, klassen, inschrijvingen, pending teachers), recente activiteit log, Stripe status indicator | Werkend, realtime stats | 90% |
| `/admin/users` | `UsersPage` (356 regels) — Gebruikerslijst met zoeken, rol wijzigen, klas inschrijven, gebruiker details dialog | Werkend, rol wijziging via `user_roles` tabel | 90% |
| `/admin/teachers` | `TeacherApprovalsPage` (378 regels) — Leerkracht aanvragen beoordelen: goedkeuren/afwijzen, kwalificaties bekijken, review notities | Werkend, status transitions (pending→approved/rejected) | 95% |
| `/admin/classes` | `ClassesPage` (795 regels) — Klassen CRUD, niveau/leerkracht toewijzing, inschrijvingsbeheer, betalingsinstellingen per klas, studentenlijst | Werkend, meest complexe admin pagina, tabs voor details/studenten/betaling | 90% |
| `/admin/levels` | `LevelsPage` (405 regels) — Niveaus CRUD (NL/EN/AR namen), sorteervolgorde, beschrijving | Werkend, meertalig CRUD | 95% |
| `/admin/payments` | `PaymentsPage` (91 regels) — Placeholder pagina, toont "Stripe Not Configured" melding | **Niet operationeel** — wacht op STRIPE_SECRET_KEY | 20% |
| `/admin/discounts` | `DiscountCodesPage` (404 regels) — Kortingscodes CRUD: code, type (percentage/fixed), waarde, geldigheid, max uses, klas koppeling | Werkend, volledig CRUD | 90% |
| `/admin/placements` | `PlacementsPage` (570 regels) — Intakegesprekken beheren: plannen, Meet link, status transitions, niveau toewijzen, notities | Werkend, volledige workflow (pending→scheduled→completed) | 90% |
| `/admin/analytics` | `AnalyticsPage` (445 regels) — Dashboard met Recharts: dagelijkse stats, area/bar/pie charts, gebruikersactiviteit, content engagement, device stats | Werkend, leest uit `analytics_daily_stats` en `analytics_events` | 85% |
| `/admin/faq` | `KnowledgeBaseManagementPage` (360 regels) — FAQ categorieën + artikelen CRUD, meertalig (NL/EN/AR), publicatie toggle, sorteervolgorde | Werkend, volledig CRUD | 90% |
| `/admin/reports` | `ContentReportsPage` (383 regels) — Gerapporteerde content beoordelen: forum posts, chat berichten, status/actie toekennen | Werkend, moderatie workflow | 90% |
| `/admin/invitations` | `AdminInvitationsPage` (270 regels) — Uitnodigingen versturen per e-mail, rol toewijzen, klas koppelen, status tracking | UI werkend, **e-mail verzending afhankelijk van RESEND_API_KEY** | 50% |
| `/admin/final-exams` | `FinalExamsPage` (428 regels) — Eindtoetsen CRUD: vragen toevoegen (MC, open), punten, tijdslimiet, activeren/deactiveren, niveau koppeling | Werkend, volledig CRUD + vraagbeheer | 90% |

---

## DEEL 2: BACKEND FUNCTIES (Edge Functions)

| Edge Function | Functionaliteit | Status | Voltooiing |
|---------------|----------------|--------|------------|
| `health` | Database health check (leest `levels` tabel) | Werkend | 100% |
| `analytics` | Event tracking (page views, client errors) | Werkend | 90% |
| `gamification` | Punten toekennen, badges checken, streak updaten — JWT + autorisatie beveiligd | Werkend, recent beveiligd | 95% |
| `grade-submission` | Automatische beoordeling van ingediende oefeningen | Werkend | 85% |
| `helpdesk` | Ticket operaties (CRUD, responses, statuswijzigingen) | Werkend | 90% |
| `export-user-data` | GDPR data export (profiel + oefeningen + voortgang als JSON) | Werkend, rate limited | 90% |
| `verify-2fa` | TOTP verificatie voor 2FA login | Werkend | 90% |
| `complete-placement` | Plaatsingstoets afronden + niveau toewijzen | Werkend | 85% |
| `schedule-placement` | Plaatsingstoets inplannen + Meet link genereren | Werkend | 85% |
| `release-exercises` | Tijdgestuurde oefening vrijgave | Werkend, **vereist pg_cron voor automatisering** | 60% |
| `send-lesson-reminders` | Herinneringsmails voor aankomende lessen | **Niet operationeel** — vereist RESEND_API_KEY + pg_cron | 20% |
| `send-email` | Generieke e-mail verzending via Resend | **Niet operationeel** — vereist RESEND_API_KEY | 20% |
| `manual-payment` | Handmatige betalingsregistratie door admin | Werkend (admin-only) | 80% |
| `stripe-checkout` | Stripe checkout sessie aanmaken | **Niet operationeel** — vereist STRIPE_SECRET_KEY | 10% |
| `stripe-webhook` | Stripe webhook verwerking | **Niet operationeel** — vereist STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET | 10% |

---

## DEEL 3: INFRASTRUCTUUR & CROSS-CUTTING CONCERNS

| Onderdeel | Status | Voltooiing |
|-----------|--------|------------|
| **Authenticatie** — State machine (loading/ready/error), synchrone `onAuthStateChange`, 5s timeout, retry + sign-out recovery UI | Werkend, recent gepatcht | 90% |
| **Autorisatie** — `ProtectedRoute` met `requiredRole` en `allowedRoles`, `has_role()` SECURITY DEFINER functie, RLS op alle 30+ tabellen | Werkend | 90% |
| **Sidebar** — Permanent gemount (buiten Suspense), rol-gebaseerde navigatie, collapsed/expanded, dynamische dashboard link | Werkend, recent gepatcht | 95% |
| **i18n** — NL/EN/AR vertalingen, RTL ondersteuning, taalwissel in sidebar, profiel voorkeurstaal | Werkend, enkele hardcoded strings over | 92% |
| **Theming** — Light/dark/system, professional/playful stijl, lettergrootte (small/medium/large), persistent in profiel | Werkend | 95% |
| **Error Handling** — `TranslatedErrorBoundary` op root + admin outlet, `logError` utility, global error/unhandledrejection handlers | Werkend | 85% |
| **Cookie Consent** — Banner met accept/decline, analytics consent check vóór tracking | Werkend | 90% |
| **Help Widget** — Floating help knop, verwijst naar helpdesk/FAQ | Werkend | 90% |
| **Database Indexen** — 20 indexen op veelgebruikte kolommen (recent toegevoegd) | Werkend | 95% |
| **XSS Sanitatie** — DOMPurify voor user content, `escapeHtml` in PDF export (recent gepatcht) | Werkend | 90% |
| **2FA** — TOTP setup via QR code, backup codes, enable/disable, verificatie via edge function | Werkend | 90% |
| **GDPR** — Data export, cookie consent, privacy pagina, `users_pending_deletion` tabel, `data_retention_log` | Deels werkend, automatische cleanup vereist pg_cron | 75% |
| **PWA** — Manifest aanwezig, service worker is self-destructing (geen offline support) | Niet functioneel | 15% |
| **Testing** — 200+ unit tests in 29 bestanden, 10 E2E specs, >=60% coverage | Werkend maar geen RLS/load tests | 60% |
| **CI/CD** — GitHub Actions workflow (`ci.yml`) | Werkend | 80% |

---

## DEEL 4: VERBETERPUNTEN

### Kritiek (blokkerend voor productie)

| # | Punt | Impact | Huidig % | Doel % |
|---|------|--------|----------|--------|
| 1 | **RESEND_API_KEY configureren** | E-mail verificatie, wachtwoord reset, uitnodigingen, lesherinneringen — allemaal dood | 0% | 100% |
| 2 | **STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET configureren** | Betalingen volledig non-functioneel, pricing pagina toont klassen maar checkout faalt | 10% | 100% |
| 3 | **pg_cron activeren** | `release-exercises` en `send-lesson-reminders` edge functions bestaan maar worden nooit automatisch getriggerd | 0% | 100% |

### Hoog (functionele gaten)

| # | Punt | Impact | Huidig % | Doel % |
|---|------|--------|----------|--------|
| 4 | **Betalingspagina inhoudelijk vullen** | `/admin/payments` is nu een placeholder van 91 regels — geen transactieoverzicht, geen filters, geen export | 20% | 90% |
| 5 | **Enrollment workflow ontbreekt** | Studenten kunnen niet zelf inschrijven voor klassen vanuit de pricing pagina — alleen admin kan handmatig inschrijven | 40% | 90% |
| 6 | **PWA offline modus** | Service worker is self-destructing (`public/sw.js`), geen cache strategie, geen offline fallback | 15% | 80% |
| 7 | **Certificaatgeneratie activeren** | Feature flag `CERTIFICATE_GENERATION` staat op `false`, logica bestaat in `certificate-utils.ts` maar is niet benaderbaar | 60% | 90% |
| 8 | **Adaptieve leerroutes** | `learning-recommendations.ts` biedt basisaanbevelingen maar geen echte AI-driven personalisatie op basis van `student_analytics` | 40% | 80% |

### Medium (kwaliteit & betrouwbaarheid)

| # | Punt | Impact | Huidig % | Doel % |
|---|------|--------|----------|--------|
| 9 | **Error tracking (Sentry/observability)** | `logError` stuurt naar analytics edge function, maar geen dedicated error monitoring service, geen alerting, geen dashboards | 30% | 90% |
| 10 | **Content Studio onvolledig** | ContentStudioPage toont tabs maar sommige secties (planning, themes) zijn links naar andere pagina's i.p.v. inline functionaliteit | 70% | 90% |
| 11 | **Realtime chat performance** | ChatPage laadt alle berichten zonder paginering, bij groeiende chat history wordt dit langzaam | 75% | 95% |
| 12 | **Forum paginering ontbreekt** | `ForumPage` haalt alle posts op via `select("room_id")` zonder limit — kan de 1000-row Supabase limiet raken | 70% | 90% |
| 13 | **Leerkracht aanvraag flow incompleet** | Student kan zich aanmelden als leerkracht maar er is geen frontend pagina/formulier voor het indienen van een aanvraag | 60% | 90% |
| 14 | **Hardcoded strings** | Enkele componenten hebben hardcoded NL/EN fallbacks die niet via i18n gaan (bijv. "Recordings", "Chat", "Gamification" in sidebar) | 85% | 98% |
| 15 | **Mobile responsiveness audit** | Sidebar is fixed 64/16 width — op kleine schermen (<768px) geen hamburger menu, sidebar kan content overlappen | 70% | 95% |

### Laag (polish & optimalisatie)

| # | Punt | Impact | Huidig % | Doel % |
|---|------|--------|----------|--------|
| 16 | **Leaked password protection** | Auth config `enable_leaked_password_protection` staat uit — niet programmatisch in te schakelen, vereist handmatige actie | 0% | 100% |
| 17 | **Admin activity logging coverage** | `admin_activity_log` tabel bestaat maar niet alle admin acties worden gelogd (bijv. niveau CRUD, FAQ CRUD loggen niet) | 40% | 80% |
| 18 | **Recharts bundle size** | Recharts is een zware dependency (alleen gebruikt op `/admin/analytics`), kan lazy-loaded worden | 80% | 95% |
| 19 | **Accessibility (a11y) gaps** | Geen skip-to-content link, focus management bij modale dialogen inconsistent, aria-labels ontbreken op icon-only buttons in collapsed sidebar | 70% | 90% |
| 20 | **File upload validatie** | Avatar, recording, en material uploads valideren bestandstype via `accept` attribute maar niet server-side (grootte/type) | 60% | 85% |
| 21 | **E2E tests voor admin flow** | E2E specs bestaan voor auth/calendar/chat/exercises/forum/gamification maar niet specifiek voor admin CRUD operaties | 50% | 80% |
| 22 | **Rate limiting op client-side** | Geen debounce/throttle op forum search, FAQ search, of chat berichten — gebruiker kan snel achter elkaar requests sturen | 40% | 80% |

---

## SAMENVATTING PER GEBRUIKERSROL

### Gast (niet ingelogd)
- **Werkend**: Homepage, login, registratie, FAQ, pricing, privacy/terms, 404
- **Deels werkend**: Wachtwoord reset (UI ja, e-mail nee)
- **Totaal**: 85%

### Student
- **Werkend**: Dashboard met aanbevelingen, zelfstudie (5 categorieën, 6 vraagtypen), live lessen, opnames, forum (kamers/posts/comments/likes/rapportering), chat (realtime, emoji's), kalender, voortgang, gamification (punten/badges/leaderboards/streaks), helpdesk (tickets+responses), instellingen (profiel/2FA/notificaties/thema), GDPR export
- **Deels werkend**: Eindtoets (UI compleet, auto-grading deels), zelf-enrollment (niet beschikbaar), certificaten (feature flag uit)
- **Totaal**: 88%

### Leerkracht
- **Werkend**: Eigen dashboard, lessen CRUD, opnames upload, oefeningen CRUD met release scheduling, materialen upload, submissions review met feedback
- **Deels werkend**: Content Studio (hub pagina, sommige secties zijn doorlinks), thema beheer
- **Totaal**: 87%

### Admin
- **Werkend**: Dashboard met stats, gebruikersbeheer (rol wijzigen, klas inschrijven), leerkracht goedkeuringen, klassen CRUD (795 regels, meest complete pagina), niveaus CRUD, plaatsingen workflow, kortingscodes CRUD, FAQ beheer, content rapportages, eindtoetsen CRUD, analytics dashboard (Recharts)
- **Deels werkend**: Betalingen (placeholder), uitnodigingen (UI ja, e-mail nee)
- **Totaal**: 83%

### Platform-breed gemiddelde: **~86%**

