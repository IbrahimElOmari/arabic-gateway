# maak_sql_N1-W11.py v4.11 (= maak_sql_N1-W10.py v4.10, md5 32e95db5b882addad82b08bf1466d869, + twee grendels; P3 N1-W11, opdracht 2.2 van Ibra) — Maker-T (7T):
#  32. --strict-grendel "G3": in dat blok krijgen apply en generale repetitie in de `ok`-CTE de voorwaarde dat elke rij die het blok op strict_tashkeel = true zet
#      een meerkeuze is met de sleutel byte-gelijk aan een optie (`options ? correct_answer`, zoals de app met strict vergelijkt: zonder NFC) en de sleutel in NFC
#      (`normalize(…, NFC)`), en dat er in het blok precies zoveel strict-rijen zijn als ontworpen (B25, B44). Anders raakt de apply 0 rijen (fail-closed).
#      Daarnaast `1_strict_grendel.sql` (READ ONLY, buiten het log): de live databank vergelijkt met dezelfde semantiek (NFC en `?` op de echte sleutels) en
#      geen enkele rij van het blok staat al op strict. Een blok met strict-rijen zonder de optie, of de optie op een blok zonder strict-rijen = STOP.
#  33. --zonder-score-grendel "C1=0": in dat blok krijgen apply en gr de voorwaarde dat de open-tekstitems zonder score (0 punten) precies de ontworpen set
#      zijn, zonder opties (B22, B24, §13.10-10; een modelantwoord voor de docent in correct_answer mag), én dat het aantal pogingen op die items in de databank gelijk is aan de waarde na «=»
#      (een item met pogingen verliest anders stil zijn score; ook pogingen ouder dan 30 dagen, die de activiteitstelling niet ziet). Plus
#      `1_zonder_score_grendel.sql` (READ ONLY, buiten het log). Zelfde weigering als 32. Met --regressie-v410 (alleen voor de regressietoets) vervalt die
#      weigering en is elk bestand byte-gelijk aan v4.10; zonder de twee opties en zonder die vlag weigert v4.11 elk blok dat een grendel nodig heeft.
# Basis: de kop van v4.10 hieronder.
# maak_sql_N1-W08.py v4.10 (= v4.9, md5 7e809c05ec0b59e4eedaeb7964a15fa7, + de P3-delta-2 N1-W08 E1; 8T C-T11) — Maker-T (7T) · P3 N1-W08 · elk SQL-bestand byte-gelijk aan v4.9:
#  31. E1 (C-T11): de opruiming wist alleen wat deze aanroep zelf maakte. <uitmap>.bouw mag vooraf niet bestaan (anders STOP, niets gewist); hij wordt met
#      os.makedirs(exist_ok=False) aangemaakt en alleen dan (vlag _eigen) bij een weigering of fout verwijderd. Vroeger wiste v4.4.1 … v4.9 een bestaande <uitmap>.bouw
#      (rmtree op een pad uit de aanroep). Verder ongewijzigd; BLOKKEN.md en de STOP-regel noemen «v4.10».
# Basis: de kop van v4.9 hieronder.
# maak_sql_N1-W08.py v4.9 (= v4.8, md5 963b3fa89727ce759a3088512da8bc87, + de P3-delta N1-W08 D7/D8; 8T C-T04, C-T05) — Maker-T (7T) · P3 N1-W08 · elk SQL-bestand byte-gelijk aan v4.8:
#  29. D7 (C-T04): een weigering van de generator (assert) geeft een nette STOP-melding zonder traceback en zonder absoluut pad (sys.excepthook: «✗ STOP · maak_sql v4.9: …»,
#      exit 1; de atexit-opruiming van <uitmap>.bouw blijft), zodat de negatieve test van de keten (p3/negatief_rollback_offline.out) plaatsonafhankelijk is.
#  30. D8 (C-T05): de koppelen-grendel (27) ontleedt de VALUES-rijen van de CTE n als SQL-literals over regelgrenzen heen ('…' met '', U&'…'; een regeleinde in een
#      tekstveld breekt de rij niet meer op) en leest is_published en exercise_type op hun kolomnaam uit de kolomlijst n(…), niet meer per regel en op positie.
# Basis: de kop van v4.8 hieronder.
# maak_sql_N1-W08.py v4.8 (= maak_sql_N1-W07.py v4.7, md5 453fffc55075638eb0a5082b3bca5479, voor W08: H1–H7 van N1-W08_architectuur_T.md §3.1 + --rollback-offline) — Maker-T (7T) · P3 N1-W08 ·
#   architectuur T v1.0 §2–§6 (ADR-W08-2), B17 aanvulling P1 N1-W08 (3) en P2 N1-W08 (2, 3), 9T P2 V3/S2 · week, paden en bloknamen komen uit de aanroep; geen weekletterlijk buiten de kop.
#  24. H1: BLOKKEN.md noemt de scriptnaam (os.path.basename) en VERSIE; H2: het commentaarvoorbeeld van --display-order-blok is generiek («V_<week>=<n>»).
#  25. H3: 1_c10_grendel.sql telt de items die in dit blok bestand-upload worden uit VOOR ↔ NA van het blok (niet meer vast «de vier»), met hun item_id's en VOOR-type.
#  26. H7: --rollback-offline "R1=lezen-01,lezen-06": in 4_rollback.sql en 4b_noodrollback.sql van dat blok gaan die rijen terug naar hun VOOR-inhoud MET
#      is_published = false, in hetzelfde statement (REPEATABLE READ, dezelfde plak- en toestandsgrendels). De generale repetitie houdt die exacte rollback als
#      bewijs in de transactie; gr_eindrij = week_voor|apply|week_na|rollback|week_voor_off. verwacht.txt krijgt rollback_offline (de item_id's),
#      week_voor_off en blok_voor_off; elk eerder blok van dezelfde week krijgt week_voor_off, week_na_off en rest_off (de offline-keten: dezelfde
#      stand, maar met de offline rijen op false), zodat p4_stap ook na een offline-terugdraai de stand en vinger_terug kent. Na een offline-rollback is het
#      blok niet opnieuw toepasbaar zonder hergenereren (de begingrendel eist de VOOR-stand met is_published = true): fail-closed.
#  27. Koppelen-grendel (B17 P1 N1-W08 (3); 9T P2 S2): de generator weigert elke 4_rollback/4b die een rij op exercise_type koppelen zet met is_published = true
#      (koppelen crasht zonder C7). Zonder --rollback-offline weigert v4.8 daarom het W08-blok met lezen-01/-06 (negatieve test in de keten); geen uitmap.
#  28. --voorwaarde-handstap "W07n=r03_gelezen": verwacht.txt van dat blok krijgt `voorwaarde r03_gelezen` (p4_log_stap v1.9 vraagt die handstap vóór
#      vinger_voor, gr en apply van het blok; B17 P1 N1-W08 (1), ADR-W08-4). Zonder de twee nieuwe opties is elk SQL-bestand byte-gelijk aan v4.7.
#  H4 (ENUM_WAARDEN = de live enum van 2026-10-27; P3 bevestigt enum_range READ ONLY) en H5 (GRENS 70 000 voor de margekolom; de B17-grenzen 63 000/40 000
#  staan in maak_manifest) blijven; H6 = de aanroep in keten_P3_N1-W08.sh.
# Basis: de kop van v4.7 hieronder.
# maak_sql_N1-W07.py v4.7 — Maker-T (7T) · P3 N1-W07 · architectuur T v1.1 §2–§4 (ADR-W07-1, ADR-W07-3), P1-11a, 9T P2 V1/V3/V5 · = maak_sql_N1-W06.py v4.6.1 +
#  21. --display-order-blok "V_W07=12": een apart LAATSTE blok dat alleen `display_order` schrijft (de V-regels van het log; B30). De inhoudsblokken
#      (--blokken) schrijven de 17 inhoudskolommen en laten display_order op de startwaarde (0): hun NA = de NA-rij met de display_order van VOOR,
#      zodat ze byte-gelijk zijn aan een wereld zonder volgorderegel. Het V-blok start op de stand ná het laatste inhoudsblok en eindigt op de
#      volledige NA; het krijgt het opgegeven nummer (ná de nazorgblokken van de andere weken; maak_manifest eist 1..n zonder gat). De waarde
#      wordt als `::integer` geschreven, geselecteerd op het veld (niet op positie); de grendels (27 kolommen) wisselen mee, zodat een rollback
#      van blok 1–11 na blok 12 op 0 rijen uitkomt (fail-closed: «blok 12 eerst terug»). Rollback V = display_order terug naar de VOOR-waarde (0),
#      één statement. verwacht.txt krijgt `kern display_order`. Zonder de optie moet display_order in VOOR en NA gelijk zijn (zoals v4.6.1).
#  22. --c10-blok "S1": in dat blok (de bestand-upload-items) krijgt de apply (en dus de generale repetitie) een extra grendel in de `ok`-CTE:
#      `(SELECT allowed_mime_types @> ARRAY['image/jpeg','image/png'] FROM storage.buckets WHERE id = 'student-uploads')` — zonder beeldtypen in de
#      bucket (C10 niet uitgevoerd) raakt de apply 0 rijen en meldt p4_stap STOP vóór het blok (9T P2 V1; B31). De rollback heeft die grendel niet
#      (terug naar open-tekst is altijd veilig). Het blok krijgt bovendien `1_c10_grendel.sql` (READ ONLY; verwacht `true`) voor de aparte voorcontrole.
#  23. Geen insertblokken deze week (--insert blijft bestaan, ongebruikt); --p3-live ongebruikt. Weeknummer uit --week (7, 6, 5, 4).
# Basis: maak_sql_N1-W06.py v4.6.1 (8T P3 C-T03: weekgrendel van de insert FOR SHARE; C-T09: labels) · v4.6 — Maker-T (7T) · P3 N1-W06 · architectuur T v1.1 §2–§3 (ADR-W06-1), P1-3a, 9T P1 V2–V5, 9T P2 F4/F5 · = maak_sql_N1-W05.py v4.5 + insertblokken:
#  18. --insert "W06ia=luisteren-01-,luisteren-02-;W06ib=lezen-05-,grammatica-02-": nieuwe rijen (in NA, niet in VOOR) komen in insertblokken die
#      VÓÓR de updateblokken lopen (nummers START, START+1, …). Per insertblok één statement `WITH n(…) AS (VALUES …), u AS (INSERT … SELECT … FROM n
#      WHERE <grendels> RETURNING …)`: (a) toestandsgrendel = de 27-kolommenvingerafdruk van de week = de stand vóór dit blok (0b = de stand ná 0a, F4);
#      (b) geen van de item_id's bestaat (in de hele tabel); (c) plakgrendel aantal; (d) plakgrendel inhoud per rij (h_inhoud over de 23 kolommen, F5).
#      De RETURNING-controle zit in hetzelfde statement (F5): is het aggregaat niet het verwachte en niet 0, dan faalt de cast en rolt alles terug.
#      Elke nieuwe rij komt binnen met is_published = false (letterlijk in elke VALUES-rij, V3) en met de display_order van de macro-rij (V3); id,
#      created_at, updated_at = databankdefaults; media_url, media_alt, audio_url, image_url, created_by = NULL (zoals de bestaande rijen). Nooit DELETE.
#      Bestanden per insertblok: 2_droogloop (READ ONLY: n|inhoud_ok|bestaand|week_rijen|week|blok|rest), 3_apply, 5_controle, 7_vinger_aggregaat,
#      8_generale_repetitie (start|insert|na_insert|tweede insert (0, grendel)|na_tweede + activiteit + isolatie; netto read-only). Geen 4_rollback,
#      4b of 6/9: terugdraaien = de rijen blijven onzichtbaar (is_published = false; het updateblok dat ze publiceert, zet ze in zijn rollback terug).
#  19. De updateblokken (--blokken) dekken ALLE rijen van NA, ook de nieuwe (publicatie false → true in het weekblok, per reeks in één transactie);
#      hun startstand is de stand na de insertblokken. verwacht.txt krijgt de P3-verwachting tegen de echte live stand (VOOR, zonder de nieuwe
#      rijen): droogloop_p3, probe_p3, oud_p3, blok_p3 (nieuwe rijen = «niet gevonden»). Zonder --insert is elk SQL-bestand byte-gelijk aan v4.5.
#  20. Variant B (C7-terugval) is een eigen SQL-root met doorlopende nummers; deze generator kent geen varianten. --p3-live <tsv>: de live stand
#      in P3 als die niet VOOR is (blok C7t: VOOR = de NA van W06, live = de back-up); alleen de P3-verwachtingen hangen ervan af.
# Basis: maak_sql_N1-W05.py v4.5 — Maker-T (7T) · P4-voorbereiding N1-W05 (v4.5: optie --testleerder <uuid>, P1-18a / P3-5; zonder de optie is de uitvoer byte-gelijk aan v4.4.1) · v4.4.1: P3 N1-W03 · = maak_sql_N1-W02.py v4.3.1 + P1-18 (9T V1, V2) en het tegenrapport T P2 (V5):
#  13. `exercise_type` is een vijfde kolomsoort (ENUM) naast tekst, jsonb, getal en boolean: lit() schrijft '<waarde>'::public.curriculum_exercise_type.
#      Elke waarde (VOOR en NA) moet in ENUM_WAARDEN staan, en --enum-live (de live uitkomst van enum_range, alleen gelezen) moet daar
#      exact gelijk aan zijn; anders weigert de generator (assert). `display_order` blijft buiten de kern (P1-19 = c).
#  14. --start <n>: de bloknummers beginnen bij n (nazorg: 6_W02n, 7_W01n), zodat de mapnamen uniek zijn over de weken heen.
#  15. BLOKKEN.md en de koppen noemen v4.4; de uitmap wordt pas na alle controles gemaakt (een weigering laat niets achter).
#  16. v4.4.1 (8T C-T08): alles wordt gebouwd in <uitmap>.bouw en pas aan het eind, na de eindcontrole, hernoemd tot <uitmap>; bij elke
#      weigering of fout wordt <uitmap>.bouw verwijderd (atexit). Een bestaande <uitmap> = STOP (nooit over een vorige export heen). Verder ongewijzigd t.o.v. v4.3.1 (REPEATABLE READ, plak- en toestandsgrendel, U&-escapes,
#      generale repetitie met activiteit en isolatie, read-only bestanden in BEGIN TRANSACTION READ ONLY … ROLLBACK).
# Basis: maak_sql_N1-W02.py v4.3.1 — Maker-T (7T) · P3/P4 N1-W02 · techplan T10/T11/T15 · architectuur T v2 §1–§2 · B17 (verlengd, P1-11).
# Basis: maak_sql_N1-W11.py v4.1 (= maak_sql_N1-W01.py v4: U&-escapes, inhouds- en toestandsgrendel, alles-of-niets, 4b, 8, 9).
# Nieuw in v4.2:
#  1. --blokken "L1=luisteren-01,luisteren-02;L2=…" (of "W01=*"): cumulatieve blokken zoals blokken_N1-W02.py. Elk blok start
#     vanaf de stand NA het vorige blok (VOOR_L2 = NA_L1, …), zodat grendels, generale repetitie en 7_vinger kloppen met wat er
#     op dat moment live staat. Elk item zit in precies één blok; na het laatste blok = de volledige NA-stand (assert).
#  2. jsonb-waarden krijgen een U&-escape als ze niet-NFC zijn (v4.1 escapete alleen tekst).
#  3. 9_grootte_probe v2 (T11): read-only, met de VALUES van apply én rollback (even groot als de generale repetitie):
#     per richting n · inhoud_ok (plakken byte-gelijk) · start_ok (live = verwachte startstand van die richting).
#  4. 8_generale_repetitie met de T15-telling in dezelfde aanroep: pogingen 30 d (alle) · pogingen 30 d van leerders (zonder rol
#     admin/teacher) · logins 30 d van leerders · logins 30 d van staf (admin/teacher; v4.2.1, 8T C-T03) · laatste poging.
#  5. 7_vinger_aggregaat met drie scopes: week · blok · rest van de week (de rest moet per blok gelijk blijven).
#  6. 2_droogloop (read-only): per gewijzigd veld md5(live) = md5(oud)?, plus de drie aggregaten en de telling updates/inserts/
#     deletes in één rij; 6_oud_aggregaat in de W01-vorm (n | md5 over item|veld|md5(live)).
#  7. Elk read-only bestand (2, 5, 6, 7, 9) staat in BEGIN TRANSACTION READ ONLY … ROLLBACK: de database weigert elke schrijfactie.
#  8. Aggregaat van 0 rijen = "0|" (v4.1 gaf NULL). Elk bestand NFC-stabiel (assert); SQL_MANIFEST.tsv met bytes, md5 en marge.
#  9. verwacht.txt met de P3-verwachting (live = VOOR) én de P4-verwachting per blok (live = NA van het vorige blok).
# Nieuw in v4.3 (na P3-akkoord, beslissing 9: voorwaarde V2 van 9T; 8T C-T08 en C-T10):
# 10. 3_apply, 4_rollback en 4b_noodrollback lopen in REPEATABLE READ (v4.3.1: BEGIN; SET TRANSACTION ISOLATION LEVEL REPEATABLE READ; … COMMIT). Wijzigt iemand een rij van het
#     blok terwijl de apply loopt, dan faalt de apply met een serialisatiefout en blijft alles staan (geen stille overschrijving).
#     Uitvoer: één rij `n|md5|isolatie` (n|md5 = het oude RETURNING-aggregaat, isolatie = 'repeatable read'); tweede apply `0||repeatable read`.
# 11. 8_generale_repetitie loopt ook in REPEATABLE READ en toont de isolatie als laatste kolom (live bewijs vóór de apply).
# 12. Vroege controles (C-T10): BOOL alleen true/false; options en media_production nooit leeg (NOT NULL); geen dataregel die met
#     '--' begint en geen 'RETURNING' of 'UPDATE public.curriculum_items' in de data (wrap() werkt op tekst). Kop van 9 rechtgezet (C-T08).
# Gebruik: python3 -I maak_sql_N1-W05.py <VOOR.tsv> <NA.tsv> <uitmap> --week 3 --blokken "<spec>" --enum-live "<a|b|…>" [--start 1] [--testleerder <uuid>]
#  17. v4.5 (P1-18a, P3-5; 9T P4 V7): --testleerder <uuid> sluit één testaccount (rol student, door Ibra) uit van de leerderstellingen in de
#      activiteit van 8_generale_repetitie (pogingen30_leerders en logins30_leerders), zodat een rooktest als leerder P4 niet stopt.
#      Het uuid wordt streng gecontroleerd (8-4-4-4-12 hex) en als literal '<uuid>'::uuid geschreven. Zonder de optie: geen verschil.
import sys, csv, json, os, hashlib, unicodedata, shutil, atexit, re
csv.field_size_limit(10**9)
VERSIE = "v4.11"   # v4.11: vóór de STOP-haak (die het label gebruikt)
def _stop_hook(t, v, tb):   # v4.9 (29, D7): een weigering = één STOP-regel, geen traceback, geen pad
    print(f"✗ STOP · maak_sql {VERSIE}: {v if t is AssertionError else t.__name__ + ': ' + str(v)}", file=sys.stderr, flush=True)
