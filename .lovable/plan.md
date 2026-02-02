
# Volledige Implementatieplan: 5 Features naar 100%

## Huidige Situatie per Feature

### 1. Audio/Video Upload (35% → 100%)
**Probleem**: `ExercisePage.tsx` regel 402-411 toont OpenTextQuestion voor audio_upload, video_upload en file_upload types. Geen echte media upload UI.

**ExerciseBuilder.tsx** mist ook `audio_upload` en `video_upload` als selecteerbare vraagtypen (alleen `multiple_choice`, `checkbox`, `open_text`, `file_upload` op regel 46).

### 2. Professional/Playful Theme (40% → 100%)
**Probleem**: `ThemeContext.tsx` ondersteunt alleen `light | dark | system`. `SettingsPage.tsx` appearance tab (regel 148-163) toont alleen placeholder tekst, geen toggle.

Database `profiles.preferred_theme` bestaat maar wordt niet gebruikt.

### 3. Eindtoets Niveauprogressie (40% → 100%)
**Probleem**: Alleen `placement_tests` tabel voor intake. Geen eindtoets-systeem waarmee studenten naar volgend niveau kunnen promoveren.

### 4. Moderatie Report Button (85% → 100%)
**Probleem**: `ReportContentDialog.tsx` is volledig (144 regels), maar `ForumPostPage.tsx` en `ForumRoomPage.tsx` importeren deze component niet en tonen geen report knop.

### 5. CI/CD Coverage (70% → 100%)
**Probleem**: 
- `vitest.config.ts` mist coverage configuratie
- `.github/workflows/node.js.yml` runt alleen `npm test`, geen coverage of Playwright
- 8 unit tests aanwezig, maar geen coverage rapportage
- Playwright config aanwezig maar niet in CI

---

## Implementatie Details

### 1. Audio/Video Upload Componenten

**Nieuwe bestanden:**
- `src/components/exercises/questions/AudioUploadQuestion.tsx`
- `src/components/exercises/questions/VideoUploadQuestion.tsx`  
- `src/components/exercises/questions/FileUploadQuestion.tsx`

**AudioUploadQuestion.tsx functionaliteit:**
- Native `MediaRecorder` API voor browser-opname
- Start/stop opname knoppen
- Audio playback preview met `<audio>` element
- Upload naar Supabase Storage `student-uploads` bucket
- Fallback file input voor bestaande audio bestanden
- Progress indicator tijdens upload
- Ondersteunde formaten: webm, mp3, wav, ogg

**VideoUploadQuestion.tsx functionaliteit:**
- Native `MediaRecorder` API met `navigator.mediaDevices.getUserMedia`
- Live camera preview in `<video>` element
- Opname start/stop met countdown timer
- Video playback na opname
- Upload naar Supabase Storage
- Max bestandsgrootte validatie (50MB)
- Ondersteunde formaten: webm, mp4

**FileUploadQuestion.tsx functionaliteit:**
- Drag-and-drop zone met `onDrop` handler
- File input fallback
- File type validatie op basis van vraag configuratie
- Upload progress bar
- Preview voor afbeeldingen
- Download link na upload

**Wijzigingen ExercisePage.tsx:**
```typescript
// Huidige code regel 402-411:
{(currentQuestion.type === "open_text" ||
  currentQuestion.type === "audio_upload" ||
  currentQuestion.type === "video_upload" ||
  currentQuestion.type === "file_upload") && (
  <OpenTextQuestion ... />
)}

// Nieuwe code:
{currentQuestion.type === "open_text" && (
  <OpenTextQuestion ... />
)}
{currentQuestion.type === "audio_upload" && (
  <AudioUploadQuestion
    value={answers[currentQuestion.id] as string}
    onChange={(url) => handleAnswerChange(currentQuestion.id, url)}
    attemptId={attemptId}
    questionId={currentQuestion.id}
  />
)}
{currentQuestion.type === "video_upload" && (
  <VideoUploadQuestion
    value={answers[currentQuestion.id] as string}
    onChange={(url) => handleAnswerChange(currentQuestion.id, url)}
    attemptId={attemptId}
    questionId={currentQuestion.id}
  />
)}
{currentQuestion.type === "file_upload" && (
  <FileUploadQuestion
    value={answers[currentQuestion.id] as string}
    onChange={(url) => handleAnswerChange(currentQuestion.id, url)}
    attemptId={attemptId}
    questionId={currentQuestion.id}
  />
)}
```

