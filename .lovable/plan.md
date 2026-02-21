
# Statusrapport HVA Platform -- Stand van Zaken & Verbeterpunten

---

## DEEL 1: VOLTOOIINGSOVERZICHT PER MODULE

### A. Authenticatie & Autorisatie -- 85%

| Onderdeel | Status | Opmerking |
|-----------|--------|-----------|
| Login-formulier | Voltooid | Zod-validatie, oog-icoon wachtwoord, i18n |
| Registratieformulier | Voltooid | 8 velden, studieniveau-selectie |
| Auth-context (race condition fix) | Voltooid | signedInHandled ref, sync loading |
| ProtectedRoute (role guard) | Voltooid | Spinner bij role === null |
| DashboardPage routing | Voltooid | Synchrone guards per rol |
| AdminLayout / TeacherLayout | Voltooid | 15s timeout + retry knop |
| HomePage redirect | Voltooid | Ingelogde gebruiker -> /dashboard |
| Wachtwoord vergeten | **ONTBREEKT** | Link in LoginForm verwijst naar `/forgot-password` maar die route bestaat niet |
| E-mailbevestiging na registratie | Onbekend | Geen feedback-pagina of redirect na succesvolle registratie |

### B. Internationalisering (i18n) -- 78%

| Onderdeel | Status | Opmerking |
|-----------|--------|-----------|
| NL vertaalbestand | Bijna compleet | 793 regels, goed gestructureerd |
| EN vertaalbestand | Bijna compleet | 793 regels, parallel met NL |
| AR vertaalbestand | Bijna compleet | 781 regels, RTL-support in CSS |
| LanguageSwitcher component | Voltooid | Dropdown met vlaggen |
| Footer taalwisselaar | Voltooid | Interactieve knoppen met i18n.changeLanguage |
| **RegisterForm zod-validatie** | **HARDCODED NL** | 4 foutmeldingen zijn Nederlands hardcoded in de Zod-schema |
| **NotFound pagina** | **HARDCODED EN** | "Oops! Page not found" en "Return to Home" zijn niet vertaald |
| **LanguageSwitcher sr-only** | **HARDCODED EN** | "Switch language" is niet vertaald |
| **SettingsPage** | **Ontbrekende keys** | 20+ settings.*-keys ontbreken in de JSON-bestanden (profileInfo, profileDescription, changeAvatar, fullName, email, phone, address, saveChanges, password, passwordDescription, newPassword, confirmPassword, updatePassword, notificationPreferences, notificationDescription, emailNotifications, emailNotificationsDescription, lessonReminders, lessonRemindersDescription, exerciseNotifications, exerciseNotificationsDescription, title, profile, security, appearance) |
| **RegisterForm placeholders** | **HARDCODED** | "John Doe", "Straat, huisnummer, postcode, stad" |
| admin/teacher fallback strings | Met fallback | Vallen terug op hardcoded NL/EN defaults |

### C. Admin Dashboard -- 90%

| Onderdeel | Status | Opmerking |
|-----------|--------|-----------|
| Dashboard statistieken | Voltooid | 4 StatsCards |
| Gebruikersbeheer | Voltooid | Zoeken, rol wijzigen |
| Klassenbeheer | Voltooid | CRUD, docent toewijzen |
| Niveaubeheer | Voltooid | Meertalige namen |
| Betalingsbeheer | Voltooid | Handmatige betalingen |
| Kortingscodes | Voltooid | CRUD, percentage/vast |
| Niveau-testen | Voltooid | Planning, voltooiing |
| Analytics | Voltooid | Grafieken, metrics |
| Knowledge Base beheer | Voltooid | FAQ-management |
| Inhoudsmeldingen | Voltooid | Moderatie-workflow |
| Uitnodigingen | Voltooid | E-mailuitnodigingen |
| Eindtoetsen | Voltooid | Examen-configuratie |
| Sidebar-iconen | Voltooid | Alle uniek (recent gefixt) |
| **Taalwisselaar** | **ONTBREEKT** | AdminLayout heeft geen LanguageSwitcher of ThemeSwitcher |

### D. Docenten Dashboard -- 88%

| Onderdeel | Status | Opmerking |
|-----------|--------|-----------|
| Content Studio | Voltooid | Centrale hub voor content |
| Lessen plannen | Voltooid | Google Meet integratie |
| Opnames uploaden | Voltooid | Video-upload |
| Oefeningen maken | Voltooid | ExerciseBuilder (6 vraagtypen) |
| Materialen uploaden | Voltooid | PDF/slides |
| Inzendingen beoordelen | Voltooid | Score + feedback |
| Klas-selector | Voltooid | ClassContext |
| **Taalwisselaar** | **ONTBREEKT** | TeacherLayout heeft geen LanguageSwitcher of ThemeSwitcher |

### E. Studentenfunctionaliteit -- 92%