sys.excepthook = _stop_hook
def opt(n, d=None): return sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
skipidx = {sys.argv.index(f) + 1 for f in ("--week", "--blokken", "--enum-live", "--start", "--testleerder", "--insert", "--p3-live", "--display-order-blok", "--c10-blok", "--rollback-offline", "--voorwaarde-handstap", "--strict-grendel", "--zonder-score-grendel") if f in sys.argv}
VERSIE = "v4.11"
args = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith("--") and i not in skipidx]
week = opt("--week"); spec = opt("--blokken", "ALLES=*"); START = int(opt("--start", "1")); ENUM_LIVE = opt("--enum-live")
TESTLEERDER = opt("--testleerder")   # v4.5
INS_SPEC = opt("--insert")   # v4.6: insertblokken voor de nieuwe rijen
DO_SPEC = opt("--display-order-blok")   # v4.7 (21): "V_<week>=<n>"
C10_BLOK = opt("--c10-blok")   # v4.7 (22): bloknaam met de bucketgrendel
ROFF_SPEC = opt("--rollback-offline")   # v4.8 (26): "R1=lezen-01,lezen-06"
ROFF_BLOK, ROFF_SUF = (ROFF_SPEC.split("=")[0].strip(), [p.strip() for p in ROFF_SPEC.split("=", 1)[1].split(",") if p.strip()]) if ROFF_SPEC else (None, [])
VW_SPEC = opt("--voorwaarde-handstap")   # v4.8 (28): "W07n=r03_gelezen"
STRICT_BLOKKEN = [b.strip() for b in (opt("--strict-grendel") or "").split(",") if b.strip()]   # v4.11 (32)
ZS_SPEC = {d.split("=")[0].strip(): int(d.split("=")[1]) for d in (opt("--zonder-score-grendel") or "").split(",") if d.strip()}   # v4.11 (33): blok=pogingen
VW_BLOK, VW_STAP = (VW_SPEC.split("=")[0].strip(), VW_SPEC.split("=")[1].strip()) if VW_SPEC else (None, None)
if VW_STAP is not None: assert re.fullmatch(r"[a-z][a-z0-9_]*", VW_STAP), f"--voorwaarde-handstap: ongeldige stapnaam {VW_STAP!r}"
DO_NAAM, DO_NR = (DO_SPEC.split("=")[0].strip(), int(DO_SPEC.split("=")[1])) if DO_SPEC else (None, None)
C10_SQL = "(SELECT allowed_mime_types @> ARRAY['image/jpeg','image/png'] FROM storage.buckets WHERE id = 'student-uploads')"
import re
if TESTLEERDER is not None:
    import re as _re
    assert _re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", TESTLEERDER), f"--testleerder is geen uuid: {TESTLEERDER!r}"
