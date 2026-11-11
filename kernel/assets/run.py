import os, sys, json, re, io, math, subprocess, time, gzip, html, shutil
from pathlib import Path

def sh(c, check=True):
    print("$", c[:140], flush=True)
    r = subprocess.run(c, shell=True)
    if check and r.returncode:
        raise SystemExit("command failed: " + c[:100])

sh("apt-get update -qq && apt-get install -y -qq espeak-ng > /dev/null", check=False)
sh("pip install -q rasterio pyproj kornia einops timm soundfile scikit-image", check=False)
sh("pip install -q --prefer-binary 'spacy>=3.8.4'", check=False)
sh("pip install -q --prefer-binary kokoro", check=False)

import numpy as np, requests
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

OUT = Path("/kaggle/working/assets")
for d in ["maps", "photos", "cutouts", "voice", "audio", "qa", "raw"]:
    (OUT / d).mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "EverestShortsPipeline/1.0 (educational video; GitHub project)"}
LOG = {}

# ------------------------------------------------------------------ 1. Wide Asia map (NASA GIBS Blue Marble + shaded relief)
def asia():
    lon0, lat0, lon1, lat1 = 66, 8, 110, 48
    W, H = 6144, int(6144 * (lat1 - lat0) / (lon1 - lon0))
    url = ("https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1"
           f"&LAYERS=BlueMarble_ShadedRelief_Bathymetry&STYLES=&SRS=EPSG:4326&BBOX={lon0},{lat0},{lon1},{lat1}"
           f"&WIDTH={W}&HEIGHT={H}&FORMAT=image/jpeg")
    r = requests.get(url, headers=UA, timeout=300)
    r.raise_for_status()
    im = Image.open(io.BytesIO(r.content)).convert("RGB")
    im.save(OUT / "maps/asia.jpg", quality=90)
    LOG["asia"] = {"bbox": [lon0, lat0, lon1, lat1], "w": im.size[0], "h": im.size[1]}
    # country polygons (Natural Earth, public domain)
    g = requests.get("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson", headers=UA, timeout=300).json()
    keep = {}
    for f in g["features"]:
        n = f["properties"].get("ADMIN") or f["properties"].get("NAME")
        if n in ("Nepal", "India", "China", "Bhutan", "Pakistan", "Bangladesh"):
            geom = f["geometry"]
            polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
            keep[n] = [[[round(x, 4), round(y, 4)] for x, y in p[0]] for p in polys]
    json.dump(keep, open(OUT / "maps/countries.json", "w"))
asia()
print("asia done", flush=True)

# ------------------------------------------------------------------ 2. Sentinel-2 + SRTM terrain around Everest
import rasterio
from rasterio.windows import Window
from rasterio.enums import Resampling
from pyproj import Transformer

