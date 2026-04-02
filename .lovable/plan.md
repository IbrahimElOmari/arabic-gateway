
Do I know what the issue is? Yes.

## Probleem
De fout zit niet in de drag-and-drop UI zelf, maar in de opslaglaag. Uit de network trace blijkt:

```text
POST /questions
message: invalid input value for enum question_type: "ordering"
code: 22P02
```

Dus: de frontend probeert een vraag met type `ordering` op te slaan, maar de database accepteert dat type nog niet.

## Oorzaak
Er zijn 2 gekoppelde problemen:

1. **Database enum mismatch**
   - In de database bestaat `public.question_type` nog alleen uit:
     `multiple_choice`, `checkbox`, `open_text`, `audio_upload`, `video_upload`, `file_upload`
   - `ordering` ontbreekt dus nog.
   - Daardoor faalt het opslaan meteen, en bereikt de vraag de leerlingen nooit.

2. **Dataformaat voor ordering is nog niet robuust genoeg**
   - `ExerciseBuilder` slaat ordering-items nu op als vertaalobjecten zoals:
     `{ nl: "", en: "a", ar: "" }`
   - Maar create/update/scoring gebruiken ook `o.value`, `o.label`, `o.order`.
   - Daardoor kan `correct_answer` nu eindigen als `[null, null, ...]`.
   - Zelfs na de enum-fix moet dit dus genormaliseerd worden zodat opslaan, tonen en verbeteren consistent werkt.

## Gepaste oplossing

### 1. Database aanpassen
Maak een migratie die `ordering` toevoegt aan het bestaande `question_type` enum.

Aanpak:
- veilige enum-uitbreiding via migratie
- geen schema-herbouw nodig
- geen reserved schemas aanraken

### 2. Ordering-data normaliseren in de builder
In `src/components/teacher/ExerciseBuilder.tsx`:
- voeg een helper toe die ordering-items omzet naar een vast formaat, bijvoorbeeld:
```text
{
  label: gelokaliseerde tekst,
  value: stabiele string/id,
  order: index,
  nl: ...,
  en: ...,
  ar: ...
}
```
- gebruik die helper bij:
  - create
  - update
  - edit-prefill
- valideer dat er minstens 2 niet-lege items zijn
- valideer dat minstens 1 taal ingevuld is per item
- toon een duidelijke foutmelding als ordering-items ongeldig zijn

### 3. Correct answer-logica fixen
Voor `ordering`:
- `correct_answer` moet gebaseerd zijn op de genormaliseerde `value`-volgorde
- niet op mogelijk ontbrekende `o.value || o.label`
- zo blijft vergelijking stabiel, ongeacht taal of lege velden

### 4. Leerlingweergave en scoring alignen
In `src/pages/ExercisePage.tsx`:
- lees ordering-opties vanuit hetzelfde genormaliseerde formaat
- gebruik exact dezelfde `value`-volgorde voor:
  - renderen
  - submit
  - `is_correct`
  - totaalscore
- fallback logica behouden voor bestaande data waar mogelijk

### 5. Extra foutfeedback
In `ExerciseBuilder`:
- vervang de generieke toast “Failed to add question” voor ordering door een specifiekere melding als validatie of opslag faalt
- log de echte fout niet weg in de UX-flow

## Nodige tests

### Unit tests
Breid `src/test/exercises.test.ts` uit met:
- ordering scoring = correct bij juiste volgorde
- ordering scoring = fout bij verkeerde volgorde
- ordering scoring = fout bij gedeeltelijke volgorde
- ordering percentageberekening blijft correct

### Component / logic tests
Voeg tests toe voor builderlogica, bv. nieuw testbestand voor `ExerciseBuilder` of een pure helper:
- normalisatie van ordering-items
- `correct_answer` wordt juiste array van values
- lege ordering-items worden geweigerd
- create payload bevat `type: "ordering"` en genormaliseerde `options`

### E2E tests
Breid `e2e/exercises.spec.ts` uit met een flow voor ordering:
- docent/admin opent exercise builder
- kiest “Rangschikken (slepen)”
- vult items in
- slaat vraag succesvol op
- leerling opent oefening
- ziet ordering-vraag
- kan items slepen
- kan indienen zonder crash

## Rapportage aan gebruiker
Na implementatie rapporteer ik expliciet:
- exacte root cause
- welke bestanden aangepast zijn
- welke tests toegevoegd/uitgebreid zijn
- wat nu end-to-end werkt:
  - vraag aanmaken
  - vraag tonen aan leerling
  - rangschikken
  - indienen
  - automatische correctie

## Bestanden die aangepast moeten worden
- `supabase/migrations/...sql` — enum `question_type` uitbreiden met `ordering`
- `src/components/teacher/ExerciseBuilder.tsx` — normalisatie + validatie + save-fix
- `src/pages/ExercisePage.tsx` — consistente reading/scoring voor ordering
- `src/test/exercises.test.ts` — scoringtests uitbreiden
- `e2e/exercises.spec.ts` — ordering-flow toevoegen
- mogelijk extra testbestand voor builder/helperlogica als dat schoner is dan alles in bestaande tests proppen

## Verwacht resultaat
Na deze fix kan een docent/admin een ordering-vraag succesvol opslaan, ontvangen leerlingen de vraag correct, kunnen zij de items slepen en indienen, en werkt de automatische beoordeling weer correct.
