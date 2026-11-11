import React from 'react';
import {Img, interpolate} from 'remotion';
import {asset, clamp01, ease, easeOut, fadeIn, hand, pop, sans, serif, Sent, chunkAt, YEL, ORG, W} from './lib';

export const Blueprint: React.FC<{frame: number}> = ({frame}) => (
  <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 42%, #1f86ea 0%, #0d5ccc 38%, #07408f 75%, #052b66 100%)'}}>
    <div style={{position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(rgba(255,255,255,.1) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,.1) 2px, transparent 2px)', backgroundSize: '36px 36px, 36px 36px, 180px 180px, 180px 180px', backgroundPosition: `0px ${-frame * 0.3}px`}} />
  </div>
);

export const Vignette: React.FC = () => (
  <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,10,30,.55) 100%)', pointerEvents: 'none'}} />
);

export const Caption: React.FC<{sent: Sent[]; t: number}> = ({sent, t}) => {
  const s = sent.find((x) => t >= x.start - 0.02 && t <= x.end + 0.25);
  if (!s) return null;
  const txt = chunkAt(s, Math.min(t, s.end));
  return (
    <div style={{position: 'absolute', left: 90, right: 150, top: 1385, textAlign: 'center', fontFamily: sans, fontWeight: 800, fontSize: 60, lineHeight: 1.12, color: '#fff', textShadow: '0 3px 10px rgba(0,0,0,.85), 0 0 3px rgba(0,0,0,.9)', letterSpacing: 0.5}}>
      {txt}
    </div>
  );
};

export const Cut: React.FC<{src: string; x: number; y: number; w: number; f: number; from: number; to?: number; rot?: number; bob?: number; glow?: string}> = ({src, x, y, w, f, from, to = 1e9, rot = 0, bob = 10, glow = 'rgba(255,214,120,.7)'}) => {
  const a = pop(f, from, 16);
  const ex = clamp01((f - to) / 9);
  const sc = a * (1 - ex * ex);
  if (sc <= 0.01) return null;
  const dy = Math.sin((f - from) / 15) * bob;
  return (
    <Img src={asset(src)} style={{position: 'absolute', left: x, top: y + dy, width: w, transform: `translate(-50%,-50%) scale(${sc}) rotate(${rot + (1 - a) * -12}deg)`, filter: `drop-shadow(0 0 26px ${glow}) drop-shadow(0 16px 16px rgba(0,0,0,.55))`}} />
  );
};