def terrain():
    body = {"collections": ["sentinel-2-l2a"], "bbox": [86.7, 27.8, 87.1, 28.2],
            "datetime": "2022-10-01T00:00:00Z/2024-03-31T23:59:59Z", "limit": 60,
            "query": {"eo:cloud_cover": {"lt": 15}}}
    feats = requests.post("https://earth-search.aws.element84.com/v1/search", json=body, timeout=120).json()["features"]
    feats.sort(key=lambda f: f["properties"]["eo:cloud_cover"])
    print("S2 candidates", len(feats), flush=True)
    CW, CH = 25000.0, 33333.0  # metres (3:4 portrait)
    from rasterio.merge import merge
    best = None
    cands = [f for f in feats if "45RVM" in f["id"]][:12]
    for f in cands:
        try:
            south = requests.get("https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/" + f["id"].replace("45RVM", "45RVL"), timeout=60).json()
            if "assets" not in south:
                continue
            with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", AWS_NO_SIGN_REQUEST="YES"):
                dn, dsu = rasterio.open(f["assets"]["visual"]["href"]), rasterio.open(south["assets"]["visual"]["href"])
                tr = Transformer.from_crs("EPSG:4326", dn.crs, always_xy=True)
                cx, cy = tr.transform(86.89, 27.985)
                left, top = cx - CW / 2, cy + CH / 2
                data, _ = merge([dn, dsu], bounds=(left, top - CH, left + CW, top), res=10, nodata=0)
                arr = np.asarray(Image.fromarray(np.moveaxis(data[:3], 0, -1)).resize((3600, 4800), Image.BICUBIC))
                arr = np.moveaxis(arr, -1, 0)
                nv = (data[:3].sum(0) == 0).mean()
                print("cand", f["id"], "nodata", round(float(nv), 4), "south cloud", south["properties"]["eo:cloud_cover"], flush=True)
                if nv > 0.002 or south["properties"]["eo:cloud_cover"] > 30:
                    continue
                best = (f, arr, left, top, dn.crs)
                break
        except Exception as e:
            print("skip", str(e)[:120], flush=True)
    assert best, "no valid Sentinel-2 scene"
    f, arr, left, top, crs = best
    LOG["s2"] = {"id": f["id"], "datetime": f["properties"]["datetime"], "cloud": f["properties"]["eo:cloud_cover"]}
    rgb = np.moveaxis(arr, 0, -1).astype(np.float32)
    lo, hi = np.percentile(rgb, 1), np.percentile(rgb, 99.7)
    rgb = np.clip((rgb - lo) / (hi - lo), 0, 1) ** 0.9 * 255
    # DEM (SRTM-derived, 1 arc-second, AWS terrain tiles "skadi")
    tiles = {}
    for la in ("N27", "N28"):
        for lo_ in ("E086", "E087"):
            u = f"https://s3.amazonaws.com/elevation-tiles-prod/skadi/{la}/{la}{lo_}.hgt.gz"
            tiles[(la, lo_)] = np.frombuffer(gzip.decompress(requests.get(u, headers=UA, timeout=120).content), ">i2").reshape(3601, 3601).astype(np.float32)
    top_row = np.hstack([tiles[("N28", "E086")][:-1, :-1], tiles[("N28", "E087")][:-1]])
    bot_row = np.hstack([tiles[("N27", "E086")][:, :-1], tiles[("N27", "E087")]])
    mos = np.vstack([top_row, bot_row])  # lat 29 -> 27, lon 86 -> 88
    mos[mos < -1000] = np.nan
    if np.isnan(mos).any():
        idx = ndi.distance_transform_edt(np.isnan(mos), return_distances=False, return_indices=True)
        mos = mos[tuple(idx)]
    inv = Transformer.from_crs(crs, "EPSG:4326", always_xy=True)

    def sample(nx, ny):
        xs = left + (np.arange(nx) + 0.5) * CW / nx
        ys = top - (np.arange(ny) + 0.5) * CH / ny
        X, Y = np.meshgrid(xs, ys)
        lon, lat = inv.transform(X, Y)
        return ndi.map_coordinates(mos, [(29 - lat) * 3600, (lon - 86) * 3600], order=1, mode="nearest")
    # hillshade
    hw, hh = 1800, 2400
    z = ndi.gaussian_filter(sample(hw, hh), 1.0)
    cell = CW / hw
    dzdy, dzdx = np.gradient(z * 1.6, cell)  # rows go south
    nx_, ny_, nz_ = -dzdx, dzdy, np.ones_like(z)  # north = -rows
    nn = np.sqrt(nx_ ** 2 + ny_ ** 2 + nz_ ** 2)
    az, alt = math.radians(305), math.radians(42)
    L = (math.sin(az) * math.cos(alt), math.cos(az) * math.cos(alt), math.sin(alt))
    hs = np.clip((nx_ * L[0] + ny_ * L[1] + nz_ * L[2]) / nn, 0, 1)
    hs_full = np.asarray(Image.fromarray((hs * 255).astype(np.uint8)).resize((3600, 4800), Image.BICUBIC)).astype(np.float32) / 255
    fac = (0.38 + 0.85 * hs_full)[..., None]
    col = np.clip(rgb * fac, 0, 255).astype(np.uint8)
    Image.fromarray(col).save(OUT / "maps/terrain_color.jpg", quality=90)
    # height map for the Three.js mesh (16-bit packed in R,G; value = metres * 7)
    mw, mh = 480, 640
    hm = sample(mw, mh)
    packed = np.clip(np.round(hm * 7), 0, 65535).astype(np.uint16)
    hpng = np.zeros((mh, mw, 3), np.uint8)
    hpng[..., 0] = packed >> 8
    hpng[..., 1] = packed & 255
    Image.fromarray(hpng).save(OUT / "maps/terrain_height.png")
    tr = Transformer.from_crs("EPSG:4326", crs, always_xy=True)
    poi = {"everest": (86.9250, 27.9881), "ebc": (86.8528, 28.0026), "lhotse": (86.9333, 27.9617),
           "nuptse": (86.8833, 27.9667), "icefall": (86.8590, 27.9930)}
    P = {}
    for k, (lo_, la_) in poi.items():
        X, Y = tr.transform(lo_, la_)
        px, py = (X - left) / CW, (top - Y) / CH
        el = float(hm[int(np.clip(py * mh, 0, mh - 1)), int(np.clip(px * mw, 0, mw - 1))])
        P[k] = {"u": px, "v": py, "elev": el}
    LOG["terrain"] = {"width_m": CW, "height_m": CH, "min": float(hm.min()), "max": float(hm.max()), "poi": P, "hm": [mw, mh], "scale": 7}
