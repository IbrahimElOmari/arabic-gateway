# rendertoets_N1-W11.py v1.3 (= rendertoets_N1-W10.py v1.2, md5 da62dc221b72c0219ba994a40b049aa0, + B48 en --aanvaard; «A1 · B1 · C1 · D1» van Ibra, P3 N1-W11, 2026-11-21 04:20)
#   (1) B48 (voorstel, A1): een Arabische zin met «: » tussen twee Arabische stukken (directe rede: سَأَلَ …: …؟ · قَالَتْ …: …) is één Arabische zin.
#       In een LTR-context (PLAT, de opties en APP) telt zo'n SAMEN-treffer niet meer voor de poort; hij staat als info-regel «B48» in de uitvoer, met
#       zijn eigen telling (niets verdwijnt stil). In een RTL-context (input_arabic) blijft hij een treffer.
#   (2) A1, «vóór P4 meet ik hoe de app die zinnen nu toont»: voor elk paar Arabische stukken met «: » ertussen in een APP-meting legt de toets vast
#       hoe het zichtbaar staat: EENHEID (het eerste stuk rechts = één RTL-zin, zoals een Arabische lezer leest) of GEKNIPT (isolateArabic() zet elk
#       stuk in een eigen <bdi>, het eerste stuk staat links: een Arabische lezer leest de zin achterstevoren). Alleen info (register W12), geen poort.
#   (3) --aanvaard <tsv> (B1 · C1 · D1, alleen voor deze week): de exacte treffers die Ibra aanvaardde (item_id, veld, wijze, soort, stukken) tellen
#       niet voor de poort; elk staat als regel «AANVAARD» in de uitvoer. Een nieuwe treffer die niet in de lijst staat, sluit de poort zoals vroeger.
#       Een lijstregel die niet meer gevonden wordt, staat als «AANVAARD-NIET-GEVONDEN» (info).
# rendertoets_N1-W10.py v1.2 (= v1.1 + uitzondering «، »-sleutel van meerdere-antwoorden, beslissing 6a P2 N1-W10; zie onderaan)
# v1.1 (v1.0.1 + uitzondering `seg|seg`-sleutel, zie onderaan) —Reviseur-T/Controleur-T (3T/8T) · N1-W04 · B27 met P1-15 (a) en 9T V3 (P1-18).
# Rendert elke leerders- en docenttekst van een app-export in Chromium (Playwright, headless) zoals de app hem toont, en meet per teken
# de x-positie (Range.getBoundingClientRect). Twee manieren (P1-15 a):
#   PLAT = de tekst als platte tekst (zoals vóór PR #2, en zoals het leerlingdossier en exports hem tonen) = het vangnet;
#   APP  = zoals CurriculumItemPage.tsx @ main hem toont:
#          · Opdracht, Vraag, vertaling, feedback en 'Juist antwoord' via isolateArabic() (maak_html_bdi.mjs haalt de hulp letterlijk uit de TSX);
#          · opties en tegels als platte tekst in een <Label>/<span> binnen de LTR-pagina (r. 380–450);
#          · input_arabic als platte tekst in <p dir="rtl"> (r. 585);
#          · bij gatentekst, rangschikken en koppelen met '|' in correct_answer: elk segment in <span dir="auto"> (PR #1, r. 680–690).
# Treffers (zoals check_bidi_render_N1-W02.py): SAMEN = twee Arabische stukken die logisch na elkaar staan en alleen door leestekens, cijfers of
# spaties gescheiden zijn, staan zichtbaar in de verkeerde volgorde (in een LTR-context: het eerste rechts; in een RTL-context: het eerste links);
# CIJFER = een cijfer dat logisch na een Arabisch stuk komt, staat zichtbaar aan de verkeerde kant ervan.
# Elke treffer krijgt 'leerder' of 'docent' (B24: open-tekst toont de leerder geen feedback en geen sleutel; B26: opname/upload toont de
# Feedback ✓ wel, de Feedback ✗ niet) en, met --log, of het veld door het wijzigingslog wordt geschreven (P1-15 a: dan moet PLAT ook 0 zijn).
# Gebruik: python3 -I rendertoets_N1-W04.py <repo> <app.tsv> [<app.tsv> …] [--log wijzigingslog.tsv] [--breedte 900] [--wrap]
import sys, csv, json, re, html, os, subprocess, tempfile, collections
from playwright.sync_api import sync_playwright
csv.field_size_limit(10**9)
argv = sys.argv[1:]
def opt(naam, std=None):
    if naam in argv:
        i = argv.index(naam); v = argv[i + 1]; del argv[i:i + 2]; return v
    return std
