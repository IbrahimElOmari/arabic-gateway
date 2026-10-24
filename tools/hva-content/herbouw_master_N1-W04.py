#!/usr/bin/env python3
# herbouw_master_N1-W04.py v1.0 — Maker-T · P4 N1-W04 (deel 4, na de rooktest) · 9T P3 V4 en 9T P4 V5.
# Van de verse export (ruwe JSON van query_database, p4/export_N1_naP4.sql) naar de nieuwe LEESBARE_LIJST_MASTER.tsv, met twee poorten:
#   (1) EXPORTCONTROLE: de verse export moet in alle 30 kolommen gelijk zijn aan de voorspelde export p4/master/n1_voorspeld.tsv
#       (= de export van 2026-10-24 met W01–W04 = p3/APP_NA_N1-W0x.tsv), behalve `updated_at` in de rijen die P4 raakt
#       (W04 109 · W03 8 · W02 2 · W01 1 = 120 rijen, uit de items.txt van de 9 blokken). Elk ander verschil = STOP (geen master).
#   (2) MASTERCONTROLE: app_naar_master v1.1 → master_rest_uit_master (comp + N2 uit de huidige master 4673c3eb…) → maak_master
#       → md5 moet gelijk zijn aan de voorspelling bf0a8b972f42d6b6344016cc2e8e5936. Anders = STOP (geen master; het verschil naar Ibra).
# Schrijft alleen in <uitmap>. Raakt de database niet.
# Gebruik: python3 -I herbouw_master_N1-W04.py <werkmap> <ruwe_export.json | export.tsv> <uitmap>
import sys, os, csv, json, subprocess, hashlib, collections
csv.field_size_limit(10**9)
WM, BRON, UIT = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]), os.path.abspath(sys.argv[3]); os.makedirs(UIT, exist_ok=True)
S = os.path.join(WM, "scripts"); md5 = lambda p: hashlib.md5(open(p, "rb").read()).hexdigest()
VOORSPELD_EXPORT = f"{WM}/p4/master/n1_voorspeld.tsv"; MASTER = f"{WM}/bron/LEESBARE_LIJST_MASTER_4673c3eb.tsv"
VOORSPELD_MASTER_MD5 = "bf0a8b972f42d6b6344016cc2e8e5936"
assert md5(MASTER) == "4673c3eb83ca3366dc1ad96257fbe321", "huidige master wijkt af van 4673c3eb…"
run = lambda *a: subprocess.run(["python3", "-I", *a], capture_output=True, text=True, check=True).stdout
def stop(m): print("STOP: " + m); sys.exit(2)
exp = f"{UIT}/APP_EXPORT_N1_naP4_N1-W04.tsv"
if BRON.endswith(".json"): print(run(f"{S}/app_export_week.py", BRON, exp).strip().splitlines()[-1]); print(f"ruwe JSON md5 {md5(BRON)}")
else: open(exp, "wb").write(open(BRON, "rb").read())
rd = lambda p: list(csv.DictReader(open(p, encoding="utf-8", newline=""), delimiter="\t"))
E, V = rd(exp), rd(VOORSPELD_EXPORT)
if list(E[0].keys()) != list(V[0].keys()): stop("andere kolommen dan de voorspelde export")
ev, vv = {r["item_id"]: r for r in E}, {r["item_id"]: r for r in V}
if set(ev) != set(vv) or len(E) != len(V) or len(E) != 2299: stop(f"andere rijen: export {len(E)} · voorspeld {len(V)} · alleen in export {sorted(set(ev) - set(vv))[:5]} · alleen voorspeld {sorted(set(vv) - set(ev))[:5]}")
GERAAKT = set()
for l in list(open(f"{WM}/p3/sql/BLOKKEN_MANIFEST.tsv", encoding="utf-8"))[1:]:
    mp = l.rstrip("\n").split("\t")[3]
    GERAAKT |= {x.split("\t")[0] for x in open(f"{WM}/p3/sql/{mp}/items.txt", encoding="utf-8") if x.rstrip("\n").split("\t")[-1] == "gewijzigd"}
if len(GERAAKT) != 120: stop(f"geraakte rijen volgens items.txt: {len(GERAAKT)} (verwacht 120 = W04 109 · W03 8 · W02 2 · W01 1)")
verschil = collections.Counter(); upd = collections.Counter(); onverwacht = []
for i, r in ev.items():
    for k in r:
        if r[k] == vv[i][k]: continue
        if k == "updated_at" and i in GERAAKT: upd[i.split("-")[0]] += 1; continue
        onverwacht.append((i, k)); verschil[(i.split("-")[0], k)] += 1
print(f"exportcontrole: 2299 rijen · updated_at nieuw in {sum(upd.values())} geraakte rijen ({dict(sorted(upd.items()))}; verwacht {len(GERAAKT)}) · andere verschillen {len(onverwacht)}")
if onverwacht: stop(f"de verse export wijkt af van de voorspelling buiten updated_at: {dict(verschil)} (eerste: {onverwacht[:5]}) → geen master, verschil naar Ibra")
if sum(upd.values()) != len(GERAAKT): print(f"LET OP: updated_at nieuw in {sum(upd.values())} van de {len(GERAAKT)} geraakte rijen (een rij die P4 niet echt veranderde, houdt zijn updated_at)")
run(f"{S}/app_naar_master.py", exp, f"{UIT}/n1_lijst.tsv", "N1")
run(f"{S}/master_rest_uit_master.py", MASTER, f"{UIT}/n1_lijst.tsv", f"{UIT}/rest.tsv")
run(f"{S}/maak_master.py", f"{UIT}/n1_lijst.tsv", f"{UIT}/rest.tsv", f"{UIT}/LEESBARE_LIJST_MASTER.tsv")
m = md5(f"{UIT}/LEESBARE_LIJST_MASTER.tsv"); n = sum(1 for _ in open(f"{UIT}/LEESBARE_LIJST_MASTER.tsv", encoding="utf-8"))
print(f"master: md5 {m} · {n} regels (met kop) · {os.path.getsize(f'{UIT}/LEESBARE_LIJST_MASTER.tsv')} bytes · export md5 {md5(exp)}")
if m != VOORSPELD_MASTER_MD5: stop(f"master {m} ≠ voorspelling {VOORSPELD_MASTER_MD5} → geen master, verschil naar Ibra")
print("MASTER = VOORSPELLING ✓")
