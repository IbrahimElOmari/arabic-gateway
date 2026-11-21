# check_N1-W11.py v1.10 — Reviseur-T (3T) · P1 N1-W11 groep 1 («P1 akkoord» 2026-11-20 10:33, beslissing 8; 9T-2 maakte v1.10 een voorwaarde vóór P2).
#   Kopie van check_N1-W10.py v1.9 (md5 430f6060b5172b19d02f19054de9d20d). Alle v1.9-regels ONGEWIJZIGD; zes nieuwe regels, elk met de norm «v1.10 (x)»:
#   (a) regelmatig sleutelpatroon in een meerkeuzereeks, ook bij 2 opties = H · (b) INGETROKKEN vóór gebruik: de app begrenst het aantal opties niet ·
#   (c) ongebalanceerde haakjes in Opdracht of Vraag = K · (d) scaffold-/productiecodes (Comp n, VEn, wk n, [verschijnt, GEAUTEERD …) = H ·
#   (e) twee items met dezelfde Vraag én dezelfde sleutel = H · (f) B2-afwijking in input_transliteration = M.
#   Het script blijft weekgeneriek: niveau en week komen uit argv; geen weeknummer als constante.
# check_N1-W08.py — Reviseur-T (3T) · check v1.8.2 (N1-W08, P2) · geschiedenis hieronder, de nieuwste versie onderaan de kop.
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
# v1.8 (N1-W07, P1-beslissingen 11a en 20 = 9T V2, «P1 akkoord» 2026-11-09): (a) app-volgorde: gesorteerd zoals de unitpagina
#   (`display_order ASC, item_id ASC`, CurriculumUnitPage.tsx r. 71–72 @ 244de3e) moeten de vaardigheden aaneengesloten en in de
#   didactische volgorde staan (luisteren → lezen → spreken → schrijven → grammatica → cultuur → reflectie) = anders K op «(week)»; binnen
#   een subitemreeks moeten de subitems in numerieke volgorde staan (-2 vóór -10) = anders K op de reeks; informatie: aantal unieke
#   display_order-waarden en nullen; (b) meerdere-antwoorden waarvan alle opties juist zijn (sjabloon §3: nooit alle) = K.
#   Regressie: W01–W06 (display_order 1 … n, W06-subitems met het nummer van de macro-rij) geven met v1.8 geen nieuwe bevinding.
# v1.8.1 (N1-W07, 9T P2 V4): (c) nullen naast niet-nullen in één week = K op «(week)» (de nullen komen vóór alle andere items); een nummer dat
#   gedeeld wordt buiten één subitemreeks (B12-macro: alleen een macro-rij en haar subitems delen een nummer, zoals W06) = K; de nummers
#   zijn niet 1 … n (gat of buiten bereik) = H. Een week met alleen nullen (W07 vóór P4, W08–W25) krijgt alleen de informatieregel.
#   Regressie: W01–W06 ongewijzigd (14 · 70 · 104 · 58 · 57 · 97).
# v1.8.2 (N1-W08, techplan T1, 9T P1 V1/V2, P1-beslissingen 9, 11, 27, 28 en B33; «P1 akkoord.» 2026-11-10 22:31). Alle v1.8.1-regels
#   ongewijzigd; de nieuwe bevindingen komen ná de bestaande (zelfde RT-nummers als v1.8.1) en hun norm begint met «v1.8.2 (x)»:
#   (a) B33: elk teken U+0660–0669, U+06F0–06F9, U+066B of U+066C in welk veld ook = K (per item en veld);
#   (b1) gatentekst waarvan de sleutel een cijfer bevat: elk segment (na trim, zoals normItem) `^[0-9]+$` of `^[0-9]{2}:[0-9]{2}$`, anders K;
#   (b2) zo'n item zonder «cijfers 0–9» in de Opdracht = H (vanaf W08; eerdere weken alleen info, conventie van P1 N1-W08);
#   (b3) gatentekst waarvan de Vraag een sleutelsegment als los woord bevat (vergeleken zoals de app) = H (de app toont de Vraag, r. 430);
#   (c1) meerdere-antwoorden: correct_answer ≠ de juiste opties in optievolgorde met «، » (na NFC) = H; (c2) exact dubbele optie = H;
#   (c3) een leerdersveld belooft «punt per» / «per woord een punt» = H (de app keurt alles-of-niets, r. 257–264, 340);
#   (d) letterkeuze (meerkeuze met losse Arabische letters als opties) waarvan de stimulus meer dan één optieletter bevat = H
#   (ء telt ook als hamza op een drager); (e) positiecue: in een subitemreeks (≥ 3 meerkeuze-subitems, elk ≥ 3 opties) staat de sleutel,
#   gezocht zoals de app vergelijkt en ook zonder gloss ' (…)', overal op dezelfde plaats = H, tenzij v1.1 dat al meldt;
#   (f) v1.9 (besluit «kل-keuze a», P2 N1-W10): het skelet كل als los woord in een leerdersveld = H **alleen als de week twee of meer
#   verschillende gevocaliseerde vormen met dat skelet in leerdersvelden heeft** (de botsing waarover P1-9 N1-W08 gaat: كُلْ «eet!» naast
#   كُلُّ «al, elk»). Eén vorm alleen = een vaste formule of een gewoon woord, geen bevinding maar een inforegel (zoals تَفَضَّلْ in W04,
#   sjabloon §13.9-14 / 9D P2 §2). Vóór W08 blijft het een inforegel. Macro-sleutels «1: … · 2: …»
#   (v1.7 b, al K) vallen buiten (b1)–(b3) en (d). Info: B33 in de lijst (bron nr. 2). De kop drukt «check v1.9» (register #41; v1.9 = register W10).
# Gebruik: python3 -I check_N1-W08.py <APP_EXPORT.tsv> <lijst.tsv> N1 8 [uit.tsv] [--skill=grammatica] [--poort] [--uitzondering=…]
# Leest alleen; schrijft (optioneel) de bevindingen als TSV met de kolommen van handboek 3D/3T. Idempotent.
import sys, csv, json, re, unicodedata, collections
VERSIE = "1.10"
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
        elif opts and len(set(app_norm(x, strict) for x in co)) >= len(set(app_norm(o, strict) for o in opts)): add(iid, "correct_options", r["correct_options"], f"meerdere-antwoorden: alle {len(opts)} opties zijn juist (sjabloon §3: nooit alle; geen selectie mogelijk)", "v1.8 (b) · sjabloon §3", "K")
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

