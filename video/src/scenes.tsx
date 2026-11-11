import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {A, Arrow, Blueprint, Card, Cut, Data, Hand, MapLayer, Orange, Pop, SANS, SERIF, Serif, TL, clamp, eio, eo, lerpCam, toScreen, useData, useScene, W, H} from './lib';
import {Cam3, EX, Terrain3D, orbit, project, worldPos} from './Terrain3D';
import {SEL} from './selection';

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const cut = (n: string) => A(`cutouts/${n}.png`);
const photo = (n: string) => A(`photos/${n}.jpg`);

const useT = () => {
  const d = useData();
  const t = d.manifest.terrain;
  const poi = (k: string) => t.poi[k];
  const wp = (k: string) => worldPos(t.poi[k]);
  return {t, poi, wp, mw: t.hm[0] as number, mh: t.hm[1] as number, scale: t.scale as number, asia: d.manifest.asia, d};
};
const asiaPx = (a: any, lon: number, lat: number): [number, number] => [((lon - a.bbox[0]) / (a.bbox[2] - a.bbox[0])) * a.w, ((a.bbox[3] - lat) / (a.bbox[3] - a.bbox[1])) * a.h];
const terPx = (p: any): [number, number] => [p.u * 3600, p.v * 4800];

const Sun: React.FC = () => (
  <AbsoluteFill style={{background: 'radial-gradient(circle at 88% 10%, rgba(255,236,190,0.55) 0%, rgba(255,236,190,0) 38%)', mixBlendMode: 'screen'}} />
);

// ============ 1. HOOK (3D dive onto the summit)
export const S1: React.FC = () => {
  const {f, D, p} = useScene();
  const T = useT();
  const s = T.wp('everest');
  const tg: [number, number, number] = [s[0], s[1] - 0.35, s[2]];
  const e = eio(p);
  const cam: Cam3 = {pos: orbit(tg, mix(205, 148, e), mix(52, 15, e), mix(18, 7.4, e)), target: tg, fov: 50};
  const sp = project(cam, s);
  return (
    <AbsoluteFill>
      <Terrain3D cam={cam} mw={T.mw} mh={T.mh} scale={T.scale} />
      <Sun />
      <Serif text="HIGHEST" x={W / 2} y={560} at={5} size={190} />
      <Serif text="POINT ON EARTH" x={W / 2} y={735} at={13} size={78} color="#ffd400" />
      {f > D * 0.62 && !sp.behind ? (
        <Pop at={Math.round(D * 0.62)} style={{left: sp.x, top: sp.y}}>
          <div style={{transform: 'translate(-50%,-110%)', background: '#f28c1c', border: '4px solid #fff', borderRadius: 8, color: '#fff', fontFamily: SANS, fontWeight: 800, fontSize: 38, padding: '6px 20px', whiteSpace: 'nowrap'}}>MOUNT EVEREST</div>
        </Pop>
      ) : null}
    </AbsoluteFill>
  );
};

// ============ 2. 8,849 m counter + altitude scan
export const S2: React.FC = () => {
  const {f, D, p} = useScene();
  const T = useT();
  const s = T.wp('everest');
  const tg: [number, number, number] = [s[0], s[1] - 0.8, s[2]];
  const cam: Cam3 = {pos: orbit(tg, mix(150, 232, eio(p)), mix(20, 27, p), mix(7.6, 9.8, p)), target: tg, fov: 48};
  const k = eo(interpolate(f, [8, D * 0.78], [0, 1], clamp));
  const alt = 8849 * k;
  const sp = project(cam, s);
  const px = Math.min(Math.max(sp.x, 230), 850), py = Math.min(Math.max(sp.y, 640), 1180);
  return (
    <AbsoluteFill>
      <Terrain3D cam={cam} scan={alt > 3800 ? (alt / 1000) * EX : -1} mw={T.mw} mh={T.mh} scale={T.scale} />
      <Sun />
      <div style={{position: 'absolute', top: 300, width: W, textAlign: 'center', fontFamily: SANS, fontWeight: 800, color: '#ffd400', fontSize: 170, textShadow: '0 8px 28px rgba(0,0,0,0.8)'}}>{Math.round(alt).toLocaleString('en-US')} m</div>
      <div style={{position: 'absolute', top: 500, width: W, textAlign: 'center', fontFamily: SANS, fontWeight: 700, color: '#fff', fontSize: 44, letterSpacing: 6, textShadow: '0 4px 14px rgba(0,0,0,0.8)'}}>ABOVE SEA LEVEL</div>
      {k > 0.97 ? <Orange text="SUMMIT" x={px} y={py - 70} at={Math.round(D * 0.8)} size={36} /> : null}
    </AbsoluteFill>
  );
};

