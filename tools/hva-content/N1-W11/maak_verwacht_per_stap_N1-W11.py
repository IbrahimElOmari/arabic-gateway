# maak_verwacht_per_stap_N1-W11.py v2.8 (= maak_verwacht_per_stap_N1-W10.py v2.7, md5 c69d7e2b7d2b8aa5014685da72c12bcc, voor W11) — Maker-T (7T) · P3 N1-W11:
#   alleen de rooktestlijst is nieuw (12 regels, 14 inzendingen, één per type en nakijkpad van W11: strict-meerkeuze, de typewissels naar meerkeuze,
#   gatentekst en open-tekst zonder score, audio-opname, open-tekst met 1 en 5 punten); W11 heeft geen uploaditem. --pogingen-hw-ref voor W11 = 0 (stap 0 P3).
# maak_verwacht_per_stap_N1-W10.py v2.7 (= v2.6, md5 64d82889497bf9278673c9147fb4e34f, + de P3-ministap N1-W10; 9T DA-T-01) — Maker-T (7T) ·
#   alleen de verwachting van slot_ref: `pogingen_hw_ref` komt nu uit `--pogingen-hw-ref` (standaard 0, dus zonder de optie is het gedrag van v2.6 ongewijzigd) in plaats
#   van een vaste 0, en de twee tekstregels erover noemen die waarde en de juiste week (v2.6 schreef «stap 0: pogingen_w08 0», een restant van W08/W09). Week 10 heeft
#   2 pogingen van een stafaccount uit juni 2026 op U10-grammatica-02-2 (stap 0 W10, status_log_P4_N1-W09.md); met de vaste 0 stopte p4_stap op regel 4 (slot_ref) en
#   gaf de keuzelijst daar geen route «P4: verder». Alle SQL, rooktest_verwacht en de overige inhoud van slot_verwacht blijven byte-gelijk aan v2.6.
# Basis: de kop van v2.6 hieronder.
# maak_verwacht_per_stap_N1-W10.py v2.6 (= v2.5, md5 36809fe0e11f5e1c3e254ee66a62d892, + de P3-delta-4 N1-W08; 8T C-T17, C-T18; 8D C-D20, C-D21, C-D24, C-D25 (3)) — Maker-T (7T) ·
#   alleen tekst in VERWACHT_PER_STAP.md (alle SQL, slot_verwacht en rooktest_verwacht byte-gelijk aan v2.5):
#  - de wachtregel zit in p4_log_stap v1.13 (twee gelijke standen ≥ 2 min; de laatste stand telt, ook een late commit na «stand = vóór»: V2 laat het onzekere blok toe);
#    geen losse ROLLBACK na een ✓ schrijfstap gevolgd door een READ ONLY-STOP; Herstel 3 met de vaste aanbevolen zin (keuzelijst); Herstel 4: 4b alleen na keuze (2) met
#    dezelfde zin; Herstel 5: hervatten na de geplande pauze (de hervatprompt, Werkwijze 11 van het draaiboek); Herstel 6: aanbevolen «P4: wachten»;
#  - de slotstappen: «rooktest start» of «rooktest start, zonder herkansing» (de route van de fotoregel), n = elke keer «Indienen» (ook een «Fout»), de fotoregel 0 … 1 + h.
# Basis: de kop van v2.5 hieronder.
# maak_verwacht_per_stap_N1-W10.py v2.5 (= v2.4, md5 4b98b8a9f657315a9c48eeb03a4b7c42, + de P3-delta-3 N1-W08; 9D DA-D01, 9T DA-T-01 … DA-T-04, DA-T-08, DA-T-13) — Maker-T (7T) · alleen tekst in
#   VERWACHT_PER_STAP.md (alle SQL, slot_verwacht en rooktest_verwacht byte-gelijk aan v2.4):
#  - F1 (DA-D01, DA-T-08): de kolom «akkoord» van de terugdraaitabel is een f-string (v2.4 r. 153 toonde letterlijk «{TZIN[r['blok']]}»); de keten toetst sjabloonresten (toets_sjabloonresten v1.0);
#  - F2/F3 (DA-T-01 … DA-T-04): de standbepaling en Herstel 2, 3 en 5 volgen p4_log_stap v1.12: eerst de losse ROLLBACK, dan de stand; na een onderbroken schrijfstap beslist
#    de stand (na = «al uitgevoerd (onderbroken aanroep, stand = na)», vóór = opnieuw op Ibra's keuze, gemengd = (2) of (4)); een nieuw log zet P4 niet halverwege voort (DA-T-13 d).
# Basis: de kop van v2.4 hieronder.
# maak_verwacht_per_stap_N1-W10.py v2.4 (= v2.3, md5 01da9826311bb8a008a67405bc8222ef, + de P3-delta-2 N1-W08; 8D C-D14, C-D16; 8T C-T12) — Maker-T (7T) · alleen tekst in
#   VERWACHT_PER_STAP.md (alle SQL, slot_verwacht en rooktest_verwacht byte-gelijk aan v2.3):
#  - E2: Herstel 1 = de keuzelijst na een STOP, letterlijk uit p4_tekst_<week>.py (`keuzelijst`; dezelfde tekst als Vooraf 5 van het draaiboek, de keten toetst dat); Herstel 3
#    («toegepast: verder met het volgende blok») en Herstel 6 («een nieuwe gr met een nieuwe verwachting») zijn vervangen door de keuzes van die lijst;
#  - E4 (C-D16): de terugdraaitabel en de regels «tot en met …» noemen Ibra's zin «P4: terugdraaien tot en met <blok>, blok V eerst» (vanaf het offline-blok met «; … gaan offline»);
#  - titel «SQL v4.10» (maak_sql v4.10: alleen de opruimgrendel, de SQL is byte-gelijk).
# Basis: de kop van v2.3 hieronder.
# maak_verwacht_per_stap_N1-W10.py v2.3 (= v2.2, md5 50ed129b5471244cdcdbb0473a4bf4d3, + de P3-delta N1-W08) — Maker-T (7T) · P3 N1-W08 · 8D C-D02, 8T C-T01, C-T02, C-T06, C-T08:
#  - D5 (C-T06): `rooktest_<week>.sql` geeft de pogingen als één JSON-lijst (jsonb_agg, als tekst) van [item_id, is_correct, score, upload, mimetype, created_at]; een ';' of '|'
#    in een mimetype of tekstveld (bv. audio/webm;codecs=opus) breekt de aggregaatrij niet meer (p4_stap v1.10 leest de lijst);
#  - D2 (C-D02, C-T02): de handstap van een blokvoorwaarde (r03_gelezen) staat direct na `start`, vóór `drift`, met `--registerregel` en `--bewijs-md5` = de md5 van het
#    uitslagbestand p3/<code>/<CODE>_UITSLAG_<week van het blok>.md met de regel «<CODE>: GROEN» (p4_log_stap v1.10 eist dat bestand);
#  - D4 (C-T01) en D10 (C-T08): het herstel na een STOP is de STOP-route (P4 stopt; splitsen = een P3-ministap met een eigen bundel); terugdraaien (rollback en 4b) van elk
#    blok alleen met `--akkoord-ibra` = Ibra's letterlijke opdracht («terug» + dit blok of een eerder blok, of «alle blokken»), ook bij de voorcontrole; titel «SQL v4.9».
# Basis: de kop van v2.2 hieronder.
# maak_verwacht_per_stap_N1-W10.py v2.2 (= maak_verwacht_per_stap_N1-W07.py v2.1.2, md5 a931d5330dc4ff2e5e489b09bcd0e314, voor W08) — Maker-T (7T) · P3 N1-W08 ·
#   architectuur T v1.0 §2, §4–§6; B17 aanvulling P1 N1-W08 (1), (3) en P2 N1-W08 (2)–(4); 9T P2 V4 (P2-10), S3. Nieuw t.o.v. W07 v2.1.2:
#  - weken uit de aanroep (`--week <w> <NA> <VOOR>`, de eerste = de hoofdweek HW) en uit het manifest; geen weekletterlijk buiten de kop; twee varianten
#    (met en zonder W07n) = twee SQL-roots, elk met eigen slot-, zicht-, drift-, C10- en rooktestbestanden;
#  - C10 is live (B31): alleen `c10/c10_bewijs.sql` (c10_na, READ ONLY) met de nieuwe array; geen c10_voor/droogloop/update meer;
#  - per blok «wat een terugdraai meesleept» (P2-10, 9T P2 V4): welke latere blokken eerst terug moeten (en wat die terugdraaien), welke typewissels
#    terugkeren, welke items weer gepubliceerd of juist offline gaan (de offline-rollback van v4.8 met akkoord van Ibra), B33-cijfers die terugkeren,
#    display_order terug naar 0; de offline-keten in de standbepaling (eindstand na een volledige terugdraai mét offline-rollback);
#  - de rooktest met ondergrens `rooktest_start` (B17 P1 N1-W08 (1)): `rooktest_start_N1-W08.sql` (READ ONLY: now() in UTC met microseconden en het aantal
#    pogingen van de testleerder) en `rooktest_N1-W08.sql` ZONDER vast venster (alle pogingen van de testleerder, created_at in UTC met microseconden);
#    p4_stap neemt alleen de pogingen ≥ rooktest_start; een poging tussen slot_ref en rooktest_start = STOP; `rooktest_verwacht_N1-W08.tsv` per regel;
#  - slot_tellingen v4: `pogingen_u<HW>` (0 bij slot_ref); leerderszicht v6: leerder met toegang tot U<HW>.
# Gebruik: python3 -I maak_verwacht_per_stap_N1-W10.py <sql-root> --week 8 <NA> <VOOR> [--week 7 <NA> <VOOR> …] --rijen-voor 2323 --testleerder <uuid>
#          --drift-bron <export N1 VOOR (30 kolommen)> --bucket-live "<a,b,…>" [--zicht <live JSON van P3>] [--ref-p3 <live slot_ref JSON van P3>]
import sys, os, csv, json, hashlib, collections, re, subprocess
csv.field_size_limit(10**9)
VERSIE = "v2.7"
B = sys.argv[1]; A = sys.argv[2:]
PAAR = collections.OrderedDict()
while "--week" in A:
    i = A.index("--week"); PAAR[int(A[i + 1])] = (A[i + 2], A[i + 3]); del A[i:i + 4]