# --- v1.8 (N1-W07) (a): app-volgorde -------------------------------------------------------------------------------------------
VOLG_SKILL = ["luisteren", "lezen", "spreken", "schrijven", "grammatica", "cultuur", "reflectie"]
def subnr(iid):
    p_ = iid.split("-"); return int(p_[3]) if len(p_) == 4 and p_[3].isdigit() else 0
app_volg = sorted(app, key=lambda r: (int(r["display_order"] or 0), r["item_id"]))   # = CurriculumUnitPage.tsx r. 71–72
do_waarden = [int(r["display_order"] or 0) for r in app]
sk_reeks = [r["skill"] for r in app_volg]
blokken = [k for i, k in enumerate(sk_reeks) if i == 0 or k != sk_reeks[i - 1]]
if len(blokken) != len(set(blokken)): add("(week)", "display_order", " → ".join(blokken), "app-volgorde: een vaardigheid staat in meer dan één blok (de unitpagina sorteert op display_order, item_id)", "v1.8 (a) · P1-11a N1-W07 · CurriculumUnitPage.tsx r. 71–72", "K")
elif [k for k in VOLG_SKILL if k in blokken] != blokken: add("(week)", "display_order", " → ".join(blokken), f"app-volgorde: de vaardigheden staan niet in de didactische volgorde ({' → '.join(k for k in VOLG_SKILL if k in blokken)})", "v1.8 (a) · P1-11a N1-W07", "K")
reeks_volg = collections.OrderedDict()
for r in app_volg:
    p_ = r["item_id"].split("-")
    if len(p_) == 4: reeks_volg.setdefault("-".join(p_[:3]), []).append(r["item_id"])
for groep, lst in reeks_volg.items():
    nrs = [subnr(i) for i in lst]
    if nrs != sorted(nrs): add(groep, "display_order", ", ".join(lst), f"app-volgorde: de subitems staan niet in numerieke volgorde ({', '.join(str(n) for n in nrs)})", "v1.8 (a) · P1-11a N1-W07 · CurriculumUnitPage.tsx r. 71–72", "K")