// ============ 3. Himalayas / Nepal-China border (satellite + shaded relief, NASA Blue Marble)
export const S3: React.FC = () => {
  const {f, D, p} = useScene();
  const T = useT();
  const a = T.asia;
  const c0 = asiaPx(a, 79, 31), c1 = asiaPx(a, 84.3, 28.25);
  const cam = lerpCam({cx: c0[0], cy: c0[1], z: 0.5}, {cx: c1[0], cy: c1[1], z: 0.98}, eio(p));
  const countries = T.d.manifest.countries as Record<string, number[][][]>;
  const poly = (countries.Nepal || []).map((r) => r.map(([lo, la]) => toScreen(cam, ...asiaPx(a, lo, la)).join(',')).join(' '));
  const fillA = interpolate(f, [D * 0.2, D * 0.45], [0, 0.4], clamp);
  const ev = toScreen(cam, ...asiaPx(a, 86.925, 27.988));
  const npl = toScreen(cam, ...asiaPx(a, 83.9, 28.15));
  const chn = toScreen(cam, ...asiaPx(a, 85.0, 30.4));
  const ind = toScreen(cam, ...asiaPx(a, 82.2, 26.0));
  return (
    <AbsoluteFill>
      <MapLayer src={A('maps/asia.jpg')} w={a.w} h={a.h} cam={cam} />
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        {poly.map((pts, i) => <polygon key={i} points={pts} fill={`rgba(40,130,255,${fillA})`} stroke="#fff" strokeWidth={5} strokeLinejoin="round" style={{filter: 'drop-shadow(0 0 10px rgba(80,170,255,0.9))'}} />)}
      </svg>
      <Serif text="NEPAL" x={npl[0]} y={npl[1]} at={Math.round(D * 0.55)} size={84} />
      <Serif text="CHINA (TIBET)" x={chn[0]} y={chn[1]} at={Math.round(D * 0.68)} size={54} color="#ffe9a0" />
      <Serif text="INDIA" x={ind[0]} y={ind[1]} at={Math.round(D * 0.76)} size={54} color="#ffe9a0" />
      <Pop at={Math.round(D * 0.3)} style={{left: ev[0], top: ev[1]}}>
        <div style={{transform: 'translate(-50%,-50%)', fontSize: 74, color: '#ffd400', textShadow: '0 4px 14px #000', lineHeight: 1}}>★</div>
      </Pop>
      <Hand text="Mount Everest" x={Math.min(ev[0], 800)} y={Math.min(ev[1], 1100) + 70} at={Math.round(D * 0.34)} size={64} color="#ffd400" />
      {SEL.animals.map((n, i) => (
        <Cut key={n} src={cut(n)} x={[200, 540, 880][i]} y={430} w={250} h={250} at={Math.round(D * (0.4 + i * 0.1))} rot={[-6, 3, 6][i]} />
      ))}
    </AbsoluteFill>
  );
};

