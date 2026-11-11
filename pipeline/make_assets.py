"""Fetch NASA GIBS imagery, licensed Wikimedia Commons photos and Fluent emoji. Writes public/ + manifest.json"""
import os, io, re, json, html, time, requests
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
S = requests.Session(); S.headers['User-Agent'] = 'PanamaExplainerBot/1.0 (educational video)'
PUB = 'public'
for d in ('map', 'photos', 'cutouts', 'emoji', 'audio'): os.makedirs(f'{PUB}/{d}', exist_ok=True)

# ---- NASA GIBS (Blue Marble Shaded Relief + Bathymetry), lon -86..-74, lat 5..12.5
def gibs():
    out = f'{PUB}/map/panama.jpg'
    if os.path.exists(out): return
    W, H = 6144, 3840
    full = Image.new('RGB', (W, H))
    for i in range(2):
        for j in range(2):
            lon0 = -86 + 6 * i; lon1 = lon0 + 6
            lat1 = 12.5 - 3.75 * j; lat0 = lat1 - 3.75
            url = ('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&SRS=EPSG:4326'
                   f'&FORMAT=image/jpeg&STYLES=&LAYERS=BlueMarble_ShadedRelief_Bathymetry&BBOX={lon0},{lat0},{lon1},{lat1}&WIDTH=3072&HEIGHT=1920')
            r = S.get(url, timeout=180); r.raise_for_status()
            full.paste(Image.open(io.BytesIO(r.content)).convert('RGB'), (i * 3072, j * 1920))
    full.save(out, quality=93)
gibs()

# ---- Wikimedia Commons (CC0 / PD / CC BY only)
PHOTOS = {
    'ship': 'File:06. Canal de Panama (24).JPG',
    'skyline': 'File:Panama city Skyline.jpg',
    'toucan': 'File:Keel-billed Toucan. Ramphastos sulfuratus - Flickr - gailhampshire.jpg',
    'culebra': 'File:Labourers at work on the panama canal at Culebra Cut 1904.jpg',
    'sign': 'File:Gatun Locks Panama Canal 1913 - panoramio.jpg',
}
CREDIT_KEYS = ['ship', 'skyline', 'toucan', 'sign']
credits = ['Satellite imagery: NASA Blue Marble (NASA Earth Observatory / GIBS)']
def clean(x): return re.sub(r'\s+', ' ', html.unescape(re.sub('<[^>]+>', '', x))).strip()
photos = []
for key, title in PHOTOS.items():
    r = S.get('https://commons.wikimedia.org/w/api.php', params=dict(action='query', titles=title, prop='imageinfo', iiprop='url|extmetadata', iiurlwidth=2400, format='json')).json()
    page = list(r['query']['pages'].values())[0]
    ii = page['imageinfo'][0]; m = ii['extmetadata']
    lic = m.get('LicenseShortName', {}).get('value', ''); l = lic.lower()
    ok = (('cc by' in l and 'sa' not in l) or 'cc0' in l or 'public domain' in l or l.startswith('pd'))
    assert ok, (title, lic)
    img = None
    for attempt in range(8):
        for u in (ii['thumburl'], ii['url']):
            try:
                rr = S.get(u, timeout=120)
                if rr.status_code == 200:
                    img = Image.open(io.BytesIO(rr.content)).convert('RGB'); break
                print('retry', key, rr.status_code); time.sleep(float(rr.headers.get('Retry-After', 8)) + 2)
            except Exception as e: print('retry', key, repr(e)[:80])
        if img: break
        time.sleep(10 * (attempt + 1))
    assert img is not None, key
    if img.width > 2400: img = img.resize((2400, int(img.height * 2400 / img.width)), Image.LANCZOS)
    img.save(f'{PUB}/photos/{key}.jpg', quality=93)
    photos.append(key); time.sleep(3)
    if key in CREDIT_KEYS:
        name = title[5:].rsplit('.', 1)[0]
        name = name if len(name) < 44 else name[:41] + '...'
        credits.append(f"Photo \"{name}\" by {clean(m.get('Artist', {}).get('value', 'Unknown'))[:40]}, {lic}, Wikimedia Commons")
    print('photo', key, lic, img.size)

# ---- Fluent emoji 3D (MIT)
EMO = {'ship': 'Ship', 'droplet': 'Droplet', 'globe': 'Globe showing Americas', 'anchor': 'Anchor', 'water': 'Water wave'}
emoji = []
for k, name in EMO.items():
    fn = name.lower().replace(' ', '_') + '_3d.png'
    url = f'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/{name.replace(" ", "%20")}/3D/{fn}'
    r = S.get(url, timeout=60)
    if r.status_code == 200:
        open(f'{PUB}/emoji/{k}.png', 'wb').write(r.content); emoji.append(k)
    else: print('emoji missing', k, r.status_code)
credits.append('3D emoji: Fluent Emoji by Microsoft (MIT License)')
json.dump({'cutouts': [], 'photos': photos, 'emoji': emoji, 'credits': credits}, open(f'{PUB}/manifest.json', 'w'), indent=1)
print('assets ok', emoji)