opt = lambda n: A[A.index(n) + 1] if n in A else None
HW = next(iter(PAAR)); WKN = lambda w: f"N1-W{w:02d}"; NAAM = lambda n: f"{n}_{WKN(HW)}"
RIJEN_VOOR = int(opt("--rijen-voor")); TL = opt("--testleerder"); assert TL and re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", TL), "--testleerder <uuid> is verplicht (P1-16a)"
ZICHT = json.load(open(opt("--zicht"), encoding="utf-8"))["rows"][0] if opt("--zicht") else None
REFP3 = json.load(open(opt("--ref-p3"), encoding="utf-8"))["rows"][0]["pogingen_totaal"] if opt("--ref-p3") else None
BUCKET = opt("--bucket-live"); assert BUCKET, "--bucket-live <de array na C10, stap 0> is verplicht"
PHWREF = int(opt("--pogingen-hw-ref") or 0)   # v2.7: de gemeten pogingen op de hoofdweek bij stap 0 (W11: 0, stap 0 P3); 0 = het gedrag van v2.6
assert PHWREF >= 0, "--pogingen-hw-ref <n> mag niet negatief zijn"
assert all(x in BUCKET.split(",") for x in ("image/jpeg", "image/png", "image/heic")), "--bucket-live zonder beeldtypen: C10 niet live"
M = [dict(zip(("volgorde", "week", "blok", "map", "md5_verwacht", "week_voor", "week_na", "soort", "md5_sql"), l.rstrip("\n").split("\t"))) for l in list(open(f"{B}/BLOKKEN_MANIFEST.tsv", encoding="utf-8"))[1:]]
for r in M: assert hashlib.md5(open(f"{B}/{r['map']}/verwacht.txt", "rb").read()).hexdigest() == r["md5_verwacht"], r["map"]
VW = {r["blok"]: dict(l.rstrip("\n").split("\t", 1) for l in open(f"{B}/{r['map']}/verwacht.txt", encoding="utf-8")) for r in M}
assert all(r["soort"] == "update" for r in M), "deze week kent geen insertblokken"
VBLOK = M[-1]["blok"]; assert VW[VBLOK].get("kern") == "display_order", "het laatste blok van het manifest moet het display_order-blok zijn (9T P2 V3)"
WEKEN = tuple(int(w[-2:]) for w in dict.fromkeys(r["week"] for r in M)); assert WEKEN[0] == HW and set(WEKEN) <= set(PAAR), (WEKEN, list(PAAR))
NAP = {w: PAAR[w][0] for w in WEKEN}; VOP = {w: PAAR[w][1] for w in WEKEN}
ROFF = next((r["blok"] for r in M if "rollback_offline" in VW[r["blok"]]), None)
ROFF_IDS = VW[ROFF]["rollback_offline"].split(",") if ROFF else []
VWBLOK = {r["blok"]: VW[r["blok"]]["voorwaarde"] for r in M if "voorwaarde" in VW[r["blok"]]}
def lees(p): return list(csv.DictReader(open(p, encoding="utf-8", newline=""), delimiter="\t"))
def uitslag(hs, wk):   # v2.3 (D2): het uitslagbestand van een handstap-voorwaarde (r03_gelezen → p3/r03/R03_UITSLAG_<week>.md, regel «R-03: GROEN»)
    c = hs.split("_")[0]; C = c.upper(); return f"p3/{c}/{C}_UITSLAG_{wk}.md", re.sub(r"^([A-Z]+)(\d+)$", r"\1-\2", C) + ": GROEN"
DB = opt("--drift-bron"); assert DB, "--drift-bron <export N1 VOOR> is verplicht (v2.1)"
_DR = lees(DB); assert len(_DR) == RIJEN_VOOR, f"drift-bron heeft {len(_DR)} rijen, niet {RIJEN_VOOR}"
_MAXU = max(r["updated_at"] for r in _DR); assert re.fullmatch(r"\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{6}\+00", _MAXU), _MAXU
DRIFT = f"{RIJEN_VOOR}|{_MAXU[:-3]}"
def subitems(ids, m): return [s for s in ids if s.startswith(m + "-") and len(s) == len(m) + 2 and s[-1] in "123456789"]
SLEUTELS = ("items", "b25", "needs_image", "strict", "punten", "ns_audio", "student_opname", "vlaggen", "gepubliceerd", "typen",
            "punten_gep", "typen_gep", "vlaggen_gep", "ns_audio_gep", "strict_gep", "ma_fout", "koppelen_fout", "reeks_fout", "volgorde")
def tel(p):
    R = lees(p); G = [r for r in R if r["is_published"] == "true"]; mp = lambda r: json.loads(r["media_production"]); ids = {r["item_id"]: r for r in R}
    def kfout(r):
        paren = r["correct_answer"].split("|"); opts = json.loads(r["options"])
        return not (all(p.count("=") == 1 for p in paren) and opts == [p.split("=", 1)[0] for p in paren] and len({p.split("=")[1] for p in paren if "=" in p}) == len(paren))
    def mafout(r):
        co = json.loads(r["correct_options"]) if r["correct_options"] else None; opts = json.loads(r["options"])
        return not (co and all(x in opts for x in co))
    def reeksfout(m):
        s = [ids[x]["is_published"] for x in subitems(ids, m)]
        return not (len(set(s)) == 1 and s[0] != ids[m]["is_published"])
    typen = lambda X: "|".join(f"{k}:{v}" for k, v in sorted(collections.Counter(r["exercise_type"] for r in X).items()))
    do = sorted(int(r["display_order"] or 0) for r in R)
    volgorde = "1..n" if do == list(range(1, len(R) + 1)) else ("alle 0" if set(do) == {0} else f"anders ({len(set(do))} waarden, min {do[0]}, max {do[-1]})")
    return dict(items=len(R), b25=sum(1 for r in R if r["exercise_type"] == "meerkeuze" and r["strict_tashkeel"] == "true" and r["correct_answer"] not in json.loads(r["options"] or "[]")),
                needs_image=sum("beeld" in mp(r) for r in R), strict=sum(r["strict_tashkeel"] == "true" for r in R), punten=sum(int(r["points"]) for r in R),
                ns_audio=sum("NS-audio" in mp(r) for r in R), student_opname=sum("student-opname" in mp(r) for r in R),
                vlaggen=sum(r["review_flag"] != "" for r in R), gepubliceerd=len(G), typen=typen(R),
                punten_gep=sum(int(r["points"]) for r in G), typen_gep=typen(G), vlaggen_gep=sum(r["review_flag"] != "" for r in G),
                ns_audio_gep=sum("NS-audio" in mp(r) for r in G), strict_gep=sum(r["strict_tashkeel"] == "true" for r in G),
                ma_fout=sum(mafout(r) for r in G if r["exercise_type"] == "meerdere-antwoorden"), koppelen_fout=sum(kfout(r) for r in G if r["exercise_type"] == "koppelen"),
                reeks_fout=sum(reeksfout(m) for m in ids if subitems(ids, m)), volgorde=volgorde)
SLOT_NA = {w: tel(NAP[w]) for w in WEKEN}; SLOT_VOOR = {w: tel(VOP[w]) for w in WEKEN}
assert all(SLOT_NA[w]["items"] == SLOT_VOOR[w]["items"] for w in WEKEN), "geen nieuwe rijen deze week"
RIJEN_NA = RIJEN_VOOR
for w in WEKEN:
    for k in ("b25", "ma_fout", "koppelen_fout", "reeks_fout"): assert SLOT_NA[w][k] == 0, f"W{w:02d} NA: {k} = {SLOT_NA[w][k]} (moet 0 zijn)"
