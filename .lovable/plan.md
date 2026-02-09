
Doel (volgens jouw criteria)
- Zorgen dat Admin en Leerkracht via een zichtbare, vindbare UI content kunnen aanmaken/bewerken/publiceren en dat Leerlingen die content effectief kunnen gebruiken.
- Oplossen van het concrete probleem uit je screenshots: je ziet op studentpagina’s (/self-study/reading, /self-study/speaking, /live-lessons) geen knoppen om content te maken, en je geraakt niet “vlot” in de admin/leerkrachtmodules waar die knoppen wél horen te staan.

Analyse van de screenshots + echte oorzaak
1) Je screenshots tonen student-UI routes
- /self-study/reading en /self-study/speaking zijn student “consumption” pagina’s (CategoryPage). Die tonen alleen oefeningen die:
  - is_published = true
  - release_date <= nu
- /live-lessons is ook een student “consumption” pagina (LiveLessonsPage): toont enkel aankomende lessen.

=> Op deze routes is het normaal dat er geen “Create” knoppen staan voor studenten. Voor admin/leerkracht moet er wél altijd een duidelijke “Content beheren / Content Studio” ingang zichtbaar zijn.

2) Admin kan momenteel vaak niet in /admin of /teacher UI blijven (race-condition met rol laden)
- Ik heb dit gereproduceerd in de preview met de browser-tool: bij navigeren naar /admin/classes kwam ik terug op /dashboard.
- Tegelijk toont de netwerkresponse dat jouw user_roles echt “admin” teruggeeft.
- Dit wijst op een timing-probleem: de app zet loading=false voordat role opgehaald is, waardoor AdminLayout/TeacherLayout soms role === null zien en je meteen terugsturen naar /dashboard. Resultaat: adminfunctionaliteiten “bestaan” in code, maar zijn in de praktijk niet betrouwbaar zichtbaar/toegankelijk.

3) Zelfs als de leerkracht oefening publiceert, verschijnen ze vaak niet in studentpagina’s (release_date probleem)
- TeacherExercisesPage laat “publish” togglen, maar zet geen release_date.
- CategoryPage filtert op release_date <= nu. Als release_date null is, zie je “No exercises available…”, zelfs al bestaan er oefeningen.
=> Dit maakt het lijken alsof “er is geen functionaliteit”, terwijl de creator UI elders zit en de release-logica niet correct gekoppeld is.

Wat dit plan dus oplost
A. Admin/Leerkracht modules worden altijd toegankelijk (geen redirect-race).
B. Admin/Leerkracht krijgen overal een zichtbare “Content beheren” ingang (Header + Dashboard + empty states).
C. Content Studio wordt werkelijk “centraal”: class-keuze wordt onthouden en doorgegeven aan alle contentmodules.
D. Oefeningen/lessen die admin/leerkracht maakt, verschijnen daadwerkelijk bij leerlingen (release_date + class filtering).
E. Bewijs leveren: automatische E2E checks + zichtbare “audit”-punten in de UI (data-testid) + screenshots na implementatie.

Fase 1 — Toegang & zichtbaarheid herstellen (kritiek, lost “geen knoppen” gevoel op)
1.1 Auth/Role loading fix (root cause)
- Aanpassen AuthContext zodat loading pas false wordt nadat role én profile zijn opgehaald (of een expliciete roleLoading/profileLoading).
- AdminLayout en TeacherLayout: wanneer user bestaat maar role nog null/undefined is, toon loader i.p.v. redirect.
Acceptatie:
- Als admin direct naar /admin/classes gaat (refresh inbegrepen), blijft hij op /admin/classes en ziet de sidebar + “Create Class” UI.
- Als leerkracht naar /teacher/exercises gaat, blijft hij daar en ziet “Create Exercise”.

1.2 /dashboard rol-gestuurd maken (zodat admin niet op student-dashboard blijft “hangen”)
- Maak /dashboard een “DashboardRouter”:
  - admin -> redirect /admin
  - teacher -> redirect /teacher
  - student -> huidige DashboardPage (student dashboard)
Acceptatie:
- Admin die /dashboard opent ziet adminomgeving automatisch.
- Leerkracht die /dashboard opent ziet leerkrachtomgeving automatisch.

