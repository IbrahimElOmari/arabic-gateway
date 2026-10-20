# tools/hva-content · teamscripts Huis van het Arabisch (N1-W02, P3)
Python 3, alleen de standaardbibliotheek; uitvoeren met `python3 -I`. Deze scripts lezen en schrijven **bestanden**; ze verbinden niet met een database
en bevatten geen geheimen. De SQL die ze maken, wordt na een poortakkoord van Ibra via de Lovable-tool `query_database` uitgevoerd (B17).

**Geen cursusinhoud in deze publieke repo (B9).** Exports, back-ups, lijsten, JSON, SQL en wijzigingslogs staan in de privé Drive-map
`arabic-gateway-content` en in de weekbundel. Daarom staan hier ook niet: `maak_log_N1-W02.py`, `maak_revisie_D_N1-W02.py`,
`maak_p2_groepen_N1-W02.py`, `maak_p2_kop_N1-W02.py` en `ontwerp_voor_na_N1-W02.py` (ze bevatten de teksten van week 2).
Vervangen en dus niet meegenomen: `maak_sql_N1-W11.py` v4.1, `blokken_N1-W02.py` (beide opgegaan in `maak_sql_N1-W02.py` v4.2),
oudere kopieën van `apply_log.py`.

| script | wat | bytes | md5 | Arabische tekens |
|---|---|---|---|---|
| `app_export_week.py` | bijlage B · resultaat van query_database (JSON) → app-export TSV (30 kolommen) | 1782 | `ce8f0fa72d488dbebceaf19254e8a11a` | 0 |
| `app_naar_master.py` | 7D · app-export → lijst-/masterformaat (6 kolommen + app:-regels, B7 punt 4) | 3071 | `f4407822fb85e922d4e3a9cba6820106` | 0 |
| `apply_log.py` | 4T v1.2 · past alleen goedgekeurde logregels toe; de review bindt de inhoud; veld-whitelist; --week | 8615 | `bc6280bba4000ad89fa430b2a48007ce` | 9 |
| `check_N1-W02.py` | 3T v1.3 · technische check; --poort = exit 2 bij K of H (B25-bytecontrole, bidi-regel) | 21934 | `8a349bb145bd8174cc6ca99a94674501` | 26 |
| `keten_N1-W02.sh` | 4T v2 · P2-testketen op kopieën (gebruikt ook maak_log_N1-W02.py, dat inhoud bevat en hier niet staat) | 4630 | `0ff935b0c4cead2db17be6620e5e81cb` | 0 |
| `maak_json_N1-W02.py` | 7T v1.1 · content/{niveau}/{week}.json (structuur van schema v1), deterministisch | 3767 | `b4b39e8d402388f1d944f7b48b77d05f` | 2 |
| `maak_master.py` | 7D/7T · LEESBARE_LIJST_MASTER.tsv = N1 uit de app + N1-comp + N2 (B7 punt 4/5) | 1565 | `1bae21f16d322e06ff09d9a550663568` | 0 |
| `maak_sql_N1-W02.py` | 7T v4.2 · cumulatieve blokken, U&-escapes (tekst en jsonb), probe v2, T15-telling, read-only controles | 19846 | `4a550afc21a56c2a7e6fad8065eb09e5` | 0 |
| `master_rest_uit_master.py` | 7T · N1-comp + N2 letterlijk uit een bestaande master (vervangt de TSV-bron) | 1519 | `acbaf46c094be2a2ff3538c55b314301` | 0 |
| `negatief_N1-W02.py` | 4T v1 · 28 negatieve en randtests voor review_bulk, verwerk_p2, apply_log en check | 13078 | `0c5ccf160fb33e280e5aad3ce4a85d0d` | 25 |
| `rapport_7D_N1-W02.py` | 7D v1 · telrapport (regels per categorie, veld- en regelniveau) en leesbare diff | 11179 | `14b8881775b36d1f9b7df8b3b3968c2d` | 0 |
| `replica_test_N1-W02.py` | 8T v2 · lokale PostgreSQL 16 met het live-schema; hoofdcyclus, W01-nazorg en negatieve tests | 17709 | `7c6244eb892506ff015b3d88341c601c` | 1 |
| `review_bulk.py` | 4T v1.2 · antwoord van de reviewer → ja/nee/aangepast per regel (B18) | 6802 | `0af7fe7e0ca5ea70d1449ed1aa870459` | 0 |
| `telrapport_N1-W11.py` | 4T · VOOR ↔ NA veld voor veld tegen het log (0 onverklaard) | 1442 | `9f717f32960a3c7b34f29b773114b068` | 0 |
| `valideer_structuur_N1-W02.py` | 8T v1 · structuur- en inhoudstoets van de JSON (geen vervanging van schema v1) | 6286 | `67f4857fa686a984869b3eb5bf2c9d73` | 2 |
| `verwerk_p2_N1-W02.py` | 1D/4T v1.1 · statussen in het log door een script, item-atomair (B18) | 5670 | `9c9e12a9270111b866d8a2113344742f` | 0 |

De Arabische tekens zijn tekenklassen, voorbeelden in commentaar en twee testzinnetjes in `negatief_N1-W02.py`; geen lesinhoud.
