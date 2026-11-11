import React, {createContext, useContext} from 'react';
import {AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadCaveat} from '@remotion/google-fonts/Caveat';
import {loadFont as loadPlayfair} from '@remotion/google-fonts/PlayfairDisplay';
import {loadFont as loadMont} from '@remotion/google-fonts/Montserrat';

export const HAND = loadCaveat().fontFamily;
export const SERIF = loadPlayfair().fontFamily;
export const SANS = loadMont().fontFamily;
export const W = 1080;
export const H = 1920;
export const FPS = 30;
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const eo = Easing.bezier(0.16, 1, 0.3, 1);
export const eio = Easing.bezier(0.65, 0, 0.35, 1);
export const A = (p: string) => staticFile('assets/' + p);

export type TL = {i: number; show: string; start: number; end: number; dur: number; file: string};
export type Data = {timeline: TL[]; manifest: any; credits: any};
export const DataCtx = createContext<Data>(null as any);
export const SceneCtx = createContext<{D: number}>({D: 100});
export const useScene = () => {
  const f = useCurrentFrame();
  const {D} = useContext(SceneCtx);
  return {f, D, p: Math.min(1, f / Math.max(1, D))};
};
export const useData = () => useContext(DataCtx);

// ---------- 2D map camera (image-pixel space)
export type Cam2 = {cx: number; cy: number; z: number};
export const lerpCam = (a: Cam2, b: Cam2, p: number): Cam2 => ({
  cx: a.cx + (b.cx - a.cx) * p,
  cy: a.cy + (b.cy - a.cy) * p,
  z: a.z * Math.pow(b.z / a.z, p),
});
export const toScreen = (c: Cam2, x: number, y: number): [number, number] => [(x - c.cx) * c.z + W / 2, (y - c.cy) * c.z + H / 2];

export const MapLayer: React.FC<{src: string; w: number; h: number; cam: Cam2; tint?: string}> = ({src, w, h, cam, tint}) => (
  <AbsoluteFill style={{overflow: 'hidden', background: '#0b2a4a'}}>
    <Img
      src={src}
      style={{position: 'absolute', left: 0, top: 0, width: w, height: h, maxWidth: 'none', transformOrigin: '0 0',
        transform: `translate(${W / 2 - cam.cx * cam.z}px, ${H / 2 - cam.cy * cam.z}px) scale(${cam.z})`}}
    />
    {tint ? <AbsoluteFill style={{background: tint}} /> : null}
  </AbsoluteFill>
);

// ---------- cut-out element: pop-in, float, shadow, optional glow. Always inside its box.
export const Cut: React.FC<{src: string; x: number; y: number; w: number; h: number; at: number; rot?: number; glow?: string; outline?: boolean; float?: number}> = ({src, x, y, w, h, at, rot = 0, glow, outline = true, float = 1}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - at, fps, config: {damping: 9, stiffness: 150, mass: 0.7}});
  const snd = (
    <Sequence from={at} durationInFrames={12}>
      <Audio src={A('audio/pop.wav')} volume={0.16} />
    </Sequence>
  );
  if (f < at) return snd;
  const fl = Math.sin((f - at) / 14 + x) * 6 * float;
  const filt = [
    outline ? 'drop-shadow(0 0 0 #fff) drop-shadow(3px 0 0 #fff) drop-shadow(-3px 0 0 #fff) drop-shadow(0 3px 0 #fff) drop-shadow(0 -3px 0 #fff)' : '',
    'drop-shadow(0 18px 18px rgba(0,0,0,0.55))',
    glow ? `drop-shadow(0 0 22px ${glow})` : '',
  ].join(' ');
  return (
    <>
    {snd}
    <div style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, transform: `translateY(${fl}px) scale(${s}) rotate(${rot + Math.sin((f - at) / 20) * 1.5}deg)`, opacity: Math.min(1, s * 2)}}>
      <Img src={src} style={{width: '100%', height: '100%', objectFit: 'contain', filter: filt}} />
    </div>
    </>
  );
};

// ---------- polaroid photo card sliding in (from off-screen) and settling fully inside
export const Card: React.FC<{src: string; x: number; y: number; w: number; h: number; at: number; rot: number; from?: 'left' | 'bottom' | 'right'}> = ({src, x, y, w, h, at, rot, from = 'bottom'}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - at, fps, config: {damping: 14, stiffness: 90}});
  if (f < at) return null;
  const off = (1 - s) * 1500;
  const dx = from === 'left' ? -off : from === 'right' ? off : 0;
  const dy = from === 'bottom' ? off : 0;
  return (
    <div style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, transform: `translate(${dx}px, ${dy}px) rotate(${rot * (0.5 + 0.5 * s)}deg)`, background: '#fff', padding: 14, boxSizing: 'border-box', boxShadow: '0 22px 40px rgba(0,0,0,0.55)'}}>
      <Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
    </div>
  );
};

export const Pop: React.FC<{at: number; children: React.ReactNode; style?: React.CSSProperties}> = ({at, children, style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - at, fps, config: {damping: 10, stiffness: 170, mass: 0.6}});
  if (f < at) return null;
  return <div style={{position: 'absolute', transform: `scale(${s})`, opacity: Math.min(1, s * 2), ...style}}>{children}</div>;
};

