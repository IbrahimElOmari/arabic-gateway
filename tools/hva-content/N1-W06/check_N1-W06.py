# check_N1-W02.py — Reviseur-T (3T) · v1.1 · technische controle van de weekdata (app-export = bron nr. 1, lijst = bron nr. 2)
# Kopie van check_N1-W11.py (= check_N1-W01.py + --skill) met de v1.1-aanvullingen uit OVERDRACHT_N1-W11-droog §2.5 en uit de
# nakijkcode van de app (CurriculumItemPage.tsx @ 460c5c8f): Opdracht ≤ 200 tekens; Feedback ✗ meerkeuze ≤ 250 tekens;
# "Je koos <optie>" = optietekst; opties die alleen in tashkīl verschillen bij strict_tashkeel=false (K als de sleutel er een
# van is); sleutelpositie per subitemreeks; Latijnse tekst in input_arabic; Opdracht bevat de Vraag; vertaling zonder Arabisch
# (wordt niet getoond); beeld zonder afbeelding; opname/upload met beoordelende Feedback ✓ (de app toont die altijd);
# meerdere-antwoorden met een JSON-lijst als correct_answer (wordt na een fout antwoord ruw getoond).
# v1.2 (P2 N1-W02, techplan T12 + tegenrapport T P1): (a) strict_tashkeel=true → sleutel (en correct_options) byte-gelijk aan een
# optie zoals de app vergelijkt (trim, kleine letters, spaties; GEEN NFC) — anders K; (b) 'Je koos een …' is een omschrijving,
# geen optiecitaat; (c) subitem zonder input_arabic terwijl een ander subitem van dezelfde reeks er wel een heeft → K (B23 punt 3).
# v1.2.1 (tegenrapport T P2, voorwaarde V3): --poort → exitcode 2 bij K > 0 of H > 0 (poort in de keten vóór maak_sql); TASHKIL = de tekens die de app weghaalt.
# v1.3 (tegenrapport D P2, V1): bidi — de app toont Opdracht, Vraag, feedback, vertaling en opties in een LTR-alinea; twee of meer
#   Arabische woorden die alleen door leestekens/spaties gescheiden zijn ('أَخٌ/أُخْتٌ', 'هُوَ، هِيَ') vormen één RTL-reeks en worden
#   gespiegeld getoond. Volgt in hetzelfde zinsdeel een geordende Latijnse lijst ('= broer/zus', '(m/v)', '= hij, zij'), dan koppelt
#   de leerder de verkeerde vertaling → H (sjabloon §13.3-15). Zonder Latijnse lijst alleen geteld (info, geen bevinding).
#   --uitzondering=U2-a,U2-b: items die Ibra uitdrukkelijk ongewijzigd laat (bv. een in P2/P3 afgewezen item); hun bevindingen
#   worden getoond maar tellen niet mee voor --poort (de lijst staat in de uitvoer, zodat ze niet stil verdwijnt).
# v1.4 (N1-W03, techplan T1, P1 akkoord 2026-10-23): (a) rangschikken/gatentekst: een sleutel met → (een volgorde als lopende
#   tekst in plaats van één segment per tegel/gat) = H; (b) open-tekst waarvan de sleutel byte-gelijk is aan die van een ander item
#   van de week (een gekopieerde sleutel, zoals U3-schrijven-06 ← U3-grammatica-01) = H. Verder ongewijzigd t.o.v. v1.3.
# v1.5 (N1-W04, techplan T1, P1 akkoord 2026-10-24): (a) rangschikken: segmenten ≠ tegels = K (de app rekent de optievolgorde goed, r. 281–283);
#   (b) een reeks of bereik van Arabisch-Indische cijfers in een Nederlands veld = H (sjabloon §13.5-1). Verder ongewijzigd t.o.v. v1.4.
# v1.6 (N1-W05, techplan T1, P1 akkoord 2026-10-26; gebouwd in P3 = 9T P2 §2): (a) meerkeuze: een deel van de opties heeft een gloss ' (…)'
#   en een ander deel niet = K «gloss in optie» (alleen Arabische opties met een Nederlandse gloss); heeft een optie ' (…)' en is de sleutel diezelfde optie zonder gloss, dan krijgt de bestaande
#   K «sleutel ∉ opties» de verklaring «gloss in optie» (K-verklaring, geen extra bevinding);
#   (b) meerkeuze met '…' in input_arabic, alle opties uit de gesloten klasse van plaatswoorden (syntactisch onderling verwisselbaar)
#   en geen Nederlandse situatie in Opdracht/Vraag (geen ander Nederlands dan de vraagzin) = H «geen bepaalbaar antwoord»;
#   vraagwoorden (أَيْنَ/كَيْفَ) en vormkeuzes (بِالْ…) vallen er bewust buiten: daar beslist de zin zelf; (c) informatie: één Arabische
#   vorm (zonder tashkīl) met twee of meer verschillende Nederlandse vertalingen in input_translation_nl binnen de week (geen bevinding).
# v1.7 (N1-W06, techplan T1, concept P1 2026-10-27; definitief bij «P1 akkoord»): (a) koppelen: de app toont `options` als linkerkant en kijkt na
#   op de linkerkanten van de sleutel `L=R|L=R` (CurriculumItemPage.tsx r. 286–305, 457–481): opties ≠ linkerkanten = K «nooit juist»; twee
#   linkerkanten die na stripTashkeel samenvallen (strict=false) = K (de app overschrijft het eerste paar); dubbele rechterkanten = info;
#   (b) meerkeuze of gatentekst met een sleutel «1: … · 2: …» (meerdere antwoorden in één veld, macro-item) = K;
#   (c) gatentekst: meer gaten (`…`) in input_arabic dan sleutelsegmenten = K; twee segmenten die alleen in tashkīl verschillen bij
#   strict=false = H «de app kan het onderscheid niet meten» (B25: geen strict bij typen);
#   (d) redactie- en docentnotities in een leerdersveld (⚠️, «Vocalisatie-voorstel», «Input — AR», «NL-hulp», «ONTBREEKT», «CONTROLEER»,
#   «(voorbeeld)», «bron») = H (sjabloon §13.2-6, §13.3-13); (e) open-tekst die om een upload of opname vraagt (Vraag «Upload…»/«Neem…op»
#   of media «beeld»/«student-opname») = K «de app toont een tekstvak»; (f) verwijzing naar een functie die de app niet heeft
#   («AI-coach», «AI-partner», «API», «avatar», «Live Les» als voorwaarde) = H (§13.6-9); (g) open-tekst-sleutel die geen modelantwoord is
#   («hierboven», «open (», «zelfevaluatie») = M (B24).
# v1.7.1 (P1 akkoord N1-W06, punt 7 = 9T V6): koppelen vergelijkt zonder NFC (zoals normItem), dubbele rechterkanten = H.
# Gebruik: python3 -I check_N1-W06.py <APP_EXPORT.tsv> <lijst.tsv> N1 2 [uit.tsv] [--skill=grammatica] [--poort] [--uitzondering=…]
# Leest alleen; schrijft (optioneel) de bevindingen als TSV met de kolommen van handboek 3D/3T. Idempotent.
import sys, csv, json, re, unicodedata, collections
csv.field_size_limit(10**9)
args = [a for a in sys.argv[1:] if not a.startswith("--")]
SKILL = next((a.split("=",1)[1] for a in sys.argv[1:] if a.startswith("--skill=")), None)
apppad, lijstpad, niv, wk = args[0], args[1], args[2], args[3]
uit = args[4] if len(args) > 4 else None
def vaard(iid):
    v = iid.split("-")[1]
    return "comp" if v.startswith("comp") else v

