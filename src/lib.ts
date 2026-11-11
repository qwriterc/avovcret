import {Easing, interpolate, staticFile} from 'remotion';
import * as THREE from 'three';
import {loadFont as loadSerif} from '@remotion/google-fonts/PlayfairDisplay';
import {loadFont as loadHand} from '@remotion/google-fonts/Caveat';
import {loadFont as loadSans} from '@remotion/google-fonts/Inter';

export const serif = loadSerif('normal', {weights: ['700', '900'], subsets: ['latin']}).fontFamily;
export const hand = loadHand('normal', {weights: ['700'], subsets: ['latin']}).fontFamily;
export const sans = loadSans('normal', {weights: ['600', '800', '900'], subsets: ['latin']}).fontFamily;

export const W = 1080, H = 1920, FPS = 30, FOV = 38;
export const YEL = '#FFE500', ORG = '#E8710A';
export const L0 = -86, LAT0 = 5, LW = 12, LH = 7.5;
export const COS = Math.cos((9 * Math.PI) / 180);
export const MW = LW * COS, MH = LH;
export const g2w = (lon: number, lat: number): [number, number] => [(lon - L0) * COS, lat - LAT0];

export type Sent = {text: string; start: number; end: number};
export type Manifest = {cutouts: string[]; photos: string[]; emoji: string[]; credits: string[]};
export type Props = {sent: Sent[]; total: number; manifest: Manifest};

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const ease = (x: number) => Easing.inOut(Easing.cubic)(clamp01(x));
export const easeOut = (x: number) => Easing.out(Easing.cubic)(clamp01(x));
export const pop = (frame: number, delay = 0, dur = 14) => {
  const t = clamp01((frame - delay) / dur);
  return t <= 0 ? 0 : Easing.out(Easing.back(1.9))(t);
};
export const fadeIn = (frame: number, delay = 0, dur = 10) => clamp01((frame - delay) / dur);
export const asset = (p: string) => staticFile(p);

// ---------------- camera ----------------
export type Cam = {lon: number; lat: number; d: number; p: number; y: number};
type KF = {s: number; o: number} & Cam;
// s = sentence index, o = seconds offset from sentence start
export const KFS: KF[] = [
  {s: 0, o: 0, lon: -81.0, lat: 7.6, d: 3.0, p: 64, y: 22},
  {s: 1, o: 0, lon: -80.4, lat: 8.3, d: 3.1, p: 63, y: 10},
  {s: 2, o: 0, lon: -79.8, lat: 9.0, d: 2.3, p: 56, y: -6},
  {s: 3, o: 0, lon: -79.7, lat: 9.0, d: 2.0, p: 40, y: 0},
  {s: 4, o: 0, lon: -79.75, lat: 9.05, d: 2.5, p: 34, y: -14},
  {s: 4, o: 3.2, lon: -79.72, lat: 9.08, d: 1.7, p: 24, y: -4},
  {s: 7, o: 0, lon: -80.02, lat: 9.28, d: 1.6, p: 46, y: 32},
  {s: 7, o: 3.5, lon: -79.9, lat: 9.2, d: 1.15, p: 22, y: 12},
  {s: 8, o: 0, lon: -79.82, lat: 9.17, d: 1.2, p: 42, y: -22},
  {s: 8, o: 6, lon: -79.58, lat: 8.98, d: 0.85, p: 42, y: -32},
  {s: 11, o: 0, lon: -79.7, lat: 9.0, d: 3.5, p: 50, y: 0},
  {s: 12, o: 0, lon: -79.7, lat: 9.1, d: 2.7, p: 58, y: 16},
  {s: 13, o: 0, lon: -79.7, lat: 9.0, d: 2.7, p: 60, y: -16},
  {s: 13, o: 8, lon: -79.8, lat: 8.8, d: 6.4, p: 68, y: 6},
];
export function camAt(sent: Sent[], t: number): Cam {
  const pts = KFS.map((k) => ({...k, t: (sent[Math.min(k.s, sent.length - 1)]?.start ?? 0) + k.o})).sort((a, b) => a.t - b.t);
  if (t <= pts[0].t) return pts[0];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (t >= a.t && t <= b.t) {
      const u = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
      const e = ease(u);
      const L = (x: number, y: number) => x + (y - x) * e;
      return {lon: L(a.lon, b.lon), lat: L(a.lat, b.lat), d: L(a.d, b.d), p: L(a.p, b.p), y: L(a.y, b.y)};
    }
  }
  return pts[pts.length - 1];
}
export function buildCam(c: Cam): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(FOV, W / H, 0.01, 300);
  const [tx, ty] = g2w(c.lon, c.lat);
  const p = (c.p * Math.PI) / 180, y = (c.y * Math.PI) / 180;
  cam.up.set(0, 0, 1);
  cam.position.set(tx - Math.sin(y) * c.d * Math.sin(p), ty - Math.cos(y) * c.d * Math.sin(p), c.d * Math.cos(p));
  cam.lookAt(tx, ty, 0);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
}
export function proj(cam: THREE.PerspectiveCamera, lon: number, lat: number, z = 0) {
  const [x, y] = g2w(lon, lat);
  const v = new THREE.Vector3(x, y, z);
  const cv = v.clone().applyMatrix4(cam.matrixWorldInverse);
  const depth = -cv.z;
  v.project(cam);
  const k = H / (2 * Math.tan((FOV / 2) * (Math.PI / 180)) * Math.max(depth, 0.001));
  return {x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H, k, vis: depth > 0.05};
}

// ---------------- geography ----------------
export const CANAL: [number, number][] = [
  [-79.916, 9.384], [-79.918, 9.30], [-79.917, 9.272], [-79.89, 9.235], [-79.85, 9.20],
  [-79.80, 9.17], [-79.75, 9.13], [-79.705, 9.115], [-79.665, 9.06], [-79.625, 9.025],
  [-79.612, 9.012], [-79.592, 8.996], [-79.57, 8.955], [-79.545, 8.91], [-79.52, 8.86],
];
export const LAKE: [number, number][] = [
  [-79.94, 9.27], [-80.02, 9.30], [-80.10, 9.27], [-80.13, 9.20], [-80.06, 9.12], [-79.97, 9.08],
  [-79.88, 9.14], [-79.78, 9.10], [-79.72, 9.14], [-79.80, 9.20], [-79.86, 9.25], [-79.90, 9.31],
];
export const PLACES = {
  colon: [-79.916, 9.37] as [number, number],
  gatun: [-79.917, 9.272] as [number, number],
  lake: [-80.03, 9.2] as [number, number],
  culebra: [-79.665, 9.06] as [number, number],
  miraflores: [-79.592, 8.996] as [number, number],
  city: [-79.52, 8.98] as [number, number],
};

export function chunkAt(s: Sent, t: number, size = 3): string {
  const words = s.text.split(' ');
  const chunks: string[][] = [];
  for (let i = 0; i < words.length; i += size) chunks.push(words.slice(i, i + size));
  const lens = chunks.map((c) => c.join(' ').length + 3);
  const tot = lens.reduce((a, b) => a + b, 0);
  const u = clamp01((t - s.start) / Math.max(0.01, s.end - s.start)) * tot;
  let acc = 0;
  for (let i = 0; i < chunks.length; i++) {
    acc += lens[i];
    if (u <= acc) return chunks[i].join(' ');
  }
  return chunks[chunks.length - 1].join(' ');
}
export const interp = interpolate;