do_info = f"display_order: {len(set(do_waarden))} unieke waarden · {sum(1 for d in do_waarden if d == 0)} nullen · bereik {min(do_waarden) if do_waarden else 0}–{max(do_waarden) if do_waarden else 0}"
# --- v1.8.1 (c): nullen naast niet-nullen (K), dubbel nummer buiten één reeks (K), niet 1 … n (H) ---
nz_ = [d for d in do_waarden if d]
if nz_ and len(nz_) < len(do_waarden):
    add("(week)", "display_order", f"{len(do_waarden) - len(nz_)} × 0 naast {len(nz_)} × ≠ 0", "app-volgorde: nullen naast niet-nullen (de nullen komen vóór alle andere items te staan; één klik op ↑/↓ herschrijft bovendien alle rijen naar 0 … n-1)", "v1.8.1 (c) · 9T P2 V4 · CurriculumUnitPage.tsx r. 131–138", "K")
dup_ = collections.defaultdict(list)
for r in app: dup_[int(r["display_order"] or 0)].append(r["item_id"])
for d_, ids_ in sorted(dup_.items()):
    if d_ and len(ids_) > 1 and len({"-".join(i.split("-")[:3]) for i in ids_}) > 1:
        add("(week)", "display_order", ", ".join(ids_), f"app-volgorde: display_order {d_} wordt gedeeld buiten één subitemreeks (B12-macro: alleen een macro-rij en haar subitems delen een nummer)", "v1.8.1 (c) · 9T P2 V4", "K")
if nz_:
    uniek_ = sorted(set(nz_))
    if uniek_ != list(range(1, len(uniek_) + 1)):
        add("(week)", "display_order", f"bereik {uniek_[0]}–{uniek_[-1]} · {len(uniek_)} unieke waarden", "app-volgorde: de nummers zijn niet 1 … n (gat of buiten bereik)", "v1.8.1 (c) · 9T P2 V4", "H")

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

# --- v1.8.2 (N1-W08): B33, getal-gatentekst, meerdere-antwoorden, letterkeuze, positiecue, كل ------------------------------------
# Na alle v1.8.1-regels, zodat de bestaande bevindingen hun RT-nummer houden. De norm van elke nieuwe bevinding begint met «v1.8.2 (x)».
VANAF_W08 = 8   # (b2) en (f): conventies uit P1 N1-W08 (gelden voor de volgende weken); in eerdere weken alleen een informatieregel
OOST = re.compile(r"[\u0660-\u0669\u06F0-\u06F9\u066B\u066C]")            # B33: Oost-Arabisch, Perzisch, decimaal- en duizendteken
LETTER_AR = r"[\u0621-\u063A\u0641-\u064A\u0671-\u06D3]"
AR_WOORD = re.compile(LETTER_AR + r"+")
HAMZA_DRAGER = ("\u0623", "\u0625", "\u0624", "\u0626", "\u0622", "\u0654", "\u0655")   # hamza op of onder een drager
GETAL_SEG = re.compile(r"[0-9]+|[0-9]{2}:[0-9]{2}")
CIJFERZIN = re.compile(r"cijfers 0[–-]9")
PUNT_PER = re.compile(r"\bpunt(?:en)? per\b|\bper (?:juist(?:e)? )?(?:woord|vorm|antwoord|optie|letter) (?:een|één|1) punt\b", re.I)
KUL = "\u0643\u0644"   # het skelet كل (كُلْ «eet!», كُلُّ «elk/alle»)
KUL_VELDEN = ("instruction_nl", "question", "options", "correct_answer", "feedback_correct", "feedback_incorrect", "input_arabic", "input_translation_nl")
MA_VELDEN = ("instruction_nl", "question", "feedback_correct", "feedback_incorrect", "input_translation_nl")
wk_n = int(wk)
def heeft_cijfer(s): return any(unicodedata.category(ch) == "Nd" for ch in (s or ""))
def nfc(s): return unicodedata.normalize("NFC", s or "")
def vind_pos(sl, opts_, st):   # (e): sleutelpositie zoals de app vergelijkt, ook met een gloss ' (…)' in de sleutel
    for f_ in (nk, lambda x: app_norm(x, st)):
        for kand in (sl, GLOSS.sub("", sl).strip()):
            for i, o in enumerate(opts_):
                if kand and f_(o) == f_(kand): return i
    return None
