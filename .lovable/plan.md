
Doel: definitief oplossen van 3 issues: (1) laadlus/rol-timeout op /dashboard, (2) fout dashboard voor admin/leerkracht, (3) sidebar die soms “verdwijnt”.

Diagnose (fundamentele root cause)
- Ja, ik weet nu wat het echte probleem is:
  1) `AuthContext` gebruikt een `async` callback in `supabase.auth.onAuthStateChange(...)` en doet daarin `await` op Supabase-calls (`rpc/get_user_role`, `profiles`). Dit is een bekende deadlock/lock-step valkuil in supabase-js; gevolg: role-call hangt en eindigt in timeout.
  2) `resolveUserData` koppelt profiel + rol via `Promise.all`, waardoor rol-routing onnodig blokkeert op profiel-fetch.
  3) In `App.tsx` zit `Suspense` om `AppLayout` heen, dus bij lazy-load fallback verdwijnt de sidebar tijdelijk.
  4) `DashboardPage` heeft nog een fallbackpad naar spinner als state onverwacht is, i.p.v. harde terminale states.

Uit te voeren oplossing (architecturaal, niet cosmetisch)
1) Auth-flow herontwerpen als strikte state machine (`src/contexts/AuthContext.tsx`)
- `onAuthStateChange` callback volledig synchroon maken (geen `async`, geen `await` binnen callback).
- Callback alleen laten doen: `setSession`, `setUser`, terminale auth-status.
- Nieuwe aparte effects:
  - effect A: role-resolutie op `user?.id` wijziging (met timeout + abort + latest-request-wins).
  - effect B: profiel-refresh los van rol-routing (profiel mag nooit dashboard-routing blokkeren).
- `roleStatus` blijft strikt: `loading | ready | error`; geen “hangende” tussenstatus.
- Bij token refresh: bestaande geldige rol behouden, stille background refresh, nooit resetten naar null tenzij expliciet sign-out.
- Bij timeout/fout: gegarandeerd naar `error` met herstelacties, nooit oneindig laden.

2) Dashboard-routing deterministisch maken (`src/pages/DashboardPage.tsx`)
- Expliciete uitkomsten:
  - niet ingelogd -> `/login`
  - role ready + admin -> `/admin`
  - role ready + teacher -> `/teacher`
  - role ready + student -> student dashboard
  - role error of ready+null -> herstelpaneel (retry + uitloggen)
- Geen generieke spinner-fallback meer buiten `roleStatus === loading`.

3) Guards correct scheiden (`src/components/auth/ProtectedRoute.tsx`)
- Auth-only routes (zonder role-eis) renderen zodra user bekend is.
- Role-gebonden routes wachten alleen op rolstatus.
- Bij `error` of `ready+null`: herstelpaneel i.p.v. spinner-lus.
- Redirect-logica uniformeren met gedeelde helper voor dashboard-doelpad.

4) Sidebar permanent zichtbaar maken (`src/App.tsx`, `src/components/layout/AppLayout.tsx`, `src/components/layout/AppSidebar.tsx`)
- `AppLayout` buiten `Suspense` plaatsen zodat sidebar altijd gemount blijft.
- `Suspense` alleen rond route-content (main area), met lokale content-loader.
- Sidebar-secties uitsluitend op opgeloste rol; tijdens role-loading minimale, stabiele navigatie.
- Dashboard-link in sidebar laten verwijzen naar rol-specifiek pad via centrale helper.

5) Regressiepreventie + harde validatie
- Unit/integration tests:
  - Auth state transitions incl. INITIAL_SESSION, TOKEN_REFRESHED, timeout -> error, retry -> ready.
  - `ProtectedRoute`: auth-only routes blokkeren niet op role.
  - `DashboardPage`: geen fallback-spinner bij ongeldige rolstate.
  - `AppLayout/AppSidebar`: sidebar blijft aanwezig tijdens lazy route transition.
- E2E (admin, teacher, student):
  - login -> `/dashboard` -> juiste bestemming.
  - refresh op `/dashboard` en op `/settings` zonder laadlus.
  - sidebar zichtbaar op `/`, `/dashboard`, `/admin`, `/teacher`, `/settings` tijdens navigatie.
  - assertion: geen spinner langer dan 5s zonder error/retry UI.

Acceptatiecriteria (garantie vóór oplevering)
- Geen pad meer waarbij `/dashboard` in laadlus blijft.
- Admin en leerkracht landen altijd op hun juiste dashboard.
- Sidebar blijft zichtbaar tijdens routewissels en lazy-loading.
- Bij backend/rol-fout: altijd gecontroleerde herstel-UI, nooit “hangen”.
