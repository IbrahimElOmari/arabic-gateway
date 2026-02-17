
# Grootschalig Verbeterplan: Structurele Fixes & Kwaliteitsborging

Dit plan pakt de genoemde tekortkomingen systematisch aan in 8 werkpakketten.

---

## Werkpakket 1: Toast-systeem unificeren

Het project heeft twee toast-systemen actief: shadcn `<Toaster>` (gebruikt door 30+ bestanden) en Sonner `<Sonner>` (nergens daadwerkelijk aangeroepen via `toast()` uit sonner). Sonner is puur overhead.

**Aanpak:**
- Verwijder `<Sonner />` uit `App.tsx`
- Verwijder `src/components/ui/sonner.tsx`
- Behoud het shadcn toast-systeem (`@/hooks/use-toast`) dat overal gebruikt wordt
- Sonner dependency blijft in `package.json` (geen build-breuk; wordt gewoon niet geladen)

---

## Werkpakket 2: RTL-ondersteuning voor Admin/Teacher Sidebars

De sidebars gebruiken hardcoded `left-0` en `ml-16`/`ml-64`. In RTL (Arabisch) moeten deze gespiegeld worden.

**Aanpak:**
- `AdminSidebar.tsx`: Vervang `left-0` door `start-0` (Tailwind logische property)
- `AdminLayout.tsx`: Vervang `ml-16`/`ml-64` door `ms-16`/`ms-64` (margin-inline-start)
- `TeacherSidebar.tsx`: Zelfde wijziging als AdminSidebar
- `TeacherLayout.tsx`: Zelfde wijziging als AdminLayout

---

## Werkpakket 3: Hardcoded strings vervangen door i18n-keys

**Bestanden en strings:**
- `AdminLayout.tsx` regel 51: `"Rol kon niet geladen worden."` wordt `t('auth.roleLoadFailed', 'Rol kon niet geladen worden.')`
- `AdminLayout.tsx` regel 53: `"Opnieuw proberen"` wordt `t('common.retry', 'Opnieuw proberen')`
- `TeacherLayout.tsx` regel 48-49: Identieke hardcoded strings, zelfde fix
- `Footer.tsx` regels 82-84: Taalnamen in de footer (acceptabel als statisch, maar koppelen aan taalwisselaar of verwijderen)

---

## Werkpakket 4: Datum-lokalisatie helper

Alle `formatDistanceToNow()` en `format()` calls gebruiken standaard Engels.

**Aanpak:**
- Maak `src/lib/date-utils.ts` met:
  - `getDateLocale()`: retourneert `nl`/`enUS`/`ar` locale op basis van `i18n.language`
  - `formatRelative(date)`: wrapper rond `formatDistanceToNow` met correcte locale
  - `formatDate(date, pattern)`: wrapper rond `format` met correcte locale
- Update de volgende bestanden om de helpers te gebruiken:
  - `ChatPage.tsx` (regel 311)
  - `ForumPostPage.tsx`
  - `ForumRoomPage.tsx`
  - `TeacherDashboard.tsx`
  - `TeacherExercisesPage.tsx`
  - `TeacherRecordingsPage.tsx`
  - `AdminInvitationsPage.tsx`
  - `ContentReportsPage.tsx`
  - `AdminDashboard.tsx` (regel 122: `toLocaleDateString()`)

---

## Werkpakket 5: Globale ErrorBoundary

**Aanpak:**
- Maak `src/components/ErrorBoundary.tsx`: een React class component met `componentDidCatch`
  - Toont een gebruikersvriendelijke fallback-UI met "Er ging iets mis" + retry-knop
  - Logt de error naar console (voorbereid voor toekomstige Sentry-integratie)
- Wrap in `App.tsx` de `<Routes>` in een `<ErrorBoundary>`
- Voeg sectie-specifieke boundaries toe in `AdminLayout` en `TeacherLayout` rond `<Outlet>`

---

## Werkpakket 6: Code splitting met React.lazy()

**Aanpak:**
- Vervang alle 40+ synchrone imports in `App.tsx` door `React.lazy()`
- Voeg een `<Suspense fallback={<FullPageLoader />}>` wrapper toe rond `<Routes>`
- Maak `src/components/FullPageLoader.tsx` als gedeelde loading component

Dit reduceert de initiele bundel significant voor studenten die nooit admin/teacher pagina's bezoeken.

---

## Werkpakket 7: Footer links + dode code opruimen

**Aanpak:**
- Verwijder de links naar `/about`, `/contact`, `/privacy`, `/terms` uit `Footer.tsx` (deze pagina's bestaan niet)
- Verwijder `src/pages/DashboardRouter.tsx` (ongebruikt, dode code)
- Verwijder `src/pages/admin/LevelsManagementPage.tsx` (duplicaat van `LevelsPage.tsx`)

---

## Werkpakket 8: ChatPage infinite loop fix + accessibility

**ChatPage.tsx:**
- `allClasses` (regel 56-59) wordt bij elke render opnieuw berekend als nieuw array. Dit veroorzaakt een infinite loop in de `useEffect` op regel 61-65. Fix: wrap in `useMemo`.
- Voeg `aria-label` toe aan emoji-reactieknoppen (regel 268-274)
- Voeg `aria-label` toe aan de rapporteerknop (regel 299-308)
- Voeg `aria-label` toe aan de smile-popover trigger (regel 278-281)

---

## Technische Details per Bestand

| Bestand | Wijziging |
|---------|-----------|
| `src/App.tsx` | Verwijder Sonner import/component, voeg React.lazy + Suspense + ErrorBoundary |
| `src/components/ui/sonner.tsx` | Verwijderen |
| `src/components/ErrorBoundary.tsx` | Nieuw: globale error boundary |
| `src/components/FullPageLoader.tsx` | Nieuw: gedeelde loader |
| `src/lib/date-utils.ts` | Nieuw: `getDateLocale()`, `formatRelative()`, `formatDate()` |
| `src/components/admin/AdminSidebar.tsx` | `left-0` naar `start-0` |
| `src/components/admin/AdminLayout.tsx` | `ml-*` naar `ms-*`, hardcoded strings naar i18n |
| `src/components/teacher/TeacherSidebar.tsx` | `left-0` naar `start-0` |
| `src/components/teacher/TeacherLayout.tsx` | `ml-*` naar `ms-*`, hardcoded strings naar i18n |
| `src/components/layout/Footer.tsx` | Verwijder dode links (/about, /contact, etc.) |
| `src/pages/ChatPage.tsx` | `useMemo` voor allClasses, aria-labels |
| `src/pages/DashboardRouter.tsx` | Verwijderen |
| `src/pages/admin/LevelsManagementPage.tsx` | Verwijderen |
| 9 pagina's met datum-calls | Migreren naar `date-utils.ts` helpers |

---

## Volgorde van Implementatie

1. **ErrorBoundary + FullPageLoader** (veiligheidsnet voor alle volgende wijzigingen)
2. **Toast unificatie** (verwijder Sonner)
3. **Code splitting** (React.lazy in App.tsx)
4. **RTL sidebar fixes** (4 bestanden)
5. **i18n hardcoded strings** (4 bestanden)
6. **Datum-lokalisatie helper + migratie** (1 nieuw + 9 bestaande bestanden)
7. **ChatPage fixes** (useMemo + aria)
8. **Dode code opruimen** (3 bestanden verwijderen)