assert SLOT_NA[HW]["volgorde"] == "1..n" and SLOT_VOOR[HW]["volgorde"] == "alle 0", (SLOT_NA[HW]["volgorde"], SLOT_VOOR[HW]["volgorde"])
def verborgen(p): return ",".join(sorted((r["item_id"] for r in lees(p) if r["is_published"] != "true"), key=lambda x: x.encode()))
RIJ = {w: ({r["item_id"]: r for r in lees(VOP[w])}, {r["item_id"]: r for r in lees(NAP[w])}) for w in WEKEN}
B33 = re.compile("[\u0660-\u0669\u06f0-\u06f9\u066b\u066c]")
def items_blok(r): return [l.split("\t")[0] for l in open(f"{B}/{r['map']}/items.txt", encoding="utf-8")]
def wat_doet_terug(r):   # wat de rollback van dit ene blok zelf verandert (NA van het blok → VOOR van het blok)
    v = VW[r["blok"]]; w = int(r["week"][-2:]); VO, NA_ = RIJ[w]; ids = [i for i in items_blok(r) if i in VO]
    if v.get("kern") == "display_order": return [f"display_order van {len(ids)} rijen terug naar 0 (de leerder ziet de week weer alfabetisch, cultuur eerst; B30)"]
    t = collections.Counter(f"{NA_[i]['exercise_type']} → {VO[i]['exercise_type']}" for i in ids if NA_[i]["exercise_type"] != VO[i]["exercise_type"])
    pub = sorted((i for i in ids if NA_[i]["is_published"] == "false" and VO[i]["is_published"] == "true"), key=lambda x: x.encode())
    b33 = sorted(f"{i} ({', '.join(k for k in VO[i] if B33.search(VO[i][k]))})" for i in ids if any(B33.search(VO[i][k]) for k in VO[i]) and not any(B33.search(NA_[i][k]) for k in NA_[i]))
    off = v.get("rollback_offline", "").split(",") if v.get("rollback_offline") else []
    uit = []
    if t: uit.append("typewissels terug: " + ", ".join(f"{k} ({n})" for k, n in sorted(t.items())))
    if pub: uit.append(f"weer gepubliceerd ({len(pub)}): {', '.join(pub)}")
    if off:
        _o = ", ".join(f"{i} ({VO[i]['exercise_type']}, {NA_[i]['points']} pt)" for i in off)
        uit.append(f"**offline** (`is_published = false`, in hetzelfde statement; v4.8): {_o} — koppelen crasht zonder C7; alleen met een akkoord van Ibra dat de depublicatie noemt; daarna niet opnieuw toepasbaar zonder hergenereren")
    if b33: uit.append(f"**B33-cijfers keren terug** (check v1.8.2 = K): {'; '.join(b33)}")
    pn, pv = sum(int(NA_[i]["points"]) for i in ids), sum(int(VO[i]["points"]) for i in ids)
    if pn != pv: uit.append(f"punten van de blokrijen terug van {pn} naar {pv}")
    if r["blok"] in VWBLOK: uit.append(f"terug naar de stand van vóór dit blok (de stand waarop `{VWBLOK[r['blok']]}` gelezen is)")
    if "c10_grendel" in v: uit.append("zonder C10-grendel (terug naar open-tekst is altijd veilig); geüploade bestanden en pogingen blijven")
    return uit or ["alleen tekstvelden (geen type-, publicatie- of puntenwissel)"]
INH = [r for r in M if r["week"] == WKN(HW) and r["blok"] != VBLOK]
P4T = lambda *a: subprocess.run(["python3", "-I", os.path.join(os.path.dirname(os.path.abspath(__file__)), f"p4_tekst_{WKN(HW)}.py"), *a], capture_output=True, text=True, check=True).stdout   # v2.4 (E2, E4): één bron
TZIN = {l.split(" tot en met ", 1)[1].split(",", 1)[0]: l for l in P4T("zinnen", B).split("\n") if l.startswith("P4: terugdraaien tot en met ")}
KEUZELIJST = P4T("keuzelijst", B).rstrip("\n").split("\n")
L = [f"# {WKN(HW)} · SQL v4.10 · verwachte uitkomsten per stap (uit BLOKKEN_MANIFEST.tsv)",
     f"Gemaakt door `scripts/{os.path.basename(__file__)}` {VERSIE} uit het manifest (md5 `{hashlib.md5(open(f'{B}/BLOKKEN_MANIFEST.tsv','rb').read()).hexdigest()}`, SQL-root `{os.path.basename(os.path.normpath(B))}`) en de bestanden `verwacht.txt` (md5 per blok in het manifest). "
     f"Volgorde in P4: {' → '.join(r['blok'] for r in M)}. Het laatste blok `{VBLOK}` schrijft alleen `display_order` (B30) en komt ná de nazorgblokken; **terugdraaien begint bij `{VBLOK}`** (alleen op opdracht van Ibra, V-B): {' → '.join(r['blok'] for r in reversed(M))}, tot en met het betrokken blok. "
     f"Na blok {M[-1]['volgorde']} passen de rijgrendels van blok 1–{len(M) - 1} niet meer (hun eindvingerafdruk is de stand zonder volgorde): een rollback van blok 1–{len(M) - 1} geeft dan 0 rijen = STOP, en `p4_log_stap` weigert hem al vooraf (omgekeerde volgorde). "
     "Alle vingerafdrukken zijn `aantal|md5` over `item_id|vingerafdruk` (27 kolommen, gesorteerd COLLATE \"C\"). Apply, rollback en 4b lopen in REPEATABLE READ en geven één rij `n|md5|isolatie`. "
     f"De grendels per rij dwingen de blokvolgorde niet af; daarom is `7_vinger_aggregaat.sql` vóór elke apply en elke rollback een harde STOP, en controleert `p4_stap_{WKN(HW)}.py` (manifest) elke uitkomst (exit 2 = STOP).", "",
     "**Na elke fout of afwijking** in een schrijfstap (3, 4, 4b of 8, ook een serialisatiefout, \"current transaction is aborted\" of een toolfout zonder resultaatrij): niets herhalen. Eerst één losse aanroep `ROLLBACK;`, daarna `7_vinger_aggregaat.sql` en de standbepaling, nooit omgekeerd (een stand vóór de losse ROLLBACK legt niets vast en blokkeert niets, maar telt niet als de stand: `p4_log_stap` v1.13 eist een ✓ stand ná de losse ROLLBACK); dan Ibra inlichten. Na een ✓ schrijfstap die gevolgd werd door een READ ONLY-STOP is er geen losse ROLLBACK (`p4_log_stap` v1.13 weigert hem; 8T C-T18). Een onderbroken aanroep («Interrupted … may have partially or fully completed»), een time-out of geen uitvoer = **misschien uitgevoerd**: eerst de uitkomst vastleggen (de ruwe uitvoer, of «geen uitvoer»), dan de losse ROLLBACK, dan de stand; `p4_log_stap` v1.13 aanvaardt (1) en (2) pas als de laatste stand bevestigd is door een gelijke stand minstens 2 minuten eerder (de wachtregel zit in de code; 8T C-T17). **Na een STOP op een READ ONLY-stap** (drift, c10_na, slot_ref, zicht_voor, stand, slot, zicht_na, rooktest_start, rooktest, c10_grendel) of een ✗ voorcontrole: geen losse `ROLLBACK;` (er is niets te sluiten; P4-9 van W07), wel de stand (bij een blokstap `stand`, bij een slotstap `p4_status`) en Ibra. Ibra kiest daarna uit de keuzelijst (Herstel 1).", "",
     "## Standbepaling per week", "",
     "Een **✓ stand** zet de toestand van de hele week in het log. **«Al uitgevoerd»**: geeft `7_vinger` vóór een blok de NA van dat blok (bv. na een toolfout tijdens de apply die toch gecommit heeft), dan is dat blok al toegepast en wordt het niet opnieuw gedraaid. `p4_stap` geeft dan exit 2 (STOP van deze stap) met «↷ al uitgevoerd»; daarna de STOP-route: geen losse ROLLBACK (READ ONLY), dezelfde uitvoer als `stand` vastleggen (de stand) en Ibra kiest uit de keuzelijst (Herstel 1); het log gaat niet vanzelf verder. Gebeurt dat na de keuze «stand = vóór» (de onderbroken aanroep committe pas later: een late commit), dan aanvaardt `p4_log_stap` v1.13 die stand ook al wijkt ze af van het log, maar alleen in het onzekere blok en alleen als de stand van ná die stap (V2-uitzondering; buiten een open STOP eerst als STOP «late commit»); na de wachtregel registreert «P4: verder» het blok als «al uitgevoerd» (8T C-T17). Was de apply van dat blok de onderbroken schrijfstap en toont de stand precies haar uitkomst (de NA van dat blok, verder niets anders), dan registreert «P4: verder» haar als «al uitgevoerd (onderbroken aanroep, stand = na)» en gaat P4 verder met het volgende blok (`p4_log_stap` v1.13; 9T DA-T-01; na de wachtregel); een terugdraai blijft mogelijk op Ibra's opdracht. Toont de stand iets anders dan de stand vóór of na die stap (gemengd), dan alleen (2) of (4). "
     f"**{WKN(HW)} kent een tussenstand «inhoud klaar, volgorde open»** (na `{INH[-1]['blok']}`, vóór `{VBLOK}`): de ketenwaarde `{VW[VBLOK]['week_voor']}`; de nazorgblokken raken {WKN(HW)} niet, dus die waarde blijft staan tot het V-blok.", ""]
