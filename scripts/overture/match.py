import json, math, re, unicodedata, difflib, sys
def load_db(D):
    db=[dict(zip(["id","name","lat","lng","st"],l.rstrip("\n").split("\t"))) for l in open(D+"/db.tsv",encoding="utf-8")]
    for d in db: d["lat"]=float(d["lat"]); d["lng"]=float(d["lng"])
    return db
STOP={"cafe","coffee","the","co","company","and","shop","iloilo","city","n","kape","specialty","house","bar","tea","cafe&","inc","ph"}
def norm(s):
    s=unicodedata.normalize("NFKD",s).encode("ascii","ignore").decode().lower()
    s=re.sub(r"\(.*?\)","",s); s=re.sub(r"[^a-z0-9 ]"," ",s)
    t=[w for w in s.split() if w not in STOP]
    return " ".join(t) or s.strip()
def dist(a,b,c,d):
    R=6371000; p=math.radians
    x=p(d-b)*math.cos(p((a+c)/2)); y=p(c-a); return R*math.hypot(x,y)
def sim(a,b):
    a,b=norm(a),norm(b)
    if not a or not b: return 0
    if a in b or b in a: return 0.95
    return difflib.SequenceMatcher(None,a,b).ratio()
CHAINS=["starbucks","coffee break","coffeebreak","bo s coffee","bos coffee","pickup coffee","dunkin","seattle","coffee bean","tim hortons","j co","mister donut","sharetea","tiger sugar","macao","moonleaf","but first coffee","zus coffee","cbtl","dairy queen","jollibee","mcdonald","chatime","coco ","gong cha","serenitea","tealive","presso","kkv","7-eleven","ministop","family mart","highlands","yellow cab","cafe amazon","cafe france","krispy kreme","chowking","greenwich","mang inasal","red ribbon","goldilocks","potato corner","infinitea","dakasi","happy lemon","koi the","chickpea","brew bear","juan coffee"]

if __name__=="__main__":
    D=sys.argv[1]; db=load_db(D)
    rows=json.load(open(D+"/cafes-raw.json",encoding="utf-8"))
    out={"matched":[],"new":[],"chain":[],"lowconf":[]}
    for f in rows:
        p=f["properties"]; a=(p.get("addresses") or [{}])[0]
        if (a.get("locality") or "").lower()!="iloilo city": continue
        lng,lat=f["geometry"]["coordinates"]; name=p["names"]["primary"] or ""
        rec={"name":name,"lat":round(lat,7),"lng":round(lng,7),"conf":round(p["confidence"],2),"cat":p.get("basic_category"),
             "addr":a.get("freeform"),"phones":p.get("phones") or [],"socials":p.get("socials") or [],"websites":p.get("websites") or [],
             "src":[s["dataset"] for s in p["sources"] if s["dataset"]!="Overture"],"oid":f["id"]}
        best=None
        for d in db:
            dd=dist(lat,lng,d["lat"],d["lng"]); s=sim(name,d["name"])
            if (dd<400 and s>=0.75) or (dd<80 and s>=0.5):
                score=s-dd/2000
                if not best or score>best[0]: best=(score,d,round(dd),round(s,2))
        nl=" "+norm(name)+" "; low=name.lower()
        if best: rec["db"]=best[1]["id"]; rec["dbname"]=best[1]["name"]; rec["st"]=best[1]["st"]; rec["m"]=[best[2],best[3]]; out["matched"].append(rec)
        elif any(c in low or c in nl for c in CHAINS): out["chain"].append(rec)
        elif rec["conf"]<0.5: out["lowconf"].append(rec)
        else: out["new"].append(rec)
    json.dump(out,open(D+"/match.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
    for k,v in out.items(): print(k,len(v))