info_b2, info_f, kul_treffers = [], [], []
AR_WOORD_V = re.compile(r"[\u0621-\u065F\u0670]+")   # v1.9: woord mét tashkīl, om de vormen van één skelet te onderscheiden
n_v182_start = len(bev)
for r in app:
    iid = r["item_id"]; typ = r["exercise_type"]; strict = r["strict_tashkeel"] == "true"
    opts = jl(r["options"]); opts = [o for o in opts if isinstance(o, str)] if isinstance(opts, list) else []
    co = jl(r["correct_options"]); co = [x for x in co if isinstance(x, str)] if isinstance(co, list) else []
    ca = r["correct_answer"] or ""
    macro = bool(MACRO.search(ca))
    # (a) B33 — elk veld
    for v, s in r.items():
        if not isinstance(v, str) or not isinstance(s, str): continue
        tek = OOST.findall(s)
        if tek:
            soorten = sorted(set(tek))
            add(iid, v, s, f"B33: {len(tek)} teken(s) buiten 0–9 ({' '.join(soorten)} = {', '.join(f'U+{ord(t):04X}' for t in soorten)}); in het hele curriculum alleen de cijfers 0–9, ook in Arabische tekst", "v1.8.2 (a) · B33 · P1-27 N1-W08", "K")
    # (b) getal-gatentekst
    if typ == "gatentekst" and ca and not macro and not ca.lstrip().startswith("{"):
        segs = ca.split("|")
        if heeft_cijfer(ca):
            fout = [sg for sg in segs if not GETAL_SEG.fullmatch(sg.strip())]
            if fout: add(iid, "correct_answer", ca, f"getal-gatentekst: segment(en) {' · '.join(repr(x) for x in fout)} niet `^[0-9]+$` of `^[0-9]{{2}}:[0-9]{{2}}$`; de app vergelijkt per segment na normItem (geen omzetting naar 0–9, geen eenheid) → een juist getal telt als fout", "v1.8.2 (b1) · B29/B33 · 9T P1 V1 · CurriculumItemPage.tsx r. 63–73, 271–277", "K")
            if not CIJFERZIN.search(r["instruction_nl"] or ""):
                if wk_n >= VANAF_W08: add(iid, "instruction_nl", r["instruction_nl"], "getal-gatentekst zonder de vaste cijferzin «cijfers 0–9» in de Opdracht (een Arabisch gsm-toetsenbord geeft andere cijfers, die normItem niet omzet)", "v1.8.2 (b2) · B29 (aanvulling P1 N1-W08) · P1-11 · register #40", "H")
                else: info_b2.append(iid)
        if r["question"]:
            q_ = app_norm(r["question"], strict)
            raak = [sg for sg in segs if app_norm(sg, strict) and re.search(r"(?<!\w)" + re.escape(app_norm(sg, strict)) + r"(?!\w)", q_)]
            if raak: add(iid, "question", r["question"], f"de Vraag bevat de sleutel ({' · '.join(raak)}); de app toont de Vraag grijs boven het gat → het antwoord staat in beeld", "v1.8.2 (b3) · B29 (rechtgezet P1 N1-W08) · 9T P1 S1 · CurriculumItemPage.tsx r. 430", "H")
    # (c) meerdere-antwoorden
    if typ == "meerdere-antwoorden":
        set_co = {app_norm(x, strict) for x in co}
        if co and set_co <= {app_norm(o, strict) for o in opts}:
            verwacht = "، ".join(o for o in opts if app_norm(o, strict) in set_co)
            if nfc(ca).strip() != nfc(verwacht): add(iid, "correct_answer", ca, f"correct_answer «{ca}» ≠ de juiste opties in optievolgorde met «، »: «{verwacht}»; de app keurt op correct_options en toont na een fout antwoord correct_answer", "v1.8.2 (c1) · 9T P1 V2 · P1-5 N1-W08 · §13.3-11/§13.4-1 · CurriculumItemPage.tsx r. 682–696", "H")
        dub = [o for o, n_ in collections.Counter(opts).items() if n_ > 1]
        if dub: add(iid, "options", r["options"], f"meerdere-antwoorden met een exact dubbele optie ({' · '.join(dub)}): één klik vinkt beide vakjes aan en de app kan ze niet onderscheiden", "v1.8.2 (c2) · 9T P1 V2 · CurriculumItemPage.tsx r. 397–413", "H")
        for v in MA_VELDEN:
            m = PUNT_PER.search(r[v] or "")
            if m: add(iid, v, r[v], f"belooft «{m.group(0)}», maar de app keurt meerdere-antwoorden alles-of-niets (alle punten of 0)", "v1.8.2 (c3) · 9T P1 V2 · P1-5 N1-W08 · CurriculumItemPage.tsx r. 257–264, 340", "H")
    # (d) letterkeuze met meer dan één optieletter in de stimulus
    if typ == "meerkeuze" and opts and not macro and r["input_arabic"]:
        lt = [kaal(GLOSS.sub("", o)) for o in opts]
        if all(len(x) == 1 and re.fullmatch(LETTER_AR, x) for x in lt):
            stim = kaal(r["input_arabic"])
            hier = [x for x in dict.fromkeys(lt) if x in stim or (x == "\u0621" and any(h in stim for h in HAMZA_DRAGER))]
            if len(hier) > 1: add(iid, "input_arabic", r["input_arabic"], f"letterkeuze: de stimulus bevat {len(hier)} van de optieletters ({' · '.join(hier)}; sleutel {ca}) → de leerder kan meer dan één optie verdedigen", "v1.8.2 (d) · T1 N1-W08", "H")
    # (f) v1.9: het skelet كل alleen verzamelen; de week beslist hierna (één vorm = inforegel, twee of meer = botsing)
    for v in KUL_VELDEN:
        waarden = opts if v == "options" else [r[v] or ""]
        vormen_hier = sorted({unicodedata.normalize("NFC", w) for w in AR_WOORD_V.findall(unicodedata.normalize("NFC", " ".join(waarden))) if kaal(w) == KUL})
        if vormen_hier: kul_treffers.append((iid, v, r[v], vormen_hier))