aanvaardpad = opt("--aanvaard"); logpad = opt("--log"); breedte = int(opt("--breedte", "900")); wrap = "--wrap" in argv
argv = [a for a in argv if a != "--wrap"]
repo, apps = argv[0], argv[1:]
AR = "".join(f"{chr(a)}-{chr(b)}" for a, b in [(0x600, 0x6FF), (0x750, 0x77F), (0xFB50, 0xFDFF), (0xFE70, 0xFEFF)])
TUSSEN = " " + chr(0xA0) + chr(0x60C) + chr(0x61B) + chr(0x61F)
STUK = re.compile(f"[{AR}]+(?:[{TUSSEN}]+[{AR}]+)*")
LATIJN = re.compile(r"[A-Za-zÀ-ÿĀ-ž]")
DUBBELPUNT = re.compile(r"\s*:\s*")   # v1.3 (1)(2): «: » tussen twee Arabische stukken
LTR6 = ["instruction_nl", "question", "feedback_correct", "feedback_incorrect", "input_translation_nl", "correct_answer"]
GESLOTEN = ("meerkeuze", "meerdere-antwoorden", "rangschikken", "koppelen", "gatentekst")
gewijzigd = set()
if logpad:
    for r in csv.DictReader(open(logpad, encoding="utf-8", newline=""), delimiter="\t"): gewijzigd.add((r["item_id"], r["veld"]))
def wie(r, veld):
    t = r["exercise_type"]
    if veld in ("instruction_nl", "question", "options", "input_arabic", "input_translation_nl"): return "leerder"
    if t in GESLOTEN: return "leerder"
    if t in ("audio-opname", "bestand-upload"): return "leerder" if veld == "feedback_correct" else "docent"
    return "docent"   # open-tekst: feedback en sleutel ziet alleen de docent (B24)
# metingen: (sleutel, tekst, context) — context: 'ltr-plat', 'ltr-app' (isolateArabic), 'rtl-plat', 'auto-seg'
metingen = []; meta = {}
for pad in apps:
    for r in csv.DictReader(open(pad, encoding="utf-8", newline=""), delimiter="\t"):
        if r.get("is_published") == "false": continue
        iid = r["item_id"]
        seg_type = r["exercise_type"] in ("gatentekst", "rangschikken", "koppelen") and "|" in r["correct_answer"]
        for v in LTR6:
            if not r[v]: continue
            meta[(iid, v)] = (wie(r, v), (iid, v) in gewijzigd)
            metingen.append(((iid, v, "PLAT"), r[v], "ltr-plat"))
            if v == "correct_answer" and seg_type:
                for k, s in enumerate(r[v].split("|"), 1): metingen.append(((iid, v, f"APP#{k}"), s, "auto-seg"))
            else:
                metingen.append(((iid, v, "APP"), r[v], "ltr-app"))
        try: opties = json.loads(r["options"] or "[]")
        except Exception: opties = []
        if opties:
            meta[(iid, "options")] = (wie(r, "options"), (iid, "options") in gewijzigd)
            for k, o in enumerate(opties, 1):
                metingen.append(((iid, "options", f"PLAT#{k}"), o, "ltr-plat")); metingen.append(((iid, "options", f"APP#{k}"), o, "ltr-plat"))
        if r["input_arabic"]:
            meta[(iid, "input_arabic")] = (wie(r, "input_arabic"), (iid, "input_arabic") in gewijzigd)
            metingen.append(((iid, "input_arabic", "PLAT"), r["input_arabic"], "rtl-plat")); metingen.append(((iid, "input_arabic", "APP"), r["input_arabic"], "rtl-plat"))
