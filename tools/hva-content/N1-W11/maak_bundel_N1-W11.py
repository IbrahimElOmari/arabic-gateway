#!/usr/bin/env python3
# maak_bundel_N1-W11.py v1.7 (= maak_bundel_N1-W10.py v1.6, md5 9d085ed2efbd241c6439941511003da9, voor W11) — Maker-T (7T) · P3 N1-W11: WK = N1-W11,
#   nazorgweek 10 in de SQL-root, de bronnen van stap 0 P3 (export 4d2cffa5…, app-ware master 7df0d60e…), het P2-poortrapport van groep 3 (8d669b1e…).
"""Bundel N1-W08 — v1.4 (7T, P3-delta-3 N1-W08; 9T DA-T-10, DA-T-12) = v1.3 (md5 8b0ba35f9a47661e40fa0bc34cc8aba8) met:
- DA-T-12: de afhankelijkheden van herbouw_master (app_export_week, app_naar_master, master_rest_uit_master, maak_master, de master f04cb6f3 in bron/, de voorspelde
  master per variant) en de bron van export_hash (bron/APP_EXPORT_N1_naP4_N1-W07.tsv) zijn ankers van de P4-bundel (en van de P3-bundel).
- DA-T-10: de zip mag niet in (of onder) de werkmap liggen, getoetst op het echte pad (realpath, niet alleen commonpath); en niet in een uitgepakte bundel of een andere
  werkmap (een map met MANIFEST_*_P4bundel.tsv, P4_VARIANT_*.md, p4/uitvoering/ of scripts/): het bundelmanifest naast de zip zou daar een bestaand manifest overschrijven.
Basis v1.3 (7T, P3-delta-2 N1-W08; 8T C-T11, C-T15) = v1.2 (md5 fcb6cea75f1b94ba561e1d2eea2831df) met:
- E1 (C-T11): een bestaand <uit.zip> wordt alleen vervangen als het een gewoon zipbestand met de naam *.zip is (geen map, geen link, geen ander bestand); anders STOP.
  De eigen tijdelijke map (tempfile.mkdtemp) blijft de enige map die maak_bundel wist.
- E5 (C-T15): `controleer` van een P4bundel aanvaardt het uitslagbestand van een blokvoorwaarde (p3/<code>/<CODE>_UITSLAG_<week>.md, bv. p3/r03/R03_UITSLAG_N1-W07.md)
  als «toegestaan extra» als de root van de bundel zo'n voorwaarde heeft: het mag vóór of na de controle in de bundelmap staan (geen valse STOP meer).
- scripts/p4_tekst_N1-W08.py (de vaste zinnen van Ibra; p4_log_stap v1.11 gebruikt het) is een anker van de P3- en P4-bundel.
Basis v1.2 = v1.1 (md5 9457f0777d226ff0243389a6f2198d01) met:
- D1: de P4bundel vraagt een verplichte variantkeuze `--variant zonder_W07n|met_W07n` (de standaard van P2-7a is zonder_W07n) en bevat dan alleen die ene SQL-root
  met zijn draaiboek, rooktest, manifest, master, export_hash en replica-/replayrapport; de bestanden van de andere variant staan in UITGESLOTEN (reden «andere
  variant»). `met_W07n` alleen met `--wijziging-7a "<Ibra's letterlijke wijziging van 7a in zijn P3-akkoord>"` (de tekst noemt 7a). De bundel krijgt
  P4_VARIANT_N1-W08.md (variant, root, P2-7a letterlijk, de wijziging). `controleer` eist voor een P4bundel precies één root en de ankers van die variant.
- D6 (C-T03 a): het manifest (en UITGESLOTEN) van een P3bundel of P4bundel blijft niet in de werkmap: het staat in de zip en als kopie naast de zip (die buiten de
  werkmap moet liggen), zodat een `start` in de werkmap nooit een bundelmanifest vindt. P1/P2/afsluiting ongewijzigd.
Basis v1.1: = v1.0 (P1bundel ongewijzigd: zelfde ankers) + de P3/P4-functies van maak_bundel_N1-W07.py v1.3.2
(md5 e45d65cb1588b7f5441b7c0e1b2546e2): uitsluitingen van de replica (pgdata, socket, testlogs en testmappen van G5, p4basis) in een eigen
UITGESLOTEN-lijst; sockets en symbolische links nooit in de zip; voor P3bundel en P4bundel de ankers van beide SQL-roots (met en zonder W07n),
het draaiboek per variant, de rooktest, het recept, de voorspelde masters en de exportbestanden; de lege werkmappen p4/uitvoering/ruw/ en
p4/export/ als mapregels; en de P4-loggrendel: in W08 hoort er GEEN P4-log in de werkmap (C10 is live, er is geen ministap in de weekchat) —
staat er wel een (bv. een testlog), dan geen bundel (exit 2). Content-vrij: het script bevat geen lesinhoud.

Gebruik:
  python3 -I maak_bundel_N1-W11.py maak <werkmap> <uit.zip> --naam P1bundel|P2bundel|P3bundel|afsluiting
  python3 -I maak_bundel_N1-W11.py maak <werkmap> <uit.zip buiten de werkmap> --naam P4bundel   (v1.5: één variant, --variant niet nodig)
  python3 -I maak_bundel_N1-W11.py controleer <uitgepakte map> --naam <naam> --manifest-md5 <md5 uit de OVERDRACHT>
Exit 0 = ✓, exit 2 = STOP (niets uitvoeren, Ibra).
"""
import hashlib, os, re, shutil, stat, sys, tempfile, zipfile

