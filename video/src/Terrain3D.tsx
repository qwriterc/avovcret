import React, {useEffect, useLayoutEffect, useMemo, useState} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, continueRender, delayRender} from 'remotion';
import {A, H, W} from './lib';

export const EX = 1.5; // vertical exaggeration
export const CWK = 25; // km
export const CHK = 33.333;

export type Cam3 = {pos: [number, number, number]; target: [number, number, number]; fov: number};

export const orbit = (t: [number, number, number], azDeg: number, elDeg: number, dist: number): [number, number, number] => {
  const az = (azDeg * Math.PI) / 180, el = (elDeg * Math.PI) / 180;
  return [t[0] + dist * Math.cos(el) * Math.sin(az), t[1] + dist * Math.sin(el), t[2] + dist * Math.cos(el) * Math.cos(az)];
};

export const worldPos = (poi: {u: number; v: number; elev: number}): [number, number, number] => [(poi.u - 0.5) * CWK, (poi.elev / 1000) * EX, (poi.v - 0.5) * CHK];

export const project = (c: Cam3, p: [number, number, number]) => {
  const cam = new THREE.PerspectiveCamera(c.fov, W / H, 0.05, 400);
  cam.position.set(...c.pos);
  cam.lookAt(...c.target);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  const v = new THREE.Vector3(...p).project(cam);
  return {x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, behind: v.z > 1};
};

const Rig: React.FC<{cam: Cam3}> = ({cam}) => {
  const {camera} = useThree();
  useLayoutEffect(() => {
    const c = camera as THREE.PerspectiveCamera;
    c.fov = cam.fov;
    c.near = 0.05;
    c.far = 400;
    c.position.set(...cam.pos);
    c.lookAt(...cam.target);
    c.updateProjectionMatrix();
  });
  return null;
};

const VS = `varying vec2 vUv; varying float vH; varying float vDist;
void main(){ vUv=uv; vH=position.y; vec4 wp=modelMatrix*vec4(position,1.0); vDist=distance(cameraPosition,wp.xyz); gl_Position=projectionMatrix*viewMatrix*wp; }`;
const FS = `uniform sampler2D map; uniform float uScan; uniform float uBand; uniform float uBandAmt; uniform vec3 uFog;
varying vec2 vUv; varying float vH; varying float vDist;
void main(){
  vec3 c = texture2D(map, vUv).rgb;
  c = pow(c, vec3(0.92)) * 1.08;
  float band = smoothstep(uBand-0.25, uBand+0.05, vH) * uBandAmt;
  c = mix(c, vec3(1.0,0.16,0.08), band*0.6);
  float sc = exp(-pow((vH-uScan)/0.05, 2.0));
  c += vec3(0.25,0.95,1.0) * sc * 1.6 * step(0.0, uScan);
  float fog = 1.0 - exp(-vDist*0.018);
  float e = smoothstep(0.0,0.05,vUv.x)*smoothstep(0.0,0.05,1.0-vUv.x)*smoothstep(0.0,0.05,vUv.y)*smoothstep(0.0,0.05,1.0-vUv.y);
  gl_FragColor = vec4(mix(c, uFog, fog*0.55), e);
}`;

const Mesh: React.FC<{scan: number; band: number; bandAmt: number; mw: number; mh: number; scale: number}> = ({scan, band, bandAmt, mw, mh, scale}) => {
  const [hd, setHd] = useState<Float32Array | null>(null);
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const h1 = delayRender('height');
    const im = new Image();
    im.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height;
      const cx = cv.getContext('2d')!;
      cx.drawImage(im, 0, 0);
      const d = cx.getImageData(0, 0, im.width, im.height).data;
      const out = new Float32Array(im.width * im.height);
      for (let i = 0; i < out.length; i++) out[i] = (d[i * 4] * 256 + d[i * 4 + 1]) / scale;
      setHd(out);
      continueRender(h1);
    };
    im.src = A('maps/terrain_height.png');
    const h2 = delayRender('tex');
    new THREE.TextureLoader().load(A('maps/terrain_color.jpg'), (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      setTex(t);
      continueRender(h2);
    });
  }, []);
  const geo = useMemo(() => {
    if (!hd) return null;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(mw * mh * 3), uv = new Float32Array(mw * mh * 2);
    for (let j = 0; j < mh; j++) for (let i = 0; i < mw; i++) {
      const k = j * mw + i;
      pos[k * 3] = (i / (mw - 1) - 0.5) * CWK;
      pos[k * 3 + 1] = (hd[k] / 1000) * EX;
      pos[k * 3 + 2] = (j / (mh - 1) - 0.5) * CHK;
      uv[k * 2] = i / (mw - 1);
      uv[k * 2 + 1] = 1 - j / (mh - 1);
    }
    const idx = new Uint32Array((mw - 1) * (mh - 1) * 6);
    let n = 0;
    for (let j = 0; j < mh - 1; j++) for (let i = 0; i < mw - 1; i++) {
      const a = j * mw + i, b = a + 1, c = a + mw, d = c + 1;
      idx[n++] = a; idx[n++] = c; idx[n++] = b; idx[n++] = b; idx[n++] = c; idx[n++] = d;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    return g;
  }, [hd]);
  const mat = useMemo(() => {
    if (!tex) return null;
    return new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, transparent: true,
      uniforms: {map: {value: tex}, uScan: {value: -1}, uBand: {value: 8 * EX}, uBandAmt: {value: 0}, uFog: {value: new THREE.Color(0.62, 0.74, 0.88)}},
    });
  }, [tex]);
  if (mat) {
    mat.uniforms.uScan.value = scan;
    mat.uniforms.uBand.value = band;
    mat.uniforms.uBandAmt.value = bandAmt;
  }
  if (!geo || !mat) return null;
  return <mesh geometry={geo} material={mat} />;
};

export const Terrain3D: React.FC<{cam: Cam3; scan?: number; band?: number; bandAmt?: number; mw: number; mh: number; scale: number}> = ({cam, scan = -1, band = 8 * EX, bandAmt = 0, mw, mh, scale}) => (
  <AbsoluteFill>
    <AbsoluteFill style={{background: 'linear-gradient(180deg, #06142e 0%, #1c4f8f 38%, #8fb4da 62%, #dce9f5 100%)'}} />
    <ThreeCanvas width={W} height={H} camera={{fov: cam.fov, near: 0.05, far: 400, position: cam.pos}} gl={{alpha: true, antialias: true}}>
      <Rig cam={cam} />
      <Mesh scan={scan} band={band} bandAmt={bandAmt} mw={mw} mh={mh} scale={scale} />
    </ThreeCanvas>
  </AbsoluteFill>
);