ONZICHTBAAR = {"\u200b":"ZWSP","\u200c":"ZWNJ","\u200d":"ZWJ","\u200e":"LRM","\u200f":"RLM","\u00a0":"NBSP","\ufeff":"BOM","\u2028":"LS","\u2029":"PS","\u202a":"LRE","\u202b":"RLE","\u202c":"PDF","\u202d":"LRO","\u202e":"RLO","\u2066":"LRI","\u2067":"RLI","\u2068":"FSI","\u2069":"PDI"}
TASHKIL = re.compile(r"[\u0640\u064B-\u0652\u0670]")   # v1.2.1: precies wat stripTashkeel in de app weghaalt (CurriculumItemPage.tsx r. 65–67)
ARAB = re.compile(r"[\u0600-ۿ]")
LAT = re.compile(r"[A-Za-zÀ-ɏḀ-ỿ]")
MENG = re.compile(r"(?:[A-Za-z][\u0600-ۿ]|[\u0600-ۿ][A-Za-z])")
GESLOTEN = ("meerkeuze", "meerdere-antwoorden", "rangschikken", "koppelen", "gatentekst")
NAKIJKBAAR = ("meerkeuze", "meerdere-antwoorden", "rangschikken", "koppelen", "gatentekst")

def app_norm(s, strict=False):
    s = unicodedata.normalize("NFC", s or "")
    if not strict: s = TASHKIL.sub("", s)
    return re.sub(r"\s+", " ", s).strip().lower()

def jl(s):
    try: return json.loads(s) if s else None
    except Exception: return "ONGELDIGE_JSON"

bev = []
nr = [0]
def add(item, cat, tekst, probleem, norm, ernst, zeker="zeker"):
    nr[0] += 1
    bev.append([f"RT{nr[0]:04d}", item, cat, tekst, probleem, norm, ernst, zeker])

with open(apppad, encoding="utf-8", newline="") as f:
    app = [r for r in csv.DictReader(f, delimiter="\t") if r["week"] == wk and (SKILL is None or vaard(r["item_id"]) == SKILL)]
