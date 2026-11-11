import React, {useMemo} from 'react';
import * as THREE from 'three';
import {ThreeCanvas} from '@remotion/three';
import {useCurrentFrame} from 'remotion';
import {clamp01} from './lib';

const Lights: React.FC = () => (
  <>
    <ambientLight intensity={0.75} />
    <directionalLight position={[6, 12, 8]} intensity={2.6} color="#ffe2b8" />
    <directionalLight position={[-8, 5, -6]} intensity={1.3} color="#5fd4ff" />
    <pointLight position={[0, 6, 6]} intensity={30} color="#ffd9a0" distance={30} />
  </>
);

const Edges: React.FC<{geo: THREE.BufferGeometry; color?: string; opacity?: number}> = ({geo, color = '#ffe1b0', opacity = 0.55}) => {
  const e = useMemo(() => new THREE.EdgesGeometry(geo, 25), [geo]);
  return <lineSegments geometry={e}><lineBasicMaterial color={color} transparent opacity={opacity} /></lineSegments>;
};

/* ---------- Hoover Dam arch-gravity diorama ---------- */
const DamModel: React.FC<{appear: number; level: number}> = ({appear, level}) => {
  const R = 6, a = 0.62, H = 5.2;
  const damGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.absarc(0, 0, R, -Math.PI / 2 - a, -Math.PI / 2 + a, false);
    s.absarc(0, 0, R - 0.55, -Math.PI / 2 + a, -Math.PI / 2 - a, true);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {depth: H, bevelEnabled: false, curveSegments: 48});
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const roadGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.absarc(0, 0, R + 0.12, -Math.PI / 2 - a, -Math.PI / 2 + a, false);
    s.absarc(0, 0, R - 0.7, -Math.PI / 2 + a, -Math.PI / 2 - a, true);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {depth: 0.14, bevelEnabled: false, curveSegments: 48});
    g.rotateX(-Math.PI / 2);
    g.translate(0, H, 0);
    return g;
  }, []);
  const towers = [[-2.45, 1.3], [-1.55, 1.8], [1.55, 1.8], [2.45, 1.3]];
  const waterH = 0.4 + level * (H - 0.5);
  return (
    <group position={[0, -1.8, -R + 1]} scale={appear}>
      {/* floating terrain block */}
      <mesh position={[0, -0.6, R - 1 + 3]} receiveShadow>
        <boxGeometry args={[13, 1.2, 17]} />
        <meshStandardMaterial color="#8a4b25" roughness={0.9} />
      </mesh>
      {/* canyon walls */}
      <mesh position={[-5.4, 2.2, R - 1 - 0.3]} rotation={[0, 0, 0.18]}>
        <boxGeometry args={[4.6, 6.4, 8]} />
        <meshStandardMaterial color="#c4693a" roughness={0.95} />
      </mesh>
      <mesh position={[5.4, 2.2, R - 1 - 0.3]} rotation={[0, 0, -0.18]}>
        <boxGeometry args={[4.6, 6.4, 8]} />
        <meshStandardMaterial color="#b85d33" roughness={0.95} />
      </mesh>
      <mesh position={[-5.9, 3.3, R + 5]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[3.4, 6.6, 6]} />
        <meshStandardMaterial color="#cf7442" roughness={0.95} />
      </mesh>
      <mesh position={[5.9, 3.0, R + 5]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[3.4, 6.0, 6]} />
        <meshStandardMaterial color="#c0663a" roughness={0.95} />
      </mesh>
      {/* lake behind the dam (+z), river below */}
      <mesh position={[0, waterH / 2, R - 1 + 5.6]}>
        <boxGeometry args={[8.2, waterH, 10.6]} />
        <meshStandardMaterial color="#15a6e0" emissive="#0a5f9a" emissiveIntensity={0.7} transparent opacity={0.9} roughness={0.2} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.25, -2.8]}>
        <boxGeometry args={[3.2, 0.5, 7]} />
        <meshStandardMaterial color="#1f9bd0" emissive="#0a5f9a" emissiveIntensity={0.6} roughness={0.3} />
      </mesh>
      {/* the dam */}
      <mesh geometry={damGeo}><meshStandardMaterial color="#e9e2d2" roughness={0.65} /></mesh>
      <Edges geo={damGeo} />
      <mesh geometry={roadGeo}><meshStandardMaterial color="#6b6b70" roughness={0.8} /></mesh>
      {towers.map(([x, z], i) => (
        <group key={i} position={[x, 0, R - 0.1 - Math.abs(x) * 0 + z - 1.3]}>
          <mesh position={[0, 3.1, 0]}><cylinderGeometry args={[0.38, 0.42, 6.2, 20]} /><meshStandardMaterial color="#efe7d6" roughness={0.6} /></mesh>
          <mesh position={[0, 6.35, 0]}><cylinderGeometry args={[0.5, 0.38, 0.4, 20]} /><meshStandardMaterial color="#d8cdb7" /></mesh>
          <mesh position={[0, 6.75, 0]}><coneGeometry args={[0.46, 0.45, 20]} /><meshStandardMaterial color="#c9b79a" /></mesh>
        </group>
      ))}
    </group>
  );
};

