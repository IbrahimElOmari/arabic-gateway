

# Plan: Eindrapport bijwerken en valideren

## Wat er moet gebeuren

### 1. `docs/final-report.md` bijwerken (regels 71-81)

Voeg na de bestaande R1-R3 tabel vier nieuwe rijen toe (R4-R7) in de "Post-Blueprint Refinements" sectie:

| # | Refinement | Status | Key Files |
|---|-----------|--------|-----------|
| R4 | OFFLINE_MODE feature flag geïmplementeerd met OfflineBanner component | ✅ | `src/components/OfflineBanner.tsx`, `src/components/layout/MainLayout.tsx`, `src/test/offline-banner.test.tsx` (3 tests) |
| R5 | Self-study route gerepareerd: `/self-study/all/` vervangen door `/self-study/${category_name}/` | ✅ | `src/pages/StudentDashboard.tsx`, `src/lib/learning-recommendations.ts`, `src/test/recommendations-route.test.ts` (4 tests) |
| R6 | Helpdesk-link in footer verborgen voor niet-ingelogde gebruikers | ✅ | `src/components/layout/Footer.tsx` (conditioneel op `useAuth().user`) |
| R7 | Feature-flag tests en route-validatietests toegevoegd | ✅ | `src/test/offline-banner.test.tsx`, `src/test/recommendations-route.test.ts` (7 tests totaal) |

Update de Conclusion-sectie met het nieuwe totaal (40 taken + 7 refinements). Update de test-telling in de header (was 27 files/193 tests, wordt 29 files/204 tests — exacte telling te bevestigen bij implementatie).

### 2. Testsuite draaien

Run de volledige testsuite om het exacte aantal bestanden en tests te bevestigen en te verifiëren dat alles slaagt.

### 3. Git commit/push

Lovable pusht automatisch naar GitHub bij elke wijziging. Er is geen handmatige actie nodig — de wijzigingen aan `docs/final-report.md` worden automatisch gesynchroniseerd naar de hoofdbranch.