WK = "N1-W11"; NAZORG = {"p3/sql": (10,)}   # v1.7 (W11): één SQL-root, met de nazorg van N1-W10 (blok 12_W10n)
VARIANTEN = {"enkel": ("p3/sql", "")}   # v1.6: één variant (geen voorwaardelijk nazorgblok), dus één root zonder achtervoegsel
def var_ankers(v):   # de ankers van één variant
    r, x = VARIANTEN[v]
    return [f"{r}/BLOKKEN_MANIFEST.tsv"] + [f"{r}/{y}/SQL_MANIFEST.tsv" for y in [WK] + [f"N1-W{w:02d}" for w in NAZORG[r]]] + [
            f"{r}/slot_verwacht_{WK}.json", f"{r}/VERWACHT_PER_STAP.md", f"{r}/rooktest_verwacht_{WK}.tsv", f"{r}/rooktest_{WK}.sql", f"{r}/rooktest_start_{WK}.sql",
            f"p3/P4_DRAAIBOEK_{WK}{x}.md", f"p3/ROOKTEST_{WK}{x}.md", f"p3/master{x}/VOORSPELDE_MD5.txt", f"p3/master{x}/n1_voorspeld.tsv", f"p3/master{x}/LEESBARE_LIJST_MASTER_voorspeld.tsv", f"p3/export_hash_N1_naP4{x}.sql",
            f"p3/replica/REPLICA_RAPPORT_{WK}{x}.md"]
def var_weg(v):   # v1.6: er is geen andere variant → niets uit te sluiten
    return []
GEMEEN = [f"scripts/p4_stap_{WK}.py", f"scripts/p4_log_stap_{WK}.py", f"scripts/p4_tekst_{WK}.py", f"scripts/p4_status_{WK}.py", f"scripts/herbouw_master_{WK}.py", f"scripts/export_hash_{WK}.py", f"scripts/maak_bundel_{WK}.py",
          f"p3/RECEPT_MAKER-T_blok_{WK}.md", "p3/export_N1_naP4.sql",
          "scripts/app_export_week.py", "scripts/app_naar_master.py", "scripts/master_rest_uit_master.py", "scripts/maak_master.py",   # v1.4 (9T DA-T-12): wat herbouw_master aanroept
          "bron/LEESBARE_LIJST_MASTER_appwaar_2026-11-21.tsv", "bron/APP_EXPORT_N1_2026-11-21.tsv"]   # v1.7: de master van herbouw_master en de bron van export_hash (stap 0 P3)
