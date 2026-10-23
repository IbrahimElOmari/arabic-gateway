# tools/hva-content — teamscripts N1-W03 (content-vrij, B9)
Branch `content/N1-W03-inhoud` (vanaf `main` @ `e7317258`). Geen PR en geen merge (P3-beslissing 7 van N1-W02). Scripts met lesinhoud (`maak_log_N1-W03.py`, `maak_revisie_D_N1-W03.py`, `ontwerp_voor_na_N1-W03.py`) staan alleen in de bundel en in Drive. Arabisch in deze scripts = tekenklassen en één testteken, geen lesinhoud.

| script | versie | rol | wat |
|---|---|---|---|
| `check_N1-W03.py` | v1.4 | 3T/8T | v1.3 + rangschikken/gatentekst-sleutel met `→` of zonder `|` = H; open-tekst met dezelfde sleutel als een ander item = H (alle betrokken items). `--poort`, `--uitzondering=<item_id>` voor een gedepubliceerd item. |
| `apply_log.py` | v1.3 | 4T/7T | v1.2 + `exercise_type` als enum (`public.curriculum_exercise_type`); een waarde buiten de enum = geweigerd (P1-18, 9T V1). |
| `negatief_apply_N1-W03.py` | v1 | 8T | 9 tests op kopieën: T0 de proef (exit 0); v1.2 weigert `exercise_type`; enum fout/hoofdletter; `oud` ≠ app; status met spatie; review zonder ja; `nieuw` ≠ review; 0 goedgekeurd (alle exit 2). |
| `rendertoets_N1-W03.py` | v1.0.1 | 3T/8T | B27 op twee manieren (APP = `isolateArabic` uit `CurriculumItemPage.tsx` van de checkout; PLAT = platte tekst), ook opties, `input_arabic` (RTL) en de genummerde sleutel (`dir="auto"`); `--log` voor gewijzigd/ongewijzigd; exit 2 als de poort faalt. Gebruikt `maak_html_bdi.mjs` (zelfde map). |
| `maak_html_bdi.mjs` | (N1-W02 P4) | 3T | haalt `isolateArabic` letterlijk uit de TSX en maakt de HTML (react 18.3.1, typescript 5.8.3). |
| `maak_proef_N1-W03.py` | v1 | 4T | simulatie van "P2 akkoord" op kopieën (alles goedgekeurd, review alles ja). |
| `telrapport_P2_N1-W03.py` | v1 | 1T/8T | tellingen VOOR → NA en de diff-controle in twee richtingen (elk verschil een logregel, elke logregel een verschil); exit 2 bij een onverklaard verschil. |
| `tashkil_scan_N1-W03.py` | v1 | 2T | heuristiek B1: woorden met ontbrekende tashkīl per item. |
| `keten_P2_N1-W03.sh` | v1.1 | 4T/3T | de hele P2-keten (revisie → check → log → proef → check --poort → rendertoets 900/330); tweede run bit-gelijk. v1.1 (9T V2): `set -euo pipefail`, eerst de md5 van de bronnen, alle uitvoer eerst gewist, elke STOP breekt af. Argument `a|b` = variant van `U3-luisteren-03`. Verwacht de werkmap-indeling `scripts/`, `scripts/w03/`, `bron/`, `p2/`. |
| `review_bulk.py` | v1.3 | 4T | zet het antwoord van de native reviewer om per wijziging_id; v1.3 (9T V3): poortbesluiten 1–99 ("10a", "12 ja") worden herkend, ook direct na een 'aangepast'-tekst. |
| `verwerk_p2_N1-W03.py` | v1.2 | 1D | statussen in het log, item-atomair; v1.2 (9T V1): `--logbesluiten` verplicht als `<review>_logbesluiten.tsv` bestaat, anders STOP. |
| `verwerk_antwoord_P2_N1-W03.py` | v1 | 1D/1T | verwerkt het letterlijke P2-antwoord van Ibra in één gang (poortbesluiten, varianten, review, statussen, apply, NA-diff tegen de proef, bevestigingen, check, rapport per teruggestuurd item) (9T V1–V4). |
| `negatief_verwerking_N1-W03.py` | v1 | 8T | 17 tests op de verwerking (o.a. "3b", "W0525 nee", "aangepast … · 8a", typfout-id, "ja maar", "12a", het lek van v1.1). |
| `maak_bundel_P2_N1-W03.py` | v1 | 1T | de P2-bundel met MD5-manifest. |
| `maak_sql_N1-W03.py` | v4.4.1 | 7T | v4.3.1 + `exercise_type` als enumcast (live enum verplicht via `--enum-live`, foute waarde = weigeren), `--start` voor de bloknummers; v4.4.1 (8T C-T08): bouwt in `<uitmap>.bouw` en hernoemt pas op het einde, een weigering laat niets achter. |
| `maak_manifest_N1-W03.py` | v1 | 7T | `BLOKKEN_MANIFEST.tsv` (volgorde · week · blok · map · md5 verwacht.txt · week_voor · week_na); nummers 1..n, unieke namen, gesloten keten per week. |
| `p4_stap_N1-W03.py` | v1.3.1 | 7T/8T | scheidsrechter per P4-stap, alles uit het manifest; geen manifest of een gewijzigde verwacht.txt = STOP (de W02-bundel wordt geweigerd). v1.3: stap `bestand` (map van het blok + md5 = SQL_MANIFEST), stap `noodrollback`, spaties aan begin/eind = STOP; v1.3.1: `stand` alleen in de volledige vorm 3 × aantal\|md5. |
| `p4_log_stap_N1-W03.py` | v1.2.1 | 1D | legt één P4-aanroep vast en laat `p4_stap` oordelen; v1.2: volgorde over de weken uit het P4-log (toegepast/open/onzeker), `--voor` = voorcontrole van volgorde en bestand vóór het plakken, stappen rollback/noodrollback, logmap wordt aangemaakt (8T C-T01–C-T04). |
| `maak_verwacht_per_stap_N1-W03.py` | v1.4 | 7T | `VERWACHT_PER_STAP.md`, `slot_tellingen_N1-W03.sql` en `slot_verwacht_N1-W03.json` uit het manifest en de NA/VOOR-bestanden; v1.4 (C-T09): `--rijen`, met rijen_totaal, rijen_n1 en de regel voor de pogingen. |
| `replica_test_N1-W03.py` | v3.1 | 8T | replica PostgreSQL 16: schema = live, leescontroles P3, P4-draaiboek 1 → 7 via `p4_log_stap` (voorcontrole + oordeel, log op het standaardpad), slottellingen = slot_verwacht, terugdraaien 7 → 1, negatieve tests (grendels, U&/NFC, enum, read-only, 4b, serialisatie, omhulde transactie, volgorde binnen en over de weken, dubbel blok, terugdraaien buiten de volgorde, activiteit met echte rijen, bestandsbinding, manifest, toolfout). 193 tests. |
| `keten_P3_N1-W03.sh` | v1.1 | 7D/7T/8T | de hele P3-keten uit het goedgekeurde log en de back-ups (lijsten → telrapport/diff → JSON → check → rendertoets → SQL → manifest → verwachtingen → replica); eerst de md5 van de invoer, alles gewist en opnieuw gemaakt, tweede run bit-gelijk. Verwacht de werkmap-indeling `scripts/`, `scripts/w03/`, `bron/`, `na_p2/`, `p3/`. |
| `rapport_7D_N1-W03.py` | v1 | 7D | telrapport en leesbare diff voor W03 + nazorg W02/W01 (veld- en regelniveau, `app:is_published`). |
| `p3_leescontrole_N1-W03.py` | v1 | 8T | beoordeelt één live leescontrole (droogloop, probe, vinger) tegen `verwacht.txt` en legt ze vast. |
| `app_naar_master.py` | v1.1 | 7D | app-export → lijstformaat; nieuw: regel `app:is_published` bij false (P1-18). |
| `maak_json_N1-W02.py` · `valideer_structuur_N1-W02.py` | v1.1 · v1 | 7T/8T | JSON (schema v1-structuur) en structuurtoets (geen schemavalidatie: schema v1 niet in de chat). |

