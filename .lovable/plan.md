# Fix-plan: 3 Openstaande Issues + Dashboard-bug

## Prioriteit 1 — Dashboard-bug (KRITIEK)

### Oorzaak

`src/components/auth/ProtectedRoute.tsx` heeft geen guard voor de situatie `user !== null && role === null`. Wanneer `loading` false wordt maar `role` nog niet geladen is, faalt de `allowedRoles` check en redirect naar `/dashboard`, waardoor admin/teacher het StudentDashboard ziet.

### Fix

Voeg een extra guard toe in `ProtectedRoute.tsx` na de `!user` check en voor de role-checks:

```text
// Nieuw: als user ingelogd is maar role nog null, toon spinner (role is nog aan het laden)
if (user && role === null) {
  return spinner;
}
```

Dit voorkomt dat de allowedRoles/requiredRole checks worden uitgevoerd voordat de role daadwerkelijk beschikbaar is. DashboardPage heeft precies dezelfde guard (Guard 2, regel 26-32) en dat werkt correct.

### Bestand

`src/components/auth/ProtectedRoute.tsx` — toevoegen van regels na regel 30 (na `if (!user)` check).

---

## Prioriteit 2 — Duplicaat-iconen admin-sidebar

### Fix

`src/components/admin/AdminSidebar.tsx` — Vervang de 3 duplicaat-paren door unieke iconen:


| Menu-item         | Huidig icoon   | Nieuw icoon                           |
| ----------------- | -------------- | ------------------------------------- |
| Classes           | BookOpen       | School (of GraduationCap verplaatsen) |
| Knowledge Base    | BookOpen       | HelpCircle                            |
| Placements        | ClipboardCheck | ClipboardList                         |
| Reports           | ClipboardCheck | Flag                                  |
| Teacher Approvals | UserCheck      | UserCheck (behouden)                  |
| Invitations       | UserCheck      | Mail                                  |


Importeer `HelpCircle`, `ClipboardList`, `Flag`, `Mail` uit `lucide-react` ter vervanging.

---

## Prioriteit 3 — Route /profile

### Fix

`src/App.tsx` regel 125 — Vervang `<DashboardPage />` door een `<Navigate to="/settings" replace />` redirect. Dit stuurt `/profile` bezoekers naar de instellingenpagina waar profielgegevens al beheerd kunnen worden.

---

## Samenvatting wijzigingen


| #   | Bestand                                  | Wijziging                                                             |
| --- | ---------------------------------------- | --------------------------------------------------------------------- |
| 1   | `src/components/auth/ProtectedRoute.tsx` | Guard toevoegen: `user && role === null` toont spinner                |
| 2   | `src/components/admin/AdminSidebar.tsx`  | 3 duplicaat-iconen vervangen door unieke iconen                       |
| 3   | `src/App.tsx`                            | `/profile` route: Navigate to `/settings` in plaats van DashboardPage |


## Resterende `toLocaleString` in chart.tsx

`src/components/ui/chart.tsx` regel 212 bevat `item.value.toLocaleString()` — dit is nummer-formattering (niet datum), dus dit is correct gebruik en hoeft NIET vervangen te worden.  
  
**andere punten:**   
  
**-** zorg dat er altijd bij elk rol een icoon verschijnt waarom taal gewijzigd kan worden.   
- roep alle losse hardcoded strings die zonder link met i18n op.  
  
  
Voer de bovenstaande stappen exact en volledig uit. Controleer na afloop elk punt; lever een gedetailleerd rapport van de wijzigingen per bestand. Geen aannames of weglatingen – houd je strikt aan de instructies. iets dat in de ui niet 100% functioneert is dan ook niet 100% voltooid.