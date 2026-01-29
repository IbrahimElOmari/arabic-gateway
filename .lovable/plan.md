

# Backend Services Implementatieplan

## Overzicht Huidige Status

Na analyse van de codebase blijkt dat veel fundamenten al aanwezig zijn:

| Component | Status |
|-----------|--------|
| `exercises` tabel met `release_date` | ✅ Aanwezig |
| `stripe-checkout` edge function | ✅ Volledig |
| `stripe-webhook` edge function | ✅ Alle events afgehandeld |
| `send-email` edge function | ✅ 8 email templates in 3 talen |
| `lessons` tabel met `meet_link` | ✅ Aanwezig |
| `lesson_recordings` tabel | ✅ Aanwezig |
| Niveau-test systeem | ❌ Ontbreekt |
| Cron-job voor oefeningen | ❌ Ontbreekt |
| Auto-grading functie | ❌ Ontbreekt |

---

## Te Implementeren Backend Services

### 1. Cron-job: Automatische Oefening Vrijgave (elke 2 dagen)

**Doel**: Oefeningen automatisch beschikbaar maken voor ingeschreven leerlingen op basis van `release_date`.

**Aanpak**:
- Nieuwe edge function: `release-exercises/index.ts`
- Controleert `exercises` tabel waar `release_date <= now()` en `is_published = false`
- Update `is_published` naar `true` en stuurt notificatie email naar ingeschreven studenten
- Aanroepen via pg_cron elke 2 dagen

**Database wijzigingen**: Geen (gebruikt bestaande `release_date` kolom)

---

### 2. Auto-Grading Functie met Notificaties

**Doel**: Multiple choice en checkbox vragen automatisch beoordelen na inlevering.

**Aanpak**:
- Nieuwe edge function: `grade-submission/index.ts`
- Wordt getriggerd na student antwoord inlevering
- Vergelijkt `student_answers.answer_data` met `questions.correct_answer`
- Update `student_answers.score` en `student_answers.is_correct`
- Update `exercise_attempts.total_score` en `passed` status
- Stuurt email notificatie naar student én docent

**Logica**:
```text
Voor elke vraag in de poging:
  1. Haal vraagtype op (multiple_choice, checkbox, open_text, etc.)
  2. Als auto-gradable (multiple_choice of checkbox):
     - Vergelijk antwoord met correct_answer
     - Bereken score op basis van punten
  3. Als handmatig (open_text, audio, file):
     - Markeer als "awaiting_review"
  4. Totaal score = som van alle behaalde punten / max punten
  5. passed = total_score >= exercise.passing_score
```

---

### 3. Stripe Webhook Uitbreiding (PCI-Compliant)

**Huidige status**: De webhook handelt al af:
- `checkout.session.completed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

**Uitbreiding**:
- Ondersteuning voor `invoice.paid` event toevoegen
- Enrollment bevestigings-email versturen na succesvolle betaling
- Admin notificatie bij mislukte betalingen

**PCI Compliance**: Al gegarandeerd door Stripe SDK (tokenized payments, geen kaartgegevens op server)

---

### 4. Niveau-Test Systeem

**Doel**: Na registratie krijgt de leerling een uitnodiging voor een intake meeting; admin/teacher beoordeelt en wijst niveau toe.

**Database wijzigingen**:
Nieuwe tabel `placement_tests`:
| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | uuid | Primary key |
| user_id | uuid | FK naar auth.users |
| scheduled_at | timestamptz | Geplande meeting tijd |
| meet_link | text | Google Meet link |
| status | enum | pending, scheduled, completed, cancelled |
| assigned_level_id | uuid | Toegewezen niveau na beoordeling |
| assessed_by | uuid | Teacher/admin die beoordeeld heeft |
| assessment_notes | text | Notities van de beoordeling |
| created_at | timestamptz | Aanmaakdatum |

**Workflow**:
1. Na registratie → student krijgt status "awaiting_placement"
2. Admin/teacher plant meeting → `scheduled_at` en `meet_link` worden ingevuld
3. Email notificatie naar student met meeting link
4. Na meeting → teacher vult beoordeling in
5. Student wordt automatisch toegevoegd aan starter-klas van toegewezen niveau

---

### 5. Google Meet Link Generatie

**Huidige status**: `lessons.meet_link` bestaat al voor handmatige invoer.

**Uitbreiding opties**:

**Optie A - Handmatige links (huidige aanpak)**:
- Teacher voert Google Meet link handmatig in
- Geen API integratie nodig
- Werkt direct

**Optie B - Google Calendar API integratie**:
- Vereist Google Cloud project + OAuth consent
- Complexe setup met service account
- Automatisch Meet links genereren

**Aanbeveling**: Optie A behouden (handmatige links) is voldoende voor MVP. Google API integratie kan later worden toegevoegd.

---

## Implementatieplan

### Fase 1: Database Schema (Migrations)

1. **Tabel `placement_tests`**:
```sql
CREATE TYPE placement_status AS ENUM ('pending', 'scheduled', 'completed', 'cancelled');

CREATE TABLE public.placement_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    scheduled_at TIMESTAMPTZ,
    meet_link TEXT,
    status placement_status NOT NULL DEFAULT 'pending',
    assigned_level_id UUID REFERENCES public.levels(id),
    assessed_by UUID,
    assessment_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.placement_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own placement tests"
    ON public.placement_tests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins and teachers can manage placement tests"
    ON public.placement_tests FOR ALL
    USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'))
    WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'));