## md5 (2026-10-23, na de nacontrole 8T)
```
2b0ce81e7e783a5e1564230553d55eab  app_naar_master.py
797af8baa3ac2d8770234d3c05318fad  apply_log.py
0a6838875c8262c532dba5e704a982e4  check_N1-W03.py
cf2cd1e80cc0e18534d89e606266a606  keten_P2_N1-W03.sh
e0b4fcf01d328a0eebd6358170d93977  keten_P3_N1-W03.sh
352d0989a4e5445b99ea6a804a48b03e  maak_bundel_P2_N1-W03.py
65608641f395ee3fe7b3a227e370a5b0  maak_html_bdi.mjs
b4b39e8d402388f1d944f7b48b77d05f  maak_json_N1-W02.py
280872f61d24e0612fb26148fc80e6d4  maak_manifest_N1-W03.py
3a2f7b4ef8b676d685df29ccc1348fac  maak_proef_N1-W03.py
f3d1b0dc34ba62f846b030efe2ba03dc  maak_sql_N1-W03.py
1e87ff6be995331863966bdceb2098ac  maak_verwacht_per_stap_N1-W03.py
5244ed49da90061fc30f1ed832b631c8  negatief_apply_N1-W03.py
ca6b6e803b6007bd556bbd7b2dcc997d  negatief_verwerking_N1-W03.py
427f3f158c0ba947953ee3a5f80cef73  p3_leescontrole_N1-W03.py
dc0ef8dc79134a6e0a611c3bb2237d83  p4_log_stap_N1-W03.py
2d5dd04890e659428ca3bc2541e0dd97  p4_stap_N1-W03.py
4ebdfca0958d42503833684e0bd11b8e  rapport_7D_N1-W03.py
d3b680219026e419af05a63b713d30be  rendertoets_N1-W03.py
142fdad56b94dcc06073d1a9c3080876  replica_test_N1-W03.py
06dd21b7e203673ffb5729fffd9ad664  review_bulk.py
ddb289a2da42565ef81c44f1459b9f4e  tashkil_scan_N1-W03.py
21170e1ec58d89c6a092517f3f91c6f0  telrapport_P2_N1-W03.py
67f4857fa686a984869b3eb5bf2c9d73  valideer_structuur_N1-W02.py
257e3ab6e4f902d77d2ef5f859145cb5  verwerk_antwoord_P2_N1-W03.py
15568f0ede8c0fbcae97c554b43ad2e6  verwerk_p2_N1-W03.py
```
