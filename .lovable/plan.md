

# Plan: Fix rol-routing + sidebar op elke pagina

## Analyse van het probleem

### Root cause 1: Auth race condition
In `AuthContext.tsx` lopen twee initialisatiepaden tegelijk:
1. `initializeAuth()` (met 100ms delay)
2. `onAuthStateChange('INITIAL_SESSION')` 

Het `INITIAL_SESSION`-event zet `setRole(null)` (regel 194) en roept `fetchUserData` aan. Maar `fetchUserData` heeft een `isFetching` guard — als de eerste call nog loopt, wordt de tweede genegeerd. Als de eerste call faalt/hangt, blijft `role` op `null`.

De console log bevestigt dit: **"Auth initialization timed out after 5s – forcing loaded state"** → `loading` wordt `false`, maar `role` is nog steeds `null`. De recovery-effect probeert `fetchUserData` opnieuw, maar `isFetching.current` is nog `true` van de hangende call, dus het wordt overgeslagen.

**Resultaat**: gebruiker landt op `/dashboard` met `role = null` → Guard 2 toont spinner → uiteindelijk wordt role opgelost maar de `<Navigate>` redirect naar `/teacher` werkt niet betrouwbaar.

### Root cause 2: Geen sidebar buiten admin/teacher-secties
`StudentDashboard` gebruikt `MainLayout` (Header+Footer), en alle andere beschermde routes ook. Er is geen sidebar voor studenten, en als admin/teacher per ongeluk op `/dashboard` belanden, zien ze ook geen sidebar.

## Wijzigingen

### 1. AuthContext vereenvoudigen (src/contexts/AuthContext.tsx)
- **Verwijder dubbele initialisatie**: laat ALLEEN `onAuthStateChange` de auth afhandelen (verwijder `initializeAuth` functie). Dit elimineert de race.
- **Verwijder `isFetching` guard**: vervang door een abort-mechanisme. Als een nieuwe fetch binnenkomt, annuleer de vorige.
- **Verwijder `setRole(null)` vóór fetch**: stel role alleen in wanneer er daadwerkelijk nieuwe data is. Dit voorkomt dat de UI kort `role=null` ziet.
- **Timeout per fetch-poging**: 3s timeout op individuele Supabase-queries i.p.v. globale 5s.

### 2. DashboardPage redirect robuuster maken (src/pages/DashboardPage.tsx)
- Voeg een `useEffect` + `navigate()` backup toe naast `<Navigate>` — als role='admin' of 'teacher', navigeer programmatisch. Dit is een tweede vangnet.

### 3. Unified AppSidebar component aanmaken (nieuw: src/components/layout/AppSidebar.tsx)
Eén sidebar-component die op basis van `role` de juiste navigatie toont:
- **Niet ingelogd**: Home, Zelfstudie, Prijzen, Inloggen, Registreren
- **Student**: Dashboard, Zelfstudie, Live Lessen, Forum, Kalender, Voortgang, Gamificatie, Instellingen
- **Leerkracht**: Alles van student + Content Studio, Lessen, Opnames, Oefeningen, Materiaal, Inzendingen
- **Admin**: Alles van leerkracht + Gebruikers, Klassen, Niveaus, Betalingen, etc.

### 4. AppLayout aanmaken (nieuw: src/components/layout/AppLayout.tsx)
Vervangt `MainLayout` als de globale wrapper:
- Altijd een sidebar (AppSidebar) links
- Hoofdinhoud rechts met padding
- Header bovenin (behoudt huidige Header maar zonder dubbele navigatielinks)
- Sidebar is collapsible op alle schermformaten

### 5. Routes updaten (src/App.tsx)
- Wrap alle routes (publiek + beschermd) in `AppLayout`
- Verwijder `MainLayout` uit individuele pagina's (HomePage, StudentDashboard, etc.)
- Admin- en Teacher-routes behouden hun eigen sidebar-override binnen de layout (AdminLayout/TeacherLayout worden kind-layouts die alleen de sidebar-items vervangen, niet de hele structuur)

### 6. Bestaande pagina's aanpassen
- `HomePage.tsx`: verwijder `<MainLayout>` wrapper
- `StudentDashboard.tsx`: verwijder `<MainLayout>` wrapper
- Alle andere pagina's die `MainLayout` gebruiken: verwijder de wrapper
- `AdminLayout.tsx` en `TeacherLayout.tsx`: bewaar, maar ze worden nu genest binnen AppLayout

## Bestanden

| Bestand | Actie |
|---------|-------|
| `src/contexts/AuthContext.tsx` | Vereenvoudig init, verwijder race |
| `src/pages/DashboardPage.tsx` | Versterk redirect met useEffect backup |
| `src/components/layout/AppSidebar.tsx` | **Nieuw** — unified sidebar per rol |
| `src/components/layout/AppLayout.tsx` | **Nieuw** — globale layout met sidebar |
| `src/App.tsx` | Alle routes wrappen in AppLayout |
| `src/pages/HomePage.tsx` | Verwijder MainLayout wrapper |
| `src/pages/StudentDashboard.tsx` | Verwijder MainLayout wrapper |
| `src/components/layout/Header.tsx` | Vereenvoudig (geen dubbele nav) |
| ~15 andere pagina's | Verwijder MainLayout imports |

