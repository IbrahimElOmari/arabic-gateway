#!/usr/bin/env python3
# maak_bundel_deel3_N1-W04.py v1.0 — Maker-T · bundel «N1-W04 deel 3» (alles voor deel 4: definitieve P3-stand, SQL, live deel 2 + deel 3, draaiboek,
# P4-rapport, voorspelde master, scripts, kern). Deterministisch (vaste tijdstempels), manifest met md5 per bestand, controle na uitpakken.
# Gebruik: python3 -I maak_bundel_deel3_N1-W04.py <werkmap> <uit.zip>
import os, sys, zipfile, hashlib
WM, OUT = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
SKIP_DIRS = {'p3/replica/pgdata', 'p3/replica/g5_kopie', 'p3/replica/g5_vreemd', 'p3/replica/g5_enum', 'p3/replica/p4basis'}
SKIP_FILES = {'bron/APP_EXPORT_N1_2026-10-24.tsv',   # = W04stap0b (zelfde md5 80a5afcc…); W04stap0b en de ULTIEME lijst zitten erin: keten_P3 v1.3 (TESTLEERDER in deel 4) heeft ze nodig
              'bron/APP_EXPORT_N1-W01_2026-10-23_naP4.tsv', 'bron/APP_EXPORT_N1-W02_2026-10-23_naP4.tsv', 'bron/APP_EXPORT_N1-W03_2026-10-23_naP4.tsv',
              'p4/master/n1_lijst.tsv', 'p4/master/rest.tsv',
              'kern/status_log_oud.md', 'kern/status_log_toevoegingen.md'}
rows = []
for top in ['bron', 'stap0', 'p1', 'p2', 'na_p2', 'na_p3', 'p3', 'p4', 'kern', 'scripts']:
    for root, dirs, files in os.walk(os.path.join(WM, top)):
        rel = os.path.relpath(root, WM)
        if any(rel == s or rel.startswith(s + '/') for s in SKIP_DIRS): continue
        for f in sorted(files):
            p = os.path.join(root, f); r = os.path.relpath(p, WM)
            if r in SKIP_FILES or f.endswith('.lock') or '__pycache__' in r: continue
            rows.append((r, os.path.getsize(p), hashlib.md5(open(p, 'rb').read()).hexdigest()))
for extra in ['OVERDRACHT_N1-W04-deel2.md', 'MANIFEST_N1-W04_deel2.md']:   # de overdracht van deel 3 staat in de project knowledge (niet in de bundel: md5 kringloop)
    p = os.path.join(WM, extra)
    if os.path.exists(p): rows.append((extra, os.path.getsize(p), hashlib.md5(open(p, 'rb').read()).hexdigest()))
rows.sort()
man = ['# MANIFEST_N1-W04_deel3.md',
       'Bundel van «N1-W04 deel 3» (P4-voorbereiding, 2026-10-24). Uitpakken in /home/claude → map N1-W04/. Controle: elke md5 hieronder. Kern voor deel 4: `p3/sql/` (9 blokken; `BLOKKEN_MANIFEST.tsv` `f0f37670a5ae4b25d3786220753af3f8`), `p4/P4_DRAAIBOEK_N1-W04_variant_b.md`, `p4/P4_poortrapport_N1-W04.md`, `p4/master/LEESBARE_LIJST_MASTER_voorspeld.tsv` (`bf0a8b97…`), `scripts/p4_log_stap_N1-W04.py` v1.4, `scripts/p4_stap_N1-W04.py` v1.5, `scripts/p4_status_N1-W04.py`, `p3/live/` (deel 2: 12 leesacties) en `p3/live/deel3/` (deel 3: 8 leesacties + slot_ref, zicht_voor, activiteit), `na_p3/` (log 686, review 423), `p3/APP_NA_N1-W0x.tsv`, `kern/` (besluiten v16, sjablonen v1.7, status_log). Ook in de bundel: de huidige master `bron/LEESBARE_LIJST_MASTER_4673c3eb.tsv` (nodig voor de masterherbouw in deel 4: comp en N2) en de voorspelde export `p4/master/n1_voorspeld.tsv` (exportcontrole van `herbouw_master_N1-W04.py`). Ook: de N1-export `bron/APP_EXPORT_N1_2026-10-24_W04stap0b.tsv` (`80a5afcc…`) en `bron/ULTIEME_LEESBARE_LIJST.tsv` (`0100d326…`), zodat `keten_P3_N1-W04.sh` v1.3 in deel 4 (met `TESTLEERDER`) zonder andere bron draait. Niet in de bundel: de replica-database, de tussenbestanden van de mastervoorspelling.',
       '', f'Bestanden: {len(rows)} · bytes: {sum(r[1] for r in rows)}', '', '| bestand | bytes | md5 |', '|---|---|---|'] + [f'| `{r}` | {b} | `{m}` |' for r, b, m in rows]
mp = os.path.join(WM, 'MANIFEST_N1-W04_deel3.md'); open(mp, 'w', encoding='utf-8').write('\n'.join(man) + '\n')
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for r, b, m in rows:
        zi = zipfile.ZipInfo('N1-W04/' + r, date_time=(2026, 10, 24, 6, 0, 0)); zi.compress_type = zipfile.ZIP_DEFLATED; zi.external_attr = 0o644 << 16
        z.writestr(zi, open(os.path.join(WM, r), 'rb').read())
    zi = zipfile.ZipInfo('N1-W04/MANIFEST_N1-W04_deel3.md', date_time=(2026, 10, 24, 6, 0, 0)); zi.compress_type = zipfile.ZIP_DEFLATED; zi.external_attr = 0o644 << 16
    z.writestr(zi, open(mp, 'rb').read())
print(f"bundel: {len(rows)} bestanden · {os.path.getsize(OUT)} bytes · md5 {hashlib.md5(open(OUT, 'rb').read()).hexdigest()}")