app.sort(key=lambda r: (int(r["display_order"] or 0), r["item_id"]))
ids = [r["item_id"] for r in app]
if len(ids) != len(set(ids)): add("(week)", "item_id", "", f"dubbele item_id's: {[i for i,c in collections.Counter(ids).items() if c>1]}", "item_id uniek", "K")
TEKSTVELDEN = ["instruction_nl","question","correct_answer","feedback_correct","feedback_incorrect","input_arabic","input_transliteration","input_translation_nl","review_flag"]
maxlen = collections.defaultdict(int)
for r in app:
    iid = r["item_id"]
    m = re.fullmatch(r"U(\d+)-([a-z]+\d?)-(\d{2})(?:-(\d+))?", iid)
    if not m: add(iid, "item_id", iid, "item_id volgt het formaat U{week}-{vaardigheid}-{nr}[-{sub}] niet", "handboek §2.1", "H")
    elif int(m.group(1)) != int(r["week"]) or r["unit_code"] != f"U{m.group(1)}": add(iid, "item_id", f"week={r['week']} unit={r['unit_code']}", "week/unit_code wijkt af van het id", "handboek 3T", "K")
    if m and m.group(2) != r["skill"]: add(iid, "skill", r["skill"], f"skill-kolom ({r['skill']}) ≠ vaardigheid in id ({m.group(2)})", "handboek 3T", "H")
    opts = jl(r["options"]); co = jl(r["correct_options"]); mp = jl(r["media_production"])
    for naam, val in ((("options", opts)), ("correct_options", co), ("media_production", mp)):
        if val == "ONGELDIGE_JSON": add(iid, naam, r[naam], "ongeldige JSON in jsonb-kolom", "schema v1", "K")
    opts = opts if isinstance(opts, list) else []
    co = co if isinstance(co, list) else []
    typ = r["exercise_type"]; strict = r["strict_tashkeel"] == "true"
    for v in TEKSTVELDEN + ["options"]:
        s = r[v]; maxlen[v] = max(maxlen[v], len(s))
        for ch, naam in ONZICHTBAAR.items():
            if ch in s: add(iid, v, s, f"onzichtbaar teken {naam} (U+{ord(ch):04X}) ×{s.count(ch)}", "handboek 3T / 4.2 RTL", "H")
        if s and not unicodedata.is_normalized("NFC", s):
            pos = [i for i, (a, b) in enumerate(zip(s, unicodedata.normalize("NFC", s))) if a != b][:1]
            add(iid, v, s, f"niet-NFC (volgorde van tashkīl-tekens, eerste verschil op positie {pos[0] if pos else '?'}); export normaliseert naar NFC (ADR-5)", "ADR-5 NFC", "M")
        if "  " in s: add(iid, v, s, f"dubbele spatie ×{s.count('  ')}", "handboek 3T", "M")
        if s != s.strip(): add(iid, v, s, "spatie(s)/regeleinde aan begin of einde", "handboek 3T", "M")
        if "\n" in s and v != "input_arabic": add(iid, v, s, "regeleinde in een eenregelig veld", "handboek 3T", "M")
        if re.search(r'^".*"$', s) or '""' in s: add(iid, v, s, "aanhalingstekens rond veld / dubbele aanhalingstekens (CSV-restant)", "handboek 3T", "M")
        if MENG.search(s): add(iid, v, s, "Latijnse en Arabische tekens in één woord", "handboek 4.2 RTL", "H")
    if typ in ("meerkeuze", "meerdere-antwoorden", "rangschikken", "koppelen") and len(opts) < 2:
        add(iid, "options", r["options"], f"{typ} met {len(opts)} optie(s) (minimaal 2)", "sjabloon §0/§1", "K")
    if typ == "meerkeuze" and opts and app_norm(r["correct_answer"], strict) not in [app_norm(o, strict) for o in opts]:
        add(iid, "correct_answer", r["correct_answer"], "sleutel komt na normalisatie niet letterlijk voor in de opties", "B3 / nakijkregel app", "K")
    if typ == "meerkeuze" and len(opts) < 3: add(iid, "options", r["options"], f"meerkeuze met {len(opts)} opties (sjabloon: ≥3, 2 alleen bij binaire discriminatie)", "sjabloon §1", "M")
    for o in opts:
        if not o.strip() or not re.search(r"[\w\u0600-ۿ]", o): add(iid, "options", r["options"], f"lege of betekenisloze optie {o!r}", "sjabloon §0 afleiders", "K")
    if strict and len(opts) != len(set(app_norm(o, strict) for o in opts)): add(iid, "options", r["options"], "twee opties zijn na normalisatie gelijk", "sjabloon §0", "H")  # v1.1: zonder strict meldt het tashkīl-blok hieronder het precieze geval
    if typ == "meerdere-antwoorden":
        if not co: add(iid, "correct_options", r["correct_options"], "meerdere-antwoorden zonder correct_options", "B3", "K")
        elif set(app_norm(x, strict) for x in co) - set(app_norm(o, strict) for o in opts): add(iid, "correct_options", r["correct_options"], "correct_options bevat een waarde die geen optie is", "B3", "K")
    if typ == "gatentekst":
        gaten = sorted(set(int(g) for g in re.findall(r"\[(\d+)\]", r["input_arabic"] + " " + r["question"])))
        segs = r["correct_answer"].split("|") if r["correct_answer"] else []
        if r["correct_answer"].lstrip().startswith("{"): add(iid, "correct_answer", r["correct_answer"], f"sleutel is een JSON-object; de app verwacht `seg|seg|seg` en toont nu {len(segs)} invulveld(en) voor {len(gaten)} gaten → item kan nooit juist worden", "B3 / CurriculumItemPage.tsx gatentekst", "K")
        elif gaten and len(segs) != len(gaten): add(iid, "correct_answer", r["correct_answer"], f"{len(segs)} sleutelsegment(en) voor {len(gaten)} gaten", "B3", "K")
        if not r["correct_answer"]: add(iid, "correct_answer", "", "gatentekst zonder sleutel", "B3", "K")
    if typ == "rangschikken":
        segs = r["correct_answer"].split("|") if r["correct_answer"] else []
        if len(segs) != len(opts): add(iid, "correct_answer", r["correct_answer"], f"sleutel heeft {len(segs)} segment(en) (`seg|seg`) tegenover {len(opts)} opties; de app valt dan terug op de optievolgorde als juiste volgorde: een foute volgorde wordt goed gerekend (v1.5, 2T §2.1)", "B3 / CurriculumItemPage.tsx r. 281–283 (fallback)", "K")
        elif [app_norm(s_, strict) for s_ in segs] and set(app_norm(s_, strict) for s_ in segs) != set(app_norm(o, strict) for o in opts): add(iid, "correct_answer", r["correct_answer"], "sleutelsegmenten ≠ opties", "B3", "K")
    if typ == "koppelen":
        paren = [p for p in r["correct_answer"].split("|") if p]
        if not paren or any("=" not in p for p in paren): add(iid, "correct_answer", r["correct_answer"], "koppelen zonder `L=R|L=R`-sleutel", "B3", "K")
    if typ in NAKIJKBAAR and not r["feedback_incorrect"]: add(iid, "feedback_incorrect", "", "nakijkbaar item zonder feedback ✗", "handboek 4.3 feedback", "H")
    if typ in NAKIJKBAAR and not r["feedback_correct"]: add(iid, "feedback_correct", "", "nakijkbaar item zonder feedback ✓", "handboek 4.3 feedback", "H")
    if typ in ("open-tekst", "audio-opname", "bestand-upload") and not r["feedback_incorrect"] and int(r["points"] or 0) > 0:
        add(iid, "feedback_incorrect", "", "open/opname/upload-taak met punten maar zonder feedback ✗ (criterialijst)", "sjabloon §7–§9 / B8", "H")
    if typ in ("open-tekst", "audio-opname", "bestand-upload") and not r["feedback_incorrect"] and int(r["points"] or 0) == 0 and r["skill"] not in ("reflectie",):
        add(iid, "feedback_incorrect", "", "formatieve taak (0 pt) zonder feedback ✗; sjabloon §10 staat dit toe bij reflectie, hier niet-reflectie", "sjabloon §7 / §10", "M")
    if isinstance(mp, list) and "NS-audio" in mp and not (r["audio_url"] or r["media_url"]): add(iid, "media", r["media_production"], "vraagt NS-audio, geen audio_url/media_url (B15: publiceren zonder audio, vermelden in P4)", "B15", "M")
    if "⚠\ufe0f" in r["review_flag"] or re.search(r"CONTROLEER|ONTBREEKT", r["review_flag"]): add(iid, "review_flag", r["review_flag"], "app toont een CONTROLEER/ONTBREEKT-badge aan leerkrachten (CurriculumReviewPage, CurriculumItemPage)", "app review_flag", "M")
    if r["is_published"] != "true": add(iid, "is_published", r["is_published"], "item staat op concept", "status", "M")