for wk in dict.fromkeys(r["week"] for r in M):
    rs = [r for r in M if r["week"] == wk]
    L += [f"### {wk}", "| week-vingerafdruk | betekenis | volgende stap |", "|---|---|---|"]
    keten = [rs[0]["week_voor"]] + [r["week_na"] for r in rs]
    for k, f in enumerate(keten):
        if k == 0: bet = "niets toegepast (= back-up)"
        else: bet = " + ".join(r["blok"] for r in rs[:k]) + " toegepast" + (" (= NA)" if k == len(rs) else "") + (" · inhoud klaar, volgorde open" if wk == WKN(HW) and k == len(rs) - 1 else "")
        vlg = f"blok {rs[k]['blok']}" + (" (ná de nazorgblokken)" if wk == WKN(HW) and rs[k]["blok"] == VBLOK else "") + (f" (de handstap `{VWBLOK[rs[k]['blok']]}` staat al direct na `start`)" if rs[k]["blok"] in VWBLOK else "") if k < len(rs) else "week klaar → volgend blok in het manifest"
        L.append(f"| `{f}` | {bet} | {vlg} |")
    if ROFF and any(r["blok"] == ROFF for r in rs):   # v2.2: de offline-keten
        voor_off = [r for r in rs if "week_na_off" in VW[r["blok"]]]
        L.append(f"| **offline-keten** (na de offline-rollback van `{ROFF}`: {', '.join(ROFF_IDS)} op `is_published = false`) | | |")
        L.append(f"| `{VW[ROFF]['week_voor_off']}` | {' + '.join(r['blok'] for r in voor_off)} toegepast · {ROFF} offline teruggedraaid | verder terug alleen op opdracht: {voor_off[-1]['blok'] if voor_off else '—'} |")
        for j in range(len(voor_off) - 1, -1, -1):
            bet = (" + ".join(r["blok"] for r in voor_off[:j]) + " toegepast" if j else "niets toegepast") + f" · {ROFF_IDS and ', '.join(ROFF_IDS)} offline"
            L.append(f"| `{VW[voor_off[j]['blok']]['week_voor_off']}` | {bet}" + (" = **eindstand na een volledige terugdraai** (≠ de back-up: twee rijen offline; herpubliceren pas na C7 met een eigen akkoord)" if j == 0 else "") + f" | {('blok ' + voor_off[j - 1]['blok'] + ' terug (op opdracht)') if j else '—'} |")
    L.append("")
L += ["## Terugdraaien: wat elk blok meesleept (9T P2 V4, P2-10; B17 P1 N1-W08 (3), P2 N1-W08 (3)–(4))", "",
      f"Een terugdraai van blok k vraagt eerst de terugdraai van **alle latere blokken van het manifest**, in omgekeerde volgorde (ook van een andere week: `p4_log_stap` weigert een rollback zolang een later blok toegepast is; `7_vinger` per week is een harde STOP). De grendels van de nazorgblokken lezen alleen hun eigen week: die koppeling is procedure, geen techniek. "
      f"Daarom staat per blok wat er dan allemaal terugkomt. Na elke terugdraai: niemand gebruikt «Hele week publiceren» of de pijltjes ↑/↓ in U1–U{HW} (B17 P2 N1-W08 (4); de knop zou de offline items publiceren).", "",
      "| blok | eerst terug (in deze volgorde) | wat de terugdraai van dit blok zelf doet | akkoord |", "|---|---|---|---|"]
for k, r in enumerate(M):
    later = list(reversed(M[k + 1:]))
    L.append(f"| `{r['blok']}` ({r['week']}) | {' → '.join('`' + x['blok'] + '`' for x in later) if later else '— (eerste terugdraai)'} | " + "; ".join(wat_doet_terug(r)) + " | "
             + ("Ibra, met de depublicatie letterlijk in de akkoordtekst (`--akkoord-ibra` noemt " + " en ".join(i.split('-', 1)[1] for i in ROFF_IDS) + " en «offline»/«depubliceren»)" if r["blok"] == ROFF else "Ibra (V-B)") + f": zijn zin «{TZIN[r['blok']]}» (of die van een eerder blok) als `--akkoord-ibra`, ook bij de voorcontrole |")
L += ["", "Samengevat per blok, alles wat terugkomt als je **tot en met** dat blok terugdraait (de som van de rijen hierboven vanaf het laatste blok):", ""]
for k, r in enumerate(M):
    mee = [x for x in reversed(M[k:])]
    b33 = [x["blok"] for x in mee if any("B33" in s for s in wat_doet_terug(x))]
    off = [x["blok"] for x in mee if "rollback_offline" in VW[x["blok"]]]
    L.append(f"- tot en met `{r['blok']}`: {len(mee)} terugdraaien ({' → '.join(x['blok'] for x in mee)})" + (f" · B33-cijfers terug via {', '.join(b33)}" if b33 else "") + (f" · offline: {', '.join(ROFF_IDS)} (akkoord met depublicatie)" if off else "") + (" · volgorde alfabetisch" if any(VW[x['blok']].get('kern') for x in mee) else "") + f" · Ibra's zin: «{TZIN[r['blok']]}»")
L.append("")
for r in M:
    v = VW[r["blok"]]; d = f"{B}/{r['map']}"
    sz = {f: os.path.getsize(f"{d}/{f}") for f in ("3_apply.sql", "4_rollback.sql", "8_generale_repetitie.sql", "9_grootte_probe.sql", "2_droogloop.sql", "7_vinger_aggregaat.sql")}
    c10 = "c10_grendel" in v; off = "rollback_offline" in v
    L += [f"## {r['volgorde']}. {r['week']} · blok {r['blok']} · {v['items_blok']} items · {v['gewijzigd']} gewijzigd · {v['paren']} velden" + (" · **alleen display_order (B30)**" if v.get("kern") else "") + (" · **bucketgrendel C10 (B31)**" if c10 else "") + (" · **terugdraaien alleen offline (v4.8)**" if off else "") + (f" · **voorwaarde: handstap `{v['voorwaarde']}`**" if "voorwaarde" in v else ""), "",
          "| stap | bestand (bytes) | verwacht |", "|---|---|---|"]
    if "voorwaarde" in v: _u = uitslag(v["voorwaarde"], r["week"]); L.append(f"| **vooraf: handstap `{v['voorwaarde']}`** direct na `start`, vóór `drift` (blok slot, bestand «-», met `--registerregel \"<de registerregel van de lezing>\"` en `--bewijs-md5 <md5 van {_u[0]}>`) | — | het bestand `{_u[0]}` staat in de bundelmap met de regel «{_u[1]}» en heeft die md5; anders STOP (geen bestand, andere md5, «ROOD» of geen uitslagregel). Zonder ✓ `{v['voorwaarde']}` weigert `p4_log_stap` drift en alles daarna (B17 P1 N1-W08 (1), ADR-W08-4; 8D C-D02, 8T C-T02) |")
    if c10: L.append(f"| **vooraf (READ ONLY): laat de bucket beeld toe?** | `1_c10_grendel.sql` ({os.path.getsize(f'{d}/1_c10_grendel.sql')}) | `true` (C10 live sinds 2026-11-10 16:34:23) · `false` = STOP vóór dit blok: de bucket is teruggezet; dit blok en alle blokken erna blijven dicht |")
    L += [f"| leescontrole in P3 (live = back-up) | `2_droogloop.sql` ({sz['2_droogloop.sql']}) | `{v['droogloop_p3']}` |",
          f"| leescontrole in P3: probe v2 | `9_grootte_probe.sql` ({sz['9_grootte_probe.sql']}) | `{v['probe_p3']}` |",
          f"| P4 7_vinger vóór het blok (harde STOP bij afwijking; = NA → «al uitgevoerd») | `7_vinger_aggregaat.sql` ({sz['7_vinger_aggregaat.sql']}) | `{v['week_voor']}|{v['blok_voor']}|{v['rest']}` |",
          f"| P4 generale repetitie + activiteit + isolatie | `8_generale_repetitie.sql` ({sz['8_generale_repetitie.sql']}) | `{v['gr_eindrij']}` + `|pogingen30|pogingen30_leerders|logins30_leerders|logins30_staf|laatste_poging` + `|repeatable read` (STOP als pogingen30_leerders of logins30_leerders ≠ `--verwacht-activiteit 0,0` — de testleerder telt niet mee — of isolatie ≠ repeatable read)" + (" · de rollback in de gr is de offline-rollback: na_rollback = de offline-stand" if off else "") + " |",
          f"| P4 apply | `3_apply.sql` ({sz['3_apply.sql']}) | `{v['apply_uitvoer']}` |",
          f"| P4 aparte controle (en V-A door de Regisseur) | `7_vinger_aggregaat.sql` | `{v['week_na']}|{v['blok_na']}|{v['rest']}` |",
          f"| terugdraaien (alleen op opdracht van Ibra; eerst 7_vinger = NA van dit blok{'; eerst ' + VBLOK + ' terug' if r['blok'] != VBLOK else ''}" + ("; **offline: met `--akkoord-ibra` dat de depublicatie noemt**" if off else "") + f") | `4_rollback.sql` ({sz['4_rollback.sql']}) | `{v['rollback_uitvoer']}`, daarna 7_vinger `" + (f"{v['week_voor_off']}|{v['blok_voor_off']}|{v['rest']}` (de week met {', '.join(ROFF_IDS)} offline)" if off else f"{v['week_voor']}|{v['blok_voor']}|{v['rest']}`") + " |"]
    if "week_na_off" in v: L.append(f"| terugdraaien ná de offline-rollback van `{ROFF}` (offline-keten) | `4_rollback.sql` | `{v['rollback_uitvoer']}` (zelfde rijen), 7_vinger vóór `{v['week_na_off']}|{v['blok_na']}|{v['rest_off']}` → na `{v['week_voor_off']}|{v['blok_voor']}|{v['rest_off']}` |")
    L.append("")
