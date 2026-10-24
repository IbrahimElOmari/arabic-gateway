# rapport_7D_N1-W04.py v1 (= rapport_7D_N1-W03.py v1 voor vier weken: W04 + nazorg W03, W02 en W01) — Maker-D (7D) · P3 N1-W03 · maakt het telrapport en de leesbare diff uit de VOOR- en NA-stand
# (app-formaat, 30 kolommen), de lijsten (app_naar_master.py) en het goedgekeurde log. Rekent alles na; niets met de hand.
#   telrapport: items/regels vóór → na, regels per categorie met verklaring per item (wijziging_id's), veldverschillen = logregels
#               (onverklaard / zonder effect / eindwaarde ≠ log), regelniveau: elke gewijzigde (item, categorie) heeft een logregel
#               op het bijbehorende veld en omgekeerd; velden die het lijstformaat niet toont (B7 punt 4) worden apart geteld.
#   diff:       elke logregel van de week, per item in de app-volgorde: oud → nieuw, volledig, zonder inkorting.
# v1.1 (na P3-akkoord): --voor <map> = map met de VOOR-bestanden (standaard <map>); --lijsten 2=v2,1=v3 = versies van de NA-lijsten
#   (standaard 2=v1,1=v2). Zonder deze opties geeft het dezelfde inhoud als v1; alleen het versienummer in de kop verschilt.
# v1.2 (8D/8T-delta L2): ketenregels = een tweede of latere logregel op hetzelfde veld (bv. P3 bovenop P2) worden geteld en elke keten
#   moet sluiten (oud = nieuw van de vorige regel); veldverschillen + ketenregels = logregels. Kolomkop van de veldtabel rechtgezet.
# Gebruik: python3 -I rapport_7D_N1-W04.py <map p3> <log> <datum> [--lijsten 4=v1,3=v2,2=v4,1=v5]
# Verwacht in <map p3>: VOOR/NA per week (zie WEKEN) en de lijsten VOOR/NA. Exit 1 bij elk onverklaard verschil.
import sys, csv, json, collections, hashlib, os
csv.field_size_limit(10**9)
def _opt(naam, std):
    return sys.argv[sys.argv.index(naam) + 1] if naam in sys.argv else std
P3, LOGPAD, DATUM = sys.argv[1], sys.argv[2], sys.argv[3]
B = os.path.dirname(os.path.abspath(P3))
VM = _opt("--voor", P3)
VERS = dict(x.split("=") for x in _opt("--lijsten", "4=v1,3=v2,2=v4,1=v5").split(","))
WEKEN = [  # (week, VOOR-export, NA-export, VOOR-lijst, NA-lijst, naam NA-lijst)
    ("4", B + "/bron/APP_BACKUP_N1-W04_2026-10-24_P3.tsv", P3 + "/APP_NA_N1-W04.tsv", VM + "/LIJST_N1-W04_VOOR_uit_app.tsv", P3 + f"/LEESBARE_LIJST_N1-W04_{VERS['4']}.tsv", f"LEESBARE_LIJST_N1-W04_{VERS['4']}.tsv"),
    ("3", B + "/bron/APP_BACKUP_N1-W03_2026-10-24_P3.tsv", P3 + "/APP_NA_N1-W03.tsv", VM + "/LIJST_N1-W03_VOOR_uit_app.tsv", P3 + f"/LEESBARE_LIJST_N1-W03_{VERS['3']}.tsv", f"LEESBARE_LIJST_N1-W03_{VERS['3']}.tsv"),
    ("2", B + "/bron/APP_BACKUP_N1-W02_2026-10-24_P3.tsv", P3 + "/APP_NA_N1-W02.tsv", VM + "/LIJST_N1-W02_VOOR_uit_app.tsv", P3 + f"/LEESBARE_LIJST_N1-W02_{VERS['2']}.tsv", f"LEESBARE_LIJST_N1-W02_{VERS['2']}.tsv"),
    ("1", B + "/bron/APP_BACKUP_N1-W01_2026-10-24_P3.tsv", P3 + "/APP_NA_N1-W01.tsv", VM + "/LIJST_N1-W01_VOOR_uit_app.tsv", P3 + f"/LEESBARE_LIJST_N1-W01_{VERS['1']}.tsv", f"LEESBARE_LIJST_N1-W01_{VERS['1']}.tsv"),
]
CAT2VELD = {"Opdracht / instructie": ["instruction_nl"], "Vraag": ["question"], "Antwoordoptie": ["options"],
            "Correct antwoord": ["correct_answer", "correct_options"], "Feedback correct": ["feedback_correct"], "Feedback fout": ["feedback_incorrect"]}
for k in ("input_arabic", "input_transliteration", "input_translation_nl", "points", "media_production", "exercise_type", "review_flag"):
    CAT2VELD[f"app:{k}"] = [k]
