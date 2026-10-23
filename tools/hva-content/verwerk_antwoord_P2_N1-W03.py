# verwerk_antwoord_P2_N1-W03.py v1 — Regisseur-D/T (1D, 1T) · N1-W03 · verwerkt het LETTERLIJKE P2-antwoord van Ibra in één gang, door
# scripts, nooit met de hand (tegenrapport T P2: alternatief §3, V1–V4; B18 item-atomair).
#   1. leest het antwoord; zonder "P2 akkoord" = STOP. Poortbesluiten 1–10 met hun toegestane keuzes; een onbekend nummer, een onbekende
#      keuze, "2 nee" of een dubbel besluit = STOP. Niet genoemd = de aanbeveling uit het poortrapport (DEFAULT hieronder);
#   2. bouwt het log opnieuw met de gekozen varianten (8: luisteren-03 a|b; 10: vlag luisteren-08 tekst|leeg); bij de aanbevolen
#      varianten moet dat log byte-gelijk zijn aan p2/N1-W03_wijzigingslog.tsv (anders STOP: p2 is niet actueel);
#   3. review: staat er in het antwoord geen enkel W-id, dan geldt "deel 1 ja · 2a ja" en "ja" op elke 2b-regel (= "P2 akkoord" zonder
#      meer); staat er wel een W-id, dan moet elke 2b-regel een eigen besluit hebben (review_bulk, vangt typfouten). "deel 1"/"2a" die
#      niet genoemd zijn, worden "ja";
#   4. poortbesluiten met gevolgen voor het log worden logbesluiten: 3b → de puntenregel van U3-lezen-01 "nee"; 4 nee → de Vraag van
#      U3-reflectie-01 "nee" (beide via (item, veld), nooit een vast id);
#   5. review_bulk v1.3 (--log) → verwerk_p2 v1.2 (--logbesluiten verplicht als het bestand bestaat) → apply_log v1.3 per week;
#   6. NA-diff tegen de proef van dezelfde varianten (alles ja): elk verschil hoort bij een teruggestuurd item of een afgewezen vlag, en
#      een teruggestuurd item staat in NA precies zoals in VOOR; elke bevestiging (review input_arabic, log review_flag) = de NA-tekst;
#   7. check v1.4 --poort op de NA (W03 met U3-luisteren-08 als uitzondering) en per teruggestuurd item de reeks en de K-bevindingen
#      (revisie D en T) die in de app blijven staan → VERWERKING_P2_N1-W03.md. Exit 0 = verwerkt; 2 = STOP (niets is goedgekeurd).
# Gebruik: python3 -I verwerk_antwoord_P2_N1-W03.py <werkmap> <antwoord.txt> <uitmap> [--datum "2026-10-23 hh:mm"]
import sys, os, re, csv, json, hashlib, subprocess, shutil, collections
csv.field_size_limit(10**9)
args = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith("--") and not sys.argv[i - 1].startswith("--")]
WM, ANTW, UIT = [os.path.abspath(a) for a in args[:3]]
datum = sys.argv[sys.argv.index("--datum") + 1] if "--datum" in sys.argv else "P2"
S, B, P = os.path.join(WM, "scripts"), os.path.join(WM, "bron"), os.path.join(WM, "p2")
PY = [sys.executable, "-I"]
def stop(m): print("STOP: " + m); sys.exit(2)
def md5(p): return hashlib.md5(open(p, "rb").read()).hexdigest()
def rd(p): return list(csv.DictReader(open(p, encoding="utf-8", newline=""), delimiter="\t"))
def run(cmd, mag_falen=False):
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0 and not mag_falen: stop(f"{os.path.basename(cmd[2] if cmd[0] == sys.executable else cmd[0])} gaf exit {p.returncode}:\n{(p.stdout + p.stderr).strip()[-1500:]}")
    return p
