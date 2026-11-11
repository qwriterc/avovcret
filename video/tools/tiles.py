"""Download NASA GIBS (Blue Marble Shaded Relief / Landsat) tiles and mosaic them per src/layers.json."""
import json, math, os, sys, io, time
from concurrent.futures import ThreadPoolExecutor
import requests
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/"
S = requests.Session(); S.headers["User-Agent"] = "satellite-map-video/1.0 (educational)"
wx = lambda lon, z: (lon + 180) / 360 * 256 * 2 ** z
wy = lambda lat, z: (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * 256 * 2 ** z
def fetch(L, x, y):
    u = f"{B}{L['layer']}/default/{L['time']}/{L['matrix']}/{L['z']}/{y}/{x}.{L['ext']}"
    for k in range(5):
        try:
            r = S.get(u, timeout=40)
            if r.status_code == 200: return Image.open(io.BytesIO(r.content)).convert("RGB")
            if r.status_code == 404: return None
        except Exception: pass
        time.sleep(1 + k)
    return None
def build(L, out):
    z = L["z"]
    x0, x1 = int(wx(L["lon0"], z) // 256), int(wx(L["lon1"], z) // 256)
    y0, y1 = int(wy(L["lat1"], z) // 256), int(wy(L["lat0"], z) // 256)
    w, h = (x1 - x0 + 1) * 256, (y1 - y0 + 1) * 256
    img = Image.new("RGB", (w, h), (18, 57, 92))
    jobs = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]
    with ThreadPoolExecutor(16) as ex:
        res = list(ex.map(lambda p: fetch(L, *p), jobs))
    miss = 0
    for (x, y), t in zip(jobs, res):
        if t is None: miss += 1; continue
        img.paste(t, ((x - x0) * 256, (y - y0) * 256))
    img.save(os.path.join(out, L["id"] + ".jpg"), quality=88)
    print(L["id"], img.size, "tiles", len(jobs), "missing", miss, flush=True)
if __name__ == "__main__":
    out = os.path.join(ROOT, "public", "maps"); os.makedirs(out, exist_ok=True)
    for L in json.load(open(os.path.join(ROOT, "src", "layers.json"))):
        if os.path.exists(os.path.join(out, L["id"] + ".jpg")) and "--force" not in sys.argv: continue
        build(L, out)