terrain()
print("terrain done", json.dumps(LOG["terrain"]["poi"]), flush=True)

# ------------------------------------------------------------------ 3. Wikimedia Commons photos (CC0 / PD / CC BY only)
OKLIC = re.compile(r"^(CC0.*|Public domain|PD[- ].*|CC BY \d\.\d( [A-Za-z]+)?)$", re.I)
CREDITS = {}

def commons(query, k):
    p = {"action": "query", "format": "json", "generator": "search", "gsrsearch": query + " filetype:bitmap", "gsrnamespace": 6,
         "gsrlimit": 40, "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata", "iiurlwidth": 1600}
    r = requests.get("https://commons.wikimedia.org/w/api.php", params=p, headers=UA, timeout=60).json()
    pages = sorted(r.get("query", {}).get("pages", {}).values(), key=lambda x: x.get("index", 99))
    res = []
    for pg in pages:
        ii = (pg.get("imageinfo") or [None])[0]
        if not ii or ii["mime"] not in ("image/jpeg", "image/png") or ii["width"] < 1200:
            continue
        md = ii["extmetadata"]
        lic = md.get("LicenseShortName", {}).get("value", "")
        if not OKLIC.match(lic.strip()) or "SA" in lic.upper().split() or md.get("NonFree", {}).get("value", "").lower() == "true":
            continue
        t = pg["title"].lower()
        if any(b in t for b in ("map", "stamp", "logo", "flag of", "diagram", "coin")):
            continue
        artist = re.sub(r"<[^>]+>", "", html.unescape(md.get("Artist", {}).get("value", "Unknown"))).strip()
        res.append({"title": pg["title"], "url": ii.get("thumburl") or ii["url"], "license": lic.strip(), "artist": artist[:80],
                    "page": ii["descriptionurl"], "attr": not lic.upper().startswith(("CC0", "PUBLIC", "PD"))})
        if len(res) >= k:
            break
    return res

def fetch(url, path):
    for i in range(4):
        try:
            r = requests.get(url, headers=UA, timeout=120)
            if r.status_code == 429:
                time.sleep(8 * (i + 1)); continue
            r.raise_for_status()
            Image.open(io.BytesIO(r.content)).convert("RGB").save(path, quality=92)
            return True
        except Exception as e:
            time.sleep(3)
    return False

CUT_Q = {"yak": "yak Himalaya", "snowleopard": "snow leopard", "tahr": "Himalayan tahr", "monal": "Himalayan monal", "redpanda": "red panda",
         "climber": "mountaineer ice axe summit", "sherpa": "Sherpa mountaineer Nepal", "helicopter": "helicopter Lukla Nepal",
         "tent": "expedition tent mountaineering", "oxygen": "oxygen cylinder mountaineering", "icaxe": "ice axe",
         "crampons": "crampons mountaineering", "backpack": "mountaineering backpack", "prayerflags": "prayer flags Nepal",
         "pika": "pika", "yeti": "Himalayan marmot"}
