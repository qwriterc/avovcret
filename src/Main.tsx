import React from 'react';
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {buildCam, camAt, Cam, FPS, H, Manifest, Props, PLACES, proj, sans, serif, hand, W, YEL, clamp01, ease, easeOut, fadeIn, pop} from './lib';
import {CanalPath, LakePoly, MapLayer, Ship3D} from './MapScene';
import {LockLayer, lockState} from './LockScene';
import {Arrow2D, Blueprint, Caption, Card, Counter, Cut, DotGrid, Ellipse, Emoji, GeoLabel, Hand, OrangeBox, Pin, QMark, Reveal, Vignette} from './UI';

type B = {f: number; g: number; sent: Props['sent']; m: Manifest; t0: number; t1: number};
const has = (m: Manifest, kind: 'cutouts' | 'photos' | 'emoji', k: string) => m[kind].includes(k);
const cut = (k: string) => `cutouts/${k}.png`;
const photo = (k: string) => `photos/${k}.jpg`;
const S = (b: B, i: number, o = 0) => Math.round((b.sent[i].start + o) * FPS) - Math.round(b.t0 * FPS); // local frame of sentence i

const MapBlock: React.FC<B & {children: (cam: Cam, c3: ReturnType<typeof buildCam>, extra: React.ReactNode[]) => React.ReactNode; three?: (cam: Cam, g: number) => React.ReactNode}> = ({g, sent, three, children}) => {
  const cam = camAt(sent, g / FPS);
  const c3 = buildCam(cam);
  return (
    <AbsoluteFill>
      <MapLayer cam={cam}>{three ? three(cam, g) : null}</MapLayer>
      <AbsoluteFill>{children(cam, c3, [])}</AbsoluteFill>
      <Vignette />
    </AbsoluteFill>
  );
};

// ---------------- Block 1: hook ----------------
const Map1: React.FC<B> = (b) => {
  const {f, g, sent, m} = b;
  const t = g / FPS;
  const s1 = S(b, 1), s2 = S(b, 2), s3 = S(b, 3);
  const tin = ease(f / 22);
  const titleStyle: React.CSSProperties = {fontFamily: serif, fontWeight: 900, color: '#fff', textShadow: '0 8px 22px rgba(0,0,0,.65), 0 0 4px rgba(0,0,0,.6)', whiteSpace: 'nowrap'};
  return (
    <MapBlock {...b} three={(cam) => <CanalPath draw={ease((t - sent[1].start - 0.3) / 3.4)} d={cam.d} />}>
      {(cam, c3) => {
        const pac = proj(c3, -81.6, 7.2), car = proj(c3, -80.2, 10.5);
        return (
          <>
            <GeoLabel text="PACIFIC OCEAN" x={pac.x} y={pac.y} size={44} f={f} from={50} color="#bfe3ff" />
            <GeoLabel text="CARIBBEAN SEA" x={car.x} y={car.y} size={44} f={f} from={40} color="#bfe3ff" />
            <div style={{position: 'absolute', left: 540, top: 340, transform: `translate(-50%,-50%) perspective(1300px) translateX(${(1 - tin) * -720}px) rotateY(${(1 - tin) * -75 - 4}deg) rotateZ(-3deg)`, filter: `blur(${(1 - tin) * 14}px)`}}>
              <div style={{...titleStyle, fontSize: 200, letterSpacing: 2}}>PANAMA</div>
            </div>
            {f > s2 - 2 && (
              <div style={{position: 'absolute', left: 540, top: 520, transform: `translate(-50%,-50%) rotateZ(-3deg) scale(${1 + (1 - pop(f, s2, 12)) * 2.4})`, opacity: clamp01((f - s2) / 6), filter: `blur(${(1 - clamp01((f - s2) / 10)) * 12}px)`}}>
                <div style={{...titleStyle, fontSize: 176, color: YEL, letterSpacing: 4}}>CANAL</div>
              </div>
            )}
            <div style={{position: 'absolute', left: 540, top: 470, transform: 'translate(-50%,-50%)', opacity: fadeIn(f, 24, 14) * (1 - clamp01((f - s2) / 6)), fontFamily: sans, fontWeight: 800, fontSize: 38, letterSpacing: 8, color: '#fff', textShadow: '0 3px 10px rgba(0,0,0,.8)'}}>TWO OCEANS · ONE THIN STRIP</div>
            {has(m, 'cutouts', 'skyline') && <Cut src={cut('skyline')} x={540} y={1010} w={940} f={f} from={36} to={s1 + 28} rot={-2} />}
            {has(m, 'cutouts', 'toucan') && <Cut src={cut('toucan')} x={800} y={1000} w={420} f={f} from={s1 + 20} to={s2 - 4} rot={5} bob={14} />}
            {has(m, 'emoji', 'globe') && <Emoji name="globe" x={210} y={950} s={190} f={f} from={s1 + 34} to={s2 - 4} />}
            {has(m, 'cutouts', 'ship') && <Cut src={cut('ship')} x={540} y={1030} w={900} f={f} from={s2 + 6} to={s3} rot={-2} />}
            {has(m, 'emoji', 'anchor') && <Emoji name="anchor" x={900} y={780} s={150} f={f} from={s2 + 20} to={s3} />}
          </>
        );
      }}
    </MapBlock>
  );
};

