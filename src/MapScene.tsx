import React, {useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useLoader, useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {asset, buildCam, Cam, CANAL, FOV, g2w, H, LAKE, MH, MW, W, YEL} from './lib';

const curve = new THREE.CatmullRomCurve3(CANAL.map(([lo, la]) => {
  const [x, y] = g2w(lo, la);
  return new THREE.Vector3(x, y, 0.004);
}));

const Rig: React.FC<{cam: Cam}> = ({cam}) => {
  const {camera} = useThree();
  const c = buildCam(cam);
  camera.up.copy(c.up);
  camera.position.copy(c.position);
  camera.quaternion.copy(c.quaternion);
  (camera as THREE.PerspectiveCamera).fov = FOV;
  (camera as THREE.PerspectiveCamera).aspect = W / H;
  (camera as THREE.PerspectiveCamera).far = 300;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return null;
};

const MapPlane: React.FC<{tint?: number}> = ({tint = 1}) => {
  const tex = useLoader(THREE.TextureLoader, asset('map/panama.jpg'));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return (
    <mesh position={[MW / 2, MH / 2, 0]}>
      <planeGeometry args={[MW, MH]} />
      <meshBasicMaterial map={tex} color={new THREE.Color(tint * 1.08, tint * 1.08, tint * 1.1)} toneMapped={false} />
    </mesh>
  );
};

export const CanalPath: React.FC<{draw: number; d: number; color?: string}> = ({draw, d, color = YEL}) => {
  const r = Math.max(0.0035, d * 0.0042);
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 160, r, 8, false), [r]);
  const glow = useMemo(() => new THREE.TubeGeometry(curve, 160, r * 3.2, 8, false), [r]);
  const n = Math.floor(geo.index!.count * Math.min(1, Math.max(0, draw)) / 6) * 6;
  geo.setDrawRange(0, n);
  glow.setDrawRange(0, n);
  return (
    <group position={[0, 0, r]}>
      <mesh geometry={glow}><meshBasicMaterial color={color} transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
      <mesh geometry={geo}><meshBasicMaterial color={color} toneMapped={false} /></mesh>
    </group>
  );
};

export const LakePoly: React.FC<{opacity: number}> = ({opacity}) => {
  const {shape, line} = useMemo(() => {
    const pts = LAKE.map(([lo, la]) => new THREE.Vector2(...g2w(lo, la)));
    const s = new THREE.Shape(pts);
    const l = new THREE.BufferGeometry().setFromPoints([...pts, pts[0]].map((p) => new THREE.Vector3(p.x, p.y, 0.006)));
    return {shape: new THREE.ShapeGeometry(s), line: l};
  }, []);
  return (
    <group>
      <mesh geometry={shape} position={[0, 0, 0.005]}>
        <meshBasicMaterial color="#2aa6ff" transparent opacity={0.5 * opacity} depthWrite={false} />
      </mesh>
      <line>
        <primitive object={line} attach="geometry" />
        <lineBasicMaterial color="#bfe8ff" transparent opacity={opacity} />
      </line>
    </group>
  );
};

const COLORS = ['#c0392b', '#2980b9', '#e67e22', '#27ae60', '#f1c40f', '#8e44ad'];
export const Ship3D: React.FC<{u: number; s: number; seed?: number}> = ({u, s, seed = 0}) => {
  const uu = Math.min(0.999, Math.max(0.001, u));
  const p = curve.getPointAt(uu);
  const t = curve.getTangentAt(uu);
  const ang = Math.atan2(t.y, t.x);
  const boxes = useMemo(() => Array.from({length: 14}, (_, i) => ({i, c: COLORS[(i * 3 + seed) % COLORS.length]})), [seed]);
  return (
    <group position={[p.x, p.y, s * 0.2]} rotation={[0, 0, ang]} scale={[s, s, s]}>
      <mesh position={[0, 0, 0]}><boxGeometry args={[2.2, 0.55, 0.3]} /><meshStandardMaterial color="#1b1f2a" /></mesh>
      <mesh position={[1.25, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.28, 0.5, 4]} /><meshStandardMaterial color="#1b1f2a" /></mesh>
      {boxes.map((b) => (
        <mesh key={b.i} position={[-0.8 + (b.i % 7) * 0.22, ((b.i / 7) | 0) * 0.2 - 0.1, 0.27 + (((b.i * 5) % 3) * 0.1)]}>
          <boxGeometry args={[0.2, 0.17, 0.2]} /><meshStandardMaterial color={b.c} />
        </mesh>
      ))}
      <mesh position={[-1.0, 0, 0.55]}><boxGeometry args={[0.3, 0.4, 0.45]} /><meshStandardMaterial color="#f3f3f3" /></mesh>
      <mesh position={[0, 0, -0.02]} scale={[1.9, 1.8, 1]}>
        <planeGeometry args={[1.6, 0.6]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  );
};

export const MapLayer: React.FC<{cam: Cam; children?: React.ReactNode}> = ({cam, children}) => (
  <ThreeCanvas width={W} height={H} camera={{fov: FOV, position: [0, 0, 5], near: 0.01, far: 300}} gl={{antialias: true}}>
    <color attach="background" args={['#06204a']} />
    <Rig cam={cam} />
    <ambientLight intensity={1.15} />
    <directionalLight position={[3, -2, 6]} intensity={1.4} />
    <MapPlane />
    {children}
  </ThreeCanvas>
);
