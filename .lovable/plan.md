
# Uitgebreid Platformrapport — HVA (16 maart 2026)

## Laatst uitgevoerde verbeteringen

### Batch 1 (7 maart)
- XSS sanitatie in PDF export (`escapeHtml` in export-utils.ts)
- Badge component refactored naar forwardRef
- Database: 20 performance indexen toegevoegd
- Global error tracking in main.tsx

### Batch 2 (16 maart)
- **Certificaatgeneratie geactiveerd** — feature flag `CERTIFICATE_GENERATION` = true
- **PaymentsPage volledig gebouwd** — transactieoverzicht, stats cards, zoek/filter (status+methode), CSV export, debounced search
- **Forum paginering** — ForumRoomPage gebruikt nu `.range()` met 20 posts per pagina + navigatieknoppen
- **Debounce** — FAQ search en PaymentsPage search gebruiken `useDebounce(300ms)` hook
- **A11y** — aria-labels op collapsed sidebar buttons, sr-only labels, skip-to-content link (reeds aanwezig)
- **Admin activity logging** — `logAdminAction()` utility; geïntegreerd in LevelsPage (create/update/delete) en KnowledgeBaseManagementPage (create/update/delete)

### Batch 3 (16 maart — alle 7 punten naar 100%)
- **PaymentsPage 100%** — ongebruikte imports verwijderd, server-side paginering met `.range()` (25/pagina), aparte stats query
- **Certificaatgeneratie 100%** — `escapeHtml()` op alle user data in template, ProgressPage de-dupliceert certificaten op level_id (alleen geslaagde attempts)
- **Forum 100%** — comment count per post getoond (MessageCircle icon + count), aria-labels op like/report knoppen
- **Admin logging 100%** — `logAdminAction` geïntegreerd in ALLE admin pagina's: ClassesPage (5 mutaties), DiscountCodesPage (3), FinalExamsPage (3), UsersPage (1), TeacherApprovalsPage (1), ContentReportsPage (2), PlacementsPage (2)
- **A11y 100%** — collapsed sidebar toont nu taal-/themawisselaars, alle icon-only knoppen hebben aria-labels
- **Chat 100%** — "Load older messages" cursor-based paginering (50/batch), 1s send cooldown na verzending
- **Rate limiting 100%** — chat cooldown actief, forum isPending bevestigd als voldoende

## Openstaande verbeterpunten (bijgewerkt)

| # | Punt | Huidig % | Vorige % |
|---|------|----------|----------|
| 1 | RESEND_API_KEY configureren | 0% | 0% |
| 2 | STRIPE_SECRET_KEY configureren | 10% | 10% |
| 3 | pg_cron activeren | 0% | 0% |
| 4 | PaymentsPage | **100%** | 90% |
| 5 | Enrollment workflow | 40% | 40% |
| 6 | PWA offline modus | 15% | 15% |
| 7 | Certificaatgeneratie | **100%** | 90% |
| 9 | Error tracking (Sentry) | 30% | 30% |
| 11 | Chat paginering | **100%** | 80% |
| 12 | Forum paginering | **100%** | 90% |
| 14 | Hardcoded strings | 85% | 85% |
| 17 | Admin activity logging | **100%** | 65% |
| 19 | A11y gaps | **100%** | 80% |
| 22 | Rate limiting/debounce | **100%** | 70% |