export const Card: React.FC<{src: string; x: number; y: number; w: number; f: number; from: number; to?: number; rot?: number}> = ({src, x, y, w, f, from, to = 1e9, rot = -4}) => {
  const a = easeOut((f - from) / 16);
  const ex = easeOut((f - to) / 12);
  if (a <= 0 || ex >= 1) return null;
  const ty = (1 - a) * 1500 + ex * 1500;
  return (
    <div style={{position: 'absolute', width: 'max-content', left: x, top: y, transform: `translate(-50%,-50%) translateY(${ty}px) rotate(${rot + (1 - a) * 10}deg)`, padding: 14, background: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,.55), 0 0 40px rgba(255,255,255,.18)'}}>
      <Img src={asset(src)} style={{width: w, display: 'block'}} />
    </div>
  );
};

export const Emoji: React.FC<{name: string; x: number; y: number; s: number; f: number; from: number; to?: number}> = ({name, x, y, s, f, from, to = 1e9}) => {
  const a = pop(f, from, 14) * (1 - clamp01((f - to) / 8));
  if (a <= 0.01) return null;
  return <Img src={asset(`emoji/${name}.png`)} style={{position: 'absolute', left: x, top: y + Math.sin((f - from) / 12) * 8, width: s, transform: `translate(-50%,-50%) scale(${a})`, filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.45))'}} />;
};

export const Counter: React.FC<{f: number; from: number; dur: number; to: number; suffix?: string; prefix?: string; size?: number; color?: string; x?: number; y: number; font?: string}> = ({f, from, dur, to, suffix = '', prefix = '', size = 130, color = YEL, x = W / 2, y, font = sans}) => {
  const a = fadeIn(f, from, 6);
  if (a <= 0) return null;
  const v = Math.round(to * ease((f - from) / dur));
  const sc = pop(f, from, 12);
  return (
    <div style={{position: 'absolute', width: 'max-content', left: x, top: y, transform: `translate(-50%,-50%) scale(${sc})`, fontFamily: font, fontWeight: 900, fontSize: size, color, whiteSpace: 'nowrap', textShadow: '0 6px 0 rgba(0,0,0,.35), 0 0 26px rgba(0,0,0,.35)', letterSpacing: -1}}>
      {prefix}{v.toLocaleString('en-US')}{suffix}
    </div>
  );
};

export const OrangeBox: React.FC<{text: string; x: number; y: number; f: number; from: number; size?: number; to?: number}> = ({text, x, y, f, from, size = 54, to = 1e9}) => {
  const a = pop(f, from, 12) * (1 - clamp01((f - to) / 8));
  if (a <= 0.01) return null;
  return (
    <div style={{position: 'absolute', width: 'max-content', left: x, top: y, transform: `translate(-50%,-50%) scale(${a})`, background: `linear-gradient(#f58a1f, ${ORG})`, color: '#fff', fontFamily: sans, fontWeight: 900, fontSize: size, padding: '12px 34px', border: '3px solid #ffb04d', boxShadow: '0 10px 18px rgba(0,0,0,.45)', textShadow: '0 3px 0 rgba(0,0,0,.35)', whiteSpace: 'nowrap', letterSpacing: 1}}>
      {text}
    </div>
  );
};

export const Hand: React.FC<{text: string; x: number; y: number; f: number; from: number; size?: number; color?: string; rot?: number; to?: number; dur?: number}> = ({text, x, y, f, from, size = 90, color = '#fff', rot = -6, to = 1e9, dur = 18}) => {
  const a = clamp01((f - from) / dur);
  const ex = 1 - clamp01((f - to) / 8);
  if (a <= 0 || ex <= 0) return null;
  return (
    <div style={{position: 'absolute', width: 'max-content', left: x, top: y, transform: `translate(-50%,-50%) rotate(${rot}deg)`, fontFamily: hand, fontWeight: 700, fontSize: size, color, whiteSpace: 'nowrap', clipPath: `inset(-20px ${(1 - a) * 100}% -20px 0)`, opacity: ex, textShadow: '0 4px 10px rgba(0,0,0,.6)'}}>
      {text}
    </div>
  );
};

export const GeoLabel: React.FC<{text: string; x: number; y: number; size: number; f: number; from: number; to?: number; color?: string}> = ({text, x, y, size, f, from, to = 1e9, color = '#fff'}) => {
  const a = fadeIn(f, from, 12) * (1 - clamp01((f - to) / 10));
  if (a <= 0) return null;
  return (
    <div style={{position: 'absolute', width: 'max-content', left: x, top: y - (1 - a) * 20, transform: 'translate(-50%,-50%)', opacity: a, fontFamily: serif, fontWeight: 700, fontSize: size, color, whiteSpace: 'nowrap', textShadow: '0 4px 12px rgba(0,0,0,.85), 0 0 3px rgba(0,0,0,.8)'}}>
      {text}
    </div>
  );
};

export const Pin: React.FC<{x: number; y: number; f: number; from: number}> = ({x, y, f, from}) => {
  const a = pop(f, from, 12);
  if (a <= 0.01) return null;
  const pulse = ((f - from) % 40) / 40;
  return (
    <div style={{position: 'absolute', width: 'max-content', left: x, top: y, transform: 'translate(-50%,-50%)'}}>
      <div style={{position: 'absolute', left: -30, top: -30, width: 60, height: 60, borderRadius: 30, border: `4px solid ${YEL}`, opacity: 1 - pulse, transform: `scale(${0.5 + pulse})`}} />
      <div style={{position: 'absolute', left: -13, top: -13, width: 26, height: 26, borderRadius: 13, background: YEL, border: '4px solid #fff', boxShadow: '0 0 20px rgba(255,229,0,.9)', transform: `scale(${a})`}} />
    </div>
  );
};

export const Arrow2D: React.FC<{x: number; y: number; f: number; from: number; rot?: number; to?: number}> = ({x, y, f, from, rot = 135, to = 1e9}) => {
  const a = pop(f, from, 12) * (1 - clamp01((f - to) / 8));
  if (a <= 0.01) return null;
  const b = Math.sin((f - from) / 6) * 14;
  return (
    <svg width={170} height={170} viewBox="0 0 100 100" style={{position: 'absolute', width: 'max-content', left: x, top: y, transform: `translate(-50%,-50%) rotate(${rot}deg) translateY(${b}px) scale(${a})`, filter: 'drop-shadow(0 8px 8px rgba(0,0,0,.6)) drop-shadow(0 0 14px rgba(255,255,255,.6))'}}>
      <path d="M50 8 L84 46 L62 46 L62 92 L38 92 L38 46 L16 46 Z" fill="#fff" />
    </svg>
  );
};

export const Ellipse: React.FC<{x: number; y: number; rx: number; ry: number; f: number; from: number; color?: string; dur?: number}> = ({x, y, rx, ry, f, from, color = YEL, dur = 22}) => {
  const a = clamp01((f - from) / dur);
  if (a <= 0) return null;
  const len = 2 * Math.PI * Math.max(rx, ry) * 1.06;
  return (
    <svg width={rx * 2 + 80} height={ry * 2 + 80} style={{position: 'absolute', width: 'max-content', left: x, top: y, transform: 'translate(-50%,-50%) rotate(-5deg)', overflow: 'visible', filter: `drop-shadow(0 0 12px ${color})`}}>
      <ellipse cx={rx + 40} cy={ry + 40} rx={rx} ry={ry} fill="none" stroke={color} strokeWidth={9} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - ease(a))} />
    </svg>
  );
};

