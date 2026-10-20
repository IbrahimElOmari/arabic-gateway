# rapport_7D_N1-W02.py v1 — Maker-D (7D) · P3 N1-W02 · maakt het telrapport en de leesbare diff uit de VOOR- en NA-stand
# (app-formaat, 30 kolommen), de lijsten (app_naar_master.py) en het goedgekeurde log. Rekent alles na; niets met de hand.
#   telrapport: items/regels vóór → na, regels per categorie met verklaring per item (wijziging_id's), veldverschillen = logregels
#               (onverklaard / zonder effect / eindwaarde ≠ log), regelniveau: elke gewijzigde (item, categorie) heeft een logregel
#               op het bijbehorende veld en omgekeerd; velden die het lijstformaat niet toont (B7 punt 4) worden apart geteld.
#   diff:       elke logregel van de week, per item in de app-volgorde: oud → nieuw, volledig, zonder inkorting.
# Gebruik: python3 -I rapport_7D_N1-W02.py <map p3> <log> <datum>
# Verwacht in <map p3>: VOOR/NA per week (zie WEKEN) en de lijsten VOOR/NA. Exit 1 bij elk onverklaard verschil.
import sys, csv, json, collections, hashlib, os
csv.field_size_limit(10**9)
P3, LOGPAD, DATUM = sys.argv[1], sys.argv[2], sys.argv[3]
B = os.path.dirname(os.path.abspath(P3))
WEKEN = [  # (week, VOOR-export, NA-export, VOOR-lijst, NA-lijst, naam NA-lijst)
    ("2", B + "/uit/APP_EXPORT_N1-W02_2026-10-19.tsv", P3 + "/APP_NA_N1-W02.tsv", P3 + "/LIJST_N1-W02_VOOR_uit_app.tsv", P3 + "/LEESBARE_LIJST_N1-W02_v1.tsv", "LEESBARE_LIJST_N1-W02_v1.tsv"),
    ("1", P3 + "/VOOR_N1-W01_uit_N1-export_2026-10-20.tsv", P3 + "/APP_NA_N1-W01.tsv", P3 + "/LIJST_N1-W01_VOOR_uit_app.tsv", P3 + "/LEESBARE_LIJST_N1-W01_v2.tsv", "LEESBARE_LIJST_N1-W01_v2.tsv"),
]
CAT2VELD = {"Opdracht / instructie": ["instruction_nl"], "Vraag": ["question"], "Antwoordoptie": ["options"],
            "Correct antwoord": ["correct_answer", "correct_options"], "Feedback correct": ["feedback_correct"], "Feedback fout": ["feedback_incorrect"]}
for k in ("input_arabic", "input_transliteration", "input_translation_nl", "points", "media_production", "exercise_type", "review_flag"):
    CAT2VELD[f"app:{k}"] = [k]
IN_LIJST = {v for vs in CAT2VELD.values() for v in vs}
CATVOLG = list(CAT2VELD)
LABEL = {"instruction_nl": "Opdracht", "question": "Vraag", "options": "Opties", "correct_answer": "Correct", "correct_options": "Correct (meerdere)",
         "feedback_correct": "Feedback ✓", "feedback_incorrect": "Feedback ✗", "input_arabic": "Arabisch (stimulus)", "input_transliteration": "Transliteratie",
         "input_translation_nl": "Vertaling", "reference_media": "Referentiemedia", "media_production": "Media", "points": "Punten", "review_flag": "Vlag",
         "strict_tashkeel": "strict_tashkeel", "is_published": "gepubliceerd"}
def md5(p): return hashlib.md5(open(p, "rb").read()).hexdigest()
def rd(p): return list(csv.DictReader(open(p, encoding="utf-8", newline=""), delimiter="\t"))
LOG = [l.rstrip("\n").split("\t") for l in open(LOGPAD, encoding="utf-8")]
LK = {c: i for i, c in enumerate(LOG[0])}; LOG = LOG[1:]
def toon(v, veld):
    if v == "": return "(leeg)"
    if veld == "options":
        try:
            lst = json.loads(v)
            return " · ".join(f"{chr(65 + i)}) {w}" for i, w in enumerate(lst)) if lst else "(lege lijst)"
        except Exception: return v
    return v.replace("\\n", " ⏎ ")