// ============ 4. The range stretches ~2,400 km
const PEAKS: [number, number][] = [[74.589, 35.238], [76.05, 34.0], [79.971, 30.376], [83.487, 28.698], [83.82, 28.596], [86.925, 27.988], [88.147, 27.703], [90.45, 28.05], [95.056, 29.63]];
export const S4: React.FC = () => {
  const {f, D, p} = useScene();
  const T = useT();
  const a = T.asia;
  const mid = asiaPx(a, 84.8, 31.6);
  const cam = lerpCam({cx: mid[0], cy: mid[1], z: 0.346}, {cx: mid[0], cy: mid[1], z: 0.36}, p);
  const pts = PEAKS.map(([lo, la]) => toScreen(cam, ...asiaPx(a, lo, la)));
  const d = 'M' + pts.map((q) => q.join(',')).join(' L');
  const prog = eo(interpolate(f, [D * 0.12, D * 0.75], [0, 1], clamp));
  const len = pts.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) : 0), 0);
  // position of the travelling dot
  let rem = len * prog, dot = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const sl = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (rem <= sl) { dot = [mix(pts[i - 1][0], pts[i][0], rem / sl), mix(pts[i - 1][1], pts[i][1], rem / sl)]; break; }
    rem -= sl; dot = pts[i];
  }
  const km = Math.round(2400 * prog);
  return (
    <AbsoluteFill>
      <MapLayer src={A('maps/asia.jpg')} w={a.w} h={a.h} cam={cam} />
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        <path d={d} fill="none" stroke="rgba(255,255,255,0.0)" strokeWidth={1} />
        <path d={d} fill="none" stroke="#ffd400" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - prog)} style={{filter: 'drop-shadow(0 0 14px rgba(255,200,0,1))'}} />
        <circle cx={dot[0]} cy={dot[1]} r={20} fill="#fff" style={{filter: 'drop-shadow(0 0 18px #ffd400)'}} />
      </svg>
      <Orange text="≈ 2,400 km" x={W / 2} y={560} at={Math.round(D * 0.1)} size={64} />
      <div style={{position: 'absolute', top: 640, width: W, textAlign: 'center', fontFamily: SANS, fontWeight: 800, fontSize: 120, color: '#ffd400', textShadow: '0 6px 20px rgba(0,0,0,0.85)'}}>{km.toLocaleString('en-US')} km</div>
      <Hand text="Nanga Parbat" x={250} y={1050} at={Math.round(D * 0.2)} size={58} />
      <Hand text="Namche Barwa" x={800} y={1150} at={Math.round(D * 0.72)} size={58} />
      <Cut src={cut(SEL.extra[0])} x={W / 2} y={1130} w={260} h={220} at={Math.round(D * 0.3)} rot={-3} />
    </AbsoluteFill>
  );
};

// ============ 5. Blueprint: India meets Eurasia 50 million years ago
export const S5: React.FC = () => {
  const {f, D, p} = useScene();
  const mv = eio(interpolate(f, [6, D * 0.7], [0, 1], clamp));
  const hit = interpolate(f, [D * 0.62, D * 0.95], [0, 1], {...clamp, easing: eo});
  const iy = mix(1330, 990, mv), ix = mix(250, 330, mv);
  return (
    <AbsoluteFill>
      <Blueprint />
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        <g style={{filter: 'drop-shadow(0 10px 14px rgba(0,0,0,0.45))'}}>
          <rect x={90} y={560} width={900} height={400} rx={14} fill="#eef3fa" />
          <polygon points={`${ix},${iy} ${ix + 520},${iy} ${ix + 460},${iy + 300} ${ix + 70},${iy + 300}`} fill="#f28c1c" stroke="#fff" strokeWidth={6} />
          {[0, 1, 2, 3, 4].map((i) => {
            const bx = 300 + i * 120, hh = hit * (110 + (i % 2) * 70);
            return <polygon key={i} points={`${bx - 70},960 ${bx},${960 - hh} ${bx + 70},960`} fill="#fff" stroke="#7aa3d6" strokeWidth={4} />;
          })}
        </g>
        <text x={540} y={700} textAnchor="middle" fontFamily={SANS} fontWeight={800} fontSize={54} fill="#1566c8">EURASIAN PLATE</text>
        <text x={ix + 262} y={iy + 190} textAnchor="middle" fontFamily={SANS} fontWeight={800} fontSize={44} fill="#fff">INDIAN PLATE</text>
      </svg>
      <Serif text="50 MILLION" x={W / 2} y={300} at={4} size={116} color="#ffd400" />
      <Serif text="YEARS AGO" x={W / 2} y={430} at={10} size={84} />
      <Hand text="India crashed into Eurasia" x={W / 2} y={1210} at={Math.round(D * 0.55)} size={72} />
    </AbsoluteFill>
  );
};

