import json, re, sys, math
sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, sys.argv[2]); from match import norm, sim, dist  # reuse helpers
D=sys.argv[1]
m=json.load(open(D+"/match.json",encoding="utf-8"))
db={}
for l in open(D+"/db.tsv",encoding="utf-8"):
    i,n,la,ln,st=l.rstrip("\n").split("\t"); db[i]=dict(name=n,lat=float(la),lng=float(ln),st=st)
def q(s): return "null" if s is None else "'"+s.replace("'","''")+"'"
def phone(p):
    d=re.sub(r"\D","",p)
    if d.startswith("639") and len(d)==12: return f"0{d[2:5]} {d[5:8]} {d[8:]}"
    if d.startswith("6333") and len(d)==11: return f"(033) {d[4:7]} {d[7:]}"
    return None
OK_SITES=("booklattecafe.com","cicadacafe.ph","localcoffeeph.com","neighborcoffee.ph","fuel.ph","tinukib.com")
BAD={("e4d22a54","Kai Royal Tea")}  # name differs (tea brand page)
# ---- fill-ins
best={}
for r in m["matched"]:
    d,s=r["m"]
    if s<0.9 or d>60: continue
    k=r["db"]
    if k not in best or r["conf"]>best[k]["conf"]: best[k]=r
upd=[]
for k,r in best.items():
    fb=next((x for x in r["socials"] if "facebook.com" in x),None)
    ph=next((phone(p) for p in r["phones"] if phone(p)),None)
    web=next((w for w in r["websites"] if any(o in w for o in OK_SITES)),None)
    if web and not web.startswith("http"): web="https://"+web
    sets=[]
    if fb: sets.append(f"facebook = coalesce(facebook, {q(fb)})")
    if ph: sets.append(f"phone = coalesce(phone, {q(ph)})")
    if web: sets.append(f"website = coalesce(website, {q(web)})")
    if sets: upd.append(f"-- {db[k]['name']} ({db[k]['st']}) <- Overture '{r['name']}', {r['m'][0]} m\nupdate public.cafes set {', '.join(sets)} where id::text like '{k}%';")
# ---- new drafts
NOT=re.compile(r"internet|i-?cafe|net cafe|computer|carwash|car wash|detailing|massage|pharmacy|boarding|studio|review|gaming|rattan|real estate|printing|intertrade|\bresto grill|lechon|sizzling|chicken|pares|food products|hotel services|i\.? ?net|milk ?tea|thai tea|shisha|berry land|^brgy|^e\. lopez|vintage|paddock|epicenter|space\b|study hub|co-?working|litrato|cakes?\b|silvanas|donut|bakery|bakeshop|fitness",re.I)
TOWNS=re.compile(r"oton|pavia|sta\.? ?barbara|santa barbara|alimodian|leganes|jordan|guimaras|zarraga|tigbauan",re.I)
FORCE_DROP={"Glory's Cafe 3rd Gen","Cafe Aroma Festive Walk","Deleonian Cafe","Stir Bear Cafe","Carlos Cafe"}
FORCE_KEEP={"Coffee House Beanery","SO Cafe and Bar","BAS Cafe","Basti’s Cafe","Garahe Cafe","Brewing Point","Latte Coffee Cafe","Kai Royal Cafe - CPU","Kai Royal Cafe - San Agustin","Coffee Brewtherhood"}
CHAIN=re.compile(r"bo's coffee|but first,? coffee|don macchiatos|cha tuk chak|kkopi|coftea|zus coffee",re.I)
cand=[r for r in m["new"] if r["cat"] in("coffee_shop","cafe") and r["conf"]>=0.5]
skipped={"not a cafe":[],"other town":[],"maybe duplicate":[],"repeat":[]}
keep=[]
for r in cand:
    a=r["addr"] or ""
    if NOT.search(r["name"]): skipped["not a cafe"].append(r["name"]); continue
    if TOWNS.search(a) or TOWNS.search(r["name"]): skipped["other town"].append(r["name"]); continue
    if r["name"].strip() in FORCE_DROP: skipped["maybe duplicate"].append(r["name"]+" (manual)"); continue
    dup=None if r["name"].strip() in FORCE_KEEP else next((v["name"] for v in db.values() if dist(r["lat"],r["lng"],v["lat"],v["lng"])<1500 and sim(r["name"],v["name"])>=0.7),None)
    if dup: skipped["maybe duplicate"].append(f'{r["name"]} ~ {dup}'); continue
    if any(norm(r["name"])==norm(k["name"]) and dist(r["lat"],r["lng"],k["lat"],k["lng"])<600 for k in keep): skipped["repeat"].append(r["name"]); continue
    keep.append(r)
def slug(n,o): 
    s=re.sub(r"[^a-z0-9]+","-",norm(n) if False else re.sub(r"[^\x00-\x7f]","",n.lower())).strip("-")
    return f"{s}-{o[:6]}"
ins=[]
for r in sorted(keep,key=lambda r:-r["conf"]):
    fb=next((x for x in r["socials"] if "facebook.com" in x),None)
    ph=next((phone(p) for p in r["phones"] if phone(p)),None)
    addr=(r["addr"] or "").replace("\n"," ").strip(" ,") or None
    ins.append(f"({q(slug(r['name'],r['oid']))}, {q(r['name'].strip())}, {q(addr)}, extensions.st_makepoint({r['lng']}, {r['lat']})::extensions.geography, {q(ph)}, {q(fb)}, {q('overture/'+r['oid'])}, 'overture', {'true' if CHAIN.search(r['name']) else 'false'})")
open(D+"/enrich.sql","w",encoding="utf-8").write("-- Fill blanks only (coalesce keeps existing values). Source: Overture Maps places (Meta/Foursquare, open licences).\n"+"\n".join(upd)+"\n")
open(D+"/drafts.sql","w",encoding="utf-8").write("-- New unpublished drafts from Overture Maps places. Verify open before publishing.\ninsert into public.cafes (slug, name, address, location, phone, facebook, osm_id, source, is_chain) values\n"+",\n".join(ins)+"\non conflict (osm_id) do nothing;\n")
print("fill-ins:",len(upd)," new drafts:",len(keep))
for k,v in skipped.items(): print(f"\n{k} ({len(v)}):", "; ".join(v))
print("\nKEEP:", "; ".join(r["name"] for r in keep))
