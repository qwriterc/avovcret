import React from 'react';
import {AbsoluteFill, Composition, Sequence, staticFile} from 'remotion';
import scenes from './scenes.json';
import script from './script.json';
import {FPS, Sent, TimingCtx} from './lib';
import {SCENE_COMPONENTS} from './scenes';
import {Captions} from './ui';

type Props = {sents: Sent[]; total: number};
const TAIL = 4.6;
const fallback = (): Props => {
  let t = 0.4; const sents: Sent[] = script.map((text) => { const d = Math.max(2.4, text.split(' ').length * 0.36); const s = {text, start: Math.round(t * FPS), end: Math.round((t + d) * FPS)}; t += d + 0.25; return s; });
  return {sents, total: sents[sents.length - 1].end + Math.round(TAIL * FPS)};
};
const OV = 8;
const Main: React.FC<Props> = ({sents, total}) => {
  const starts = scenes.map((s, k) => (k === 0 ? 0 : sents[s.s].start));
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {scenes.map((sc, k) => {
        const end = k === scenes.length - 1 ? total : starts[k + 1];
        const dur = end - starts[k];
        const Comp = SCENE_COMPONENTS[sc.id];
        return (
          <Sequence key={sc.id} from={starts[k]} durationInFrames={Math.min(dur + OV, total - starts[k])}>
            <TimingCtx.Provider value={{sents, abs0: starts[k], dur}}><Comp /></TimingCtx.Provider>
          </Sequence>
        );
      })}
      <Captions sents={sents} />
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => (
  <Composition
    id="Colorado" component={Main} width={1080} height={1920} fps={FPS}
    durationInFrames={fallback().total} defaultProps={fallback()}
    calculateMetadata={async () => {
      try {
        const r = await fetch(staticFile('timing.json'));
        const j: {text: string; start: number; end: number}[] = await r.json();
        const sents = j.map((q) => ({text: q.text, start: Math.round(q.start * FPS), end: Math.round(q.end * FPS)}));
        const total = sents[sents.length - 1].end + Math.round(TAIL * FPS);
        return {durationInFrames: total, props: {sents, total}};
      } catch (e) { const f = fallback(); return {durationInFrames: f.total, props: f}; }
    }}
  />
);
