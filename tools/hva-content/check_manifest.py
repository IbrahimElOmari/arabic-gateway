import sys, re, hashlib, os
root, man = sys.argv[1], sys.argv[2]
rx = re.compile(r"^\| `([^`]+)` \| (\d+) \| `([0-9a-f]{32})` \|")
n=ok=0; fouten=[]; genoemd=set()
for line in open(man, encoding="utf-8"):
    m = rx.match(line)
    if not m: continue
    n+=1; p, b, h = m.group(1), int(m.group(2)), m.group(3); genoemd.add(p)
    fp = os.path.join(root, p)
    if not os.path.exists(fp): fouten.append((p,"ontbreekt")); continue
    data=open(fp,"rb").read()
    if len(data)!=b or hashlib.md5(data).hexdigest()!=h: fouten.append((p,f"afwijkend bytes={len(data)} md5={hashlib.md5(data).hexdigest()}"))
    else: ok+=1
extra=[]
for d,_,fs in os.walk(root):
    for f in fs:
        rel=os.path.relpath(os.path.join(d,f),root)
        if rel not in genoemd and rel!=os.path.basename(man): extra.append(rel)
print("manifestregels",n,"ok",ok,"fouten",len(fouten),"extra bestanden",len(extra))
for f in fouten: print("FOUT",f)
for e in extra: print("EXTRA",e)