TL_A = f" AND a.student_id <> '{TESTLEERDER}'::uuid" if TESTLEERDER else ""
TL_U = f" AND u.id <> '{TESTLEERDER}'::uuid" if TESTLEERDER else ""
assert week and week.isdigit(), "--week <getal> is verplicht"
voorrijen = list(csv.DictReader(open(args[0], encoding="utf-8", newline=""), delimiter="\t")); KOP = list(voorrijen[0].keys())
voor = {r["item_id"]: r for r in voorrijen}
voor0 = {i: dict(r) for i, r in voor.items()}   # v4.6: de echte live stand vóór P4 (P3-verwachtingen)
if opt("--p3-live"):   # v4.6: de live stand in P3 als die niet VOOR is (variant B: blok C7t start op de NA van W06, live staat de back-up)
    voor0 = {r["item_id"]: r for r in csv.DictReader(open(opt("--p3-live"), encoding="utf-8", newline=""), delimiter="\t")}
    assert all(r["week"] == week for r in voor0.values()) and list(next(iter(voor0.values())).keys()) == KOP, "--p3-live: andere week of andere kolommen"
narijen = list(csv.DictReader(open(args[1], encoding="utf-8", newline=""), delimiter="\t"))
na = {r["item_id"]: r for r in narijen}
assert list(narijen[0].keys()) == KOP, "VOOR en NA hebben niet dezelfde kolommen"
NIEUW = [r["item_id"] for r in narijen if r["item_id"] not in voor]   # v4.6: in NA-volgorde
DOEL = args[2]; uitmap = DOEL + ".bouw"   # v4.4.1: bouwen in <uitmap>.bouw, hernoemen op het eind
assert not os.path.exists(DOEL), f"{DOEL} bestaat al: STOP (nooit over een vorige export heen)"
assert not os.path.lexists(uitmap), f"{os.path.basename(uitmap)} bestaat al (niet door deze aanroep gemaakt): STOP, niets gewist (v4.10, 8T C-T11)"
_klaar = []; _eigen = []   # v4.10 (31): alleen de .bouw die deze aanroep zelf maakte, wordt opgeruimd
atexit.register(lambda: None if (_klaar or not _eigen) else shutil.rmtree(_eigen[0], ignore_errors=True))
if INS_SPEC is None: assert set(voor) == set(na), "VOOR en NA bevatten niet dezelfde item_id's (nieuwe rijen alleen met --insert)"
else: assert set(voor) < set(na) and NIEUW, "met --insert moet NA alle rijen van VOOR bevatten en minstens één nieuwe rij"
assert all(r["week"] == week for r in voorrijen), "VOOR bevat rijen van een andere week"
assert all(r["week"] == week for r in narijen), "NA bevat rijen van een andere week"
TXT = ["instruction_nl","question","correct_answer","feedback_correct","feedback_incorrect","input_arabic","input_transliteration","input_translation_nl","reference_media","review_flag"]
JSB = ["options","correct_options","media_production"]; NUM = ["points"]; BOOL = ["is_published","strict_tashkeel"]
ENUM = ["exercise_type"]   # v4.4 (P1-18, 9T V1)
ENUM_WAARDEN = ("meerkeuze", "meerdere-antwoorden", "open-tekst", "gatentekst", "bestand-upload", "audio-opname", "rangschikken", "koppelen")   # = apply_log v1.3
assert ENUM_LIVE is not None, "--enum-live is verplicht (live enum_range, alleen lezen)"
assert ENUM_LIVE == "|".join(ENUM_WAARDEN), f"live enum {ENUM_LIVE!r} ≠ de lijst van de generator: STOP"
KOL = TXT + JSB + NUM + BOOL + ENUM
for _bron, _rijen in (("VOOR", voor), ("NA", na)):  # v4.3 (8T C-T10): vroege controles, fail-early in plaats van bij het uitvoeren
    for _i, _r in _rijen.items():
        for _k in BOOL: assert _r[_k] in ("true", "false"), f"{_bron} {_i} {_k} = {_r[_k]!r}: geen true/false"
        for _k in ENUM: assert _r[_k] in ENUM_WAARDEN, f"{_bron} {_i} {_k} = {_r[_k]!r}: niet in de enum (v4.4 weigert)"
        for _k in ("options", "media_production"): assert _r[_k] != "", f"{_bron} {_i} {_k} is leeg, maar de kolom is NOT NULL"
        for _k in KOL:
            assert not any(_x.startswith("--") for _x in _r[_k].split("\n")[1:]), f"{_bron} {_i} {_k}: dataregel begint met -- (wrap() zou hem weghalen)"
            assert "RETURNING" not in _r[_k] and "UPDATE public.curriculum_items" not in _r[_k] and "INSERT INTO" not in _r[_k].upper(), f"{_bron} {_i} {_k}: SQL-sleutelwoord in de data"
VINGER = ["item_id","unit_code","week","skill","exercise_type","exercise_subtype","display_order","instruction_nl","question","options","correct_answer","correct_options","feedback_correct","feedback_incorrect","input_arabic","input_transliteration","input_translation_nl","reference_media","media_production","media_url","media_alt","audio_url","image_url","points","review_flag","is_published","strict_tashkeel"]
GRENS = 70000  # grootste live geteste aanroep (W11, 2026-10-19); marge = (GRENS - bytes) / GRENS
def uesc(v):
    return "U&'" + "".join(("''" if c == "'" else "\\\\" if c == "\\" else c) if 32 <= ord(c) < 127 else ("\\%04X" % ord(c) if ord(c) <= 0xFFFF else "\\+%06X" % ord(c)) for c in v) + "'"
def lit(v, kol):
    if kol == "display_order": return str(int(v)) + "::integer"   # v4.7 (21): alleen in het V-blok
    if kol in JSB:
        if v == "": return "NULL::jsonb"
        json.loads(v)
        return (uesc(v) if unicodedata.normalize("NFC", v) != v else "'" + v.replace("'", "''") + "'") + "::jsonb"
    if kol in NUM: return str(int(v)) + "::smallint"
    if kol in BOOL: return ("true" if v == "true" else "false") + "::boolean"
    if kol in ENUM:
        assert v in ENUM_WAARDEN, f"{kol} = {v!r}: niet in de enum"
        return "'" + v + "'::public.curriculum_exercise_type"
    if unicodedata.normalize("NFC", v) != v: return uesc(v) + "::text"
    return "'" + v.replace("'", "''") + "'::text"
def vinger_sql(alias):
    pre = alias + "." if alias else ""
    return "md5(concat_ws('|', " + ", ".join(f"coalesce({pre}{c}::text,'')" for c in VINGER) + "))"
def inhoud_sql(alias, kol=None): return "md5(concat_ws('|', " + ", ".join(f"{alias}.{k}::text" for k in (kol or KOL)) + "))"
def inhoud_py(r, kol=None): return hashlib.md5("|".join(r[k] for k in (kol or KOL) if not (k in JSB and r[k] == "")).encode("utf-8")).hexdigest()
def vinger_py(r): return hashlib.md5("|".join(r[c] for c in VINGER).encode("utf-8")).hexdigest()
def md5s(s): return hashlib.md5(s.encode("utf-8")).hexdigest()
def agg_py(src, ids): ids = sorted(ids); return f"{len(ids)}|" + (md5s("\n".join(f"{i}|{vinger_py(src[i])}" for i in ids)) if ids else "")
def agg_sql(filt): return (f"SELECT count(*)::text || '|' || coalesce(md5(string_agg(item_id || '|' || h, E'\\n' ORDER BY item_id COLLATE \"C\")), '') "
                           f"FROM (SELECT item_id, {vinger_sql('')} AS h FROM public.curriculum_items WHERE {filt}) x")
def in_lijst(ids): return "item_id IN (" + ", ".join(f"'{i}'" for i in sorted(ids)) + ")"
def nwith(naam, ids, bron, start, kol=None):
    kol = kol or KOL; kols_ = ", ".join(kol)
    rijen = ",\n".join("  (" + ", ".join([lit(i, "x"), lit(inhoud_py(bron[i], kol), "x"), lit(vinger_py(start[i]), "x")] + [lit(bron[i][k], k) for k in kol]) + ")" for i in ids)
    return f"{naam}(item_id, h_inhoud, h_start, {kols_}) AS (VALUES\n{rijen}\n)"
def update3(ids, bron, start, kop, kol=None, extra_grendel="", label=None):
    kol = kol or KOL; N = len(ids); nvals = ", ".join(f"n.{k}" for k in kol); kols_ = ", ".join(kol); ivals_ = ", ".join(f"i.{k}" for k in kol)
    return f"""-- {kop} · week {week} · {N} rijen · ÉÉN statement (atomair), fail-closed: plakgrendel (h_inhoud) + toestandsgrendel (vingerafdruk 27 kolommen){(' + bucketgrendel C10 (B31)' if extra_grendel else '') if label is None else label}.
WITH {nwith('n', ids, bron, start, kol)},
ok AS (
  SELECT count(*) = {N} AND (SELECT count(*) FROM n) = {N}{' AND ' + extra_grendel if extra_grendel else ''} AS alle
  FROM public.curriculum_items i JOIN n ON n.item_id = i.item_id
  WHERE i.week = {week}
    AND {vinger_sql('i')} = n.h_start
    AND {inhoud_sql('n', kol)} = n.h_inhoud
)
UPDATE public.curriculum_items AS i
SET ({kols_}) = (SELECT {nvals} FROM n WHERE n.item_id = i.item_id)
WHERE i.week = {week}
  AND (SELECT alle FROM ok)
  AND EXISTS (SELECT 1 FROM n WHERE n.item_id = i.item_id AND ({ivals_}) IS DISTINCT FROM ({nvals}))
RETURNING i.item_id, {vinger_sql('i')} AS vingerafdruk;
"""
def wrap(sql, naam):
    sql = "\n".join(x for x in sql.split("\n") if not x.startswith("--")).strip().rstrip(";")
    head, _, ret = sql.rpartition("RETURNING"); k = "\nUPDATE public.curriculum_items"; i = head.rindex(k)
    return head[:i] + ",\nu AS (UPDATE public.curriculum_items" + head[i + len(k):] + "RETURNING" + ret + ")\n" + f"SELECT set_config('hva.{naam}', count(*)::text || '|' || coalesce(md5(string_agg(item_id||'|'||vingerafdruk, E'\\n' ORDER BY item_id COLLATE \"C\")),''), true) FROM u;"
# v4.3.1: BEGIN; SET TRANSACTION … i.p.v. BEGIN ISOLATION LEVEL …. Gelijkwaardig (8D/8T-delta N1, getest op PostgreSQL 16.15): ook een
# tweede BEGIN binnen een open transactie zet de isolatie, met alleen een WARNING. Beide vormen werken dus als de tool zelf al een transactie
# opende, zolang er nog geen query liep; liep er wel al een, dan faalt het statement: fail-closed (replica G3.9a–c). De expliciete SET
# TRANSACTION maakt de bedoeling zichtbaar en hangt niet af van dat randgedrag van BEGIN.
BEGIN_RR = "BEGIN;\nSET TRANSACTION ISOLATION LEVEL REPEATABLE READ;\n"
def transactie(stmt, label, kop):
    # v4.3 (9T V2): de UPDATE als CTE in één SELECT, binnen REPEATABLE READ; één uitvoerrij n|md5|isolatie
    body = "\n".join(x for x in stmt.split("\n") if not x.startswith("--")).strip().rstrip(";")
    head, _, ret = body.rpartition("RETURNING"); k = "\nUPDATE public.curriculum_items"; i = head.rindex(k)
    sel = (head[:i] + ",\nu AS (UPDATE public.curriculum_items" + head[i + len(k):] + "RETURNING" + ret + ")\n"
           + f"SELECT count(*)::text || '|' || coalesce(md5(string_agg(item_id||'|'||vingerafdruk, E'\\n' ORDER BY item_id COLLATE \"C\")),'') AS {label}, current_setting('transaction_isolation') AS isolatie FROM u;")
    return kop + BEGIN_RR + sel + "\nCOMMIT;\n"
