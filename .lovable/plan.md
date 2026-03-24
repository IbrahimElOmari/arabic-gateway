## Audit Results & Fix Plan

### Verified as Correct (No Changes Needed)

- **Sidebar per rol**: `AppSidebar.tsx` correctly renders `studentItems` for students, `studentItems + teacherItems` for teachers, and all three sections plus `adminItems` for admins. The enrollment badge query filters on `status = 'pending'` and only runs for admins (`enabled: !!user && role === 'admin'`). Confirmed working.
- **Admin enrollment visibility**: RLS on `class_enrollments` has an `ALL` policy for admins via `has_role(auth.uid(), 'admin')`. The query in `EnrollmentRequestsPage.tsx` correctly filters on `status = 'pending'`. Admins can see all pending enrollments.
- **Enrollment flow**: `PricingPage.tsx` correctly inserts with `status: 'enrolled'` for free classes and `status: 'pending'` for paid classes. Notifications are sent on approval/rejection via `EnrollmentRequestsPage.tsx`.
- **Profile icon**: `Header.tsx` has a persistent `Avatar` dropdown for authenticated users with profile, progress, settings, and logout options. Always visible on desktop and mobile.
- **i18n completeness**: All keys (`admin.enrollmentRequests`, `chat.groupChat`, `chat.privateChat`, `chat.newConversation`, `nav.general`, `nav.learning`, `nav.teaching`, `nav.administration`, etc.) exist in all three locale files (nl.json, en.json, ar.json).
- **Private chat RLS**: `private_chat_rooms` SELECT policy correctly joins on `private_chat_participants.room_id = private_chat_rooms.id`. UPDATE policy also exists for participants and admins.
- **Mobile sidebar**: `AppLayout.tsx` renders a `Sheet` with hamburger menu on mobile, closing on navigation via `onNavigate`.
- **ProtectedRoutes**: All admin routes use `requiredRole="admin"`, teacher routes use `allowedRoles={['admin', 'teacher']}`. The `ProtectedRoute` component correctly redirects unauthorized users.
- **API migration**: Only `AuthContext.tsx` uses direct `supabase.rpc()` for `get_user_role`, which is appropriate for the auth layer. All other client-side code uses `apiQuery`/`apiMutate`.
- **Helpdesk RLS**: `support_tickets` and `ticket_responses` have correct policies -- users see own tickets, staff sees all.

### Issues Found and Fixes Required

#### 1. Critical: `chat_messages` RLS does not enforce enrolled status

The SELECT policy on `chat_messages` checks `class_enrollments.student_id = auth.uid()` but does NOT check `class_enrollments.status = 'enrolled'`. This means students with `pending` status can read and send group chat messages before admin approval.

**Fix**: Create a migration that drops and recreates the SELECT and INSERT policies on `chat_messages` to add `AND class_enrollments.status = 'enrolled'` to the enrollment check.

#### 2. Minor: Duplicate SELECT policy on `class_enrollments`

Two redundant SELECT policies exist for students:

- "Students can view own enrollments" (`auth.uid() = student_id`)
- "Students can view their own enrollments" (`student_id = auth.uid()`)

**Fix**: Drop one of the duplicate policies in the same migration.

#### 3. Minor: Duplicate `IdleTimeoutWarning` rendering

`IdleTimeoutWarning` is rendered both in `App.tsx` (line 181, outside AppLayout) and in `MainLayout.tsx` (line 33). Since `MainLayout` is not used in production (only mocked in tests), this is harmless but should be cleaned up.

**Fix**: Remove the `IdleTimeoutWarning` from `MainLayout.tsx` since it's unused in production and the component in `App.tsx` handles it globally.

#### 4. Update `docs/final-report.md`

Document the RLS fix and final audit results confirming all systems are verified and production-ready.

### Implementation Steps