1.3 Header navigatie uitbreiden (zichtbare UI ingang)
- In Header (desktop én mobile sheet):
  - Voor admin: extra link “Beheer” (naar /admin) + “Content Studio” (naar /teacher/content-studio of nieuwe /admin/content-studio).
  - Voor leerkracht: link “Content Studio” (naar /teacher/content-studio) + “Leerkracht” (naar /teacher).
- In avatar dropdown: dezelfde ingangen (altijd zichtbaar voor juiste rol).
Acceptatie:
- Op elke pagina (ook /self-study/reading), ziet admin/leerkracht een duidelijke knop/link om naar beheer/contentstudio te gaan.

Fase 2 — Content Studio echt centraal + class-keuze afdwingen/onthouden
2.1 “Actieve klas” state die overal geldt
- Introduceer een lichte ClassContext/ActiveClass mechanism:
  - activeClassId wordt opgeslagen in localStorage (bijv. hva_active_class_id)
  - ContentStudioPage zet activeClassId bij selectie
  - Teacher pages lezen activeClassId en gebruiken het als default filter en default in create dialogs

2.2 Teacher/Admin content pages gebruiken dezelfde class-toegang logica
- Maak 1 gedeelde hook: useAccessibleClasses()
  - admin: alle actieve classes
  - teacher: classes waar teacher_id = user.id
- Vervang op deze pagina’s de huidige “teacher_id filter” queries:
  - TeacherDashboard
  - TeacherExercisesPage
  - TeacherLessonsPage
  - TeacherRecordingsPage
  - TeacherSubmissionsPage
  - TeacherMaterialsPage
Door: useAccessibleClasses() + activeClassId filter.
Acceptatie:
- Admin kan in teacher-modules content maken voor eender welke klas (na selectie).
- Leerkracht ziet enkel eigen klassen.
- Als leerkracht meerdere klassen heeft: eerst klas kiezen (UI zichtbaar), daarna content maken.

2.3 UI vereiste “eerst klas kiezen” afdwingen
- Bovenaan elke teacher content pagina:
  - Toon ClassSelector component.
  - Als meerdere klassen en activeClassId leeg: blokkeer create-knoppen met duidelijke melding “Selecteer eerst een klas”.
Acceptatie:
- Geen verborgen flow: gebruiker ziet altijd waarom hij niet kan creëren.

Fase 3 — Student ziet content echt verschijnen (fix release + filtering)
3.1 Oefeningen: release_date + publish flow correct maken
- Integreren van ExerciseReleaseSettings in TeacherExercisesPage:
  - Per exercise row: knop “Publicatie” (open dialog) met:
    - release_date (default: nu)
    - due_date (optioneel)
    - is_published (toggle)
    - “Handmatig publiceren”
    - “Verbergen”
- Bij “Publish ON” als release_date leeg is: automatisch release_date = nu zetten.
Acceptatie:
- Na aanmaken + publiceren verschijnt oefening in /self-study/{category} voor de juiste klas.

3.2 Student routes filteren op student’s klas
- CategoryPage: filter exercises ook op class_id van de ingelogde student (via class_enrollments).
- LiveLessonsPage: filter lessons ook op student’s class_id.
Acceptatie:
- Leerling ziet alleen content van zijn eigen klas.
- Dit voorkomt ook “leeg” door RLS/filters mismatch en is functioneel correct volgens jouw rolmodel.

3.3 Empty state CTA’s voor admin/leerkracht op studentpagina’s (zichtbaarheid)
- Op /self-study/:category als leeg en role in {admin, teacher}:
  - Toon extra knop “Maak oefening aan” -> Content Studio / TeacherExercisesPage met category preselect + activeClassId.
- Op /live-lessons als leeg en role in {admin, teacher}:
  - Toon extra knop “Plan live les” -> TeacherLessonsPage met class preselect.
Acceptatie:
- Screenshots zoals die van jou hebben dan wél duidelijke knoppen (voor admin/leerkracht) zelfs in lege staat.

