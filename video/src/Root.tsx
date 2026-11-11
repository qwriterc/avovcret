import React from 'react';
import {AbsoluteFill, Audio, CalculateMetadataFunction, Composition, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {A, Captions, Data, DataCtx, FPS, H, SceneCtx, Vignette, W, clamp, eo} from './lib';
import {S1, S10, S11, S12, S2, S3, S4, S5, S6, S7, S8, S9} from './scenes';
import {SEL} from './selection';

const OVERLAP = 9;

const Trans: React.FC<{first: boolean; children: React.ReactNode}> = ({first, children}) => {
  const f = useCurrentFrame();
  const k = first ? 1 : interpolate(f, [0, OVERLAP], [0, 1], {...clamp, easing: eo});
  const line = interpolate(f, [0, OVERLAP], [-300, W + 300], clamp);
  return (
    <AbsoluteFill style={{opacity: k, transform: `scale(${1 + (1 - k) * 0.12})`}}>
      {children}
      {!first && f < OVERLAP ? <div style={{position: 'absolute', left: line, top: -200, width: 8, height: H + 400, background: 'rgba(255,255,255,0.85)', transform: 'rotate(18deg)', boxShadow: '0 0 30px #fff'}} /> : null}
    </AbsoluteFill>
  );
};

export const Main: React.FC<Data> = (data) => {
  const tl = data.timeline;
  const f = useCurrentFrame();
  const used = [...SEL.animals, ...SEL.base, SEL.walker, SEL.oxygen, ...SEL.extra];
  const photos = [...SEL.cards7, SEL.card9];
  const cr: string[] = [];
  const addc = (grp: any, n: string) => {
    const it = grp?.[n];
    if (it && it.attr) cr.push(`"${it.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '').slice(0, 46)}" by ${it.artist.slice(0, 34)} (${it.license})`);
  };
  used.forEach((n) => addc(data.credits.cutouts, n));
  photos.forEach((n) => addc(data.credits.photos, n));
  const yr = (data.manifest.s2?.datetime || '2023').slice(0, 4);
  const credits = [`Contains modified Copernicus Sentinel data (${yr})`, ...cr].slice(0, 9);
  const B = tl.map((s, i) => (i === 0 ? 0 : Math.round((s.start - 0.25) * FPS)));
  const total = Math.round((tl[tl.length - 1].end + 5.5) * FPS);
  const scenes = [<S1 />, <S2 />, <S3 />, <S4 />, <S5 />, <S6 />, <S7 />, <S8 />, <S9 />, <S10 />, <S11 />, <S12 credits={credits} />];
  const t = f / FPS;
  const talking = tl.some((s) => t > s.start - 0.1 && t < s.end + 0.15);
  return (
    <DataCtx.Provider value={data}>
      <AbsoluteFill style={{background: '#000'}}>
        {scenes.map((el, i) => {
          const end = i + 1 < scenes.length ? B[i + 1] + OVERLAP : total;
          const D = end - B[i];
          return (
            <Sequence key={i} from={B[i]} durationInFrames={D}>
              <SceneCtx.Provider value={{D}}>
                <Trans first={i === 0}>{el}</Trans>
              </SceneCtx.Provider>
              {i > 0 ? <Audio src={A('audio/whoosh.wav')} volume={0.2} /> : <Audio src={A('audio/thud.wav')} volume={0.28} />}
            </Sequence>
          );
        })}
        <Vignette />
        <Captions tl={tl} />
        {tl.map((s) => (
          <Sequence key={s.i} from={Math.round(s.start * FPS)}>
            <Audio src={A(s.file)} volume={1} />
          </Sequence>
        ))}
        <Audio
          src={A('audio/music.wav')}
          volume={(fr) => {
            const tt = fr / FPS;
            const fade = Math.min(1, tt / 1.5, Math.max(0, (total / FPS - tt) / 2.5));
            return 0.1 * fade * (talking ? 0.6 : 1);
          }}
        />
      </AbsoluteFill>
    </DataCtx.Provider>
  );
};

const calc: CalculateMetadataFunction<Data> = async () => {
  const j = async (p: string) => (await fetch(A(p))).json();
  const [timeline, manifest, credits, countries] = await Promise.all([j('timeline.json'), j('manifest.json'), j('credits.json'), j('maps/countries.json')]);
  manifest.countries = countries;
  return {durationInFrames: Math.round((timeline[timeline.length - 1].end + 5.5) * FPS), props: {timeline, manifest, credits}};
};

export const RemotionRoot: React.FC = () => (
  <Composition id="Everest" component={Main} width={W} height={H} fps={FPS} durationInFrames={300} defaultProps={{timeline: [], manifest: {}, credits: {}} as Data} calculateMetadata={calc} />
);