export const DamCanvas: React.FC<{width: number; height: number; angle: number; appear: number; level?: number}> = ({width, height, angle, appear, level = 0.9}) => {
  const r = 44;
  return (
    <ThreeCanvas width={width} height={height} camera={{position: [Math.sin(angle) * r, 21, Math.cos(angle) * r], fov: 38, near: 1, far: 200}} onCreated={({camera}) => camera.lookAt(0, 0.4, 3)} style={{position: 'absolute', left: 0, top: 0}}>
      <Lights />
      <DamModel appear={Math.max(0.001, appear)} level={level} />
    </ThreeCanvas>
  );
};

/* ---------- 3D water share bars (orthographic, 1 unit = 1 px) ---------- */
export const BAR_ROT = {x: 0.5, y: -0.42};
export const SC = 1.45;
export const barScreen = (x: number, y: number, z: number, wob: number) => {
  const ry = BAR_ROT.y + wob, rx = BAR_ROT.x;
  const x1 = x * Math.cos(ry) + z * Math.sin(ry), z1 = -x * Math.sin(ry) + z * Math.cos(ry);
  return {x: x1 * SC, y: (y * Math.cos(rx) - z1 * Math.sin(rx)) * SC};
};
export const BarsCanvas: React.FC<{width: number; height: number; heights: number[]; colors: string[]; xs: number[]; wob: number}> = ({width, height, heights, colors, xs, wob}) => (
  <ThreeCanvas orthographic width={width} height={height} camera={{zoom: 1, position: [0, 0, 1000], near: 1, far: 3000}} style={{position: 'absolute', left: 0, top: 0}}>
    <Lights />
    <group scale={[SC, SC, SC]} rotation={[BAR_ROT.x, BAR_ROT.y + wob, 0]}>
      <mesh position={[0, -8, 0]}><boxGeometry args={[Math.max(...xs) * 2 + 260, 16, 230]} /><meshStandardMaterial color="#9fd0ff" transparent opacity={0.28} /></mesh>
      {heights.map((h, i) => {
        const g = new THREE.BoxGeometry(120, Math.max(0.01, h), 120);
        return (
          <group key={i} position={[xs[i], Math.max(0.01, h) / 2, 0]}>
            <mesh geometry={g}><meshStandardMaterial color={colors[i]} roughness={0.35} metalness={0.15} emissive={colors[i]} emissiveIntensity={0.18} /></mesh>
            <Edges geo={g} color="#ffffff" opacity={0.8} />
          </group>
        );
      })}
    </group>
  </ThreeCanvas>
);

