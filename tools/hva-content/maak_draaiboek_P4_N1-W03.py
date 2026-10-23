# maak_draaiboek_P4_N1-W03.py v2 — Regisseur-T (1T) · P4 N1-W03 · het P4-draaiboek aanroep per aanroep, volledig uit BLOKKEN_MANIFEST.tsv,
# de verwacht.txt per blok en slot_verwacht_N1-W03.json (niets met de hand; geen afkortingen van verwachte waarden).
# v2 (9T P4 V1, V6, V8, §3): twee varianten.
#   a = B17 zoals in W02: per blok vinger_voor → gr → apply → vinger_na (Maker-T-subagent) + V-A-stand (Regisseur).
#   b = "2 + 1 per blok" (9T P4 §3): per blok gr → apply (Maker-T-subagent) + stand (Regisseur, = V-A én de vinger_voor van het volgende blok).
#       De gr meet de beginstand in haar eigen transactie (start = week vóór het blok); de apply heeft een plak- en een toestandsgrendel.
#   Beide: slot_ref + zicht_voor + stand van de drie weken vóór blok 1 (V6); ruwe uitvoer via een heredoc-bestand en --uit (V1);
#   na elk blok een statusregel (p4_status_N1-W03.py, V8).
# Gebruik: python3 -I maak_draaiboek_P4_N1-W03.py <werkmap> <uit.md> --variant a|b
import sys, os, json, hashlib
WM, UIT = sys.argv[1], sys.argv[2]; VAR = sys.argv[sys.argv.index("--variant") + 1]; assert VAR in ("a", "b")
SQL = os.path.join(WM, "p3/sql")
M = [dict(zip(("volgorde", "week", "blok", "map", "md5_verwacht", "week_voor", "week_na"), l.rstrip("\n").split("\t"))) for l in list(open(f"{SQL}/BLOKKEN_MANIFEST.tsv", encoding="utf-8"))[1:]]
SV = json.load(open(f"{SQL}/slot_verwacht_N1-W03.json", encoding="utf-8"))
md5 = lambda p: hashlib.md5(open(p, "rb").read()).hexdigest()
nl = lambda x: f"{x:,}".replace(",", ".")
rij, n, totaal = [], 0, 0
def r(wie, blok, stap, pad, verwacht, stop):
    global n, totaal
    n += 1; p = os.path.join(WM, pad); totaal += os.path.getsize(p)
    rij.append(f"| {n} | {wie} | `{blok}` | `{stap}` | `{pad}` ({nl(os.path.getsize(p))} B · `{md5(p)}`) | {verwacht} | {stop} |")
VW = {b["blok"]: dict(l.rstrip("\n").split("\t", 1) for l in open(f"{SQL}/{b['map']}/verwacht.txt", encoding="utf-8")) for b in M}
kv = lambda b, s: f"`{VW[b]['week_' + s]}|{VW[b]['blok_' + s]}|{VW[b]['rest']}`"
slot = lambda bron: "; ".join(f"{w}: " + ", ".join(f"{k} {bron[w][k]}" for k in ("items", "b25", "needs_image", "strict", "punten", "ns_audio", "student_opname", "vlaggen", "gepubliceerd")) + f", typen `{bron[w]['typen']}`" for w in ("W03", "W02", "W01"))
zicht = lambda z: f"6 policies = live P3, RLS {z['rls']}, gepubliceerd W03 {z['zichtbaar_w03']} · W02 {z['zichtbaar_w02']} · W01 {z['zichtbaar_w01']}, `U3-luisteren-08` {z['luisteren08']}; als leerder (rol authenticated, RLS): W03 {z['als_leerder_w03']} · W02 {z['als_leerder_w02']} · W01 {z['als_leerder_w01']} · W25 {z['als_leerder_w25']} · `U3-luisteren-08` {z['als_leerder_luisteren08']}"
r("Regisseur", "slot", "slot_ref", "p3/sql/slot_tellingen_N1-W03.sql", f"VOOR: {slot(SV['voor'])}; rijen_totaal {SV['rijen_totaal']}, rijen_n1 {SV['rijen_n1']}; `pogingen_totaal` = de referentie (P3: {SV['pogingen_ref_p3']})", "een waarde ≠ VOOR: sinds P3 is er iets veranderd → niets uitvoeren, Ibra")
r("Regisseur", "slot", "zicht_voor", "p3/sql/leerderszicht_N1-W03.sql", zicht(SV["zicht_voor"]), "een policy of telling anders, of geen leerder met toegang gevonden")
eerste = {}
for b in M: eerste.setdefault(b["week"], b["blok"])
for wk, b in eerste.items():
    if VAR == "b" or b != "1_L1":
        r("Regisseur (V6)", b, "stand", f"p3/sql/{next(x['map'] for x in M if x['blok'] == b)}/7_vinger_aggregaat.sql", f"{kv(b, 'voor')} → \"0 van … toegepast\" ({wk} = back-up)", "geen ketenwaarde of niet 0 toegepast: sinds P3 veranderd → niets uitvoeren, Ibra")
