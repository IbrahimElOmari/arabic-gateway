
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

## Openstaande verbeterpunten (bijgewerkt)

| # | Punt | Huidig % | Vorige % |
|---|------|----------|----------|
| 1 | RESEND_API_KEY configureren | 0% | 0% |
| 2 | STRIPE_SECRET_KEY configureren | 10% | 10% |
| 3 | pg_cron activeren | 0% | 0% |
| 4 | PaymentsPage | **90%** | 20% |
| 5 | Enrollment workflow | 40% | 40% |
| 6 | PWA offline modus | 15% | 15% |
| 7 | Certificaatgeneratie | **90%** | 60% |
| 9 | Error tracking (Sentry) | 30% | 30% |
| 11 | Chat paginering | 80% | 75% |
| 12 | Forum paginering | **90%** | 70% |
| 14 | Hardcoded strings | 85% | 85% |
| 17 | Admin activity logging | **65%** | 40% |
| 19 | A11y gaps | **80%** | 70% |
| 22 | Rate limiting/debounce | **70%** | 40% |