/* ---------- Lake Mead gauge: canyon cross-section ---------- */
const wAt = (y: number) => 1.2 + ((y + 1.5) * (3.3 - 1.2)) / 7.5;
const GaugeModel: React.FC<{level: number}> = ({level}) => {
  const FULL = 4.6;
  const y = -1.5 + level * (FULL + 1.5);
  const rock = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-8, 6.2); s.lineTo(-8, -3); s.lineTo(8, -3); s.lineTo(8, 6.2); s.lineTo(wAt(6.2), 6.2); s.lineTo(wAt(-1.5), -1.5); s.lineTo(-wAt(-1.5), -1.5); s.lineTo(-wAt(6.2), 6.2); s.closePath();
    return new THREE.ExtrudeGeometry(s, {depth: 6, bevelEnabled: false});
  }, []);
  const water = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-wAt(-1.5), -1.5); s.lineTo(wAt(-1.5), -1.5); s.lineTo(wAt(y), y); s.lineTo(-wAt(y), y); s.closePath();
    return new THREE.ExtrudeGeometry(s, {depth: 5.9, bevelEnabled: false});
  }, [y]);
  const ring = useMemo(() => {
    const mk = (sgn: number) => { const s = new THREE.Shape(); s.moveTo(sgn * wAt(y), y); s.lineTo(sgn * wAt(FULL), FULL); s.lineTo(sgn * (wAt(FULL) + 0.01), FULL); s.lineTo(sgn * (wAt(y) + 0.01), y); s.closePath(); return s; };
    const g1 = new THREE.ExtrudeGeometry(mk(1), {depth: 6.04, bevelEnabled: false});
    const g2 = new THREE.ExtrudeGeometry(mk(-1), {depth: 6.04, bevelEnabled: false});
    return [g1, g2];
  }, [y]);
  return (
    <group position={[0, -0.8, -3]}>
      <mesh geometry={rock}><meshStandardMaterial color="#c4693a" roughness={0.95} /></mesh>
      {ring.map((g, i) => <mesh key={i} geometry={g} position={[0, 0, -0.02]}><meshStandardMaterial color="#f6f1e6" roughness={0.9} emissive="#fff8e8" emissiveIntensity={0.35} /></mesh>)}
      <mesh geometry={water} position={[0, 0, 0.05]}><meshStandardMaterial color="#14a8e6" emissive="#0a6aa8" emissiveIntensity={0.8} roughness={0.2} metalness={0.3} /></mesh>
    </group>
  );
};
export const GaugeCanvas: React.FC<{width: number; height: number; level: number; sway: number}> = ({width, height, level, sway}) => (
  <ThreeCanvas width={width} height={height} camera={{position: [Math.sin(sway) * 8, 7, 46], fov: 40, near: 1, far: 200}} onCreated={({camera}) => camera.lookAt(0, 1.6, 0)} style={{position: 'absolute', left: 0, top: 0}}>
    <Lights />
    <GaugeModel level={level} />
  </ThreeCanvas>
);

/* ---------- Water tank ---------- */
const TankModel: React.FC<{level: number; spin: number}> = ({level, spin}) => {
  const f = useCurrentFrame();
  const bubbles = useMemo(() => Array.from({length: 18}, (_, i) => ({a: i * 2.4, r: 0.4 + ((i * 37) % 10) / 10 * 1.5, sp: 0.02 + ((i * 13) % 7) / 400, s: 0.07 + ((i * 11) % 5) / 60})), []);
  const Ht = 5.2;
  return (
    <group rotation={[0.28, spin, 0]}>
      <mesh position={[0, Ht / 2, 0]}><cylinderGeometry args={[2.5, 2.5, Ht, 48, 1, true]} /><meshStandardMaterial color="#cfeaff" transparent opacity={0.16} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, (Ht * level) / 2, 0]}><cylinderGeometry args={[2.42, 2.42, Math.max(0.01, Ht * level), 48]} /><meshStandardMaterial color="#17aee8" emissive="#0a6aa8" emissiveIntensity={0.9} roughness={0.15} metalness={0.25} transparent opacity={0.92} /></mesh>
      {[0, Ht].map((y, i) => <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[2.52, 0.07, 12, 64]} /><meshStandardMaterial color="#ffd9a0" emissive="#ffb347" emissiveIntensity={1.2} /></mesh>)}
      {bubbles.map((b, i) => {
        const yy = ((f * b.sp * 20 + i * 0.7) % 1) * Ht * level;
        return <mesh key={i} position={[Math.cos(b.a + f * 0.02) * b.r, yy, Math.sin(b.a + f * 0.02) * b.r]}><sphereGeometry args={[b.s, 12, 12]} /><meshStandardMaterial color="#e8fbff" emissive="#9be8ff" emissiveIntensity={0.8} /></mesh>;
      })}
      <mesh position={[0, -0.15, 0]}><cylinderGeometry args={[3.1, 3.3, 0.3, 48]} /><meshStandardMaterial color="#2b3a55" metalness={0.5} roughness={0.4} /></mesh>
    </group>
  );
};
export const TankCanvas: React.FC<{width: number; height: number; level: number; spin: number}> = ({width, height, level, spin}) => (
  <ThreeCanvas width={width} height={height} camera={{position: [0, 8, 24], fov: 38, near: 1, far: 100}} onCreated={({camera}) => camera.lookAt(0, 2.2, 0)} style={{position: 'absolute', left: 0, top: 0}}>
    <Lights />
    <TankModel level={clamp01(level)} spin={spin} />
  </ThreeCanvas>
);