fout = 0; T = []; D = []
T.append(f"# N1-W02 · telrapport (lijst v1 en W01-nazorg)\nMaker-D (7D) · {DATUM} · gemaakt door `scripts/rapport_7D_N1-W02.py` v1 (niets met de hand) · log `{os.path.basename(LOGPAD)}` md5 `{md5(LOGPAD)}` ({len(LOG)} regels, alle `goedgekeurd`).\n")
D.append(f"# N1-W02 · leesbare diff (oud → nieuw)\nMaker-D (7D) · {DATUM} · gemaakt door `scripts/rapport_7D_N1-W02.py` v1 · bron: het goedgekeurde log `{os.path.basename(LOGPAD)}` (md5 `{md5(LOGPAD)}`), elke regel volledig en letterlijk; per item in de volgorde van de app. Een lege waarde staat als \"(leeg)\"; opties staan als A) … · B) … in de volgorde van de app.\n")
for wk, vp, np_, vl, nl, nlnaam in WEKEN:
    V = {r["item_id"]: r for r in rd(vp)}; N = {r["item_id"]: r for r in rd(np_)}
    log = [r for r in LOG if r[LK["item_id"]].startswith(f"U{wk}-")]
    lv = rd(vl); ln = rd(nl)
    titel = "W02" if wk == "2" else "W01-nazorg"
    assert set(V) == set(N), "item_id's VOOR ≠ NA"
    # 1. items/regels
    T.append(f"\n## {titel} (week {wk})\n")
    T.append(f"| bestand | rol | md5 | items | regels |\n|---|---|---|---|---|")
    T.append(f"| `{os.path.basename(vp)}` | app VOOR (30 kolommen) | `{md5(vp)}` | {len(V)} | — |")
    T.append(f"| `{os.path.basename(np_)}` | app NA (apply_log v1.2) | `{md5(np_)}` | {len(N)} | — |")
    T.append(f"| `{os.path.basename(vl)}` | lijst VOOR (= masterdeel week {wk}) | `{md5(vl)}` | {len({r['item_id'] for r in lv})} | {len(lv)} |")
    T.append(f"| `{nlnaam}` | lijst NA | `{md5(nl)}` | {len({r['item_id'] for r in ln})} | {len(ln)} |\n")
    # 2. per categorie
    cv = collections.Counter(r["categorie"] for r in lv); cn = collections.Counter(r["categorie"] for r in ln)
    per = collections.defaultdict(lambda: collections.defaultdict(lambda: [[], []]))
    for r in lv: per[r["item_id"]][r["categorie"]][0].append(r["tekst"])
    for r in ln: per[r["item_id"]][r["categorie"]][1].append(r["tekst"])
    logidx = collections.defaultdict(list)
    for r in log: logidx[(r[LK["item_id"]], r[LK["veld"]])].append(r[LK["wijziging_id"]])
    T.append("### Regels per categorie (vóór → na)\n\n| categorie | vóór | na | verschil | verklaring (item: regels vóór → na · logregel) |\n|---|---|---|---|---|")
    for c in CATVOLG + sorted((set(cv) | set(cn)) - set(CATVOLG)):
        if c not in cv and c not in cn: continue
        uitleg = []
        for iid in sorted(per, key=lambda i: (int(V[i]["display_order"] or 0), i)):
            a, b = per[iid][c]
            if len(a) != len(b):
                ids = [w for veld in CAT2VELD.get(c, []) for w in logidx.get((iid, veld), [])]
                if not ids: fout += 1
                uitleg.append(f"{iid}: {len(a)} → {len(b)} · {', '.join(ids) or 'GEEN LOGREGEL'}")
        d = cn[c] - cv[c]
        T.append(f"| {c} | {cv[c]} | {cn[c]} | {d:+d} | {'; '.join(uitleg) if uitleg else '—'} |")
    T.append(f"| **totaal** | **{len(lv)}** | **{len(ln)}** | **{len(ln) - len(lv):+d}** | som van de regels hierboven |\n")
    # 3. veldniveau
    diff = {(i, k) for i in V for k in V[i] if V[i][k] != N[i][k]}
    lk = {(r[LK["item_id"]], r[LK["veld"]]) for r in log}
    onv = sorted(diff - lk); zonder = sorted(lk - diff)
    eind = sorted(k for k in diff & lk if [r for r in log if (r[LK["item_id"]], r[LK["veld"]]) == k][-1][LK["nieuw"]].replace("\\n", "\n") != N[k[0]][k[1]])
    fout += len(onv) + len(zonder) + len(eind)
    T.append(f"### Veldniveau (app VOOR → NA)\n- veldverschillen **{len(diff)}** · logregels **{len(log)}** · onverklaard **{len(onv)}** · logregel zonder effect **{len(zonder)}** · eindwaarde ≠ log **{len(eind)}**")
    for x in onv + zonder + eind: T.append(f"  - ! {x}")
    pv = collections.Counter(k for _, k in diff)
    # 4. regelniveau: gewijzigde (item, categorie) ↔ logregel op het veld
    gew = {(i, c) for i in per for c in per[i] if per[i][c][0] != per[i][c][1]}
    zonder_log = sorted((i, c) for i, c in gew if not any((i, v) in lk for v in CAT2VELD.get(c, [])))
    def zichtbaar(i, v):  # zelfde regels als app_naar_master.py: meerdere-antwoorden toont correct_options, de andere types correct_answer
        if v not in IN_LIJST: return False
        ma = lambda r: r["exercise_type"] == "meerdere-antwoorden" and (json.loads(r["correct_options"]) if r["correct_options"] else [])
        if v == "correct_answer" and (ma(V[i]) or ma(N[i])): return False
        if v == "correct_options" and not (ma(V[i]) or ma(N[i])): return False
        return True
    log_zonder_lijst = sorted((i, v) for i, v in lk if zichtbaar(i, v) and not any((i, c) in gew for c, vs in CAT2VELD.items() if v in vs))
    niet_zichtbaar = sorted((i, v) for i, v in lk if not zichtbaar(i, v))
    T.append("\n| veld | logregels = veldverschillen | waarvan zichtbaar in de lijst |\n|---|---|---|")
    for k in sorted(pv, key=lambda k: (-pv[k], k)):
        z = sum(1 for i, v in diff if v == k and zichtbaar(i, v))
        T.append(f"| `{k}` | {pv[k]} | {z}" + ("" if z == pv[k] else f" (de andere {pv[k] - z}: zie hieronder)") + " |")
    fout += len(zonder_log) + len(log_zonder_lijst)
    T.append(f"\n### Regelniveau (lijst VOOR → lijst NA)\n- gewijzigde (item, categorie)-paren: **{len(gew)}** · zonder logregel op het veld: **{len(zonder_log)}** · logregel op een lijstveld zonder gewijzigde lijstregel: **{len(log_zonder_lijst)}**")
    for x in zonder_log + log_zonder_lijst: T.append(f"  - ! {x}")
    nz = collections.Counter(v for _, v in niet_zichtbaar)
    T.append(f"- logregels op velden die het lijstformaat niet toont: **{len(niet_zichtbaar)}**" + (f" ({', '.join(f'`{k}` {n}' for k, n in sorted(nz.items()))}); ze staan in de JSON en in de SQL:" if nz else ""))
    nzset = set(niet_zichtbaar)
    for v in sorted(nz):
        ids = sorted(r[LK["wijziging_id"]] for r in log if r[LK["veld"]] == v and (r[LK["item_id"]], v) in nzset)
        waarom = " (meerdere-antwoorden: de lijst toont `correct_options`, één regel per juiste optie)" if v == "correct_answer" else " (B7 punt 4: geen `app:`-regel voor dit veld)"
        T.append(f"  - `{v}`{waarom}: {', '.join(ids)}")
    ongew = sorted(i for i in V if not any(V[i][k] != N[i][k] for k in V[i]))
    T.append(f"- items geraakt: **{len({i for i, _ in diff})} / {len(V)}** · ongewijzigd: {len(ongew)}" + (f" ({', '.join(ongew)})" if ongew else ""))
    # diff
    D.append(f"\n## {titel} (week {wk}) · {len(log)} logregels · {len({i for i, _ in diff})} items\n")
    perit = collections.defaultdict(list)
    for r in log: perit[r[LK["item_id"]]].append(r)
    for iid in sorted(perit, key=lambda i: (int(V[i]["display_order"] or 0), i)):
        D.append(f"### {iid} · {V[iid]['skill']} · {V[iid]['exercise_type']} · {len(perit[iid])} {'wijziging' if len(perit[iid]) == 1 else 'wijzigingen'}\n")
        for r in perit[iid]:
            v = r[LK["veld"]]
            D.append(f"- **{r[LK['wijziging_id']]}** · {LABEL.get(v, v)} (`{v}`) · {r[LK['ernst']]} · {r[LK['type']]} · {r[LK['bevinding_id']]}")
            D.append(f"  - oud: {toon(r[LK['oud']], v)}")
            D.append(f"  - nieuw: {toon(r[LK['nieuw']], v)}")
            D.append(f"  - reden: {r[LK['reden']]}")
        D.append("")
T.append(f"\n## Uitslag\n- {'**0 onverklaarde verschillen**' if fout == 0 else f'**{fout} onverklaarde verschillen — STOP**'} in W02 en de W01-nazorg (veldniveau en regelniveau).\n- 100 % van de goedgekeurde regels toegepast (W02 en W01 elk in hun eigen apply, `apply_log.py` v1.2 met de ingevulde review), 0 % andere wijzigingen.\n")
open(P3 + "/N1-W02_telrapport.md", "w", encoding="utf-8").write("\n".join(T))
open(P3 + "/N1-W02_diff_leesbaar.md", "w", encoding="utf-8").write("\n".join(D) + "\n")
for n in ("N1-W02_telrapport.md", "N1-W02_diff_leesbaar.md"):
    print(n, os.path.getsize(P3 + "/" + n), "bytes · md5", md5(P3 + "/" + n))
print("onverklaard totaal:", fout)
sys.exit(1 if fout else 0)
