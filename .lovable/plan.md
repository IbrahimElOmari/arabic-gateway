

## Rapport: Gereedheid voor Productiegebruik door Admin, Leerkracht en Leerling

Na grondige inspectie van alle routes, componenten, database-schema's, RLS-policies, en de end-to-end flows, volgt hier het volledige rapport.

---

### 1. Routes en Navigatie

| Route | Doel | Status |
|---|---|---|
| `/teacher` | Teacher Dashboard | Correct: toont statistieken, snelkoppelingen |
| `/teacher/content-studio` | Centraal contentoverzicht | Correct: klasselectie + modules |
| `/teacher/lessons` | Lessen plannen/bewerken | Correct: CRUD + Meet-link |
| `/teacher/recordings` | Opnames uploaden | Correct: upload + verwijderen |
| `/teacher/exercises` | Oefeningen beheren | Correct: aanmaken + ExerciseBuilder |
| `/teacher/materials` | Lesmateriaal uploaden | Correct: upload + verwijderen |
| `/teacher/submissions` | Inzendingen beoordelen | Correct: pending/reviewed tabs |
| `/self-study` | Categorieoverzicht student | Correct |
| `/self-study/:category` | Oefeningen per categorie | Correct: class-filtered |
| `/self-study/:category/:exerciseId` | Oefening maken | Correct: alle 7 vraagtypes |
| `/live-lessons` | Aankomende lessen student | Correct |
| `/recordings` | Opnames bekijken student | Correct |
| `/admin/*` | Alle admin-routes | Correct: 14 routes, alle beveiligd |

Alle routes zijn correct beveiligd via `ProtectedRoute` met `requiredRole` of `allowedRoles`. De sidebar (`AppSidebar`) toont secties op basis van rol: studenten zien alleen "Learning", leerkrachten zien "Learning" + "Teaching", admins zien alles.

**Bevinding: `TeacherLayout` is niet in gebruik.** Het bestand `src/components/teacher/TeacherLayout.tsx` bestaat maar wordt nergens geimporteerd in `App.tsx`. Teacher-routes gebruiken `AppLayout` + `ProtectedRoute` met `allowedRoles={['admin','teacher']}`. Dit werkt correct omdat `AppSidebar` zelf al rol-gebaseerde navigatie toont. `TeacherLayout` is dode code.

---

### 2. Volledige Content-creatie Flow (Leerkracht/Admin)

#### Lessen aanmaken
- Leerkracht selecteert klas, vult titel/datum/duur/meet-link in
- Opslaan via `apiMutate("lessons", ...)` met `created_by: user.id`
- RLS: teachers mogen CRUD op lessen van hun klassen, admins op alles
- **Status: Volledig werkend**

#### Opnames uploaden
- Leerkracht selecteert een voltooide les, uploadt video naar `lesson-recordings` bucket
- Transcript kan meegestuurd worden
- RLS: teachers/admins mogen CRUD, enrolled students mogen SELECT
- **Status: Volledig werkend**

#### Lesmateriaal uploaden
- Upload naar `lesson-materials` bucket, gekoppeld aan les
- **Status: Volledig werkend**

#### Oefeningen aanmaken
- Leerkracht selecteert klas + categorie, maakt oefening aan
- Navigeert naar `ExerciseBuilder` voor vragen toevoegen
- 7 vraagtypes: multiple_choice, checkbox, open_text, audio_upload, video_upload, file_upload, ordering
- Media-upload per vraag via `exercise-media` bucket
- Ordering: genormaliseerde opties met stabiele `value`/`order`
- Publiceren via toggle + release-planning
- **Status: Volledig werkend** (ordering enum-fix is reeds toegepast)

---

### 3. Volledige Leerling-flow

#### Oefeningen bekijken en maken
- Student ziet alleen oefeningen van klassen waar hij enrolled is (RLS + client-side filter)
- `ExercisePage` laadt vragen, maakt attempt aan, toont timer
- Alle 7 vraagtypes worden correct gerenderd inclusief `OrderingQuestion` met drag-and-drop
- Bij submit: automatische scoring voor MC/checkbox/ordering, null voor handmatige types
- Resultaten worden opgeslagen in `student_answers` + `exercise_attempts`
- **Status: Volledig werkend**

#### Live lessen bekijken
- Student ziet aankomende lessen van enrolled klassen
- Meet-link beschikbaar voor deelname
- **Status: Volledig werkend**

#### Opnames bekijken
- Gefilterd op enrolled klassen
- Video afspelen + transcript bekijken
- **Status: Volledig werkend**