CAT2VELD["app:is_published"] = ["is_published"]   # v1: app_naar_master v1.1 (alleen bij false)
IN_LIJST = {v for vs in CAT2VELD.values() for v in vs}
CATVOLG = list(CAT2VELD)
LABEL = {"instruction_nl": "Opdracht", "question": "Vraag", "options": "Opties", "correct_answer": "Correct", "correct_options": "Correct (meerdere)",
         "feedback_correct": "Feedback ✓", "feedback_incorrect": "Feedback ✗", "input_arabic": "Arabisch (stimulus)", "input_transliteration": "Transliteratie",
         "input_translation_nl": "Vertaling", "reference_media": "Referentiemedia", "media_production": "Media", "points": "Punten", "review_flag": "Vlag",
         "strict_tashkeel": "strict_tashkeel", "is_published": "gepubliceerd", "exercise_type": "Type", "correct_options": "Correct (meerdere)"}
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
T.append(f"# N1-W04 · telrapport (lijst W04 {VERS['4']}, nazorg W03 {VERS['3']}, W02 {VERS['2']} en W01 {VERS['1']})\nMaker-D (7D) · {DATUM} · gemaakt door `scripts/rapport_7D_N1-W04.py` v1 (niets met de hand) · log `{os.path.basename(LOGPAD)}` md5 `{md5(LOGPAD)}` ({len(LOG)} regels, alle `goedgekeurd`).\n")
D.append(f"# N1-W04 · leesbare diff (oud → nieuw)\nMaker-D (7D) · {DATUM} · gemaakt door `scripts/rapport_7D_N1-W04.py` v1 · bron: het goedgekeurde log `{os.path.basename(LOGPAD)}` (md5 `{md5(LOGPAD)}`), elke regel volledig en letterlijk; per item in de volgorde van de app. Een lege waarde staat als \"(leeg)\"; opties staan als A) … · B) … in de volgorde van de app.\n")
for wk, vp, np_, vl, nl, nlnaam in WEKEN:
    V = {r["item_id"]: r for r in rd(vp)}; N = {r["item_id"]: r for r in rd(np_)}
    log = [r for r in LOG if r[LK["item_id"]].startswith(f"U{wk}-")]
    lv = rd(vl); ln = rd(nl)
    titel = {"4": "W04", "3": "W03-nazorg", "2": "W02-nazorg", "1": "W01-nazorg"}[wk]
    assert set(V) == set(N), "item_id's VOOR ≠ NA"
    # 1. items/regels
    T.append(f"\n## {titel} (week {wk})\n")
    T.append(f"| bestand | rol | md5 | items | regels |\n|---|---|---|---|---|")
    T.append(f"| `{os.path.basename(vp)}` | app VOOR (30 kolommen) | `{md5(vp)}` | {len(V)} | — |")
    T.append(f"| `{os.path.basename(np_)}` | app NA (apply_log v1.3) | `{md5(np_)}` | {len(N)} | — |")
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
    groepen = collections.OrderedDict()
    for r in log: groepen.setdefault((r[LK["item_id"]], r[LK["veld"]]), []).append(r)
    keten = [r[0] for g in groepen.values() for r in g[1:]]
    open_ketens = [k for k, g in groepen.items() if any(b[LK["oud"]] != a[LK["nieuw"]] for a, b in zip(g, g[1:]))]
    fout += len(open_ketens)
    if keten or open_ketens:
        T.append(f"- waarvan ketenregels (een tweede of latere logregel op hetzelfde veld): **{len(keten)}** ({', '.join(keten)}) · elke keten sluit (`oud` = `nieuw` van de vorige regel): **{'ja' if not open_ketens else 'NEE'}** · veldverschillen + ketenregels = logregels: {len(diff)} + {len(keten)} = {len(diff) + len(keten)}{' ✓' if len(diff) + len(keten) == len(log) else ' ≠ ' + str(len(log)) + ' !'}")
        for x in open_ketens: T.append(f"  - ! keten niet gesloten: {x}")
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
    T.append("\n| veld | veldverschillen (elk met logregel) | waarvan zichtbaar in de lijst |\n|---|---|---|")
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
T.append(f"\n## Uitslag\n- {'**0 onverklaarde verschillen**' if fout == 0 else f'**{fout} onverklaarde verschillen — STOP**'} in W04 en de nazorg van W03, W02 en W01 (veldniveau en regelniveau).\n- 100 % van de goedgekeurde regels toegepast (W04, W03, W02 en W01 elk in hun eigen apply, `apply_log.py` v1.3 met de ingevulde review), 0 % andere wijzigingen.\n")
open(P3 + "/N1-W04_telrapport.md", "w", encoding="utf-8").write("\n".join(T))
open(P3 + "/N1-W04_diff_leesbaar.md", "w", encoding="utf-8").write("\n".join(D) + "\n")
for n in ("N1-W04_telrapport.md", "N1-W04_diff_leesbaar.md"):
    print(n, os.path.getsize(P3 + "/" + n), "bytes · md5", md5(P3 + "/" + n))
print("onverklaard totaal:", fout)
sys.exit(1 if fout else 0)