// ============ 6. Still growing: +4 mm / year
export const S6: React.FC = () => {
  const {f, D, p} = useScene();
  const T = useT();
  const s = T.wp('everest');
  const tg: [number, number, number] = [s[0], s[1] - 0.6, s[2]];
  const cam: Cam3 = {pos: orbit(tg, mix(232, 300, eio(p)), mix(22, 14, p), mix(9.5, 6.4, p)), target: tg, fov: 46};
  const sp = project(cam, s);
  const px = Math.min(Math.max(sp.x, 200), 880), py = Math.min(Math.max(sp.y, 700), 1200);
  const r = 46 + 14 * Math.sin(f / 5);
  return (
    <AbsoluteFill>
      <Terrain3D cam={cam} mw={T.mw} mh={T.mh} scale={T.scale} />
      <Sun />
      <Pop at={6} style={{left: 0, top: 290, width: W, textAlign: 'center', transform: undefined}}>
        <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 190, color: '#ffd400', textShadow: '0 8px 28px rgba(0,0,0,0.85)', textAlign: 'center'}}>+4 mm</div>
      </Pop>
      <div style={{position: 'absolute', top: 505, width: W, textAlign: 'center', fontFamily: SANS, fontWeight: 700, color: '#fff', fontSize: 52, letterSpacing: 8, textShadow: '0 4px 14px rgba(0,0,0,0.8)'}}>EVERY YEAR</div>
      {f > D * 0.3 ? (
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
          <circle cx={px} cy={py} r={r} fill="none" stroke="#ffd400" strokeWidth={7} style={{filter: 'drop-shadow(0 0 12px #ffd400)'}} />
        </svg>
      ) : null}
      <Hand text="still growing!" x={Math.min(Math.max(px, 330), 760)} y={py + 130} at={Math.round(D * 0.4)} size={84} color="#ffd400" />
    </AbsoluteFill>
  );
};

// ============ 7. May 29, 1953
export const S7: React.FC = () => {
  const {D, p} = useScene();
  const T = useT();
  const ev = terPx(T.poi('everest'));
  const cam = lerpCam({cx: 1800, cy: 2400, z: 0.42}, {cx: ev[0], cy: ev[1], z: 1.05}, eio(p));
  const s0 = toScreen(cam, ...ev);
  return (
    <AbsoluteFill>
      <MapLayer src={A('maps/terrain_color.jpg')} w={3600} h={4800} cam={cam} />
      <Serif text="MAY 29, 1953" x={W / 2} y={380} at={6} size={118} />
      <Card src={photo(SEL.cards7[0])} x={310} y={900} w={400} h={500} at={Math.round(D * 0.22)} rot={-8} from="left" />
      <Card src={photo(SEL.cards7[1])} x={760} y={860} w={400} h={500} at={Math.round(D * 0.38)} rot={7} from="bottom" />
      <Hand text="first confirmed ascent" x={W / 2} y={620} at={Math.round(D * 0.55)} size={76} color="#ffd400" />
      <Pop at={Math.round(D * 0.2)} style={{left: Math.min(Math.max(s0[0], 120), 960), top: Math.min(Math.max(s0[1], 1160), 1260)}}>
        <div style={{transform: 'translate(-50%,-50%)', fontSize: 60, color: '#ffd400', textShadow: '0 4px 14px #000'}}>▲</div>
      </Pop>
    </AbsoluteFill>
  );
};

// ============ 8. Base Camp
export const S8: React.FC = () => {
  const {D, p} = useScene();
  const T = useT();
  const ev = terPx(T.poi('everest')), eb = terPx(T.poi('ebc'));
  const cam = lerpCam({cx: ev[0], cy: ev[1], z: 0.7}, {cx: eb[0], cy: eb[1], z: 1.9}, eo(p));
  const s0 = toScreen(cam, ...eb);
  const pos: [number, number][] = [[210, 640], [880, 700], [220, 1130], [860, 1110]];
  return (
    <AbsoluteFill>
      <MapLayer src={A('maps/terrain_color.jpg')} w={3600} h={4800} cam={cam} />
      <Pop at={Math.round(D * 0.15)} style={{left: s0[0], top: s0[1]}}>
        <div style={{transform: 'translate(-50%,-50%)', width: 44, height: 44, borderRadius: 22, background: '#ff3b30', border: '6px solid #fff', boxShadow: '0 0 24px rgba(255,60,48,0.9)'}} />
      </Pop>
      <Orange text="EVEREST BASE CAMP · 5,364 m" x={W / 2} y={Math.max(s0[1] - 120, 420)} at={Math.round(D * 0.3)} size={38} />
      <Arrow x1={W / 2 + 120} y1={Math.max(s0[1] - 220, 340)} x2={s0[0] + 20} y2={s0[1] - 40} at={Math.round(D * 0.38)} />
      {SEL.base.map((n, i) => (
        <Cut key={n} src={cut(n)} x={pos[i][0]} y={pos[i][1]} w={260} h={260} at={Math.round(D * (0.42 + i * 0.09))} rot={[-5, 4, 6, -4][i]} />
      ))}
    </AbsoluteFill>
  );
};