**Wijzigingen ExerciseBuilder.tsx:**
```typescript
// Regel 46 - uitbreiden QuestionType:
type QuestionType = "multiple_choice" | "checkbox" | "open_text" | "audio_upload" | "video_upload" | "file_upload";

// Regel 48-53 - uitbreiden icons:
const questionTypeIcons: Record<QuestionType, React.ElementType> = {
  multiple_choice: ListChecks,
  checkbox: CheckSquare,
  open_text: FileText,
  audio_upload: Mic,
  video_upload: Video,
  file_upload: Upload,
};

// Regel 369-373 - uitbreiden SelectContent:
<SelectItem value="audio_upload">{t("questionTypes.audio_upload", "Audio Recording")}</SelectItem>
<SelectItem value="video_upload">{t("questionTypes.video_upload", "Video Recording")}</SelectItem>
```

---

### 2. Professional/Playful Theme Toggle

**Wijzigingen ThemeContext.tsx:**
```typescript
type Theme = 'light' | 'dark' | 'system';
type ThemeStyle = 'professional' | 'playful';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
  themeStyle: ThemeStyle;
  setThemeStyle: (style: ThemeStyle) => void;
}

// State toevoegen:
const [themeStyle, setThemeStyleState] = useState<ThemeStyle>(() => {
  return (localStorage.getItem('themeStyle') as ThemeStyle) || 'professional';
});

// Effect voor class toepassing:
useEffect(() => {
  const root = window.document.documentElement;
  root.classList.remove('theme-professional', 'theme-playful');
  root.classList.add(`theme-${themeStyle}`);
}, [themeStyle]);

// Setter met database sync:
const setThemeStyle = async (newStyle: ThemeStyle) => {
  setThemeStyleState(newStyle);
  localStorage.setItem('themeStyle', newStyle);
  // Sync naar profiles.preferred_theme indien ingelogd
};
```

**Wijzigingen src/index.css:**
```css
/* Professional Theme (default) */
.theme-professional {
  --radius: 0.375rem;
  --font-weight-heading: 600;
  --shadow-elevation: 0 1px 3px rgba(0,0,0,0.1);
}

.theme-professional .btn {
  @apply font-medium tracking-normal;
}

/* Playful Theme */
.theme-playful {
  --radius: 1rem;
  --font-weight-heading: 700;
  --shadow-elevation: 0 4px 14px rgba(0,0,0,0.15);
}

.theme-playful .btn {
  @apply font-bold tracking-wide;
}

.theme-playful .card {
  @apply shadow-lg hover:shadow-xl transition-shadow;
}

.theme-playful h1, .theme-playful h2, .theme-playful h3 {
  @apply bg-gradient-to-r from-primary to-accent bg-clip-text;
}
```

**Wijzigingen SettingsPage.tsx appearance tab (regel 148-163):**
```tsx
<TabsContent value="appearance" className="space-y-6">
  <Card>
    <CardHeader>
      <CardTitle>{t('settings.appearanceSettings')}</CardTitle>
      <CardDescription>{t('settings.appearanceDescription')}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Color Theme */}
      <div className="space-y-3">
        <Label>{t('settings.colorTheme')}</Label>
        <div className="grid grid-cols-3 gap-3">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <Button
              key={t}
              variant={theme === t ? "default" : "outline"}
              onClick={() => setTheme(t)}
              className="flex items-center gap-2"
            >
              {t === 'light' && <Sun className="h-4 w-4" />}
              {t === 'dark' && <Moon className="h-4 w-4" />}
              {t === 'system' && <Monitor className="h-4 w-4" />}
              {t('settings.theme.' + t)}
            </Button>
          ))}
        </div>
      </div>

      {/* Style Theme */}
      <div className="space-y-3">
        <Label>{t('settings.styleTheme')}</Label>
        <p className="text-sm text-muted-foreground">
          {t('settings.styleThemeDescription')}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className={`cursor-pointer p-4 transition-all ${
              themeStyle === 'professional' 
                ? 'ring-2 ring-primary' 
                : 'hover:bg-accent/50'
            }`}
            onClick={() => setThemeStyle('professional')}
          >
            <div className="flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">{t('settings.professional')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('settings.professionalDescription')}
                </p>
              </div>
            </div>
          </Card>
          <Card 
            className={`cursor-pointer p-4 transition-all ${
              themeStyle === 'playful' 
                ? 'ring-2 ring-primary' 
                : 'hover:bg-accent/50'
            }`}
            onClick={() => setThemeStyle('playful')}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-accent" />
              <div>
                <p className="font-medium">{t('settings.playful')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('settings.playfulDescription')}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </CardContent>
  </Card>
</TabsContent>
```

---

### 3. Eindtoets Niveauprogressie Systeem

