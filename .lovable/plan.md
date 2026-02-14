
# Volledig Statusrapport: HVA Platform

## Samenvatting

Het platform is een blended learning SPA (React/TypeScript/Vite) met een Lovable Cloud backend. De codebase bevat 40+ pagina's, 3 rollen (admin/teacher/student), 3 talen (NL/EN/AR), en 50+ database tabellen. De meeste kernmodules zijn code-compleet, maar er zijn functionele hiaten die gebruikers zullen tegenkomen.

---

## WAT WERKT (Functioneel)

### Authenticatie & Rollen
- Registratie met e-mailverificatie (student standaard)
- Login met post-login redirect naar /dashboard
- Rol-gebaseerde routing: admin naar /admin, teacher naar /teacher, student naar StudentDashboard
- 2FA setup (TOTP) via SettingsPage
- AdminLayout en TeacherLayout met 5-seconden roleCheckTimeout (defense in depth)
- Service Worker volledig uitgeschakeld + zelfvernietigende SW + inline cache cleanup

### Zelfstudie-module
- 5 categorieen (lezen, schrijven, luisteren, spreken, grammatica)
- Oefeningen met meerkeuze, checkbox, open tekst, audio/video-opname, bestandsupload
- Automatische nakijking van objectieve vragen
- Timer met auto-submit
- Score-berekening en pass/fail feedback
- Student class filter: studenten zien alleen oefeningen van hun ingeschreven klassen
- Staff (admin/teacher) zien alle oefeningen

### Leerkracht-omgeving
- Dashboard met statistieken (studenten, klassen, pending reviews, opnames)
- Oefeningen aanmaken met class selector (admin ziet alle klassen, teacher ziet eigen klassen)
- Exercise Builder met vraag-editor
- Release Settings dialog per oefening (publicatiedatum, deadline, publiceren/ontpubliceren)
- Lessen plannen (CRUD) met Google Meet link
- Opnames beheren
- Inzendingen beoordelen (correct/incorrect met feedback en deelscore)
- Content Studio als centraal overzicht

### Beheerdersomgeving
- Dashboard met platform-statistieken
- Gebruikersbeheer
- Klassen beheren
- Niveaus beheren (CRUD)
- Leerkracht-goedkeuringen
- Plaatsingstoetsen (CRUD, planning, beoordeling, niveau toewijzen)
- Kortingscodes
- FAQ/Kennisbank beheer
- Contentmeldingen
- Uitnodigingen voor admin/teacher rollen
- Eindexamens beheren
- Analytics pagina

### Community
- Forum met kamers, posts, reacties, likes
- Klas-chat met realtime berichten, emoji-reacties, content rapporteren

### Overige modules
- Kalender met evenementen (aanmaken, bekijken, verwijderen per type)
- Gamification dashboard (punten, streaks, badges, leaderboard)
- Helpdesk met tickets, prioriteiten, statussen, staff-reacties, interne notities
- Voortgangsrapport met grafieken (wekelijks, per categorie) en export (CSV/PDF)
- Kennisbank (FAQ) met zoeken, categorieen, feedback (duim omhoog/omlaag)
- Installatiepagina
- Thema-instellingen (licht/donker/systeem + professioneel/speels)
- Taalwisselaar (NL/EN/AR)
- i18n volledig voor alle 3 talen inclusief nav, dashboard, gamification, enrollFirst, adminFallback, etc.

---

## WAT NIET WERKT / ONTBREEKT

### 1. SettingsPage: Profiel opslaan doet niets
**Ernst: Hoog**
De "Wijzigingen opslaan" knop op de profielpagina heeft GEEN onClick handler. Het formulier toont de gegevens maar slaat niets op. Wachtwoord wijzigen en notificatie-instellingen zijn ook niet-functioneel (geen mutations).

**Oplossing:** Voeg `useMutation` toe die `supabase.from('profiles').update(...)` aanroept. Voeg ook wachtwoord wijzigen via `supabase.auth.updateUser({ password })` toe.

### 2. Avatar uploaden doet niets
**Ernst: Middel**
De "Avatar wijzigen" knop op SettingsPage is niet gekoppeld aan Supabase Storage upload.

**Oplossing:** File input toevoegen, uploaden naar een storage bucket, en avatar_url in profiel updaten.

### 3. Notificatie-instellingen zijn niet-functioneel
**Ernst: Laag**
De checkboxes op de notificaties-tab van SettingsPage zijn statisch HTML (`<input type="checkbox" defaultChecked />`) zonder state of persistentie.

**Oplossing:** Notificatie-voorkeuren opslaan in het profiel of een aparte tabel.

### 4. Betalingen: Stripe niet geconfigureerd
**Ernst: Middel (bewust uitgesteld)**
De PaymentsPage toont een "Coming Soon" placeholder. Stripe API key is niet ingesteld. Handmatige betalingen zijn deels geimplementeerd via edge function.

**Actie:** Handmatige actie - Stripe API key toevoegen. De edge functions `stripe-checkout` en `stripe-webhook` bestaan al.

### 5. E-mail verzending: Resend niet geconfigureerd
**Ernst: Middel (bewust uitgesteld)**
De `send-email` en `send-lesson-reminders` edge functions bestaan maar Resend API key ontbreekt.

**Actie:** Handmatige actie - Resend API key toevoegen.

### 6. Recordings: geen class-filter voor studenten
**Ernst: Laag**
RecordingsPage haalt ALLE opnames op ongeacht de klasse van de student. Er is geen enrollment-filter zoals bij exercises en lessons.

