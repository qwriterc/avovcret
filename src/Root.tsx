import React from 'react';
import {Composition, staticFile} from 'remotion';
import {Main} from './Main';
import {FPS, H, W, Props} from './lib';

const TAIL = 4.5;
export const Root: React.FC = () => (
  <Composition
    id="Main"
    component={Main}
    width={W}
    height={H}
    fps={FPS}
    durationInFrames={900}
    defaultProps={{sent: [], total: 30, manifest: {cutouts: [], photos: [], emoji: [], credits: []}} as Props}
    calculateMetadata={async () => {
      const [tm, mf] = await Promise.all([
        fetch(staticFile('timings.json')).then((r) => r.json()),
        fetch(staticFile('manifest.json')).then((r) => r.json()),
      ]);
      const total = tm.duration + TAIL;
      return {durationInFrames: Math.ceil(total * FPS), props: {sent: tm.sentences, total, manifest: mf}};
    }}
  />
);