# --- v1.1 -------------------------------------------------------------------------------------------------------------
def nk(s): return re.sub(r"\s+", " ", unicodedata.normalize("NFC", s or "")).strip().lower()
BEOORDELEND = re.compile(r"^(Goed|Mooi|Sterk|Sterke|Vlot|Verzorgd|Nette|Netjes|Juist|Knap|Prima|Uitstekend|Precies)\b")
groepen = collections.OrderedDict()
for r in app:
    iid = r["item_id"]; typ = r["exercise_type"]; strict = r["strict_tashkeel"] == "true"
    opts = jl(r["options"]); opts = opts if isinstance(opts, list) else []
    if len(r["instruction_nl"]) > 200: add(iid, "instruction_nl", r["instruction_nl"], f"Opdracht {len(r['instruction_nl'])} tekens (> 200)", "sjabloon §0 / §13.2-7", "M")
    if typ == "meerkeuze" and len(r["feedback_incorrect"]) > 250: add(iid, "feedback_incorrect", r["feedback_incorrect"], f"Feedback ✗ {len(r['feedback_incorrect'])} tekens (> 250)", "sjabloon §13.1-11 / §13.2-7", "M")
    for m in re.finditer(r"Je koos (.+?)(?:\s+[—–-]\s|\.\s|\.$|;)", r["feedback_incorrect"]):
        keuze = m.group(1).strip().rstrip(".")
        if opts and not keuze.startswith("een ") and nk(keuze) not in [nk(o) for o in opts]:   # v1.2: 'een …' = omschrijving
            add(iid, "feedback_incorrect", r["feedback_incorrect"], f"'Je koos {keuze}' is geen optietekst", "sjabloon §13.2-4 (9D-2)", "H")
    if strict and opts:   # v1.2 (B25): de app vergelijkt met strict zonder NFC (CurriculumItemPage.tsx r. 61–71, 231)
        app_strict = lambda x: re.sub(r"\s+", " ", (x or "").strip().lower())
        sleutels = [r["correct_answer"]] if typ == "meerkeuze" else (jl(r["correct_options"]) or [])
        for k_ in sleutels:
            if app_strict(k_) not in [app_strict(o) for o in opts]:
                add(iid, "correct_answer" if typ == "meerkeuze" else "correct_options", k_, "strict_tashkeel=true: sleutel niet byte-gelijk aan een optie (de app vergelijkt zonder NFC) → een juist antwoord telt als fout", "B25 · CurriculumItemPage.tsx r. 61–71", "K")
    if typ in ("meerkeuze", "meerdere-antwoorden") and not strict and opts:
        klassen = collections.defaultdict(list)
        for o in opts: klassen[app_norm(o)].append(o)
        for k, leden in klassen.items():
            if len(leden) > 1 and len(set(nk(x) for x in leden)) > 1:
                sleutel_in = app_norm(r["correct_answer"]) == k if typ == "meerkeuze" else any(app_norm(c) == k for c in (jl(r["correct_options"]) or []))
                add(iid, "options", " · ".join(leden), ("de sleutel valt samen met een andere optie: " if sleutel_in else "twee afleiders vallen samen: ") + " = ".join(leden) + " na het weglaten van tashkīl (strict_tashkeel=false) → " + ("een fout antwoord telt als goed" if sleutel_in else "de app kan ze niet onderscheiden"), "CurriculumItemPage.tsx normItem/stripTashkeel", "K" if sleutel_in else "H")
    if typ == "meerkeuze" and opts and r["correct_answer"]:
        pos = next((i for i, o in enumerate(opts) if nk(o) == nk(r["correct_answer"])), None)
        if pos is not None:
            groep = "-".join(iid.split("-")[:3]) if len(iid.split("-")) == 4 else iid
            groepen.setdefault(groep, []).append((iid, pos, len(opts)))
    if r["input_arabic"] and LAT.search(r["input_arabic"]): add(iid, "input_arabic", r["input_arabic"], "Latijnse tekst in het Arabische stimulusveld (RTL)", "sjabloon §13.1-6 / handboek 4.2", "M")
    if r["question"] and r["instruction_nl"] and nk(r["question"]).rstrip("?") and nk(r["question"]).rstrip("?") in nk(r["instruction_nl"]): add(iid, "instruction_nl", r["instruction_nl"], "Opdracht bevat de Vraag letterlijk (Opdracht = Vraag)", "B4", "M")
    if r["input_translation_nl"] and not r["input_arabic"]: add(iid, "input_translation_nl", r["input_translation_nl"], "vertaling zonder input_arabic: de app toont ze niet", "CurriculumItemPage.tsx r. 559–581", "M")
    mp2 = jl(r["media_production"]) or []
    if isinstance(mp2, list) and "beeld" in mp2 and not r["image_url"]: add(iid, "media_production", r["media_production"], "vraagt een afbeelding; zonder image_url ziet de leerder 'Afbeelding nog niet beschikbaar.'", "CurriculumItemPage.tsx r. 594–602", "M")
    if typ in ("audio-opname", "bestand-upload") and BEOORDELEND.search(r["feedback_correct"] or ""): add(iid, "feedback_correct", r["feedback_correct"], "beoordelende Feedback ✓; de app toont na elke upload/opname 'Juist!' + Feedback ✓ (isCorrect = true), ook bij een zwakke inzending", "CurriculumItemPage.tsx r. 284–301, 313–316, 633–652", "H")
    if typ == "meerdere-antwoorden" and r["correct_answer"].lstrip().startswith("["): add(iid, "correct_answer", r["correct_answer"], "correct_answer is een JSON-lijst; de app keurt op correct_options, maar toont correct_answer ruw na een fout antwoord", "CurriculumItemPage.tsx r. 653–657", "M")