**Database migratie:**
```sql
-- Nieuwe tabel voor eindtoetsen
CREATE TABLE public.final_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_id UUID NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    passing_score INTEGER NOT NULL DEFAULT 70,
    time_limit_seconds INTEGER,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Eindtoets pogingen
CREATE TABLE public.final_exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    final_exam_id UUID NOT NULL REFERENCES public.final_exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    total_score NUMERIC,
    passed BOOLEAN,
    promoted_to_level_id UUID REFERENCES public.levels(id),
    UNIQUE(final_exam_id, student_id, attempt_number)
);

-- RLS policies
ALTER TABLE public.final_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active final exams"
    ON public.final_exams FOR SELECT
    USING (is_active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins and teachers can manage final exams"
    ON public.final_exams FOR ALL
    USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'))
    WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'));

CREATE POLICY "Students can view their own attempts"
    ON public.final_exam_attempts FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Students can create their own attempts"
    ON public.final_exam_attempts FOR INSERT
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own attempts"
    ON public.final_exam_attempts FOR UPDATE
    USING (auth.uid() = student_id);

CREATE POLICY "Teachers and admins can view all attempts"
    ON public.final_exam_attempts FOR SELECT
    USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'));

-- Functie voor niveau promotie
CREATE OR REPLACE FUNCTION public.promote_student_to_next_level(
    p_student_id UUID,
    p_current_level_id UUID,
    p_exam_attempt_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_order INTEGER;
    v_next_level_id UUID;
    v_next_class_id UUID;
BEGIN
    -- Huidige niveau volgorde ophalen
    SELECT display_order INTO v_current_order
    FROM public.levels
    WHERE id = p_current_level_id;
    
    -- Volgende niveau ophalen
    SELECT id INTO v_next_level_id
    FROM public.levels
    WHERE display_order = v_current_order + 1
    ORDER BY display_order
    LIMIT 1;
    
    IF v_next_level_id IS NULL THEN
        -- Hoogste niveau bereikt
        RETURN NULL;
    END IF;
    
    -- Zoek actieve klas in volgend niveau
    SELECT id INTO v_next_class_id
    FROM public.classes
    WHERE level_id = v_next_level_id
    AND is_active = true
    ORDER BY start_date DESC
    LIMIT 1;
    
    IF v_next_class_id IS NOT NULL THEN
        -- Schrijf student in voor nieuwe klas
        INSERT INTO public.class_enrollments (student_id, class_id, status)
        VALUES (p_student_id, v_next_class_id, 'enrolled')
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- Update exam attempt met promotie
    UPDATE public.final_exam_attempts
    SET promoted_to_level_id = v_next_level_id
    WHERE id = p_exam_attempt_id;
    
    -- Award punten voor niveau voltooiing
    PERFORM public.award_points(
        p_student_id, 
        'level_completed'::points_action, 
        500,
        p_current_level_id,
        'level'
    );
    
    RETURN v_next_level_id;
END;
$$;
```

**Nieuwe pagina: src/pages/FinalExamPage.tsx**
- Controleert of student alle oefeningen van niveau heeft voltooid
- Toont eindtoets met timer
- Na slagen: automatische promotie naar volgend niveau
- Confetti animatie bij succes
- Link naar nieuwe klas

**Nieuwe admin pagina: src/pages/admin/FinalExamsPage.tsx**
- Beheer eindtoetsen per niveau
- Koppeling aan bestaande questions tabel
- Resultaten overzicht

---

### 4. Moderatie Report Button Integratie

**Wijzigingen ForumPostPage.tsx:**
```typescript
// Import toevoegen regel 1-14:
import { ReportContentDialog } from "@/components/moderation/ReportContentDialog";
import { Flag } from "lucide-react";

// State toevoegen:
const [reportDialogOpen, setReportDialogOpen] = useState(false);
const [reportTarget, setReportTarget] = useState<{
  type: "forum_post" | "forum_comment";
  id: string;
} | null>(null);

// In post header (na delete knop, regel 163-171):
<Button
  variant="ghost"
  size="icon"
  onClick={() => {
    setReportTarget({ type: "forum_post", id: post.id });
    setReportDialogOpen(true);
  }}
  className="text-muted-foreground hover:text-destructive"
>
  <Flag className="h-4 w-4" />
</Button>

// Bij comments (regel 235-244, na delete knop):
<Button
  variant="ghost"
  size="icon"
  className="h-6 w-6 text-muted-foreground hover:text-destructive"
  onClick={() => {
    setReportTarget({ type: "forum_comment", id: comment.id });
    setReportDialogOpen(true);
  }}
>
  <Flag className="h-3 w-3" />
</Button>

// Dialog aan einde component:
{reportTarget && (
  <ReportContentDialog
    open={reportDialogOpen}
    onOpenChange={setReportDialogOpen}
    contentType={reportTarget.type}
    contentId={reportTarget.id}
  />
)}
```

