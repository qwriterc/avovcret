import React from 'react';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {clamp01, ease, H, W} from './lib';

const STEP = 0.87;
const CX = [-2.5, 0, 2.5].map((x) => x); // chamber centres
const CW = 2.2;
// phases: approach, then [rise, move] x3, hold
const PH = [0.1, 0.14, 0.09, 0.14, 0.09, 0.14, 0.12];

export function lockState(p: number) {
  // returns ship x,y and fill levels
  const fills = [0, 0, 0];
  let x = -7.5, y = 0;
  let acc = 0;
  const seg = (i: number) => clamp01((p - acc) / PH[i]);
  // approach
  let u = seg(0); acc += PH[0];
  x = -7.5 + (CX[0] + 7.5) * ease(u); y = 0;
  if (p < acc) return {x, y, fills};
  for (let k = 0; k < 3; k++) {
    const ur = seg(1 + k * 2); acc += PH[1 + k * 2];
    fills[k] = ease(ur);
    y = k * STEP + STEP * ease(ur);
    x = CX[k];
    if (p < acc) return {x, y, fills};
    const um = seg(2 + k * 2); acc += PH[2 + k * 2];
    const tx = k < 2 ? CX[k + 1] : 6.8;
    x = CX[k] + (tx - CX[k]) * ease(um);
    y = (k + 1) * STEP;
    if (p < acc) return {x, y, fills};
  }
  return {x: 6.8, y: 3 * STEP, fills};
}

const Concrete: React.FC<{x: number; y: number; w: number; h: number}> = ({x, y, w, h}) => (
  <mesh position={[x, y + h / 2, 0]}>
    <boxGeometry args={[w, h, 1.6]} />
    <meshStandardMaterial color="#cfd6de" roughness={0.8} />
  </mesh>
);
const Water: React.FC<{x: number; y0: number; y1: number; w: number}> = ({x, y0, y1, w}) => {
  const h = Math.max(0.001, y1 - y0);
  return (
    <mesh position={[x, y0 + h / 2, 0.02]}>
      <boxGeometry args={[w, h, 1.5]} />
      <meshStandardMaterial color="#25a9ff" transparent opacity={0.85} emissive="#0a5bb5" emissiveIntensity={0.6} />
    </mesh>
  );
};

const ShipM: React.FC = () => (
  <group scale={[0.62, 0.62, 0.62]}>
    <mesh position={[0, 0.22, 0]}><boxGeometry args={[2.6, 0.5, 0.9]} /><meshStandardMaterial color="#1b1f2a" /></mesh>
    <mesh position={[1.5, 0.22, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.45, 0.6, 4]} /><meshStandardMaterial color="#1b1f2a" /></mesh>
    {Array.from({length: 18}, (_, i) => (
      <mesh key={i} position={[-0.95 + (i % 6) * 0.36, 0.62 + ((i / 6) | 0) * 0.3, ((i * 7) % 3 - 1) * 0.28]}>
        <boxGeometry args={[0.33, 0.27, 0.27]} />
        <meshStandardMaterial color={['#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#ecf0f1', '#9b59b6'][(i * 5) % 6]} />
      </mesh>
    ))}
    <mesh position={[-1.15, 0.9, 0]}><boxGeometry args={[0.45, 0.8, 0.6]} /><meshStandardMaterial color="#f5f5f5" /></mesh>
    <mesh position={[-1.15, 1.18, 0]}><boxGeometry args={[0.5, 0.18, 0.66]} /><meshStandardMaterial color="#222" /></mesh>
  </group>
);


const Scene: React.FC<{p: number; frame: number}> = ({p, frame}) => {
  const st = lockState(p);
  const lvl = (k: number) => k * STEP + STEP * st.fills[k];
  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[3, 6, 6]} intensity={2.2} />
      {/* rock base */}
      <mesh position={[0, -1.2, -0.2]}><boxGeometry args={[19, 1.4, 2.0]} /><meshStandardMaterial color="#3b4a3a" roughness={1} /></mesh>
      {/* sea */}
      <Water x={-6.9} y0={-0.5} y1={0} w={4.4} />
      {/* chambers */}
      {[0, 1, 2].map((k) => (
        <React.Fragment key={k}>
          <Concrete x={CX[k] - CW / 2 - 0.1} y={-0.5 + k * STEP} w={0.2} h={1.0 + STEP * 0.0 + (k + 1) * STEP * 0.0 + STEP} />
          <Water x={CX[k]} y0={-0.5 + k * STEP} y1={lvl(k)} w={CW} />
        </React.Fragment>
      ))}
      <Concrete x={CX[2] + CW / 2 + 0.1} y={-0.5 + 3 * STEP - STEP * 0.0} w={0.2} h={STEP + 0.5} />
      {/* lake */}
      <Water x={7.0} y0={-0.5 + 3 * STEP} y1={3 * STEP} w={4.4} />
      <mesh position={[7.0, 3 * STEP - 1.1, -0.2]}><boxGeometry args={[4.4, 2.4, 2.0]} /><meshStandardMaterial color="#3b4a3a" roughness={1} /></mesh>
      {/* ship */}
      <group position={[st.x, st.y - 0.02, 0.05]}><ShipM /></group>
    </>
  );
};

import {useThree} from '@react-three/fiber';
const CamLook: React.FC<{a: number; zoom: number; fx: number}> = ({a, zoom, fx}) => {
  const {camera} = useThree();
  const d = 22 / zoom;
  camera.position.set(fx + Math.sin(a) * d, 2.4, Math.cos(a) * d);
  camera.lookAt(fx, 1.3, 0);
  camera.updateMatrixWorld();
  return null;
};

export const LockLayer: React.FC<{p: number; frame: number; zoom?: number}> = ({p, frame, zoom = 1}) => {
  const a = Math.sin(frame / 38) * 0.2;
  const st = lockState(p);
  const fx = Math.max(-3, Math.min(5, st.x * 0.8));
  return (
    <ThreeCanvas width={W} height={H} camera={{fov: 30, position: [0, 2.4, 22], near: 0.1, far: 100}}>
      <CamLook a={a} zoom={zoom} fx={fx} />
      <Scene p={p} frame={frame} />
    </ThreeCanvas>
  );
};