STAF = "SELECT 1 FROM public.user_roles r WHERE r.user_id = {} AND r.role::text IN ('admin', 'teacher')"
ACTIVITEIT = ("SELECT set_config('hva.activiteit', concat_ws('|', "   # v4.2.1 (8T C-T03): logins van leerders en van staf apart
              "(SELECT count(*) FROM public.curriculum_item_attempts WHERE created_at > now() - interval '30 days'), "
              f"(SELECT count(*) FROM public.curriculum_item_attempts a WHERE a.created_at > now() - interval '30 days' AND NOT EXISTS ({STAF.format('a.student_id')}){TL_A}), "
              f"(SELECT count(*) FROM auth.users u WHERE u.last_sign_in_at > now() - interval '30 days' AND NOT EXISTS ({STAF.format('u.id')}){TL_U}), "
              f"(SELECT count(*) FROM auth.users u WHERE u.last_sign_in_at > now() - interval '30 days' AND EXISTS ({STAF.format('u.id')})), "
              "coalesce((SELECT max(created_at)::text FROM public.curriculum_item_attempts), '')), true);")
RO_BEGIN, RO_END = "BEGIN TRANSACTION READ ONLY;\n", "ROLLBACK;\n"
# blokken
blokken = []
for deel in spec.split(";"):
    naam, _, pref = deel.partition("="); blokken.append((naam.strip(), [p.strip() for p in pref.split(",") if p.strip()]))
def in_blok(iid, pref): return pref == ["*"] or any(iid.split("-", 1)[1].startswith(p) for p in pref)
ids_alle = [r["item_id"] for r in voorrijen] + NIEUW   # v4.6: VOOR-volgorde, daarna de nieuwe rijen in NA-volgorde
toewijzing = {i: [n for n, p in blokken if in_blok(i, p)] for i in ids_alle}
assert all(len(v) == 1 for v in toewijzing.values()), f"item niet in precies één blok: {[(i, v) for i, v in toewijzing.items() if len(v) != 1]}"
# v4.6: insertblokken
insblokken = []
if INS_SPEC is not None:
    for deel in INS_SPEC.split(";"):
        naam, _, pref = deel.partition("="); insblokken.append((naam.strip(), [p.strip() for p in pref.split(",") if p.strip()]))
    assert all(p != ["*"] for _, p in insblokken), "--insert kent geen '*'"
    inswijzing = {i: [n for n, p in insblokken if in_blok(i, p)] for i in NIEUW}
    assert all(len(v) == 1 for v in inswijzing.values()), f"nieuwe rij niet in precies één insertblok: {[(i, v) for i, v in inswijzing.items() if len(v) != 1]}"
    assert not [i for i in voor if any(in_blok(i, p) for _, p in insblokken)], "een insertprefix past op een bestaande rij"
    assert len({n for n, _ in insblokken} | {n for n, _ in blokken}) == len(insblokken) + len(blokken), "dubbele bloknaam"
INS_KOL = ["item_id", "unit_code", "week", "skill", "exercise_type", "exercise_subtype", "display_order", "instruction_nl", "question", "options", "correct_answer",
           "correct_options", "feedback_correct", "feedback_incorrect", "input_arabic", "input_transliteration", "input_translation_nl", "reference_media",
           "media_production", "points", "review_flag", "is_published", "strict_tashkeel"]   # 23 kolommen (architectuur T v1.1 §3)
NULL_KOL = ["media_url", "media_alt", "audio_url", "image_url", "id", "created_at", "updated_at"]   # databankdefault (NULL of de default); in NA leeg
INS = {}
for i in NIEUW:   # V3: de generator weigert zonder is_published = false en zonder de display_order van de macro-rij
    macro = i.rsplit("-", 1)[0]; r = na[i]
    assert re.fullmatch(re.escape(macro) + r"-[1-9]", i) and macro in voor, f"{i}: geen subitem <macro>-1 … -9 van een bestaande rij"
    assert r["display_order"] == voor[macro]["display_order"] == na[macro]["display_order"], f"{i}: display_order {r['display_order']} ≠ die van {macro}"
    assert r["unit_code"] == f"U{week}" and r["skill"] == voor[macro]["skill"], f"{i}: unit_code of skill ≠ macro-rij"
    assert all(r[c] == "" for c in NULL_KOL), f"{i}: {[c for c in NULL_KOL if r[c] != '']} niet leeg in NA (het insertblok zet daar de databankdefault)"
    INS[i] = dict(r); INS[i]["is_published"] = "false"
def lit_ins(v, kol):
    if kol == "week": return str(int(v)) + "::smallint"
    if kol == "display_order": return str(int(v)) + "::integer"
    return lit(v, kol if kol in KOL else "x")
def ins_inhoud_py(r): return hashlib.md5("|".join(r[k] for k in INS_KOL if not (k in JSB and r[k] == "")).encode("utf-8")).hexdigest()
def ins_inhoud_sql(alias): return "md5(concat_ws('|', " + ", ".join(f"{alias}.{k}::text" for k in INS_KOL) + "))"
def nwith_ins(ids, bron):
    rijen = []
    for i in ids:
        vals = [lit_ins(bron[i][k], k) for k in INS_KOL]
        assert vals[INS_KOL.index("is_published")] == "false::boolean", f"{i}: insert zonder is_published = false (V3)"
        rijen.append("  (" + ", ".join([lit(ins_inhoud_py(bron[i]), "x")] + vals) + ")")
    return f"n(h_inhoud, {', '.join(INS_KOL)}) AS (VALUES\n" + ",\n".join(rijen) + "\n)"
def insert_cte(ids, bron, week_voor):
    N = len(ids)
    return (f"WITH {nwith_ins(ids, bron)},\n"
            f"u AS (INSERT INTO public.curriculum_items ({', '.join(INS_KOL)})\n"
            f"  SELECT {', '.join('n.' + k for k in INS_KOL)} FROM n\n"
            f"  WHERE ({agg_sql_lock(WEEKF)}) = '{week_voor}'\n"
            f"    AND NOT EXISTS (SELECT 1 FROM public.curriculum_items c WHERE c.item_id IN (SELECT n2.item_id FROM n n2))\n"
            f"    AND (SELECT count(*) FROM n) = {N}\n"
            f"    AND (SELECT bool_and({ins_inhoud_sql('n3')} = n3.h_inhoud) FROM n n3)\n"
            f"  RETURNING item_id, {vinger_sql('')} AS vingerafdruk)\n")
def agg_sql_lock(filt):   # v4.6.1 (8T P3 C-T03): de weekgrendel van een insert leest de rijen FOR SHARE; in REPEATABLE READ geeft een gelijktijdige
    # wijziging van een rij van de week dan een serialisatiefout (fail-closed) in plaats van een insert op een week die intussen anders is
    return (f"SELECT count(*)::text || '|' || coalesce(md5(string_agg(item_id || '|' || h, E'\\n' ORDER BY item_id COLLATE \"C\")), '') "
            f"FROM (SELECT item_id, {vinger_sql('')} AS h FROM public.curriculum_items WHERE {filt} FOR SHARE) x")
AGG_U = "count(*)::text || '|' || coalesce(md5(string_agg(item_id||'|'||vingerafdruk, E'\\n' ORDER BY item_id COLLATE \"C\")),'')"
def droog_sim(live, paren, start, eind, blokids, N):   # v4.6: wat 2_droogloop.sql geeft bij een gegeven live stand (ontbrekende rij = niet gevonden)
    gev = [(i, k) for i, k in paren if i in live]
    hl = {(i, k): (md5s(live[i][k]) if i in live else md5s("")) for i, k in paren}
    mis = ", ".join(f"{i}:{k}" for i, k in paren if i not in live or hl[(i, k)] != md5s(start[i][k]))
    oudagg = f"{len(paren)}|" + md5s("\n".join(f"{i}|{k}|{hl[(i, k)]}" for i, k in paren))
    lv = sorted(live); bl = [i for i in blokids if i in live]
    return (f"{len(gev)}|{sum(1 for p in gev if hl[p] == md5s(start[p[0]][p[1]]))}|{sum(1 for p in gev if hl[p] == md5s(eind[p[0]][p[1]]))}|{mis}|{N}|0|0|{len(live)}|{oudagg}|"
            f"{agg_py(live, lv)}|{agg_py(live, bl)}|{agg_py(live, [i for i in lv if i not in blokids])}")
def agg0(src, ids): ids = sorted(ids); return f"{len(ids)}|" + (md5s("\n".join(f"{i}|{vinger_py(src[i])}" for i in ids)) if ids else "")
def schrijf_tsv(rows, p, ids=None):
    with open(p, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter="\t", lineterminator="\n", quoting=csv.QUOTE_MINIMAL); w.writerow(KOP)
        for i in (ids_alle if ids is None else ids): w.writerow([rows[i][c] for c in KOP])
os.makedirs(uitmap, exist_ok=False); _eigen.append(uitmap)   # v4.10 (31)
WEEKF = f"week = {week}"
manifest = [("blok", "bestand", "bytes", "md5", "nfc_stabiel", "marge_70kB")]
overzicht = []; overzicht_ins = []
stand = {i: dict(voor[i]) for i in voor}   # aanwezige rijen
nr = START
def schrijf_bestanden(bmap, bestanden, naam):
    for n_, t in bestanden.items():
        assert unicodedata.normalize("NFC", t) == t, f"{naam}/{n_} is niet NFC-stabiel"
        if n_ in ("1_c10_grendel.sql", "1_strict_grendel.sql", "1_zonder_score_grendel.sql", "2_droogloop.sql", "5_controle.sql", "6_oud_aggregaat.sql", "7_vinger_aggregaat.sql", "9_grootte_probe.sql"):
            body = "\n".join(x for x in t.split("\n") if not x.startswith("--")).upper()
            assert body.startswith("BEGIN TRANSACTION READ ONLY;") and body.rstrip().endswith("ROLLBACK;"), n_
            assert not any(w in body for w in ("UPDATE PUBLIC", "INSERT ", "DELETE ", "ALTER ", "DROP ", "TRUNCATE ", "CREATE ", "GRANT ")), n_
        assert "DELETE FROM" not in t.upper(), f"{naam}/{n_}: DELETE (N2-10)"
        open(f"{bmap}/{n_}", "w", encoding="utf-8").write(t)
def manifest_blok(bmap, nr, naam):
    for n_ in sorted(os.listdir(bmap)):
        p = f"{bmap}/{n_}"; b = os.path.getsize(p); t = open(p, encoding="utf-8").read()
        marge = f"{100 * (GRENS - b) / GRENS:.0f} %" if n_.endswith(".sql") else ""
        manifest.append((f"{nr}_{naam}", n_, str(b), hashlib.md5(open(p, "rb").read()).hexdigest(), str(unicodedata.normalize("NFC", t) == t), marge))