PHOTO_Q = {"everest": "Mount Everest summit pyramid", "icefall": "Khumbu Icefall", "hillary": "Edmund Hillary", "tenzing": "Tenzing Norgay",
           "basecamp": "Everest Base Camp tents", "kalapatthar": "Everest Kala Patthar", "lhotse": "Lhotse Nuptse Everest", "climbers": "climbers Everest ridge"}
cut_src, photo_src = {}, {}
for key, q in CUT_Q.items():
    try:
        for i, it in enumerate(commons(q, 3)):
            fn = f"{key}_{i}"
            if fetch(it["url"], OUT / f"raw/{fn}.jpg"):
                cut_src[fn] = it
            time.sleep(1.2)
    except Exception as e:
        print("commons fail", q, str(e)[:80], flush=True)
for key, q in PHOTO_Q.items():
    try:
        for i, it in enumerate(commons(q, 5)):
            fn = f"{key}_{i}"
            if fetch(it["url"], OUT / f"photos/{fn}.jpg"):
                photo_src[fn] = it
            time.sleep(1.2)
    except Exception as e:
        print("commons fail", q, str(e)[:80], flush=True)
CREDITS = {"cutouts": cut_src, "photos": photo_src}
json.dump(CREDITS, open(OUT / "credits.json", "w"), indent=1)
print("photos", len(cut_src), len(photo_src), flush=True)

# ------------------------------------------------------------------ 4. Background removal: BiRefNet only
import torch
from torchvision import transforms
from transformers import AutoModelForImageSegmentation
dev = "cuda" if torch.cuda.is_available() else "cpu"
try:
    bm = AutoModelForImageSegmentation.from_pretrained("ZhengPeng7/BiRefNet", trust_remote_code=True)
except Exception as e:
    print("BiRefNet load retry:", str(e)[:200], flush=True)
    bm = AutoModelForImageSegmentation.from_pretrained("ZhengPeng7/BiRefNet", trust_remote_code=True, low_cpu_mem_usage=False, device_map=None)
bm = bm.to(dev).eval()
tf = transforms.Compose([transforms.Resize((1024, 1024)), transforms.ToTensor(), transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])])