# --- v1.4 --------------------------------------------------------------------------------------------------------------
sleutels_open = collections.defaultdict(list)
for r in app:
    if r["exercise_type"] in ("rangschikken", "gatentekst") and "→" in r["correct_answer"]:
        add(r["item_id"], "correct_answer", r["correct_answer"], "sleutel bevat → (volgorde als tekst); de app verwacht één segment per tegel/gat (`seg|seg|seg`) en toont dan geen genummerde lijst (PR #1)", "B3 · sjabloon §13.1-4 · CurriculumItemPage.tsx @ e7317258", "H")
    if r["exercise_type"] == "open-tekst" and r["correct_answer"].strip():
        sleutels_open[r["correct_answer"].strip()].append(r["item_id"])
for k_, iids in sleutels_open.items():
    if len(iids) > 1:
        for iid in iids:   # beide melden: welke kopie fout is, beslist de mens (in W03 is U3-schrijven-06 de kopie)
            add(iid, "correct_answer", k_, f"open-tekst met dezelfde sleutel als {', '.join(x for x in iids if x != iid)} (gekopieerde sleutel: past het modelantwoord bij deze taak?)", "B8/B24 · handboek 4.3", "H")
# --- v1.5 (N1-W04, P1-15): Arabisch-Indische cijfers als reeks of bereik in een Nederlands veld (LTR) worden herschikt → H ------
CIJFERREEKS = re.compile(r"[٠-٩]+\s*[–\-<>≤≥→+,/]\s*[٠-٩]+")
for r in app:
    for veld in ("instruction_nl", "question", "feedback_correct", "feedback_incorrect", "input_translation_nl"):
        m = CIJFERREEKS.search(r[veld] or "")
        if m: add(r["item_id"], veld, r[veld], f"cijferreeks '{m.group(0)}' in Arabisch-Indische cijfers in een Nederlands veld: in de LTR-alinea worden de getallen herschikt (rendertoets SAMEN/CIJFER); gebruik westerse cijfers, woorden of Nederlands ertussen", "sjabloon §13.5-1 (P1-15 N1-W04) · B27", "H")
