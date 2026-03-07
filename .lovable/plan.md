# Stand van Zaken — HVA Platform (7 maart 2026)

---

## 1. Huidige Status per Domein


| Domein                      | Status          | Toelichting                                                                                                                                                                |
| --------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Architectuur**            | 70%             | Monolithische SPA + Supabase BaaS. Functioneel maar geen formele domeinscheiding.                                                                                          |
| **Auth & Routing**          | 85%             | State machine met `roleStatus` (loading/ready/error), recovery UI bij fouten. Sidebar permanent zichtbaar. Werkt, maar er was recent een laadlus-probleem dat is gepatcht. |
| **Database (30+ tabellen)** | 85%             | Genormaliseerd, RLS op alle tabellen, `has_role()` security definer. Indexen niet geverifieerd.                                                                            |
| **i18n (NL/EN/AR + RTL)**   | 92%             | 3 vertaalbestanden, dynamische taalwissel, RTL-ondersteuning. Enkele hardcoded strings over.                                                                               |
| **Beveiliging**             | 80%             | 2FA, XSS-sanitatie, CSP (geen unsafe-eval), requireEnv() voor secrets, gamification endpoint nu beveiligd. Wachtwoord-minimum inconsistentie (6 vs 8) nog open.            |
| **Testing**                 | 55%             | 200 unit tests, 10 E2E specs, 60% coverage threshold. Geen RLS-policy tests, geen load tests.                                                                              |
| **Betalingen (Stripe)**     | 30%             | DB-schema compleet, edge functions bestaan, maar **STRIPE_SECRET_KEY niet geconfigureerd** → niet operationeel.                                                            |
| **E-mail**                  | 0% operationeel | Edge functions bestaan, maar **RESEND_API_KEY niet geconfigureerd** → alle e-mailfuncties dood.                                                                            |
| **Observability**           | 20%             | Geen structured logging, geen monitoring, geen alerting, geen error tracking (Sentry).                                                                                     |
| **PWA/Offline**             | 10%             | Service worker is self-destructing. Geen offline functionaliteit.                                                                                                          |
| **Analytics**               | 70%             | DB-tabellen en admin dashboard aanwezig. Geen privacy-vriendelijk alternatief.                                                                                             |
| **Legal/Privacy**           | 90%             | Privacy- en terms-pagina's bestaan. Cookie consent banner aanwezig. GDPR export functie met rate limiting.                                                                 |
| **Gamification**            | 90%             | Punten, badges, streaks, leaderboards. Endpoint nu beveiligd met JWT + autorisatie.                                                                                        |
| **Community**               | 95%             | Forum (kamers, posts, comments, likes), realtime chat, content rapportering.                                                                                               |
| **Helpdesk/FAQ**            | 95%             | Ticket systeem, knowledge base, admin CRUD, HelpWidget.                                                                                                                    |


### Console Warnings (live)

- `GamificationDashboard`: Badge component krijgt een ref maar is geen forwardRef → React warning.

### Security Scan Resultaten

- **Alle "error"-level findings zijn opgelost** (gamification endpoint beveiligd).
- Open "warn": HTML injection in PDF export (`export-utils.ts`) — niet gesaniteerd.
- Open "warn": Leaked password protection uitgeschakeld in auth config.

---

## 2. Kritieke Openstaande Issues


| #   | Issue                                              | Impact                                                                     | Ernst        |
| --- | -------------------------------------------------- | -------------------------------------------------------------------------- | ------------ |
| 1   | **RESEND_API_KEY ontbreekt**                       | Alle e-mail non-functioneel (verificatie, wachtwoord-reset, herinneringen) | Blokkerend   |
| 2   | **STRIPE_SECRET_KEY ontbreekt**                    | Betalingen volledig non-functioneel                                        | Blokkerend   |
| 3   | **Wachtwoord min 6 in SettingsPage** (moet 8 zijn) | Inconsistente beveiligingseis                                              | Bug          |
| 4   | **LoginForm Zod-schema buiten component**          | Foutmeldingen altijd Engels                                                | Bug          |
| 5   | **PDF export XSS**                                 | HTML-injectie mogelijk bij export                                          | Beveiliging  |
| 6   | **Geen error tracking (Sentry/LogRocket)**         | Productiefouten onzichtbaar                                                | Operationeel |
| 7   | **pg_cron niet geconfigureerd**                    | Automatische herinneringen en exercise release werken niet                 | Functioneel  |
| 8   | **Badge component ref warning**                    | Console vervuiling, potentieel geheugenlek                                 | Code quality |


---

## 3. Aanbevelingen voor Wereld-/Profniveau

### A. Onmiddellijk (blokkerend voor productie)

1. **Wachtwoord-minimum fixen**: SettingsPage `< 6` → `< 8`.
2. **LoginForm Zod i18n**: Schema naar binnen component verplaatsen met `t()` calls.
3. **PDF export sanitatie**: `escapeHtml()` toepassen op alle user data in `export-utils.ts`.
  &nbsp;

### B. Kort termijn (professionalisering)

6. **Error tracking integreren**: Sentry of vergelijkbaar. Zonder dit ben je blind in productie. Implementeer via een edge function + client-side `error-logger.ts` integratie.
7. **use-gamification refactoren naar TanStack Query**: Elimineert handmatige useState/useEffect, voegt caching en deduplicatie toe.
8. **Badge forwardRef fixen**: `GamificationDashboard` geeft ref aan Badge component die geen forwardRef is.
9. **Notificatie-voorkeuren persistent maken**: DB-kolommen toevoegen aan profiles, load/save in SettingsPage.
10. **Boilerplate GitHub workflows opruimen**: 15+ irrelevante workflow-bestanden verwijderen.

### C. Middellang termijn (schaalbaar & robuust)

11. **Structured logging**: JSON-formaat in edge functions (al deels via `_shared/logger.ts`), maar client-side logging naar een service routeren.
12. **Database indexen auditen**: `EXPLAIN ANALYZE` op veelgebruikte queries (profiles.user_id, exercises.class_id, chat_messages.class_id).
13. **Rate limiting op client-side API calls**: Debounce/throttle op veelgebruikte endpoints.
14. **Load testing**: k6 of Artillery voor kritieke paden (login, dashboard, exercise submit).
15. **Offline-first strategie**: Workbox met cache-first voor statische assets, network-first voor API.

### D. Lange termijn (wereld-niveau differentiators)

16. **Adaptieve leerroutes**: AI-driven moeilijkheidsaanpassing op basis van student_analytics data. Kan met Lovable AI (Gemini/GPT) zonder externe API key.
17. **Real-time collaboration**: Docent kan live mee-kijken met student-oefeningen.
18. **Certificaatgeneratie**: PDF-certificaten bij niveau-promotie (feature flag `CERTIFICATE_GENERATION` bestaat al).
19. **iDEAL/Bancontact**: Lokale betaalmethoden via Stripe voor NL/BE doelgroep.
20. **A/B testing framework**: Feature flags uitbreiden met percentage-based rollout en analytics-koppeling.

---

## Samenvatting

Het platform is functioneel compleet op ~80% van de features. De architectuur is solide (React + Supabase + RLS + i18n + gamification). De grootste gaten zijn **observability** (geen error tracking of monitoring). Los die op en je hebt een productieklaar platform. De lange-termijn aanbevelingen (adaptief leren, certificaten, lokale betaalmethoden) zijn wat het platform van "goed" naar "wereld-niveau" tillen.