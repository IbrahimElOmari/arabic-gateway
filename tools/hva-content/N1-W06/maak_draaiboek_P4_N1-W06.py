# maak_draaiboek_P4_N1-W06.py v3.3.1 (8T C-T28: in «Vooraf» 2 eerst mkdir, dan de controle) · v3.3 (8T P4-gereedschap C-T17, C-T19, C-T20, C-T24, C-T26: de lege werkmappen vóór regel 1; de bundelcontrole met
#   --manifest-md5; de kop over variant A eerlijk; het cd-voorvoegsel ook na de laatste aanroep; de VOOR-rijtellingen uit slot_verwacht; een
#   omgevingscontrole voor een eventuele keten) · v3.2.1 — Regisseur-T (1T) · P4 N1-W06 · = maak_draaiboek_P4_N1-W05.py v3.1 variant b («2 + 1 per blok», B17 aanvulling P4 N1-W03)
# voor de bundel van N1-W06, met:
#   - de VARIANTKEUZE als eerste regel (p4_log_stap v1.5.4 `variant`; zonder ✓ variant weigert elke andere stap; 8T P3 C-T02, 9T P3 §3.2);
#     variant B (P3-antwoord «4b», P3_besluit_N1-W06.md): SQL-root p3/sql_B, geen c7_voorcontrole; variant A (alleen met «PR #8 akkoord», de URL
#     van de klas en een ✓ c7_voorcontrole in de vaste vorm): SQL-root p3/sql;
#   - de INSERTBLOKKEN (1_W06ia, 2_W06ib): gr = start|insert|na_insert|tweede insert = 0|na_tweede; nooit rollback, 4b of vinger_terug;
#   - de kop van 9T P3 §3.1 (variant, SQL-root, P4BASIS/P4SQL/P4LOG, bundelhash = md5 van BLOKKEN_MANIFEST + md5_sql per blok + SQL_MANIFEST per week);
#   - het rooktestblok (ROOKTEST_N1-W06.md, maak_rooktest_N1-W06.py) en het herstel (VERWACHT_PER_STAP.md van de gekozen root);
#   - de master na P4 uit p4/master/VOORSPELDE_MD5.txt (voorspel_master v2.2; nooit met de hand) en herbouw_master_N1-W06.py v1.1;
#   - v3.2.1: de terugvalroute voor de verse export (export_hash_N1-W06.py: vingerafdruk over 30 kolommen per week in de databank, NFC-veilig).
# Alles uit BLOKKEN_MANIFEST.tsv, de verwacht.txt per blok en slot_verwacht_N1-W06.json van de gekozen root (niets met de hand; geen afkortingen).
# Gebruik: python3 -I maak_draaiboek_P4_N1-W06.py <werkmap> <uit.md> --variant A|B
import sys, os, json, hashlib
WM, UIT = sys.argv[1], sys.argv[2]; VAR = sys.argv[sys.argv.index("--variant") + 1]; assert VAR in ("A", "B")
ROOT = "p3/sql" if VAR == "A" else "p3/sql_B"; SQL = os.path.join(WM, ROOT)
KOLM = ("volgorde", "week", "blok", "map", "md5_verwacht", "week_voor", "week_na", "soort", "md5_sql")
M = [dict(zip(KOLM, l.rstrip("\n").split("\t"))) for l in list(open(f"{SQL}/BLOKKEN_MANIFEST.tsv", encoding="utf-8"))[1:]]
assert all(len(r) == 9 for r in M), "manifest zonder 9 kolommen (v1.2)"
SV = json.load(open(f"{SQL}/slot_verwacht_N1-W06.json", encoding="utf-8")); assert SV["variant"] == VAR, f"slot_verwacht.variant {SV['variant']} ≠ {VAR}"
md5 = lambda p: hashlib.md5(open(p, "rb").read()).hexdigest()
MMD5 = open(os.path.join(WM, "p4/master/VOORSPELDE_MD5.txt"), encoding="utf-8").read().strip(); assert MMD5 == md5(os.path.join(WM, "p4/master/LEESBARE_LIJST_MASTER_voorspeld.tsv")), "VOORSPELDE_MD5.txt ≠ de voorspelde master"
VMD = open(os.path.join(WM, "p4/master/MASTER_VOORSPELLING_N1-W06.md"), encoding="utf-8").read(); assert f"variant {VAR}" in VMD.split("\n")[0], "de mastervoorspelling hoort bij een andere variant"
MREG = sum(1 for _ in open(os.path.join(WM, "p4/master/LEESBARE_LIJST_MASTER_voorspeld.tsv"), encoding="utf-8"))
MPUB = sum(1 for l in open(os.path.join(WM, "p4/master/LEESBARE_LIJST_MASTER_voorspeld.tsv"), encoding="utf-8") if l.split("\t")[3:4] == ["app:is_published"])
nl = lambda x: f"{x:,}".replace(",", ".")
BASIS = "/home/claude/hva_w06"; ENV = f"cd {BASIS} && export P4SQL={ROOT}"
rij, n, totaal, grootste = [], 0, 0, (0, "")
def r(wie, blok, stap, pad, verwacht, stop):
    global n, totaal, grootste
    n += 1
    if pad == "-": rij.append(f"| {n} | {wie} | `{blok}` | `{stap}` | — (handstap, bestand «-») | {verwacht} | {stop} |"); return
    p = os.path.join(WM, pad); g = os.path.getsize(p); totaal += g; grootste = max(grootste, (g, f"{blok} {os.path.basename(pad)}"))
    rij.append(f"| {n} | {wie} | `{blok}` | `{stap}` | `{pad}` ({nl(g)} B · `{md5(p)}`) | {verwacht} | {stop} |")