export const Orange: React.FC<{text: string; x: number; y: number; at: number; size?: number}> = ({text, x, y, at, size = 40}) => (
  <Pop at={at} style={{left: x, top: y, transform: undefined}}>
    <div style={{transform: 'translate(-50%,-50%)', background: '#f28c1c', border: '4px solid #fff', color: '#fff', fontFamily: SANS, fontWeight: 800, fontSize: size, padding: '8px 22px', letterSpacing: 1, whiteSpace: 'nowrap', boxShadow: '0 8px 18px rgba(0,0,0,0.4)'}}>{text}</div>
  </Pop>
);

export const Hand: React.FC<{text: string; x: number; y: number; at: number; size?: number; color?: string; rot?: number}> = ({text, x, y, at, size = 66, color = '#fff', rot = -4}) => {
  const f = useCurrentFrame();
  const p = interpolate(f - at, [0, 14], [0, 1], clamp);
  if (f < at) return null;
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) rotate(${rot + Math.sin(f / 18) * 1.2}deg) translateY(${(1 - p) * 30}px)`, opacity: p, fontFamily: HAND, fontWeight: 700, fontSize: size, color, whiteSpace: 'nowrap', textShadow: '0 4px 12px rgba(0,0,0,0.8), 0 0 3px rgba(0,0,0,0.9)'}}>{text}</div>
  );
};

export const Serif: React.FC<{text: string; x: number; y: number; at: number; size?: number; color?: string}> = ({text, x, y, at, size = 120, color = '#fff'}) => {
  const f = useCurrentFrame();
  const p = interpolate(f - at, [0, 16], [0, 1], {...clamp, easing: eo});
  if (f < at) return null;
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${1.5 - 0.5 * p})`, opacity: p, fontFamily: SERIF, fontWeight: 900, fontSize: size, color, textAlign: 'center', whiteSpace: 'pre', lineHeight: 1.02, textShadow: '0 6px 24px rgba(0,0,0,0.75)'}}>{text}</div>
  );
};

export const Blueprint: React.FC = () => {
  const f = useCurrentFrame();
  const o = (f * 0.3) % 80;
  return (
    <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 40%, #2c86e6 0%, #1566c8 55%, #0d4aa0 100%)'}}>
      <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.13) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.13) 2px, transparent 2px), linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '160px 160px, 160px 160px, 40px 40px, 40px 40px', backgroundPosition: `${o}px ${o}px`}} />
    </AbsoluteFill>
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,10,0.5) 100%)', pointerEvents: 'none'}} />
);

// ---------- captions: word chunks timed proportionally inside each measured sentence
export const Captions: React.FC<{tl: TL[]}> = ({tl}) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const s = tl.find((x) => t >= x.start - 0.02 && t <= x.end + 0.25);
  if (!s) return null;
  const words = s.show.split(' ');
  const wt = words.map((w) => w.length + (/[.,]$/.test(w) ? 3 : 0) + 1.5);
  const tot = wt.reduce((a, b) => a + b, 0);
  const st: number[] = [];
  let acc = 0;
  words.forEach((_, i) => { st.push(s.start + (acc / tot) * s.dur); acc += wt[i]; });
  const chunks: {a: number; txt: string}[] = [];
  let cur: string[] = [];
  let a0 = 0;
  words.forEach((w, i) => {
    if (!cur.length) a0 = st[i];
    cur.push(w);
    if (cur.length >= 3 || /[.,]$/.test(w) || i === words.length - 1) { chunks.push({a: a0, txt: cur.join(' ')}); cur = []; }
  });
  let c = chunks[0];
  for (const k of chunks) if (t >= k.a) c = k;
  const pp = interpolate(t - c.a, [0, 0.12], [0, 1], clamp);
  return (
    <div style={{position: 'absolute', left: 90, right: 90, top: 1330, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 60, color: '#fff', textAlign: 'center', lineHeight: 1.1, transform: `scale(${0.92 + 0.08 * pp})`, opacity: pp, textShadow: '0 4px 14px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.9), 3px 3px 0 rgba(0,0,0,0.6)'}}>{c.txt}</div>
    </div>
  );
};

export const Arrow: React.FC<{x1: number; y1: number; x2: number; y2: number; at: number; color?: string}> = ({x1, y1, x2, y2, at, color = '#fff'}) => {
  const f = useCurrentFrame();
  const p = interpolate(f - at, [0, 14], [0, 1], {...clamp, easing: eo});
  if (f < at) return null;
  const ex = x1 + (x2 - x1) * p, ey = y1 + (y2 - y1) * p;
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const hx = (d: number) => ex - Math.cos(ang + d) * 34;
  const hy = (d: number) => ey - Math.sin(ang + d) * 34;
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.7))'}}>
      <path d={`M${x1},${y1} L${ex},${ey} M${hx(0.5)},${hy(0.5)} L${ex},${ey} L${hx(-0.5)},${hy(-0.5)}`} stroke={color} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
