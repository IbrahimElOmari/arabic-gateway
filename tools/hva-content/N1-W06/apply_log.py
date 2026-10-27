# apply_log.py v1.4.1 — Verbeteraar-T (4T) · past ALLEEN logregels met status=goedgekeurd (of aangepast, met de tekst uit besluit_ibra)
# toe op een app-export (30 kolommen, zoals APP_EXPORT_{week}_{datum}.tsv) en weigert te draaien als `oud` niet letterlijk
# overeenkomt met de huidige waarde (kettingregels op hetzelfde veld worden in logvolgorde toegepast).
# Gebruik: python3 -I apply_log.py <app_export.tsv> <wijzigingslog.tsv> <uitvoer.tsv> [--apply] [--week 2] [--review review_native.tsv] [--stil]
# B11/C4: een goedgekeurde regel waarvan het Arabisch verandert (of input_transliteration) wordt alleen toegepast als de
# native-review voor dat wijziging_id akkoord=ja heeft; zonder --review worden zulke regels geweigerd.
# Zonder --apply: droogloop (geen uitvoerbestand), toont exact welke regels zouden wijzigen. Exitcode 2 bij weigering.
# Conventie: in het log staat een regeleinde in een veld als de twee tekens \n (backslash + n); hier wordt dat teruggezet.
# v1.1 (N1-W02, P1-beslissing 16 = techplan T14/T16, 2026-10-19) — drie aanvullingen op v1.0 (W01/W11):
#   1. veld-whitelist: alleen de velden die maak_sql schrijft (TXT + JSB + NUM + BOOL); een regel op een ander veld
#      (exercise_type, exercise_subtype, media_url, media_alt, audio_url, image_url …) wordt geweigerd i.p.v. stil te verdwijnen;
#   2. --week N: logregels van een andere week (item_id U{w}-…) worden overgeslagen en geteld ("andere week"), niet geweigerd,
#      zodat één weeklog met de W01-nazorg in twee aparte applies kan (--week 2 en --week 1);
#   3. review: staat een wijziging_id in de review (ook een bevestiging of een afgeleide vlagregel), dan is akkoord=ja verplicht;
#      de STOP-melding noemt per oorzaak het aantal (v1.0 noemde bij een ontbrekende review de verkeerde oorzaak).
# v1.2 (tegenrapport T P2, voorwaarde V2): de review bindt de INHOUD, niet alleen het id: bij een wijzigingsregel (zelfde veld in
#   de review, niet afgeleid) moet `nieuw` byte-gelijk zijn aan `voorgesteld` (status goedgekeurd), of `besluit_ibra` aan de
#   'Ibra-tekst' van een review met akkoord=aangepast (status aangepast); aangepast zonder tekst, een onbekende status
#   (ook 'goedgekeurd ' met een spatie) of 0 toegepaste regels met --apply = geweigerd/exit 2; --week vergelijkt als getal.
# v1.3 (N1-W03, P1-18 = 9T V1, 2026-10-23): `exercise_type` mag (enum public.curriculum_exercise_type, stand 2026-10-23:
#   meerkeuze|meerdere-antwoorden|open-tekst|gatentekst|bestand-upload|audio-opname|rangschikken|koppelen); een waarde buiten de
#   enum = geweigerd. maak_sql v4.4 schrijft het veld met een enumcast. Verder ongewijzigd t.o.v. v1.2.
# v1.4 (N1-W06, P1-besluit 3a/7/22 = techplan T6 met 9T V2–V7, 2026-10-27) — vier aanvullingen op v1.3:
#   1. nieuwe rij: logregel met veld `(rij)`, oud = «(nieuw)», nieuw = JSON {unit_code, week, skill, exercise_type, display_order,
#      is_published, na}. Geweigerd als: het item_id al bestaat in de HELE export (vóór het weekfilter) of al gemaakt is; is_published
#      ≠ "false"; week ≠ het nummer in het item_id of ≠ --week; unit_code ≠ U{week}; `na` niet bestaat; skill, unit of display_order
#      ≠ die van `na` (geen renummering, P1-16); meer dan 9 nieuwe rijen met dezelfde display_order (P1-3a); exercise_type buiten de enum.
#      De rij krijgt de databankdefaults (stand 2026-10-27: tekst '' · options/media_production '[]' · correct_options NULL = '' ·
#      points 1 · strict_tashkeel false · exercise_subtype ''); id/created_at/updated_at blijven leeg (de databank vult ze bij de insert).
#      Daarna gewone veldregels met `oud` = de default; de laatste regel zet is_published false → true. In de uitvoer staat de rij
#      direct na `na`. Een veldregel op een nog niet gemaakte rij = geweigerd ("item").
#   2. koppelen (P1-7, B25-aanvulling): na alle regels moet elk geraakt koppelen-item `options` = de linkerkanten van de sleutel
#      `L=R|L=R` hebben, byte-gelijk en in dezelfde volgorde, met elk paar `L=R`, zonder dubbele linker- of rechterkant; zonder strict
#      mogen twee kanten niet samenvallen na het weghalen van de tashkīl (zoals de app vergelijkt, zonder NFC). Anders STOP.
#   3. NFC: `nieuw` (of de tekst van besluit_ibra) moet NFC zijn; anders geweigerd. `oud` blijft letterlijk (ook niet-NFC) vergeleken.
#   4. telling: bestaande rijen geraakt, nieuwe rijen, en het totaal vóór → na; met --apply ook de nieuwe rijen per display_order.
# v1.4.1 (N1-W06, tegenrapport T P2: F2, F3, F8, 2026-10-27):
#   5. een nieuwe rij is alles-of-niets: is de `(rij)` toegepast, dan moet elke logregel van dat item (in deze week) toegepast zijn; een
#      afgewezen, voorgestelde of geweigerde regel van zo'n item = STOP ("rij");
#   6. reeks-controle: een macro-rij met nieuwe subitems in het log moet na de apply óf gepubliceerd zijn zonder één gepubliceerd subitem,
#      óf gedepubliceerd met álle subitems uit het log gemaakt en gepubliceerd; anders STOP ("reeks") — nooit een halve reeks, nooit
#      macro-rij en subitems tegelijk zichtbaar, nooit een reeks die verdwijnt;
#   7. het item_id van een nieuwe rij is `<na-keten-wortel>-k` met k = 1 … 9 (geen `-10`), en de vaardigheid in het item_id = `skill`;
#      twee nieuwe rijen met dezelfde `na` = geweigerd (geen AssertionError meer);
#   8. koppelen: elk paar heeft precies één `=` (de app knipt bij elke `=`);
#   9. review: een wijziging van `correct_answer` of `options` met Arabisch vraagt een reviewregel, ook als dezelfde woorden alleen anders
#      gekoppeld of geordend zijn (behalve een zuivere NFC-wijziging); ook een `afgeleid`e reviewregel bindt de inhoud (behalve `review_flag`).
import sys, csv, hashlib, collections, re, unicodedata, json
csv.field_size_limit(10**9)
skip = set()
for flag in ("--week", "--review"):
    if flag in sys.argv: skip.add(sys.argv.index(flag) + 1)
args = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith("--") and i not in skip]
apply = "--apply" in sys.argv
week = sys.argv[sys.argv.index("--week") + 1] if "--week" in sys.argv else None
reviewpad = sys.argv[sys.argv.index("--review") + 1] if "--review" in sys.argv else None
AR = re.compile(r"[؀-ۿٰ]+")
def ar_tokens(s): return sorted(unicodedata.normalize("NFC", w.strip("،؛؟!.:")) for w in AR.findall(s) if w.strip("،؛؟!.:"))
TXT = ["instruction_nl","question","correct_answer","feedback_correct","feedback_incorrect","input_arabic","input_transliteration","input_translation_nl","reference_media","review_flag"]
JSB = ["options","correct_options","media_production"]; NUM = ["points"]; BOOL = ["is_published","strict_tashkeel"]
ENUM = ["exercise_type"]
ENUM_WAARDEN = {"exercise_type": ("meerkeuze", "meerdere-antwoorden", "open-tekst", "gatentekst", "bestand-upload", "audio-opname", "rangschikken", "koppelen")}
SCHRIJFBAAR = set(TXT + JSB + NUM + BOOL + ENUM)   # = KOL van maak_sql v4.4
TASH = re.compile(r"[ـً-ْٰ]")   # = stripTashkeel in CurriculumItemPage.tsx @ e7317258
def app_cmp(x, strict): return re.sub(r"\s+", " ", (x if strict else TASH.sub("", x)).strip().lower())
SPEC_SLEUTELS = {"unit_code", "week", "skill", "exercise_type", "display_order", "is_published", "na"}
MAX_PER_REEKS = 9
review, revrij = {}, {}
if reviewpad:
    rv = [l.rstrip("\n").split("\t") for l in open(reviewpad, encoding="utf-8")]
    rk = {c: i for i, c in enumerate(rv[0])}
    for r in rv[1:]:
        wid = r[rk["wijziging_id"]]
        assert wid not in review, f"wijziging_id {wid} staat twee keer in de review"
        review[wid] = r[rk["akkoord"]].strip().lower()
        revrij[wid] = {c: r[i] for c, i in rk.items()}