KOPT = ["items", "b25", "needs_image", "strict", "punten", "ns_audio", "student_opname", "vlaggen", "gepubliceerd", "volgorde"]
PU = f"pogingen_u{HW}"
L += ["## Slotcontrole (V-A) na het laatste blok en na de rooktest", f"`{NAAM('slot_tellingen')}.sql` (alleen lezen). Verwacht (NA; tussen haakjes de stand vóór P4):", "",
      "| week | " + " | ".join(KOPT) + " | typen |", "|---|" + "---|" * (len(KOPT) + 1)]
for w in WEKEN:
    n, o = SLOT_NA[w], SLOT_VOOR[w]
    L.append(f"| W{w:02d} | " + " | ".join(f"{n[k]} ({o[k]})" for k in KOPT) + f" | `{n['typen']}` (`{o['typen']}`) |")
L += ["", "Over de gepubliceerde rijen en de inhoudscontroles (§5):", "", "| week | punten_gep | strict_gep | vlaggen_gep | ns_audio_gep | typen_gep | ma_fout | koppelen_fout | reeks_fout |", "|---|---|---|---|---|---|---|---|---|"]
for w in WEKEN:
    n, o = SLOT_NA[w], SLOT_VOOR[w]
    L.append(f"| W{w:02d} | {n['punten_gep']} ({o['punten_gep']}) | {n['strict_gep']} ({o['strict_gep']}) | {n['vlaggen_gep']} ({o['vlaggen_gep']}) | {n['ns_audio_gep']} ({o['ns_audio_gep']}) | `{n['typen_gep']}` (`{o['typen_gep']}`) | {n['ma_fout']} ({o['ma_fout']}) | {n['koppelen_fout']} ({o['koppelen_fout']}) | {n['reeks_fout']} ({o['reeks_fout']}) |")