```

2. **Trigger voor nieuwe gebruikers**:
```sql
CREATE OR REPLACE FUNCTION public.create_placement_test_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.placement_tests (user_id, status)
    VALUES (NEW.id, 'pending');
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_user_create_placement
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_placement_test_for_new_user();
```

---

### Fase 2: Edge Functions

1. **`release-exercises/index.ts`**
   - Query exercises waar `release_date <= now()` en `is_published = false`
   - Update naar `is_published = true`
   - Stuur email notificaties naar ingeschreven studenten

2. **`grade-submission/index.ts`**
   - Input: `exercise_attempt_id`
   - Auto-grade multiple choice en checkbox vragen
   - Bereken totaal score
   - Update attempt record
   - Stuur feedback email

3. **`schedule-placement/index.ts`**
   - Input: `user_id`, `scheduled_at`, `meet_link`
   - Update placement_test record
   - Stuur email met meeting uitnodiging

4. **`complete-placement/index.ts`**
   - Input: `placement_test_id`, `assigned_level_id`, `notes`
   - Update placement status naar 'completed'
   - Maak automatisch class enrollment aan voor starter-klas

---

### Fase 3: Cron Jobs (pg_cron)

Na het inschakelen van pg_cron extensie:

```sql
-- Oefeningen vrijgeven elke 2 dagen om 06:00
SELECT cron.schedule(
    'release-exercises-job',
    '0 6 */2 * *',
    $$
    SELECT net.http_post(
        url:='https://ugftwkpbmvbmgmpzhmtc.supabase.co/functions/v1/release-exercises',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ANON_KEY"}'::jsonb,
        body:='{}'::jsonb
    );
    $$
);

-- GDPR data retention dagelijks om 02:00
SELECT cron.schedule(
    'gdpr-retention-job',
    '0 2 * * *',
    $$SELECT process_data_retention();$$
);

-- Lesherinneringen elk uur
SELECT cron.schedule(
    'lesson-reminders-job',
    '0 * * * *',
    $$
    SELECT net.http_post(
        url:='https://ugftwkpbmvbmgmpzhmtc.supabase.co/functions/v1/send-lesson-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ANON_KEY"}'::jsonb,
        body:='{}'::jsonb
    );
    $$
);
```

---

### Fase 4: Frontend Integratie

1. **Admin Placement Management pagina** (`/admin/placements`)
   - Lijst van pending placement tests
   - Schedule meeting functionaliteit
   - Beoordeling formulier

2. **Student Dashboard uitbreiding**
   - Toon placement test status
   - Meeting link zichtbaar wanneer scheduled

---

## Bestanden Te Creëren

| Bestand | Doel |
|---------|------|
| `supabase/functions/release-exercises/index.ts` | Cron job voor oefening vrijgave |
| `supabase/functions/grade-submission/index.ts` | Auto-grading functie |
| `supabase/functions/schedule-placement/index.ts` | Niveau-test scheduling |
| `supabase/functions/complete-placement/index.ts` | Niveau-test afronding |
| `supabase/functions/send-lesson-reminders/index.ts` | Lesherinnering cron |
| `src/pages/admin/PlacementsPage.tsx` | Admin placement management UI |
| `src/i18n/locales/*.json` | Vertalingen voor placement systeem |

---

## Technische Details

### Auto-Grading Algoritme

```text
function gradeSubmission(attemptId):
    attempt = getAttempt(attemptId)
    exercise = getExercise(attempt.exercise_id)
    questions = getQuestions(exercise.id)
    answers = getStudentAnswers(attemptId)
    
    totalPoints = 0
    earnedPoints = 0
    
    for each question in questions:
        answer = answers.find(q => q.question_id == question.id)
        totalPoints += question.points
        
        if question.type in ['multiple_choice', 'checkbox']:
            if answer.answer_data == question.correct_answer:
                earnedPoints += question.points
                answer.is_correct = true
                answer.score = question.points
            else:
                answer.is_correct = false
                answer.score = 0
        else:
            // Open vragen: markeer voor review
            answer.is_correct = null
            answer.score = null
    
    percentageScore = (earnedPoints / totalPoints) * 100
    passed = percentageScore >= exercise.passing_score
    
    update attempt:
        total_score = percentageScore
        passed = passed
        submitted_at = now()
```

### Email Notificatie Types

Nieuwe email templates toe te voegen aan `send-email/index.ts`:
- `exercise_released`: Nieuwe oefening beschikbaar
- `placement_scheduled`: Niveau-test gepland
- `placement_completed`: Niveau toegewezen

---

## Vereiste Configuratie

1. **pg_cron extensie**: Moet worden ingeschakeld in Supabase dashboard
2. **pg_net extensie**: Voor HTTP calls vanuit cron jobs
3. **RESEND_API_KEY**: Voor email notificaties
4. **STRIPE_SECRET_KEY** & **STRIPE_WEBHOOK_SECRET**: Voor betalingen (optioneel tot Stripe account actief is)

---

## Voltooiingsoverzicht Na Implementatie

| Feature | Voor | Na |
|---------|------|-----|
| Automatische oefening vrijgave | 0% | 100% |
| Auto-grading systeem | 0% | 100% |
| Stripe webhook (uitgebreid) | 90% | 100% |
| Niveau-test systeem | 0% | 100% |
| Lesherinneringen cron | 0% | 100% |
| Google Meet integratie | 50% (handmatig) | 50% (blijft handmatig) |

