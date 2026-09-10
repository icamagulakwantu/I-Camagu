import re, csv, json, sys, collections

REFMAP = json.load(open('ref-map.json'))                       # P### -> sku id
SKUS   = {r['id']: r for r in csv.DictReader(open('skus_clean.tsv'), delimiter='\t')}
BYREF  = {ref: SKUS[sid] for ref, sid in REFMAP.items()}

ROW = re.compile(r'\bP(\d{3})\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|'
                 r'\s*([^|]+?)\s*\|\s*([A-Za-z]+)\s*\|\s*([VLE])\b')

def num(s):
    s = s.strip().upper().replace('R','').replace(',','')
    if s in ('NONE','UNKNOWN','N/A','-',''): return None
    try: return float(s)
    except ValueError: return None

def parse(path, source):
    txt = open(path).read()
    out = {}
    for m in ROW.finditer(txt):
        ref = 'P' + m.group(1)
        out[ref] = {'source':source, 'ref':ref,
                    'low':num(m.group(2)), 'high':num(m.group(3)),
                    'pack':num(m.group(4)), 'qty':num(m.group(5)),
                    'shop':m.group(6).strip().upper(), 'tier':m.group(7)}
    return out

def report(rows, source):
    print(f"=== {source} ===")
    missing = [r for r in REFMAP if r not in rows]
    print(f"rows parsed      : {len(rows)}/294" + (f"   MISSING: {missing[:8]}" if missing else "   (complete)"))

    tiers = collections.Counter(v['tier'] for v in rows.values())
    print(f"evidence tiers   : " + "  ".join(f"{k}={tiers.get(k,0)}" for k in 'VLE'))

    shops = collections.Counter(v['shop'] for v in rows.values())
    print(f"retailers cited  : " + "  ".join(f"{k}={n}" for k,n in shops.most_common()))

    withpack = sum(1 for v in rows.values() if v['pack'])
    print(f"pack/case prices : {withpack}/294  ({withpack/294*100:.0f}%)")

    bad = [r for r,v in rows.items() if v['low'] is None or v['high'] is None or v['low']>v['high']]
    print(f"malformed ranges : {len(bad)}" + (f"  {bad[:6]}" if bad else ""))

    wide = sorted(((v['high']/v['low'], r) for r,v in rows.items()
                   if v['low'] and v['high'] and v['low']>0), reverse=True)[:5]
    print("widest ranges    : " + ", ".join(f"{r} x{m:.1f}" for m,r in wide))

    # ---- controls -------------------------------------------------------
    print("\n--- controls (we already know the true shop price) ---")
    hits=positions=0; total=0; misses=[]
    for ref, sku in sorted(BYREF.items()):
        if not sku['knownRetail']: continue
        true_unit = float(sku['knownRetail']) / int(sku['unitsPerCase'])
        v = rows.get(ref)
        if not v or v['low'] is None: continue
        total += 1
        lo, hi = v['low'], v['high']
        inside = lo <= true_unit <= hi
        pos = (true_unit - lo) / (hi - lo) if hi > lo else 0.5
        hits += inside
        positions += min(max(pos,0),1) if inside else (0.0 if true_unit<lo else 1.0)
        flag = 'HIT ' if inside else 'MISS'
        if not inside: misses.append((ref, sku['name'], true_unit, lo, hi))
        print(f"  {flag} {ref} {sku['name'][:31]:31} true R{true_unit:8.2f}   "
              f"said R{lo:.2f}-{hi:.2f}   pos {pos:+.2f}")
    print(f"\n  accuracy      : {hits}/{total} inside range ({hits/total*100:.0f}%)")
    print(f"  mean position : {positions/total:.2f}   "
          f"(0.5 = centred · >0.5 = ranges run LOW · <0.5 = ranges run HIGH)")
    return rows, misses

rows, misses = report(parse(sys.argv[1], sys.argv[2]), sys.argv[2])
json.dump(rows, open(f"runs/{sys.argv[2].lower()}.json",'w'), indent=1)