**Oplossing:** Zelfde pattern als LiveLessonsPage: eerst enrolledClassIds ophalen, dan filteren via de lesson's class_id.

### 7. TeacherLessonsPage: Admin ziet geen klassen
**Ernst: Middel**
TeacherLessonsPage filtert klassen op `teacher_id = user.id`. Een admin die geen leerkracht is van een klas, ziet geen klassen en kan geen lessen aanmaken.

**Oplossing:** Zelfde fix als TeacherExercisesPage: admin ziet alle actieve klassen.

### 8. TeacherSubmissionsPage: Admin ziet geen submissions
**Ernst: Middel**  
Zelfde probleem - filtert op `teacher_id` in plaats van admin-check.

**Oplossing:** Admin-check toevoegen aan de class query.

### 9. TeacherRecordingsPage/TeacherMaterialsPage: Admin-toegang niet gecontroleerd
**Ernst: Middel**
Waarschijnlijk zelfde issue als LessonsPage (classes filteren op teacher_id).

### 10. pg_cron/pg_net extensies niet actief
**Ernst: Laag (bewust uitgesteld)**
Automatische oefening-release (elke 2 dagen) via `release-exercises` edge function vereist pg_cron scheduling.

**Actie:** Handmatige actie in database-instellingen.

---

## VOORSTEL: Alles 100% Functioneel Maken

### Fase 1: Kritieke functionaliteit (SettingsPage)

| Taak | Bestand | Complexiteit |
|------|---------|-------------|
| Profiel opslaan (naam, telefoon, adres) | `SettingsPage.tsx` | Laag |
| Wachtwoord wijzigen | `SettingsPage.tsx` | Laag |
| Avatar uploaden naar Storage | `SettingsPage.tsx` | Middel |
| Notificatie-voorkeuren opslaan | `SettingsPage.tsx` + migratie | Middel |

### Fase 2: Admin-toegang consistentie

| Taak | Bestand | Complexiteit |
|------|---------|-------------|
| Admin ziet alle klassen in TeacherLessonsPage | `TeacherLessonsPage.tsx` | Laag |
| Admin ziet alle klassen in TeacherSubmissionsPage | `TeacherSubmissionsPage.tsx` | Laag |
| Admin ziet alle klassen in TeacherRecordingsPage | `TeacherRecordingsPage.tsx` | Laag |
| Admin ziet alle klassen in TeacherMaterialsPage | `TeacherMaterialsPage.tsx` | Laag |

### Fase 3: Student content filtering

| Taak | Bestand | Complexiteit |
|------|---------|-------------|
| RecordingsPage filteren op enrolled classes | `RecordingsPage.tsx` | Laag |

### Fase 4: UI polish en edge cases

| Taak | Bestand | Complexiteit |
|------|---------|-------------|
| ForumPostPage: breadcrumb verbeteren | `ForumPostPage.tsx` | Laag |
| HelpdeskPage: wrappen in MainLayout | `HelpdeskPage.tsx` | Laag |

### Handmatige acties (buiten scope)

| Actie | Waar |
|-------|------|
| Stripe API key toevoegen | Backend secrets |
| Resend API key toevoegen | Backend secrets |
| pg_cron/pg_net extensies inschakelen | Database instellingen |

---

## Technische Details per Fase

### Fase 1: SettingsPage opslaan

Het huidige formulier gebruikt `defaultValue` (ongecontroleerd). Dit moet worden omgezet naar controlled state met een save-mutation:

```text
// Nieuwe flow:
1. useState voor elk veld, geinitialiseerd vanuit profile
2. Button onClick -> useMutation die profiles tabel update
3. Wachtwoord: supabase.auth.updateUser({ password: newPassword })
4. Avatar: <input type="file"> -> supabase.storage.upload() -> profiles.avatar_url update
```

### Fase 2: Admin-toegang

Zelfde pattern als TeacherExercisesPage (reeds gefixt):

```text
// Huidige code (fout):
.eq("teacher_id", user!.id)

// Correcte code:
if (isAdmin) {
  .eq("is_active", true)  // admin ziet alles
} else {
  .eq("teacher_id", user!.id)  // teacher ziet eigen klassen
}
```

Dit moet worden toegepast in 4 bestanden.

### Fase 3: RecordingsPage filter

```text
// Toevoegen: enrolled class IDs ophalen (voor studenten)
// Dan: filteren via lesson -> class_id IN enrolledClassIds
// Admin/teacher: geen filter (ziet alles)
```

---

## Conclusie

| Categorie | Status |
|-----------|--------|
| Auth & Routing | 100% compleet |
| Service Worker / Cache | 100% opgelost |
| i18n (NL/EN/AR) | 100% compleet |
| Zelfstudie-module | 100% compleet |
| Exercise Builder | 100% compleet |
| Release Settings | 100% compleet |
| Student Class Filter | 95% (recordings mist filter) |
| Admin-toegang consistentie | 70% (4 teacher-pages missen admin-check) |
| SettingsPage functionaliteit | 30% (UI bestaat, save/password/avatar niet-functioneel) |
| Betalingen (Stripe) | 0% functioneel (wacht op API key) |
| E-mail (Resend) | 0% functioneel (wacht op API key) |
| Automatische release (pg_cron) | 0% functioneel (wacht op extensie) |

**Totaal geschatte implementatietijd voor Fasen 1-4: circa 3-4 berichten.**
