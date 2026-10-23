# tashkil_scan_N1-W03.py — Onderzoeker-D/T · N1-W03 · P1 · alleen lezen.
# Zoekt in de leerdersvelden Arabische woorden waar een medeklinker geen klinker/sukūn/shadda draagt terwijl er nog een letter volgt
# (B1: volledige vocalisatie). Uitzonderingen: ا/ى/ة/ء-dragers als verlengletter, و/ي na ḍamma/kasra (lange klinker), lām van het
# lidwoord vóór een zonneletter (de shadda staat op de volgende letter), de alif van ال, tatwīl-vormen (يـ). Heuristiek: telt per item
# en veld; elke treffer moet een mens bevestigen (de lijst gaat naar 3D, niet rechtstreeks naar het log).
# Gebruik: python3 -I tashkil_scan_N1-W03.py <APP_EXPORT.tsv> [uit.tsv]
import sys, csv, re, collections
csv.field_size_limit(10**9)
H = set("ًٌٍَُِّْٰ")
LETTER = re.compile(r"[ء-ي]")
ZON = set("تثدذرزسشصضطظلن")
VELDEN = ["instruction_nl","question","options","correct_answer","feedback_correct","feedback_incorrect","input_arabic"]
WOORD = re.compile(r"[ء-ْٰـ]+")
def mist(w):
    out = []
    chars = list(w)
    i = 0
    letters = [(k, c) for k, c in enumerate(chars) if LETTER.match(c)]
    for idx, (k, c) in enumerate(letters):
        if idx == len(letters) - 1: break          # laatste letter: naamval vrij (pauze/citaat)
        nxt = chars[k+1] if k+1 < len(chars) else ""
        if nxt in H or nxt == "ـ": continue
        if c in "اآى": continue
        if c == "ء": continue
        j = k - 1; prev_cluster = ""
        while j >= 0 and chars[j] in H: prev_cluster += chars[j]; j -= 1
        if c == "\u0648" and "\u064F" in prev_cluster: continue
        if c == "\u064A" and "\u0650" in prev_cluster: continue
        if idx == 0 and c == "ا": continue
        if idx == 1 and c == "ل" and letters[0][1] == "ا":
            nl = letters[idx+1][1]
            if nl in ZON: continue
        out.append(c)
    return out
rows = list(csv.DictReader(open(sys.argv[1], encoding="utf-8"), delimiter="\t"))
uit = []
for r in rows:
    for v in VELDEN:
        for w in WOORD.findall(r[v] or ""):
            if len([c for c in w if LETTER.match(c)]) < 2: continue
            m = mist(w)
            if m: uit.append((r["item_id"], v, w, "".join(m)))
per_item = collections.Counter(i for i, *_ in uit)
print(f"woorden zonder volledige vocalisatie (heuristiek): {len(uit)} in {len(per_item)} items")
woorden = collections.Counter(w for _, _, w, _ in uit)
for w, n in woorden.most_common(): print(f"{n}\t{w}")
if len(sys.argv) > 2:
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        f.write("item_id\tveld\twoord\tletters_zonder_teken\n")
        for t in uit: f.write("\t".join(t) + "\n")
