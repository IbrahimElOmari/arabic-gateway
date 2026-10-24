#!/usr/bin/env python3
# maak_bundel_deel4_N1-W04.py v1.0 — Maker-T · bundel «N1-W04 deel 4» (afsluiting van N1-W04, na P4 en de rooktest): alles wat N1-W05 nodig heeft
# (master na P4, verse N1-export, verwachte W05-export, eindvingerafdrukken via p3/sql, nazorg, scripts, kern) plus het volledige weekarchief
# (P4-log, ruwe uitvoer, verslag, export-JSON, deel 1–3). Deterministisch (vaste tijdstempels), manifest met md5 per bestand, controle na uitpakken.
# Gebruik: python3 -I maak_bundel_deel4_N1-W04.py <werkmap> <uit.zip>
import os, sys, zipfile, hashlib
WM, OUT = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
SKIP_DIRS = {'p3/replica/pgdata', 'p3/replica/g5_kopie', 'p3/replica/g5_vreemd', 'p3/replica/g5_enum', 'p3/replica/p4basis'}
SKIP_FILES = {'p4/master_na/n1_lijst.tsv', 'p4/master_na/rest.tsv',          # tussenbestanden van herbouw_master (reproduceerbaar)
              'p4/master_na/APP_EXPORT_N1_naP4_N1-W04.tsv'}                    # = bron/APP_EXPORT_N1_2026-10-24_naP4.tsv (zelfde md5 a17f45f7…)
rows = []
for top in ['bron', 'stap0', 'p1', 'p2', 'na_p2', 'na_p3', 'p3', 'p4', 'kern', 'scripts', 'export']:
    for root, dirs, files in os.walk(os.path.join(WM, top)):
        rel = os.path.relpath(root, WM)
        if any(rel == s or rel.startswith(s + '/') for s in SKIP_DIRS): continue
        for f in sorted(files):
            p = os.path.join(root, f); r = os.path.relpath(p, WM)
            if r in SKIP_FILES or f.endswith('.lock') or '__pycache__' in r: continue
            rows.append((r, os.path.getsize(p), hashlib.md5(open(p, 'rb').read()).hexdigest()))
for extra in ['OVERDRACHT_N1-W04-deel2.md', 'OVERDRACHT_N1-W04-deel3.md', 'MANIFEST_N1-W04_deel2.md', 'MANIFEST_N1-W04_deel3.md']:
    p = os.path.join(WM, extra)   # OVERDRACHT_N1-W04.md zelf staat in de project knowledge (niet in de bundel: md5-kringloop)
    if os.path.exists(p): rows.append((extra, os.path.getsize(p), hashlib.md5(open(p, 'rb').read()).hexdigest()))
rows.sort()
man = ['# MANIFEST_N1-W04_deel4.md',
       'Bundel van «N1-W04 deel 4» (afsluiting na P4 en de rooktest, 2026-10-24). Uitpakken in /home/claude → map N1-W04/. Controle: elke md5 hieronder. '
       'Kern voor N1-W05: de master na P4 `p4/master_na/LEESBARE_LIJST_MASTER.tsv` (`bf0a8b972f42d6b6344016cc2e8e5936`); de verse N1-export na P4 '
       '`bron/APP_EXPORT_N1_2026-10-24_naP4.tsv` (`a17f45f777fde6137a92feb346934413`, verwachte md5 van stap 0b) met de ruwe JSON '
       '`export/resultaat_N1_2026-10-24_naP4.json`; de verwachte stap-0-export van W05 `bron/APP_EXPORT_N1-W05_2026-10-24.tsv` '
       '(`83815abcecdc31e3fc188a1f8b4cb142`, 82 rijen); de weekexports na P4 `bron/APP_EXPORT_N1-W0x_2026-10-24_naP4.tsv`; de eindvingerafdrukken '
       'via `p3/sql/N1-W04/6_G1/7_vinger_aggregaat.sql` (weekdeel), `p3/sql/N1-W03/7_W03n/`, `p3/sql/N1-W02/8_W02n/`, `p3/sql/N1-W01/9_W01n/` en het '
       'leerderszicht via `p3/sql/leerderszicht_N1-W04.sql`; de nazorg `p4/N1-W04_nazorg_voor_W05.md`; `scripts/` (W04-versies); `kern/` (besluiten v17, '
       'sjablonen v1.7, status_log). Archief van de week: het P4-log `p4/uitvoering/P4_log_N1-W04.tsv`, de ruwe uitvoer `p4/uitvoering/ruw/01…37`, '
       'het verslag `p4/uitvoering/P4_uitvoering_N1-W04.md`, het recept `p4/uitvoering/RECEPT_MAKER-T_blok.md`, de correctie van de rooktestlijst, '
       'het P4-antwoord van Ibra, en alles van deel 1–3 (bron, stap0, p1, p2, na_p2, na_p3, p3, p4). Ook: de vorige master `bron/LEESBARE_LIJST_MASTER_4673c3eb.tsv` '
       '(herbouw_master is ermee reproduceerbaar) en de overdrachten van deel 2 en 3. Niet in de bundel: de replica-database, de tussenbestanden van '
       'herbouw_master (`n1_lijst.tsv`, `rest.tsv`, de kopie van de export), `OVERDRACHT_N1-W04.md` (project knowledge).',
       '', f'Bestanden: {len(rows)} · bytes: {sum(r[1] for r in rows)}', '', '| bestand | bytes | md5 |', '|---|---|---|'] + [f'| `{r}` | {b} | `{m}` |' for r, b, m in rows]
mp = os.path.join(WM, 'MANIFEST_N1-W04_deel4.md'); open(mp, 'w', encoding='utf-8').write('\n'.join(man) + '\n')
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for r, b, m in rows:
        zi = zipfile.ZipInfo('N1-W04/' + r, date_time=(2026, 10, 24, 18, 0, 0)); zi.compress_type = zipfile.ZIP_DEFLATED; zi.external_attr = 0o644 << 16
        z.writestr(zi, open(os.path.join(WM, r), 'rb').read())
    zi = zipfile.ZipInfo('N1-W04/MANIFEST_N1-W04_deel4.md', date_time=(2026, 10, 24, 18, 0, 0)); zi.compress_type = zipfile.ZIP_DEFLATED; zi.external_attr = 0o644 << 16
    z.writestr(zi, open(mp, 'rb').read())
print(f"bundel: {len(rows)} bestanden · {os.path.getsize(OUT)} bytes · md5 {hashlib.md5(open(OUT, 'rb').read()).hexdigest()}")
