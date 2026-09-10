import json, csv
rows={ (r['name'], r['fmt']): r for r in json.load(open('consensus.json')) }
by_name={}
for r in json.load(open('consensus.json')): by_name.setdefault(r['name'],[]).append(r)

# Ultra Liquors, broadsheet + online, read off the founder's screenshots.
# Only matches where OUR pack size equals THEIRS. A 24x500ml case is not a
# comparable for our 24x330ml case — they get more liquid, so comparing them
# would be dishonest in both directions.
# (name, format, ultra case price, pack, note)
U = [
 ("Castle Lager","Quart (750ml)",229.99,"12 x 750ml","PROMO 1-15 Sep"),
 ("Black Label","Quart (750ml)",259.99,"12 x 750ml",""),
 ("Smirnoff Spin/Storm","Can (440ml)",439.99,"24 x 440ml",""),
 ("Belgravia G&T (Asstd)","Can (440ml)",479.99,"24 x 440ml",""),
 ("Hennessy VS","750ml Bottle",5949.00,"12 x 750ml",""),
 ("Klipdrift Export","750ml Bottle",2099.00,"12 x 750ml",""),
 ("Old Buck Gin","750ml Bottle",1799.00,"12 x 750ml",""),
 ("Johnnie Walker Red Label","750ml Bottle",2748.00,"12 x 750ml",""),
 ("Jameson Original Irish","750ml Bottle",4099.00,"12 x 750ml",""),
 ("Jameson Select Reserve","750ml Bottle",5748.00,"12 x 750ml",""),
 ("Ciroc Original Premium","750ml Bottle",3499.00,"12 x 750ml",""),
 ("Skyy Vodka Original","750ml Bottle",2799.00,"12 x 750ml",""),
 ("Amarula Original Cream","750ml Bottle",1728.00,"12 x 750ml",""),
 ("Wild Africa Cream Liqueur","750ml Bottle",1488.00,"12 x 750ml",""),
 ("Three Ships 5 Year Old","750ml Bottle",2100.00,"12 x 750ml",""),
 ("Strettons London Dry","750ml Bottle",1749.00,"12 x 750ml",""),
 ("J&B Rare","750ml Bottle",2299.00,"12 x 750ml","Bell's or J&B"),
 ("Moet & Chandon Imperial Brut","750ml Bottle",3570.00,"6 x 750ml",""),
 ("Krone Borealis Brut (MCC)","750ml Bottle",1050.00,"6 x 750ml",""),
 ("Drostdy-Hof Claret Select","5 Litre Box",670.00,"4 x 5L",""),
 # Ultra sells these by the 6-case or single; scaled to our 12-pack at their
 # stated per-bottle rate, which the broadsheet prints itself.
 ("Jagermeister Herbal Liqueur","750ml Bottle",295.00*12,"6 x 750ml @ R295/btl",""),
 ("Honor VS","750ml Bottle",490.00*12,"6 x 750ml @ R490/btl",""),
 ("Don Julio Reposado","750ml Bottle",749.83*12,"6 x 750ml @ R749.83/btl",""),
 ("Johnnie Walker Gold Label Reserve","750ml Bottle",570.00*12,"6 x 750ml @ R570/btl",""),
 ("Commando Brandy","750ml Bottle",196.99*12,"single R196.99","PROMO"),
 ("Gordons London Dry","750ml Bottle",169.99*12,"single R169.99",""),
]

out=[]
for name,fmt,ultra,pack,note in U:
    r=rows.get((name,fmt))
    if not r:
        print("NO MATCH:", name, "|", fmt); continue
    out.append(dict(id=r['id'], name=name, fmt=fmt, ours=float(r['ours'])*r['unitsPerCase'],
                    ultra=round(ultra,2), pack=pack, note=note,
                    units=r['unitsPerCase']))
for o in out:
    o['delta']=(o['ours']/o['ultra']-1)*100
out.sort(key=lambda o:-o['delta'])
print(f"\n{len(out)} exact-format matches against Ultra Liquors\n")
print(f"{'product':34} {'pack':22} {'ours':>10} {'Ultra':>10} {'diff':>8}")
print("-"*90)
for o in out:
    mark='  <-- we cost more' if o['delta']>5 else ('  (cheaper)' if o['delta']<-5 else '')
    print(f"{o['name'][:33]:34} {o['pack'][:22]:22} {o['ours']:10.2f} {o['ultra']:10.2f} {o['delta']:+7.1f}%{mark}")
json.dump(out, open('ultra.json','w'), indent=1)
over=[o for o in out if o['delta']>0]
print(f"\nwe are dearer on {len(over)}/{len(out)}; cheaper on {len(out)-len(over)}")
