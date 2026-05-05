
# AI-ondersteunde i18n auto-fill (NL → EN/AR)

Uitbreiding van het bestaande `scripts/check-i18n.mjs --fix` mechanisme zodat ontbrekende EN/AR keys niet langer gevuld worden met placeholders zoals `[EN] tekst`, maar met **echte AI-voorstelvertalingen** via Lovable AI. Resultaat blijft duidelijk gemarkeerd zodat een mens ze kan reviewen.

## Doelstellingen

- Automatisch ontbrekende EN/AR keys aanvullen op basis van NL bron.
- Vertalingen markeren als "AI suggestion" zodat ze nog gereviewd kunnen worden.
- Bestaande handmatige vertalingen NOOIT overschrijven.
- Werkt zowel lokaal (CLI) als via een edge function (zodat de app het later eventueel zelf kan triggeren).
- Geen extra API key nodig — `LOVABLE_API_KEY` is al beschikbaar.

## Architectuur

```text
scripts/ai-fill-i18n.mjs        ← nieuwe CLI, batched calls
        │
        └─► edge function: ai-translate-i18n
                │  (POST { keys: { "key.path": "Nederlandse tekst" }, target: "en"|"ar" })
                │  - valideert input (Zod)
                │  - roept Lovable AI Gateway aan met JSON tool-calling
                │  - retourneert { translations: { "key.path": "vertaling" } }
                │
                └─► Lovable AI (google/gemini-3-flash-preview)
```

Waarom een edge function i.p.v. directe gateway-call vanuit script?
- Eén plek voor de prompt + schema (ook bruikbaar vanuit admin UI later).
- API key blijft server-side.
- Rate limit / 402 / 429 afhandeling op één plek.

## Onderdelen

### 1. Edge function `ai-translate-i18n`
- `verify_jwt = true` (default), maar alleen voor admin role (check via `has_role(auth.uid(), 'admin')`).
- Input: `{ target: 'en' | 'ar', entries: Record<string, string> }` — max 50 entries per call.
- Gebruikt Lovable AI met **tool calling** voor structured output (`{ translations: {...} }`).
- Systeemprompt: contextuele vertaler voor een Arabisch-leerplatform ("Huis van het Arabisch"). Voor AR: gebruik Modern Standard Arabic, behoud variabelen `{{var}}` en HTML tags ongewijzigd. Voor EN: natuurlijke UI-tekst, geen letterlijke vertaling.
- Foutafhandeling voor 429 (rate limit) en 402 (credits op) → duidelijke error JSON terug.

### 2. CLI script `scripts/ai-fill-i18n.mjs`
- Leest NL/EN/AR locales, bepaalt missing keys per target taal.
- Batcht ze in groepjes van ~30 en roept de edge function aan.
- Schrijft resultaten terug in `en.json` / `ar.json` met prefix `⟦AI⟧ ` zodat ze opvallen tijdens review (en makkelijk grep-baar zijn).
- Flags:
  - `--target en|ar|all` (default: all)
  - `--dry-run` (toont diff, schrijft niets)
  - `--limit N` (cap aantal keys voor test runs)
- Exit 0 bij succes, 1 bij API-fout.

### 3. NPM scripts in `package.json`
```json
"ai:fill-i18n": "node scripts/ai-fill-i18n.mjs",
"ai:fill-i18n:dry": "node scripts/ai-fill-i18n.mjs --dry-run"
```

### 4. Integratie met bestaande `check-i18n.mjs`
- `--fix` blijft bestaan voor snelle placeholder-fill (offline, geen credits).
- Nieuwe `--fix --ai` vlag delegeert naar `ai-fill-i18n.mjs` voor echte vertalingen.
- README sectie toevoegen met uitleg verschil tussen beide modes.

### 5. Unit tests
Toevoegen aan `src/test/check-i18n-script.test.ts` (of nieuwe file `ai-fill-i18n.test.ts`):
- Mock fetch naar edge function.
- Test: ontbrekende keys correct gedetecteerd.
- Test: bestaande EN/AR waardes worden NIET overschreven.
- Test: `⟦AI⟧` prefix wordt toegevoegd.
- Test: variabelen `{{name}}` blijven intact in mock-respons validatie.
- Test: dry-run schrijft niets.

### 6. Documentatie
Korte sectie in `README.md`:
- Wanneer `npm run fix:i18n` (snel, placeholder) vs `npm run ai:fill-i18n` (AI, kost credits).
- Hoe je `⟦AI⟧` prefix verwijdert na review (simpele find-and-replace).

## Technische details

- **Model**: `google/gemini-3-flash-preview` (snel + goedkoop, prima voor korte UI-strings).
- **Tool calling schema**:
  ```json
  {
    "name": "return_translations",
    "parameters": {
      "type": "object",
      "properties": {
        "translations": {
          "type": "object",
          "additionalProperties": { "type": "string" }
        }
      },
      "required": ["translations"]
    }
  }
  ```
- **Variabele/tag preservatie** via post-validatie: regex `{{\w+}}` count moet matchen tussen NL bron en vertaling; mismatch → entry overslaan en loggen.
- **RTL veiligheid AR**: geen automatische `\u200f` markers toevoegen; rendering wordt al door i18n-systeem afgehandeld.
- **Beveiliging**: edge function alleen aanroepbaar door admins (via `has_role` RPC check binnen function).

## Bestanden

**Nieuw**
- `supabase/functions/ai-translate-i18n/index.ts`
- `scripts/ai-fill-i18n.mjs`
- `src/test/ai-fill-i18n.test.ts`

**Wijzigen**
- `package.json` — nieuwe npm scripts
- `scripts/check-i18n.mjs` — `--ai` flag delegatie
- `README.md` — korte usage-sectie

## Out of scope (voor later)
- Admin UI knop om vertalingen vanuit de app te triggeren.
- Automatisch verwijderen van `⟦AI⟧` prefix na review.
- Caching van eerdere vertalingen tussen runs.