| Step | File(s)                                | Action                                                                                                                     |
| ---- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1    | New migration SQL                      | Fix `chat_messages` SELECT + INSERT RLS to require `status = 'enrolled'`; drop duplicate `class_enrollments` SELECT policy |
| 2    | `src/components/layout/MainLayout.tsx` | Remove `IdleTimeoutWarning` import and rendering                                                                           |
| 3    | `docs/final-report.md`                 | Update with audit findings and final status                                                                                |


### Technical Details

**Migration SQL** will contain:

```sql
-- Fix chat_messages SELECT: require enrolled status
DROP POLICY IF EXISTS "Enrolled students can view class chat" ON public.chat_messages;
CREATE POLICY "Enrolled students can view class chat"
ON public.chat_messages FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM class_enrollments
    WHERE class_enrollments.class_id = chat_messages.class_id
      AND class_enrollments.student_id = auth.uid()
      AND class_enrollments.status = 'enrolled'
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = chat_messages.class_id
      AND classes.teacher_id = auth.uid()
  ))
);

-- Fix chat_messages INSERT: require enrolled status
DROP POLICY IF EXISTS "Enrolled users can send chat messages" ON public.chat_messages;
CREATE POLICY "Enrolled users can send chat messages"
ON public.chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND (
    (EXISTS (
      SELECT 1 FROM class_enrollments
      WHERE class_enrollments.class_id = chat_messages.class_id
        AND class_enrollments.student_id = auth.uid()
        AND class_enrollments.status = 'enrolled'
    ))
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = chat_messages.class_id
        AND classes.teacher_id = auth.uid()
    ))
  )
);

-- Remove duplicate SELECT policy on class_enrollments
DROP POLICY IF EXISTS "Students can view own enrollments" ON public.class_enrollments;
```

controleer, vul aan, wijzig, indien nodig de volgende punten correct nog eens:  
Het doel blijft: **100% voltooiing volgens de strenge definitie**.

### 1. Beveiliging en RLS

1. **chat_messages** – De huidige RLS voor SELECT en INSERT laat studenten met `status='pending'` toe. Voeg de voorwaarde `AND class_enrollments.status = 'enrolled'` toe in **zowel** SELECT- als INSERT-beleid, zodat alleen ingeschreven studenten, de betreffende docent of admins berichten kunnen lezen/plaatsen.
2. **class_enrollments** – Er staan twee identieke SELECT‑policies voor studenten. Verwijder één duplicaat in dezelfde migratie.
3. **private_chat_rooms** – De verkeerde kolom in de SELECT‑policy werd gecorrigeerd; verifieer dat de UPDATE‑policy bestaat zodat `updated_at` kan worden bijgewerkt.
4. **chat_reactions** – Controleer dat de RLS ook een check op `class_enrollments.status='enrolled'` bevat om de reactie‑logica te beveiligen.

### 2. Architectuur / Front‑end

1. **IdleTimeoutWarning** – Verwijder de dubbele rendering in `MainLayout.tsx` (de globale variant in `App.tsx` volstaat). Controleer dat in de browser geen twee overlays worden weergegeven.
2. **Admin-side enrollments badge** – De teller (badge) voor het aantal inschrijvingsaanvragen wordt nu correct opgehaald via `apiQuery` en verschijnt op de admin‑sidebar. Zorg dat deze queries alleen draaien wanneer de gebruiker admin is en dat het badge‑nummer automatisch elke 30s ververst.
3. **Sidebar** – De huidige implementatie is correct: studenten zien alleen student-items, docenten zowel student- als docent-items, admins alles. Controleer dat na jouw wijzigingen de `/admin/enrollments` link met badge zichtbaar is onder de admin-sectie, en dat er geen nieuwe inconsistenties ontstaan.
4. **Chat** –
  - **Groepschat**: alleen ingeschreven studenten, de docent van de klas en admins hebben toegang. Controleer of de `status='enrolled'` check is doorgevoerd in `chat_messages` queries.
  - **Privéchat**: gebruikers kunnen 1-op-1 gesprekken starten; docenten kunnen met leerlingen chatten; admins mogen alles. Zorg dat de lookup van bestaande kamers correct gebeurt en dat de RLS voor `private_chat_messages` en `private_chat_participants` geen lekken bevat (alleen deelnemers + admin).
  - **UI**: De tabs *Groepschat* en *Privéchat* moeten in de ChatPage zichtbaar zijn. Verifieer dat de i18n‑sleutels voor deze labels in alle taalbestanden staan.
