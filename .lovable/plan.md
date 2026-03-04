
Doel: dit fundamenteel oplossen zodat (1) de app nooit eindeloos blijft laden, (2) admin/leerkracht altijd naar juiste dashboard gaan, en (3) de sidebar nooit verdwijnt op eender welke pagina.

Wat ik heb vastgesteld (root cause)
- De data in backend is correct (rollen bestaan en zijn juist toegewezen: admin/teacher/student, geen users zonder rol).
- Het probleem zit frontend-side:
  1) `ProtectedRoute` blokkeert alle protected pagina’s op `role === null` (ook pagina’s die geen rol-check nodig hebben, zoals `/settings`) => oneindige spinner.
  2) `AuthContext` kan bij tijdelijke rol-fetch mislukking `role` terug op `null` zetten (o.a. bij refresh-events) => app valt terug in laadlus.
  3) `AppSidebar` toont student-sectie voor elke ingelogde user (`user && ...studentItems`) => foutieve navigatie/“verkeerd dashboard”-gevoel voor staff.

Implementatieplan (fundamenteel)
1) Auth state machine robuust maken (`src/contexts/AuthContext.tsx`)
- Rol ophalen via server-side functie `get_user_role` (RPC) met timeout + retry.
- `roleStatus` introduceren: `loading | ready | error`.
- Bij tijdelijke fetch-fout: bestaande geldige rol behouden (niet overschrijven met `null`).
- Bij `TOKEN_REFRESHED`: sessie updaten zonder rol hard te resetten.
- Expliciete `retryRoleResolution()` voorzien voor herstel.

2) Route-guard logisch corrigeren (`src/components/auth/ProtectedRoute.tsx`)
- Auth-only routes (zonder `requiredRole/allowedRoles`) mogen renderen zodra user ingelogd is, ook als rol nog unresolved is.
- Rol enkel verplichten op rolgebonden routes (admin/teacher).
- Voor rolgebonden routes: bounded loading + herstelpaneel (retry/sign-out), nooit oneindige spinner.

3) Dashboard strikt en deterministisch maken (`src/pages/DashboardPage.tsx`)
- `roleStatus=ready`:
  - admin -> `/admin`
  - teacher -> `/teacher`
  - student -> student dashboard
- `roleStatus=error` => herstel UI i.p.v. eindeloze loader.
- Geen fallback naar student-weergave voor staff.

4) Sidebar permanent + correct per rol (`src/components/layout/AppSidebar.tsx`, `src/components/layout/AppLayout.tsx`)
- Sidebar blijft altijd gemount via `AppLayout` (publiek + protected).
- Navigatiegroepen op basis van effectieve rol:
  - guest: public + auth links
  - student: student links
  - teacher: teacher links (optioneel student links expliciet, niet impliciet)
  - admin: admin + teacher links
- Geen automatische studentsectie bij `user && role null`.
- Dashboard-link dynamisch per rol (`/admin`, `/teacher`, `/dashboard`).

5) Regressiepreventie (tests)
- Nieuwe tests:
  - `ProtectedRoute`: auth-only route werkt bij `role=null`; rolroutes blokkeren correct.
  - `DashboardPage`: strikte redirect per rol.
  - `AppSidebar`: juiste menu’s per rol en geen “student-default” voor staff.
- E2E smoke:
  - admin/leerkracht login -> juiste dashboard.
  - `/settings` laadt zonder eindeloze spinner.
  - sidebar zichtbaar op publieke én protected routes.

Technische details
- Geen database-migratie nodig voor deze fix (rollen/policies staan correct).
- De kernfix is state-management + guard-architectuur, niet cosmetische timeout-tweaks.
- Security blijft intact: autorisatie blijft server-side afdwingbaar; client gebruikt rol enkel voor routing/UI.