Fase 4 — “Bewijs” leveren dat het zichtbaar + functioneel is (zonder claims)
4.1 In-app “bewijs” = zichtbare UI elementen + testIDs
- Voeg data-testid toe op kritieke UI elementen:
  - header-admin-link, header-content-studio-link
  - admin-classes-create-button
  - teacher-exercises-create-button
  - teacher-lessons-new-button
  - exercise-release-settings-button
  - submissions-review-dialog-open
Doel: objectief aantoonbaar (geautomatiseerd) dat knoppen bestaan.

4.2 Playwright E2E smoke flows (bewijs via CI + lokaal reproduceerbaar)
- Maak/Update E2E tests:
  - Admin: login -> nav /admin/classes -> verwacht “Create Class” zichtbaar -> open dialog
  - Admin: nav -> Content Studio -> select class -> open Exercises -> create exercise -> publish -> check zichtbaar in student category (via student account)
  - Teacher: login -> Content Studio -> create lesson -> check zichtbaar voor student in /live-lessons
- Laat tests screenshots nemen op sleutelstappen (Playwright screenshot) zodat je letterlijk beeldbewijs hebt.

4.3 Handmatige “bewijs” deliverable na implementatie (door mij)
- Na implementatie maak ik met de browser-tool screenshots op:
  - /dashboard (admin -> redirect /admin zichtbaar)
  - /admin/classes (create/edit/delete zichtbaar)
  - /teacher/content-studio (class selector zichtbaar)
  - /teacher/exercises (create + publicatie instellingen zichtbaar)
  - /self-study/reading (na publiceren: oefening zichtbaar)
  - /live-lessons (na plannen: les zichtbaar)
Deze screenshots worden meegestuurd in mijn eindrapport.

Fase 5 — Kleine UX/i18n issues die je screenshots ook tonen (quick wins)
- Vertalingfix: “nav.gamification” ontbreekt op dashboard (key ontbreekt in i18n of wordt fout gebruikt).
- Labels en CTA’s vertalen in NL/EN/AR en RTL-layout check voor de nieuwe knoppen.

Wat je na deze uitvoering wél ziet (concreet, UI-locaties)
- Top navigatie (header): “Beheer” en/of “Content Studio” voor admin/leerkracht.
- /dashboard: admin gaat automatisch naar admin dashboard, teacher naar teacher dashboard.
- /self-study/reading of /live-lessons (lege staat): admin/leerkracht ziet “Maak oefening aan” / “Plan live les” knoppen.
- Teacher pages: altijd een ClassSelector bovenaan; create knoppen werken pas na class selectie (zichtbaar en duidelijk).

Risico’s / afhankelijkheden
- Als er RLS policies bestaan die admin/teacher toegang beperken, moeten we die in dezelfde iteratie nalopen en corrigeren. (De UI kan pas “echt werken” als writes/reads ook toegestaan zijn per rol.)
- Als exercises.release_date in DB geen column/default heeft of constraints, moeten we een kleine backend schema update doen (migration) om release_date consistent te maken.

Acceptatiecriteria (strikt volgens jouw regels)
Een feature uit dit onderdeel is pas “100%” wanneer:
- Admin/Leerkracht:
  - via UI bereikbaar (zonder URL handmatig typen)
  - via UI kan creëren/bewerken/publiceren
  - voor de juiste klas (met expliciete keuze bij >1 klas)
- Leerling:
  - kan de gepubliceerde content via UI zien en gebruiken
- UI is zichtbaar in NL/EN/AR (RTL correct)
- E2E test bevestigt aanwezigheid van de knoppen + basisflow werkt, met screenshots als artefact.

Volgorde van implementatie (zodat je snel resultaat ziet)
1) Role-loading fix + /dashboard router + header links (lost 80% van het “geen knoppen zichtbaar” probleem direct op)
2) ClassContext + useAccessibleClasses + integratie op teacher/admin pages
3) Release settings integreren + publish zet release_date + student filters op class
4) Empty state CTA’s op studentpagina’s voor admin/leerkracht
5) E2E tests + screenshots + i18n/RTL polish

Resultaat: jouw exacte screenshots zouden na stap 1 en 4 al duidelijke knoppen tonen, en na stap 3 zouden “No exercises available” en “Geen aankomende lessen” verdwijnen zodra je content aanmaakt en publiceert via de UI.