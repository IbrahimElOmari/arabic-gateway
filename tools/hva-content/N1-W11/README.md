# HVA-content · N1-W11 · teamscripts van P3 (content-vrij)

Tak `content/N1-W11-inhoud`, vanaf `main` @ `244de3e`. **Concept:** niet mergen vóór «P3 akkoord» van Ibra; niets hiervan raakt de app (alleen `tools/`).

Deze map bevat alleen gereedschap: geen leerinhoud, geen export, geen wijzigingslog. De inhoud van W11 (182 items) en de nazorg van W10 (2 items) staan in de P3-bundel in Drive («HVA N1-W11 P3») en gaan in P4 als SQL-blokken naar de databank, niet via deze tak.

## Wat de keten doet (`keten_P3_N1-W11.sh` v1.7, PROEF=1 tot «P3 akkoord»)
- één P3-log uit vier logs (`maak_P3log` v1.0): weeklog 1.064 · P3-delta 4 (besluit 1a) · V 182 (B30) · nazorg W10 6 → NA W11 `e1f09a27…`, NA W10 `190bc025…`, byte-gelijk;
- check v1.10 (ongewijzigd, `e75a0249…`): week 61 · K 0 · H 0 · M 61; grammatica op de inhoud-NA 6 · K 0 · H 0 · M 6;
- rendertoets v1.3 (B48 + de 92 door Ibra aanvaarde treffers, B1 · C1 · D1): 900 en 330 px → 0/0;
- maak_sql v4.11: 13 blokken (11 inhoud W11 · `12_W10n` · `13_V_W11`), strictgrendel op G3 (6 items), grendel zonder score op C1 (21 items); regressie v4.10 op W10 byte-gelijk; vijf negatieve tests;
- inhoudsreplica (`replica_P3_N1-W11.py` v1.0, PostgreSQL 16 lokaal): heen, de negatieve grendeltoetsen, terug (V eerst) en opnieuw heen; cmp met de NA = 0; master uit de replica = de voorspelde master.

## Nog niet in deze tak
`maak_delta_P3_N1-W11.py` (bevat voorgestelde inhoud van besluit 1a) en de P4-gereedschappen (rooktest, draaiboek, p4_tekst, p4_stap, p4_log_stap, replica_test met de STOP-routes): die worden voor W11 nog geport.

## md5
```
ce8f0fa72d488dbebceaf19254e8a11a  app_export_week.py
2b0ce81e7e783a5e1564230553d55eab  app_naar_master.py
9e083286b4ab5995e1eb00f3eea8ee58  apply_log.py
e75a0249d9ac9d37bfbb977ee7fd22ae  check_N1-W11.py
2a690ef2c21bc2cd99c85ce034261cd1  const_week_N1-W11.py
8f5ca38c35169ebf4833582ba1c1dc7b  export_hash_N1-W11.py
51de60bcab1ef824aecbb3e30e0c2450  grep_8T_N1-W11.py
20365f8114c14581c6637b66b8fa8bb7  herbouw_master_N1-W11.py
1e0e77182b0cb8ad61bd8dcfab504077  keten_P3_N1-W11.sh
fffd3d3f54870d2e5fe5469b334835e5  maak_P3log_N1-W11.py
f4b7c8e036f7b5ca6bfabb81cdb71757  maak_bundel_N1-W11.py
65608641f395ee3fe7b3a227e370a5b0  maak_html_bdi.mjs
b4b39e8d402388f1d944f7b48b77d05f  maak_json_N1-W02.py
972ae5653dbf82212941b8ffbbaa714c  maak_manifest_N1-W11.py
1bae21f16d322e06ff09d9a550663568  maak_master.py
6d0306c397702eef4c9c08c9c425c83c  maak_sql_N1-W11.py
c404fb7b1b42f556c7208a330775bbcd  maak_verwacht_per_stap_N1-W11.py
292f6f87e0cc216781988ec9d17f9d76  maak_weeklog_N1-W11.py
acbaf46c094be2a2ff3538c55b314301  master_rest_uit_master.py
144b1011aaa9c2cf4b69a815beacea04  rapport_7D_N1-W11.py
e3557aac0aad8b091fcdaf03176ccc19  rendertoets_N1-W11.py
2418db847ea770f93bb393cd45f8cf24  replica_P3_N1-W11.py
84aa156c7873d8eaba7042af8f8118c5  replica_policies_N1-W11.sql
67f4857fa686a984869b3eb5bf2c9d73  valideer_structuur_N1-W02.py
6aaadc78a2bea7a92ffa70bd59b7b743  voorspel_master_N1-W11.py
```