| Onderdeel | Status | Opmerking |
|-----------|--------|-----------|
| Student Dashboard | Voltooid | Voortgang, streak, punten |
| Zelfstudie | Voltooid | 5 categorieen, oefeningen |
| Live Lessen | Voltooid | Google Meet links |
| Opnames bekijken | Voltooid | Video-player |
| Forum | Voltooid | Kamers, berichten, likes |
| Chat | Voltooid | Real-time, reacties, rapporteren |
| Kalender | Voltooid | Evenementen CRUD |
| Gamification | Voltooid | Badges, leaderboard, streaks |
| Voortgang | Voltooid | Grafieken, categorieoverzicht |
| Helpdesk | Voltooid | Tickets, reacties |
| Eindtoets | Voltooid | Tijdslimiet, promotie |
| Instellingen | Grotendeels | Profiel, wachtwoord, thema, notificaties aanwezig |

### F. Beveiliging -- 82%

| Onderdeel | Status | Opmerking |
|-----------|--------|-----------|
| 2FA setup | Voltooid | QR-code, backup codes |
| 2FA verificatie edge function | Voltooid | TOTP verificatie |
| Wachtwoord min. 8 chars | Deels | RegisterForm: min 8, LoginForm: min 6 (inconsistent) |
| RLS policies | Onbekend | Niet gecontroleerd in deze audit |
| Content rapportering | Voltooid | Spam, intimidatie, etc. |
| GDPR data retention | Voltooid | Database functions |

### G. PWA & Mobiel -- 85%

| Onderdeel | Status | Opmerking |
|-----------|--------|-----------|
| Manifest.json | Voltooid | Shortcuts, icons, share_target |
| Service Worker | Aanwezig | public/sw.js |
| Installatie-pagina | Voltooid | iOS/Android instructies |
| Capacitor config | Aanwezig | Android/iOS builds mogelijk |
| Responsief ontwerp | Goed | Tailwind responsive classes |

### H. Edge Functions -- 90%

| Functie | Status |
|---------|--------|
| analytics | Voltooid |
| complete-placement | Voltooid |
| gamification | Voltooid |
| grade-submission | Voltooid |
| helpdesk | Voltooid |
| manual-payment | Voltooid |
| release-exercises | Voltooid |
| schedule-placement | Voltooid |
| send-email | Voltooid |
| send-lesson-reminders | Voltooid |
| stripe-checkout | Handmatig (uitgesloten) |
| stripe-webhook | Handmatig (uitgesloten) |
| verify-2fa | Voltooid |

---

## DEEL 2: KRITIEKE VERBETERPUNTEN

### PRIORITEIT 1 -- Functionele bugs & ontbrekende features

1. **Route `/forgot-password` bestaat niet**
   LoginForm linkt naar `/forgot-password`, maar die route ontbreekt in App.tsx. Gebruikers komen op de 404-pagina. Dit is essentieel voor een productie-app.
   - Fix: Maak een ForgotPasswordPage die `supabase.auth.resetPasswordForEmail()` aanroept.

2. **Admin/Teacher layouts missen LanguageSwitcher en ThemeSwitcher**
   Wanneer een admin of leerkracht in hun dashboard werkt, kunnen ze de taal niet wijzigen. Alleen de MainLayout (Header) bevat deze componenten. De AdminLayout en TeacherLayout hebben een eigen sidebar zonder Header.
   - Fix: Voeg een LanguageSwitcher + ThemeSwitcher toe aan de AdminSidebar en TeacherSidebar (in de footer-sectie).

3. **NotFound pagina is volledig hardcoded Engels**
   De 404-pagina toont "Oops! Page not found" en "Return to Home" zonder enige i18n.
   - Fix: Gebruik `t('notFound.title')`, `t('notFound.message')`, `t('notFound.backHome')` en voeg keys toe aan alle 3 vertaalbestanden.

### PRIORITEIT 2 -- i18n-voltooiing

4. **RegisterForm: 4 Zod-validatieberichten zijn hardcoded Nederlands**
   ```
   'Naam moet minimaal 2 karakters zijn'
   'Ongeldig e-mailadres'  
   'Wachtwoord moet minimaal 8 karakters zijn'
   'Wachtwoorden komen niet overeen'
   ```
   Dit breekt voor EN/AR-gebruikers. De Zod-schema kan geen `t()` gebruiken buiten de component.
   - Fix: Gebruik `z.string().min(2)` zonder bericht, en override de foutmelding via react-hook-form's `FormMessage` met i18n, of herdefinieer het schema binnen de component zodat `t()` beschikbaar is.

5. **SettingsPage: 20+ ontbrekende i18n-keys**
   De SettingsPage gebruikt `t('settings.profileInfo')`, `t('settings.changeAvatar')`, `t('settings.newPassword')`, etc. Maar deze keys bestaan niet in de vertaalbestanden. De pagina toont alleen de key-naam of de hardcoded fallback.
   - Fix: Voeg alle ontbrekende settings.*-keys toe aan nl.json, en.json en ar.json.