// ============ 9. Khumbu Icefall
export const S9: React.FC = () => {
  const {D, p} = useScene();
  const T = useT();
  const ev = T.poi('everest'), eb = T.poi('ebc');
  // Khumbu Icefall: 27.9958N 86.8728E (Wikipedia), interpolated in image space between Everest and Base Camp
  const k = {u: mix(ev.u, eb.u, (86.8728 - 86.925) / (86.8528 - 86.925)), v: mix(ev.v, eb.v, (27.9958 - 27.9881) / (28.0026 - 27.9881))};
  const e0 = terPx(eb), i0 = terPx(k), s0 = terPx(ev);
  const cam = lerpCam({cx: e0[0], cy: e0[1], z: 1.7}, {cx: i0[0] + 40, cy: i0[1] - 20, z: 1.5}, eio(p));
  const a = toScreen(cam, ...e0), b = toScreen(cam, ...i0), c = toScreen(cam, ...s0);
  const prog = eo(interpolate(p, [0.1, 0.8], [0, 1], clamp));
  const pts = [a, b, c];
  const d = 'M' + pts.map((q) => q.join(',')).join(' L');
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) + Math.hypot(c[0] - b[0], c[1] - b[1]);
  return (
    <AbsoluteFill>
      <MapLayer src={A('maps/terrain_color.jpg')} w={3600} h={4800} cam={cam} />
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        <path d={d} fill="none" stroke="#fff" strokeWidth={10} strokeLinecap="round" strokeDasharray="6 26" strokeDashoffset={-len * (1 - prog) * 0} style={{filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.8))', opacity: prog}} />
        <circle cx={b[0]} cy={b[1]} r={26} fill="none" stroke="#5ad1ff" strokeWidth={8} style={{filter: 'drop-shadow(0 0 14px #5ad1ff)'}} />
      </svg>
      <Orange text="KHUMBU ICEFALL" x={Math.min(Math.max(b[0], 330), 750)} y={Math.min(Math.max(b[1] + 110, 640), 1200)} at={Math.round(D * 0.3)} size={42} />
      <Card src={photo(SEL.card9)} x={760} y={450} w={420} h={400} at={Math.round(D * 0.4)} rot={6} from="right" />
      <Cut src={cut(SEL.walker)} x={250} y={1080} w={260} h={300} at={Math.round(D * 0.55)} rot={-3} />
      <Hand text="a frozen river of moving ice" x={W / 2} y={1260} at={Math.round(D * 0.6)} size={66} color="#9fe8ff" />
    </AbsoluteFill>
  );
};

