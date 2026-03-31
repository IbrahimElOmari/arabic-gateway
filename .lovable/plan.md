

## Drag-and-Drop Ordering Question Type

Ja, Lovable kan dit absoluut implementeren. Dit wordt een nieuw vraagtype genaamd **"ordering"** (rangschikken) waarbij de leerkracht items definieert (letters, woorden, of afbeeldingen) in de juiste volgorde, en de leerling ze in willekeurige volgorde gepresenteerd krijgt en ze moet slepen naar de juiste positie.

---

### Hoe het werkt

**Leerkracht-zijde (ExerciseBuilder):**
- Nieuw vraagtype "Rangschikken" in de dropdown
- De leerkracht voert items in (woorden, letters, of korte zinsdelen) in de **juiste volgorde**
- Optioneel: afbeeldingen uploaden per item
- Het systeem husselt de items automatisch door elkaar bij het tonen aan de leerling

**Leerling-zijde (ExercisePage):**
- Items worden in willekeurige volgorde getoond als sleepbare kaartjes
- De leerling sleept ze naar de juiste positie
- Visuele feedback: kaartjes "snappen" op hun plek
- Bij inlevering wordt de volgorde vergeleken met het correcte antwoord

```text
Leerkracht ziet:                    Leerling ziet:
┌─────────────────────┐            ┌─────────────────────┐
│ 1. كَ                │            │ ☰ بَ    (sleepbaar)  │
│ 2. تَ                │   →        │ ☰ كَ    (sleepbaar)  │
│ 3. بَ                │ husselt    │ ☰ تَ    (sleepbaar)  │
│ [+ Item toevoegen]  │            │                     │
└─────────────────────┘            └─────────────────────┘
                                   Leerling sleept naar:
                                   كَ → تَ → بَ  = "كتب" ✓
```

---

### Implementatie

| # | Bestand | Wijziging |
|---|---------|-----------|
| 1 | `src/components/teacher/ExerciseBuilder.tsx` | Nieuw type `ordering` toevoegen. Bij dit type: een dynamische lijst van items (tekst + optioneel afbeelding) die de leerkracht in de juiste volgorde invoert. Items worden opgeslagen in het `options` veld als `[{label, value, order}]` |
| 2 | `src/components/exercises/questions/OrderingQuestion.tsx` | **Nieuw bestand.** Drag-and-drop component met `@dnd-kit/core` en `@dnd-kit/sortable`. Toont kaartjes in willekeurige volgorde, leerling sleept ze op juiste positie. Retourneert de gekozen volgorde als array |
| 3 | `src/pages/ExercisePage.tsx` | Rendering + scoring toevoegen voor type `ordering`. Score: vergelijk leerling-volgorde met correcte volgorde |
| 4 | `src/i18n/locales/{nl,en,ar}.json` | Keys: `exercises.ordering`, `exercises.orderingHint`, `teacher.addOrderItem`, `teacher.orderingDescription` |
| 5 | `package.json` | Dependency toevoegen: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |

### Technische details

- **Drag-and-drop library:** `@dnd-kit` — lightweight, toegankelijk (keyboard support), werkt op touch/mobile
- **Data-opslag:** Het `options` veld in de `questions` tabel slaat de items op in correcte volgorde. Bij weergave aan de leerling worden ze door elkaar gehusseld met een deterministische shuffle (op basis van attempt ID)
- **Scoring:** Exacte match = volle punten. Optioneel: gedeeltelijke punten voor items op de juiste positie
- **Geen database-migratie nodig:** Het bestaande `options` JSON-veld en het `type` tekstveld ondersteunen dit al