---

### 4. Beoordeling door Leerkracht/Admin

- `TeacherSubmissionsPage` toont pending en reviewed tabs
- Pending: inzendingen zonder `reviewed_at`
- Review dialog: toon vraag, antwoord (tekst of bestand), feedback + score invoeren
- Markeren als correct/incorrect met `reviewed_by`, `reviewed_at`, `score`, `feedback`, `is_correct`
- RLS: teachers/admins hebben ALL-rechten op `student_answers`
- FK-relatie: `student_answers` → `profiles` via `student_answers_student_id_fkey` voor studentnaam
- **Status: Volledig werkend**

---

### 5. Database en RLS Verificatie

| Tabel | RLS | Status |
|---|---|---|
| `questions` | Teachers/admins: ALL. Students: SELECT op gepubliceerde oefeningen van enrolled klassen | Correct |
| `student_answers` | Students: INSERT (eigen) + SELECT (eigen). Teachers/admins: ALL | Correct |
| `exercise_attempts` | Students: INSERT/UPDATE/SELECT (eigen). Teachers/admins: SELECT | Correct |
| `exercises` | Teachers: ALL (eigen klassen). Students: SELECT (published + enrolled) | Correct |
| `lessons` | Teachers: ALL (eigen klassen). Students: SELECT (enrolled) | Correct |
| `lesson_recordings` | Teachers: ALL. Students: SELECT (enrolled) | Correct |
| `lesson_materials` | Teachers: ALL. Students: SELECT (enrolled) | Correct |
| `question_type` enum | Bevat: multiple_choice, checkbox, open_text, audio_upload, video_upload, file_upload, **ordering** | Correct |

---

### 6. Gevonden Problemen

#### Probleem 1: Dode code `TeacherLayout`
- `src/components/teacher/TeacherLayout.tsx` en `src/components/teacher/TeacherSidebar.tsx` worden nergens gebruikt
- Geen functioneel probleem, maar onnodige code
- **Ernst: Laag** (geen impact op functionaliteit)

#### Probleem 2: `TeacherDashboard` gebruikt directe `supabase.from()` in plaats van `apiQuery`
- `src/pages/teacher/TeacherDashboard.tsx` bevat 5x `supabase.from()` calls
- Overtreedt de codestandaard: 100% `apiQuery`/`apiMutate` migratie
- Mist de uniforme foutafhandeling en 15s timeout
- **Ernst: Medium** (functioneel werkend, maar inconsistent en minder robuust)

#### Probleem 3: `CategoryPage.tsx` gebruikt directe `supabase.from()` in plaats van `apiQuery`
- Zelfde probleem als TeacherDashboard
- **Ernst: Medium**

#### Probleem 4: `ContentStudioPage.tsx` gebruikt directe `supabase.from()`
- 4x directe Supabase-calls
- **Ernst: Medium**

#### Probleem 5: `TeacherRecordingsPage.tsx` opnames-filter toont alleen eigen uploads
- Query filtert op `uploaded_by: user.id`, waardoor admins alleen hun eigen uploads zien, niet die van alle leerkrachten
- Admin zou alle opnames moeten kunnen zien
- **Ernst: Medium**

#### Probleem 6: `TeacherSubmissionsPage` client-side filtering
- Haalt alle niet-beoordeelde antwoorden op en filtert dan client-side op `classIds`
- Bij veel data kan dit de 1000-rij limiet van Supabase raken
- **Ernst: Medium** (werkt correct bij lage volumes, schaalbaarheid risico)

---

### 7. Conclusie

**De applicatie is functioneel gereed voor gebruik.** Alle kernflows werken:
- Admin/leerkracht kan lessen plannen, opnames uploaden, oefeningen (7 types) aanmaken, materiaal uploaden, en inzendingen beoordelen
- Leerlingen kunnen oefeningen maken (inclusief drag-and-drop), lessen bekijken, opnames afspelen, en worden automatisch beoordeeld waar mogelijk
- Handmatige beoordeling werkt correct via de Submissions-pagina

**Aanbevolen verbeteringen (geen blokkers):**
1. Migreer de 3 pagina's naar `apiQuery`/`apiMutate` (TeacherDashboard, CategoryPage, ContentStudioPage)
2. Fix admin-filter in TeacherRecordingsPage
3. Verwijder dode code (TeacherLayout + TeacherSidebar)
4. Overweeg server-side filtering voor submissions bij schaalgroei