// ============ 10. The Death Zone (3D, red band above 8,000 m)
export const S10: React.FC = () => {
  const {f, D, p} = useScene();
  const T = useT();
  const s = T.wp('everest');
  const tg: [number, number, number] = [s[0], s[1] - 0.9, s[2]];
  const cam: Cam3 = {pos: orbit(tg, mix(300, 352, eio(p)), mix(10, 15, p), mix(6.6, 8.2, p)), target: tg, fov: 46};
  const amt = interpolate(f, [8, D * 0.5], [0, 1], clamp);
  const lad: [number, string, number][] = [[5364, 'BASE CAMP 5,364 m', 0.2], [8000, 'DEATH ZONE 8,000 m', 0.45], [8849, 'SUMMIT 8,849 m', 0.7]];
  return (
    <AbsoluteFill>
      <Terrain3D cam={cam} band={8 * EX} bandAmt={amt} mw={T.mw} mh={T.mh} scale={T.scale} />
      <Sun />
      <Serif text="DEATH ZONE" x={W / 2} y={380} at={6} size={130} color="#ff5a48" />
      <Serif text="ABOVE 8,000 m" x={W / 2} y={520} at={14} size={64} />
      {lad.map(([h, t, at], i) => {
        const q = project(cam, [s[0], (h / 1000) * EX, s[2]]);
        const x = Math.min(Math.max(q.x, 250), 830), y = Math.min(Math.max(q.y, 640), 1220);
        return <Orange key={h} text={t} x={x + (i % 2 ? 40 : -40)} y={y} at={Math.round(D * at)} size={32} />;
      })}
    </AbsoluteFill>
  );
};

// ============ 11. Blueprint: oxygen ~ 1/3
export const S11: React.FC = () => {
  const {f, D} = useScene();
  const g = eo(interpolate(f, [10, D * 0.7], [0, 1], clamp));
  return (
    <AbsoluteFill>
      <Blueprint />
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        <g style={{filter: 'drop-shadow(0 10px 14px rgba(0,0,0,0.45))'}}>
          <rect x={180} y={1180 - 520 * g} width={260} height={520 * g} rx={10} fill="#fff" />
          <rect x={640} y={1180 - 173 * g} width={260} height={173 * g} rx={10} fill="#f28c1c" stroke="#fff" strokeWidth={5} />
        </g>
        <line x1={120} y1={1182} x2={960} y2={1182} stroke="#fff" strokeWidth={6} />
        <text x={310} y={1250} textAnchor="middle" fontFamily={SANS} fontWeight={800} fontSize={38} fill="#fff">SEA LEVEL</text>
        <text x={770} y={1250} textAnchor="middle" fontFamily={SANS} fontWeight={800} fontSize={38} fill="#fff">SUMMIT</text>
        <text x={310} y={1180 - 520 * g - 24} textAnchor="middle" fontFamily={SANS} fontWeight={800} fontSize={74} fill="#ffd400">100%</text>
        <text x={770} y={1180 - 173 * g - 24} textAnchor="middle" fontFamily={SANS} fontWeight={800} fontSize={74} fill="#ffd400">≈ 33%</text>
      </svg>
      <Serif text="OXYGEN PRESSURE" x={W / 2} y={330} at={4} size={76} />
      <Serif text="≈ 1/3" x={W / 2} y={500} at={14} size={150} color="#ffd400" />
      <Hand text="of what you breathe at sea level" x={W / 2} y={650} at={Math.round(D * 0.5)} size={62} />
      <Cut src={cut(SEL.oxygen)} x={540} y={900} w={220} h={320} at={Math.round(D * 0.6)} rot={-4} glow="rgba(120,255,160,0.9)" />
    </AbsoluteFill>
  );
};

// ============ 12. Outro pull-back + credits (only licence-required attributions)
export const S12: React.FC<{credits: string[]}> = ({credits}) => {
  const {f, D, p} = useScene();
  const T = useT();
  const s = T.wp('everest');
  const tg: [number, number, number] = [s[0], s[1] - 1.2, s[2]];
  const cam: Cam3 = {pos: orbit(tg, mix(352, 440, eio(p)), mix(14, 58, eio(p)), mix(8.2, 30, eio(p))), target: tg, fov: 50};
  const cr = interpolate(f, [D * 0.58, D * 0.66], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Terrain3D cam={cam} mw={T.mw} mh={T.mh} scale={T.scale} />
      <Sun />
      <Serif text={'THE ROOF\nOF THE WORLD'} x={W / 2} y={480} at={8} size={124} />
      <div style={{position: 'absolute', left: 70, right: 70, top: 1130, opacity: cr, fontFamily: SANS, fontWeight: 600, fontSize: 22, color: 'rgba(255,255,255,0.92)', lineHeight: 1.35, textShadow: '0 2px 8px #000', textAlign: 'center'}}>
        {credits.map((c, i) => <div key={i}>{c}</div>)}
      </div>
    </AbsoluteFill>
  );
};