VW = {b["blok"]: dict(l.rstrip("\n").split("\t", 1) for l in open(f"{SQL}/{b['map']}/verwacht.txt", encoding="utf-8")) for b in M}
for b in M: assert md5(f"{SQL}/{b['map']}/verwacht.txt") == b["md5_verwacht"], f"verwacht.txt van {b['blok']} ≠ manifest"
kv = lambda b, s: f"`{VW[b]['week_' + s]}|{VW[b]['blok_' + s]}|{VW[b]['rest']}`"
SL = SV["sleutels"]; WK = SV["weken"]
slot = lambda bron: "; ".join(f"{w}: " + ", ".join((f"{k} `{bron[w][k]}`" if k.startswith("typen") else f"{k} {bron[w][k]}") for k in SL) for w in WK)
def zicht(z):
    return (f"6 policies = live P3, RLS {z['rls']}; gepubliceerd " + " · ".join(f"{w} {z['zichtbaar_' + w.lower()]}" for w in WK)
            + "; ongepubliceerd " + " · ".join(f"{w} «{z['verborgen_' + w.lower()]}»" for w in WK)
            + f"; leerder met toegang tot U6 gevonden {z['leerder_u6_gevonden']} (rol {z['rol']}); als leerder (RLS): " + " · ".join(f"{w} {z['als_leerder_' + w.lower()]}" for w in WK)
            + f" · W25 {z['als_leerder_w25']} · ongepubliceerd zichtbaar {z['als_leerder_verborgen']}")
LOG = lambda wie, blok, stap, best: f"`python3 -I scripts/p4_log_stap_N1-W06.py {wie} {blok} {stap} {best} …`"
# ---------------- rijen ----------------
if VAR == "A":
    r("Ibra + Regisseur", "slot", "c7_voorcontrole", "-", "uitkomst in de vaste vorm `ok: url=<URL van de klas> sha=<merge-sha> item=U6-lezen-06 open✓ indienen✓ opnieuw✓ volgende✓ desktop✓ gsm✓` (geen «Juist!» verwachten vóór 5_R1)", "elke andere uitkomst → variant B (Ibra beslist vóór blok 1; dan dit draaiboek met --variant B)")
    r("Regisseur", "slot", "variant", "-", "`--variant A --akkoord-ibra \"PR #8 akkoord\"` (letterlijk; geen deelstring) → «✓ variant A vastgelegd»", "exit ≠ 0")