L += ["", f"Daarnaast: rijen_totaal en rijen_n1 = {RIJEN_NA} (geen nieuwe rijen); `pogingen_totaal` = de telling vlak vóór blok 1 (P4); **`{PU}`** = {PHWREF} bij `slot_ref` (stap 0: `{PU}` {PHWREF}; anders STOP vóór blok 1) en na de rooktest het aantal W{HW:02d}-inzendingen; de week-vingerafdrukken = `week_na` van het laatste blok van elke week; `volgorde_w{HW:02d}` = `1..n` na het V-blok (`alle 0` ervoor)."]
ZV_VERB = {w: verborgen(VOP[w]) for w in WEKEN}; ZN_VERB = {w: verborgen(NAP[w]) for w in WEKEN}
L += ["", "## Slotstappen · blok `slot` in `p4_log_stap`", "",
      f"Eerst, vóór alles: de handstap `start` met `--akkoord-ibra \"<het letterlijke P4-akkoord van Ibra, met «Content Studio dicht, geen docent bewerkt»>\"`. Zonder ✓ start weigert `p4_log_stap` elke blok- en slotstap; " + (f"in deze bundel komt de handstap `{', '.join(sorted(set(VWBLOK.values())))}` direct na `start`, vóór `drift` (zonder ✓ weigert `p4_log_stap` drift en alles daarna); " if VWBLOK else "") + f"blok 1 vraagt bovendien sinds de laatste ✓ start een ✓ drift, ✓ c10_na, ✓ slot_ref en ✓ zicht_voor. Het leerderszicht is een **RLS-zicht (bovengrens)**: wat een leerder met `can_access_curriculum` en `curriculum_unit_accessible(·, 'U{HW}')` via de databank kan lezen. Vindt de query geen leerder met U{HW}-toegang, dan is dat een terechte STOP (fail-closed). Het enige studentaccount met toegang tot U{HW} is dat van Ibra (P1-16a; stap 0: leerders_met_u8 1).", "",
      "| moment | stap | bestand | verwacht |", "|---|---|---|---|",
      f"| na `start`, vóór alles (READ ONLY, logstap met oordeel) | `drift` | `{NAAM('drift')}.sql` | `{DRIFT}` (rijen \\| max(updated_at) in UTC: niets veranderd sinds de VOOR-stand van P3; anders STOP vóór elke schrijfstap, Ibra) |",
      f"| na `drift` (READ ONLY; C10 is live, B31) | `c10_na` | `c10/c10_bewijs.sql` | `{BUCKET}` (anders STOP vóór blok 1: de bucket is teruggezet) |",
      f"| vlak vóór blok 1 (alle blokken open) | `slot_ref` | `{NAAM('slot_tellingen')}.sql` | de VOOR-tellingen per week (tussen haakjes hierboven), rijen {RIJEN_VOOR}/{RIJEN_VOOR}, `{PU}` = {PHWREF} (grendel); `pogingen_totaal` wordt de referentie |",
      f"| vlak vóór blok 1 | `zicht_voor` | `{NAAM('leerderszicht')}.sql` | policies = live P3, RLS true, gepubliceerd " + " · ".join(f"W{w:02d} {SLOT_VOOR[w]['gepubliceerd']}" for w in WEKEN) + "; ongepubliceerd " + " · ".join(f"W{w:02d} «{ZV_VERB[w]}»" for w in WEKEN) + f"; als leerder met toegang tot U{HW}: " + " · ".join(f"W{w:02d} {SLOT_VOOR[w]['gepubliceerd']}" for w in WEKEN) + " · W25 0 · ongepubliceerd zichtbaar 0 |",
      f"| na het laatste blok en opnieuw na de rooktest (alle blokken toegepast) | `slot` | `{NAAM('slot_tellingen')}.sql` | de NA-tellingen hierboven, rijen {RIJEN_NA}/{RIJEN_NA}, pogingen ≥ referentie (het verschil komt in het verslag), `{PU}` gemeld |",
      f"| na het laatste blok en na de rooktest | `zicht_na` | `{NAAM('leerderszicht')}.sql` | policies ongewijzigd, RLS true, gepubliceerd " + " · ".join(f"W{w:02d} {SLOT_NA[w]['gepubliceerd']}" for w in WEKEN) + "; ongepubliceerd " + " · ".join(f"W{w:02d} «{ZN_VERB[w]}»" for w in WEKEN) + "; als leerder: " + " · ".join(f"W{w:02d} {SLOT_NA[w]['gepubliceerd']}" for w in WEKEN) + " · W25 0 · ongepubliceerd zichtbaar 0 (de elf offline items zijn als leerder onzichtbaar) |",
      f"| na «rooktest start» van Ibra (READ ONLY) | `rooktest_start` | `{NAAM('rooktest_start')}.sql` | `--akkoord-ibra \"rooktest start\"` of `\"rooktest start, zonder herkansing\"` (letterlijk, ook bij de voorcontrole; de route van de fotoregel: standaard één herkansing; 8D C-D24); uitkomst: `rooktest_start` (now() in UTC, microseconden) en `pogingen_testleerder` — de ondergrens van de rooktest (B17 P1 N1-W08 (1)) |",
      f"| na «rooktest gedaan, n = …» (vóór de tweede `slot`) | `rooktest` | `{NAAM('rooktest')}.sql` | `--akkoord-ibra \"rooktest gedaan, n = <n>\"`; de pogingen van de testleerder **sinds `rooktest_start`** (geen vast venster), per item vergeleken met `{NAAM('rooktest_verwacht')}.tsv` (is_correct, score, upload, mimetype); een extra, ontbrekende of andere poging = STOP (melden, niet terugdraaien); een poging tussen `slot_ref` en `rooktest_start` = STOP (het testaccount is tijdens P4 gebruikt); n van Ibra = het aantal keer «Indienen», ook een upload die «Fout» gaf (verwacht het aantal regels van `rooktest_verwacht`, of één meer met de herkansing); de fotoregel heeft 0 tot 1 + h pogingen (h = n − het verwachte aantal; een upload die «Fout» gaf, legt geen poging vast), elk met upload = ja en mimetype image/*; geen poging, upload = nee (`upload_path` leeg) of mimetype «-» (het object weg) = «P2-6a niet bewezen» (een gekende afwijking, niet terugdraaien) |", "",
      "## Herstel na een toolfout of een STOP (9T P3 V2)",
      f"0. Elke exit ≠ 0 van `p4_log_stap` is een STOP. De ruwe uitvoer gaat altijd via een bestand: `cat > p4/uitvoering/ruw/<nr>.json <<'RUW'` … `RUW`, daarna `p4_log_stap … --uit p4/uitvoering/ruw/<nr>.json`.",
      "1. **STOP-route en keuzelijst** (8T C-T01, C-T12; 8D C-D14): dezelfde lijst als Vooraf 5 van het draaiboek.", ""] + KEUZELIJST + ["",
      "2. `7_vinger_aggregaat.sql` van het betrokken blok als **stand** (`p4_log_stap <wie> <blok> stand <7_vinger> …`). Een ✓ stand zet de toestand van de hele week in het log volgens de vingerafdruk (k blokken toegepast, de rest open; ook in de offline-keten). De stand beslist mee of (1) verder kan: `p4_log_stap` v1.13 vergelijkt de ✓ stand **ná de losse ROLLBACK** met de toestand van vóór de STOP (een stand vóór de losse ROLLBACK telt niet en blokkeert niets; 9T DA-T-02). Na een onderbroken of mislukte apply, rollback of 4b nog een stand minstens 2 minuten na de eerste gelijke: pas dan aanvaardt het log (1) of (2) (de wachtregel; `p4_status` noemt het tijdstip); de laatste stand telt.",
      "3. De stand melden en Ibra inlichten met de keuzelijst (drie regels: wat er gebeurde · wat leerders nu zien · de aanbevolen zin uit de laatste kolom van de keuzelijst, bij een K met het blok uit «K: welk blok?»; bij twijfel «P4: wachten»; een letterlijke zin die niet past, toetst het team eerst met `past`: niets aanroepen, geen STOP); P4 gaat alleen verder op zijn keuze. Na een onderbroken of mislukte **schrijfstap** (apply, rollback, 4b; ook een ✓ voorcontrole waarvan de uitkomst nooit is vastgelegd) beslist de stand (`p4_log_stap` v1.13; 9T DA-T-01, DA-T-03, DA-T-04): **stand = vóór** (niets vastgelegd): (1) voert de stap opnieuw uit, alleen op Ibra's uitdrukkelijke keuze (bij een apply opnieuw vanaf `vinger_voor`, met een nieuwe generale repetitie; bij een rollback dezelfde rollback met dezelfde zin); **stand = na** (de stap heeft toch gecommit: apply → NA van het blok, rollback of 4b → VOOR, bij het offline-blok de offline-VOOR): (1) registreert de stap als «al uitgevoerd (onderbroken aanroep, stand = na)» en P4 gaat verder (na een apply met het volgende blok; tijdens een terugdraai met het volgende blok van het bereik, of Ibra kiest opnieuw als het bereik af is); een terugdraai blijft mogelijk op Ibra's opdracht; **stand = gemengd** (iets anders dan vóór of na die stap): alleen (2) terugdraaien of (4) wachten.",
      "4. Is de vingerafdruk geen ketenwaarde: STOP, niets uitvoeren, Ibra inlichten (keuzelijst: (3) of (4); aanbevolen «P4: wachten»; 4b alleen na keuze (2), met dezelfde zin als --akkoord-ibra; 8D C-D25 (3)).",
      f"5. Een nieuwe chat: het P4-log gaat mee (md5, regeltelling en laatste ketenhash in de overdracht); de tussenkopieën (zip naar de chat en naar Drive, B17 aanvulling P4 W07 (1)) na `{INH[len(INH) // 2 + 1]['blok'] if len(INH) > 2 else INH[-1]['blok']}`, vlak vóór de rooktest en na de laatste slotstap. **Na de geplande pauze** (Werkwijze 11 van het draaiboek; 8D C-D21): Ibra plakt in een nieuwe chat de hervatprompt (bundelmap, manifest-md5, md5, regels en laatste ketenhash van het P4-log, md5 van de tweede tussenkopie) en voegt de P4-bundel en de tweede tussenkopie toe; de eerste stap leest alleen (de bundel controleren, het log zo nodig terugzetten uit de tussenkopie, `p4_status` naast de hervatprompt). Ontbreekt het log toch of klopt het niet: niets uitvoeren, eerst Ibra. Een nieuw log zet P4 **niet** halverwege voort: `start` vraagt alle blokken open en blok 1 vraagt ✓ `drift`, `c10_na`, `slot_ref` en `zicht_voor` sinds die start, en die kunnen alleen vóór blok 1 (9T DA-T-13 d). Staat nog geen enkel blok toegepast (de stand per week = de back-up), dan begint op Ibra's opdracht een nieuw log met `start`; anders is het (3) ministap (een P3-ministap vanaf de live stand, met een eigen bundel en log) of (4) wachten tot het log terug is (de tussenkopieën).",
      "5b. Een stand die niet klopt met wat het log al weet (een toegepast blok staat open of omgekeerd) = STOP (V2), behalve in het onzekere blok na een onderbroken apply, rollback of 4b, of na de keuze «stand = vóór» (de late commit: zie de standbepaling; `p4_log_stap` v1.13). Anders is er buiten P4 iets gebeurd: niets uitvoeren, een read-only export van de week vergelijken met de back-up en de NA, en Ibra kiest uit de keuzelijst ((3) of (4)).",
      "6. Activiteit van leerders in de generale repetitie ≠ `0,0` = STOP (de testleerder is uitgesloten; de gr eindigt op ROLLBACK). (1) kan alleen als «P4: verder, activiteit <p>,<l> aanvaard»: de nieuwe gr draagt dan `--verwacht-activiteit <p>,<l>` en precies die zin als `--akkoord-ibra` (`p4_log_stap` v1.13 weigert een andere verwachting dan 0,0 zonder die keuze). Aanbevolen: «P4: wachten» (eerst nagaan wie er actief is). Anders (3) of (4).",
      f"7. **Blok {M[-1]['volgorde']} eerst terug** (9T P2 V3): na `{VBLOK}` zijn de rijgrendels van blok 1–{len(M) - 1} niet meer geldig. `p4_log_stap` weigert een rollback zolang een later blok toegepast is; een toch geplakte rollback geeft 0 rijen (fail-closed). Na de rollback van het V-blok staat {WKN(HW)} weer op «inhoud klaar, volgorde open».",
      (f"7b. **`{ROFF}` alleen offline terug** (B17 P1 N1-W08 (3)): `4_rollback.sql` en `4b` zetten {', '.join(ROFF_IDS)} terug met `is_published = false`; `p4_log_stap` vraagt bij voorcontrole en uitkomst een `--akkoord-ibra` dat de depublicatie noemt (beide item_id's en «offline» of «depubliceren»). Daarna geldt voor de eerdere blokken van {WKN(HW)} de offline-keten (tabel hierboven); `{ROFF}` is niet opnieuw toepasbaar zonder hergenereren. Herpubliceren pas na C7, met een eigen akkoord." if ROFF else "7b. (geen blok met offline-rollback in deze SQL-root)"),
      f"8. «Hele week publiceren» in U1–U{HW} en de pijltjes ↑/↓ in de unitpagina zijn verboden tijdens en na P4, ook na een terugdraai (C8-procesregel, B30, B17 P2 N1-W08 (4)): één klik publiceert de offline items of herschrijft display_order van alle rijen naar 0 … n-1; Content Studio blijft dicht."]
open(f"{B}/VERWACHT_PER_STAP.md", "w", encoding="utf-8").write("\n".join(L) + "\n")
# ---------- slot_tellingen v4 ----------
q = [f"-- {NAAM('slot_tellingen')} v4 · READ ONLY · P4 {WKN(HW)} · tellingen " + ", ".join(f"W{w:02d}" for w in WEKEN) + f" met B25 (meerkeuze), meerdere-antwoorden ⊂ opties, koppelen (gepubliceerd), reeksen, volgorde (B30) en {PU} (verwacht: VERWACHT_PER_STAP.md, slotcontrole)", "BEGIN TRANSACTION READ ONLY;"]
cols = []
for w in WEKEN:
    W = f"week = {w}"; S = f"s.week = {w} AND s.item_id ~ ('^' || m.item_id || '-[1-9]$')"; x = f"w{w:02d}"
    cols += [f"(SELECT count(*) FROM public.curriculum_items WHERE {W}) AS items_{x}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND exercise_type = 'meerkeuze' AND strict_tashkeel AND NOT (options ? correct_answer)) AS b25_{x}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND needs_image) AS needs_image_{x}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND strict_tashkeel) AS strict_{x}",
             f"(SELECT sum(points) FROM public.curriculum_items WHERE {W}) AS punten_{x}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND needs_ns_audio) AS ns_audio_{x}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND needs_student_recording) AS student_opname_{x}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND review_flag <> '') AS vlaggen_{x}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND is_published) AS gepubliceerd_{x}",
             f"(SELECT string_agg(t || ':' || n, '|' ORDER BY t COLLATE \"C\") FROM (SELECT exercise_type::text AS t, count(*)::text AS n FROM public.curriculum_items WHERE {W} GROUP BY 1) x) AS typen_{x}",
             f"(SELECT coalesce(sum(points), 0) FROM public.curriculum_items WHERE {W} AND is_published) AS punten_gep_{x}",
             f"(SELECT string_agg(t || ':' || n, '|' ORDER BY t COLLATE \"C\") FROM (SELECT exercise_type::text AS t, count(*)::text AS n FROM public.curriculum_items WHERE {W} AND is_published GROUP BY 1) x) AS typen_gep_{x}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND is_published AND review_flag <> '') AS vlaggen_gep_{x}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND is_published AND needs_ns_audio) AS ns_audio_gep_{x}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND is_published AND strict_tashkeel) AS strict_gep_{x}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND is_published AND exercise_type = 'meerdere-antwoorden' AND NOT coalesce(jsonb_array_length(correct_options) >= 1 AND options @> correct_options, false)) AS ma_fout_{x}",
             f"(SELECT count(*) FROM public.curriculum_items c WHERE c.{W} AND c.is_published AND c.exercise_type = 'koppelen' AND NOT coalesce("
             f"c.options = (SELECT jsonb_agg(split_part(p, '=', 1) ORDER BY o) FROM unnest(string_to_array(c.correct_answer, '|')) WITH ORDINALITY AS t(p, o)) AND "
             f"(SELECT bool_and(length(p) - length(replace(p, '=', '')) = 1) AND count(DISTINCT split_part(p, '=', 2)) = count(*) FROM unnest(string_to_array(c.correct_answer, '|')) AS t(p)), false)) AS koppelen_fout_{x}",
             f"(SELECT count(*) FROM public.curriculum_items m WHERE m.{W} AND EXISTS (SELECT 1 FROM public.curriculum_items s WHERE {S}) AND NOT "
             f"(SELECT bool_and(s.is_published) = bool_or(s.is_published) AND bool_and(s.is_published) <> m.is_published FROM public.curriculum_items s WHERE {S})) AS reeks_fout_{x}",
             f"(SELECT CASE WHEN array_agg(display_order ORDER BY display_order) = (SELECT array_agg(g) FROM generate_series(1, (SELECT count(*) FROM public.curriculum_items WHERE {W})::int) g) THEN '1..n' WHEN bool_and(display_order = 0) THEN 'alle 0' ELSE 'anders (' || count(DISTINCT display_order) || ' waarden, min ' || min(display_order) || ', max ' || max(display_order) || ')' END FROM public.curriculum_items WHERE {W}) AS volgorde_{x}"]