if os.path.exists(UIT): stop(f"uitmap {UIT} bestaat al (een verwerking schrijft nooit over een vorige heen)")
os.makedirs(os.path.join(UIT, "basis")); os.makedirs(os.path.join(UIT, "proef"))
antwoord = open(ANTW, encoding="utf-8").read().strip()
open(os.path.join(UIT, "antwoord_P2_Ibra.txt"), "w", encoding="utf-8").write(antwoord + "\n")
# ---- 1. poortbesluiten ----
TOEGESTAAN = {1: {"ja"}, 2: {"ja"}, 3: {"a", "b"}, 4: {"ja", "nee"}, 5: {"ja", "nee"}, 6: {"ja", "nee"}, 7: {"ja", "nee"}, 8: {"a", "b"}, 9: {"a", "b"}, 10: {"a", "b"}}
DEFAULT = {1: "ja", 2: "ja", 3: "a", 4: "ja", 5: "ja", 6: "ja", 7: "ja", 8: "b", 9: "b", 10: "a"}
SPLIT = r"\s*[·;\n]\s*(?=(?i:W\d{4}\b|deel\s*1\b|(?:deel\s*)?2a\b|p[0-4]\s+akkoord|\d{1,2}\s*[a-z]?(?:\s+(?:ja|nee|akkoord))?\s*(?:[·;\n]|$)|#))"
tokens = [t for t in re.split(SPLIT, antwoord) if t and not t.startswith("#")]
if not any(re.fullmatch(r"(?i)p2\s+akkoord\.?", t) for t in tokens): stop("geen \"P2 akkoord\" in het antwoord: er wordt niets verwerkt")
poort, review_tok = {}, []
for t in tokens:
    if re.fullmatch(r"(?i)p2\s+akkoord\.?", t): continue
    if re.fullmatch(r"(?i)p[0-4]\s+akkoord\.?", t): stop(f"verkeerde poort in het antwoord: {t!r}")
    m = re.fullmatch(r"(?i)(?!2a\b)(\d{1,2})\s*([a-z])?(?:\s+(ja|nee|akkoord))?\.?", t)
    if m:
        n, keuze = int(m.group(1)), (m.group(2) or {"akkoord": "ja"}.get((m.group(3) or "").lower(), (m.group(3) or "").lower())).lower()
        if n not in TOEGESTAAN: stop(f"onbekende beslissing {n} in {t!r}")
        if keuze not in TOEGESTAAN[n]: stop(f"beslissing {n}: keuze {keuze!r} bestaat niet (toegestaan: {sorted(TOEGESTAAN[n])}) in {t!r}" + (" — zonder goedgekeurd log verwerken we niets; vraag het team" if n == 2 else ""))
        if n in poort: stop(f"twee besluiten voor beslissing {n}")
        poort[n] = keuze; continue
    if re.match(r"(?i)W\d{4}\b|deel\s*1\b|(?:deel\s*)?2a\b", t): review_tok.append(t); continue
    stop(f"besluit niet herkend: {t!r}")
besl = {n: poort.get(n, DEFAULT[n]) for n in TOEGESTAAN}
# ---- 2. log met de gekozen varianten ----
L03, V08 = besl[8], {"a": "tekst", "b": "leeg"}[besl[10]]
bl, br = os.path.join(UIT, "basis", "N1-W03_wijzigingslog.tsv"), os.path.join(UIT, "basis", "review_native_N1-W03.tsv")
run(PY + [f"{S}/w03/maak_log_N1-W03.py", f"{B}/APP_EXPORT_N1-W03_2026-10-20.tsv", f"{B}/APP_BACKUP_N1-W02_2026-10-20_W03nazorg.tsv", f"{B}/APP_BACKUP_N1-W01_2026-10-20_W03nazorg.tsv",
          f"{P}/N1-W03_revisie_D.tsv", f"{P}/N1-W03_revisie_T.tsv", bl, br, "--l03", L03, "--vlag08", V08])
if (L03, V08) == ("b", "tekst"):
    if md5(bl) != md5(f"{P}/N1-W03_wijzigingslog.tsv") or md5(br) != md5(f"{P}/review_native_N1-W03.tsv"): stop("het log met de aanbevolen varianten ≠ p2/N1-W03_wijzigingslog.tsv (p2 niet actueel? draai eerst de keten)")
