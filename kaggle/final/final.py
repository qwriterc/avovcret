# FINAL RENDER: narration (Kokoro) -> tiles (NASA GIBS) -> Remotion+Three.js render -> mux voice/music/sfx/text -> single mp4
import os, subprocess, sys, glob, json, shutil, tarfile, time
def sh(c, check=True, **k):
    print(">>", c, flush=True)
    r = subprocess.run(c, shell=True, **k)
    if check and r.returncode: raise SystemExit(f"FAILED: {c}")
    return r
OUT = "/kaggle/working"; WORK = "/tmp/work"; os.makedirs(WORK, exist_ok=True)
t0 = time.time()
# ---- system deps
sh("apt-get update -qq", check=False)
sh("DEBIAN_FRONTEND=noninteractive apt-get install -y -qq espeak-ng ffmpeg xz-utils", check=False)
for p in ["libnss3", "libdbus-1-3", "libatk1.0-0", "libatk-bridge2.0-0", "libxrandr2", "libxkbcommon0", "libxfixes3", "libxcomposite1", "libxdamage1", "libgbm1", "libcups2", "libpango-1.0-0", "libcairo2", "libxshmfence1", "libxext6", "libx11-6", "libxcb1", "fonts-liberation"]:
    sh(f"DEBIAN_FRONTEND=noninteractive apt-get install -y -qq {p}", check=False)
sh("DEBIAN_FRONTEND=noninteractive apt-get install -y -qq libasound2t64 || DEBIAN_FRONTEND=noninteractive apt-get install -y -qq libasound2", check=False)
# ---- node 20
sh(f"cd {WORK} && curl -sL https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.xz -o node.txz && tar -xf node.txz && rm node.txz")
os.environ["PATH"] = f"{WORK}/node-v20.18.0-linux-x64/bin:" + os.environ["PATH"]
sh("node -v && npm -v")
# ---- project
tarf = glob.glob("/kaggle/input/**/project.tar.gz", recursive=True)[0]
with tarfile.open(tarf) as t: t.extractall(WORK)
V = f"{WORK}/video"
sh(f"cd {V} && npm ci --no-audit --no-fund")
# ---- python 3.11 venv for Kokoro (kokoro needs <3.13)
sh("pip install -q uv")
sh(f"uv venv {WORK}/tts --python 3.11")
PY = f"{WORK}/tts/bin/python"
sh(f"uv pip install --python {PY} pip torch --index-url https://download.pytorch.org/whl/cpu --extra-index-url https://pypi.org/simple")
sh(f"uv pip install --python {PY} kokoro soundfile numpy scipy https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl")
sh("pip install -q pillow requests numpy scipy")
# ---- 1) narration, sentence by sentence
sh(f"cd {V} && {PY} tools/tts.py")
# ---- 2) satellite tiles (NASA GIBS: Blue Marble shaded relief + Landsat)
sh(f"cd {V} && python tools/tiles.py")
# ---- 3) music + sfx + mix
sh(f"cd {V} && python tools/audio.py")
# ---- 4) render frames (Remotion + Three.js) -> silent video
n = max(2, (os.cpu_count() or 4) - 1)
sh(f"cd {V} && npx remotion browser ensure", check=False)
sh(f"cd {V} && npx remotion render src/index.ts Colorado out/video.mp4 --muted --codec=h264 --crf=18 --pixel-format=yuv420p --concurrency={n} --timeout=180000 --log=info")
# ---- 5) FINAL STEP: merge scenes + narration + music + sfx + text into ONE file
final = f"{OUT}/colorado_river_final.mp4"
sh(f"ffmpeg -y -i {V}/out/video.mp4 -i {V}/public/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -shortest -movflags +faststart {final}")
# transcript with per-sentence timing
tm = json.load(open(f"{V}/public/timing.json"))
json.dump(tm, open(f"{OUT}/transcript_timing.json", "w"), indent=1)
ts = lambda s: f"{int(s//60):02d}:{s%60:06.3f}"
open(f"{OUT}/transcript_timing.txt", "w").write("\n".join(f"[{ts(q['start'])} --> {ts(q['end'])}] {q['text']}" for q in tm))
# verify: audio track present and not silent
sh(f"ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration -of default=nw=1 {final}")
r = subprocess.run(f"ffmpeg -i {final} -af volumedetect -vn -f null - 2>&1 | grep mean_volume", shell=True, capture_output=True, text=True); print(r.stdout)
print("DONE in", round(time.time() - t0), "s")