cols += ["(SELECT count(*) FROM public.curriculum_items) AS rijen_totaal", "(SELECT count(*) FROM public.curriculum_items WHERE week BETWEEN 1 AND 25) AS rijen_n1", "(SELECT count(*) FROM public.curriculum_item_attempts) AS pogingen_totaal",
         f"(SELECT count(*) FROM public.curriculum_item_attempts a JOIN public.curriculum_items ci ON ci.id = a.item_id WHERE ci.week = {HW}) AS {PU}"]
q += ["SELECT " + ",\n ".join(cols) + ";", "ROLLBACK;"]
open(f"{B}/{NAAM('slot_tellingen')}.sql", "w", encoding="utf-8").write("\n".join(q) + "\n")
# ---------- leerderszicht v6 ----------
ver = lambda w: f"(SELECT coalesce(string_agg(item_id, ',' ORDER BY item_id COLLATE \"C\"), '') FROM public.curriculum_items WHERE week = {w} AND NOT is_published)"
LG = f"leerder_u{HW}_gevonden"
z = [f"-- {NAAM('leerderszicht')} v6 · READ ONLY · P4 {WKN(HW)} · B12 (2): policies op curriculum_items, RLS, gepubliceerde items per week (" + ", ".join(f"W{w:02d}" for w in WEKEN) + ") en de ongepubliceerde item_id's per week (als postgres),",
     f"-- daarna ALS LEERDER (SET LOCAL ROLE authenticated + jwt-claims van een bestaande leerder met toegang tot U{HW} volgens curriculum_unit_accessible en can_access_curriculum, zonder admin- of docentrol; het id komt niet in de uitvoer):",
     "-- wat de RLS-policy 'Toegang tot curriculum-items' (is_published AND can_access_curriculum(auth.uid())) echt toont. Vóór blok 1 (zicht_voor), na het laatste blok en na de rooktest (zicht_na).",
     "BEGIN TRANSACTION READ ONLY;",
     "SELECT set_config('hva.policies', (SELECT string_agg(policyname::text || ':' || cmd::text || ':' || array_to_string(roles, ',') || ':' || coalesce(qual, '') || ':' || coalesce(with_check, ''), ' # ' ORDER BY policyname) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'curriculum_items'), true) AS p, "
     "set_config('hva.rls', (SELECT relrowsecurity::text FROM pg_class WHERE oid = 'public.curriculum_items'::regclass), true) AS r, "
     "set_config('hva.gep', concat_ws('|', " + ", ".join(f"(SELECT count(*) FROM public.curriculum_items WHERE week = {w} AND is_published)" for w in WEKEN) + "), true) AS g, "
     + ", ".join(f"set_config('hva.verb{w}', {ver(w)}, true) AS v{w}" for w in WEKEN) + ", "
     f"set_config('hva.leerder', coalesce((SELECT u.id::text FROM auth.users u WHERE public.can_access_curriculum(u.id) AND public.curriculum_unit_accessible(u.id, 'U{HW}') AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role::text IN ('admin', 'teacher')) ORDER BY u.id LIMIT 1), ''), true) AS l;",
     "SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('hva.leerder'), 'role', 'authenticated')::text, true) AS c;",
     "SET LOCAL ROLE authenticated;",
     "SELECT current_setting('hva.policies') AS policies, current_setting('hva.rls') AS rls, " + ", ".join(f"split_part(current_setting('hva.gep'), '|', {k + 1}) AS zichtbaar_w{w:02d}" for k, w in enumerate(WEKEN)) + ", "
     + ", ".join(f"current_setting('hva.verb{w}') AS verborgen_w{w:02d}" for w in WEKEN) + f", (current_setting('hva.leerder') <> '')::text AS {LG}, current_user::text AS rol, "
     + ", ".join(f"(SELECT count(*) FROM public.curriculum_items WHERE week = {w}) AS als_leerder_w{w:02d}" for w in WEKEN) + ", "
     f"(SELECT count(*) FROM public.curriculum_items WHERE week = 25) AS als_leerder_w25, (SELECT count(*) FROM public.curriculum_items WHERE week IN ({', '.join(str(w) for w in WEKEN)}) AND NOT is_published) AS als_leerder_verborgen;", "ROLLBACK;"]
open(f"{B}/{NAAM('leerderszicht')}.sql", "w", encoding="utf-8").write("\n".join(z) + "\n")
def zicht(S, VB):
    d = {"policies": ZICHT["policies"] if ZICHT else "(live P3)", "rls": "true"}
    for w in WEKEN: d[f"zichtbaar_w{w:02d}"] = S[w]["gepubliceerd"]
    for w in WEKEN: d[f"verborgen_w{w:02d}"] = VB[w]
    d.update({LG: "true", "rol": "authenticated"})
    for w in WEKEN: d[f"als_leerder_w{w:02d}"] = S[w]["gepubliceerd"]
    d.update(als_leerder_w25=0, als_leerder_verborgen=0); return d
ZV, ZN = zicht(SLOT_VOOR, ZV_VERB), zicht(SLOT_NA, ZN_VERB)
if ZICHT:
    afw = [k for k in ZV if k != "policies" and str(ZV[k]) != str(ZICHT.get(k))]
    assert not afw, f"live P3 ≠ VOOR: {[(k, ZV[k], ZICHT.get(k)) for k in afw]}"
# ---------- C10 (B31): alleen het READ ONLY-bewijs ----------
os.makedirs(f"{B}/c10", exist_ok=True)
open(f"{B}/c10/c10_bewijs.sql", "w", encoding="utf-8").write("-- c10_bewijs · READ ONLY · B31 · de huidige allowed_mime_types van de bucket student-uploads (C10 live sinds 2026-11-10 16:34:23: met de vijf beeldtypen)\nBEGIN TRANSACTION READ ONLY;\nSELECT array_to_string(allowed_mime_types, ',') AS allowed_mime_types FROM storage.buckets WHERE id = 'student-uploads';\nROLLBACK;\n")
# ---------- driftcontrole vóór P4 ----------
open(f"{B}/{NAAM('drift')}.sql", "w", encoding="utf-8").write(
    f"-- {NAAM('drift')} · READ ONLY · P4 vooraf (8T P3 C-T02): is curriculum_items sinds de VOOR-stand van P3 ongewijzigd? Elke UPDATE zet updated_at (trigger), elke INSERT/DELETE verandert de telling.\n"
    f"-- verwacht: {DRIFT} (rijen | max(updated_at) in UTC) — anders STOP vóór elke schrijfstap: drift buiten het team (Ibra)\n"
    "BEGIN TRANSACTION READ ONLY;\n"
    "SELECT count(*)::text || '|' || coalesce(to_char(max(updated_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS.US'), '') AS drift FROM public.curriculum_items;\n"
    "ROLLBACK;\n")