# --- v1.3: bidi ------------------------------------------------------------------------------------------------------
AR_W = r"[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]+"
NEUT = r"[\s/,،·\-–—+:؛!?؟()\[\]\"'«»…→←]+"
RTL_REEKS = re.compile(AR_W + r"(?:" + NEUT + AR_W + r")+")
LAT_W = r"[A-Za-zÀ-ÿāīūḥṣḍṭẓʿʾ]+"
LAT_LIJST = re.compile(LAT_W + r"\s*/\s*" + LAT_W + r"|=\s*" + LAT_W + r"(?:\s*,\s*" + LAT_W + r")+")
LTR_VELDEN = ("instruction_nl", "question", "feedback_correct", "feedback_incorrect", "input_translation_nl", "correct_answer")
bidi_info = 0
for r in app:
    waarden = [(v, r[v]) for v in LTR_VELDEN if r[v]] + [("options", o) for o in ((jl(r["options"]) if isinstance(jl(r["options"]), list) else []) or []) if isinstance(o, str)]
    for veld, w in waarden:
        for zinsdeel in re.split(r"(?<=[.;])\s+|\n|\s·\s", w):
            reeksen_ = RTL_REEKS.findall(zinsdeel)
            if not reeksen_: continue
            lat = LAT_LIJST.search(RTL_REEKS.sub(" ", zinsdeel))
            if lat: add(r["item_id"], veld, w, f"bidi: '{reeksen_[0]}' wordt in de LTR-alinea gespiegeld getoond, terwijl '{lat.group(0)}' een volgorde aangeeft → verkeerde koppeling", "sjabloon §13.3-15 · index.html dir=ltr · CurriculumItemPage.tsx r. 652", "H")
            else: bidi_info += len(reeksen_)
for groep, lst in groepen.items():
    if len(lst) >= 3:
        posities = [p for _, p, _ in lst]
        if len(set(posities)) == 1: add(groep, "options", "sleutelpositie " + ",".join(chr(65+p) for p in posities), f"de sleutel staat in alle {len(lst)} subitems op dezelfde plaats; de app schudt meerkeuze-opties niet", "sjabloon §0 toetsbaarheid / CurriculumItemPage.tsx r. 357–366", "H")
        elif posities == sorted(posities) and len(set(posities)) == len(posities): add(groep, "options", "sleutelpositie " + ",".join(chr(65+p) for p in posities), f"de sleutelpositie loopt op (A, B, C …) in de volgorde van de subitems; de app schudt meerkeuze-opties niet", "sjabloon §0 toetsbaarheid", "M")
reeksen = collections.OrderedDict()   # v1.2 (c): B23 punt 3 — eigen stimulus per subitem
for r in app:
    p_ = r["item_id"].split("-")
    if len(p_) == 4: reeksen.setdefault("-".join(p_[:3]), []).append(r)
for groep, rs in reeksen.items():
    if any(r["input_arabic"] for r in rs):
        for r in rs:
            if not r["input_arabic"]: add(r["item_id"], "input_arabic", "", f"subitem zonder stimulus terwijl andere subitems van {groep} er wel een hebben; zonder audio ziet de leerder niets om op te antwoorden", "B23 punt 3", "K")

# v1.6 (a)(b)(c)
GLOSS = re.compile(r"\s\([^()]*\)\s*$")
PLAATS = {"بين", "خلف", "امام", "أمام", "في", "على", "تحت", "فوق", "بجانب", "يمين", "يسار", "قرب", "عند"}
def kaal(s): return TASHKIL.sub("", unicodedata.normalize("NFC", s or "")).strip()
for r in app:
    if r["exercise_type"] != "meerkeuze": continue
    opts = jl(r["options"])
    if not isinstance(opts, list) or not opts: continue
    met = [o for o in opts if isinstance(o, str) and GLOSS.search(o) and ARAB.search(o)]   # gloss = Nederlandse vertaling bij een Arabische optie
    sleutel = (r["correct_answer"] or "").strip()
    if met and sleutel and not GLOSS.search(sleutel) and any(GLOSS.sub("", o).strip() == sleutel for o in met):
        for b in bev:   # K-verklaring bij de bestaande bevinding «sleutel ∉ opties» (geen nieuwe bevinding, de K-telling blijft)
            if b[1] == r["item_id"] and b[6] == "K" and "verklaring: gloss" not in b[4]: b[4] += " — verklaring: gloss in optie (de optie heeft ' (…)', de sleutel niet)"
    if met and len(met) != len(opts):
        add(r["item_id"], "options", " | ".join(opts), f"gloss in optie: {len(met)} van {len(opts)} opties hebben een vertaling tussen haakjes; dat verraadt of verraadt het antwoord", "sjabloon §13.6-3 (opties zonder gloss) / T1 (a)", "K")
    if "…" in (r["input_arabic"] or "") and all(isinstance(o, str) and kaal(o) in PLAATS for o in opts):
        nl = LAT.sub("x", re.sub(r"[\u0600-ۿ]+", "", (r["question"] or "")))
        zinnen = [z for z in re.split(r"[.?!]\s*", r["question"] or "") if LAT.search(z)]
        if len(zinnen) <= 1:
            add(r["item_id"], "question", r["question"], "geen bepaalbaar antwoord: alle opties zijn plaatswoorden die syntactisch in het gat passen en de Vraag geeft geen Nederlandse situatie", "sjabloon §13.6-2 (situatiezin in de Vraag) / T1 (b)", "H")