# HTML van isolateArabic (letterlijk uit de TSX van de checkout)
app_teksten = [[f"{k[0]}\t{k[1]}\t{k[2]}", t] for k, t, c in metingen if c == "ltr-app"]
with tempfile.TemporaryDirectory() as d:
    i_p, u_p = os.path.join(d, "in.json"), os.path.join(d, "uit.json")
    json.dump(app_teksten, open(i_p, "w", encoding="utf-8"), ensure_ascii=False)
    hier = os.path.dirname(os.path.abspath(__file__))   # v1.0.1: maak_html_bdi.mjs naast dit script (repo) of in ../deel3 (werkmap)
    mjs = next(p for p in (os.path.join(hier, "maak_html_bdi.mjs"), os.path.join(hier, "..", "deel3", "maak_html_bdi.mjs")) if os.path.exists(p))
    p_ = subprocess.run(["node", mjs, repo, i_p, u_p], capture_output=True, text=True)
    if p_.returncode != 0: print(p_.stdout, p_.stderr); sys.exit(2)
    print(p_.stdout.strip())
    app_html = {k: h for k, _, h in json.load(open(u_p, encoding="utf-8"))}
JS = """([h, dir]) => { const p = document.getElementById('t'); p.setAttribute('dir', dir); p.innerHTML = h;
  const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); const nodes = []; let n;
  while ((n = w.nextNode())) nodes.push(n);
  const xs = [];
  for (const nd of nodes) for (let i = 0; i < nd.data.length; i++) {
    const r = document.createRange(); r.setStart(nd, i); r.setEnd(nd, i + 1); const b = r.getBoundingClientRect();
    xs.push([b.left, b.right, b.top]); }
  return [nodes.map(x => x.data).join(''), xs]; }"""
def analyse(t, xs, rtl):
    st = [(m.start(), m.end()) for m in STUK.finditer(t)]
    def regels(a, b): return {round(xs[i][2]) for i in range(a, b) if xs[i][1] > xs[i][0]}
    def midden(a, b, op):
        v = [(xs[i][0] + xs[i][1]) / 2 for i in range(a, b) if xs[i][1] > xs[i][0] and round(xs[i][2]) == op]
        return sum(v) / len(v) if v else None
    def vergelijk(a1, b1, a2, b2):   # per regel: alleen de tekens op een regel die beide stukken delen
        g = regels(a1, b1) & regels(a2, b2)
        if not g: return None
        op = min(g); m1, m2 = midden(a1, b1, op), midden(a2, b2, op)
        return None if m1 is None or m2 is None else (m1, m2)
    fout = (lambda x1, x2: x1 < x2) if rtl else (lambda x1, x2: x1 > x2)
    tr = []; dr = []
    for (a1, b1), (a2, b2) in zip(st, st[1:]):
        if LATIJN.search(t[b1:a2]): continue
        r = vergelijk(a1, b1, a2, b2)
        if r and DUBBELPUNT.fullmatch(t[b1:a2]): dr.append(("EENHEID" if r[0] > r[1] else "GEKNIPT", t[a1:b1], t[b1:a2], t[a2:b2]))   # v1.3 (2): LTR-blik
        if r and fout(*r): tr.append(("SAMEN", t[a1:b1], t[b1:a2], t[a2:b2]))
    for m in re.finditer(r"\(?\d+\)?", t):
        vorige = [s for s in st if s[1] <= m.start()]
        if not vorige: continue
        a1, b1 = vorige[-1]
        if LATIJN.search(t[b1:m.start()]): continue
        r = vergelijk(a1, b1, m.start(), m.end())
        if r and fout(*r): tr.append(("CIJFER", t[a1:b1], t[b1:m.start()], m.group()))
    return tr, dr