# ---------- rooktest als SQL-bewijs, ondergrens rooktest_start (B17 P1 N1-W08 (1)) ----------
NAH = RIJ[HW][1]
def verw(item, uitkomst):   # uitkomst: 'fout' | 'goed' | 'ingeleverd' | 'upload' | 'opname'
    r = NAH[item]; t = r["exercise_type"]; p = int(r["points"])
    if uitkomst == "fout": assert t in ("meerkeuze", "meerdere-antwoorden", "gatentekst"), item; return ("false", "0", "nee", "-")
    if uitkomst == "goed": assert t in ("meerkeuze", "meerdere-antwoorden", "gatentekst"), item; return ("true", str(p), "nee", "-")
    if uitkomst == "ingeleverd": assert t == "open-tekst", item; return ("", "0", "nee", "-")
    if uitkomst == "upload": assert t == "bestand-upload", item; return ("true", str(p), "ja", "image/")
    if uitkomst == "opname": assert t == "audio-opname", item; return ("true", str(p), "ja", "audio/")
    raise ValueError(uitkomst)
P = f"U{HW}-"   # de item_id's van de hoofdweek
ROOK = [  # (regel, item, uitkomst, toestel, waarom) — één regel per type en nakijkpad van W11 (B17 P2 N1-W08 (1)); W11 heeft geen uploaditem (geen fotoregel)
    (f"W{HW:02d}-1", P + "grammatica-14-1", "fout", "gsm", "meerkeuze met strict (B44/B25, typewissel open-tekst → meerkeuze): kies كِتَابُ كَرِيمٌ — fout"), (f"W{HW:02d}-1", P + "grammatica-14-1", "goed", "gsm", "— «Opnieuw», kies كِتَابُ كَرِيمٍ: bewijst dat de strict-sleutel byte-gelijk in de opties staat"),
    (f"W{HW:02d}-2", P + "grammatica-16", "goed", "desktop", "meerkeuze met strict (B44/B25), geen typewissel: de iḍāfa بَيْتُ كَرِيمٍ"),
    (f"W{HW:02d}-3", P + "schrijven-05-1", "goed", "gsm", "typewissel gatentekst → meerkeuze; de opties zijn directe rede met «: » (B48): lees ze eerst op de gsm"),
    (f"W{HW:02d}-4", P + "grammatica-04-1", "fout", "desktop", "typewissel open-tekst → gatentekst: typ عِنْدِي — fout"), (f"W{HW:02d}-4", P + "grammatica-04-1", "goed", "desktop", "— «Opnieuw», typ عِنْدَهُ: bewijst dat de gatentekst nakijkt"),
    (f"W{HW:02d}-5", P + "grammatica-15-1", "goed", "desktop", "meerkeuze met twee opties (binaire keuze, M in check v1.10)"),
    (f"W{HW:02d}-6", P + "lezen-02-1", "goed", "desktop", "meerkeuze; daarna de reeks lezen-02-1 … -11 in numerieke volgorde (blok V_W11, B30)"),
    (f"W{HW:02d}-7", P + "luisteren-06-1", "goed", "gsm", "meerkeuze zonder audio (B15/B34: leesitem tot de opnamedag)"),
    (f"W{HW:02d}-8", P + "spreken-01", "opname", "gsm", "audio-opname (B26: «Juist!», alle punten)"),
    (f"W{HW:02d}-9", P + "spreken-06-4", "ingeleverd", "desktop", "open-tekst met de nieuwe Vraag van de P3-delta (besluit 1a; B24: «Ingeleverd.», score 0)"),
    (f"W{HW:02d}-10", P + "schrijven-07", "ingeleverd", "desktop", "open-tekst met 5 punten (B24: de docent geeft de score)"),
    (f"W{HW:02d}-11", P + "reflectie-03-1", "ingeleverd", "desktop", "typewissel meerkeuze → open-tekst met 0 punten (B22/B24, grendel zonder score)"),
    (f"W{HW:02d}-12", P + "cultuur-01-1", "ingeleverd", "desktop", "open-tekst met 0 punten (B22) en een modelantwoord voor de docent"),
]
RV = f"{NAAM('rooktest_verwacht')}.tsv"
with open(f"{B}/{RV}", "w", encoding="utf-8") as f:
    f.write("regel\titem_id\tuitkomst\tis_correct\tscore\tupload\tmimetype\ttoestel\twaarom\n")
    for regel, item, uitk, toestel, waarom in ROOK:
        assert NAH[item]["is_published"] == "true", item
        ic, sc, up, mt = verw(item, uitk); f.write(f"{regel}\t{item}\t{uitk}\t{ic}\t{sc}\t{up}\t{mt}\t{toestel}\t{waarom}\n")
open(f"{B}/{NAAM('rooktest_start')}.sql", "w", encoding="utf-8").write(
    f"-- {NAAM('rooktest_start')} · READ ONLY · B17 P1 N1-W08 (1): na «rooktest start» van Ibra — de ondergrens van de rooktest (now() in UTC, met microseconden) en het aantal pogingen van de testleerder op dat moment\n"
    "BEGIN TRANSACTION READ ONLY;\nSET LOCAL TimeZone = 'UTC';\n"
    f"SELECT to_char(now(), 'YYYY-MM-DD HH24:MI:SS.US') AS rooktest_start, (SELECT count(*) FROM public.curriculum_item_attempts WHERE student_id = '{TL}'::uuid)::text AS pogingen_testleerder;\nROLLBACK;\n")
open(f"{B}/{NAAM('rooktest')}.sql", "w", encoding="utf-8").write(
    f"-- {NAAM('rooktest')} · READ ONLY · B17 P1 N1-W08 (1), ADR-W07-4: ALLE pogingen van de testleerder (geen vast venster), met JOIN op curriculum_items.id (curriculum_item_attempts.item_id is een uuid)\n"
    f"-- en de mimetype van het geüploade object uit storage.objects; één aggregaatrij: `rooktest` = een JSON-lijst (jsonb, als tekst) van [item_id, is_correct, score, upload (ja/nee), mimetype,\n"
    "-- created_at (UTC, microseconden)] per poging, op created_at; een ';' of '|' in een waarde (bv. audio/webm;codecs=opus) breekt de rij niet (v2.3, 8T C-T06).\n"
    f"-- De ondergrens is `rooktest_start` uit het P4-log (stap rooktest_start, READ ONLY gelezen na «rooktest start»): p4_stap vergelijkt alleen de pogingen sinds dat moment met {RV};\n"
    "-- een poging tussen slot_ref en rooktest_start = STOP. Het bestand heeft geen in te vullen plaats (byte-gelijk plakken).\n"
    "BEGIN TRANSACTION READ ONLY;\nSET LOCAL TimeZone = 'UTC';\n"
    "SELECT coalesce(jsonb_agg(jsonb_build_array(ci.item_id, coalesce(a.is_correct::text, ''), a.score::text, CASE WHEN a.upload_path IS NULL THEN 'nee' ELSE 'ja' END, coalesce(o.metadata->>'mimetype', '-'), to_char(a.created_at, 'YYYY-MM-DD HH24:MI:SS.US')) ORDER BY a.created_at, ci.item_id COLLATE \"C\")::text, '[]') AS rooktest, count(*)::text AS n\n"
    "FROM public.curriculum_item_attempts a JOIN public.curriculum_items ci ON ci.id = a.item_id LEFT JOIN storage.objects o ON o.bucket_id = 'student-uploads' AND o.name = a.upload_path\n"
    f"WHERE a.student_id = '{TL}'::uuid;\nROLLBACK;\n")
md5 = lambda n: hashlib.md5(open(f"{B}/{n}", "rb").read()).hexdigest()
BEST = [f"{NAAM('slot_tellingen')}.sql", f"{NAAM('leerderszicht')}.sql", f"{NAAM('rooktest')}.sql", f"{NAAM('rooktest_start')}.sql", RV, "c10/c10_bewijs.sql", f"{NAAM('drift')}.sql"]
json.dump({**{f"W{w:02d}": SLOT_NA[w] for w in WEKEN}, "weken": [f"W{w:02d}" for w in WEKEN], "sleutels": list(SLEUTELS), "hw": HW, "pogingen_hw_kolom": PU, "leerder_kolom": LG,
           "rijen_totaal": RIJEN_NA, "rijen_n1": RIJEN_NA, "pogingen_totaal": "≥ de referentie van slot_ref (vlak vóór blok 1)", "pogingen_hw_ref": PHWREF,
           "voor": {**{f"W{w:02d}": SLOT_VOOR[w] for w in WEKEN}, "rijen_totaal": RIJEN_VOOR, "rijen_n1": RIJEN_VOOR}, "zicht_voor": ZV, "zicht_na": ZN, "pogingen_ref_p3": REFP3,
           "testleerder": TL, "vblok": VBLOK, "drift": DRIFT, "c10": {"nieuw": BUCKET}, "rollback_offline": {"blok": ROFF, "ids": ROFF_IDS} if ROFF else None, "voorwaarden": VWBLOK,
           "bestanden": {"slot": BEST[0], "zicht": BEST[1], "rooktest": BEST[2], "rooktest_start": BEST[3], "rooktest_verwacht": BEST[4], "c10": BEST[5], "drift": BEST[6]},
           "md5": {n: md5(n) for n in BEST}},
          open(f"{B}/{NAAM('slot_verwacht')}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for n in ["VERWACHT_PER_STAP.md", f"{NAAM('slot_verwacht')}.json"] + BEST: print(n, "md5", md5(n))
for w in WEKEN: print(f"W{w:02d} NA", SLOT_NA[w])
print("rooktest:", len(ROOK), "inzendingen,", len({r[0] for r in ROOK}), "regels")