vert = collections.defaultdict(set)
for r in app:
    a, t = kaal(r["input_arabic"]), (r["input_translation_nl"] or "").strip().lower()
    if a and t and " " not in a: vert[a].add(t)
info_c = {a: sorted(t) for a, t in vert.items() if len(t) > 1}
# --- v1.7 (N1-W06) -----------------------------------------------------------------------------------------------------
MACRO = re.compile(r"(^|\s|\()1\s*[:.)]\s*\S.*?(·|\|)\s*2\s*[:.)]")
NOTITIE = re.compile(r"⚠️|⚠|(?i:Vocalisatie-voorstel|Input\s*—\s*AR|NL-hulp|\(voorbeeld\)|\bbron\b|Reference media|verbatim)|ONTBREEKT|CONTROLEER")   # hoofdletters: «ontbreekt» in gewone zinnen is geen notitie
FUNCTIE = re.compile(r"AI-coach|AI-partner|\bAPI\b|avatar|Harf-Speech|tegen de AI", re.I)
GEEN_MODEL = re.compile(r"hierboven|^open \(|zelfevaluatie|geen sleutel", re.I)
LEERDERSVELDEN = ("instruction_nl", "question", "feedback_correct", "input_arabic", "input_translation_nl")
for r in app:
    iid = r["item_id"]; typ = r["exercise_type"]; strict = r["strict_tashkeel"] == "true"
    opts = jl(r["options"]); opts = opts if isinstance(opts, list) else []
    mp = jl(r["media_production"]); mp = mp if isinstance(mp, list) else []
    if typ == "koppelen":
        # v1.7.1 (9T P1 V6): vergelijken zoals de app (normItem = trim, kleine letters, spaties; zonder strict ook stripTashkeel) en ZONDER NFC
        def app_cmp(x, st): return re.sub(r"\s+", " ", (x if st else TASHKIL.sub("", x or "")).strip().lower())
        paren = [p for p in (r["correct_answer"] or "").split("|") if p]
        links = [p.split("=")[0] for p in paren if "=" in p]; rechts = [p.split("=", 1)[1] for p in paren if "=" in p]
        kr = collections.Counter(app_cmp(x, strict) for x in rechts)
        if [k for k, n_ in kr.items() if n_ > 1]: add(iid, "correct_answer", r["correct_answer"], f"koppelen: rechterkanten vallen samen zoals de app vergelijkt ({', '.join(k for k, n_ in kr.items() if n_ > 1)}): de keuzelijst toont ze dubbel en de app kan ze niet onderscheiden", "v1.7.1 (9T V6) · normItem", "H")
        if links and opts and sorted(app_cmp(x, strict) for x in links) != sorted(app_cmp(o, strict) for o in opts):
            add(iid, "options", r["options"], f"koppelen: de opties (getoonde linkerkant) ≠ de linkerkanten van de sleutel ({' · '.join(links)}); de app zoekt het antwoord onder de linkerkant van de sleutel → nooit juist", "v1.7 (a) · CurriculumItemPage.tsx r. 286–305, 457–481", "K")
        kl = collections.Counter(app_cmp(x, strict) for x in links)
        dub = [k for k, n in kl.items() if n > 1]
        if dub: add(iid, "correct_answer", r["correct_answer"], f"koppelen: linkerkanten vallen samen na het weglaten van tashkīl ({', '.join(dub)}); de app overschrijft het eerste paar", "v1.7 (a) · normItem/stripTashkeel · B25", "K")
    if typ in ("meerkeuze", "gatentekst") and MACRO.search(r["correct_answer"] or ""):
        add(iid, "correct_answer", r["correct_answer"], f"{typ} met een sleutel «1: … · 2: …»: meerdere antwoorden in één veld (macro-item); de leerder kiest of typt één antwoord → nooit juist", "v1.7 (b) · B3 · sjabloon §2 (één vraag per item)", "K")
    if typ == "gatentekst":
        segs = (r["correct_answer"] or "").split("|") if r["correct_answer"] else []
        gaten = (r["input_arabic"] or "").split(" - NL-hulp")[0].count("…")
        if gaten > len(segs): add(iid, "correct_answer", r["correct_answer"], f"{gaten} gaten (…) in de stimulus tegenover {len(segs)} sleutelsegment(en): de app toont {len(segs)} invulveld(en)", "v1.7 (c) · B3 · sjabloon §13.1-3", "K")
        if not strict:
            kl = collections.defaultdict(set)
            for sg in segs: kl[app_norm(sg)].add(nk(sg))
            for k, vs in kl.items():
                if len(vs) > 1: add(iid, "correct_answer", r["correct_answer"], f"gatentekst: segmenten {' / '.join(sorted(vs))} verschillen alleen in tashkīl; de app vergelijkt zonder tashkīl → het onderscheid wordt niet gemeten", "v1.7 (c) · B25 (geen strict bij typen)", "H")
    for v in LEERDERSVELDEN:
        m = NOTITIE.search(r[v] or "")
        if m and not (v == "input_arabic" and m.group(0) == "…"): add(iid, v, r[v], f"redactie-/docentnotitie «{m.group(0)}» in een leerdersveld (de leerder ziet dit)", "v1.7 (d) · sjabloon §13.2-6, §13.3-13 · B8", "H")
    if typ == "open-tekst" and (re.search(r"^\s*(Upload|Neem)\b", r["question"] or "", re.I) or "beeld" in mp or "student-opname" in mp):
        add(iid, "exercise_type", typ, "open-tekst vraagt om een upload of opname (Vraag/media); de app toont alleen een tekstvak", "v1.7 (e) · CurriculumItemPage.tsx r. 410–418, 508–521", "K")
    for v in ("instruction_nl", "question", "feedback_correct", "feedback_incorrect", "correct_answer"):
        m = FUNCTIE.search(r[v] or "")
        if m: add(iid, v, r[v], f"verwijzing naar een functie die de app niet heeft («{m.group(0)}»)", "v1.7 (f) · sjabloon §13.6-9", "H")
    if typ == "open-tekst" and GEEN_MODEL.search((r["correct_answer"] or "").strip()):
        add(iid, "correct_answer", r["correct_answer"], "open-tekst-sleutel is geen modelantwoord (docent ziet geen voorbeeld)", "v1.7 (g) · B24", "M")