def ibra_tekst(wid):
    o = revrij.get(wid, {}).get("opmerking", "")
    return o.split("Ibra-tekst: ", 1)[1] if "Ibra-tekst: " in o else None
exp, logpad, uit = args[0], args[1], args[2]
def unesc(s): return s.replace("\\n", "\n")
alle_rijen = list(csv.DictReader(open(exp, encoding="utf-8", newline=""), delimiter="\t"))
cols = list(alle_rijen[0].keys())
alle_ids = {r["item_id"] for r in alle_rijen}
assert len(alle_ids) == len(alle_rijen), "dubbele item_id in de export"
rows = [r for r in alle_rijen if int(r["week"]) == int(week)] if week else alle_rijen
by_id = {r["item_id"]: r for r in rows}
DEFAULT = {c: "" for c in cols}
DEFAULT.update({"options": "[]", "media_production": "[]", "points": "1", "strict_tashkeel": "false", "is_published": "false"})
log = [l.rstrip("\n").split("\t") for l in open(logpad, encoding="utf-8")]
kop, log = log[0], log[1:]
K = {c: i for i, c in enumerate(kop)}
VAST = {"item_id", "unit_code", "week", "skill", "display_order", "id", "created_at", "updated_at"}
toegepast, overgeslagen, geweigerd, andere_week = [], [], [], []
werk = {iid: dict(r) for iid, r in by_id.items()}
nieuw_na = collections.OrderedDict()     # nieuw item_id -> na
for r in log:
    wid, iid, veld, status = r[K["wijziging_id"]], r[K["item_id"]], r[K["veld"]], r[K["status"]]
    m = re.match(r"U(\d+)-", iid)
    if week and m and int(m.group(1)) != int(week): andere_week.append(wid); continue
    if status not in ("voorgesteld", "goedgekeurd", "afgewezen", "aangepast"): geweigerd.append((wid, "status", f"onbekende status {status!r}")); continue
    if status == "goedgekeurd": nieuw = unesc(r[K["nieuw"]])
    elif status == "aangepast":
        nieuw = unesc(r[K["besluit_ibra"]])
        if not nieuw.strip(): geweigerd.append((wid, "status", "aangepast zonder tekst in besluit_ibra")); continue
    else: overgeslagen.append((wid, status)); continue
    oud = unesc(r[K["oud"]])
    if not unicodedata.is_normalized("NFC", nieuw): geweigerd.append((wid, "nfc", "nieuw is niet in NFC")); continue
    if veld == "(rij)":                                                          # v1.4: nieuwe rij
        if status != "goedgekeurd": geweigerd.append((wid, "rij", "een nieuwe rij kan alleen 'goedgekeurd' zijn")); continue
        if oud != "(nieuw)": geweigerd.append((wid, "rij", f"oud moet «(nieuw)» zijn, niet {oud[:30]!r}")); continue
        if iid in alle_ids or iid in werk: geweigerd.append((wid, "rij", f"item_id {iid} bestaat al")); continue
        try: spec = json.loads(nieuw)
        except ValueError: geweigerd.append((wid, "rij", "nieuw is geen JSON")); continue
        if not isinstance(spec, dict) or set(spec) != SPEC_SLEUTELS: geweigerd.append((wid, "rij", f"sleutels {sorted(spec) if isinstance(spec, dict) else spec!r} ≠ {sorted(SPEC_SLEUTELS)}")); continue
        if spec["is_published"] != "false": geweigerd.append((wid, "rij", "een nieuwe rij begint met is_published = false (P1-3a)")); continue
        if not m or str(spec["week"]) != m.group(1) or (week and int(spec["week"]) != int(week)): geweigerd.append((wid, "rij", "week past niet bij het item_id of --week")); continue
        if spec["unit_code"] != f"U{spec['week']}": geweigerd.append((wid, "rij", "unit_code ≠ U{week}")); continue
        if spec["exercise_type"] not in ENUM_WAARDEN["exercise_type"]: geweigerd.append((wid, "rij", "exercise_type buiten de enum")); continue
        na = spec["na"]
        if na not in werk: geweigerd.append((wid, "rij", f"na = {na} bestaat niet")); continue
        if na in nieuw_na.values(): geweigerd.append((wid, "rij", f"er staat al een nieuwe rij na {na}")); continue
        wortel = na
        while wortel in nieuw_na: wortel = nieuw_na[wortel]
        if not re.fullmatch(re.escape(wortel) + r"-[1-9]", iid): geweigerd.append((wid, "rij", f"item_id {iid} ≠ {wortel}-k met k = 1 … 9")); continue
        if iid.split("-")[1] != spec["skill"]: geweigerd.append((wid, "rij", f"de vaardigheid in {iid} ≠ skill {spec['skill']}")); continue
        if (werk[na]["skill"], werk[na]["unit_code"], werk[na]["display_order"]) != (spec["skill"], spec["unit_code"], str(spec["display_order"])):
            geweigerd.append((wid, "rij", "skill, unit of display_order ≠ die van na (geen renummering, P1-16)")); continue
        if sum(1 for j in nieuw_na if werk[j]["display_order"] == str(spec["display_order"])) >= MAX_PER_REEKS:
            geweigerd.append((wid, "rij", f"meer dan {MAX_PER_REEKS} nieuwe rijen met display_order {spec['display_order']}")); continue
        if wid in review and review.get(wid) != "ja": geweigerd.append((wid, "review", "review ≠ ja")); continue
        rij = dict(DEFAULT); rij.update({k: str(v) for k, v in spec.items() if k != "na"}); rij["item_id"] = iid
        werk[iid] = rij; nieuw_na[iid] = na
        toegepast.append((wid, iid, veld, oud, nieuw)); continue
    if iid not in werk: geweigerd.append((wid, "item", f"item {iid} niet in de export (en niet eerder als nieuwe rij gemaakt)")); continue
    if veld not in cols or veld in VAST: geweigerd.append((wid, "veld", f"veld {veld} niet toegestaan")); continue
    if veld not in SCHRIJFBAAR: geweigerd.append((wid, "veld", f"veld {veld} wordt door maak_sql niet geschreven (v1.1-whitelist)")); continue
    if veld in ENUM and nieuw not in ENUM_WAARDEN[veld]: geweigerd.append((wid, "veld", f"{veld} = {nieuw!r} staat niet in de enum")); continue
    arabisch_gewijzigd = (ar_tokens(nieuw) and ar_tokens(nieuw) != ar_tokens(oud)) or (veld == "input_transliteration" and nieuw != oud and nieuw != "") \
        or (veld in ("correct_answer", "options") and ar_tokens(nieuw) and nieuw != unicodedata.normalize("NFC", oud))   # v1.4.1 (9)
    verwacht = "aangepast" if status == "aangepast" else "ja"
    if (arabisch_gewijzigd or wid in review) and review.get(wid) != verwacht:
        oorzaak = "geen --review meegegeven" if not reviewpad else ("niet in de review" if wid not in review else f"review akkoord = '{review[wid]}', status = {status}")
        geweigerd.append((wid, "review", f"native-review ontbreekt of past niet bij de status (B11): {oorzaak}")); continue
    rr = revrij.get(wid)
    if rr and rr.get("veld") == veld and not (rr.get("deel") == "afgeleid" and veld == "review_flag"):   # v1.2/v1.4.1: de review bindt de inhoud
        goed = unesc(rr.get("voorgesteld", "")) if status == "goedgekeurd" else ibra_tekst(wid)
        if goed is None or nieuw != unesc(goed):
            geweigerd.append((wid, "review", "inhoud ≠ de tekst die in de review is goedgekeurd")); continue
    if werk[iid][veld] != oud:
        geweigerd.append((wid, "oud", f"oud wijkt af: export={werk[iid][veld][:60]!r} log={oud[:60]!r}")); continue
    werk[iid][veld] = nieuw
    toegepast.append((wid, iid, veld, oud, nieuw))