P34 = GEMEEN + var_ankers("enkel")   # v1.6: één variant
ANKERS = {
    "P1bundel": [f"bron/APP_EXPORT_{WK}_2026-11-21.tsv", f"bron/APP_BACKUP_{WK}_2026-11-21.tsv",
                 f"p1/P1_poortrapport_{WK}.md", f"p2/P1_besluit_{WK}.md",
                 f"p1/P1_tegenrapport_D_{WK}.md", f"p1/P1_tegenrapport_T_{WK}.md",
                 f"p1/{WK}_onderzoek_D.md", f"p1/{WK}_onderzoek_T.md",
                 f"scripts/check_{WK}.py", f"scripts/maak_bundel_{WK}.py"],   # v1.6: de bestanden van een P1-bundel (W11 heeft geen eigen P1-bundel: groepen 1–3)
    "P3bundel": P34, "P4bundel": None,   # v1.2: P4bundel = GEMEEN + var_ankers(<variant>)
}
NAMEN = ["P1bundel", "P2bundel", "P3bundel", "P4bundel", "afsluiting"]
UITSLUITEN = [   # (voorvoegsel of exact pad, reden) — alleen voor P3bundel en P4bundel (v1.1)
    ("p3/replica/pgdata/", "werkdatabank van de replica (reproduceerbaar)"), ("p3/replica/sock/", "socket van de replica"),
    ("p3/replica/pg.log", "serverlog van de replica"), ("p3/replica/g5_", "testlogs en testmappen van G5 (reproduceerbaar)"),
    ("p3/replica/p4basis/", "werkmap van de replica (reproduceerbaar)")]
LEGE_MAPPEN = ["p4/uitvoering/ruw/", "p4/export/"]


def md5(p):
    h = hashlib.md5()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def overslaan(rel):
    return rel.endswith(".lock") or "/__pycache__/" in rel or rel.endswith(".pyc") or rel.startswith(f"MANIFEST_{WK}_") or rel.startswith(f"UITGESLOTEN_{WK}_")


def reden(rel, naam, variant=None):
    if naam not in ("P3bundel", "P4bundel"): return None
    for pre, r in UITSLUITEN:
        if rel == pre or rel.startswith(pre): return r
    if naam == "P4bundel":   # v1.2 (D1): de andere variant blijft in p3, niet in de P4bundel
        for pre in var_weg(variant):
            if rel == pre or (pre.endswith("/") and rel.startswith(pre)): return f"andere variant (P2-7a; P4bundel --variant {variant})"
    return None
def ankers(naam, variant=None):
    return GEMEEN + var_ankers(variant) if naam == "P4bundel" else ANKERS.get(naam, [])


def lijst(wm, naam, variant=None):
    mee, weg = [], []
    for root, dirs, files in os.walk(wm):
        dirs.sort()
        for fn in sorted(files):
            p = os.path.join(root, fn); rel = os.path.relpath(p, wm).replace(os.sep, "/")
            if overslaan(rel): continue
            if os.path.islink(p):
                if naam in ("P3bundel", "P4bundel"): weg.append((rel, 0, "", "symbolische link")); continue
                sys.exit(f"STOP: symbolische link {rel}")
            if not stat.S_ISREG(os.stat(p).st_mode): weg.append((rel, 0, "", "geen gewoon bestand (socket)")); continue
            r = reden(rel, naam, variant)
            (weg if r else mee).append((rel, os.path.getsize(p), md5(p), r))
    return mee, weg