// ---------------- Block 2: route comparison (blueprint) ----------------
const Bp1: React.FC<B> = (b) => {
  const {f, m} = b;
  const d = Math.round((b.t1 - b.t0) * FPS);
  const k = (u: number) => Math.round(u * d);
  const bar = (y: number, from: number, frac: number, col: string) => {
    const w = 820 * frac * ease((f - from) / 40);
    return (
      <>
        <div style={{position: 'absolute', left: 130, top: y, width: 820, height: 26, background: 'rgba(255,255,255,.14)', borderRadius: 13}} />
        <div style={{position: 'absolute', left: 130, top: y, width: w, height: 26, background: col, borderRadius: 13, boxShadow: `0 0 22px ${col}`}} />
        {has(m, 'emoji', 'ship') && <Img2 x={130 + w} y={y + 13} f={f} from={from} />}
      </>
    );
  };
  return (
    <AbsoluteFill>
      <Blueprint frame={f} />
      <OrangeBox text="NEW YORK → SAN FRANCISCO" x={540} y={250} f={f} from={4} size={46} />
      <OrangeBox text="AROUND SOUTH AMERICA" x={540} y={470} f={f} from={k(0.05)} size={52} />
      {bar(590, k(0.07), 1, '#ffffff')}
      <Counter f={f} from={k(0.1)} dur={40} to={22500} suffix=" km" size={120} color="#fff" y={730} />
      <OrangeBox text="THROUGH PANAMA" x={540} y={900} f={f} from={k(0.36)} size={52} />
      {bar(1020, k(0.38), 9500 / 22500, YEL)}
      <Counter f={f} from={k(0.4)} dur={30} to={9500} suffix=" km" size={120} y={1160} />
      <Counter f={f} from={k(0.72)} dur={26} to={13000} prefix="−" suffix=" km" size={170} y={1290} color={YEL} />
      <Hand text="saved!" x={800} y={1210} f={f} from={k(0.78)} size={96} color="#fff" rot={-10} />
      <Vignette />
    </AbsoluteFill>
  );
};
const Img2: React.FC<{x: number; y: number; f: number; from: number}> = ({x, y, f, from}) => <Emoji name="ship" x={x} y={y - 18} s={96} f={f} from={from} />;

// ---------------- Block 3: mountains ----------------
const Map2: React.FC<B> = (b) => {
  const {f, g, sent, m} = b;
  const t = g / FPS;
  const s = (o: number) => S(b, 4, o);
  return (
    <MapBlock {...b} three={(cam) => <CanalPath draw={1} d={cam.d} />}>
      {(cam, c3) => {
        const p = proj(c3, -79.68, 9.12);
        return (
          <>
            <Ellipse x={p.x} y={p.y} rx={300} ry={150} f={f} from={s(0.5)} />
            <Hand text="Continental Divide" x={p.x} y={p.y - 270} f={f} from={s(0.8)} size={104} color={YEL} rot={-4} />
            <QMark x={p.x - 330} y={p.y - 90} f={f} from={s(1.6)} size={150} rot={-10} />
            <QMark x={p.x + 20} y={p.y - 400} f={f} from={s(1.9)} size={210} rot={5} />
            <QMark x={p.x + 340} y={p.y - 60} f={f} from={s(2.2)} size={150} rot={14} />
            {has(m, 'photos', 'culebra') && <Card src={photo('culebra')} x={540} y={1090} w={560} f={f} from={s(2.6)} rot={-4} />}
            <Hand text="Culebra Cut, 1904" x={560} y={1340 - 12} f={f} from={s(3.4)} size={64} rot={-3} />
          </>
        );
      }}
    </MapBlock>
  );
};

