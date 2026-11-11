import os, subprocess, shutil, glob, json, sys
MODE = '__MODE__'  # 'test' or 'final'
def sh(c, **k):
    print('$', c, flush=True)
    r = subprocess.run(c, shell=True, **k)
    if r.returncode: raise SystemExit(f'FAILED: {c}')
cands = glob.glob('/kaggle/input/**/package.json', recursive=True)
root = os.path.dirname([c for c in cands if 'node_modules' not in c][0]); print('src', root)
P = '/tmp/proj'
shutil.rmtree(P, ignore_errors=True); shutil.copytree(root, P, ignore=shutil.ignore_patterns('node_modules', 'out'))
os.chdir(P)
OUT = '/kaggle/working'
sh('apt-get update -qq && apt-get install -y -qq espeak-ng libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2t64 libpango-1.0-0 libcairo2 libxshmfence1 libx11-xcb1 > /dev/null 2>&1 || apt-get install -y -qq libasound2 > /dev/null 2>&1; true')
sh('pip install -q kokoro-onnx soundfile requests pillow timm kornia einops 2>&1 | tail -2')
sh('python pipeline/make_assets.py')
sh('python pipeline/cutout.py')
shutil.copy('qa_cutouts.jpg', f'{OUT}/qa_cutouts.jpg')
sh('python pipeline/narrate.py')
shutil.copy('public/timings.json', f'{OUT}/transcript_timings.json')
sh('npm install --no-audit --no-fund 2>&1 | tail -2')
sh('npx remotion browser ensure 2>&1 | tail -2')
if MODE == 'test':
    sh('node pipeline/render.mjs stills /tmp/stills')
    os.makedirs(f'{OUT}/stills', exist_ok=True)
    for f in glob.glob('/tmp/stills/*.png'):
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f, '-vf', 'scale=540:-1', '-q:v', '4', f'{OUT}/stills/' + os.path.basename(f)[:-4] + '.jpg'])
    shutil.copy('public/audio/final_mix.wav', f'{OUT}/final_mix.wav')
else:
    sh('node pipeline/render.mjs full /tmp/out')
    sh('ffmpeg -y -loglevel error -i /tmp/out/video_silent.mp4 -i public/audio/final_mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 44100 -ac 2 -movflags +faststart /tmp/out/panama_canal.mp4')
    r = subprocess.run('ffmpeg -i /tmp/out/panama_canal.mp4 -af volumedetect -vn -f null - 2>&1 | grep -E "mean_volume|max_volume"', shell=True, capture_output=True, text=True); print(r.stdout)
    sh('ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration -of default=nw=1 /tmp/out/panama_canal.mp4')
    shutil.copy('/tmp/out/panama_canal.mp4', f'{OUT}/panama_canal.mp4')
print('PIPELINE DONE')
