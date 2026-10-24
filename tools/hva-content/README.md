# tools/hva-content — teamscripts N1-W04 (content-vrij, B9)
Branch `content/N1-W04-inhoud` (vanaf `main` @ `e7317258`). Geen PR en geen merge (P3-beslissing 7 van N1-W02). Scripts met lesinhoud (`maak_log_N1-W04.py`, `maak_revisie_D_N1-W04.py`, `maak_delta_P3_N1-W04.py`, `ontwerp_voor_na_N1-W04.py`) en de proefkopie `keten_P3proef_N1-W04.sh` staan alleen in de bundel en in Drive. Arabisch in deze scripts = tekenklassen en testteksten, geen lesinhoud.

| script | versie | rol | wat | md5 |
|---|---|---|---|---|
| `app_export_week.py` | — | 7T | ruwe JSON van query_database → app-export-TSV. | `ce8f0fa72d488dbebceaf19254e8a11a` |
| `app_naar_master.py` | v1.1 | 7D | app-export → leesbare lijst (met `app:is_published`). | `2b0ce81e7e783a5e1564230553d55eab` |
| `apply_log.py` | v1.3 | 4T/7T | past alleen goedgekeurde logregels toe; review bindt de inhoud; `exercise_type` als enum. | `797af8baa3ac2d8770234d3c05318fad` |
| `check_N1-W04.py` | v1.5 | 3T/8T | technische check met `--poort`; nieuw: rangschikken met segmenten ≠ tegels = K (app-fallback), Arabisch-Indische cijferreeks in een NL-veld = H. | `6c06a8dd8bdc5762050a6cfb0c5dd867` |
| `check_manifest.py` | — | 8T | controle van een MD5-manifest. | `6b0ea5dea2f1d0c25e3c1334104db689` |
| `herbouw_master_N1-W04.py` | v1.0 | 7T | deel 4: verse export → exportcontrole (alleen `updated_at` in de 120 geraakte rijen) → master = voorspelling, anders STOP. | `aacd3229bf112533cb08d6d7b330123a` |
| `keten_P2_N1-W04.sh` | v1.0 | 4T/3T | de P2-keten; argument `a|b` = variant van `U4-luisteren-04-3`. | `a2a35f4c7f62c26034b0d040dc9bec94` |
| `keten_P3_N1-W04.sh` | v1.3 | 7D/7T/8T | de P3-keten uit het goedgekeurde log (na_p3/) en de back-ups; v1.1 proefgrendel (9T P3 V3); v1.2 definitieve stand; v1.3 `WM=` en `TESTLEERDER=<uuid>` (zonder uuid bit-gelijk). | `7cb43bf4d8d7f0763545d908b3d36366` |
| `log_naar_md_N1-W04.py` | v1 | 1D | log → leesbare markdown. | `90d6dd4a493e57f164345cfe70fc62f1` |
| `maak_bundel_deel3_N1-W04.py` | v1.0 | 1T | bundel deel 3 met MD5-manifest (definitieve versie: met de W04stap0b-export, de ULTIEME lijst, de master `4673c3eb…` en de voorspelde export voor keten v1.3 en herbouw_master). | `d1bff678a0b2d0a8bec31469f2adbe42` |
| `maak_bundel_deel4_N1-W04.py` | v1.0 | 1T | bundel deel 4 (afsluiting na P4: master, verse export, verwachte W05-export, P4-log en ruwe uitvoer, nazorg, kern) met MD5-manifest. | `21602e4faa8c5bc1b7c44df73943e834` |
| `maak_draaiboek_P4_N1-W04.py` | v3 | 1T | het P4-draaiboek uit manifest en verwachtingen; variant a (54 aanroepen) of b (37); afgekapte plakbeurt → splitsen. | `802c4dc11cfb5711e1bbeaa14bece9d2` |
| `maak_html_bdi.mjs` | v1 | 3T | haalt `isolateArabic` uit de TSX van de checkout. | `65608641f395ee3fe7b3a227e370a5b0` |
| `maak_json_N1-W02.py` | v1.1 | 7T | JSON per week. | `b4b39e8d402388f1d944f7b48b77d05f` |
| `maak_manifest_N1-W04.py` | v1 | 7T | `BLOKKEN_MANIFEST.tsv` over vier weken. | `029788892edfb17d391d7085da7f8ecb` |
| `maak_master.py` | — | 7T | LEESBARE_LIJST_MASTER.tsv = N1 uit de app + comp + N2. | `1bae21f16d322e06ff09d9a550663568` |
| `maak_proef_N1-W04.py` | v1 | 4T | simulatie van «P2 akkoord» op kopieën. | `541b69589b7bf8dc81bcd25bb65cbe85` |
| `maak_sql_N1-W04.py` | v4.5 | 7T | SQL per blok (droogloop, apply, rollback, 4b, controle, oud/vinger-aggregaat, generale repetitie, probe); v4.5: `--testleerder <uuid>` (alleen de activiteitstelling van de gr; zonder de optie byte-gelijk aan v4.4.1). | `8365553fa0c9ca7b24fe9beffc498c4a` |
| `maak_verwacht_per_stap_N1-W04.py` | v1.8 | 7T | `VERWACHT_PER_STAP.md`, slot-SQL, leerderszicht en `slot_verwacht.json` voor vier weken en twee gedepubliceerde items. | `59893e486d6de6b6f3dbc5d3497d3585` |
| `master_rest_uit_master.py` | — | 7T | comp- en N2-regels letterlijk uit de bestaande master. | `acbaf46c094be2a2ff3538c55b314301` |
| `p3_leescontrole_N1-W04.py` | v1 | 8T | beoordeelt één live leesactie (droogloop, probe) tegen `verwacht.txt`. | `e22f012de5183f5bcaaf1e2bdb564b7f` |
| `p3_leescontrole_N1-W04_deel3.py` | v1 | 8T | idem, log `p3/live/deel3/`. | `3a7432fa13ef168b4a05a70011783d3e` |
| `p4_log_stap_N1-W04.py` | v1.4 | 1D | legt één P4-aanroep vast (voorcontrole, `--uit`, flock, ketenhash, gr ≤ 15 min). | `223e972dacc1982feb1d6b5736ace177` |
| `p4_stap_N1-W04.py` | v1.5 | 7T/8T | scheidsrechter per P4-stap (= v1.4.1 voor vier weken en twee gedepubliceerde items). | `cd5507a12705badd1e43534cf765ed8d` |
| `p4_status_N1-W04.py` | v1 | 1D | één statusregel uit het P4-log. | `6323d031c1812fdbf6aa85c9193a6b53` |
| `rapport_7D_N1-W04.py` | v1 | 7D | telrapport en diff (veld- en regelniveau) voor vier weken. | `f788fb3bdc34b1962d3fc2589549acc0` |
| `rendertoets_N1-W04.py` | v1.1 | 3T/8T | B27 APP (`isolateArabic`) en PLAT op 900/330 px; v1.1: PLAT in een `seg|seg`-sleutel = informatie. | `b15997d17d4ddee677cb51643c440d9e` |
| `replica_policies.sql` | — | 8T | de 6 policies zoals live. | `70b320b63c616761e903229697957179` |
| `replica_test_N1-W04.py` | v4.0 | 8T | replica PostgreSQL 16 (schema v2, 6 policies, leerder): 225 tests over 9 blokken. Arabisch = twee testteksten. | `fa14f7d8799d7c5bd4ad190bd2dfb1a2` |
| `review_bulk.py` | v1.3 | 4T | zet het antwoord van de native reviewer om per wijziging_id (deel 1, 2a per groep, 2b per regel, afgeleid). | `06dd21b7e203673ffb5729fffd9ad664` |
| `tashkil_scan_N1-W04.py` | v1 | 2T | heuristiek B1: ontbrekende tashkīl per item. | `ddb289a2da42565ef81c44f1459b9f4e` |
| `telrapport_P2_N1-W04.py` | v1 | 1T/8T | tellingen VOOR → NA en de diff-controle in twee richtingen. | `fcc014c0f9d89818cfaea963a8257009` |
| `valideer_structuur_N1-W02.py` | v1 | 8T | structuurtoets van de JSON (B17). | `67f4857fa686a984869b3eb5bf2c9d73` |
| `verwerk_p2_N1-W04.py` | v1.2 | 1D | statussen in het log, item-atomair. | `27db742e79377d48017cb1b344fb153a` |
| `voorspel_master_N1-W04.py` | v2 | 7T | de master na P4 vooraf (export 10-24 + NA W01–W04 + rest uit 4673c3eb…). | `87fd7aab6faca5a7b53953f036dc8f8f` |