LOG, REV = rd(bl), rd(br)
IDX = {(r["item_id"], r["veld"]): r["wijziging_id"] for r in LOG}
# ---- 3 + 4. review- en logbesluiten ----
rev_antw = list(review_tok)
heeft_w = any(re.match(r"(?i)W\d{4}\b", t) for t in review_tok)
if not any(re.match(r"(?i)deel\s*1\b", t) for t in review_tok): rev_antw.insert(0, "deel 1 ja")
if not any(re.match(r"(?i)(?:deel\s*)?2a\b", t) for t in review_tok): rev_antw.insert(1, "2a ja")
if not heeft_w: rev_antw += [f"{r['wijziging_id']} ja" for r in REV if r["deel"] == "2b nieuw"]
if besl[3] == "b": rev_antw.append(f"{IDX[('U3-lezen-01', 'points')]} nee 5 punten blijft (beslissing 3b)")
if besl[4] == "nee": rev_antw.append(f"{IDX[('U3-reflectie-01', 'question')]} nee doelen niet goedgekeurd (beslissing 4)")
ap = os.path.join(UIT, "antwoord_review_uitgeschreven.txt")
open(ap, "w", encoding="utf-8").write(" · ".join(rev_antw) + "\n")
# ---- 5. review_bulk → verwerk_p2 → apply_log ----
ri = os.path.join(UIT, "review_native_N1-W03_P2.tsv"); lbp = ri.rsplit(".tsv", 1)[0] + "_logbesluiten.tsv"
p_rb = run(PY + [f"{S}/review_bulk.py", br, ap, ri, "--log", bl])
lp = os.path.join(UIT, "N1-W03_wijzigingslog_P2.tsv")
p_vp = run(PY + [f"{S}/verwerk_p2_N1-W03.py", bl, ri, lp, "--datum", datum] + (["--logbesluiten", lbp] if os.path.exists(lbp) else []))
LP = rd(lp)
st = collections.Counter(r["status"] for r in LP)
BRON = {3: f"{B}/APP_EXPORT_N1-W03_2026-10-20.tsv", 2: f"{B}/APP_BACKUP_N1-W02_2026-10-20_W03nazorg.tsv", 1: f"{B}/APP_BACKUP_N1-W01_2026-10-20_W03nazorg.tsv"}
NA, VOOR, PR = {}, {}, {}
run(PY + [f"{S}/w03/maak_proef_N1-W03.py", bl, br, f"{UIT}/proef/log_proef.tsv", f"{UIT}/proef/review_proef.tsv"])
for w in (3, 2, 1):
    na = os.path.join(UIT, f"APP_NA_N1-W0{w}_P2.tsv"); pr = os.path.join(UIT, "proef", f"APP_NA_N1-W0{w}_proef.tsv")
    if any(r["status"] == "goedgekeurd" and r["item_id"].startswith(f"U{w}-") for r in LP):
        run(PY + [f"{S}/apply_log.py", BRON[w], lp, na, "--week", str(w), "--review", ri, "--apply", "--stil"])
    else: shutil.copyfile(BRON[w], na)   # geen enkele goedgekeurde regel voor deze week: NA = VOOR
    run(PY + [f"{S}/apply_log.py", BRON[w], f"{UIT}/proef/log_proef.tsv", pr, "--week", str(w), "--review", f"{UIT}/proef/review_proef.tsv", "--apply", "--stil"])
    for d, pad in ((NA, na), (VOOR, BRON[w]), (PR, pr)): d.update({r["item_id"]: r for r in rd(pad)})
# ---- 6. NA-diff tegen de proef ----
terug = sorted({r["item_id"] for r in LP if r["status"] == "afgewezen" and not r["besluit_ibra"].startswith("vlag blijft")})
alleen_vlag = {(r["item_id"], r["veld"]) for r in LP if r["status"] == "afgewezen" and r["besluit_ibra"].startswith("vlag blijft")}
fout = []
NIET = {"updated_at", "created_at", "id"}
for i in NA:
    for k in NA[i]:
        if k in NIET or NA[i][k] == PR[i][k]: continue
        if i in terug or (i, k) in alleen_vlag: continue
        fout.append(f"{i} · {k}: NA ≠ proef, maar het item is niet teruggestuurd")
for i in terug:
    for k in NA[i]:
        if k not in NIET and NA[i][k] != VOOR[i][k]: fout.append(f"{i} · {k}: teruggestuurd item is niet gelijk aan VOOR")
RI = {r["wijziging_id"]: r for r in rd(ri)}
logveld = {r["wijziging_id"]: (r["item_id"], r["veld"]) for r in LOG}
bev = 0
for w, r in RI.items():
    if r["veld"] == "input_arabic" and logveld[w][1] == "review_flag" and r["item_id"] not in terug:
        bev += 1
        if NA[r["item_id"]]["input_arabic"] != r["voorgesteld"]: fout.append(f"{w} {r['item_id']}: bevestigde tekst ≠ NA-tekst")
