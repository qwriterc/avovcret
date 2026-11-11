"""Light-test only: fabricate timings.json (no TTS) so Remotion can be exercised on GitHub Actions."""
import json, sys
sys.path.insert(0, 'pipeline')
src = open('pipeline/narrate.py').read()
start = src.index('SENT = ['); end = src.index(']\nSR')
SENT = eval(src[start + 7:end + 1])
t = 0.5; out = []
for s in SENT:
    d = len(s) * 0.062; out.append({'text': s, 'start': round(t, 3), 'end': round(t + d, 3)}); t += d + 0.38
json.dump({'sentences': out, 'duration': out[-1]['end']}, open('public/timings.json', 'w'), indent=1)
print('fake timings', out[-1]['end'])
