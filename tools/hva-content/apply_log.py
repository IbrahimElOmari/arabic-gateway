# apply_log.py v1.2 — Verbeteraar-T (4T) · past ALLEEN logregels met status=goedgekeurd (of aangepast, met de tekst uit besluit_ibra)
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
import sys, csv, hashlib, collections, re, unicodedata
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
SCHRIJFBAAR = set(TXT + JSB + NUM + BOOL)          # = KOL van maak_sql (v4.1/v4.2)
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
rows = list(csv.DictReader(open(exp, encoding="utf-8", newline=""), delimiter="\t"))
cols = list(rows[0].keys())
if week: rows = [r for r in rows if int(r["week"]) == int(week)]
by_id = {r["item_id"]: r for r in rows}
assert len(by_id) == len(rows), "dubbele item_id in de export"
log = [l.rstrip("\n").split("\t") for l in open(logpad, encoding="utf-8")]
kop, log = log[0], log[1:]
K = {c: i for i, c in enumerate(kop)}
VAST = {"item_id", "unit_code", "week", "skill", "display_order", "id", "created_at", "updated_at"}
toegepast, overgeslagen, geweigerd, andere_week = [], [], [], []
werk = {iid: dict(r) for iid, r in by_id.items()}
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
    if iid not in werk: geweigerd.append((wid, "item", f"item {iid} niet in de export")); continue
    if veld not in cols or veld in VAST: geweigerd.append((wid, "veld", f"veld {veld} niet toegestaan")); continue
    if veld not in SCHRIJFBAAR: geweigerd.append((wid, "veld", f"veld {veld} wordt door maak_sql niet geschreven (v1.1-whitelist)")); continue
    oud = unesc(r[K["oud"]])
    arabisch_gewijzigd = (ar_tokens(nieuw) and ar_tokens(nieuw) != ar_tokens(oud)) or (veld == "input_transliteration" and nieuw != oud and nieuw != "")
    verwacht = "aangepast" if status == "aangepast" else "ja"
    if (arabisch_gewijzigd or wid in review) and review.get(wid) != verwacht:
        oorzaak = "geen --review meegegeven" if not reviewpad else ("niet in de review" if wid not in review else f"review akkoord = '{review[wid]}', status = {status}")
        geweigerd.append((wid, "review", f"native-review ontbreekt of past niet bij de status (B11): {oorzaak}")); continue
    rr = revrij.get(wid)
    if rr and rr.get("deel") != "afgeleid" and rr.get("veld") == veld:          # v1.2: de review bindt de inhoud
        goed = unesc(rr.get("voorgesteld", "")) if status == "goedgekeurd" else ibra_tekst(wid)
        if goed is None or nieuw != unesc(goed):
            geweigerd.append((wid, "review", "inhoud ≠ de tekst die in de review is goedgekeurd")); continue
    if werk[iid][veld] != oud:
        geweigerd.append((wid, "oud", f"oud wijkt af: export={werk[iid][veld][:60]!r} log={oud[:60]!r}")); continue
    werk[iid][veld] = nieuw
    toegepast.append((wid, iid, veld, oud, nieuw))
print(f"logregels: {len(log)} · toegepast: {len(toegepast)} · overgeslagen (niet goedgekeurd): {len(overgeslagen)} · andere week: {len(andere_week)} · geweigerd: {len(geweigerd)}")
for wid, _, why in geweigerd: print("  GEWEIGERD", wid, why)
if "--stil" not in sys.argv:
    for wid, iid, veld, oud, nieuw in toegepast: print(f"  {wid} {iid} {veld}: {oud[:50]!r} → {nieuw[:50]!r}")
if geweigerd:
    c = collections.Counter(o for _, o, _ in geweigerd)
    print("STOP: geen enkele regel toegepast. Oorzaken: " + " · ".join(f"{n}× {o}" for o, n in c.items()) +
          ". (oud = moet letterlijk overeenkomen met de export; review = native-review 'ja' ontbreekt; veld/item = regel hoort niet in deze apply)")
    sys.exit(2)
voor = collections.Counter(c for r in rows for c in cols if r[c] != "")
na = collections.Counter(c for r in werk.values() for c in cols if r[c] != "")
gew = collections.Counter(iid for _, iid, *_ in toegepast)
print("gevulde velden vóór → na:", {c: (voor[c], na[c]) for c in cols if voor[c] != na[c]} or "geen verschil in vulling")
print("gewijzigde velden per item:", dict(gew), "· items geraakt:", len(gew), "/", len(rows))
if apply and not toegepast:
    print("STOP: 0 regels toegepast (verkeerde --week, log of status?)"); sys.exit(2)
if apply:
    with open(uit, "w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh, delimiter="\t", lineterminator="\n", quoting=csv.QUOTE_MINIMAL)
        w.writerow(cols)
        for r in rows: w.writerow([werk[r["item_id"]][c] for c in cols])
    print("geschreven:", uit, "· md5", hashlib.md5(open(uit, "rb").read()).hexdigest())
else:
    print("droogloop — niets geschreven (geef --apply mee om te schrijven)")
