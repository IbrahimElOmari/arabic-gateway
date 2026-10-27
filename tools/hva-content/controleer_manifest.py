# Controleert alle md5's in een bundelmanifest tegen de uitgepakte bestanden.
# Gebruik: python3 -I controleer_manifest.py <manifest.md> <bundelmap>
import sys, re, hashlib, os
man, basis = sys.argv[1], sys.argv[2]
rx = re.compile(r"^\| `([^`]+)` \| (\d+) \| `([0-9a-f]{32})` \|")
n = ok = 0; fout = []
for regel in open(man, encoding="utf-8"):
    m = rx.match(regel)
    if not m: continue
    n += 1
    pad, bytes_, md5 = m.group(1), int(m.group(2)), m.group(3)
    vol = os.path.join(basis, pad)
    if not os.path.exists(vol):
        fout.append((pad, "ONTBREEKT")); continue
    data = open(vol, "rb").read()
    h = hashlib.md5(data).hexdigest()
    if h == md5 and len(data) == bytes_: ok += 1
    else: fout.append((pad, f"md5 {h} bytes {len(data)} (verwacht {md5} {bytes_})"))
extra = []
for root, _, files in os.walk(basis):
    for f in files:
        rel = os.path.relpath(os.path.join(root, f), basis)
        if rel.startswith("MANIFEST_N1-W04_deel4.md"): continue
        extra.append(rel)
print(f"manifestregels {n} · ok {ok} · fout {len(fout)} · bestanden op schijf (zonder manifest deel4) {len(extra)}")
for p, w in fout: print("FOUT", p, w)
sys.exit(1 if fout or ok != n else 0)
