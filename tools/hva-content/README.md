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
| `p4_stap_N1-W03.py` | v1.4.1 | 7T/8T | scheidsrechter per P4-stap uit het manifest; v1.3: stap `bestand`, `noodrollback`, spaties = STOP; v1.3.1: `stand` alleen volledig; v1.4: blok `slot` (slot_ref, slot met `--ref`, zicht_voor, zicht_na tegen `slot_verwacht`), gr met `--activiteit-akkoord`; v1.4.1: leerderszicht ook als leerder. |
| `p4_log_stap_N1-W03.py` | v1.4 | 1D | legt één P4-aanroep vast en laat `p4_stap` oordelen. v1.2: volgorde uit het log, `--voor`; v1.3: apply alleen na ✓ gr en direct na de eigen voorcontrole, `--akkoord-ibra`, stand zet de week, slotstappen, ketenhash; v1.4 (9T P4): `--uit <bestand>` (heredoc), flock op het log, stand moet kloppen met het log, P3-referentie als terugval, gr ≤ 15 min, scriptfout = exit 2. |
| `maak_verwacht_per_stap_N1-W03.py` | v1.7 | 7T | `VERWACHT_PER_STAP.md` (met herstelpad), `slot_tellingen_N1-W03.sql`, `leerderszicht_N1-W03.sql` v2 (ook als leerder: rol authenticated, RLS) en `slot_verwacht_N1-W03.json` (NA, VOOR, zicht, `pogingen_ref_p3`); `--rijen`, `--zicht`, `--ref-p3`. |
| `replica_test_N1-W03.py` | v3.4 | 8T | replica PostgreSQL 16 met heel N1, de 6 policies, de rol authenticated en een leerder; P4-draaiboek via `p4_log_stap`, slotstappen, terugdraaien, negatieve tests, G6 (9T P3 S1–S8) en G7 (draaiboek variant b via bash met heredoc, V2–V4, gr te oud, V6, scriptfout). 223 tests. |
| `keten_P3_N1-W03.sh` | v1.4 | 7D/7T/8T | de hele P3-keten uit het goedgekeurde log en de back-ups; md5 van alle invoer (ook N1-export, live policies en de P3-referentie); tweede run bit-gelijk op de replicalogs na. |
| `proef_p3_delta_N1-W03.sh` | v1 | 7T | simulatie van "P3-delta ja" op kopieën: W02/W01 byte-gelijk, W03 = precies de deltavelden, check --poort, rendertoets. (`maak_p3_delta_N1-W03.py` zelf bevat lesinhoud → alleen in de bundel.) |
| `maak_bundel_P3_N1-W03.py` | v1 | 1T | de P3-bundel (p3/, deel2/, scripts/) met MD5-manifest, zonder tijdelijke replica-bestanden. |
| `maak_draaiboek_P4_N1-W03.py` | v2 | 1T | het P4-draaiboek aanroep per aanroep uit het manifest en de verwachtingen; `--variant a` (4 + 1 per blok) of `b` (2 + 1 per blok, 9T P4 §3). |
| `p4_status_N1-W03.py` | v1 | 1D | één statusregel uit het P4-log (regels, md5, laatste ketenhash, stand per week, referentie, akkoorden) (9T P4 V8). |
| `voorspel_master_N1-W03.py` | v1 | 7T | de master zoals hij na P4 moet zijn (9T P4 V7), met de regeldiff tegen de huidige master. |
| `maak_bundel_deel2_N1-W03.py` | v1 | 1T | de bundel voor deel 3 met MD5-manifest, zonder oude scriptversies en replicalogs (9T P4 V5). |
| `rapport_7D_N1-W03.py` | v1 | 7D | telrapport en leesbare diff voor W03 + nazorg W02/W01 (veld- en regelniveau, `app:is_published`). |
| `p3_leescontrole_N1-W03.py` | v1 | 8T | beoordeelt één live leescontrole (droogloop, probe, vinger) tegen `verwacht.txt` en legt ze vast. |
| `app_naar_master.py` | v1.1 | 7D | app-export → lijstformaat; nieuw: regel `app:is_published` bij false (P1-18). |
| `maak_json_N1-W02.py` · `valideer_structuur_N1-W02.py` | v1.1 · v1 | 7T/8T | JSON (schema v1-structuur) en structuurtoets (geen schemavalidatie: schema v1 niet in de chat). |

## md5 (2026-10-23, P4-rapport na de tegenrapporten 9D en 9T)
```
2b0ce81e7e783a5e1564230553d55eab  app_naar_master.py
797af8baa3ac2d8770234d3c05318fad  apply_log.py
0a6838875c8262c532dba5e704a982e4  check_N1-W03.py
cf2cd1e80cc0e18534d89e606266a606  keten_P2_N1-W03.sh
bd222d2728fe3128420aafa03ab442dc  keten_P3_N1-W03.sh
352d0989a4e5445b99ea6a804a48b03e  maak_bundel_P2_N1-W03.py
6dad73cc18a6d6f1af158eafa0689151  maak_bundel_P3_N1-W03.py
6a182ae61db43d7f1958a7080018f2e6  maak_bundel_deel2_N1-W03.py
2f994f5db76fa31679d6be06ad6363a3  maak_draaiboek_P4_N1-W03.py
65608641f395ee3fe7b3a227e370a5b0  maak_html_bdi.mjs
b4b39e8d402388f1d944f7b48b77d05f  maak_json_N1-W02.py
280872f61d24e0612fb26148fc80e6d4  maak_manifest_N1-W03.py
3a2f7b4ef8b676d685df29ccc1348fac  maak_proef_N1-W03.py
f3d1b0dc34ba62f846b030efe2ba03dc  maak_sql_N1-W03.py
abaed20326e97f0f74bf7f4b055b83b5  maak_verwacht_per_stap_N1-W03.py
5244ed49da90061fc30f1ed832b631c8  negatief_apply_N1-W03.py
ca6b6e803b6007bd556bbd7b2dcc997d  negatief_verwerking_N1-W03.py
427f3f158c0ba947953ee3a5f80cef73  p3_leescontrole_N1-W03.py
0638c04eedbffa6ad4480a171af9ccce  p4_log_stap_N1-W03.py
d75fb750e4a0ebfb8244e8e1735b908b  p4_stap_N1-W03.py
747fc3fce98fe2ef15561c5e587e97e7  p4_status_N1-W03.py
81b7f6cac922920e1128e74d7f4c398c  proef_p3_delta_N1-W03.sh
4ebdfca0958d42503833684e0bd11b8e  rapport_7D_N1-W03.py
d3b680219026e419af05a63b713d30be  rendertoets_N1-W03.py
57f166ebb845b83e165ebfe0ec89e406  replica_test_N1-W03.py
06dd21b7e203673ffb5729fffd9ad664  review_bulk.py
ddb289a2da42565ef81c44f1459b9f4e  tashkil_scan_N1-W03.py
21170e1ec58d89c6a092517f3f91c6f0  telrapport_P2_N1-W03.py
67f4857fa686a984869b3eb5bf2c9d73  valideer_structuur_N1-W02.py
257e3ab6e4f902d77d2ef5f859145cb5  verwerk_antwoord_P2_N1-W03.py
15568f0ede8c0fbcae97c554b43ad2e6  verwerk_p2_N1-W03.py
a2fbef13b028da9ab351e59d6ef218a1  voorspel_master_N1-W03.py
```
