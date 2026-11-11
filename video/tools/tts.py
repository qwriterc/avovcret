"""Kokoro narration, sentence by sentence. Writes public/voice.wav + public/timing.json (+ transcript)."""
import json, os, sys, wave
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 24000; PAD = 0.4; GAP = 0.28
sents = json.load(open(os.path.join(ROOT, "src", "script.json")))
fake = "--fake" in sys.argv
pipe = None
if not fake:
    from kokoro import KPipeline
    pipe = KPipeline(lang_code="a")
out, timing, t = [np.zeros(int(PAD * SR), dtype=np.float32)], [], PAD
for i, text in enumerate(sents):
    if fake:
        a = np.zeros(int(max(2.4, len(text.split()) * 0.36) * SR), dtype=np.float32)
    else:
        parts = [np.asarray(x.detach().cpu().numpy() if hasattr(x, "detach") else x, dtype=np.float32).reshape(-1) for _, _, x in pipe(text, voice="am_michael", speed=1.0, split_pattern=None)]
        a = np.concatenate(parts)
        nz = np.where(np.abs(a) > 0.004)[0]
        if len(nz): a = a[max(0, nz[0] - 200): nz[-1] + 600]
        n = 240; a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    d = len(a) / SR
    timing.append({"i": i, "text": text, "start": round(t, 3), "end": round(t + d, 3)})
    out += [a, np.zeros(int(GAP * SR), dtype=np.float32)]
    t += d + GAP
y = np.concatenate(out)
pub = os.path.join(ROOT, "public"); os.makedirs(pub, exist_ok=True)
json.dump(timing, open(os.path.join(pub, "timing.json"), "w"), indent=1)
if not fake:
    with wave.open(os.path.join(pub, "voice.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
print("timing", timing[-1])
