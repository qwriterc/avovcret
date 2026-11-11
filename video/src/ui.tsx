import React from 'react';
import {AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {loadFont as loadOswald} from '@remotion/google-fonts/Oswald';
import {loadFont as loadPlayfair} from '@remotion/google-fonts/PlayfairDisplay';
import {loadFont as loadCaveat} from '@remotion/google-fonts/Caveat';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {clamp01, easeOut, FPS, Sent} from './lib';

export const oswald = loadOswald('normal', {weights: ['600', '700'], subsets: ['latin']}).fontFamily;
export const playfair = loadPlayfair('normal', {weights: ['700'], subsets: ['latin']}).fontFamily;
export const caveat = loadCaveat('normal', {weights: ['700'], subsets: ['latin']}).fontFamily;
export const inter = loadInter('normal', {weights: ['600', '700'], subsets: ['latin']}).fontFamily;

export const useSpring = (at: number, cfg?: {damping?: number; stiffness?: number; mass?: number}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: f - at, fps, config: {damping: 13, stiffness: 120, mass: 0.8, ...cfg}});
};

/** animated blueprint grid background (reference look) */
export const Blueprint: React.FC<{drift?: number}> = ({drift = 0}) => {
  const f = useCurrentFrame();
  const o = (f * 0.35 + drift) % 120;
  return (
    <AbsoluteFill style={{background: 'linear-gradient(180deg,#0b5ac8 0%,#0a49a8 55%,#083a8c 100%)'}}>
      <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.20) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.20) 2px, transparent 2px)', backgroundSize: '120px 120px', backgroundPosition: `${o}px ${o}px`}} />
      <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px)', backgroundSize: '24px 24px', backgroundPosition: `${o}px ${o}px`}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 38%, rgba(120,190,255,0.35) 0%, rgba(0,0,0,0) 60%)'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,12,50,0.6) 100%)'}} />
    </AbsoluteFill>
  );
};

const outline = 'drop-shadow(0 0 1.5px #fff) drop-shadow(0 0 1.5px #fff) drop-shadow(0 0 1px #fff)';
/** real-photo cut-out with white keyline, warm glow and soft shadow (reference style) */
export const Cutout: React.FC<{src: string; x: number; y: number; w: number; rot?: number; at?: number; out?: number; float?: number; from?: 'left' | 'right' | 'bottom' | 'top'; glow?: string}> = ({src, x, y, w, rot = 0, at = 0, out, float = 6, from = 'bottom', glow = 'rgba(255,200,120,0.55)'}) => {
  const f = useCurrentFrame();
  const sp = useSpring(at);
  const o = out === undefined ? 1 : 1 - easeOut((f - out) / 8);
  const dx = from === 'left' ? -900 : from === 'right' ? 900 : 0, dy = from === 'bottom' ? 900 : from === 'top' ? -900 : 0;
  const fl = Math.sin((f + x) / 18) * float;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o * clamp01((f - at + 1) / 3), transform: `translate(-50%,-50%) translate(${dx * (1 - sp)}px, ${dy * (1 - sp) + fl}px) rotate(${rot + (1 - sp) * 12}deg) scale(${0.6 + 0.4 * sp})`}}>
      <Img src={staticFile(src)} style={{width: '100%', display: 'block', filter: `${outline} drop-shadow(0 0 28px ${glow}) drop-shadow(0 22px 22px rgba(0,0,0,0.55))`}} />
    </div>
  );
};