# v1.4: koppelen-controle op elk geraakt koppelen-item (ook een nieuwe rij)
geraakt = {iid for _, iid, *_ in toegepast}
for iid in sorted(geraakt):
    x = werk[iid]
    if x["exercise_type"] != "koppelen": continue
    paren = x["correct_answer"].split("|")
    try: opts = json.loads(x["options"])
    except ValueError: geweigerd.append(("—", "koppelen", f"{iid}: options is geen JSON")); continue
    if not all(p.count("=") == 1 and p.split("=", 1)[0] and p.split("=", 1)[1] for p in paren): geweigerd.append(("—", "koppelen", f"{iid}: sleutel niet in de vorm L=R|L=R (precies één = per paar)")); continue
    links = [p.split("=", 1)[0] for p in paren]; rechts = [p.split("=", 1)[1] for p in paren]
    st = x["strict_tashkeel"] == "true"
    if opts != links: geweigerd.append(("—", "koppelen", f"{iid}: options ≠ de linkerkanten van de sleutel (byte-gelijk, zelfde volgorde)"))
    if len(set(links)) != len(links) or len(set(rechts)) != len(rechts): geweigerd.append(("—", "koppelen", f"{iid}: dubbele linker- of rechterkant"))
    if len({app_cmp(v, st) for v in links}) != len(links) or len({app_cmp(v, st) for v in rechts}) != len(rechts):
        geweigerd.append(("—", "koppelen", f"{iid}: twee kanten vallen samen zoals de app vergelijkt (strict = {st}; B25-aanvulling)"))