else:
    r("Regisseur", "slot", "variant", "-", "`--variant B --akkoord-ibra \"4b\"` (het letterlijke P3-antwoord van Ibra, `p3/verwerking/antwoord_P3_Ibra.txt`; P3_besluit punt 4) → «✓ variant B vastgelegd · akkoord Ibra: «4b» · SQL-root p3/sql_B»", "exit ≠ 0 (bv. P4SQL niet op p3/sql_B: «variant B ≠ de variant van deze bundel»)")
r("Regisseur", "slot", "slot_ref", f"{ROOT}/slot_tellingen_N1-W06.sql", f"VOOR: {slot(SV['voor'])}; rijen_totaal {SV['voor']['rijen_totaal']}, rijen_n1 {SV['voor']['rijen_n1']}; `pogingen_totaal` = de referentie (P3: {SV['pogingen_ref_p3']})", "een waarde ≠ VOOR: sinds P3 is er iets veranderd → niets uitvoeren, Ibra")
r("Regisseur", "slot", "zicht_voor", f"{ROOT}/leerderszicht_N1-W06.sql", zicht(SV["zicht_voor"]), "een policy of telling anders, of geen leerder met U6-toegang gevonden (fail-closed: terechte STOP)")
eerste = {}
for b in M: eerste.setdefault(b["week"], b)
for wk, b in eerste.items():
    r("Regisseur (V6)", b["blok"], "stand", f"{ROOT}/{b['map']}/7_vinger_aggregaat.sql", f"{kv(b['blok'], 'voor')} → «0 van {sum(x['week'] == wk for x in M)} toegepast» ({wk} = back-up)", "geen ketenwaarde of niet 0 toegepast: sinds P3 veranderd → niets uitvoeren, Ibra")
for b in M:
    d = f"{ROOT}/{b['map']}"; V = VW[b["blok"]]; ins = b["soort"] == "insert"
    if ins:
        r("Maker-T", b["blok"], "gr", f"{d}/8_generale_repetitie.sql", f"`{V['gr_eindrij']}` (start|insert|na_insert|tweede insert = 0|na_tweede) + activiteit `pogingen30|0|0|logins30_staf|laatste_poging` + `repeatable read`", "eindrij of isolatie anders; een tweede insert ≠ 0; een serialisatiefout of lange lockwacht (FOR SHARE, 8T C-T03); pogingen30_leerders of logins30_leerders > 0 (alleen verder met het letterlijke akkoord van Ibra)")
        r("Maker-T", b["blok"], "apply", f"{d}/3_apply.sql", f"`{V['apply_uitvoer']}` (INSERT, RETURNING-controle in hetzelfde statement; binnen 15 min na de ✓ gr)", f"`{V['leeg_uitvoer']}` (grendel dicht → stand, Ibra), `invalid input syntax for type integer: \"STOP: RETURNING …\"`, een fout, een serialisatiefout of een gr ouder dan 15 min · **nooit rollback of 4b** (de rijen blijven onzichtbaar)")
    else:
        r("Maker-T", b["blok"], "gr", f"{d}/8_generale_repetitie.sql", f"`{V['gr_eindrij']}` + activiteit `pogingen30|0|0|logins30_staf|laatste_poging` + `repeatable read`", "eindrij of isolatie anders; pogingen30_leerders of logins30_leerders > 0 (alleen verder met het letterlijke akkoord van Ibra)")
        r("Maker-T", b["blok"], "apply", f"{d}/3_apply.sql", f"`{V['apply_uitvoer']}` (binnen 15 min na de ✓ gr)", f"0 rijen (`{V['leeg_uitvoer']}`), een fout, een serialisatiefout, een andere telling of een gr ouder dan 15 min")
    r("Regisseur (V-A)", b["blok"], "stand", f"{d}/7_vinger_aggregaat.sql", kv(b["blok"], "na") + " (eigen aanroep; moet kloppen met het log, V2) → daarna de statusregel (`p4_status_N1-W06.py`)", "andere waarde of in strijd met het log")
