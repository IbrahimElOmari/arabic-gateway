# verwerk_antwoord_P3_N1-W06.py v1.0 — Regisseur-D (1D) · P3 N1-W06 · 2026-10-28 · verwerkt het P3-antwoord van Ibra (p3/verwerking/antwoord_P3_Ibra.txt,
# letterlijk: «1 . Goedgekeurd / 2.a / 3a / 4b / 6. Uitstellen tot eind week25 / 7ja», 08:24).
#   2.a → de deltaregels van groep 1 (W0545–W0546, 8D C-D02) worden goedgekeurd met besluit_ibra «P3 akkoord (2026-10-28 08:24): 2.a»; hun twee
#         reviewregels (2a) krijgen «ja» (de optie (a) luidde «nu doorvoeren, met «2a grammatica-03 ja»»);
#   3a  → de 9 regels van groep 2 (W0547–W0555, 8D C-D01) gaan NIET in het log; ze komen letterlijk in het register voor de nazorg van W07.
# Het log en de review van P2 (544 / 266 regels, alle goedgekeurd / ja) worden gekopieerd naar p3/verwerking/ en de regels van groep 1 erachter gezet.
# Eenmalig: weigert als de P3-bestanden al bestaan. Gebruik (vanuit de werkmap): python3 -I scripts/verwerk_antwoord_P3_N1-W06.py
import hashlib, os
V = "p3/verwerking"; B = "P3 akkoord (2026-10-28 08:24): 2.a"
ANTWOORD = "1 . Goedgekeurd \n2.a\n3a\n4b\n6. Uitstellen tot eind week25\n7ja\n"
assert open(f"{V}/antwoord_P3_Ibra.txt", encoding="utf-8").read() == ANTWOORD, "antwoord_P3_Ibra.txt is niet het letterlijke antwoord"
for p in (f"{V}/N1-W06_wijzigingslog_P3.tsv", f"{V}/review_native_N1-W06_P3.tsv"): assert not os.path.exists(p), f"{p} bestaat al: al verwerkt?"
md5 = lambda p: hashlib.md5(open(p, "rb").read()).hexdigest()
assert md5("p2/verwerking/N1-W06_wijzigingslog_P2.tsv") == "90d19298bd2d6008da931936e1aa92ca" and md5("p2/verwerking/review_native_N1-W06_ingevuld.tsv") == "f57ecb4ccd42a41f5025d804dfce602a"
log = [l.rstrip("\n").split("\t") for l in open("p2/verwerking/N1-W06_wijzigingslog_P2.tsv", encoding="utf-8")]
kop = log[0]; K = {c: i for i, c in enumerate(kop)}
assert len(log) - 1 == 544 and all(r[K["status"]] == "goedgekeurd" for r in log[1:])
d = [l.rstrip("\n").split("\t") for l in open("p3/delta/N1-W06_P3_delta.tsv", encoding="utf-8")]
assert d[0] == kop and len(d) - 1 == 11 and md5("p3/delta/N1-W06_P3_delta.tsv") == "7faca5f748399cf6c773816074ca1916"
g1 = [r for r in d[1:] if r[K["herkomst"]].endswith("(groep 1)")]; g2 = [r for r in d[1:] if r[K["herkomst"]].endswith("(groep 2)")]
assert [r[K["wijziging_id"]] for r in g1] == ["W0545", "W0546"] and len(g2) == 9
for r in g1:
    assert r[K["status"]] == "voorgesteld" and r[K["besluit_ibra"]] == ""
    r[K["status"]] = "goedgekeurd"; r[K["besluit_ibra"]] = B
open(f"{V}/N1-W06_wijzigingslog_P3.tsv", "w", encoding="utf-8").write("".join("\t".join(r) + "\n" for r in log + g1))
rv = [l.rstrip("\n").split("\t") for l in open("p2/verwerking/review_native_N1-W06_ingevuld.tsv", encoding="utf-8")]
RK = {c: i for i, c in enumerate(rv[0])}
dv = [l.rstrip("\n").split("\t") for l in open("p3/delta/review_native_N1-W06_P3_delta.tsv", encoding="utf-8")]
assert dv[0] == rv[0] and len(dv) - 1 == 11
dv1 = [r for r in dv[1:] if r[RK["wijziging_id"]] in ("W0545", "W0546")]; assert len(dv1) == 2
for r in dv1:
    assert r[RK["akkoord"]] == ""
    r[RK["akkoord"]] = "ja"; r[RK["opmerking"]] = f"{B} (= «2a grammatica-03 ja»). " + r[RK["opmerking"]]
open(f"{V}/review_native_N1-W06_P3.tsv", "w", encoding="utf-8").write("".join("\t".join(r) + "\n" for r in rv + dv1))
R = ["# Register voor de nazorg van W07 · uit P3 N1-W06 (P3-3a, 2026-10-28)", "",
     "Voorgesteld in P3 (`p3/delta/N1-W06_P3_delta.tsv`, groep 2, 8D C-D01) en door Ibra naar dit register verwezen («3a»). Niet toegepast; de wijziging_id's W0547–W0555 worden niet hergebruikt. Samen te bekijken met P2-12 (a) (`U5-luisteren-03-9`), `-10` en de vaste sleutelcyclus achter · voor · tussen ×3, dan in (9D P3).", ""]
for r in g2:
    R += [f"- **{r[K['wijziging_id']]} · `{r[K['item_id']]}` · {r[K['veld']]}**", f"  - voor: {r[K['oud']]}", f"  - voorstel: {r[K['nieuw']]}", f"  - reden: {r[K['reden']]}"]
open(f"{V}/REGISTER_W07_uit_P3_N1-W06.md", "w", encoding="utf-8").write("\n".join(R) + "\n")
for p in (f"{V}/N1-W06_wijzigingslog_P3.tsv", f"{V}/review_native_N1-W06_P3.tsv", f"{V}/REGISTER_W07_uit_P3_N1-W06.md"):
    print(p, sum(1 for _ in open(p, encoding="utf-8")) - 1, md5(p))