treffers = []; integriteit = []; n_gemeten = 0; b48 = []; drapp = []
with sync_playwright() as pw:
    br = pw.chromium.launch(); pg = br.new_page()
    pg.set_content(f"<!doctype html><html dir='ltr' lang='nl'><body style='margin:0'><p id='t' style='width:{breedte}px;"
                   f"white-space:{'normal' if wrap else 'nowrap'};font:16px sans-serif'></p></body></html>")
    for (iid, v, wijze), t, ctx in metingen:
        if len(t.encode("utf-16-le")) // 2 != len(t): continue
        if ctx == "ltr-app": h, d = app_html[f"{iid}\t{v}\t{wijze}"], "ltr"
        elif ctx == "auto-seg": h, d = f'<span dir="auto">{html.escape(t)}</span>', "ltr"
        elif ctx == "rtl-plat": h, d = html.escape(t), "rtl"
        else: h, d = html.escape(t), "ltr"
        txt, xs = pg.evaluate(JS, [h, d]); n_gemeten += 1
        if txt != t: integriteit.append((iid, v, wijze))
        _tr, _dr = analyse(t, xs, d == "rtl"); wiew, gew = meta[(iid, v)]
        for soort, a, tus, b in _tr:
            rij = (iid, v, wijze.split("#")[0], soort, wiew, "gewijzigd" if gew else "ongewijzigd", f"«{a}» {tus!r} «{b}»")
            (b48 if soort == "SAMEN" and d == "ltr" and DUBBELPUNT.fullmatch(tus) else treffers).append(rij)   # v1.3 (1)
        if wijze.startswith("APP"):
            for stand, a, tus, b in _dr: drapp.append((iid, v, wijze.split("#")[0], ctx, stand, wiew, f"«{a}» {tus!r} «{b}»"))   # v1.3 (2)
    br.close()
print(f"breedte {breedte}px ({'regelafbreking, per regel' if wrap else 'één regel'}) · metingen {n_gemeten} · bestanden {len(apps)} · integriteit (DOM ≠ bron): {len(integriteit)}")
c = collections.Counter((w, s, g) for _, _, w, _, s, g, _ in treffers)
for wijze in ("APP", "PLAT"):
    print(f"{wijze}: " + " · ".join(f"{s}/{g} {c[(wijze, s, g)]}" for s in ("leerder", "docent") for g in ("gewijzigd", "ongewijzigd")))
poort_app = [t for t in treffers if t[2] == "APP" and t[4] == "leerder"]
# v1.1 (N1-W04, P2): de sleutel van rangschikken/gatentekst/koppelen is per definitie `seg|seg` (B3); de app toont elk segment apart (dir="auto", PR #1),
#   de platte sleutel in het leerlingdossier is informatie (sjabloon §13.5-3). Zulke PLAT-treffers in correct_answer tellen niet mee voor de poort.
SEGTYPE = {(r["item_id"]) for pad in apps for r in csv.DictReader(open(pad, encoding="utf-8", newline=""), delimiter="\t") if r["exercise_type"] in ("rangschikken", "gatentekst", "koppelen") and "|" in (r["correct_answer"] or "")}
plat_seg = [t for t in treffers if t[2] == "PLAT" and t[5] == "gewijzigd" and t[1] == "correct_answer" and t[0] in SEGTYPE]
# v1.2 (beslissing 6a van N1-W10, P2): de sleutel van `meerdere-antwoorden` moet volgens check-regel (c1) exact de juiste opties zijn, in
#   optievolgorde, aan elkaar met «، ». Staan daar twee of meer Arabische stukken in, dan is dat onvermijdelijk: Nederlands ertussen zetten zou
#   (c1) breken. De app toont de sleutel via isolateArabic() (APP-treffers blijven dus wél meetellen); de platte sleutel is informatie voor de
#   docent, en de ✓ van zo'n item noemt de juiste antwoorden nog één keer in de juiste volgorde (9D D9). Zulke PLAT-treffers in correct_answer
#   tellen niet mee voor de poort. Uitbreiding van B3/§13.5-3.
MATYPE = {r["item_id"] for pad in apps for r in csv.DictReader(open(pad, encoding="utf-8", newline=""), delimiter="\t") if r["exercise_type"] == "meerdere-antwoorden" and "\u060c" in (r["correct_answer"] or "")}
plat_ma = [t for t in treffers if t[2] == "PLAT" and t[5] == "gewijzigd" and t[1] == "correct_answer" and t[0] in MATYPE and t not in plat_seg]
poort_plat = [t for t in treffers if t[2] == "PLAT" and t[5] == "gewijzigd" and t not in plat_seg and t not in plat_ma]
# v1.3 (3): de exacte treffers die Ibra voor deze week aanvaardde (B1 · C1 · D1)
AANV = []
if aanvaardpad:
    for r in csv.DictReader(open(aanvaardpad, encoding="utf-8", newline=""), delimiter="\t"): AANV.append((r["item_id"], r["veld"], r["wijze"], r["soort"], r["stukken"]))