for b in M:
    d = f"p3/sql/{b['map']}"; V = VW[b["blok"]]
    if VAR == "a": r("Maker-T", b["blok"], "vinger_voor", f"{d}/7_vinger_aggregaat.sql", kv(b["blok"], "voor"), "andere waarde (de uitvoer als `stand` vastleggen, dan herstelpad)")
    r("Maker-T", b["blok"], "gr", f"{d}/8_generale_repetitie.sql", f"`{V['gr_eindrij']}` + activiteit `pogingen30|0|0|logins_staf|laatste` + `repeatable read`", "eindrij of isolatie anders; pogingen30_leerders of logins30_leerders > 0 (alleen verder met het letterlijke akkoord van Ibra)")
    r("Maker-T", b["blok"], "apply", f"{d}/3_apply.sql", f"`{V['apply_uitvoer']}` (binnen 15 min na de ✓ gr)", "0 rijen (`" + V["leeg_uitvoer"] + "`), een fout, een serialisatiefout, een andere telling of een gr ouder dan 15 min")
    if VAR == "a": r("Maker-T", b["blok"], "vinger_na", f"{d}/7_vinger_aggregaat.sql", kv(b["blok"], "na"), "= vóór of anders; een melding over een open transactie")
    r("Regisseur (V-A)", b["blok"], "stand", f"{d}/7_vinger_aggregaat.sql", kv(b["blok"], "na") + " (eigen aanroep; moet kloppen met het log, V2) → daarna de statusregel (V8)", "andere waarde of in strijd met het log")
