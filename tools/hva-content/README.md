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
| `keten_P2_N1-W03.sh` | v1 | 4T/3T | de hele P2-keten (revisie → check → log → proef → check --poort → rendertoets 900/330); tweede run bit-gelijk. Verwacht de werkmap-indeling `scripts/`, `scripts/w03/`, `bron/`, `p2/`. |

## md5 (2026-10-23)
```
797af8baa3ac2d8770234d3c05318fad  apply_log.py
0a6838875c8262c532dba5e704a982e4  check_N1-W03.py
2dd8a127984162f47f24bc1e4aa345ea  keten_P2_N1-W03.sh
65608641f395ee3fe7b3a227e370a5b0  maak_html_bdi.mjs
3a2f7b4ef8b676d685df29ccc1348fac  maak_proef_N1-W03.py
5244ed49da90061fc30f1ed832b631c8  negatief_apply_N1-W03.py
d3b680219026e419af05a63b713d30be  rendertoets_N1-W03.py
ddb289a2da42565ef81c44f1459b9f4e  tashkil_scan_N1-W03.py
21170e1ec58d89c6a092517f3f91c6f0  telrapport_P2_N1-W03.py
```