# (f) v1.9: de week beslist — twee of meer vormen van het skelet كل in leerdersvelden = botsing (H), één vorm = inforegel
KUL_VORMEN = sorted({vm for _, _, _, vl in kul_treffers for vm in vl})
if kul_treffers:
    if wk_n >= VANAF_W08 and len(KUL_VORMEN) >= 2:
        for iid_, v_, tekst_, vl_ in kul_treffers:
            add(iid_, v_, tekst_, f"het skelet كل met {len(KUL_VORMEN)} vormen in de week ({' en '.join(KUL_VORMEN)}): zonder tashkīl ziet de leerder één woord", "v1.9 (f) · T1 · P1-9 N1-W08", "H")
    else:
        info_f = [f"{iid_}:{v_}" for iid_, v_, _, _ in kul_treffers]

# (e) positiecue per subitemreeks
reeksen_mk = collections.OrderedDict()
for r in app:
    p_ = r["item_id"].split("-")
    if len(p_) == 4 and r["exercise_type"] == "meerkeuze": reeksen_mk.setdefault("-".join(p_[:3]), []).append(r)
for groep, rs in reeksen_mk.items():
    if len(rs) < 3: continue
    posl = []
    for r in rs:
        o_ = jl(r["options"]); o_ = [o if isinstance(o, str) else "" for o in o_] if isinstance(o_, list) else []
        posl.append(vind_pos(r["correct_answer"] or "", o_, r["strict_tashkeel"] == "true") if len(o_) >= 3 else None)
    if None in posl or len(set(posl)) != 1: continue
    if any(b[1] == groep and b[2] == "options" and b[6] == "H" and "dezelfde plaats" in b[4] for b in bev[:n_v182_start]): continue   # v1.1 meldt het al
    add(groep, "options", "sleutelpositie " + ",".join(chr(65 + p) for p in posl), f"positiecue: de sleutel staat in alle {len(posl)} subitems op plaats {chr(65 + posl[0])} (gezocht zoals de app vergelijkt, ook zonder gloss ' (…)'); de app schudt meerkeuze-opties niet", "v1.8.2 (e) · T1 N1-W08 · CurriculumItemPage.tsx r. 386–395", "H")