def p4log_toets(wm):   # v1.1: er hoort geen P4-log in de werkmap van een P3- of P4-bundel (deze week heeft geen ministap)
    u = os.path.join(wm, "p4/uitvoering")
    if not os.path.isdir(u): return None
    logs = [f for f in os.listdir(u) if f.startswith("P4_log") and f.endswith(".tsv")]
    return f"P4-log in de werkmap ({', '.join(logs)}): een testlog of een oud P4-log hoort niet in een bundel van {WK}" if logs else None


def poortrapport_md5(wm):   # v1.7 (W11): het P2-poortrapport van groep 3 (de laatste P2 van de week) in zijn geheel, md5-gebonden
    p_ = os.path.join(wm, f"p2/P2_poortrapport_{WK}-groep3.md")
    m_ = md5(p_); assert m_ == "8d669b1e0de30141bd2e6786616376b4", f"het P2-poortrapport is niet meer de goedgekeurde tekst ({m_})"
    return m_


def maak(wm, zp, naam, variant=None, wijziging=None):
    if naam in ("P3bundel", "P4bundel"):
        r_ = p4log_toets(wm)
        if r_: print(f"✗ STOP · {r_} → geen bundel gemaakt"); return 2
        _wr, _zr = os.path.realpath(wm), os.path.realpath(os.path.dirname(os.path.abspath(zp)))   # v1.4 (9T DA-T-10): het echte pad, niet alleen de tekst
        if os.path.commonpath([_wr, _zr]) == _wr: print(f"✗ STOP · de zip hoort buiten de werkmap (het bundelmanifest komt naast de zip, nooit in de werkmap; 8T C-T03, 9T DA-T-10) → geen bundel gemaakt"); return 2
        _bm = [x for x in (f"MANIFEST_{WK}_P4bundel.tsv", f"MANIFEST_{WK}_P3bundel.tsv", f"P4_VARIANT_{WK}.md", "p4/uitvoering", "scripts") if os.path.lexists(os.path.join(_zr, x))]
        if _bm: print(f"✗ STOP · de map van de zip ({_zr}) is een uitgepakte bundel of een werkmap ({', '.join(_bm)}): het bundelmanifest naast de zip zou daar iets overschrijven (9T DA-T-10) → kies een lege map buiten de werkmap en buiten /home/claude/P4_{WK}; geen bundel gemaakt"); return 2
    if naam == "P4bundel":
        variant = variant or "enkel"   # v1.6: één variant, --variant is niet nodig
        if variant not in VARIANTEN: print(f"✗ STOP · P4bundel vraagt --variant {' of '.join(VARIANTEN)} → geen bundel gemaakt"); return 2
        if wijziging and not re.search(r"\b7a\b", wijziging): print(f"✗ STOP · --wijziging-7a \"<Ibra's letterlijke wijziging van 7a in zijn P3-akkoord>\" (P2-7a; 8D C-D01) → geen bundel gemaakt"); return 2
    elif variant or wijziging: print("✗ STOP · --variant en --wijziging-7a horen alleen bij de P4bundel"); return 2
    mee, weg = lijst(wm, naam, variant); rels = [m[0] for m in mee]
    for a in ankers(naam, variant):
        if a not in rels:
            print(f"STOP: anker ontbreekt: {a}"); return 2
    mf, ug, vb = f"MANIFEST_{WK}_{naam}.tsv", f"UITGESLOTEN_{WK}_{naam}.tsv", f"P4_VARIANT_{WK}.md"
    apart = naam in ("P3bundel", "P4bundel")   # v1.2 (D6): manifest en UITGESLOTEN in een tijdelijke map, niet in de werkmap
    md_ = tempfile.mkdtemp() if apart else wm
    extra = []
    if naam == "P4bundel":
        root, x = VARIANTEN[variant]   # v1.6: de enige root
        tekst = (f"# P4-bundel {WK} · één variant\n\nGemaakt door `scripts/maak_bundel_{WK}.py` v1.7. SQL-root `{root}`, draaiboek `p3/P4_DRAAIBOEK_{WK}.md`, rooktest `p3/ROOKTEST_{WK}.md`, master `p3/master/`.\n\n"
                 f"Deze week heeft geen voorwaardelijk nazorgblok en geen tweede variant: de bundel bevat de dertien updateblokken `1_L1` … `11_C1` van {WK}, `12_W10n` (de nazorg van N1-W10, B43) en `13_V_W11` (B30).\n\n"
                 f"P2-poortrapport (md5-gebonden): `{poortrapport_md5(wm)}`\n"
                 + (f"Wijziging door Ibra in zijn P3-akkoord (letterlijk): «{wijziging}»\n" if wijziging else ""))
        open(os.path.join(md_, vb), "w", encoding="utf-8", newline="\n").write(tekst); extra = [(vb, os.path.getsize(os.path.join(md_, vb)), md5(os.path.join(md_, vb)))]
    with open(os.path.join(md_, mf), "w", encoding="utf-8", newline="\n") as f:
        f.write("pad\tbytes\tmd5\n"); f.writelines(f"{r}\t{n}\t{m}\n" for r, n, m, _ in mee); f.writelines(f"{r}\t{n}\t{m}\n" for r, n, m in extra)
    if weg:
        with open(os.path.join(md_, ug), "w", encoding="utf-8", newline="\n") as f:
            f.write("pad\tbytes\tmd5\treden\n"); f.writelines(f"{r}\t{n}\t{m}\t{x_}\n" for r, n, m, x_ in weg)
    if os.path.lexists(zp):   # v1.3 (E1, C-T11): alleen een eigen, vorig zipbestand vervangen
        if not (zp.endswith(".zip") and os.path.isfile(zp) and not os.path.islink(zp) and zipfile.is_zipfile(zp)): print(f"✗ STOP · {zp} bestaat en is geen zipbestand (*.zip): niets gewist, geen bundel gemaakt"); return 2
        os.remove(zp)
    with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for r in rels: z.write(os.path.join(wm, r), r)
        for r in [mf] + ([ug] if weg else []) + [e[0] for e in extra]: z.write(os.path.join(md_, r), r)
        if naam in ("P3bundel", "P4bundel"):
            for m in LEGE_MAPPEN:
                zi = zipfile.ZipInfo(m); zi.external_attr = (0o40755 << 16) | 0x10; z.writestr(zi, "")
    mmd5 = md5(os.path.join(md_, mf))
    with tempfile.TemporaryDirectory() as d:
        with zipfile.ZipFile(zp) as z:
            z.extractall(d)
        rc = controleer(d, naam, mmd5, stil=True)
    if apart:   # de kopie van het manifest naast de zip (voor de OVERDRACHT), daarna de tijdelijke map weg
        for r in [mf] + ([ug] if weg else []): shutil.copy(os.path.join(md_, r), os.path.join(os.path.dirname(zp), r))
        shutil.rmtree(md_)
    print(f"bundel {zp}: {len(rels) + len(extra)} bestanden + manifest" + (f" · variant {variant}" if variant else "") + f" · uitgesloten {len(weg)} · zip {os.path.getsize(zp)} B · md5 {md5(zp)} · manifest-md5 {mmd5} · controle exit {rc}")
    return rc