for naam, pref in insblokken:   # v4.6 (18): insertblokken eerst
    bmap = f"{uitmap}/{nr}_{naam}"; os.makedirs(bmap, exist_ok=True)
    start = {i: dict(stand[i]) for i in stand}
    blokids = sorted(i for i in NIEUW if inswijzing[i] == [naam]); N = len(blokids); assert N > 0, f"insertblok {naam} is leeg"
    eind = {**start, **{i: dict(INS[i]) for i in blokids}}
    rest = sorted(start)
    V = {"blok": naam, "soort": "insert", "items_blok": str(N), "gewijzigd": str(N), "paren": f"{N} × {len(INS_KOL)}",
         "week_voor": agg0(start, start), "week_na": agg0(eind, eind), "blok_voor": "0|", "blok_na": agg0(eind, blokids), "rest": agg0(start, rest),
         "apply_returning": agg0(eind, blokids), "rollback_returning": "—"}
    V["apply_uitvoer"] = f"{V['apply_returning']}|repeatable read"; V["rollback_uitvoer"] = "—"; V["leeg_uitvoer"] = "0||repeatable read"
    V["droogloop"] = f"{N}|{N}|0|{len(start)}|{V['week_voor']}|0||{V['rest']}"
    live3 = voor0; r3 = sorted(live3)
    V["droogloop_p3"] = f"{N}|{N}|0|{len(live3)}|{agg0(live3, r3)}|0||{agg0(live3, r3)}"
    V["week_p3"] = agg0(live3, r3); V["rest_p3"] = agg0(live3, r3); V["blok_p3"] = "0|"
    V["droogloop_na_apply"] = f"{N}|{N}|{N}|{len(eind)}|{V['week_na']}|{V['blok_na']}|{V['rest']}"
    V["gr_eindrij"] = f"{V['week_voor']}|{V['apply_returning']}|{V['week_na']}|0||{V['week_na']}"
    bestanden = {}
    zet = lambda n: f"SELECT set_config('hva.{n}', ({agg_sql(WEEKF)}), true);"
    kop = f"-- APPLY insertblok {naam} · week {week} · {N} nieuwe rijen ({', '.join(blokids)}) · ÉÉN statement (atomair), fail-closed: toestandsgrendel (week = stand vóór dit blok), 0 bestaande id's, plakgrendel aantal + inhoud per rij (h_inhoud, 23 kolommen); is_published = false. Nooit DELETE.\n"
    bestanden["3_apply.sql"] = (kop + f"-- REPEATABLE READ (9T V2) · verwacht: {V['apply_uitvoer']} · tweede keer of grendel dicht: {V['leeg_uitvoer']} · elke andere RETURNING = fout in hetzelfde statement → niets ingevoegd (F5)\n"
        + BEGIN_RR + insert_cte(blokids, eind, V["week_voor"]) + f",\nx AS (SELECT {AGG_U} AS a FROM u)\n"
        + f"SELECT CASE WHEN x.a IN ('{V['apply_returning']}', '0|') THEN x.a ELSE ('STOP: RETURNING ' || x.a || ' is niet het verwachte aggregaat; niets ingevoegd')::integer::text END AS apply, current_setting('transaction_isolation') AS isolatie FROM x;\nCOMMIT;\n")
    bestanden["8_generale_repetitie.sql"] = (f"-- 8_generale_repetitie · insertblok {naam} · netto read-only: BEGIN; SET TRANSACTION ISOLATION LEVEL REPEATABLE READ … ROLLBACK in één aanroep: insert, daarna dezelfde insert opnieuw (de grendel moet dicht zijn: 0), met de T15-telling (activiteit)\n"
        f"-- verwacht: {V['gr_eindrij']} | activiteit pogingen30|pogingen30_leerders|logins30_leerders|logins30_staf|laatste_poging (STOP als pogingen30_leerders > 0 of logins30_leerders > 0) | isolatie = repeatable read\n"
        + BEGIN_RR + ACTIVITEIT + "\n" + zet("start") + "\n"
        + insert_cte(blokids, eind, V["week_voor"]) + f"SELECT set_config('hva.apply', {AGG_U}, true) FROM u;\n" + zet("na_apply") + "\n"
        + insert_cte(blokids, eind, V["week_voor"]) + f"SELECT set_config('hva.tweede', {AGG_U}, true) FROM u;\n" + zet("na_tweede") + "\n"
        + "SELECT current_setting('hva.start') AS start, current_setting('hva.apply') AS apply, current_setting('hva.na_apply') AS na_apply, current_setting('hva.tweede') AS tweede, current_setting('hva.na_tweede') AS na_tweede, current_setting('hva.activiteit') AS activiteit, current_setting('transaction_isolation') AS isolatie;\nROLLBACK;\n")
    bestanden["2_droogloop.sql"] = (f"-- 2_droogloop · READ ONLY · insertblok {naam} · week {week} · dezelfde VALUES als 3_apply: n | inhoud_ok | bestaand (moet 0 zijn) | rijen in de week | week | blok | rest\n"
        f"-- verwacht in P3 (live = back-up): {V['droogloop_p3']}\n-- verwacht in P4 vlak vóór dit blok: {V['droogloop']} · na de apply: {V['droogloop_na_apply']}\n" + RO_BEGIN
        + f"WITH {nwith_ins(blokids, eind)}\n"
        + f"SELECT concat_ws('|', (SELECT count(*) FROM n), (SELECT count(*) FROM n WHERE {ins_inhoud_sql('n')} = n.h_inhoud), (SELECT count(*) FROM public.curriculum_items c WHERE c.item_id IN (SELECT n2.item_id FROM n n2)),\n"
        + f"  (SELECT count(*) FROM public.curriculum_items WHERE {WEEKF}), ({agg_sql(WEEKF)}), ({agg_sql(WEEKF + ' AND ' + in_lijst(blokids))}), ({agg_sql(WEEKF + ' AND NOT ' + in_lijst(blokids))})) AS droogloop;\n" + RO_END)
    bestanden["5_controle.sql"] = f"-- 5_controle · READ ONLY · week {week} · vingerafdruk (27 kolommen) per rij; vergelijk met verwacht_vingerafdruk.tsv\n" + RO_BEGIN + f"SELECT item_id, {vinger_sql('')} AS h FROM public.curriculum_items WHERE {WEEKF} ORDER BY item_id COLLATE \"C\";\n" + RO_END
    bestanden["7_vinger_aggregaat.sql"] = (f"-- 7_vinger_aggregaat · READ ONLY · insertblok {naam} · week | blok | rest\n-- verwacht vóór: {V['week_voor']}|{V['blok_voor']}|{V['rest']}\n-- verwacht na:   {V['week_na']}|{V['blok_na']}|{V['rest']}\n" + RO_BEGIN +
        f"SELECT ({agg_sql(WEEKF)}) || '|' || ({agg_sql(WEEKF + ' AND ' + in_lijst(blokids))}) || '|' || ({agg_sql(WEEKF + ' AND NOT ' + in_lijst(blokids))}) AS week_blok_rest;\n" + RO_END)
    schrijf_bestanden(bmap, bestanden, naam)
    schrijf_tsv(start, f"{bmap}/VOOR_{naam}.tsv", sorted(start, key=ids_alle.index)); schrijf_tsv(eind, f"{bmap}/NA_{naam}.tsv", sorted(eind, key=ids_alle.index))
    with open(f"{bmap}/verwacht.txt", "w", encoding="utf-8") as f:
        for k, v in V.items(): f.write(f"{k}\t{v}\n")
    with open(f"{bmap}/verwacht_vingerafdruk.tsv", "w", encoding="utf-8") as f:
        f.write("item_id\tvoor\tna\n")
        for i in sorted(eind): f.write(f"{i}\t{vinger_py(start[i]) if i in start else ''}\t{vinger_py(eind[i])}\n")
    open(f"{bmap}/items.txt", "w", encoding="utf-8").write("".join(f"{i}\tnieuw\n" for i in blokids))
    manifest_blok(bmap, nr, naam)
    ap = os.path.getsize(f"{bmap}/3_apply.sql"); gr = os.path.getsize(f"{bmap}/8_generale_repetitie.sql"); dr = os.path.getsize(f"{bmap}/2_droogloop.sql")
    overzicht_ins.append(f"| {nr}_{naam} | {N} nieuw | {N} × {len(INS_KOL)} | {ap/1000:.1f} kB ({100*(GRENS-ap)/GRENS:.0f} %) | {gr/1000:.1f} kB ({100*(GRENS-gr)/GRENS:.0f} %) | {dr/1000:.1f} kB | `{V['week_voor']}` → `{V['week_na']}` |")
    stand = eind; nr += 1
assert set(stand) == set(na), "na de insertblokken ontbreken rijen van NA"
voor = {i: dict(stand[i]) for i in ids_alle}   # v4.6: startstand van de updateblokken = stand na de insertblokken
stand = {i: dict(voor[i]) for i in ids_alle}
if DO_NAAM is None: assert all(voor[i]["display_order"] == na[i]["display_order"] for i in ids_alle), "display_order verschilt tussen VOOR en NA, maar er is geen --display-order-blok (v4.7)"
else:
    assert DO_NAAM not in {n for n, _ in blokken} | {n for n, _ in insblokken}, "de naam van het display_order-blok botst met een ander blok"
    assert DO_NR > START + len(insblokken) + len(blokken) - 1, f"--display-order-blok: nummer {DO_NR} moet ná het laatste inhoudsblok komen"
    assert all(re.fullmatch(r"[1-9][0-9]*", na[i]["display_order"]) for i in ids_alle), "NA display_order moet [1-9][0-9]* zijn voor elke rij (apply_log v1.5.1)"
    assert sorted(int(na[i]["display_order"]) for i in ids_alle) == list(range(1, len(ids_alle) + 1)), "NA display_order is geen permutatie 1 … n"
    assert any(voor[i]["display_order"] != na[i]["display_order"] for i in ids_alle), "--display-order-blok, maar display_order verandert nergens"
if C10_BLOK is not None: assert C10_BLOK in {n for n, _ in blokken}, f"--c10-blok {C10_BLOK}: geen inhoudsblok met die naam"
ROFF_IDS = []
if ROFF_BLOK is not None:   # v4.8 (26): de offline-rollback alleen voor bestaande, gepubliceerde rijen van dat blok met een typewissel
    assert ROFF_BLOK in {n for n, _ in blokken}, f"--rollback-offline {ROFF_BLOK}: geen inhoudsblok met die naam"
    for s_ in ROFF_SUF:
        hit = [i for i in ids_alle if i.split("-", 1)[1] == s_]
        assert len(hit) == 1, f"--rollback-offline: {s_!r} is geen item van week {week}"
        i = hit[0]; assert toewijzing[i] == [ROFF_BLOK], f"--rollback-offline: {i} zit niet in blok {ROFF_BLOK}"
        assert voor[i]["is_published"] == "true" and na[i]["is_published"] == "true", f"--rollback-offline: {i} is niet gepubliceerd in VOOR en NA (depublicatie zinloos)"
        assert voor[i]["exercise_type"] != na[i]["exercise_type"], f"--rollback-offline: {i} heeft geen typewissel in dit blok"
        ROFF_IDS.append(i)
    ROFF_IDS = sorted(ROFF_IDS, key=lambda x: x.encode())
