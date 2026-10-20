# maak_verwacht_per_stap_N1-W02.py v1.2 — Maker-T (7T) · P3/P4 N1-W02 · zet de verwachte uitkomsten uit verwacht.txt van elk blok in
# één overzicht per stap (leescontroles en het P4-draaiboek).
# v1.1 (SQL v4.3): apply, rollback en 4b geven één rij n|md5|isolatie; de generale repetitie eindigt op de isolatie; bovenaan de
# standbepaling van 9T (V1): de week-vingerafdruk zegt welk blok er als volgende aan de beurt is.
# v1.2 (SQL v4.3.1; 8D/8T-delta L3): wat te doen na een fout (losse ROLLBACK;, dan standbepaling).
# Gebruik: python3 -I maak_verwacht_per_stap_N1-W02.py <map met sql/N1-W02 en sql/N1-W01>
import os, sys, hashlib
B = sys.argv[1]
blokken = [("N1-W02", b) for b in ("1_L1", "2_L2", "3_R1", "4_R2")] + [("N1-W01", "1_W01")]
VW = {(wk, b): dict(l.rstrip("\n").split("\t", 1) for l in open(f"{B}/{wk}/{b}/verwacht.txt", encoding="utf-8")) for wk, b in blokken}
L = ["# N1-W02 · SQL v4.3.1 · verwachte uitkomsten per stap (uit verwacht.txt)",
     "Gemaakt door `scripts/maak_verwacht_per_stap_N1-W02.py` v1.2 uit de bestanden `verwacht.txt` van elk blok. Volgorde in P4: L1 → L2 → R1 → R2, daarna W01 (eigen back-up). "
     "Terugdraaien in omgekeerde volgorde. Alle vingerafdrukken zijn `aantal|md5` over `item_id|vingerafdruk` (27 kolommen, gesorteerd COLLATE \"C\"). "
     "Apply, rollback en 4b lopen in REPEATABLE READ (9T V2: `BEGIN; SET TRANSACTION ISOLATION LEVEL REPEATABLE READ; … COMMIT;`) en geven één rij `n|md5|isolatie`. De grendels per rij dwingen de blokvolgorde niet af; "
     "daarom is `7_vinger_aggregaat.sql` vóór elke apply en elke rollback een harde STOP (8T C-T05, 9T V1).", "",
     "## Standbepaling (9T V1): welk blok is aan de beurt?",
     "Draai `7_vinger_aggregaat.sql` van een willekeurig W02-blok; het eerste deel (`week`) moet één van deze waarden zijn. Elke andere waarde: STOP, niets uitvoeren, Ibra inlichten.", "",
     "**Na elke fout of afwijking** (in 3, 4, 4b of 8, ook een serialisatiefout of \"current transaction is aborted\"): niets herhalen. Eerst één losse aanroep `ROLLBACK;` "
     "(onschadelijk als er geen transactie open is), daarna `7_vinger_aggregaat.sql` en de standbepaling hieronder; dan Ibra inlichten. Elke uitkomst controleert "
     "`scripts/p4_stap_N1-W02.py` (exit 2 = STOP).", "",
     "| week-vingerafdruk W02 | betekenis | volgende stap |", "|---|---|---|"]
keten = [VW[("N1-W02", "1_L1")]["week_voor"]] + [VW[("N1-W02", b)]["week_na"] for b in ("1_L1", "2_L2", "3_R1", "4_R2")]
volgende = ["blok L1", "blok L2", "blok R1", "blok R2", "W02 klaar → W01-blok"]
betekenis = ["niets toegepast (= back-up)", "L1 toegepast", "L1 + L2 toegepast", "L1 + L2 + R1 toegepast", "alle vier toegepast (= NA)"]
for k, b, v in zip(keten, betekenis, volgende): L.append(f"| `{k}` | {b} | {v} |")
w = VW[("N1-W01", "1_W01")]
L += ["", f"W01: `{w['week_voor']}` = niets toegepast (= back-up) → W01-blok · `{w['week_na']}` = W01 toegepast (= NA).", ""]
for wk, b in blokken:
    v = VW[(wk, b)]
    sz = {f: os.path.getsize(f"{B}/{wk}/{b}/{f}") for f in ("3_apply.sql", "4_rollback.sql", "8_generale_repetitie.sql", "9_grootte_probe.sql", "2_droogloop.sql", "7_vinger_aggregaat.sql")}
    L += [f"## {wk} · blok {v['blok']} · {v['items_blok']} items · {v['gewijzigd']} gewijzigd · {v['paren']} velden", "",
          "| stap | bestand (bytes) | verwacht |", "|---|---|---|",
          f"| leescontrole nu (live = back-up) | `2_droogloop.sql` ({sz['2_droogloop.sql']}) | `{v['droogloop_p3']}` |",
          f"| leescontrole nu: probe v2 | `9_grootte_probe.sql` ({sz['9_grootte_probe.sql']}) | `{v['probe_voor_apply']}` |",
          f"| P4 7_vinger vóór het blok (harde STOP bij afwijking) | `7_vinger_aggregaat.sql` ({sz['7_vinger_aggregaat.sql']}) | `{v['week_voor']}|{v['blok_voor']}|{v['rest']}` |",
          f"| P4 generale repetitie + T15 + isolatie | `8_generale_repetitie.sql` ({sz['8_generale_repetitie.sql']}) | `{v['gr_eindrij']}` + `|pogingen30|pogingen30_leerders|logins30_leerders|logins30_staf|laatste_poging` + `|repeatable read` (STOP als pogingen30_leerders > 0, logins30_leerders > 0 of isolatie ≠ repeatable read) |",
          f"| P4 apply | `3_apply.sql` ({sz['3_apply.sql']}) | `{v['apply_uitvoer']}` (serialisatiefout = STOP, niets veranderd) |",
          f"| P4 aparte controle | `7_vinger_aggregaat.sql` | `{v['week_na']}|{v['blok_na']}|{v['rest']}` |",
          f"| P4 tweede apply | `3_apply.sql` | `{v['leeg_uitvoer']}` |",
          f"| terugdraaien (alleen op opdracht van Ibra; eerst 7_vinger = NA van dit blok) | `4_rollback.sql` ({sz['4_rollback.sql']}) | `{v['rollback_uitvoer']}`, daarna 7_vinger `{v['week_voor']}|{v['blok_voor']}|{v['rest']}` |", ""]
L += ["## Na alle blokken", "- B25-controle (T12): `SELECT item_id FROM public.curriculum_items WHERE week = 2 AND strict_tashkeel AND NOT (options ? correct_answer);` → 0 rijen.",
      "- Tellingen week 2 (replica): needs_image 10 → 0 · strict_tashkeel 0 → 20 · punten 119 → 109 · needs_ns_audio 42 en needs_student_recording 6 ongewijzigd."]
open(f"{B}/VERWACHT_PER_STAP.md", "w", encoding="utf-8").write("\n".join(L) + "\n")
print("VERWACHT_PER_STAP.md md5", hashlib.md5(open(f"{B}/VERWACHT_PER_STAP.md", "rb").read()).hexdigest())