def cutout(im):
    W, H = im.size
    with torch.no_grad():
        p = bm(tf(im).unsqueeze(0).to(dev))[-1].sigmoid().cpu()[0, 0].numpy()
    a = np.asarray(Image.fromarray((p * 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)).astype(np.float32) / 255
    a = np.clip((a - 0.12) / 0.7, 0, 1)
    lab, n = ndi.label(a > 0.5)
    if n:
        areas = ndi.sum(np.ones_like(a), lab, range(1, n + 1))
        keep = [i + 1 for i, s in enumerate(areas) if s >= 0.02 * areas.max()]
        a *= np.isin(lab, keep)
    a = ndi.grey_erosion(a, size=(3, 3))
    a = ndi.gaussian_filter(a, 0.8)
    rgb = np.asarray(im).astype(np.float32)
    m = (a > 0.97).astype(np.float32)
    num = np.stack([ndi.gaussian_filter(rgb[..., c] * m, 3) for c in range(3)], -1)
    den = ndi.gaussian_filter(m, 3)[..., None]
    inner = num / np.maximum(den, 1e-3)
    edge = ((a < 0.97) & (den[..., 0] > 0.03))[..., None]
    rgb = np.where(edge, inner, rgb)
    touch = [bool((a[:3] > 0.5).mean() > 0.2), bool((a[-3:] > 0.5).mean() > 0.2), bool((a[:, :3] > 0.5).mean() > 0.2), bool((a[:, -3:] > 0.5).mean() > 0.2)]
    ys, xs = np.where(a > 0.03)
    if len(ys) == 0:
        return None, 0, touch
    y0, y1, x0, x1 = max(ys.min() - 8, 0), min(ys.max() + 9, H), max(xs.min() - 8, 0), min(xs.max() + 9, W)
    out = np.dstack([rgb, a * 255])[y0:y1, x0:x1].astype(np.uint8)
    o = Image.fromarray(out, "RGBA")
    s = 1100 / max(o.size)
    if s < 1:
        o = o.resize((int(o.size[0] * s), int(o.size[1] * s)), Image.LANCZOS)
    return o, float((a > 0.5).mean()), touch

qa = {}
for fn in sorted(cut_src):
    try:
        im = Image.open(OUT / f"raw/{fn}.jpg").convert("RGB")
        im.thumbnail((2000, 2000))
        o, cov, touch = cutout(im)
        if o is not None:
            o.save(OUT / f"cutouts/{fn}.png")
            qa[fn] = {"coverage": round(cov, 3), "touch": touch}
    except Exception as e:
        print("cut fail", fn, str(e)[:100], flush=True)
json.dump(qa, open(OUT / "qa/cutout_qa.json", "w"), indent=1)
shutil.rmtree(OUT / "raw")
del bm
torch.cuda.empty_cache()

def sheet(names, folder, path, cutmode):
    cw, ch = (420, 300) if cutmode else (400, 280)
    cols = 4
    rows = math.ceil(len(names) / cols)
    S = Image.new("RGB", (cols * cw, rows * ch), (128, 128, 128))
    d = ImageDraw.Draw(S)
    for i, n in enumerate(names):
        x, y = (i % cols) * cw, (i // cols) * ch
        im = Image.open(OUT / folder / f"{n}.png" if cutmode else OUT / folder / f"{n}.jpg").convert("RGBA" if cutmode else "RGB")
        if cutmode:
            for j, bg in enumerate(((255, 255, 255), (10, 22, 60))):
                t = im.copy(); t.thumbnail((cw // 2 - 8, ch - 30))
                b = Image.new("RGB", (cw // 2, ch - 22), bg)
                b.paste(t, (4, 4), t)
                S.paste(b, (x + j * cw // 2, y + 22))
        else:
            im.thumbnail((cw - 8, ch - 30)); S.paste(im, (x + 4, y + 24))
        d.rectangle([x, y, x + cw, y + 20], fill=(0, 0, 0)); d.text((x + 4, y + 4), n, fill=(255, 255, 0))
    S.save(path, quality=88)

cn = sorted(qa)
for i in range(0, len(cn), 12):
    sheet(cn[i:i + 12], "cutouts", OUT / f"qa/cutouts_{i // 12}.jpg", True)
pn = sorted(photo_src)
for i in range(0, len(pn), 16):
    sheet(pn[i:i + 16], "photos", OUT / f"qa/photos_{i // 16}.jpg", False)

# ------------------------------------------------------------------ 5. Narration with Kokoro (American male voice)
NARR = [
    ("This is the highest point on Earth.", "This is the highest point on Earth."),
    ("Mount Everest rises eight thousand, eight hundred forty-nine meters above sea level.", "Mount Everest rises 8,849 meters above sea level."),
    ("It stands in the Himalayas, right on the border between Nepal and China.", "It stands in the Himalayas, right on the border between Nepal and China."),
    ("The Himalayas stretch about two thousand four hundred kilometers across Asia.", "The Himalayas stretch about 2,400 kilometers across Asia."),
    ("They began rising about fifty million years ago, when India crashed into Eurasia.", "They began rising about 50 million years ago, when India crashed into Eurasia."),
    ("And the collision never stopped. Everest is still growing, by about four millimeters every year.", "And the collision never stopped. Everest is still growing, by about 4 millimeters every year."),
    ("On May twenty-ninth, nineteen fifty-three, Edmund Hillary and Tenzing Norgay became the first climbers confirmed to stand on top.", "On May 29, 1953, Edmund Hillary and Tenzing Norgay became the first climbers confirmed to stand on top."),
    ("Today, many expeditions start from Base Camp, at five thousand three hundred sixty-four meters, on the Nepal side.", "Today, many expeditions start from Base Camp, at 5,364 meters, on the Nepal side."),
    ("From there, climbers must cross the Khumbu Icefall, a frozen river of moving ice.", "From there, climbers must cross the Khumbu Icefall, a frozen river of moving ice."),
    ("Above eight thousand meters lies the death zone.", "Above 8,000 meters lies the death zone."),
    ("At the summit, oxygen pressure is only about one third of sea level.", "At the summit, oxygen pressure is only about one third of sea level."),
    ("Everest. The roof of the world.", "Everest. The roof of the world."),
]
import soundfile as sf
from kokoro import KPipeline
pipe = KPipeline(lang_code="a")
SR = 24000
timeline, t = [], 0.35
for i, (say, show) in enumerate(NARR):
    chunks = [np.asarray(r.audio, dtype=np.float32) for r in pipe(say, voice="am_michael", speed=0.98)]
    a = np.concatenate(chunks)
    nz = np.where(np.abs(a) > 0.012)[0]
    a = a[max(nz[0] - int(0.06 * SR), 0): nz[-1] + int(0.10 * SR)]
    a = a / max(np.abs(a).max(), 1e-3) * 0.9
    sf.write(OUT / f"voice/s{i + 1:02d}.wav", a, SR)
    d = len(a) / SR
    timeline.append({"i": i + 1, "show": show, "start": round(t, 3), "end": round(t + d, 3), "dur": round(d, 3), "file": f"voice/s{i + 1:02d}.wav"})
    t += d + (0.45 if i < len(NARR) - 1 else 0)
json.dump(timeline, open(OUT / "timeline.json", "w"), indent=1)
with open(OUT / "narration_timing.txt", "w") as f:
    for s in timeline:
        f.write(f"{s['start']:7.2f} - {s['end']:7.2f}  {s['show']}\n")
print(open(OUT / "narration_timing.txt").read(), flush=True)

# ------------------------------------------------------------------ 6. Procedural light music + SFX
rng = np.random.default_rng(7)
SRA = 44100
def wav(name, x):
    sf.write(OUT / f"audio/{name}.wav", np.clip(x, -1, 1).astype(np.float32), SRA)
dur = int(t + 8)
tt = np.arange(dur * SRA) / SRA
chords = [(57, 60, 64, 67), (53, 57, 60, 64), (48, 52, 55, 59), (55, 59, 62, 66)]
mus = np.zeros_like(tt)
for ci in range(int(dur / 8) + 1):
    n = chords[ci % 4]
    seg = (tt >= ci * 8) & (tt < (ci + 1) * 8 + 1.5)
    env = np.clip((tt - ci * 8) / 2.5, 0, 1) * np.clip(((ci + 1) * 8 + 1.5 - tt) / 2.5, 0, 1)
    for m in n:
        f = 440 * 2 ** ((m - 69) / 12)
        mus += seg * env * (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * 2 * f * tt + 1)) * 0.05
pulse = (np.sin(2 * np.pi * 0.5 * tt) * 0.5 + 0.5)
mus *= 0.7 + 0.3 * pulse
mus = ndi.gaussian_filter1d(mus, 6)
wav("music", mus * 0.8 / max(np.abs(mus).max(), 1e-3))
def whoosh(d=0.7):
    x = rng.standard_normal(int(d * SRA)); n = len(x)
    out = np.zeros(n); k = 0
    for c in np.linspace(0.02, 0.4, 12):
        pass
    sweep = ndi.gaussian_filter1d(x, 3)
    env = np.sin(np.pi * np.linspace(0, 1, n)) ** 2
    lp = np.convolve(x, np.ones(40) / 40, "same") * 2.5
    return (0.6 * sweep + 0.4 * lp) * env * 0.5
wav("whoosh", whoosh())
tp = np.arange(int(0.16 * SRA)) / SRA
wav("pop", np.sin(2 * np.pi * (500 + 900 * tp * 5) * tp) * np.exp(-tp * 28) * 0.7)
tk = np.arange(int(0.05 * SRA)) / SRA
wav("tick", np.sin(2 * np.pi * 1800 * tk) * np.exp(-tk * 90) * 0.5)
th = np.arange(int(1.1 * SRA)) / SRA
wav("thud", (np.sin(2 * np.pi * 55 * th * np.exp(-th * 0.8)) * np.exp(-th * 3.2) * 0.9))

LOG["timeline_total"] = t
json.dump(LOG, open(OUT / "manifest.json", "w"), indent=1)
print("ALL DONE", flush=True)