/** uncropped photograph on a white print card */
export const PhotoCard: React.FC<{src: string; x: number; y: number; w: number; h: number; rot?: number; at?: number; out?: number; from?: 'left' | 'right' | 'bottom' | 'top'; label?: string; fit?: string}> = ({src, x, y, w, h, rot = 0, at = 0, out, from = 'bottom', label, fit = 'cover'}) => {
  const f = useCurrentFrame();
  const sp = useSpring(at, {damping: 14});
  const o = out === undefined ? 1 : 1 - easeOut((f - out) / 8);
  const dx = from === 'left' ? -1100 : from === 'right' ? 1100 : 0, dy = from === 'bottom' ? 1100 : from === 'top' ? -1100 : 0;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity: o, transform: `translate(-50%,-50%) translate(${dx * (1 - sp)}px, ${dy * (1 - sp)}px) rotate(${rot + (1 - sp) * 14}deg) scale(${0.85 + 0.15 * sp})`, background: '#fff', padding: 12, boxShadow: '0 24px 44px rgba(0,0,0,0.55), 0 0 30px rgba(255,220,160,0.35)', borderRadius: 6}}>
      <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: fit as 'cover', display: 'block', borderRadius: 2}} />
      {label && <div style={{position: 'absolute', left: 12, bottom: 12, background: 'rgba(0,0,0,0.65)', color: '#fff', fontFamily: inter, fontSize: 24, padding: '6px 14px', fontWeight: 700}}>{label}</div>}
    </div>
  );
};

export const Emoji: React.FC<{name: string; x: number; y: number; size: number; at?: number; spin?: number}> = ({name, x, y, size, at = 0, spin = 0}) => {
  const f = useCurrentFrame();
  const sp = useSpring(at, {damping: 9, stiffness: 150});
  return <Img src={staticFile(`emoji/${name}.png`)} style={{position: 'absolute', left: x, top: y, width: size, transform: `translate(-50%,-50%) scale(${sp}) rotate(${Math.sin(f / 12) * 6 + spin}deg) translateY(${Math.sin(f / 15) * 8}px)`, filter: 'drop-shadow(0 14px 18px rgba(0,0,0,0.5)) drop-shadow(0 0 16px rgba(255,255,255,0.35))'}} />;
};

export const OrangeLabel: React.FC<{text: string; x: number; y: number; at?: number; size?: number; w?: number}> = ({text, x, y, at = 0, size = 36, w}) => {
  const sp = useSpring(at);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, transform: `translate(-50%,-50%) scale(${sp})`, textAlign: 'center', whiteSpace: 'nowrap', padding: '10px 26px', background: 'linear-gradient(180deg,#ffa42a,#e26f00)', border: '2px solid #ffd08a', boxShadow: '0 10px 22px rgba(0,0,0,0.45)', color: '#fff', fontFamily: oswald, fontWeight: 700, fontSize: size, letterSpacing: 1.5, textTransform: 'uppercase', textShadow: '0 2px 3px rgba(0,0,0,0.5)', lineHeight: 1.05}}>{text}</div>
  );
};

export const BigNum: React.FC<{text: string; x: number; y: number; size?: number; at?: number; color?: string; sub?: string}> = ({text, x, y, size = 150, at = 0, color = '#ffd21f', sub}) => {
  const sp = useSpring(at, {damping: 10, stiffness: 140});
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${sp})`, textAlign: 'center', fontFamily: oswald, fontWeight: 700}}>
      <div style={{fontSize: size, color, lineHeight: 1, letterSpacing: 2, WebkitTextStroke: '3px rgba(60,35,0,0.55)', textShadow: '0 6px 0 rgba(120,70,0,0.55), 0 0 30px rgba(255,200,40,0.55)'}}>{text}</div>
      {sub && <div style={{fontSize: size * 0.26, color: '#fff', letterSpacing: 4, marginTop: 6, textShadow: '0 3px 8px rgba(0,0,0,0.6)'}}>{sub}</div>}
    </div>
  );
};

export const NeonTitle: React.FC<{text: string; x: number; y: number; size?: number; at?: number; color?: string; sub?: string}> = ({text, x, y, size = 130, at = 0, color = '#ffb347', sub}) => {
  const f = useCurrentFrame();
  const sp = useSpring(at, {damping: 16, stiffness: 90});
  const flick = 0.92 + 0.08 * Math.sin(f * 0.9);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: 1000, transform: `translate(-50%,-50%) scale(${0.7 + 0.3 * sp})`, opacity: clamp01(sp) * flick, textAlign: 'center', fontFamily: oswald, fontWeight: 700}}>
      <div style={{fontSize: size, lineHeight: 0.95, color: '#fff7e6', letterSpacing: 4, textTransform: 'uppercase', textShadow: `0 0 6px #fff, 0 0 14px ${color}, 0 0 30px ${color}, 0 0 60px ${color}, 0 0 100px ${color}`}}>{text}</div>
      {sub && <div style={{fontSize: size * 0.3, marginTop: 14, color: '#fff', letterSpacing: 6, whiteSpace: 'nowrap', textShadow: `0 0 12px ${color}, 0 3px 8px rgba(0,0,0,0.7)`}}>{sub}</div>}
    </div>
  );
};

