# test_herbouw_master_N1-W06.py v1.2 — Maker-T · P4 N1-W06 · 18 gevallen (2 goed, 15 STOP, 1 LET OP; v1.1: + 8T C-T21; v1.2: + C-T27 tijdzone) met een gesimuleerde verse export uit p4/master/n1_voorspeld.tsv. Schrijft in de huidige map.
# Gebruik (vanuit een lege map): python3 -I <werkmap>/scripts/test_herbouw_master_N1-W06.py <werkmap>
import csv, json, sys, subprocess, copy, os, shutil
csv.field_size_limit(10**9)
WM=sys.argv[1]; V=list(csv.DictReader(open(f"{WM}/p4/master/n1_voorspeld.tsv",encoding="utf-8",newline=""),delimiter="\t"))
NIEUW={}; GER=set()
for l in list(open(f"{WM}/p3/sql_B/BLOKKEN_MANIFEST.tsv"))[1:]:
    c=l.rstrip("\n").split("\t")
    for x in open(f"{WM}/p3/sql_B/{c[3]}/items.txt"):
        i,s=x.rstrip("\n").split("\t")
        if s=="nieuw": NIEUW[i]=c[2]
        elif s=="gewijzigd": GER.add(i)
GER-=set(NIEUW)
def sim(mut=None):
    R=copy.deepcopy(V); n=0
    for r in R:
        i=r["item_id"]
        if i in NIEUW:
            n+=1; r["id"]=f"00000000-0000-4000-8000-{n:012d}"; r["created_at"]="2026-10-29 10:00:0%s+00" % ("1" if NIEUW[i]=="1_W06ia" else "2"); r["updated_at"]="2026-10-29 10:05:00+00"
        elif i in GER: r["updated_at"]="2026-10-29 10:05:00+00"
    if mut: mut(R)
    return R
def schrijf(R,p,js=False):
    if js: json.dump({"rows":R},open(p,"w"),ensure_ascii=False); return
    with open(p,"w",encoding="utf-8",newline="") as f:
        w=csv.writer(f,delimiter="\t",lineterminator="\n",quoting=csv.QUOTE_MINIMAL); w.writerow(list(V[0].keys()))
        for r in R: w.writerow([r[k] for k in V[0]])
def go(naam,R,js=False,verwacht=0,extra=()):
    p=f"in_{naam}."+("json" if js else "tsv"); schrijf(R,p,js); u=f"uit_{naam}"; shutil.rmtree(u,ignore_errors=True)
    x=subprocess.run(["python3","-I",f"{WM}/scripts/herbouw_master_N1-W06.py",WM,os.path.abspath(p),os.path.abspath(u),*extra],capture_output=True,text=True)
    ok=(x.returncode==verwacht); print(("✓" if ok else "✗"),naam,"rc",x.returncode,"|",(x.stdout.strip().splitlines() or [x.stderr.strip()[-300:]])[-1][:230])
    return ok
def m_cel(R): [r for r in R if r["week"]=="12"][0]["question"]+="x"
def m_leeg(R): [r for r in R if r["item_id"] in NIEUW][0]["id"]=""
def m_ca(R): [r for r in R if NIEUW.get(r["item_id"])=="1_W06ia"][3]["created_at"]="2026-10-29 10:00:09+00"
def m_extra(R): x=copy.deepcopy(R[0]); x["item_id"]="U1-extra-9"; R.append(x)
def m_weg(R): del R[5]
def m_upd_onger(R): [r for r in R if r["item_id"] not in GER and r["item_id"] not in NIEUW][10]["updated_at"]="2026-10-29 11:00:00+00"
def m_pub(R): [r for r in R if r["item_id"]=="U6-lezen-01"][0]["is_published"]="true"
def m_upd_niet(R): [r for r in R if r["item_id"] in GER][0]["updated_at"]=[v for v in V if v["item_id"]==[r for r in R if r["item_id"] in GER][0]["item_id"]][0]["updated_at"]
print("nieuw",len(NIEUW),"geraakt",len(GER),"rijen",len(V))
res=[go("goed",sim()),go("goed_json",sim(),js=True),go("cel",sim(m_cel),verwacht=2),go("leeg_id",sim(m_leeg),verwacht=2),go("created_at",sim(m_ca),verwacht=2),
     go("extra",sim(m_extra),verwacht=2),go("weg",sim(m_weg),verwacht=2),go("upd_ongeraakt",sim(m_upd_onger),verwacht=2),go("koppelen_gepubliceerd",sim(m_pub),verwacht=2),go("upd_niet",sim(m_upd_niet),verwacht=0)]
def m_ca2020(R): [r.__setitem__("created_at","2020-01-01 00:00:00+00") for r in R if NIEUW.get(r["item_id"])=="1_W06ia"]
def m_ua_voor(R): [r.__setitem__("updated_at","2026-10-29 09:00:00+00") for r in R if NIEUW.get(r["item_id"])=="2_W06ib"]
def m_geen_uuid(R): [r for r in R if r["item_id"] in NIEUW][0].__setitem__("id","x")
def m_dubbel_id(R): q=[r for r in R if r["item_id"] in NIEUW]; q[1]["id"]=q[0]["id"]
def m_kolom_weg(R): [r.pop("audio_url") for r in R]
res+=[go("created_at_2020",sim(m_ca2020),verwacht=2),go("updated_voor_created",sim(m_ua_voor),verwacht=2),go("id_geen_uuid",sim(m_geen_uuid),verwacht=2),
      go("dubbele_id",sim(m_dubbel_id),verwacht=2),go("json_zonder_kolom",sim(m_kolom_weg),js=True,verwacht=2),go("lege_export",[],js=True,verwacht=2),
      go("andere_variant_root",sim(),verwacht=2,extra=("--sql","p3/sql")),
      go("created_at_tijdzone",sim(lambda R:[r.__setitem__("created_at","2026-10-27 10:00:00+01") for r in R if NIEUW.get(r["item_id"])=="1_W06ia"]),verwacht=2)]
print(sum(res),"/",len(res))