if VW_BLOK is not None: assert VW_BLOK in {n for n, _ in blokken}, f"--voorwaarde-handstap {VW_BLOK}: geen inhoudsblok met die naam"
_gew = lambda i: any(voor[i][k] != na[i][k] for k in KOL)   # v4.11 (32, 33): rijen die een inhoudsblok raakt
STRICT_IDS = {}; ZS_IDS = {}
for i in ids_alle:
    if not _gew(i): continue
    b_ = toewijzing[i][0]
    if na[i]["strict_tashkeel"] == "true": STRICT_IDS.setdefault(b_, []).append(i)
    if na[i]["exercise_type"] == "open-tekst" and na[i]["points"] == "0": ZS_IDS.setdefault(b_, []).append(i)
REG410 = "--regressie-v410" in sys.argv   # v4.11: alleen voor de regressietoets (byte-gelijk aan v4.10); niet samen met de twee grendelopties
if REG410: assert not STRICT_BLOKKEN and not ZS_SPEC, "--regressie-v410 gaat niet samen met --strict-grendel of --zonder-score-grendel"; STRICT_IDS, ZS_IDS = {}, {}
else: assert sorted(STRICT_IDS) == sorted(STRICT_BLOKKEN), f"--strict-grendel {STRICT_BLOKKEN} ≠ de blokken die strict_tashkeel = true zetten {sorted(STRICT_IDS)} (B44/B25: elk zo'n blok krijgt de grendel)"
if not REG410: assert sorted(ZS_IDS) == sorted(ZS_SPEC), f"--zonder-score-grendel {sorted(ZS_SPEC)} ≠ de blokken met open-tekst zonder score {sorted(ZS_IDS)} (B22/B24)"
for b_, ids_ in STRICT_IDS.items():
    for i in ids_:
        r_ = na[i]; assert r_["exercise_type"] == "meerkeuze", f"{i}: strict maar geen meerkeuze"
        assert r_["correct_answer"] in json.loads(r_["options"]), f"{i}: strict, maar de sleutel staat niet byte-gelijk in de opties (B25)"
        assert unicodedata.normalize("NFC", r_["correct_answer"]) == r_["correct_answer"] and unicodedata.normalize("NFC", r_["options"]) == r_["options"], f"{i}: strict, maar sleutel of opties niet NFC (B25)"
for b_, ids_ in ZS_IDS.items():
    for i in ids_:
        r_ = na[i]; assert r_["options"] == "[]", f"{i}: open-tekst zonder score met opties (B22/§13.10-10)"
        assert r_["skill"] in ("cultuur", "reflectie"), f"{i}: open-tekst zonder score buiten cultuur en reflectie (B36)"
def strict_sql(ids):   # v4.11 (32)
    k = len(ids); lst = ", ".join(f"'{i}'" for i in sorted(ids, key=lambda x: x.encode()))
    return (f"(SELECT count(*) = {k} AND bool_and(n.strict_tashkeel AND n.exercise_type = 'meerkeuze'::public.curriculum_exercise_type AND n.options ? n.correct_answer AND n.correct_answer = normalize(n.correct_answer, NFC)) FROM n WHERE n.item_id IN ({lst}))"
            f" AND (SELECT count(*) FROM n WHERE n.strict_tashkeel) = {k}")
def zs_sql(ids, pog):   # v4.11 (33)
    k = len(ids); lst = ", ".join(f"'{i}'" for i in sorted(ids, key=lambda x: x.encode()))
    return (f"(SELECT count(*) = {k} AND bool_and(n.exercise_type = 'open-tekst'::public.curriculum_exercise_type AND n.points = 0 AND n.options = '[]'::jsonb) FROM n WHERE n.item_id IN ({lst}))"
            f" AND (SELECT count(*) FROM n WHERE n.exercise_type = 'open-tekst'::public.curriculum_exercise_type AND n.points = 0) = {k}"
            f" AND (SELECT count(*) FROM public.curriculum_item_attempts a JOIN public.curriculum_items c ON c.id = a.item_id WHERE c.item_id IN ({lst})) = {pog}")
def values_rijen(sql):   # v4.9 (30, D8): de kolomlijst en de VALUES-rijen van elke CTE n(…) AS (VALUES …), als literals ontleed over regelgrenzen heen
    uit = []
    for m in re.finditer(r"\bn\(([^()]*)\) AS \(VALUES", sql):
        cols = [c.strip() for c in m.group(1).split(",")]; i = m.end(); diepte = 0; el = []; cur = []; rijen = []
        while i < len(sql):
            c = sql[i]
            if c == "'":   # literal '…' (ook U&'…'): '' is een aanhalingsteken in de literal; een regeleinde mag erin staan
                j = i + 1
                while True:
                    k = sql.find("'", j)
                    if k < 0: raise AssertionError("koppelen-grendel: open literal in de VALUES (plakfout in de generator)")
                    if k + 1 < len(sql) and sql[k + 1] == "'": j = k + 2; continue
                    break
                if diepte >= 1: cur.append(sql[i:k + 1])
                i = k + 1; continue
            if c == "(":
                diepte += 1
                if diepte == 1: cur, el = [], []; i += 1; continue
            elif c == ")":
                if diepte == 0: break   # einde van AS (VALUES …)
                diepte -= 1
                if diepte == 0: el.append("".join(cur).strip()); rijen.append(el); i += 1; continue
            elif c == "," and diepte == 1: el.append("".join(cur).strip()); cur = []; i += 1; continue
            if diepte >= 1: cur.append(c)
            i += 1
        assert all(len(r) == len(cols) for r in rijen), f"koppelen-grendel: VALUES-rij met {sorted({len(r) for r in rijen})} waarden ≠ {len(cols)} kolommen"
        uit.append((cols, rijen))
    return uit
def koppelen_gepubliceerd(sql):   # v4.8 (27), v4.9 (30): VALUES-rijen die koppelen terugzetten met is_published = true (op kolomnaam, over regelgrenzen heen)
    uit = []
    for cols, rijen in values_rijen(sql):
        if "exercise_type" not in cols or "is_published" not in cols: continue
        ie, ip, ii = cols.index("exercise_type"), cols.index("is_published"), cols.index("item_id")
        uit += [r[ii] for r in rijen if r[ie] == "'koppelen'::public.curriculum_exercise_type" and r[ip] == "true::boolean"]
    return uit
def offline(rijen, ids):   # v4.8 (26): dezelfde rijen, maar ids op is_published = false
    return {i: ({**r, "is_published": "false"} if i in ids else r) for i, r in rijen.items()}
