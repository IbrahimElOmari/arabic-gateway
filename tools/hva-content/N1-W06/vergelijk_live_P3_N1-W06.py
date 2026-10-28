# vergelijk_live_P3_N1-W06.py v1.2 (na «P3 akkoord · 2.a»: een droogloop van een bestand dat sindsdien veranderd is, telt als «vervangen» als een latere logregel
#   precies het huidige bestand (zelfde md5, ook als proefkopie in p3/live/sql/) live gelezen heeft; die regel wordt dan aan het definitieve bestand gebonden) · v1.1 (ronde 2: variant B zonder C7t — een droogloop van een blok dat niet meer in het manifest staat, is «vervallen»; proefbestanden; rechten, 8T C-T08) · v1 — Controleur-T (8T) · P3 N1-W06 · vergelijkt de live READ ONLY-uitkomsten (p3/live/ruw/<nr>.json, gelogd in
# LIVE_LEESCONTROLES_N1-W06.tsv) met de verwachtingen van maak_sql v4.6 (verwacht.txt: droogloop_p3, probe_p3) en van de vaste leesacties
# (schema = replica-G0-bron, vingerafdrukken = de back-ups, slot_ref = slot_verwacht.voor, zicht_voor = slot_verwacht.zicht_voor, volgorde).
# Elke uitkomst komt uit het ruwe JSON-bestand zelf (niet uit de logregel); de md5 van het SQL-bestand in de logregel moet de huidige zijn.
# Gebruik: python3 -I vergelijk_live_P3_N1-W06.py <werkmap> → p3/live/LIVE_VERGELIJKING_N1-W06.md, exit 1 bij een afwijking
import sys, os, json, csv, hashlib
WM = os.path.abspath(sys.argv[1]); L = WM + "/p3/live"
LOG = list(csv.DictReader(open(L + "/LIVE_LEESCONTROLES_N1-W06.tsv", encoding="utf-8", newline=""), delimiter="\t"))
def V(root, blok):
    M = [dict(zip(("volgorde", "week", "blok", "map"), l.rstrip("\n").split("\t")[:4])) for l in list(open(f"{WM}/{root}/BLOKKEN_MANIFEST.tsv", encoding="utf-8"))[1:]]
    m = next((r for r in M if r["blok"] == blok), None)
    if m is None: return None
    return dict(l.rstrip("\n").split("\t", 1) for l in open(f"{WM}/{root}/{m['map']}/verwacht.txt", encoding="utf-8"))
def ruw(nr):
    p = f"{L}/ruw/{nr}.json"
    if not os.path.exists(p): return None
    t = open(p, encoding="utf-8").read().strip()
    try: return json.loads(t)["rows"][0]
    except Exception: return {"_fout": t[:300]}
SV = json.load(open(WM + "/p3/sql/slot_verwacht_N1-W06.json", encoding="utf-8"))
rij = []; fout = 0
def ok(nr, naam, kreeg, verw):
    global fout
    g = str(kreeg) == str(verw); fout += not g
    rij.append((nr, naam, "✓" if g else "✗", str(kreeg), str(verw)))