# v1.4.1 (5): nieuwe rij alles-of-niets
toegepast_ids = {w for w, *_ in toegepast}
for r in log:
    wid, iid = r[K["wijziging_id"]], r[K["item_id"]]
    if iid in nieuw_na and wid not in toegepast_ids: geweigerd.append((wid, "rij", f"{iid} is een nieuwe rij, maar deze regel is niet toegepast (status {r[K['status']]}): alles-of-niets"))
# v1.4.1 (6): reeks-controle
reeksen = collections.defaultdict(list)
for r in log:
    if r[K["veld"]] == "(rij)" and (not week or int(re.match(r"U(\d+)-", r[K["item_id"]]).group(1)) == int(week)):
        try: na_ = json.loads(unesc(r[K["nieuw"]]))["na"]
        except Exception: continue
        reeksen["—"].append((r[K["item_id"]], na_))
kids = {iid: na_ for iid, na_ in reeksen["—"]}
def wortel_van(iid):
    w = kids[iid]
    while w in kids: w = kids[w]
    return w
per_macro = collections.defaultdict(list)
for iid in kids: per_macro[wortel_van(iid)].append(iid)
for macro, subs in sorted(per_macro.items()):
    if macro not in werk: geweigerd.append(("—", "reeks", f"macro-rij {macro} staat niet in de export")); continue
    m_pub = werk[macro]["is_published"] == "true"
    s_pub = [j for j in subs if j in werk and werk[j]["is_published"] == "true"]
    if m_pub and s_pub: geweigerd.append(("—", "reeks", f"{macro} blijft zichtbaar naast {len(s_pub)} gepubliceerde subitems"))
    if not m_pub and len(s_pub) != len(subs): geweigerd.append(("—", "reeks", f"{macro} wordt gedepubliceerd, maar {len(subs) - len(s_pub)} van {len(subs)} subitems zijn niet gemaakt of niet gepubliceerd"))