def maak_updateblok(nr, naam, start, eind, blokids, kolb, c10=False, kern="", roff=(), off_rest=()):
    """één updateblok (v4.7): kolb = de kolommen die dit blok schrijft (KOL of ['display_order']); c10 = bucketgrendel in apply en gr."""
    bmap = f"{uitmap}/{nr}_{naam}"; os.makedirs(bmap, exist_ok=True)
    gew = sorted(i for i in blokids if any(start[i][k] != eind[i][k] for k in kolb))
    andere = [(i, k) for i in blokids for k in KOP if k not in kolb and start[i][k] != eind[i][k] and k not in ("updated_at",)]
    assert not andere, f"blok {naam}: verschil buiten de schrijfbare kolommen van dit blok: {andere[:5]}"
    N = len(gew); assert N > 0, f"blok {naam} heeft geen gewijzigde rijen"
    paren = sorted(((i, k) for i in gew for k in kolb if start[i][k] != eind[i][k]), key=lambda p: (p[0].encode(), p[1].encode()))
    rest = [i for i in ids_alle if i not in blokids]
    schrijf_tsv(start, f"{bmap}/VOOR_{naam}.tsv"); schrijf_tsv(eind, f"{bmap}/NA_{naam}.tsv")
    V = {"blok": naam, "items_blok": str(len(blokids)), "gewijzigd": str(N), "paren": str(len(paren)),
         "week_voor": agg_py(start, ids_alle), "week_na": agg_py(eind, ids_alle), "blok_voor": agg_py(start, blokids), "blok_na": agg_py(eind, blokids),
         "rest": agg_py(start, rest), "apply_returning": agg_py(eind, gew), "rollback_returning": agg_py(start, gew)}
    assert agg_py(start, rest) == agg_py(eind, rest)
    oud = f"{len(paren)}|" + md5s("\n".join(f"{i}|{k}|{md5s(start[i][k])}" for i, k in paren))
    V["oud_aggregaat"] = oud
    V["droogloop"] = f"{len(paren)}|{len(paren)}|0||{N}|0|0|{len(ids_alle)}|{oud}|{V['week_voor']}|{V['blok_voor']}|{V['rest']}"
    assert droog_sim(start, paren, start, eind, blokids, N) == V["droogloop"], "droog_sim ≠ de v4.5-formule (live = start)"
    V["week_p3"] = agg0(voor0, voor0); V["rest_p3"] = agg0(voor0, [i for i in voor0 if i not in blokids])
    V["droogloop_p3"] = droog_sim(voor0, paren, start, eind, blokids, N)
    V["gr_eindrij"] = f"{V['week_voor']}|{V['apply_returning']}|{V['week_na']}|{V['rollback_returning']}|{V['week_voor']}"
    V["probe_voor_apply"] = f"{N}|{N}|{N}|{N}|{N}|0"; V["probe_na_apply"] = f"{N}|{N}|0|{N}|{N}|{N}"
    start_rb = offline(start, set(roff))   # v4.8 (26): de rollback-doelstand (= start, met de offline rijen op false)
    assert set(roff) <= set(gew), f"blok {naam}: offline rijen {sorted(set(roff) - set(gew))} worden in dit blok niet gewijzigd"
    if roff:
        V["rollback_returning"] = agg_py(start_rb, gew); V["rollback_offline"] = ",".join(roff)
        V["week_voor_off"] = agg_py(start_rb, ids_alle); V["blok_voor_off"] = agg_py(start_rb, blokids)
        V["gr_eindrij"] = f"{V['week_voor']}|{V['apply_returning']}|{V['week_na']}|{V['rollback_returning']}|{V['week_voor_off']}"
    if off_rest:   # v4.8 (26): de offline-keten van een eerder blok (de offline rijen staan in de rest van dit blok, op hun VOOR-stand)
        assert not set(off_rest) & set(blokids)
        so, eo = offline(start, set(off_rest)), offline(eind, set(off_rest))
        V["week_voor_off"] = agg_py(so, ids_alle); V["week_na_off"] = agg_py(eo, ids_alle); V["rest_off"] = agg_py(so, rest)
    _ex = ([C10_SQL] if c10 else []) + ([strict_sql(STRICT_IDS[naam])] if naam in STRICT_IDS and kolb == KOL else []) + ([zs_sql(ZS_IDS[naam], ZS_SPEC[naam])] if naam in ZS_IDS and kolb == KOL else [])   # v4.11
    _lab = None if not (naam in STRICT_IDS or naam in ZS_IDS) or kolb != KOL else "".join([" + bucketgrendel C10 (B31)" if c10 else "", " + strictgrendel (B44/B25)" if naam in STRICT_IDS else "", " + grendel open-tekst zonder score (B22/B24)" if naam in ZS_IDS else ""])
    apply_sql = update3(gew, eind, start, f"APPLY blok {naam}", kolb, " AND ".join(_ex), _lab); rb_sql = update3(gew, start_rb, eind, f"ROLLBACK blok {naam} uit de back-up" + (f" · OFFLINE: {', '.join(roff)} terug met is_published = false (koppelen crasht zonder C7; alleen met akkoord van Ibra)" if roff else ""), kolb)
    _kp = koppelen_gepubliceerd(rb_sql)
    assert not _kp, f"blok {naam}: de rollback zet {_kp} terug op koppelen met is_published = true (crasht zonder C7) → --rollback-offline \"{naam}=…\" (B17 P1 N1-W08 (3)); STOP, geen uitmap"
    bestanden = {}
    V["apply_uitvoer"] = f"{V['apply_returning']}|repeatable read"; V["rollback_uitvoer"] = f"{V['rollback_returning']}|repeatable read"; V["leeg_uitvoer"] = "0||repeatable read"
    bestanden["3_apply.sql"] = transactie(apply_sql, "apply", apply_sql.split("\n")[0] + f"\n-- REPEATABLE READ (9T V2) · verwacht: {V['apply_uitvoer']} · tweede keer: {V['leeg_uitvoer']} · serialisatiefout = STOP, niets veranderd" + (" · bucketgrendel C10: zonder image/jpeg en image/png in storage.buckets(student-uploads).allowed_mime_types raakt de apply 0 rijen = STOP vóór het blok (B31)" if c10 else "") + "\n")
    bestanden["4_rollback.sql"] = transactie(rb_sql, "rollback", rb_sql.split("\n")[0] + f"\n-- REPEATABLE READ (9T V2) · alleen op opdracht van Ibra · eerst 7_vinger = NA van dit blok · verwacht: {V['rollback_uitvoer']}" + (" · terugdraaien in omgekeerde volgorde: het V-blok (display_order) eerst (9T P2 V3)" if kern else "") + (f" · daarna 7_vinger {V['week_voor_off']}|{V['blok_voor_off']}|{V['rest']} (de week met {', '.join(roff)} offline; v4.8)" if roff else "") + "\n")
    l = rb_sql.split("\n"); idx = [k for k, x in enumerate(l) if x.strip().endswith("= n.h_start")]; assert len(idx) == 1; del l[idx[0]]
    bestanden["4b_noodrollback.sql"] = transactie("\n".join(l), "noodrollback", "-- NOODROLLBACK (4b) blok " + naam + " · alleen met expliciet akkoord van Ibra · zonder toestandsgrendel; plakgrendel en alles-of-niets blijven. Nooit DELETE.\n-- REPEATABLE READ (9T V2) · verwacht na een apply: " + V["rollback_uitvoer"] + (f" · OFFLINE: {', '.join(roff)} met is_published = false (v4.8)" if roff else "") + "\n")
    for _n in ("4_rollback.sql", "4b_noodrollback.sql"): assert not koppelen_gepubliceerd(bestanden[_n]), f"{naam}/{_n}: koppelen met is_published = true"   # v4.8 (27)
    case = lambda a: "CASE p.veld " + " ".join(f"WHEN '{k}' THEN {a}.{k}::text" for k in kolb) + " END"
    pvals = ",\n  ".join(f"('{i}', '{k}', '{md5s(start[i][k])}', '{md5s(eind[i][k])}')" for i, k in paren)
    bestanden["2_droogloop.sql"] = (f"-- 2_droogloop · READ ONLY · blok {naam} · week {week} · per gewijzigd veld: is de live waarde de oude (VOOR)? + aggregaten week/blok/rest\n"
        f"-- verwacht in P3 (live = {'VOOR' if not opt('--p3-live') else 'de back-up'}): {V['droogloop_p3']}\n-- verwacht in P4 vlak vóór dit blok: {V['droogloop']}\n" + RO_BEGIN +
        f"WITH p(item_id, veld, h_oud, h_nieuw) AS (VALUES\n  {pvals}\n),\n"
        f"x AS (SELECT p.item_id, p.veld, p.h_oud, p.h_nieuw, (i.item_id IS NOT NULL) AS gevonden, md5(coalesce({case('i')}, '')) AS h_live\n"
        f"      FROM p LEFT JOIN public.curriculum_items i ON i.item_id = p.item_id AND i.{WEEKF})\n"
        f"SELECT concat_ws('|', count(*) FILTER (WHERE gevonden), count(*) FILTER (WHERE gevonden AND h_live = h_oud), count(*) FILTER (WHERE gevonden AND h_live = h_nieuw),\n"
        f"  coalesce(string_agg(item_id || ':' || veld, ', ' ORDER BY item_id COLLATE \"C\", veld COLLATE \"C\") FILTER (WHERE NOT gevonden OR h_live IS DISTINCT FROM h_oud), ''),\n"
        f"  (SELECT count(DISTINCT item_id) FROM p), 0, 0, (SELECT count(*) FROM public.curriculum_items WHERE {WEEKF}),\n"
        f"  count(*)::text || '|' || coalesce(md5(string_agg(item_id || '|' || veld || '|' || h_live, E'\\n' ORDER BY item_id COLLATE \"C\", veld COLLATE \"C\")), ''),\n"
        f"  ({agg_sql(WEEKF)}), ({agg_sql(WEEKF + ' AND ' + in_lijst(blokids))}), ({agg_sql(WEEKF + ' AND NOT ' + in_lijst(blokids))})) AS droogloop\nFROM x;\n" + RO_END)
    bestanden["5_controle.sql"] = f"-- 5_controle · READ ONLY · week {week} · vingerafdruk (27 kolommen) per rij; vergelijk met verwacht_vingerafdruk.tsv\n" + RO_BEGIN + f"SELECT item_id, {vinger_sql('')} AS h FROM public.curriculum_items WHERE {WEEKF} ORDER BY item_id COLLATE \"C\";\n" + RO_END
    bestanden["6_oud_aggregaat.sql"] = (f"-- 6_oud_aggregaat · READ ONLY · blok {naam} · verwacht vóór de apply: {oud}\n" + RO_BEGIN +
        "WITH p(item_id, veld) AS (VALUES " + ", ".join(f"('{i}','{k}')" for i, k in paren) + ")\n"
        f"SELECT count(*)::text || '|' || coalesce(md5(string_agg(p.item_id || '|' || p.veld || '|' || md5(coalesce({case('c')}, '')), E'\\n' ORDER BY p.item_id COLLATE \"C\", p.veld COLLATE \"C\")), '') AS oud_aggregaat\n"
        f"FROM p JOIN public.curriculum_items c ON c.item_id = p.item_id AND c.{WEEKF};\n" + RO_END)
    bestanden["7_vinger_aggregaat.sql"] = (f"-- 7_vinger_aggregaat · READ ONLY · blok {naam} · week | blok | rest\n-- verwacht vóór: {V['week_voor']}|{V['blok_voor']}|{V['rest']}\n-- verwacht na:   {V['week_na']}|{V['blok_na']}|{V['rest']}\n" + RO_BEGIN +
        f"SELECT ({agg_sql(WEEKF)}) || '|' || ({agg_sql(WEEKF + ' AND ' + in_lijst(blokids))}) || '|' || ({agg_sql(WEEKF + ' AND NOT ' + in_lijst(blokids))}) AS week_blok_rest;\n" + RO_END)
    zet = lambda n: f"SELECT set_config('hva.{n}', ({agg_sql(WEEKF)}), true);"
    bestanden["8_generale_repetitie.sql"] = (f"-- 8_generale_repetitie · blok {naam} · netto read-only: BEGIN; SET TRANSACTION ISOLATION LEVEL REPEATABLE READ … ROLLBACK in één aanroep, met de T15-telling (activiteit) in dezelfde aanroep\n"
        f"-- verwacht: {V['gr_eindrij']} | activiteit pogingen30|pogingen30_leerders|logins30_leerders|logins30_staf|laatste_poging (STOP als pogingen30_leerders of logins30_leerders ≠ de verwachting van --verwacht-activiteit) | isolatie = repeatable read\n"
        + BEGIN_RR + ACTIVITEIT + "\n" + zet("start") + "\n" + wrap(apply_sql, "apply") + "\n" + zet("na_apply") + "\n" + wrap(rb_sql, "rollback") + "\n" + zet("na_rollback") +
        "\nSELECT current_setting('hva.start') AS start, current_setting('hva.apply') AS apply, current_setting('hva.na_apply') AS na_apply, current_setting('hva.rollback') AS rollback, current_setting('hva.na_rollback') AS na_rollback, current_setting('hva.activiteit') AS activiteit, current_setting('transaction_isolation') AS isolatie;\nROLLBACK;\n")
    pw = lambda a: f"(SELECT count(*) FROM {a} n WHERE {inhoud_sql('n', kolb)} = n.h_inhoud)"
    ps = lambda a: f"(SELECT count(*) FROM public.curriculum_items i JOIN {a} m ON m.item_id = i.item_id WHERE i.{WEEKF} AND {vinger_sql('i')} = m.h_start)"
    bestanden["9_grootte_probe.sql"] = (f"-- 9_grootte_probe v2 · READ ONLY · blok {naam} · dezelfde VALUES als apply (a) en rollback (r) in de generale repetitie (die is groter: UPDATE-tekst en T15) · wijzigt niets\n"
        f"-- verwacht vóór de apply: {V['probe_voor_apply']} · na de apply: {V['probe_na_apply']} (a_n|a_inhoud_ok|a_start_ok|r_n|r_inhoud_ok|r_start_ok)\n" + RO_BEGIN +
        f"WITH {nwith('a', gew, eind, start, kolb)},\n{nwith('r', gew, start_rb, eind, kolb)}\n"
        f"SELECT concat_ws('|', (SELECT count(*) FROM a), {pw('a')}, {ps('a')}, (SELECT count(*) FROM r), {pw('r')}, {ps('r')}) AS probe;\n" + RO_END)
    if c10:
        _up = sorted((i for i in blokids if eind[i]["exercise_type"] == "bestand-upload" and start[i]["exercise_type"] != "bestand-upload"), key=lambda x: x.encode())   # v4.8 (25): geteld
        assert _up, f"--c10-blok {naam}: geen item wordt in dit blok bestand-upload"
        _vt = "/".join(sorted({start[i]["exercise_type"] for i in _up}))
        bestanden["1_c10_grendel.sql"] = (f"-- 1_c10_grendel · READ ONLY · blok {naam} · B31/9T P2 V1: laat de bucket student-uploads beeld toe? Verwacht: true (anders STOP vóór dit blok: de {len(_up)} items die hier bestand-upload worden ({', '.join(_up)}) blijven {_vt}; dit blok en alle blokken erna blijven dicht)\n"
            + RO_BEGIN + f"SELECT coalesce({C10_SQL}, false)::text AS c10_grendel;\n" + RO_END)
        V["c10_grendel"] = "true"
    if naam in STRICT_IDS and kolb == KOL:   # v4.11 (32): READ ONLY, buiten het log, vlak vóór het blok
        _si = sorted(STRICT_IDS[naam], key=lambda x: x.encode()); _lst = ", ".join(f"'{i}'" for i in _si)
        _t = " AND ".join(f"normalize({lit(eind[i]['correct_answer'], 'correct_answer')}, NFC) = {lit(eind[i]['correct_answer'], 'correct_answer')} AND {lit(eind[i]['options'], 'options')} ? {lit(eind[i]['correct_answer'], 'correct_answer')}" for i in _si)
        bestanden["1_strict_grendel.sql"] = (f"-- 1_strict_grendel · READ ONLY · blok {naam} · B44/B25: vergelijkt de databank de {len(_si)} sleutels zoals de app met strict (zonder NFC, exact in de opties) en staat nog geen van {_lst} op strict? Verwacht: true|0 (anders STOP vóór dit blok)\n"
            + RO_BEGIN + f"SELECT ({_t})::text || '|' || (SELECT count(*) FROM public.curriculum_items WHERE {WEEKF} AND item_id IN ({_lst}) AND strict_tashkeel)::text AS strict_grendel;\n" + RO_END)
        V["strict_grendel"] = "true|" + str(sum(1 for i in _si if start[i]["strict_tashkeel"] == "true"))
    if naam in ZS_IDS and kolb == KOL:   # v4.11 (33)
        _zi = sorted(ZS_IDS[naam], key=lambda x: x.encode()); _lst = ", ".join(f"'{i}'" for i in _zi)
        bestanden["1_zonder_score_grendel.sql"] = (f"-- 1_zonder_score_grendel · READ ONLY · blok {naam} · B22/B24: pogingen op de {len(_zi)} items die hier open-tekst zonder score worden | hoeveel staan er nu al zo · verwacht: {ZS_SPEC[naam]}|{sum(1 for i in _zi if start[i]['exercise_type'] == 'open-tekst' and start[i]['points'] == '0')} (anders STOP vóór dit blok)\n"
            + RO_BEGIN + f"SELECT (SELECT count(*) FROM public.curriculum_item_attempts a JOIN public.curriculum_items c ON c.id = a.item_id WHERE c.item_id IN ({_lst}))::text || '|' || (SELECT count(*) FROM public.curriculum_items WHERE {WEEKF} AND item_id IN ({_lst}) AND exercise_type = 'open-tekst' AND points = 0)::text AS zonder_score_grendel;\n" + RO_END)
        V["zonder_score_grendel"] = f"{ZS_SPEC[naam]}|" + str(sum(1 for i in _zi if start[i]["exercise_type"] == "open-tekst" and start[i]["points"] == "0"))
    V["probe_p3"] = (f"{N}|{N}|{sum(1 for i in gew if i in voor0 and vinger_py(voor0[i]) == vinger_py(start[i]))}|{N}|{N}|"
                     f"{sum(1 for i in gew if i in voor0 and vinger_py(voor0[i]) == vinger_py(eind[i]))}")
    p3p = [(i, k) for i, k in paren if i in voor0]
    V["oud_p3"] = f"{len(p3p)}|" + (md5s("\n".join(f"{i}|{k}|{md5s(voor0[i][k])}" for i, k in p3p)) if p3p else "")
    V["blok_p3"] = agg0(voor0, [i for i in blokids if i in voor0]); V["soort"] = "update"
    if kern: V["kern"] = kern
    if VW_BLOK is not None and naam == VW_BLOK: V["voorwaarde"] = VW_STAP   # v4.8 (28)
    schrijf_bestanden(bmap, bestanden, naam)
    with open(f"{bmap}/verwacht.txt", "w", encoding="utf-8") as f:
        for k, v in V.items(): f.write(f"{k}\t{v}\n")
    with open(f"{bmap}/verwacht_vingerafdruk.tsv", "w", encoding="utf-8") as f:
        f.write("item_id\tvoor\tna\n")
        for i in sorted(ids_alle): f.write(f"{i}\t{vinger_py(start[i])}\t{vinger_py(eind[i])}\n")
    open(f"{bmap}/items.txt", "w", encoding="utf-8").write("".join(f"{i}\t{'gewijzigd' if i in gew else 'ongewijzigd'}\n" for i in blokids))
    manifest_blok(bmap, nr, naam)
    gr = os.path.getsize(f"{bmap}/8_generale_repetitie.sql"); pr = os.path.getsize(f"{bmap}/9_grootte_probe.sql"); ap = os.path.getsize(f"{bmap}/3_apply.sql")
    uesc_n = sum(open(f"{bmap}/{x}", encoding="utf-8").read().count("U&'") for x in ("3_apply.sql", "4_rollback.sql"))
    overzicht.append(f"| {nr}_{naam} | {len(blokids)} | {N} | {len(paren)} | {ap/1000:.1f} kB | {gr/1000:.1f} kB ({100*(GRENS-gr)/GRENS:.0f} %) | {pr/1000:.1f} kB ({100*(GRENS-pr)/GRENS:.0f} %) | {uesc_n} | `{V['week_voor']}` → `{V['week_na']}` |" + (f" {kern}" if kern else "") + (" C10-grendel" if c10 else "") + (" strictgrendel" if naam in STRICT_IDS and kolb == KOL else "") + (" grendel zonder score" if naam in ZS_IDS and kolb == KOL else ""))
    return eind