if fout: stop(f"{len(fout)} afwijkingen in de NA-diff:\n  " + "\n  ".join(fout[:30]))
# ---- 7. check en rapport ----
chk = {}
for w in (3, 2, 1):
    p = run(PY + [f"{S}/check_N1-W03.py", f"{UIT}/APP_NA_N1-W0{w}_P2.tsv", f"{B}/ULTIEME_LEESBARE_LIJST.tsv", "N1", str(w), f"{UIT}/check_v1_4_NA_N1-W0{w}_P2.tsv", "--poort"]
            + (["--uitzondering=U3-luisteren-08"] if w == 3 else []), mag_falen=True)
    open(f"{UIT}/check_v1_4_NA_N1-W0{w}_P2.out", "w", encoding="utf-8").write(p.stdout)
    chk[w] = p.stdout.strip().splitlines()[-1]
Kb = collections.defaultdict(list)
for pad in (f"{P}/N1-W03_revisie_D.tsv", f"{P}/N1-W03_revisie_T.tsv"):
    for r in rd(pad):
        if r["ernst"] != "K": continue
        for s in r["item_id"].split(","):
            for i in terug:
                if i == s or i.startswith(s + "-"): Kb[i].append(f"{r['bevinding_id']} ({r['categorie']}): {r['probleem'][:110]}")
def reeks(i): return re.sub(r"-\d+$", "", i) if re.search(r"-\d+-\d+$", i) else i
md = [f"# VERWERKING_P2_N1-W03.md", f"Gemaakt door `verwerk_antwoord_P2_N1-W03.py` v1 ({datum}). Invoer: het letterlijke antwoord van Ibra (hieronder), het log van de varianten 8{L03} en 10{besl[10]}.", "",
      "## Antwoord van Ibra (letterlijk)", "```", antwoord, "```", "",
      "## Uitgeschreven", "Poortbesluiten: " + " · ".join(f"{n} {v}" for n, v in besl.items()) + " (niet genoemd = aanbeveling).", "",
      "Review en logbesluiten zoals `review_bulk` ze kreeg:", "```", " · ".join(rev_antw), "```", "",
      "## Resultaat", f"- log: {len(LP)} regels · " + " · ".join(f"{k} {v}" for k, v in sorted(st.items())) + f" · md5 basislog `{md5(bl)}`, goedgekeurd log `{md5(lp)}`",
      f"- review: {len(RI)} regels · " + " · ".join(f"{k} {v}" for k, v in sorted(collections.Counter(r['akkoord'] for r in RI.values()).items())) + f" · md5 `{md5(ri)}`",
      f"- NA: " + " · ".join(f"W0{w} `{md5(f'{UIT}/APP_NA_N1-W0{w}_P2.tsv')}`" for w in (3, 2, 1)) + f" · NA-diff tegen de proef: 0 afwijkingen buiten de teruggestuurde items · bevestigingen gecontroleerd: {bev}",
      f"- check v1.4 --poort: " + " · ".join(f"W0{w}: {chk[w]}" for w in (3, 2, 1)), "",
      "## Teruggestuurd naar 4D (P3)" + ("" if terug else ": geen")]
for i in terug:
    regels = [r for r in LP if r["item_id"] == i]
    md.append(f"- `{i}` (reeks `{reeks(i)}`): {len(regels)} regels afgewezen · blijft in de app zoals nu · K die blijven: " + ("; ".join(Kb[i]) if Kb[i] else "geen"))
if alleen_vlag: md += ["", "Alleen een vlag afgewezen (blijft staan): " + ", ".join(f"`{i}`" for i, _ in sorted(alleen_vlag))]
md += ["", "## Uitvoer van de scripts", "```", p_rb.stdout.strip(), p_vp.stdout.strip(), "```"]
open(os.path.join(UIT, "VERWERKING_P2_N1-W03.md"), "w", encoding="utf-8").write("\n".join(md) + "\n")
print("\n".join(md[:28]))
print(f"VERWERKT: {st.get('goedgekeurd', 0)} goedgekeurd · {st.get('afgewezen', 0)} afgewezen · items terug {len(terug)}")
