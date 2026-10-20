# maak_verwacht_per_stap_N1-W02.py v1 — Maker-T (7T) · P3 N1-W02 · zet de verwachte uitkomsten uit verwacht.txt van elk blok in één
# overzicht per stap (P3-leescontroles en het P4-draaiboek). Gebruik: python3 -I maak_verwacht_per_stap_N1-W02.py <map p3/sql>
import os, sys, hashlib
B = sys.argv[1]
blokken = [("N1-W02", b) for b in ("1_L1", "2_L2", "3_R1", "4_R2")] + [("N1-W01", "1_W01")]
L = ["# N1-W02 · SQL v4.2.1 · verwachte uitkomsten per stap (uit verwacht.txt)",
     "Gemaakt door `scripts/maak_verwacht_per_stap_N1-W02.py` uit de bestanden `verwacht.txt` van elk blok. Volgorde in P4: L1 → L2 → R1 → R2, daarna W01 (eigen back-up). "
     "Terugdraaien in omgekeerde volgorde. Alle waarden zijn `aantal|md5` over `item_id|vingerafdruk` (27 kolommen, gesorteerd COLLATE \"C\"). "
     "In P3 is alleen gelezen (droogloop en probe v2). De grendels per rij dwingen de blokvolgorde niet af; daarom is de 7_vinger vóór elke apply en elke rollback een harde STOP (8T C-T05).", ""]
for wk, b in blokken:
    v = dict(l.rstrip("\n").split("\t", 1) for l in open(f"{B}/{wk}/{b}/verwacht.txt", encoding="utf-8"))
    sz = {f: os.path.getsize(f"{B}/{wk}/{b}/{f}") for f in ("3_apply.sql", "4_rollback.sql", "8_generale_repetitie.sql", "9_grootte_probe.sql", "2_droogloop.sql", "7_vinger_aggregaat.sql")}
    L += [f"## {wk} · blok {v['blok']} · {v['items_blok']} items · {v['gewijzigd']} gewijzigd · {v['paren']} velden", "",
          "| stap | bestand (bytes) | verwacht |", "|---|---|---|",
          f"| P3 droogloop (live = VOOR) | `2_droogloop.sql` ({sz['2_droogloop.sql']}) | `{v['droogloop_p3']}` |",
          f"| P3 probe v2 | `9_grootte_probe.sql` ({sz['9_grootte_probe.sql']}) | `{v['probe_voor_apply']}` |",
          f"| P4 7_vinger vóór het blok (harde STOP bij afwijking) | `7_vinger_aggregaat.sql` ({sz['7_vinger_aggregaat.sql']}) | `{v['week_voor']}|{v['blok_voor']}|{v['rest']}` |",
          f"| P4 generale repetitie + T15 | `8_generale_repetitie.sql` ({sz['8_generale_repetitie.sql']}) | `{v['gr_eindrij']}` + `|pogingen30|pogingen30_leerders|logins30_leerders|logins30_staf|laatste_poging` (STOP als pogingen30_leerders > 0 of logins30_leerders > 0) |",
          f"| P4 apply (RETURNING) | `3_apply.sql` ({sz['3_apply.sql']}) | `{v['apply_returning']}` |",
          f"| P4 aparte controle (commit) | `7_vinger_aggregaat.sql` | `{v['week_na']}|{v['blok_na']}|{v['rest']}` |",
          f"| P4 tweede apply | `3_apply.sql` | `0|` (0 rijen) |",
          f"| terugdraaien (alleen op opdracht van Ibra; eerst 7_vinger = NA van dit blok) | `4_rollback.sql` ({sz['4_rollback.sql']}) | `{v['rollback_returning']}`, daarna 7_vinger `{v['week_voor']}|{v['blok_voor']}|{v['rest']}` |", ""]
L += ["## Na alle blokken", "- B25-controle (T12): `SELECT item_id FROM public.curriculum_items WHERE week = 2 AND strict_tashkeel AND NOT (options ? correct_answer);` → 0 rijen.",
      "- Tellingen week 2 (replica): needs_image 10 → 0 · strict_tashkeel 0 → 20 · punten 119 → 109 · needs_ns_audio 42 en needs_student_recording 6 ongewijzigd."]
open(f"{B}/VERWACHT_PER_STAP.md", "w", encoding="utf-8").write("\n".join(L) + "\n")
print("VERWACHT_PER_STAP.md md5", hashlib.md5(open(f"{B}/VERWACHT_PER_STAP.md", "rb").read()).hexdigest())