// ---------------- Block 4: locks lift ----------------
const Lock1: React.FC<B> = (b) => {
  const {f, m} = b;
  const d = Math.round((b.t1 - b.t0) * FPS);
  const p = clamp01(f / (d * 0.93));
  const st = lockState(p);
  const meters = Math.round((st.y / (3 * 0.87)) * 26);
  const s6 = S(b, 6);
  return (
    <AbsoluteFill>
      <Blueprint frame={f} />
      <LockLayer p={p} frame={f} />
      <OrangeBox text="GATUN LOCKS" x={540} y={250} f={f} from={4} size={58} />
      <div style={{position: 'absolute', left: 540, top: 470, transform: 'translate(-50%,-50%)', fontFamily: sans, fontWeight: 900, fontSize: 190, color: YEL, textShadow: '0 8px 0 rgba(0,0,0,.35), 0 0 26px rgba(0,0,0,.35)', opacity: fadeIn(f, 24, 10)}}>
        +{meters} m
      </div>
      <Hand text="like an 8-story building" x={540} y={640} f={f} from={s6 + 40} size={78} rot={-3} />
      <Emoji name="water" x={170} y={1000} s={150} f={f} from={s6 - 10} />
      <Emoji name="ship" x={910} y={1000} s={150} f={f} from={20} />
      <Vignette />
    </AbsoluteFill>
  );
};

// ---------------- Block 5: lake and descent ----------------
const Map3: React.FC<B> = (b) => {
  const {f, g, sent, m} = b;
  const t = g / FPS;
  const a0 = sent[7].start, a1 = sent[8].end;
  const uShip = ease((t - a0) / (a1 - a0)) * 0.97;
  const s7 = (o: number) => S(b, 7, o), s8 = (o: number) => S(b, 8, o);
  return (
    <MapBlock {...b} three={(cam) => (
      <>
        <LakePoly opacity={ease((t - a0 - 0.2) / 1.2)} />
        <CanalPath draw={1} d={cam.d} />
        <Ship3D u={uShip} s={cam.d * 0.03} />
      </>
    )}>
      {(cam, c3) => {
        const lk = proj(c3, -80.0, 9.2), cu = proj(c3, ...PLACES.culebra), mi = proj(c3, ...PLACES.miraflores), ci = proj(c3, ...PLACES.city);
        return (
          <>
            <GeoLabel text="Gatun Lake" x={lk.x} y={lk.y - 90} size={92} f={f} from={s7(0.6)} to={s8(0)} />
            <OrangeBox text="26 m ABOVE SEA LEVEL" x={540} y={330} f={f} from={s7(1.6)} to={s8(0)} size={46} />
            {has(m, 'photos', 'sign') && <Card src={photo('sign')} x={300} y={1100} w={420} f={f} from={s7(2.2)} to={s8(0.2)} rot={-6} />}
            <Pin x={cu.x} y={cu.y} f={f} from={s8(1.2)} />
            <GeoLabel text="Culebra Cut" x={cu.x} y={cu.y - 70} size={58} f={f} from={s8(1.4)} to={s8(5.4)} />
            <Pin x={mi.x} y={mi.y} f={f} from={s8(4.4)} />
            <GeoLabel text="Miraflores Locks" x={mi.x} y={mi.y - 80} size={58} f={f} from={s8(4.6)} />
            <Arrow2D x={ci.x + 60} y={ci.y + 130} f={f} from={s8(5.0)} rot={-40} />
            <GeoLabel text="Pacific Ocean" x={ci.x + 20} y={ci.y + 280} size={52} f={f} from={s8(5.4)} color="#bfe3ff" />
          </>
        );
      }}
    </MapBlock>
  );
};