export const QMark: React.FC<{x: number; y: number; f: number; from: number; size?: number; rot?: number}> = ({x, y, f, from, size = 170, rot = 8}) => {
  const a = pop(f, from, 14);
  if (a <= 0.01) return null;
  return <div style={{position: 'absolute', width: 'max-content', left: x, top: y + Math.sin((f - from) / 9) * 8, transform: `translate(-50%,-50%) scale(${a}) rotate(${rot}deg)`, fontFamily: hand, fontWeight: 700, fontSize: size, color: '#fff', textShadow: '0 5px 14px rgba(0,0,0,.7)'}}>?</div>;
};

export const Reveal: React.FC<{f: number; children: React.ReactNode; dur?: number}> = ({f, children, dur = 14}) => {
  const u = ease(f / dur);
  if (u >= 1) return <>{children}</>;
  // diagonal wipe from left-bottom to right-top
  const e = u * 1.6 - 0.3;
  const p = `polygon(${(e - 0.3) * 100}% 0%, ${(e + 0.3) * 100}% 0%, ${(e - 0.3) * 100 - 30 + 60}% 100%, ${(e - 0.3) * 100 - 30}% 100%)`;
  const clip = `polygon(0% 0%, ${e * 100 + 30}% 0%, ${e * 100 - 30}% 100%, 0% 100%)`;
  void p;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, clipPath: clip}}>{children}</div>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <line x1={`${(e * 100 + 30) * 10.8}`} y1={0} x2={`${(e * 100 - 30) * 10.8}`} y2={1920} stroke="#fff" strokeWidth={9} style={{filter: 'drop-shadow(0 0 10px #fff)'}} />
      </svg>
    </>
  );
};

export const DotGrid: React.FC<{f: number; from: number; x: number; y: number; hl: number}> = ({f, from, x, y, hl}) => (
  <div style={{position: 'absolute', width: 'max-content', left: x, top: y, transform: 'translate(-50%,-50%)', display: 'grid', gridTemplateColumns: 'repeat(10, 34px)', gap: 12}}>
    {Array.from({length: 100}, (_, i) => {
      const a = pop(f, from + i * 0.5, 10);
      const on = i < hl;
      return <div key={i} style={{width: 34, height: 34, borderRadius: 17, transform: `scale(${a})`, background: on ? YEL : 'rgba(255,255,255,.55)', boxShadow: on ? '0 0 16px rgba(255,229,0,.95)' : 'none'}} />;
    })}
  </div>
);
export {interpolate};