/** serif place-name on map (reference look) */
export const PlaceName: React.FC<{text: string; size?: number; at?: number; color?: string}> = ({text, size = 44, at = 0, color = '#fff'}) => {
  const sp = useSpring(at);
  return <div style={{fontFamily: playfair, fontWeight: 700, fontSize: size, color, transform: `scale(${sp})`, textShadow: '0 2px 6px rgba(0,0,0,0.85), 0 0 14px rgba(0,0,0,0.6)', letterSpacing: 1}}>{text}</div>;
};

export const Pin: React.FC<{at?: number; color?: string}> = ({at = 0, color = '#ff5a2a'}) => {
  const f = useCurrentFrame();
  const sp = useSpring(at, {damping: 8, stiffness: 160});
  const r = ((f - at) % 50) / 50;
  return (
    <div style={{position: 'relative', width: 0, height: 0}}>
      <div style={{position: 'absolute', left: -60, top: -60, width: 120, height: 120, borderRadius: '50%', border: `4px solid ${color}`, opacity: (1 - r) * 0.8 * clamp01(sp), transform: `scale(${0.2 + r * 1.2})`}} />
      <div style={{position: 'absolute', left: -14, top: -14, width: 28, height: 28, borderRadius: '50%', background: '#fff', border: `7px solid ${color}`, transform: `scale(${sp})`, boxShadow: `0 0 22px ${color}`}} />
    </div>
  );
};

export const Person: React.FC<{size: number; color?: string; flag?: boolean}> = ({size, color = '#fff'}) => (
  <svg width={size * 0.5} height={size} viewBox="0 0 50 100" style={{filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.4))'}}>
    <circle cx="25" cy="14" r="13" fill={color} />
    <path d="M6 100 V48 Q6 32 25 32 Q44 32 44 48 V100 Z" fill={color} />
  </svg>
);
export const PeopleGrid: React.FC<{x: number; y: number; cols: number; rows: number; size: number; at: number; perFrame?: number; color?: string}> = ({x, y, cols, rows, size, at, perFrame = 0.7, color}) => {
  const f = useCurrentFrame();
  const n = Math.floor(Math.max(0, f - at) * perFrame);
  const items = [];
  for (let i = 0; i < cols * rows; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    const vis = clamp01((n - i) / 2);
    items.push(<div key={i} style={{position: 'absolute', left: c * size * 0.72, top: r * size * 1.18, opacity: vis, transform: `translateY(${(1 - vis) * 18}px) scale(${0.6 + 0.4 * vis})`}}><Person size={size} color={color} /></div>);
  }
  return <div style={{position: 'absolute', left: x - (cols * size * 0.72) / 2, top: y}}>{items}</div>;
};

export const HandNote: React.FC<{text: string; x: number; y: number; at?: number; size?: number; rot?: number; color?: string}> = ({text, x, y, at = 0, size = 64, rot = -6, color = '#ffe14a'}) => {
  const f = useCurrentFrame();
  const t = clamp01((f - at) / 14);
  return <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) rotate(${rot}deg)`, fontFamily: caveat, fontWeight: 700, fontSize: size, color, opacity: t, WebkitMaskImage: t < 1 ? `linear-gradient(90deg, #000 ${t * 120 - 20}%, transparent ${t * 120}%)` : 'none', textShadow: '0 3px 8px rgba(0,0,0,0.5)', whiteSpace: 'nowrap'}}>{text}</div>;
};