// ---------------- Block 6: gravity ----------------
const Lock2: React.FC<B> = (b) => {
  const {f} = b;
  const d = Math.round((b.t1 - b.t0) * FPS);
  const u = clamp01(f / d);
  const p = 0.84 - 0.78 * u;
  const s10 = S(b, 10);
  const down = (x: number, y: number, from: number) => {
    const a = pop(f, from, 10);
    const o = (f % 24) / 24;
    return (
      <svg width={90} height={160} viewBox="0 0 60 100" style={{position: 'absolute', left: x, top: y + o * 40, transform: `translate(-50%,-50%) scale(${a})`, opacity: 1 - o * 0.6, filter: 'drop-shadow(0 0 10px #fff)'}}>
        <path d="M30 95 L6 60 L22 60 L22 5 L38 5 L38 60 L54 60 Z" fill="#fff" />
      </svg>
    );
  };
  return (
    <AbsoluteFill>
      <Blueprint frame={f} />
      <LockLayer p={p} frame={f} zoom={1} />
      <OrangeBox text="MIRAFLORES LOCKS" x={540} y={250} f={f} from={4} size={54} />
      <div style={{position: 'absolute', left: 540, top: 450, transform: `translate(-50%,-50%) scale(${pop(f, 14, 14)})`, fontFamily: sans, fontWeight: 900, fontSize: 140, color: '#fff', textShadow: '0 8px 0 rgba(0,0,0,.35)', whiteSpace: 'nowrap', opacity: 1 - clamp01((f - s10) / 8)}}>NO PUMPS</div>
      <div style={{position: 'absolute', left: 540, top: 590, transform: `translate(-50%,-50%) scale(${pop(f, 34, 14)})`, fontFamily: sans, fontWeight: 900, fontSize: 110, color: YEL, textShadow: '0 8px 0 rgba(0,0,0,.35)', opacity: 1 - clamp01((f - s10) / 8)}}>GRAVITY</div>
      {down(300, 760, 40)}{down(780, 760, 46)}
      <Emoji name="droplet" x={200} y={520} s={150} f={f} from={s10 + 4} />
      <Counter f={f} from={s10 + 6} dur={70} to={200000000} suffix=" L" size={112} y={470} />
      <Hand text="of fresh water per ship" x={540} y={600} f={f} from={s10 + 40} size={80} rot={-3} />
      <Vignette />
    </AbsoluteFill>
  );
};

// ---------------- Block 7: traffic & 1914 ----------------
const Map4: React.FC<B> = (b) => {
  const {f, g, sent, m} = b;
  const t = g / FPS;
  const s11 = (o: number) => S(b, 11, o), s12 = (o: number) => S(b, 12, o);
  return (
    <MapBlock {...b} three={(cam) => (
      <>
        <CanalPath draw={1} d={cam.d} />
        {Array.from({length: 7}, (_, i) => <Ship3D key={i} u={((t * 0.045 + i / 7) % 1)} s={cam.d * 0.028} seed={i} />)}
      </>
    )}>
      {() => (
        <>
          <OrangeBox text="SHIPS PER YEAR" x={540} y={250} f={f} from={s11(0.2)} to={s12(0)} size={50} />
          <Counter f={f} from={s11(0.5)} dur={50} to={13000} suffix="+" size={190} y={400} />
          <Emoji name="ship" x={880} y={400} s={140} f={f} from={s11(0.7)} to={s12(0)} />
          <OrangeBox text="OF WORLD SEA TRADE" x={540} y={680} f={f} from={s11(3.4)} to={s12(0)} size={46} />
          <div style={{opacity: 1 - clamp01((f - s12(0)) / 8)}}><DotGrid f={f} from={s11(3.6)} x={540} y={930} hl={f > s11(5.2) ? 5 : 0} /></div>
          {f > s11(5.2) && f < s12(0) && <div style={{position: 'absolute', left: 540, top: 1195, transform: 'translate(-50%,-50%)', fontFamily: sans, fontWeight: 900, fontSize: 90, color: YEL, opacity: 1 - clamp01((f - s12(-0.1)) / 6), textShadow: '0 6px 0 rgba(0,0,0,.4)'}}>≈ 5%</div>}
          <div style={{position: 'absolute', left: 540, top: 430, transform: `translate(-50%,-50%) scale(${pop(f, s12(0.3), 16)})`, fontFamily: serif, fontWeight: 900, fontSize: 330, color: '#fff', textShadow: '0 10px 26px rgba(0,0,0,.7)', display: f >= s12(0.2) ? 'block' : 'none'}}>1914</div>
          <Hand text="Opened August 15" x={540} y={650} f={f} from={s12(0.9)} size={96} color={YEL} rot={-4} />
          {has(m, 'photos', 'sign') && <Card src={photo('sign')} x={540} y={1010} w={640} f={f} from={s12(1.4)} rot={3} />}
        </>
      )}
    </MapBlock>
  );
};

