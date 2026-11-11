"""Programmatic, very light music + SFX, mixed under the narration -> public/mix.wav"""
import json, os, wave
import numpy as np
from scipy.signal import butter, lfilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 24000
timing = json.load(open(os.path.join(ROOT, "public", "timing.json")))
scenes = json.load(open(os.path.join(ROOT, "src", "scenes.json")))
voice = np.zeros(1, dtype=np.float32)
with wave.open(os.path.join(ROOT, "public", "voice.wav")) as w:
    voice = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
total = timing[-1]["end"] + 4.6
N = int(total * SR); v = np.zeros(N, dtype=np.float32); v[: min(N, len(voice))] = voice[:N]
t = np.arange(N) / SR
# music: soft pad on Am - F - C - G, 8 s per chord, slow tremolo
chords = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]]
m = np.zeros(N, dtype=np.float32)
for k in range(int(total // 8) + 1):
    a, b = int(k * 8 * SR), min(N, int((k + 1) * 8 * SR))
    if a >= N: break
    tt = t[a:b] - k * 8
    env = np.minimum(1, np.minimum(tt / 1.5, (8 - tt) / 1.5 + 0.0)).clip(0, 1)
    for f in chords[k % 4]:
        m[a:b] += (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2.003 * tt)) * env * 0.12
    m[a:b] += np.sin(2 * np.pi * (chords[k % 4][0] / 2) * tt) * env * 0.16
m *= 0.75 + 0.25 * np.sin(2 * np.pi * 0.2 * t)
# soft pulse
beat = (t % 0.5) < 0.12
m += (np.sin(2 * np.pi * 110 * t) * np.exp(-((t % 0.5) * 18)) * 0.05).astype(np.float32)
bb, aa = butter(2, 1800 / (SR / 2)); m = lfilter(bb, aa, m).astype(np.float32)
m *= np.minimum(1, t / 2) * np.minimum(1, (total - t) / 3)
# duck under voice
env = np.abs(v); k = int(0.25 * SR); env = np.convolve(env, np.ones(k) / k, mode="same")
duck = 1 - 0.65 * np.clip(env * 12, 0, 1)
m = m * duck * 0.34
# sfx: whoosh at scene changes
rng = np.random.default_rng(3); sfx = np.zeros(N, dtype=np.float32)
for sc in scenes[1:]:
    s0 = timing[sc["s"]]["start"]; a = int(max(0, s0 - 0.25) * SR); L = int(0.7 * SR)
    if a + L > N: continue
    n = rng.standard_normal(L).astype(np.float32); x = np.linspace(0, 1, L)
    fc = 300 + 5000 * x ** 2; out = np.zeros(L, dtype=np.float32)
    for j in range(0, L, 512):
        bw, aw = butter(1, min(0.95, fc[j] / (SR / 2))); out[j:j + 512] = lfilter(bw, aw, n[j:j + 512])
    sfx[a:a + L] += out * np.sin(np.pi * x) ** 2 * 0.22
sfx *= 0.35
mix = v * 1.0 + m + sfx
mix = mix / max(1.0, np.max(np.abs(mix)) / 0.95)
with wave.open(os.path.join(ROOT, "public", "mix.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print("mix ok", total)
