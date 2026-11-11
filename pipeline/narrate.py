"""Kokoro (am_michael, American male) narration sentence by sentence + light music + whoosh SFX. Writes timings.json"""
import json, os, urllib.request, numpy as np, soundfile as sf
SENT = [
 "This is Panama, a thin strip of land holding two oceans apart.",
 "And right through its middle runs one of the most incredible machines ever built.",
 "The Panama Canal.",
 "It is just eighty-two kilometers long, yet it saves ships up to thirteen thousand kilometers of sailing.",
 "But there is a problem: a mountain range stands in the way.",
 "So engineers did something bold. They didn't dig down to the sea. They lifted the ships up.",
 "Giant locks fill with water, and a ship rises twenty-six meters, like climbing an eight-story building.",
 "At the top waits Gatun Lake, a huge artificial lake that ships sail straight across.",
 "Then they pass through the Continental Divide, and step back down to the Pacific Ocean.",
 "And there are no pumps. Gravity moves all the water.",
 "Every crossing uses about two hundred million liters of fresh water, which then flows out to sea.",
 "More than thirteen thousand ships pass through each year, carrying about five percent of world trade.",
 "The canal opened in nineteen fourteen, and it is still working today.",
 "So next time something arrives on a container ship, remember: it may have climbed a mountain first.",
]
SR = 24000; GAP = 0.38; LEAD = 0.5; TAIL = 4.5
base = 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/'
for f in ('kokoro-v1.0.onnx', 'voices-v1.0.bin'):
    if not os.path.exists(f): urllib.request.urlretrieve(base + f, f)
from kokoro_onnx import Kokoro
k = Kokoro('kokoro-v1.0.onnx', 'voices-v1.0.bin')
parts = []
for s in SENT:
    x, sr = k.create(s, voice='am_michael', speed=0.98, lang='en-us')
    assert sr == SR, sr
    nz = np.where(np.abs(x) > 0.004)[0]
    x = x[max(0, nz[0] - 120): nz[-1] + 360]
    parts.append(x.astype(np.float32))
    print(round(len(x) / SR, 2), s[:40])
t = LEAD; sentences = []; chunks = []
cur = np.zeros(int(LEAD * SR), np.float32); chunks.append(cur)
for s, x in zip(SENT, parts):
    d = len(x) / SR
    sentences.append({'text': s, 'start': round(t, 3), 'end': round(t + d, 3)})
    chunks.append(x); chunks.append(np.zeros(int(GAP * SR), np.float32)); t += d + GAP
dur = sentences[-1]['end']
nar = np.concatenate(chunks)
total = dur + TAIL
N = int(total * SR)
nar = np.pad(nar, (0, max(0, N - len(nar))))[:N]
nar = nar / max(1e-6, np.abs(nar).max()) * 0.9
tt = np.arange(N) / SR
# ---- music: soft pad + gentle arp (generated procedurally)
def note(m): return 440 * 2 ** ((m - 69) / 12)
prog = [[57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62]]
bar = 60 / 84 * 4
mus = np.zeros(N)
for i in range(int(total / bar) + 2):
    ch = prog[(i // 2) % 4]; a0 = int(i * bar * SR); a1 = min(N, int((i + 1.15) * bar * SR))
    if a0 >= N: break
    seg = np.arange(a1 - a0) / SR
    env = np.minimum(1, seg / 1.2) * np.minimum(1, (bar * 1.15 - seg) / 1.0)
    for m in ch:
        for det in (-0.4, 0.4):
            mus[a0:a1] += np.sin(2 * np.pi * (note(m - 12) + det) * seg) * env * 0.12
    for j in range(8):
        st = int((i * bar + j * bar / 8) * SR)
        if st >= N: break
        m = ch[(j * 2) % 3] + 12; L = min(N - st, int(0.5 * SR)); s2 = np.arange(L) / SR
        mus[st:st + L] += np.sin(2 * np.pi * note(m) * s2) * np.exp(-s2 * 7) * 0.07
mus *= np.minimum(1, tt / 2) * np.minimum(1, (total - tt) / 2.5)
mus = mus / max(1e-6, np.abs(mus).max()) * 0.5
# ---- sfx: whooshes at scene changes
sfx = np.zeros(N); rng = np.random.default_rng(3)
for idx in (0, 3, 4, 5, 7, 9, 11, 13):
    st = int((sentences[idx]['start'] - (0.05 if idx else -0.1)) * SR); L = int(0.55 * SR)
    if st < 0: st = 0
    s2 = np.arange(L) / SR; ph = 2 * np.pi * np.cumsum(250 + 2600 * (s2 / 0.55) ** 2) / SR
    env = np.sin(np.pi * s2 / 0.55) ** 2
    w = (np.sin(ph) * 0.4 + rng.normal(0, 0.25, L)) * env
    sfx[st:st + L] += w[:max(0, min(L, N - st))] if st + L <= N else w[:N - st]
sfx = sfx / max(1e-6, np.abs(sfx).max()) * 0.5
mix = nar + 0.10 * mus + 0.07 * sfx
mix = np.tanh(mix * 1.1) / np.tanh(1.1) * 0.95
os.makedirs('public/audio', exist_ok=True)
sf.write('public/audio/narration.wav', nar, SR); sf.write('public/audio/final_mix.wav', mix.astype(np.float32), SR)
json.dump({'sentences': sentences, 'duration': dur}, open('public/timings.json', 'w'), indent=1)
print('narration', round(dur, 2), 's total', round(total, 2))