// ---------------- Block 8: outro + credits ----------------
const Map5: React.FC<B> = (b) => {
  const {f, g, sent, m, t1} = b;
  const t = g / FPS;
  const s13 = (o: number) => S(b, 13, o);
  const end = Math.round((sent[13].end + 0.4) * FPS) - Math.round(b.t0 * FPS);
  const cr = fadeIn(f, end, 14);
  return (
    <MapBlock {...b} three={(cam) => (
      <>
        <CanalPath draw={1} d={cam.d} />
        {Array.from({length: 5}, (_, i) => <Ship3D key={i} u={((t * 0.04 + i / 5) % 1)} s={cam.d * 0.03} seed={i + 2} />)}
      </>
    )}>
      {() => (
        <>
          <div style={{position: 'absolute', left: 540, top: 300, transform: `translate(-50%,-50%) scale(${pop(f, 4, 16)})`, textAlign: 'center', opacity: 1 - cr, fontFamily: serif, fontWeight: 900, fontSize: 120, color: '#fff', textShadow: '0 8px 22px rgba(0,0,0,.7)', lineHeight: 1}}>
            <div>CLIMBING A</div><div style={{color: YEL}}>MOUNTAIN</div><div style={{fontSize: 90}}>BY BOAT</div>
          </div>
          {has(m, 'cutouts', 'ship') && <div style={{opacity: 1 - cr}}><Cut src={cut('ship')} x={540} y={960} w={880} f={f} from={s13(0.6)} rot={-2} /></div>}
          {has(m, 'cutouts', 'toucan') && <div style={{opacity: 1 - cr}}><Cut src={cut('toucan')} x={850} y={1180} w={340} f={f} from={s13(2.6)} rot={6} bob={12} /></div>}
          {has(m, 'cutouts', 'skyline') && <div style={{opacity: 1 - cr}}><Cut src={cut('skyline')} x={290} y={1150} w={500} f={f} from={s13(3.4)} rot={-3} /></div>}
          <div style={{position: 'absolute', inset: 0, background: 'rgba(3,12,30,.72)', opacity: cr}} />
          <div style={{position: 'absolute', left: 80, right: 130, top: 280, opacity: cr, color: '#fff', fontFamily: sans}}>
            <div style={{fontFamily: serif, fontWeight: 900, fontSize: 70, color: YEL, marginBottom: 26}}>Sources</div>
            {m.credits.map((c, i) => <div key={i} style={{fontSize: 27, fontWeight: 600, lineHeight: 1.3, marginBottom: 10, opacity: 0.95}}>{c}</div>)}
          </div>
        </>
      )}
    </MapBlock>
  );
};

export const Main: React.FC<Props> = ({sent, total, manifest}) => {
  const frame = useCurrentFrame();
  const F = (i: number) => Math.round(sent[i].start * FPS);
  const end = Math.round(total * FPS);
  const defs: {a: number; b: number; C: React.FC<B>}[] = [
    {a: 0, b: 3, C: Map1}, {a: 3, b: 4, C: Bp1}, {a: 4, b: 5, C: Map2}, {a: 5, b: 7, C: Lock1},
    {a: 7, b: 9, C: Map3}, {a: 9, b: 11, C: Lock2}, {a: 11, b: 13, C: Map4}, {a: 13, b: 14, C: Map5},
  ];
  return (
    <AbsoluteFill style={{background: '#06204a'}}>
      {defs.map((d, i) => {
        const from = i === 0 ? 0 : F(d.a);
        const to = d.b >= 14 ? end : F(d.b) + 14;
        return (
          <Sequence key={i} from={from} durationInFrames={Math.max(1, to - from)} layout="none">
            <Wrap from={from} t0={from / FPS} t1={(d.b >= 14 ? end : F(d.b)) / FPS} sent={sent} m={manifest} C={d.C} first={i === 0} />
          </Sequence>
        );
      })}
      <Caption sent={sent} t={frame / FPS} />
    </AbsoluteFill>
  );
};

const Wrap: React.FC<{from: number; t0: number; t1: number; sent: Props['sent']; m: Manifest; C: React.FC<B>; first: boolean}> = ({from, t0, t1, sent, m, C, first}) => {
  const f = useCurrentFrame();
  const inner = <C f={f} g={f + from} sent={sent} m={m} t0={t0} t1={t1} />;
  return <AbsoluteFill>{first ? inner : <Reveal f={f}>{inner}</Reveal>}</AbsoluteFill>;
};
void interpolate; void H; void W; void easeOut; void hand;