_sl = lambda t: (t[0], t[1], t[2], t[3], t[6])
aanv_app = [t for t in poort_app if _sl(t) in AANV]; aanv_plat = [t for t in poort_plat if _sl(t) in AANV]
_gevonden = {_sl(t) for t in treffers}; aanv_weg = [a for a in dict.fromkeys(AANV) if a not in _gevonden]
poort_app = [t for t in poort_app if t not in aanv_app]; poort_plat = [t for t in poort_plat if t not in aanv_plat]
b48_tel = collections.Counter((t[2], t[4], t[5]) for t in b48); dr_tel = collections.Counter((t[3], t[4]) for t in drapp)
print("B48 (v1.3, directe rede «: », telt niet voor de poort): " + " · ".join(f"{w}/{s_}/{g} {b48_tel[(w, s_, g)]}" for w in ("APP", "PLAT") for s_ in ("leerder", "docent") for g in ("gewijzigd", "ongewijzigd")))
print("APP-meting directe rede (v1.3, info, register W12): " + " · ".join(f"{c_} {st_} {dr_tel[(c_, st_)]}" for c_ in ("ltr-app", "ltr-plat") for st_ in ("EENHEID", "GEKNIPT")) + " (ltr-app = isolateArabic in Opdracht/Vraag/feedback/sleutel/vertaling; ltr-plat = de opties)")
print(f"aanvaard door Ibra (v1.3, --aanvaard, alleen deze week): APP {len(aanv_app)} · PLAT {len(aanv_plat)} · lijstregels {len(AANV)} · niet meer gevonden {len(aanv_weg)}")
print(f"POORT (P1-15 a): APP-treffers in leerdersvelden {len(poort_app)} · PLAT-treffers in velden die het log wijzigt {len(poort_plat)} · (info: PLAT in een `seg|seg`-sleutel {len(plat_seg)}, B3/§13.5-3; in een «، »-sleutel van meerdere-antwoorden {len(plat_ma)}, beslissing 6a van N1-W10)")
print("--- treffers (item · veld · wijze · soort · leerder/docent · gewijzigd/ongewijzigd · stukken)")
for t in treffers: print("\t".join(t) + ("\tAANVAARD" if t in aanv_app or t in aanv_plat else ""))
print("--- B48 (directe rede «: », info)")
for t in b48: print("\t".join(t))
print("--- APP-meting directe rede (item · veld · wijze · context · stand · leerder/docent · stukken)")
for t in drapp: print("\t".join(t))
for a in aanv_weg: print("AANVAARD-NIET-GEVONDEN\t" + "\t".join(a))
sys.exit(2 if (poort_app or poort_plat) and logpad else 0)