laatste = {}
for r in LOG: laatste[r["nr"]] = r
for nr, r in sorted(laatste.items(), key=lambda x: int(x[0])):
    if r["bestand"].startswith("sql/") or r["bestand"].startswith("p3/"):
        pad = (L + "/" + r["bestand"].split(" ")[0]) if r["bestand"].startswith("sql/") else WM + "/" + r["bestand"]
        if r["md5"] != "-" and os.path.exists(pad) and hashlib.md5(open(pad, "rb").read()).hexdigest() != r["md5"]:
            nu = hashlib.md5(open(pad, "rb").read()).hexdigest()
            later = [x for x in LOG if int(x["nr"]) > int(nr) and x["md5"] == nu and x["stap"] == r["stap"] and x["blok"] == r["blok"]]
            if later: rij.append((nr, f"{r['blok']} {r['stap']} ({r['bestand']}) — vervangen: het bestand veranderde (P3-delta groep 1); nr {later[0]['nr']} las live precies het huidige bestand (md5 {nu[:8]}…)", "·", r["md5"][:8] + "…", nu[:8] + "…")); continue
            ok(nr, f"{r['blok']} {r['stap']}: md5 van het bestand = de gelogde md5", nu, r["md5"])
    d = ruw(nr)
    if d is None or r["md5"] == "-": continue
    if r["stap"] == "droogloop":
        root = "p3/sql_B" if "sql_B" in r["bestand"] else "p3/sql"; vv = V(root, r["blok"])
        if vv is None: rij.append((nr, f"{r['blok']} droogloop ({root}) — vervallen: blok staat niet meer in het manifest (keten v1.1, variant B zonder C7t)", "·", str(d.get("droogloop", d)), "—")); continue
        bron = ""
        if "proefG1" in r["bestand"]:   # v1.2: de proefkopie moet byte-gelijk zijn aan het definitieve bestand van dat blok
            Mr = [dict(zip(("volgorde", "week", "blok", "map"), l.rstrip("\n").split("\t")[:4])) for l in list(open(f"{WM}/{root}/BLOKKEN_MANIFEST.tsv", encoding="utf-8"))[1:]]
            defin = f"{WM}/{root}/{next(x['map'] for x in Mr if x['blok'] == r['blok'])}/2_droogloop.sql"
            gelijk = hashlib.md5(open(defin, "rb").read()).hexdigest() == r["md5"]
            ok(nr, f"{r['blok']} ({root}): de live gelezen proefkopie = het definitieve 2_droogloop.sql", gelijk, True); bron = " (proefkopie = definitief bestand)"
        ok(nr, f"{r['blok']} droogloop P3 (live = back-up) · {root}{bron}", d.get("droogloop", d), vv["droogloop_p3"])
    elif r["stap"] == "probe":
        ok(nr, f"{r['blok']} grootte-probe v2 in P3", d.get("probe", d), V("p3/sql", r["blok"])["probe_p3"])
    elif r["stap"] == "rechten_live":   # 8T C-T08: mag de rol van query_database invoegen en wijzigen ondanks RLS?
        kan = d.get("mag_insert") is True and d.get("mag_update") is True and (d.get("bypassrls") is True or d.get("superuser") is True or (d.get("eigenaar") == d.get("rol") and d.get("force_rls") is False))
        ok(nr, f"rechten: rol {d.get('rol')} · INSERT {d.get('mag_insert')} · UPDATE {d.get('mag_update')} · bypassrls {d.get('bypassrls')} · eigenaar {d.get('eigenaar')} · force_rls {d.get('force_rls')} · read_only {d.get('read_only')} → kan invoegen en wijzigen ondanks RLS", f"{kan}|{d.get('read_only')}", "True|on")
    elif r["stap"] == "volgorde_live":
        ok(nr, "inserttest 7 · volgorde in de live collatie (unit en vorige/volgende, alle en gepubliceerd) · rijen · collatie",
           "|".join(str(d.get(k)) for k in ("unit_alle_ok", "vv_alle_ok", "unit_gep_ok", "vv_gep_ok", "rijen", "collatie")), "true|true|true|true|51|en_US.UTF-8")
    elif r["stap"] == "vinger_W04-W06":
        verw = {"w06_27": "27|4a15e82c225e6b53807708bf9edb6a7d", "w06_30": "27|8b7a7d2f8a364a43f9ab8abf5255b46b", "w05_27": "82|15a7670bbf8ec844c28c79e718def4c8",
                "w05_30": "82|5431f3c08f70d7028341116e73b9c002", "w04_27": "109|2ef6a708e1cb18f2af56c3d2c5576e79", "w04_30": "109|30a95d2eade10e45945f819e38b5a566", "nieuwe_ids_bestaand": 0}
        ok(nr, "vingerafdrukken W06/W05/W04 (27 en 30 kolommen) = back-ups · nieuwe id's 0", "|".join(str(d.get(k)) for k in verw), "|".join(str(v) for v in verw.values()))
    elif r["stap"] == "slot_ref":
        ok(nr, "slot_ref (live) = slot_verwacht.voor (54 weekwaarden) · rijen 2299", "|".join(str(d.get(f"{k}_{w.lower()}")) for w in SV["weken"] for k in SV["sleutels"]) + f"|{d.get('rijen_totaal')}",
           "|".join(str(SV["voor"][w][k]) for w in SV["weken"] for k in SV["sleutels"]) + f"|{SV['voor']['rijen_totaal']}")
    elif r["stap"] == "zicht_voor":
        ok(nr, "zicht_voor (live) = slot_verwacht.zicht_voor (alle kolommen)", "|".join(str(d.get(k)) for k in SV["zicht_voor"]), "|".join(str(v) for v in SV["zicht_voor"].values()))
    elif r["stap"] == "schema_live":
        S = json.load(open(L + "/schema_live_2026-10-27_P3.json", encoding="utf-8"))["rows"][0]
        ok(nr, "schema (ruw) = schema_live_2026-10-27_P3.json (de bron van replica-G0)", json.dumps(d, sort_keys=True, ensure_ascii=False) == json.dumps(S, sort_keys=True, ensure_ascii=False), True)
T = ["# Live leescontroles P3 · N1-W06 · vergelijking", f"Gemaakt door `scripts/vergelijk_live_P3_N1-W06.py` v1.1 uit `p3/live/LIVE_LEESCONTROLES_N1-W06.tsv` (md5 `{hashlib.md5(open(L + '/LIVE_LEESCONTROLES_N1-W06.tsv','rb').read()).hexdigest()}`) en de ruwe uitvoer `p3/live/ruw/<nr>.json`. Alle aanroepen READ ONLY (BEGIN TRANSACTION READ ONLY … ROLLBACK).", "",
     f"**Uitslag: {'GROEN' if fout == 0 else 'AFWIJKING'} — {len([x for x in rij if x[2] != '·']) - fout}/{len([x for x in rij if x[2] != '·'])} ✓** (· = vervallen, telt niet mee)", "", "| nr | controle | | live | verwacht |", "|---|---|---|---|---|"]
for nr, n, s, k, w in rij: T.append(f"| {nr} | {n} | {s} | `{k[:200]}` | `{w[:200]}` |")
open(L + "/LIVE_VERGELIJKING_N1-W06.md", "w", encoding="utf-8").write("\n".join(T) + "\n")
n_ = len([x for x in rij if x[2] != "·"]); print(f"live: {n_ - fout}/{n_} ✓ · {'GROEN' if fout == 0 else 'AFWIJKING'} · vervallen {len(rij) - n_}")
for nr, n, s, k, w in rij:
    if s == "✗": print("  ✗", nr, n, "| live:", k[:300], "| verwacht:", w[:300])
sys.exit(1 if fout else 0)
