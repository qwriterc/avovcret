import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
const mode = process.argv[2] || 'stills';
const out = process.argv[3] || 'out';
fs.mkdirSync(out, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public')});
const comp = await selectComposition({serveUrl, id: 'Main'});
const chromiumOptions = {gl: 'swangle'};
console.log('duration frames', comp.durationInFrames, 'fps', comp.fps, comp.width, comp.height);
if (mode === 'stills') {
  const tm = JSON.parse(fs.readFileSync('public/timings.json'));
  const frames = [];
  tm.sentences.forEach((s, i) => { frames.push(Math.round((s.start + 0.6) * 30)); if (i === 0 || i === 6 || i === 8 || i === 11) frames.push(Math.round((s.start + 2.6) * 30)); });
  frames.push(comp.durationInFrames - 20);
  for (const f of frames) {
    await renderStill({composition: comp, serveUrl, output: path.join(out, `f_${String(f).padStart(5, '0')}.png`), frame: Math.min(f, comp.durationInFrames - 1), chromiumOptions, timeoutInMilliseconds: 180000});
    console.log('still', f);
  }
} else {
  let last = -1;
  await renderMedia({composition: comp, serveUrl, codec: 'h264', outputLocation: path.join(out, 'video_silent.mp4'), muted: true, crf: 18, pixelFormat: 'yuv420p', concurrency: Number(process.env.CONC || 4), chromiumOptions, timeoutInMilliseconds: 240000,
    onProgress: ({progress}) => { const p = Math.floor(progress * 20); if (p !== last) { last = p; console.log('render', p * 5, '%'); } }});
}
console.log('render done');