**Wijzigingen ForumRoomPage.tsx:**
```typescript
// Zelfde imports en state als ForumPostPage

// In post card (regel 207-218), na like button:
<Button
  variant="ghost"
  size="sm"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    setReportTarget({ type: "forum_post", id: post.id });
    setReportDialogOpen(true);
  }}
  className="text-muted-foreground hover:text-destructive"
>
  <Flag className="h-4 w-4" />
</Button>

// Dialog toevoegen aan einde
```

---

### 5. CI/CD met Coverage Rapportage

**Wijzigingen vitest.config.ts:**
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

**Nieuw bestand: .github/workflows/ci.yml (volledig)**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint --if-present
      - run: npx tsc --noEmit

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:coverage
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false
      - name: Coverage Summary
        uses: irongut/CodeCoverageSummary@v1.3.0
        with:
          filename: coverage/cobertura-coverage.xml
          badge: true
          format: markdown
          output: both

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npx playwright test
        env:
          CI: true
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  build:
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck, unit-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/
```

**Wijzigingen package.json scripts:**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

**Nieuwe tests toevoegen:**

`src/test/gamification.test.ts`:
- Test badge unlocking logic
- Test streak calculation
- Test points awarding

`src/test/helpdesk.test.ts`:
- Test ticket creation
- Test ticket status updates
- Test response handling

`src/test/exercises.test.ts`:
- Test auto-grading logic
- Test score calculation
- Test passing threshold

`e2e/forum.spec.ts`:
- Test post creation flow
- Test comment adding
- Test report functionality

`e2e/exercises.spec.ts`:
- Test exercise completion flow
- Test file upload
- Test timer functionality

---

## Bestanden Overzicht

| Actie | Bestand |
|-------|---------|
| Nieuw | `src/components/exercises/questions/AudioUploadQuestion.tsx` |
| Nieuw | `src/components/exercises/questions/VideoUploadQuestion.tsx` |
| Nieuw | `src/components/exercises/questions/FileUploadQuestion.tsx` |
| Wijzig | `src/pages/ExercisePage.tsx` |
| Wijzig | `src/components/teacher/ExerciseBuilder.tsx` |
| Wijzig | `src/contexts/ThemeContext.tsx` |
| Wijzig | `src/pages/SettingsPage.tsx` |
| Wijzig | `src/index.css` |
| Nieuw | `supabase/migrations/xxx_final_exams.sql` |
| Nieuw | `src/pages/FinalExamPage.tsx` |
| Nieuw | `src/pages/admin/FinalExamsPage.tsx` |
| Wijzig | `src/pages/ForumPostPage.tsx` |
| Wijzig | `src/pages/ForumRoomPage.tsx` |
| Wijzig | `vitest.config.ts` |
| Nieuw | `.github/workflows/ci.yml` |
| Wijzig | `package.json` |
| Nieuw | `src/test/gamification.test.ts` |
| Nieuw | `src/test/helpdesk.test.ts` |
| Nieuw | `src/test/exercises.test.ts` |
| Nieuw | `e2e/forum.spec.ts` |
| Nieuw | `e2e/exercises.spec.ts` |
| Wijzig | `src/App.tsx` (routes) |
| Wijzig | `src/i18n/locales/*.json` (vertalingen) |

---

## Verwachte Resultaten na Implementatie

| Feature | Voor | Na |
|---------|------|-----|
| Audio/Video Upload | 35% | 100% |
| Professional/Playful Theme | 40% | 100% |
| Eindtoets Niveauprogressie | 40% | 100% |
| Moderatie Report Button | 85% | 100% |
| CI/CD Coverage | 70% | 100% |

---

## Technische Details

### MediaRecorder API (Audio/Video)
```typescript
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus' // of 'video/webm;codecs=vp9'
});

mediaRecorder.ondataavailable = (e) => {
  chunks.push(e.data);
};

mediaRecorder.onstop = async () => {
  const blob = new Blob(chunks, { type: mimeType });
  const file = new File([blob], `recording-${Date.now()}.webm`);
  // Upload naar Supabase Storage
};
```

### Niveau Progressie Flow
```text
1. Student voltooit alle oefeningen in niveau
2. "Eindtoets" knop wordt actief in dashboard
3. Student start eindtoets
4. Na slagen (≥70%):
   a. promote_student_to_next_level() wordt aangeroepen
   b. 500 punten worden toegekend
   c. Student wordt ingeschreven in nieuwe klas
   d. Confetti animatie + felicitatie bericht
5. Bij zakken: feedback + nieuwe poging mogelijk (max 3)
```

### Coverage Thresholds
```text
Lines:      60% (opbouwend naar 80%)
Functions:  60%
Branches:   50%
Statements: 60%
```