lijst = collections.OrderedDict(); regels = 0
with open(lijstpad, encoding="utf-8", newline="") as f:
    for r in csv.DictReader(f, delimiter="\t"):
        if r["niveau"] == niv and r["week"] == wk and (SKILL is None or vaard(r["item_id"]) == SKILL):
            regels += 1; lijst.setdefault(r["item_id"], []).append(r)
for iid, rs in lijst.items():
    if iid not in ids: add(iid, "(lijst)", "", "item staat in de lijst maar niet in de app", "B7", "M")
    for r in rs:
        s = r["tekst"]
        for ch, naam in ONZICHTBAAR.items():
            if ch in s: add(iid, f"lijst:{r['categorie']}", s, f"onzichtbaar teken {naam} in de lijst", "handboek 3T", "H")
        if s and not unicodedata.is_normalized("NFC", s): add(iid, f"lijst:{r['categorie']}", s, "lijstregel niet-NFC", "ADR-5", "M")
        if s != s.strip() or "  " in s: add(iid, f"lijst:{r['categorie']}", s, "spaties aan begin/einde of dubbele spatie in de lijst", "handboek 3T", "M")
        if re.search(r'^".*"$', s) or '""' in s: add(iid, f"lijst:{r['categorie']}", s, "CSV-restant (aanhalingstekens) in de lijst", "handboek 3T", "M")
for iid in ids:
    if iid not in lijst: add(iid, "(lijst)", "", "item staat in de app maar niet in de lijst", "B7", "M")

print(f"# check_{niv}-W{int(wk):02d} v1.7.1{' · skill='+SKILL if SKILL else ''} · app {len(app)} items · lijst {len(lijst)} items / {regels} regels")
print("types:", dict(collections.Counter(r["exercise_type"] for r in app)))
print("max veldlengte:", dict(sorted(maxlen.items(), key=lambda kv: -kv[1])))
c = collections.Counter(b[6] for b in bev)
print(f"bevindingen: {len(bev)} · K {c.get('K',0)} · H {c.get('H',0)} · M {c.get('M',0)} · L {c.get('L',0)} · bidi-info (RTL-reeksen zonder Latijnse lijst): {bidi_info}")
print(f"info (c) één vorm, meerdere vertalingen: {len(info_c)}" + (f" · {info_c}" if info_c else ""))
for b in bev: print(" | ".join([b[0], b[1], b[2][:60], b[6], b[4]]))
if uit:
    with open(uit, "w", encoding="utf-8", newline="") as f:
        f.write("\t".join(["bevinding_id","item_id","categorie","huidige_tekst","probleem","norm","ernst","zekerheid"]) + "\n")
        for b in bev: f.write("\t".join(x.replace("\t", " ").replace("\n", "⏎") for x in b) + "\n")
    print("geschreven:", uit, len(bev), "regels")
UITZ = set(next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--uitzondering=")), "").split(",")) - {""}
if "--poort" in sys.argv:
    tel_poort = collections.Counter(b[6] for b in bev if b[1] not in UITZ)
    if UITZ: print(f"uitzonderingen (Ibra): {sorted(UITZ)} · hun K/H tellen niet mee: K {c.get('K',0) - tel_poort.get('K',0)} · H {c.get('H',0) - tel_poort.get('H',0)}")
    if tel_poort.get("K", 0) or tel_poort.get("H", 0):
        print(f"POORT DICHT: K {tel_poort.get('K', 0)} · H {tel_poort.get('H', 0)} (exit 2)"); sys.exit(2)
    print("POORT OPEN: K 0 · H 0")