def controleer(d, naam, verwacht, stil=False):
    mf = os.path.join(d, f"MANIFEST_{WK}_{naam}.tsv")
    if not os.path.isfile(mf):
        print("STOP: manifest ontbreekt"); return 2
    if md5(mf) != verwacht:
        print(f"STOP: manifest-md5 {md5(mf)} ≠ {verwacht}"); return 2
    rijen = [l.rstrip("\n").split("\t") for l in open(mf, encoding="utf-8")][1:]
    fout = 0; pads = set()
    for pad, n, m in rijen:
        pads.add(pad); p = os.path.join(d, pad)
        if not os.path.isfile(p) or os.path.getsize(p) != int(n) or md5(p) != m:
            print(f"FOUT: {pad}"); fout += 1
    var = None
    if naam == "P4bundel":   # v1.2 (D1): precies één SQL-root in de P4bundel
        roots = [v for v, (r, _) in VARIANTEN.items() if f"{r}/BLOKKEN_MANIFEST.tsv" in pads]
        if len(roots) != 1:
            print(f"STOP: een P4bundel hoort precies één SQL-root te bevatten (gevonden: {', '.join(roots) or 'geen'})"); return 2
        var = roots[0]
        for v_ in (pre for pre in var_weg(var)):
            if any(p_ == v_ or (v_.endswith("/") and p_.startswith(v_)) for p_ in pads): print(f"STOP: bestand van de andere variant in de P4bundel: {v_}"); return 2
    _mee, _weg = lijst(d, naam, var)
    teveel = [r for r in _mee if r[0] not in pads] + [r for r in _weg if (r[3] or "").startswith("andere variant")]   # v1.2: een bestand van de andere variant = te veel
    if var:   # v1.3 (E5, C-T15): het uitslagbestand van een blokvoorwaarde mag vóór of na de controle in de bundelmap staan
        _r = VARIANTEN[var][0]; _ex = set()
        for l in list(open(os.path.join(d, _r, "BLOKKEN_MANIFEST.tsv"), encoding="utf-8"))[1:]:
            c_ = l.rstrip("\n").split("\t"); vw = os.path.join(d, _r, c_[3], "verwacht.txt")
            hs = next((x.rstrip("\n").split("\t", 1)[1] for x in open(vw, encoding="utf-8") if x.startswith("voorwaarde\t")), None) if os.path.isfile(vw) else None
            if hs: k_ = hs.split("_")[0]; _ex.add(f"p3/{k_}/{k_.upper()}_UITSLAG_{c_[1]}.md")
        for r in [r for r in teveel if r[0] in _ex]: print(f"TOEGESTAAN EXTRA (uitslagbestand van een blokvoorwaarde, 8T C-T15): {r[0]}")
        teveel = [r for r in teveel if r[0] not in _ex]
    for r in teveel:
        print(f"TE VEEL: {r[0]}")
    ank = [a for a in ankers(naam, var) if a not in pads]
    for a in ank:
        print(f"ANKER ONTBREEKT: {a}")
    mappen = [m for m in LEGE_MAPPEN if naam in ("P3bundel", "P4bundel") and not os.path.isdir(os.path.join(d, m))]
    for m in mappen:
        print(f"MAP ONTBREEKT: {m}")
    rc = 0 if fout == 0 and not teveel and not ank and not mappen else 2
    if not stil or rc:
        print(f"controleer {naam}" + (f" (variant {var})" if var else "") + f": {len(rijen)} bestanden, {fout} fout, {len(teveel)} te veel, ankers {len(ankers(naam, var)) - len(ank)}/{len(ankers(naam, var))} · exit {rc}")
    return rc


if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) >= 3 and a[0] == "maak" and "--naam" in a:
        naam = a[a.index("--naam") + 1]
        if naam not in NAMEN:
            sys.exit(2)
        _o = lambda k: a[a.index(k) + 1] if k in a and a.index(k) + 1 < len(a) else None
        sys.exit(maak(os.path.abspath(a[1]), os.path.abspath(a[2]), naam, _o("--variant"), _o("--wijziging-7a")))
    if len(a) >= 2 and a[0] == "controleer" and "--naam" in a and "--manifest-md5" in a:
        i = a.index("--manifest-md5")
        if i + 1 >= len(a) or not re.fullmatch(r"[0-9a-f]{32}", a[i + 1]):
            print("✗ STOP · controleer vraagt --manifest-md5 <md5 uit de OVERDRACHT>"); sys.exit(2)
        sys.exit(controleer(os.path.abspath(a[1]), a[a.index("--naam") + 1], a[i + 1]))
    print(__doc__); sys.exit(2)
