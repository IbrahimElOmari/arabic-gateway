

## Fix: Student Uploads, Kortingscodes & Inschrijving

### Oorzaken

**1. Audio/Video/File upload faalt (RLS fout)**
- De uploadpath is `${attemptId}/${questionId}/bestand.webm`
- De RLS-policy "Students can upload their own files" vereist dat de **eerste map** in het pad gelijk is aan `auth.uid()` (de user ID)
- Omdat `attemptId` de eerste map is (niet de user ID), faalt die policy
- De andere policy "Student upload validation" zou moeten werken, maar alle drie componenten gebruiken `upsert: true`, wat een **UPDATE** vereist — en er bestaat geen UPDATE-policy voor `student-uploads`
- **Fix:** Twee aanpassingen:
  - Wijzig het uploadpad naar `${userId}/${attemptId}/${questionId}/bestand` in alle 3 componenten (AudioUploadQuestion, VideoUploadQuestion, FileUploadQuestion)
  - Voeg een UPDATE-policy toe voor `student-uploads` zodat upsert werkt

**2. Kortingscode "Ongeldige kortingscode"**
- De enige code in de database is `SAVE20`, maar die is verlopen (`valid_until: 2026-02-13`). De gebruiker probeerde `korting20%` wat sowieso niet bestaat
- De validatielogica is correct, maar de foutmelding onderscheidt niet tussen "code bestaat niet" en "code verlopen"
- **Fix:** Voeg een betere foutmelding toe voor verlopen codes versus onbekende codes

**3. Inschrijving faalt**
- De RLS INSERT policy op `class_enrollments` vereist `status IN ('pending', 'enrolled')` — dit klopt met de code
- Waarschijnlijke oorzaak: UNIQUE constraint `(class_id, student_id)` — als de student eerder al eens heeft geprobeerd in te schrijven (ook met een mislukte poging), faalt de insert
- **Fix:** Gebruik `upsert` of voeg een ON CONFLICT handler toe, en verbeter de foutmelding

---

### Wijzigingen

#### Database migratie
- Voeg UPDATE-policy toe voor `student-uploads` bucket: `bucket_id = 'student-uploads' AND auth.uid()::text = (storage.foldername(name))[1]`

#### Bestanden die aangepast worden
1. **`src/components/exercises/questions/AudioUploadQuestion.tsx`**
   - Wijzig uploadpad naar `${userId}/${attemptId}/${questionId}/audio-...`
   - Verwijder `upsert: true` (of behoud met werkende UPDATE-policy)

2. **`src/components/exercises/questions/VideoUploadQuestion.tsx`**
   - Zelfde padfix als audio

3. **`src/components/exercises/questions/FileUploadQuestion.tsx`**
   - Zelfde padfix als audio

4. **`src/pages/PricingPage.tsx`**
   - Verbeter foutmeldingen voor kortingscodes (verlopen vs onbekend)
   - Fix inschrijving: gebruik `.upsert()` met `onConflict: 'class_id,student_id'` of vang de unique violation fout op met een specifieke melding ("Je hebt al een aanvraag ingediend")

5. **`src/pages/ExercisePage.tsx`**
   - Geef `userId` door als prop aan Audio/Video/File upload componenten (of haal het op via `useAuth` in de componenten zelf)

#### Tests
- Breid bestaande tests uit voor upload-padvalidatie
- Voeg test toe voor kortingscode-validatie (verlopen code scenario)
- Voeg test toe voor duplicate enrollment afhandeling

