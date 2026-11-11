import {createContext, useContext} from 'react';
import {useCurrentFrame} from 'remotion';
export const W = 1080, H = 1920, FPS = 30;
export type Sent = {text: string; start: number; end: number};
export const TimingCtx = createContext<{sents: Sent[]; abs0: number; dur: number}>({sents: [], abs0: 0, dur: 1});
export const useAbs = () => useCurrentFrame() + useContext(TimingCtx).abs0;
/** frame relative to start of sentence i (negative before it starts) */
export const useSent = (i: number) => {
  const c = useContext(TimingCtx);
  const a = useCurrentFrame() + c.abs0;
  const s = c.sents[Math.min(i, c.sents.length - 1)] ?? {start: 0, end: 90, text: ''};
  return {f: a - s.start, dur: s.end - s.start, start: s.start, end: s.end};
};
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = (t: number) => { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const worldX = (lon: number, z: number) => ((lon + 180) / 360) * 256 * 2 ** z;
export const worldY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2) * 256 * 2 ** z;
};
export type Cam = {lon: number; lat: number; z: number; pitch: number; bearing: number};
/** camera interpolation that keeps the zoom target anchored (natural zoom feel) */
export const camAt = (a: Cam, b: Cam, t: number): Cam => {
  t = clamp01(t);
  const e = ease(t);
  const z = lerp(a.z, b.z, e);
  const f = (zz0: number, zz1: number, zt: number) => (zz0 === zz1 ? e : (1 - 2 ** -(zt - zz0)) / (1 - 2 ** -(zz1 - zz0)));
  const u = b.z >= a.z ? f(a.z, b.z, z) : 1 - f(b.z, a.z, z);
  return {lon: lerp(a.lon, b.lon, u), lat: lerp(a.lat, b.lat, u), z, pitch: lerp(a.pitch, b.pitch, e), bearing: lerp(a.bearing, b.bearing, e)};
};
export type LayerDef = {id: string; layer: string; time: string; ext: string; matrix: string; z: number; lon0: number; lon1: number; lat0: number; lat1: number; ramp: number[] | null};
export const layerGeom = (L: LayerDef) => {
  const x0 = Math.floor(worldX(L.lon0, L.z) / 256), x1 = Math.floor(worldX(L.lon1, L.z) / 256);
  const y0 = Math.floor(worldY(L.lat1, L.z) / 256), y1 = Math.floor(worldY(L.lat0, L.z) / 256);
  return {x0, y0, x1, y1, w: (x1 - x0 + 1) * 256, h: (y1 - y0 + 1) * 256};
};
export const COLORS = {orange: '#f08a12', yellow: '#ffd21f', neon: '#ffb347', cyan: '#35e0ff', blue: '#0b4fb8'};
export const GEO = {
  hoover: [-114.7377, 36.0161] as [number, number],
  glen: [-111.4846, 36.937] as [number, number],
  river: [[-105.85, 40.47], [-106.4, 40.05], [-107.32, 39.55], [-108.55, 39.06], [-109.55, 38.57], [-109.95, 38.2], [-110.4, 37.6], [-111.1, 37.15], [-111.5, 36.93], [-111.6, 36.86], [-112.1, 36.1], [-113.0, 36.2], [-114.0, 36.1], [-114.74, 36.02], [-114.57, 35.2], [-114.45, 34.6], [-114.29, 34.15], [-114.5, 33.3], [-114.62, 32.73], [-114.8, 31.95], [-114.85, 31.75]] as [number, number][],
};
