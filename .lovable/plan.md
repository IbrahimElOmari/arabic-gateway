
Doel: de laadlus definitief elimineren, rol-routing deterministisch maken, en sidebar permanent zichtbaar houden op alle pagina’s.

1) Echte onderliggende oorzaak (fundamenteel)
- De huidige auth-flow laat ongeldige toestanden toe:
  - `user !== null` terwijl `roleStatus` op `idle` of eindeloos `loading` blijft.
- In `AuthContext` zit een race/stale-closure probleem:
  - `onAuthStateChange`-callback gebruikt verouderde closure (effect met lege deps + disabled lint).
  - safety-timeout kijkt naar oude `roleStatus` en zet niet betrouwbaar naar `error`.
  - `TOKEN_REFRESHED` met `preserveExistingRole=true` kan `roleStatus` in `idle` laten hangen als rol nog niet eerder resolved was.
- `DashboardPage` heeft nog een “onmogelijke fallback” spinner (bij `roleStatus='idle'`), waardoor de app visueel blijft laden.
- De quick-fix in `ClassContext` (`try/catch` rond `useAuth`) maskeert contextfouten i.p.v. architecturaal op te lossen.

2) Oplossingsontwerp (definitief)
A. Auth als strikte state machine (src/contexts/AuthContext.tsx)
- Vervang losse states door expliciete flow:
  - `booting -> unauthenticated | authenticated(role_loading) -> authenticated(role_ready) | authenticated(role_error)`.
- Verwijder safety-timeout met stale closure; vervang door per-request timeout + `finally` die altijd terminal state zet.
- Maak rolresolutie cancelable/idempotent (latest-request-wins) met monotone request-id + hard timeout (bv. 3s).
- Zorg dat bij ingelogde gebruiker `roleStatus` nooit op `idle` blijft.
- `TOKEN_REFRESHED`:
  - als rol al bekend: behoud rol + stille refresh;
  - als rol onbekend: forceer role-resolution met timeout.
- Verwijder automatische error->retry-loop; alleen expliciete retry via knop.

B. Guard- en dashboardgedrag hard maken
- `ProtectedRoute`:
  - auth-only routes: render zodra sessie bekend is;
  - role-routes: alleen `loading` met bounded duur; daarna `error`-herstelpaneel.
- `DashboardPage`:
  - geen generieke fallback-spinner meer;
  - alleen 4 uitkomsten: login redirect / admin redirect / teacher redirect / student dashboard / error-herstel.
  - `idle` wordt behandeld als bug-state => direct retry-trigger of error-view.

C. ClassContext structureel corrigeren (src/contexts/ClassContext.tsx)
- Verwijder `try/catch` rond `useAuth` (geen masking).
- Gebruik consistente import van AuthContext via alias (`@/contexts/AuthContext`) om module-identiteit/HMR-dubbeling te vermijden.
- Fail-fast alleen in echte provider-misconfiguratie; niet stilzwijgend degraderen.

D. Sidebar permanent en stabiel houden
- `AppLayout` blijft globale wrapper voor alle routes.
- `AppSidebar` blijft altijd gemount; bij rol-onzekerheid toont basisnavigatie + account-links i.p.v. lege/verdwijnende staat.
- Dashboard-link blijft rol-afhankelijk maar alleen na role-ready.

3) Testplan (tot bewezen stabiel)
A. Unit/integration
- AuthContext scenario-matrix:
  1) INITIAL_SESSION -> role success
  2) TOKEN_REFRESHED eerst -> role success
  3) role timeout -> `role_error` (geen infinite loading)
  4) retry vanuit error -> ready
- ProtectedRoute tests:
  - auth-only route werkt zonder rol
  - role-route toont error-paneel na timeout, geen spinner-lus
- Dashboard tests:
  - admin/teacher/student redirect exact
  - geen fallback-spinner op `idle`

B. E2E smoke (Playwright)
- Admin login: Home -> /dashboard -> /admin binnen bounded tijd.
- Teacher login: Home -> /dashboard -> /teacher binnen bounded tijd.
- Student login: /dashboard toont student dashboard.
- `/settings` opent zonder laadlus.
- Sidebar zichtbaar op: `/`, `/login`, `/dashboard`, `/admin`, `/teacher`, `/settings`.

C. Acceptatiecriteria (hard)
- Geen pad waar spinner > 5s zonder error/retry UI.
- Geen toestand `user && roleStatus=idle` na boot.
- Geen automatische redirect-lussen.
- Sidebar DOM-element aanwezig op alle routes.

Technische details
- Geen databasewijzigingen nodig; issue zit in frontend auth-orchestratie.
- Fix focust op state-machine-correctheid, event-order robuustheid, en expliciete terminal states (niet op tijdelijke patches).
- De huidige `ClassContext`-patch wordt verwijderd omdat die symptomen maskeert en root-cause debugging verhindert.