export const HandEllipse: React.FC<{x: number; y: number; w: number; h: number; at?: number; color?: string; rot?: number}> = ({x, y, w, h, at = 0, color = '#ffe14a', rot = -3}) => {
  const f = useCurrentFrame();
  const t = easeOut((f - at) / 18);
  return (
    <svg width={w + 80} height={h + 80} style={{position: 'absolute', left: x - (w + 80) / 2, top: y - (h + 80) / 2, overflow: 'visible', transform: `rotate(${rot}deg)`, filter: 'drop-shadow(0 0 8px rgba(255,225,74,0.7))'}}>
      <path d={`M ${w * 0.5 + 40} ${40 + 3} C ${w + 90} ${40 - 4}, ${w + 80} ${h + 70}, ${w * 0.5 + 40} ${h + 42} C ${-30} ${h + 50}, ${-26} ${30}, ${w * 0.55 + 40} ${40 - 2}`} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t} />
    </svg>
  );
};

export const Connector: React.FC<{pts: [number, number][]; at: number; dur?: number}> = ({pts, at, dur = 16}) => {
  const f = useCurrentFrame();
  const t = easeOut((f - at) / dur);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ');
  return <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}><path d={d} fill="none" stroke="#fff" strokeWidth={4} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t} style={{filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))'}} /></svg>;
};

/** reference-style small bottom captions, chunked and timed to real narration */
export const Captions: React.FC<{sents: Sent[]}> = ({sents}) => {
  const f = useCurrentFrame();
  const s = sents.find((q) => f >= q.start - 1 && f < q.end + 3);
  if (!s) return null;
  const words = s.text.replace(/[.,!?]/g, (m) => m).split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; ) { const n = words.length - i === 4 ? 2 : words[i].length > 7 ? 2 : 3; chunks.push(words.slice(i, i + n).join(' ')); i += n; }
  const total = chunks.reduce((a, c) => a + c.length + 2, 0);
  let acc = 0, cur = chunks[0], t0 = 0, t1 = 1;
  const p = (f - s.start) / Math.max(1, s.end - s.start);
  for (const c of chunks) { t0 = acc / total; acc += c.length + 2; t1 = acc / total; cur = c; if (p < t1) break; }
  const lp = clamp01((p - t0) / Math.max(0.01, t1 - t0) * 6);
  return (
    <div style={{position: 'absolute', left: 60, right: 140, top: 1318, textAlign: 'center', fontFamily: inter, fontWeight: 700, fontSize: 50, color: '#fff', textShadow: '0 3px 10px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.9)', transform: `translateY(${(1 - lp) * 10}px)`, opacity: 0.3 + 0.7 * lp, letterSpacing: 0.5}}>{cur}</div>
  );
};

/** diagonal white-line wipe (reference transition) */
export const DiagWipe: React.FC<{frames?: number; children: React.ReactNode}> = ({frames = 14, children}) => {
  const f = useCurrentFrame();
  const t = easeOut(f / frames);
  if (t >= 1) return <>{children}</>;
  const x = -400 + t * 2000; // sweep edge position
  const skew = 520;
  const poly = `polygon(0 0, ${x + skew}px 0, ${x - skew}px 1920px, 0 1920px)`;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{clipPath: poly}}>{children}</AbsoluteFill>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <line x1={x + skew} y1={0} x2={x - skew} y2={1920} stroke="#fff" strokeWidth={9} style={{filter: 'drop-shadow(0 0 14px #fff)'}} />
      </svg>
    </AbsoluteFill>
  );
};

export const Fade: React.FC<{frames?: number; children: React.ReactNode}> = ({frames = 8, children}) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{opacity: clamp01((f + 1) / frames)}}>{children}</AbsoluteFill>;
};

export {interpolate, FPS};