5. **Enrolment Flow** – Verifieer de end‑to‑end flow:
  - PricingPage: inschrijving maakt een `class_enrollments` record met `status='enrolled'` (gratis) of `status='pending'` (betaald).
  - Admin: `/admin/enrollments` toont alle pending inschrijvingen; admin kan goedkeuren/afwijzen.
  - Na goedkeuring krijgt de student toegang tot zijn klas (oefeningen, lessen, forum, chat).
  - Notificaties worden verzonden via de `notifications` tabel, en de NotificationBell toont de badge.

### 3. Internationalisatie

1. **Nieuwe i18n‑sleutels** – De laatste check toonde dat `admin.enrollmentRequests`, `admin.enrollmentRequestsDesc`, `admin.pendingEnrollments` en de nav‑groepen (`nav.general`, `nav.learning`, `nav.teaching`, `nav.administration`) ontbraken of onvolledig waren. Voeg deze toe aan **alle** taalbestanden (`nl.json`, `en.json`, `ar.json`).
2. **Consistency** – Controleer nogmaals op fallback strings (`t('key', 'Fallback')`) die mogelijk niet in alle drie de talen aanwezig zijn. Vul ontbrekende vertalingen aan of verplaats fallback‑tekst naar het locale‑bestand.

### 4. Documentatie en testen

1. **Migration** – Maak één SQL‑migratie die alle RLS‑aanpassingen bevat (punten 1 en 2). Documenteer in de migratie waarom de wijzigingen nodig zijn.
2. **Tests** – Update/voeg unit‑ en E2E‑tests toe:
  - Verifieer dat studenten met `status='pending'` geen chatberichten kunnen lezen of posten (verwachte 403).
  - Controleer dat de admin‑badge het juiste aantal aanvragen toont.
  - Verzeker dat het verwijderen van `IdleTimeoutWarning` geen regressies veroorzaakt (handhaaf de globale variant).
  - E2E: doorloop de volledige inschrijf‑ en goedkeuringsflow; test de private chat; test role‑based protected routes.
3. **final-report.md** – Update het rapport met:
  - De fix voor `chat_messages` RLS en dubbele SELECT‑policy.
  - De verwijdering van de dubbele IdleTimeout component.
  - De verificatie van i18n‑compleetheid en nav‑sleutels.
  - De enrolment flow en chat‑systeem bevestigingen.
  - De remark dat Stripe/Resend/pg_cron integratie nog een handmatige sleutelconfiguratie vereist.

### 5. Controlelijst voor “Voltooid”

Zorg ervoor dat bij afsluiten:

- Alle aangepaste bestanden compileren zonder TS‑fouten.
- Alle unit‑ en E2E‑tests slagen.
- Er geen TODO‑commentaar of openstaande Not Implemented‑gedeelten in de code overblijven.
- Alle features werken in NL, EN en AR.
- Documentatie (`final-report.md`) is up‑to‑date met de laatste wijzigingen, testresultaten en bekende openstaande externe configuraties (Stripe, Resend, pg_cron).  
  
Een feature is **NIET voltooid** als:
  - alleen de database bestaat
  - alleen een pagina of route bestaat
  - alleen data kan worden opgehaald
  Een feature is **PAS voltooid** als:
  - de juiste **rol** (admin/leerkracht/leerling)
  - via een **zichtbare UI**
  - **content kan aanmaken, bewerken, publiceren en gebruiken**