# ===== v1.10 (N1-W11 groep 1, P1-beslissing 8; 3T-gaten gevonden door te lezen in P1) =====
# Alle v1.9-regels staan ongewijzigd hierboven; de nieuwe bevindingen komen hierna en hun norm begint met «v1.10 (x)».
NOTITIE10 = re.compile(r"Comp ?\d|\bVE\d\b|\bwk ?\d+\b|H\d-gate|\[verschijnt|GEAUTEERD|\bremedy\b|\bcanon\b|\bclinic\b|\bkaartje\b|\btail\b|V\d\d-\d|\d[A-Z]\.\d")
B2_FOUT = [("'", "hamza als apostrof (B2: ʾ)"), ("aa", "dubbele klinker (B2: ā)"), ("ii", "dubbele klinker (B2: ī)"),
           ("uu", "dubbele klinker (B2: ū)"), ("āā", "dubbele macron"), ("ḏ", "ḏ (B2: dh)"), ("oe", "oe (B2: ū)")]
LTR10 = ("instruction_nl", "question", "feedback_correct", "feedback_incorrect", "correct_answer", "input_translation_nl")

r_vraag = {r["item_id"]: (r["question"] or "") for r in app}

# (a) positiecue: een REGELMATIG patroon in een meerkeuzereeks, ook bij 2 opties (v1.8.2 (e) ziet alleen «alle sleutels op één plaats» en eist ≥3 opties)
for groep, rs in reeksen_mk.items():
    if len(rs) < 4: continue
    posl10 = []
    for r in rs:
        o_ = jl(r["options"]); o_ = [o if isinstance(o, str) else "" for o in o_] if isinstance(o_, list) else []
        posl10.append(vind_pos(r["correct_answer"] or "", o_, r["strict_tashkeel"] == "true") if len(o_) >= 2 else None)
    if None in posl10: continue
    if any(b[1] == groep and "positiecue" in b[4] for b in bev): continue
    for per in (1, 2, 3):
        if len(posl10) >= 2 * per and posl10 == (posl10[:per] * ((len(posl10) + per - 1) // per))[:len(posl10)]:
            vorm = "·".join(chr(65 + p) for p in posl10)
            add(groep, "options", "sleutelpositie " + vorm,
                f"positiecue: de sleutel volgt in alle {len(posl10)} subitems een regelmatig patroon met periode {per} ({vorm}); wie dat ziet, haalt de volle score zonder te luisteren of te lezen",
                "v1.10 (a) · §13.4-7 · §13.3-3 · §13.10-3", "H")
            break

# (b) INGETROKKEN vóór gebruik (P1 N1-W11, 3T): de aanname «de app toont vier opties» (§13.11-10) is onjuist.
#     CurriculumItemPage.tsx @ 244de3e rendert bij meerkeuze en meerdere-antwoorden ALLE opties (opts.map, geen slice):
#     een vijfde optie verdwijnt niet. Regressie W08/W09 toonde 25 live meerkeuze-items met 5 opties zonder defect.
#     §13.11-10 moet in P2 rechtgezet worden; het didactische deel (eigen optieset per subitem) blijft gelden.

# (c) afgekapte Opdracht of Vraag (ongebalanceerde haakjes)
for r in app:
    for v in ("instruction_nl", "question"):
        t = r[v] or ""
        if t.count("(") != t.count(")"):
            add(r["item_id"], v, t, "afgekapte tekst: ongebalanceerde haakjes — de zin is niet af (het nummer of het slot ontbreekt)", "v1.10 (c) · B7 punt 3", "K")

# (d) scaffold- en productiecodes die de v1.9-NOTITIE-regex niet dekt
for r in app:
    for v in LEERDERSVELDEN + ("correct_answer",):
        for m in sorted({m.group(0) for m in NOTITIE10.finditer(r[v] or "")}):
            add(r["item_id"], v, r[v], f"scaffold- of productiecode «{m}» in een veld dat de leerder ziet", "v1.10 (d) · §13.2-6 · §13.10-5", "H")

# (e) twee items van de week die op ALLE DRIE gelijk zijn: stimulus, Vraag en sleutel. Een gedeelde stimulus alleen is
#     verplicht bij een dialoogreeks (§13.3-9) en een gedeelde Vraag alleen is normaal in een discriminatiereeks
#     (W08 luisteren-01: zelfde Vraag, andere stimulus per subitem). Alle drie gelijk = het tweede item meet niets nieuws.
dub = collections.defaultdict(list)
for r in app:
    st = app_norm(r["input_arabic"] or ""); vr = app_norm(r["question"] or ""); sl = app_norm(r["correct_answer"] or "")
    if st and vr and sl: dub[(st, vr, sl)].append(r["item_id"])
for (st, vr, sl), v in dub.items():
    if len(v) > 1:
        for iid in v:
            add(iid, "question", r_vraag.get(iid, "")[:70], f"dubbel item: {' en '.join(v)} hebben dezelfde stimulus, dezelfde Vraag en dezelfde sleutel — het tweede meet niets nieuws", "v1.10 (e) · §13.9-7 · §2 (één vraag per item)", "H")

# (f) B2-transliteratie in input_transliteration
for r in app:
    t = re.sub(r"\([^()]*\)", " ", r["input_transliteration"] or "")   # v1.10 (f): Nederlandse gloss tussen haakjes telt niet mee
    for naald, uitleg in B2_FOUT:
        if naald in t:
            add(r["item_id"], "input_transliteration", t[:120], f"transliteratie wijkt af van B2: {uitleg}", "v1.10 (f) · B2", "M")
b33_lijst = sum(1 for rs in lijst.values() for r in rs if OOST.search(r["tekst"] or ""))
nieuw = collections.Counter(re.match(r"v1\.(?:8\.2|9|10) \((\w+)\)", b[5]).group(1) + " " + b[6] for b in bev[n_v182_start:])

print(f"# check_{niv}-W{int(wk):02d} · check v{VERSIE}{' · skill='+SKILL if SKILL else ''} · app {len(app)} items · lijst {len(lijst)} items / {regels} regels")
print("types:", dict(collections.Counter(r["exercise_type"] for r in app)))
print("max veldlengte:", dict(sorted(maxlen.items(), key=lambda kv: -kv[1])))
c = collections.Counter(b[6] for b in bev)
print(f"bevindingen: {len(bev)} · K {c.get('K',0)} · H {c.get('H',0)} · M {c.get('M',0)} · L {c.get('L',0)} · bidi-info (RTL-reeksen zonder Latijnse lijst): {bidi_info}")
print(f"info (c) één vorm, meerdere vertalingen: {len(info_c)}" + (f" · {info_c}" if info_c else ""))
print("info (v1.8 a) " + do_info)
print("info (v1.8.2) nieuwe bevindingen: " + str(len(bev) - n_v182_start) + (" · " + " · ".join(f"({k_.split()[0]}) {n_} {k_.split()[1]}" for k_, n_ in sorted(nieuw.items())) if nieuw else ""))
print(f"info (v1.8.2 a) B33 in de lijst (bron nr. 2, geen bevinding): {b33_lijst} regel(s)")
print(f"info (v1.8.2 b2/f) vóór W{VANAF_W08:02d} (geen bevinding): getal-gatentekst zonder «cijfers 0–9» {len(info_b2)}" + (f" ({', '.join(info_b2)})" if info_b2 else "") + f" · كل als los woord {len(info_f)}" + (f" ({', '.join(info_f)})" if info_f else ""))
print(f"info (v1.9 f) skelet كل in leerdersvelden: {len(KUL_VORMEN)} vorm(en) in de week" + (f" ({' · '.join(KUL_VORMEN)}) · {len(kul_treffers)} veldvoorkomen(s)" if KUL_VORMEN else "") + (" → botsing, bevindingen H" if len(KUL_VORMEN) >= 2 and wk_n >= VANAF_W08 else (" → niets te melden" if not KUL_VORMEN else " → geen bevinding (één vorm: vaste formule of gewoon woord; P1-9 N1-W08 gaat over de botsing)")))
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
