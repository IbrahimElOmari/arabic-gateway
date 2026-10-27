# tools/hva-content/N1-W06

Teamscripts van het HVA-team voor week N1-W06, stand na P2 (2026-10-27). **Content-vrij:** geen itemteksten; de generator van het wijzigingslog en de logs zelf staan in de weekbundel, niet in de repo. Geen enkel script schrijft naar de databank; P3/P4-scripts volgen.

| bestand | md5 | versie / doel |
|---|---|---|
| `apply_log.py` | `68ac9d2ea3f16be1316130ea48cebd04` | v1.4.1 — nieuwe rijen `(rij)`, alles-of-niets, reeks-controle, koppelen, NFC, review-binding (P1-3a/7, 9T P2 F2/F3/F8) |
| `check_N1-W06.py` | `ab2937ffc4ca238fd41ecf4b4991f287` | v1.7.1 — macro-items, notities, functies, koppelen zoals de app (zonder NFC) |
| `keten_P2_N1-W06.sh` | `36d9bec027ca0b22f63eb6608c6d036f` | v1.1 — P2-keten (variant A en B), deterministisch |
| `maak_html_bdi.mjs` | `65608641f395ee3fe7b3a227e370a5b0` | hulpscript van de rendertoets (isolateArabic uit de app-bron) |
| `maak_proef_N1-W06.py` | `84009043ded8d1cb56d4899518b4eb8c` | simulatie «alles goedgekeurd» voor de proef |
| `rendertoets_N1-W06.py` | `b15997d17d4ddee677cb51643c440d9e` | v1.1 — bidi-poort (APP/PLAT) via Playwright |
| `review_bulk.py` | `06dd21b7e203673ffb5729fffd9ad664` | v1.3 — antwoord van de native reviewer per wijziging_id |
| `telrapport_P2_N1-W06.py` | `cdee842a83c9cde89a66dbffcd78e6eb` | v1.1 — diff in twee richtingen, ook nieuwe rijen |
| `test_apply_log_v1_4.py` | `94b527a65fad3a5762de3fda075dd0c1` | v1.1 — 24 tests + 4 regressies voor apply_log v1.4.1 |
| `verwerk_p2_N1-W06.py` | `7a4ca8615100e3bf5db9b750068df2c5` | v1.3 — P2-besluit in het log, item- en reeks-atomair |
