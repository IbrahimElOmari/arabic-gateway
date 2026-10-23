# maak_bundel_P2_N1-W03.py v1 — Regisseur-T (1T) · bundelt de P2-bestanden van N1-W03 in één zip met MD5-manifest (B9: scripts met
# lesinhoud alleen in de bundel en Drive). Elke bron moet bestaan; het manifest staat ook los naast de zip.
# Gebruik: python3 -I maak_bundel_P2_N1-W03.py <werkmap> <uit.zip>
import sys, os, zipfile, hashlib
wm, uit = sys.argv[1], sys.argv[2]
BEST = """p2/P2_poortrapport_N1-W03.md
p2/P2_tegenrapport_D_N1-W03.md
p2/P2_tegenrapport_T_N1-W03.md
p2/N1-W03_wijzigingslog.tsv
p2/review_native_N1-W03.tsv
p2/N1-W03_revisie_D.tsv
p2/N1-W03_revisie_T.tsv
p2/N1-W03_ontwerp_D.md
p2/N1-W03_architectuur_T.md
p2/N1-W03_telrapport_P2.out
p2/check_v1_4_VOOR_N1-W03.out
p2/kern_concept/N1-W03_sjablonen_13_4.md
p2/kern_concept/sjablonen_oefentypes_v1.6_concept.md
p2/kern_concept/besluiten_v12_concept.md
p2/proef/log_proef.tsv
p2/proef/review_proef.tsv
p2/proef/APP_NA_N1-W03_proef.tsv
p2/proef/APP_NA_N1-W02_proef.tsv
p2/proef/APP_NA_N1-W01_proef.tsv
p2/proef/check_v1_4_NA_N1-W03.out
p2/proef/check_v1_4_NA_N1-W03.tsv
p2/proef/check_v1_4_NA_N1-W02.out
p2/proef/check_v1_4_NA_N1-W01.out
p2/bidi/rendertoets_VOOR_900.out
p2/bidi/rendertoets_NA_900.out
p2/bidi/rendertoets_NA_gsm330.out
p2/negatief/negatief_apply_v1_3_N1-W03.out
N1-W03_sessielog.md
scripts/check_N1-W03.py
scripts/apply_log.py
scripts/apply_log_v1_2.py
scripts/review_bulk.py
scripts/verwerk_p2_N1-W02.py
scripts/w03/maak_revisie_D_N1-W03.py
scripts/w03/maak_log_N1-W03.py
scripts/w03/maak_proef_N1-W03.py
scripts/w03/ontwerp_voor_na_N1-W03.py
scripts/w03/rendertoets_N1-W03.py
scripts/w03/keten_P2_N1-W03.sh
scripts/w03/negatief_apply_N1-W03.py
scripts/w03/telrapport_P2_N1-W03.py
scripts/w03/tashkil_scan_N1-W03.py
scripts/w03/maak_p2_groepen_N1-W03.py
scripts/w03/maak_bundel_P2_N1-W03.py
scripts/deel3/maak_html_bdi.mjs
bron/APP_BACKUP_N1-W03_2026-10-20.tsv
bron/APP_BACKUP_N1-W02_2026-10-20_W03nazorg.tsv
bron/APP_BACKUP_N1-W01_2026-10-20_W03nazorg.tsv""".split("\n")
regels = []
with zipfile.ZipFile(uit, "w", zipfile.ZIP_DEFLATED) as z:
    for b in BEST:
        p = os.path.join(wm, b); assert os.path.isfile(p), f"ontbreekt: {b}"
        d = open(p, "rb").read(); regels.append(f"{hashlib.md5(d).hexdigest()}  {b}"); z.write(p, b)
    man = "\n".join(regels) + "\n"; z.writestr("MD5_P2_N1-W03.txt", man)
open(os.path.join(os.path.dirname(os.path.abspath(uit)), "MD5_P2_N1-W03.txt"), "w", encoding="utf-8").write(man)
print(f"{uit}: {len(regels)} bestanden + manifest · {os.path.getsize(uit)} bytes · md5 {hashlib.md5(open(uit, 'rb').read()).hexdigest()}")