r("Regisseur", "slot", "slot", "p3/sql/slot_tellingen_N1-W03.sql", f"NA: {slot(SV)}; rijen_totaal {SV['rijen_totaal']}, rijen_n1 {SV['rijen_n1']}; pogingen ≥ de referentie", "een waarde anders")
r("Regisseur", "slot", "zicht_na", "p3/sql/leerderszicht_N1-W03.sql", zicht(SV["zicht_na"]), "een policy of telling anders")
voor_rooktest = n
r("Regisseur", "slot", "slot", "p3/sql/slot_tellingen_N1-W03.sql", "idem, na de rooktest (de pogingen mogen stijgen door de rooktest; het verschil komt in het verslag)", "een waarde anders")
r("Regisseur", "slot", "zicht_na", "p3/sql/leerderszicht_N1-W03.sql", "idem, na de rooktest", "een policy of telling anders")
naam = {"a": "variant a (B17 zoals in W02: 4 + 1 per blok)", "b": "variant b (9T: 2 + 1 per blok)"}[VAR]
L = [f"# P4-draaiboek · N1-W03 · {naam}",
     f"Gemaakt door `scripts/w03/maak_draaiboek_P4_N1-W03.py` v2 uit `BLOKKEN_MANIFEST.tsv` (`{md5(f'{SQL}/BLOKKEN_MANIFEST.tsv')}`), de `verwacht.txt` per blok en `slot_verwacht_N1-W03.json` (`{md5(f'{SQL}/slot_verwacht_N1-W03.json')}`). Scheidsrechters: `p4_log_stap_N1-W03.py` v1.4 en `p4_stap_N1-W03.py` v1.4.1.",
     "", "## Werkwijze per aanroep (B17, aanvulling P3 N1-W03; 9T P4 V1–V3, V8)",
     "1. **Voorcontrole:** `python3 -I scripts/w03/p4_log_stap_N1-W03.py <wie> <blok> <stap> <bestand> --voor`. Alleen exit 0 = plakken; **elke exit ≠ 0 = STOP**.",
     "2. **Plakken:** precies dat bestand, volledig en byte-gelijk (met Read gelezen, nooit met Write of Edit bewerkt), in één aanroep van `query_database`. Eén toolaanroep per bericht.",
     "3. **De ruwe uitvoer letterlijk in een bestand,** met een heredoc (zo overleven `'`, `$` en Arabisch de shell):",
     "   ```", "   cat > p4/uitvoering/ruw/<nr>_<blok>_<stap>.json <<'RUW'", "   <de volledige uitvoer van query_database, ongewijzigd>", "   RUW", "   ```",
     "4. **Vastleggen:** `python3 -I scripts/w03/p4_log_stap_N1-W03.py <wie> <blok> <stap> <bestand> --uit p4/uitvoering/ruw/<nr>_<blok>_<stap>.json` → exit 0 = verder. **Elke exit ≠ 0 = STOP:** niets herhalen, één losse aanroep `ROLLBACK;` (vastleggen als `rollback_los`), dan 7_vinger als `stand`, en Ibra inlichten (herstelpad: `VERWACHT_PER_STAP.md`).",
     "5. **Rollen:** per blok een eigen Maker-T-subagent voor " + ("`vinger_voor`, `gr`, `apply` en `vinger_na`" if VAR == "a" else "`gr` en `apply`") + ". De subagent krijgt de bestanden en het recept, **geen verwachte waarden**, en schrijft alleen na de vorige aanroep (het log heeft een slot, V3). Daarna draait de Regisseur zelf `7_vinger` als `stand` (V-A; moet kloppen met het log, V2) en zet hij één statusregel in de chat: `python3 -I scripts/w03/p4_status_N1-W03.py` (V8).",
     "6. **Vooraf** bevestigt Ibra dat alle Content Studio-tabs dicht zijn, dat geen docent bewerkt en dat niemand in U3 «Hele week publiceren» gebruikt (B12 (3), V7). De bundel is uitgepakt en alle md5's kloppen. Het P4-log begint leeg: `p4/uitvoering/P4_log_N1-W03.tsv` bestaat niet.",
     "", f"Totaal: {n} aanroepen, {nl(totaal)} bytes. Daarvan {voor_rooktest} vóór de rooktest; de laatste 2 komen na de rooktest.", "",
     "| # | wie | blok | stap | bestand (bytes · md5) | verwacht | STOP als |", "|---|---|---|---|---|---|---|"] + rij[:voor_rooktest] + [
     "| — | Ibra | — | rooktest | — | alle vinkjes van de lijst in het P4-rapport, desktop en gsm, in een nieuw venster; per regel toestel, tijd en ✓/✗ | een K (verkeerde sleutel, item niet indienbaar, `U3-luisteren-08` zichtbaar voor leerders, pogingen weg) → terugdraaien alleen op opdracht van Ibra (V-B: 7_W01n → … → het betrokken blok; 4b alleen met een apart akkoord); al het andere wordt een W04-logregel |"] + rij[voor_rooktest:] + [
     "", "Na de laatste aanroep: verse export W01–W25 (alleen lezen) → master met `app_naar_master` v1.1 → moet byte-gelijk zijn aan de voorspelling `4673c3eb83ca3366dc1ad96257fbe321` als W04–W25 gelijk zijn aan 10-20 (V7; anders geen master, verschil naar Ibra) → kernbestanden → OVERDRACHT met het P4-log (md5, regels, laatste ketenhash)."]
open(UIT, "w", encoding="utf-8").write("\n".join(L) + "\n")
print(f"{UIT}: {n} aanroepen · {totaal} bytes · md5 {md5(UIT)}")