for nr, (naam, pref) in enumerate(blokken, nr):
    start = {i: dict(stand[i]) for i in ids_alle}
    blokids = sorted(i for i in ids_alle if toewijzing[i] == [naam])
    eind = {i: (dict(na[i]) if i in blokids else dict(start[i])) for i in ids_alle}
    for i in blokids:
        if DO_NAAM is not None: eind[i]["display_order"] = start[i]["display_order"]   # v4.7 (21): de inhoudsblokken laten de volgorde staan; het V-blok zet ze
    assert all(start[i][k] == voor[i][k] for i in blokids for k in KOP), "blokrijen moeten bij de start van hun blok nog de VOOR-stand hebben"
    _vroeger = ROFF_BLOK is not None and [n for n, _ in blokken].index(naam) < [n for n, _ in blokken].index(ROFF_BLOK)
    stand = maak_updateblok(nr, naam, start, eind, blokids, KOL, c10=(naam == C10_BLOK), roff=(ROFF_IDS if naam == ROFF_BLOK else ()), off_rest=(ROFF_IDS if _vroeger else ()))
if DO_NAAM is not None:   # v4.7 (21): het V-blok als laatste
    start = {i: dict(stand[i]) for i in ids_alle}
    eind = {i: dict(na[i]) for i in ids_alle}
    assert all(start[i][k] == eind[i][k] for i in ids_alle for k in KOL), "vóór het V-blok moet de inhoud al de NA-stand hebben"
    stand = maak_updateblok(DO_NR, DO_NAAM, start, eind, list(ids_alle), ["display_order"], kern="display_order")
assert all(stand[i] == na[i] for i in ids_alle), "na het laatste blok is de stand niet gelijk aan de NA-stand"
with open(f"{uitmap}/SQL_MANIFEST.tsv", "w", encoding="utf-8") as f:
    for r in manifest: f.write("\t".join(r) + "\n")
kop = "| blok | items | gewijzigd | velden | 3_apply | 8_generale_repetitie (marge) | 9_grootte_probe v2 (marge) | U&-escapes (apply+rollback) | week-vingerafdruk vóór → na |\n|---|---|---|---|---|---|---|---|---|"
kop_ins = "| insertblok | rijen | kolommen | 3_apply (marge) | 8_generale_repetitie (marge) | 2_droogloop | week-vingerafdruk vóór → na |\n|---|---|---|---|---|---|---|"
volg = [n for n, _ in insblokken] + [n for n, _ in blokken] + ([DO_NAAM] if DO_NAAM else [])
ins_tekst = (f"Insertblokken eerst (nieuwe rijen, `is_published = false`; terugdraaien = niet nodig: de rijen blijven onzichtbaar; nooit DELETE):\n\n{kop_ins}\n" + "\n".join(overzicht_ins) + "\n\nUpdateblokken (de nieuwe rijen worden hier per reeks gepubliceerd):\n\n") if insblokken else ""
do_tekst = (f"\n\nHet V-blok `{DO_NR}_{DO_NAAM}` schrijft alleen `display_order` (B30; `::integer`, 1 … {len(ids_alle)}) en komt als laatste, na de nazorgblokken van de andere weken; terugdraaien begint bij dit blok (9T P2 V3): na het V-blok passen de rijgrendels van de inhoudsblokken niet meer (0 rijen = STOP).\n" if DO_NAAM else "\n")
c10_tekst = (f"Blok `{C10_BLOK}` heeft de bucketgrendel C10 (B31): de apply raakt 0 rijen zolang `storage.buckets(student-uploads).allowed_mime_types` geen `image/jpeg` en `image/png` bevat; `1_c10_grendel.sql` toetst dat apart (READ ONLY, verwacht `true`).\n" if C10_BLOK else "")
roff_tekst = (f"Blok `{ROFF_BLOK}` gaat alleen offline terug (v4.8, B17 P1 N1-W08 (3)): `4_rollback.sql` en `4b_noodrollback.sql` zetten {', '.join(ROFF_IDS)} terug op hun VOOR-inhoud met `is_published = false` (koppelen crasht zonder C7); alleen met een akkoord van Ibra dat de depublicatie noemt; daarna niet opnieuw toepasbaar zonder hergenereren.\n" if ROFF_BLOK else "")
vw_tekst = (f"Blok `{VW_BLOK}` vraagt vóór vinger_voor, gr en apply de handstap `{VW_STAP}` in het P4-log (v4.8).\n" if VW_BLOK else "")
vw_tekst += "".join(f"Blok `{b_}` heeft de strictgrendel (v4.11, B44/B25): de apply raakt 0 rijen tenzij {len(STRICT_IDS[b_])} rijen ({', '.join(sorted(STRICT_IDS[b_]))}) meerkeuze zijn met strict en hun sleutel in NFC byte-gelijk in de opties staat; `1_strict_grendel.sql` toetst vooraf de semantiek van de databank (READ ONLY, verwacht `true|0`).\n" for b_ in STRICT_IDS)
vw_tekst += "".join(f"Blok `{b_}` heeft de grendel open-tekst zonder score (v4.11, B22/B24): de apply raakt 0 rijen tenzij precies {len(ZS_IDS[b_])} rijen open-tekst met 0 punten en zonder opties worden en er {ZS_SPEC[b_]} pogingen op staan; `1_zonder_score_grendel.sql` toetst dat vooraf (READ ONLY).\n" for b_ in ZS_IDS)
open(f"{uitmap}/BLOKKEN.md", "w", encoding="utf-8").write(f"# SQL {VERSIE} · week {week} · blokken\nGemaakt door `{os.path.basename(__file__)}` {VERSIE} uit `{os.path.basename(args[0])}` (md5 `{hashlib.md5(open(args[0],'rb').read()).hexdigest()}`) en `{os.path.basename(args[1])}` (md5 `{hashlib.md5(open(args[1],'rb').read()).hexdigest()}`). Volgorde apply: {' → '.join(volg)}; terugdraaien in omgekeerde volgorde: {' → '.join(reversed([n for n, _ in blokken] + ([DO_NAAM] if DO_NAAM else [])))}" + (f" (de insertblokken {', '.join(n for n, _ in insblokken)} worden niet teruggedraaid)" if insblokken else "") + f". Na het laatste blok = NA-stand (gecontroleerd).\n\n{ins_tekst}{kop}\n" + "\n".join(overzicht) + do_tekst + c10_tekst + roff_tekst + vw_tekst)
os.rename(uitmap, DOEL); _klaar.append(1); uitmap = DOEL
print(open(f"{uitmap}/BLOKKEN.md", encoding="utf-8").read())
print("SQL_MANIFEST.tsv md5", hashlib.md5(open(f"{uitmap}/SQL_MANIFEST.tsv", "rb").read()).hexdigest())