nieuw_onaf = [j for j in nieuw_na if werk[j]["is_published"] == "false"]
print(f"logregels: {len(log)} · toegepast: {len(toegepast)} · overgeslagen (niet goedgekeurd): {len(overgeslagen)} · andere week: {len(andere_week)} · geweigerd: {len(geweigerd)}")
print(f"rijen vóór: {len(rows)} · nieuwe rijen: {len(nieuw_na)} (waarvan nog is_published = false: {len(nieuw_onaf)}) · rijen na: {len(rows) + len(nieuw_na)}")
for wid, _, why in geweigerd: print("  GEWEIGERD", wid, why)
if "--stil" not in sys.argv:
    for wid, iid, veld, oud, nieuw in toegepast: print(f"  {wid} {iid} {veld}: {oud[:50]!r} → {nieuw[:50]!r}")
if geweigerd:
    c = collections.Counter(o for _, o, _ in geweigerd)
    print("STOP: geen enkele regel toegepast. Oorzaken: " + " · ".join(f"{n}× {o}" for o, n in c.items()) +
          ". (oud = moet letterlijk overeenkomen met de export; review = native-review 'ja' ontbreekt; veld/item = regel hoort niet in deze apply; rij = nieuwe rij voldoet niet aan P1-3a of is niet volledig; reeks = macro-rij en subitems niet samen gewisseld; koppelen = P1-7; nfc = nieuw niet in NFC)")
    sys.exit(2)
volgorde = []
for r in rows:
    volgorde.append(r["item_id"])
    vorige = r["item_id"]
    while True:
        volg = [j for j, na in nieuw_na.items() if na == vorige]
        if not volg: break
        assert len(volg) == 1, f"twee nieuwe rijen na {vorige}"   # kan niet meer: v1.4.1 (7) weigert dat vooraf
        volgorde.append(volg[0]); vorige = volg[0]
assert len(volgorde) == len(rows) + len(nieuw_na), "niet elke nieuwe rij heeft een plaats (na-keten)"
voor = collections.Counter(c for r in rows for c in cols if r[c] != "")
na_ = collections.Counter(c for iid in volgorde for c in cols if werk[iid][c] != "")
gew = collections.Counter(iid for _, iid, *_ in toegepast if iid in by_id)
print("gevulde velden vóór → na:", {c: (voor[c], na_[c]) for c in cols if voor[c] != na_[c]} or "geen verschil in vulling")
print("bestaande rijen geraakt:", len(gew), "/", len(rows), "· gewijzigde velden per bestaand item:", dict(gew))
if nieuw_na: print("nieuwe rijen per display_order:", dict(collections.Counter(werk[j]["display_order"] for j in nieuw_na)))
if apply and not toegepast:
    print("STOP: 0 regels toegepast (verkeerde --week, log of status?)"); sys.exit(2)
if apply:
    with open(uit, "w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh, delimiter="\t", lineterminator="\n", quoting=csv.QUOTE_MINIMAL)
        w.writerow(cols)
        for iid in volgorde: w.writerow([werk[iid][c] for c in cols])
    print("geschreven:", uit, "· md5", hashlib.md5(open(uit, "rb").read()).hexdigest())
else:
    print("droogloop — niets geschreven (geef --apply mee om te schrijven)")
