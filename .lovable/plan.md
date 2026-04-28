## Stand van zaken

Ik heb de routeconfiguratie, navigatie, vertaalbestanden, testconfiguratie, consolelogs en rolgebaseerde toegang onderzocht. Conclusie: de app is duidelijk ver gevorderd, maar kan niet als “100% compleet en bugvrij” worden beschouwd. Er zijn concrete onvolledigheden en enkele structurele risico’s.

## Belangrijkste bevindingen

### 1. Routes en navigatie

Er zijn 51 routes gedefinieerd, waaronder publieke, student-, teacher- en adminroutes.

Status:
- Publieke routes bestaan: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/privacy`, `/terms`, `/pricing`, `/faq`, `/install`.
- Studentroutes bestaan: dashboard, self-study, oefeningen, live lessons, recordings, forum, chat, calendar, progress, gamification, helpdesk, settings.
- Teacherroutes bestaan: dashboard, content studio, lessons, recordings, exercises, materials, submissions.
- Adminroutes bestaan: dashboard, users, teachers, classes, enrollments, levels, placements, payments, discounts, faq, reports, invitations, analytics, final exams, design system.

Onvolledig of verdacht:
- `/privacy`, `/terms`, `/install`, `/apply-teacher` bestaan wel, maar staan niet in de hoofdnavigatie. Dat is deels logisch, maar `/apply-teacher` is waarschijnlijk wel een echte gebruikersflow en is moeilijk vindbaar.
- Routebescherming is aanwezig via `ProtectedRoute`, maar er is geen volledige test die alle routes per rol systematisch valideert.
- De sidebar toont voor admins en teachers ook student/leerroutes. Dat kan bedoeld zijn, maar moet expliciet gevalideerd worden tegen de gewenste rolrechten.

### 2. Knoppen en klikbare acties

Status:
- Er zijn veel werkende acties aanwezig: login, registratie, password reset, navigatie, uploads, teacher review, chat, forum, helpdesk, betalingen/inschrijvingen, adminbeheer.
- Er is basis e2e-dekking voor meerdere modules.

Problemen/risico’s:
- Op `/admin/design-system` gebruikt de pagina voorbeeldlinks met `href="#"`. Dat is oké voor een design showcase, maar telt niet als echte werkende functionaliteit.
- Consolelog toont een React-waarschuwing: `Function components cannot be given refs`, veroorzaakt door `StatsCard` op `DesignSystemPage`. Dit is geen crash, maar wel een echte bug/kwaliteitsschuld.
- Meerdere upload- en backendacties gebruiken nog direct de backend client in plaats van de verplichte `apiQuery`, `apiMutate`, `apiInvoke` wrappers. Dat breekt de projectregel en maakt foutafhandeling inconsistent.
- Niet alle knoppen zijn automatisch getest; vooral admin-CRUD en teacher-workflows hebben gedeeltelijke, niet volledige dekking.

### 3. Vertalingen NL / EN / AR

Vertaalbestanden:
- Nederlands: 841 keys
- Engels: 832 keys
- Arabisch: 820 keys

Ontbrekend:
- Engels mist 13 Nederlandse keys, vooral `pricing.*`.
- Arabisch mist 25 Nederlandse keys, vooral `pricing.*`, `progress.*` en enkele `common.*` keys.
- Er zijn ook 4 extra settings-keys in EN/AR die niet in NL staan.

Onvertaald/verdacht:
- Engels bevat 38 waarden die exact gelijk zijn aan Nederlands. Sommige zijn oké zoals app-afkorting, maar meerdere moeten waarschijnlijk vertaald of bewust bevestigd worden.
- Arabisch lijkt veel completer vertaald dan Engels qua gelijke waarden, maar mist meer keys.

Conclusie: vertalingen zijn niet 100% volledig in alle 3 talen.

### 4. Tests

Aanwezig:
- Vitest-configuratie bestaat.
- Playwright e2e-configuratie bestaat.
- Er zijn veel tests aanwezig: 654 test/it/describe-definities over unit, integratie en e2e.
- CI bevat lint, typecheck, security audit, unit tests, e2e tests, Lighthouse, bundle-size en build.

Probleem:
- `package.json` bevat `test`, maar geen `test:coverage`, terwijl CI `npm run test:coverage` uitvoert. Daardoor zal de CI-unit-teststap falen tenzij dit elders extern wordt opgelost.
- In deze planfase zijn tests niet uitgevoerd. Ik kan pas na goedkeuring daadwerkelijk testcommando’s draaien en fouten oplossen.
- E2E-tests zijn aanwezig, maar veel testen alleen bereikbaarheid/basisstructuur, niet volledig alle knoppen en rolacties.

### 5. Rolgebaseerde toegang

Status:
- AuthContext haalt rol en profiel via `get_user_with_context` op.
- `ProtectedRoute` blokkeert admin- en teacherroutes correct op basis van rol.
- Adminroutes vereisen `admin`.
- Teacherroutes laten `admin` en `teacher` toe.
- Gewone protected routes zijn beschikbaar voor ingelogde gebruikers.

Risico’s:
- Er is geen volledige matrix-test die bevestigt dat student, teacher en admin exact alles kunnen wat voor hen bedoeld is, en niets daarbuiten.
- Directe backend calls buiten wrappers komen voor bij auth, storage, rpc en functies. Auth is meestal logisch, maar storage/rpc/functies moeten waar mogelijk via projectpatronen worden gehard.
- `AppSidebar` gebruikt nog direct `supabase.rpc('count_unassigned_students')`, in strijd met de projectregel “100% usage of wrappers”.

### 6. Bugs en technische problemen

Actuele consolelogs:
- React ref-waarschuwing in `DesignSystemPage` bij `StatsCard`.
- Auth safety timeout-waarschuwing na 3s. Dit hoeft niet fataal te zijn, maar kan wijzen op trage of niet tijdig afgeronde initial session events.

PWA/cache:
- `vite.config.ts` gebruikt geen `VitePWA` meer.
- `index.html` ruimt service workers/caches non-blocking op.
- `package.json` bevat nog wel `vite-plugin-pwa` als dependency. Dat veroorzaakt niet direct runtime caching, maar is een restpunt en kan verwarring of regressie veroorzaken.

CI:
- `npm run test:coverage` ontbreekt in `package.json`; dit is een concrete bug in de pipeline.

## Definitieve herstel- en validatieplanning

### Stap 1: Vertalingen 100% gelijk trekken
- Voeg alle ontbrekende EN-keys toe.
- Voeg alle ontbrekende AR-keys toe.
- Verwijder of harmoniseer extra keys die alleen in EN/AR bestaan, tenzij ze bewust gebruikt worden.
- Voeg een i18n-consistency test toe die faalt zodra NL/EN/AR niet exact dezelfde keyset hebben.
- Rapporteer na afloop exact hoeveel keys per taal aanwezig zijn.

### Stap 2: Route- en rolmatrix toevoegen
- Maak een centrale testmatrix voor routes:
  - publiek
  - gast
  - student
  - teacher
  - admin
- Test minimaal dat:
  - gasten protected routes niet kunnen gebruiken;
  - studenten admin/teacher routes niet kunnen gebruiken;
  - teachers teacherroutes wel kunnen gebruiken;
  - admins adminroutes wel kunnen gebruiken;
  - redirects logisch zijn.
- Controleer of `/apply-teacher` zichtbaar moet worden in navigatie voor studenten/gebruikers. Als de huidige flow bedoeld is, voeg zichtbaarheid toe; als niet, documenteer/laat route bestaan als directe flow.

### Stap 3: Concrete bugs oplossen
- Fix de `StatsCard` ref-waarschuwing door `StatsCard` met `React.forwardRef` compatibel te maken of het ref-gebruik in de showcase te vermijden.
- Verwijder PWA-restanten uit dependencies/configuratie waar veilig, zodat de eerdere cachebug niet kan terugkomen.
- Voeg een test toe die controleert dat er geen `VitePWA`-configuratie actief is.
- Controleer de auth safety timeout en verhoog/verduidelijk de fallback indien nodig, zodat dit niet tot foutieve UI-status leidt.

### Stap 4: Knoppen en flows controleren
- Voeg/verbeter tests voor kernknoppen:
  - auth: login, register, forgot/reset password;
  - student: oefeningen navigeren/submitten, chat/forum/helpdesk basisacties;
  - teacher: les aanmaken, materiaal/recording upload openen, submissions review;
  - admin: users/classes/levels/payments/discounts/enrollments basisacties.
- Verwijder of markeer voorbeeldlinks (`href="#"`) op design-only pagina’s zodat ze niet als echte functionaliteit worden gezien.

### Stap 5: API-wrapper naleving opschonen
- Vervang directe data/rpc/function calls waar passend door `apiQuery`, `apiMutate`, `apiInvoke` of een kleine wrapper-helper.
- Auth-calls blijven via auth client waar logisch.
- Storage-calls krijgen consistente validatie, foutafhandeling en toastfeedback.
- Geen wijzigingen aan automatisch gegenereerde backend client/types.

### Stap 6: CI/testscript herstellen en tests uitvoeren
- Voeg ontbrekend `test:coverage` script toe aan `package.json`.
- Voer daarna uit:
  - unit/integratietests;
  - relevante e2e-tests;
  - lint/typecheck via de automatische harness;
  - eventueel gerichte browsercontrole op de eerder problematische routes.
- Los failures op tot de route-, i18n-, rol- en regressietests slagen.

## Verwacht eindrapport na uitvoering

Na goedkeuring lever ik een rapport met:
- lijst van aangepaste bestanden;
- route-overzicht per rol;
- i18n-overzicht met keycounts NL/EN/AR;
- gevonden en opgeloste bugs;
- testresultaten: welke tests zijn uitgevoerd en welke status ze hebben;
- resterende beperkingen als iets niet betrouwbaar automatisch testbaar is.