r("Regisseur", "slot", "slot", f"{ROOT}/slot_tellingen_N1-W06.sql", f"NA: {slot(SV)}; rijen_totaal {SV['rijen_totaal']}, rijen_n1 {SV['rijen_n1']}; pogingen ≥ de referentie", "een waarde anders")
r("Regisseur", "slot", "zicht_na", f"{ROOT}/leerderszicht_N1-W06.sql", zicht(SV["zicht_na"]), "een policy of telling anders; een van de verborgen rijen zichtbaar als leerder")
voor_rooktest = n
r("Regisseur", "slot", "slot", f"{ROOT}/slot_tellingen_N1-W06.sql", "idem, na de rooktest (de pogingen mogen stijgen door de rooktest; het verschil komt in het verslag)", "een waarde anders")
r("Regisseur", "slot", "zicht_na", f"{ROOT}/leerderszicht_N1-W06.sql", "idem, na de rooktest", "een policy of telling anders")
upd = [b["blok"] for b in M if b["soort"] != "insert"]; insb = [b["blok"] for b in M if b["soort"] == "insert"]
terug = " → ".join(reversed(upd))
SQLM = {w: md5(f"{SQL}/{w}/SQL_MANIFEST.tsv") for w in dict.fromkeys(b["week"] for b in M)}
naam = {"A": "variant A (met C7, PR #8)", "B": "variant B (zonder C7: de zes koppelen-items gedepubliceerd in hun eigen weekblok)"}[VAR]
ROOK = os.path.join(WM, "p4/ROOKTEST_N1-W06.md"); rook = f"`p4/ROOKTEST_N1-W06.md` (`{md5(ROOK)}`)" if os.path.exists(ROOK) else "`p4/ROOKTEST_N1-W06.md`"
REC = os.path.join(WM, "p4/uitvoering/RECEPT_MAKER-T_blok.md"); rec = f"`p4/uitvoering/RECEPT_MAKER-T_blok.md` (`{md5(REC)}`)" if os.path.exists(REC) else "`p4/uitvoering/RECEPT_MAKER-T_blok.md`"
L = [f"# P4-draaiboek · N1-W06 · {naam}",
     f"Gemaakt door `scripts/maak_draaiboek_P4_N1-W06.py` v3.3.1 uit `{ROOT}/BLOKKEN_MANIFEST.tsv`, de `verwacht.txt` per blok en `slot_verwacht_N1-W06.json` (`{md5(f'{SQL}/slot_verwacht_N1-W06.json')}`). Scheidsrechters: `p4_log_stap_N1-W06.py` v1.5.4 (`{md5(os.path.join(WM, 'scripts/p4_log_stap_N1-W06.py'))}`) en `p4_stap_N1-W06.py` v1.6.1 (`{md5(os.path.join(WM, 'scripts/p4_stap_N1-W06.py'))}`). Werkwijze «2 + 1 per blok» (B17, aanvulling P4 N1-W03).",
     "", "## Kop (9T P3 §3.1)",
     f"- **Variant:** {VAR}. " + ("Gekozen door Ibra in het P3-antwoord («4b», 2026-10-28 08:24; `P3_besluit_N1-W06.md` punt 4 en 5): geen URL en geen «PR #8 akkoord». PR #8 blijft draft; C7 staat buiten W06. Wil Ibra toch A, dan zegt hij dat vóór regel 1. Dan stopt P4 vóór regel 1: variant A is in deze bundel **niet** kant-en-klaar. Eerst komt het P4-gereedschap voor A: `voorspel_master`, draaiboek en rooktest A met de koppelen-regels 3–6 van 9D §3 en de C7-voorcontrole. Dan volgen een 8T-hercontrole en een nieuwe bundel, met de URL van de klas, «PR #8 akkoord» en de merge (8T C-T20)." if VAR == "B" else "Alleen met het letterlijke «PR #8 akkoord», de merge-sha, Lovable `latest_commit_sha` = die merge-sha (read-only) en de URL van de klas."),
     f"- **SQL-root:** `{ROOT}` · **omgeving in elke shellaanroep:** `{ENV}` (de shell onthoudt niets tussen aanroepen; P4BASIS = `{BASIS}` en P4LOG = `{BASIS}/p4/uitvoering/P4_log_N1-W06.tsv` zijn de standaard). Zonder `P4SQL={ROOT}` weigert `p4_log_stap` (andere bundel of andere variant): fail-closed.",
     f"- **Bundelhash:** `BLOKKEN_MANIFEST.tsv` `{md5(f'{SQL}/BLOKKEN_MANIFEST.tsv')}` (in elke logregel) · `SQL_MANIFEST.tsv` " + " · ".join(f"{w} `{m}`" for w, m in SQLM.items()) + " · `md5_sql` per blok in de 9e kolom van het manifest (`p4_stap` v1.6.1 controleert hem bij elke voorcontrole).",
     f"- **App:** de Regisseur noteert vooraf (alleen lezen) `get_project.latest_commit_sha` van Lovable en de sha van `main` in het verslag. In variant B hangt niets van die sha af (geen nieuwe frontendcode nodig); een andere sha dan 244de3e (+ PR #8 als draft) wordt alleen gemeld.",
     f"- **Blokken:** {len(M)} ({len(insb)} insertblokken {', '.join(insb)}; {len(upd)} updateblokken). Volgorde: {' → '.join(b['blok'] for b in M)}. Terugdraaien (alleen op opdracht van Ibra, V-B): {terug}, tot en met het betrokken blok; **de insertblokken nooit** (nooit DELETE, N2-10): hun rijen blijven onzichtbaar.",
     "", "## Vooraf (vóór regel 1)",
     "1. Ibra bevestigt: alle Content Studio-tabs dicht, geen docent bewerkt, en niemand gebruikt in U3–U6 «Hele week publiceren» — ook niet ná P4 (C8: de knop zou de 12 ongepubliceerde W06-rijen en `U4-luisteren-06`/`U4-lezen-11` weer publiceren).",
     f"2. De bundel is uitgepakt in een lege map `{BASIS}`. Eerst, buiten het log: `cd {BASIS} && mkdir -p p4/uitvoering/ruw p4/export` (8T C-T17/C-T28; schaadt niet als ze er al zijn, ook niet als de uitpakker lege mappen weglaat). Dan de controle: `{ENV} && python3 -I scripts/maak_bundel_N1-W06.py controleer {BASIS} --naam P4bundel --manifest-md5 <md5 van MANIFEST_N1-W06_P4bundel.tsv uit de startprompt>`. Alleen exit 0 = verder: dan zijn alle md5's gelijk, is er geen bestand te veel en bestaan de mappen `p4/uitvoering/ruw/` en `p4/export/`. Er draait geen keten of ander script in die map tijdens P4 (B17). Het P4-log `p4/uitvoering/P4_log_N1-W06.tsv` bestaat nog niet.",
     "3. **Activiteit van leerders:** in P3 waren er 0 leerderspogingen en 0 leerderslogins in 30 dagen. Meldt een generale repetitie toch activiteit, dan is dat een STOP; doorgaan kan alleen met een letterlijke tekst van Ibra (`--akkoord-ibra` bij een nieuwe gr). Ibra mag die tekst ook vooraf geven; dan gaat hij mee bij elke gr (9T P3 F3).",
     f"4. Het recept voor de Maker-T-subagent: {rec}.",
     "5. **Omgeving (alleen nodig voor een keten na een afgekapte plakbeurt, 8T C-T26):** de keten vraagt ook `/home/claude/rt_repo/src/pages/CurriculumItemPage.tsx` (md5 `e9fc90647c97caf0f0d62c4ce6172e8e`, `main` @ 244de3e), node met playwright/chromium en PostgreSQL 16 (`/usr/lib/postgresql/16/bin`). Die staan niet in de bundel. Controleer ze vooraf met `md5sum`, `node --version` en `/usr/lib/postgresql/16/bin/pg_ctl --version`. Ontbreken ze en moet er gesplitst worden, dan is dat een STOP; het splitsen gebeurt dan in een aparte stap.",
     "", "## Werkwijze per aanroep (B17; 9T P4 V1–V3, V8)",
     f"1. **Voorcontrole:** `{ENV} && python3 -I scripts/p4_log_stap_N1-W06.py <wie> <blok> <stap> <bestand> --voor`. Alleen exit 0 = plakken; **elke exit ≠ 0 = STOP**.",
     "2. **Plakken:** precies dat bestand, volledig en byte-gelijk (met Read gelezen, nooit met Write of Edit bewerkt), in één aanroep van `query_database`. Eén toolaanroep per bericht.",
     "3. **De ruwe uitvoer letterlijk in een bestand,** met een heredoc (zo overleven `'`, `$` en Arabisch de shell):",
     "   ```", f"   cd {BASIS} && mkdir -p p4/uitvoering/ruw && cat > p4/uitvoering/ruw/<nr>_<blok>_<stap>.json <<'RUW'", "   <de volledige uitvoer van query_database, ongewijzigd>", "   RUW", "   ```",
     f"4. **Vastleggen:** `{ENV} && python3 -I scripts/p4_log_stap_N1-W06.py <wie> <blok> <stap> <bestand> --uit p4/uitvoering/ruw/<nr>_<blok>_<stap>.json` → exit 0 = verder. **Elke exit ≠ 0 = STOP:** niets herhalen, één losse aanroep `ROLLBACK;` (vastleggen als `rollback_los`), dan 7_vinger als `stand`, en Ibra inlichten (herstel: `{ROOT}/VERWACHT_PER_STAP.md`, «Herstel na een toolfout of een STOP»). **Afgekapte plakbeurt** (`unterminated quoted string`, `unexpected end of input`): er is niets uitgevoerd; na de losse `ROLLBACK;` en de `stand` wordt het blok gesplitst met `maak_sql --blokken` (zonder poort, B17) en de keten opnieuw gedraaid — buiten P4; nooit een apply zonder ✓ gr van hetzelfde (gesplitste) blok.",
     "5. **Rollen:** per blok een eigen Maker-T-subagent voor `gr` en `apply` (recept hierboven). De subagent krijgt de bestanden en het recept, **geen verwachte waarden**, en schrijft alleen na de vorige aanroep (het log heeft een slot). Daarna draait de Regisseur zelf `7_vinger` als `stand` (V-A; moet kloppen met het log) en zet hij één statusregel in de chat: " + f"`{ENV} && python3 -I scripts/p4_status_N1-W06.py`.",
     "6. **Insertblokken** (`1_W06ia`, `2_W06ib`): de weekgrendel leest FOR SHARE; de eerste live uitvoering daarvan is de gr van `1_W06ia` (niet READ ONLY te testen, 8T C-T03). Een serialisatiefout of een lange lockwacht = STOP. `0||repeatable read` bij de apply = grendel dicht (iets anders veranderde de week): stand, Ibra. `p4_log_stap` en `p4_stap` weigeren rollback, 4b en vinger_terug van een insertblok.",
     "7. **Koppelen-items (variant B):** de zes koppelen-items (`U6-luisteren-03`, `U6-lezen-01`, `-04`, `-06`, `U6-grammatica-01`, `-03`) zijn na hun weekblok voor leerders onzichtbaar. Een admin ziet ze wel, maar ze crashen zonder C7: **niet openen**, ook niet in de rooktest. Hun onzichtbaarheid en inhoud bewijzen `zicht_na` en de `stand` (vingerafdruk per rij = NA)." if VAR == "B" else "7. **Koppelen-items (variant A):** geen «Juist!» verwachten vóór `5_R1`.",
     "", f"Totaal: {n} regels = {n - (2 if VAR == 'A' else 1)} databankaanroepen + {2 if VAR == 'A' else 1} handstap(pen) (bestand «-»), {nl(totaal)} bytes geplakt; grootste aanroep {nl(grootste[0])} B ({grootste[1]}). Daarvan {voor_rooktest} vóór de rooktest; de laatste 2 komen na de rooktest.", "",
     "| # | wie | blok | stap | bestand (bytes · md5) | verwacht | STOP als |", "|---|---|---|---|---|---|---|"] + rij[:voor_rooktest] + [
     f"| — | Ibra | — | rooktest | {rook} | alle regels van de rooktestlijst, desktop en gsm, in een nieuw venster; per regel toestel, tijd en ✓/✗ | een K (verkeerde sleutel, item niet indienbaar, een van de 12 ongepubliceerde W06-rijen of `U4-luisteren-06`/`U4-lezen-11` zichtbaar voor leerders, pogingen weg) → terugdraaien alleen op opdracht van Ibra (V-B: {terug} → tot en met het betrokken blok; insertblokken nooit; 4b alleen met een apart akkoord); al het andere wordt een W07-logregel |"] + rij[voor_rooktest:] + [
     "", "## Na de laatste aanroep",
     f"1. Verse export W01–W25, alleen lezen, met de tijden in UTC: `p4/export_N1_naP4.sql` (`{md5(os.path.join(WM, 'p4/export_N1_naP4.sql'))}`). Geeft de tool de uitvoer als **bestand** terug, dan dat bestand byte voor byte kopiëren (`cp`) naar `p4/export/ruw_export_N1_naP4.json` — nooit overtypen of via een heredoc: tekst die via de chat op schijf gaat, wordt NFC-genormaliseerd en 33 velden van W06 zijn in de databank niet-NFC (stap 0, T-aandachtspunt).",
     f"   **Terugvalroute** (de tool geeft de export alleen inline terug, of `herbouw_master` stopt op velden die alleen in Unicode-normalisatie verschillen): `p4/export_hash_N1_naP4.sql` (`{md5(os.path.join(WM, 'p4/export_hash_N1_naP4.sql'))}`, alleen lezen; de databank rekent per week de vingerafdruk over alle 30 kolommen en geeft een ASCII-lijst van de 100 gewijzigde of nieuwe rijen) → ruwe uitvoer met een heredoc naar `p4/export/ruw_export_hash_N1_naP4.json` (alleen ASCII, NFC-veilig) → `{ENV} && python3 -I scripts/export_hash_N1-W06.py tsv {BASIS} p4/export/ruw_export_hash_N1_naP4.json p4/export/APP_EXPORT_N1_naP4_via_hash.tsv` (schrijft de export alleen als alle 25 weken over 30 kolommen gelijk zijn) → stap 2 met die TSV in plaats van de JSON.",
     f"2. `{ENV} && python3 -I scripts/herbouw_master_N1-W06.py {BASIS} p4/export/ruw_export_N1_naP4.json p4/master_na --sql {ROOT}` → exportcontrole (2.323 rijen = de voorspelde export; alleen `updated_at` van de geraakte bestaande rijen en `id`/`created_at`/`updated_at` van de 24 nieuwe rijen mogen afwijken, en die moeten gevuld zijn: een uuid, `created_at` na de export van P4 W05 en één tijd per insertblok, `updated_at` daarna; de ruwe JSON heeft alle 30 kolommen) → master = de voorspelling `{MMD5}` ({nl(MREG)} regels met kop; {MPUB} × `app:is_published`). Anders: geen master, het verschil naar Ibra.",
     "3. Kernbestanden (status_log, besluiten, kopregelcontrole van de 3 kernbestanden) → bundel met md5 → `OVERDRACHT_N1-W06.md` met het P4-log (md5, regels, laatste ketenhash) en de startprompt voor N1-W07."]
open(UIT, "w", encoding="utf-8").write("\n".join(L) + "\n")
print(f"{UIT}: {n} regels · {totaal} bytes · grootste {grootste} · md5 {md5(UIT)}")
