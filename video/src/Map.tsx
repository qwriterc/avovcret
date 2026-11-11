import React, {createContext, useContext} from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import layersJson from './layers.json';
import {Cam, GEO, LayerDef, layerGeom, smooth, worldX, worldY} from './lib';

const LAYERS = layersJson as LayerDef[];
export const CamCtx = createContext<Cam>({lon: -110, lat: 38, z: 6, pitch: 0, bearing: 0});
export type Proj = (lon: number, lat: number) => {x: number; y: number};

/** An upright element standing on the (tilted) map at a geo position */
export const Billboard: React.FC<{x: number; y: number; children: React.ReactNode; lift?: number; scale?: number}> = ({x, y, children, lift = 0, scale = 1}) => {
  const cam = useContext(CamCtx);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformStyle: 'preserve-3d', transform: `translate3d(${x}px, ${y}px, ${lift}px) rotateZ(${-cam.bearing}deg) rotateX(${-cam.pitch}deg) scale(${scale})`}}>
      <div style={{position: 'absolute', left: 0, top: 0, transform: 'translate(-50%, -100%)', whiteSpace: 'nowrap'}}>{children}</div>
    </div>
  );
};

const catmull = (pts: {x: number; y: number}[]) => {
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`;
  }
  return d;
};

/** glowing animated river line, p = 0..1 draw progress, fade = 0..1 end-fade (dries up) */
export const RiverLine: React.FC<{proj: Proj; p: number; width?: number; dry?: number; color?: string}> = ({proj, p, width = 6, dry = 0, color = '#ffb347'}) => {
  const pts = GEO.river.map(([lo, la]) => proj(lo, la));
  const d = catmull(pts);
  let len = 0; const seg: number[] = [0];
  for (let i = 1; i < pts.length; i++) { len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(len); }
  const target = len * p; let hx = pts[0].x, hy = pts[0].y;
  for (let i = 1; i < pts.length; i++) if (target <= seg[i]) { const t = (target - seg[i - 1]) / (seg[i] - seg[i - 1] || 1); hx = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t; hy = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t; break; } else { hx = pts[i].x; hy = pts[i].y; }
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <defs>
        <linearGradient id="dryg" gradientUnits="userSpaceOnUse" x1={pts[pts.length - 8].x} y1={pts[pts.length - 8].y} x2={pts[pts.length - 1].x} y2={pts[pts.length - 1].y}>
          <stop offset="0" stopColor={color} /><stop offset="1" stopColor={color} stopOpacity={1 - dry} />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={width * 3} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} style={{filter: 'blur(6px)'}} />
      <path d={d} fill="none" stroke="#fff3d6" strokeWidth={width} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} style={{filter: `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 18px ${color})`, opacity: 1 - dry * 0.85}} />
      {p > 0.01 && p < 0.995 && <circle cx={hx} cy={hy} r={width * 1.9} fill="#fff" style={{filter: `drop-shadow(0 0 14px ${color}) drop-shadow(0 0 30px ${color})`}} />}
    </svg>
  );
};

export const MapView: React.FC<{cam: Cam; overlay?: (proj: Proj) => React.ReactNode; warm?: number; red?: number}> = ({cam, overlay, warm = 0, red = 0}) => {
  const proj: Proj = (lo, la) => ({x: 540 + worldX(lo, cam.z) - worldX(cam.lon, cam.z), y: 960 + worldY(la, cam.z) - worldY(cam.lat, cam.z)});
  return (
    <CamCtx.Provider value={cam}>
      <AbsoluteFill style={{background: '#12395c', overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, perspective: 1500, perspectiveOrigin: '50% 42%', filter: `saturate(${1.18 - red * 0.2}) contrast(1.08) brightness(${1.02 - red * 0.12}) sepia(${warm * 0.25})`}}>
          <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transformStyle: 'preserve-3d', transformOrigin: '50% 50%', transform: `rotateX(${cam.pitch}deg) rotateZ(${cam.bearing}deg)`}}>
            {LAYERS.map((L) => {
              const op = L.ramp ? smooth(L.ramp[0], L.ramp[1], cam.z) : 1;
              if (op <= 0.001) return null;
              const g = layerGeom(L);
              const s = 2 ** (cam.z - L.z);
              const cx = worldX(cam.lon, L.z) - g.x0 * 256, cy = worldY(cam.lat, L.z) - g.y0 * 256;
              return <Img key={L.id} src={staticFile(`maps/${L.id}.jpg`)} style={{position: 'absolute', left: 0, top: 0, width: g.w, height: g.h, maxWidth: 'none', opacity: op, transformOrigin: '0 0', transform: `translate(540px, 960px) scale(${s}) translate(${-cx}px, ${-cy}px)`}} />;
            })}
            {overlay ? overlay(proj) : null}
          </div>
        </div>
        {/* atmosphere haze toward the horizon when tilted */}
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(20,70,110,0.95) 0%, rgba(20,70,110,0.55) 10%, rgba(20,70,110,0) 30%)', opacity: Math.min(1, cam.pitch / 40)}} />
        <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,10,25,0.55) 100%)'}} />
        {red > 0 && <AbsoluteFill style={{background: `rgba(160,20,10,${red * 0.35})`, mixBlendMode: 'multiply'}} />}
      </AbsoluteFill>
    </CamCtx.Provider>
  );
};
