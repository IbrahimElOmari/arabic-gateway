# tools/hva-content/N1-W06

Teamscripts van het HVA-team voor week N1-W06, stand na P3 en de P4-voorbereiding (2026-10-28). **Content-vrij:** geen itemteksten; de generatoren met lesinhoud (wijzigingslog, review, revisie, delta, rooktest, kernbestanden) en de logs zelf staan in de weekbundel, niet in de repo. Geen enkel script schrijft zelf naar de databank: de P4-SQL wordt per stap door een mens of subagent geplakt, na een voorcontrole door `p4_log_stap`. P4 draait variant B (zonder C7).

| bestand | md5 | versie / doel |
|---|---|---|
| `app_export_week.py` | `ce8f0fa72d488dbebceaf19254e8a11a` | query_database-JSON → app-export-TSV |
| `app_naar_master.py` | `2b0ce81e7e783a5e1564230553d55eab` | v1.1 — app-export → lijst-/masterformaat |
| `apply_log.py` | `68ac9d2ea3f16be1316130ea48cebd04` | v1.4.1 — nieuwe rijen `(rij)`, alles-of-niets, reeks-controle, koppelen, NFC, review-binding (P1-3a/7, 9T P2 F2/F3/F8) |
| `check_N1-W06.py` | `ab2937ffc4ca238fd41ecf4b4991f287` | v1.7.1 — macro-items, notities, functies, koppelen zoals de app (zonder NFC) |
| `export_hash_N1-W06.py` | `95ea8b15d3d63cbedde660147aa9b508` | v1.1 — NFC-veilige terugvalroute voor de verse export (vingerafdruk over 30 kolommen per week in de databank) |
| `herbouw_master_N1-W06.py` | `5bee424524928b88062ec5e7498056b4` | v1.2.1 — master uit de verse export, met exportcontrole (nieuwe rijen: uuid, tijden, tijdzone) |
| `keten_P2_N1-W06.sh` | `36d9bec027ca0b22f63eb6608c6d036f` | v1.1 — P2-keten (variant A en B), deterministisch |
| `keten_P3_N1-W06.sh` | `bccd5d04d20be7604313debd7b52905f` | v1.2 — P3-keten (variant A en B; pins op log, review, bronnen, live-JSON's, replicaschema en rendertoets-bron), deterministisch |
| `maak_bundel_N1-W06.py` | `ee64f6f76a6f24b53c5df4c94db1e871` | v1.1.1 — bundel met manifest, lege werkmappen, controle met verwachte manifest-md5 |
| `maak_draaiboek_P4_N1-W06.py` | `28b366511a2e07dd372c5466b01c8738` | v3.3.1 — P4-draaiboek «2 + 1 per blok» uit manifest en verwachtingen |
| `maak_html_bdi.mjs` | `65608641f395ee3fe7b3a227e370a5b0` | hulpscript van de rendertoets (isolateArabic uit de app-bron) |
| `maak_json_N1-W02.py` | `b4b39e8d402388f1d944f7b48b77d05f` | v1.1 — JSON per week (P3) |
| `maak_manifest_N1-W06.py` | `265c22bca1f2fa4d6b2e0f34a8dab32d` | v1.2 — BLOKKEN_MANIFEST met 9e kolom `md5_sql` (bundelidentiteit per blok) |
| `maak_master.py` | `1bae21f16d322e06ff09d9a550663568` | LEESBARE_LIJST_MASTER.tsv uit N1 + rest |
| `maak_proef_N1-W06.py` | `84009043ded8d1cb56d4899518b4eb8c` | simulatie «alles goedgekeurd» voor de proef |
| `maak_sql_N1-W06.py` | `33e9f9e9e63d1ecc8ac3aca472d3a1de` | v4.6.1 — SQL per blok: insertblokken (grendels, `h_inhoud`, RETURNING-controle, FOR SHARE-weekgrendel) en updateblokken |
| `maak_terugval_C7_N1-W06.py` | `8ce87daa055b39eccaba65e6eb99943f` | v1.0 — terugvallog variant B (koppelen-items gedepubliceerd zonder C7) |
| `maak_verwacht_per_stap_N1-W06.py` | `a849f2b1309378182b4959a0c8794f0c` | v1.9.2 — verwachte uitkomst per stap, slottellingen, leerderszicht, herstelpad |
| `master_rest_uit_master.py` | `acbaf46c094be2a2ff3538c55b314301` | comp en N2 uit de vorige master |
| `p4_log_stap_N1-W06.py` | `e9b10651fa05485f65f505002a627250` | v1.5.4 — P4-log met ketenhash en slot; variant gebonden; insertblokken zonder rollback |
| `p4_stap_N1-W06.py` | `d635ffd3120baf64d15b962397f90ad8` | v1.6.1 — scheidsrechter per P4-stap (controleert ook `md5_sql`) |
| `p4_status_N1-W06.py` | `0e986467bac397444996d5a0f21b1b81` | v1.1.1 — één statusregel per blok (variant, toestand, slotstappen) |
| `rapport_7D_N1-W06.py` | `da59f6cb7a9f147ce84b172ec5cb3868` | v1.3.1 — telrapport en diff in twee richtingen |
| `rendertoets_N1-W06.py` | `b15997d17d4ddee677cb51643c440d9e` | v1.1 — bidi-poort (APP/PLAT) via Playwright |
| `replay_draaiboek_N1-W06.py` | `42900946f91703628d197e4f46b2a532` | v1.2.1 — speelt het draaiboek af op de replica vanuit een uitgepakte proefbundel |
| `replica_policies_N1-W06.sql` | `b6eaa00d693799e44fcbaba09cefeb52` | de 6 policies en stubs van de live databank voor de replica |
| `replica_test_N1-W06.py` | `331f163631e5eee22ceb85c957332fb7` | v4.1.2 — replica PostgreSQL 16 (G0–G6, insert- en mutatietests, variant A en B) |
| `review_bulk.py` | `06dd21b7e203673ffb5729fffd9ad664` | v1.3 — antwoord van de native reviewer per wijziging_id |
| `telrapport_P2_N1-W06.py` | `cdee842a83c9cde89a66dbffcd78e6eb` | v1.1 — diff in twee richtingen, ook nieuwe rijen |
| `test_apply_log_v1_4.py` | `94b527a65fad3a5762de3fda075dd0c1` | v1.1 — 24 tests + 4 regressies voor apply_log v1.4.1 |
| `test_herbouw_master_N1-W06.py` | `37a0f3846eb1c4fe10755d7fa5852408` | v1.2 — 18 gevallen voor herbouw_master |
| `valideer_structuur_N1-W02.py` | `67f4857fa686a984869b3eb5bf2c9d73` | v1 — structuurtoets van de JSON |
| `vergelijk_live_P3_N1-W06.py` | `4bddb16f90d9aa2f27eec7a4ae62068b` | v1.2 — live leescontroles ↔ verwachting (vervallen/vervangen) |
| `verwerk_antwoord_P3_N1-W06.py` | `b4d9ebf04965b342298d2e507180bf9c` | v1.0 — P3-antwoord van Ibra letterlijk in log en review |
| `verwerk_p2_N1-W06.py` | `7a4ca8615100e3bf5db9b750068df2c5` | v1.3 — P2-besluit in het log, item- en reeks-atomair |
| `voorspel_master_N1-W06.py` | `8f3085524bc97fb0630dc5916d3a6163` | v2.2 — voorspelde master na P4 (met nieuwe rijen), schrijft VOORSPELDE_MD5.txt |