6. **RegisterForm placeholders hardcoded**
   "John Doe" en "Straat, huisnummer, postcode, stad" zijn niet vertaald.
   - Fix: Gebruik `t('auth.namePlaceholder')` en `t('auth.addressPlaceholder')`.

7. **LanguageSwitcher sr-only tekst hardcoded Engels**
   `<span className="sr-only">Switch language</span>` moet `t('accessibility.switchLanguage')` zijn (de key bestaat al).
   - Fix: Gebruik `t('accessibility.switchLanguage')`.

### PRIORITEIT 3 -- Consistentie & kwaliteit

8. **Wachtwoord-minimumlengte inconsistent**
   LoginForm accepteert min. 6 tekens, RegisterForm vereist min. 8. De beveiligingstest-specificatie vermeldt 8.
   - Fix: LoginForm Zod-schema wijzigen naar `z.string().min(8)`.

9. **Na registratie geen duidelijke feedback-flow**
   Na succesvolle registratie krijgt de gebruiker een toast maar blijft op de registratiepagina. Er is geen redirect naar een bevestigingspagina.
   - Fix: Redirect naar een "Controleer je e-mail"-pagina of naar /login met een bericht.

10. **Notification-instellingen zijn niet persistent**
    De Switch-toggles in SettingsPage (emailNotifications, lessonReminders, exerciseNotifications) zijn lokale state en worden niet opgeslagen in de database.
    - Fix: Sla notificatievoorkeuren op in de profiles-tabel of een nieuwe tabel.

11. **`common`-sectie duplicaat in nl.json**
    Het bestand nl.json heeft twee `"common"` blokken (regels 8-31 en regels 703-744). Het tweede blok overschrijft het eerste met extra keys maar ook met duplicaten. Dit kan verwarrend zijn.
    - Fix: Merge beide blokken tot een enkele `common`-sectie.

12. **`dashboard.studyTime` duplicaat in alle locale-bestanden**
    Zowel nl.json, en.json als ar.json hebben `"studyTime"` tweemaal in het `dashboard`-object (regels 99 en 105 in nl.json). Dit is ongeldige JSON die alleen werkt omdat de parser de laatste waarde neemt.
    - Fix: Verwijder het duplicaat.

---

## DEEL 3: TOTAALOVERZICHT

| Module | Voltooiing | Blokkend? |
|--------|-----------|-----------|
| Authenticatie & Autorisatie | 85% | Wachtwoord vergeten ontbreekt |
| i18n | 78% | Hardcoded strings, ontbrekende keys |
| Admin Dashboard | 90% | Taalwisselaar ontbreekt |
| Docenten Dashboard | 88% | Taalwisselaar ontbreekt |
| Studentenfunctionaliteit | 92% | Registratie-flow incompleet |
| Beveiliging | 82% | Wachtwoord-inconsistentie |
| PWA & Mobiel | 85% | Functioneel |
| Edge Functions | 90% | Stripe uitgesloten |
| **Gemiddeld** | **~86%** | |

---

## DEEL 4: TECHNISCH ACTIEPLAN

Totaal **12 verbeterpunten**, waarvan:
- 3 Prioriteit 1 (functioneel blokkend)
- 4 Prioriteit 2 (i18n-voltooiing)
- 5 Prioriteit 3 (consistentie & kwaliteit)

### Bestanden die aangepast moeten worden:

| # | Bestand | Wijziging |
|---|---------|-----------|
| 1 | **NIEUW:** `src/pages/ForgotPasswordPage.tsx` | Wachtwoord-reset formulier |
| 2 | `src/App.tsx` | Route `/forgot-password` toevoegen |
| 3 | `src/components/admin/AdminSidebar.tsx` | LanguageSwitcher + ThemeSwitcher in footer |
| 4 | `src/components/teacher/TeacherSidebar.tsx` | LanguageSwitcher + ThemeSwitcher in footer |
| 5 | `src/pages/NotFound.tsx` | i18n toevoegen |
| 6 | `src/components/auth/RegisterForm.tsx` | Zod-berichten i18n + placeholders |
| 7 | `src/components/auth/LoginForm.tsx` | Wachtwoord min. 8 chars |
| 8 | `src/components/layout/LanguageSwitcher.tsx` | sr-only tekst via i18n |
| 9 | `src/i18n/locales/nl.json` | 25+ ontbrekende keys, duplicaten verwijderen |
| 10 | `src/i18n/locales/en.json` | 25+ ontbrekende keys, duplicaten verwijderen |
| 11 | `src/i18n/locales/ar.json` | 25+ ontbrekende keys, duplicaten verwijderen |
