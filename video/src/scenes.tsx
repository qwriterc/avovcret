import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Billboard, MapView, Proj, RiverLine} from './Map';
import {BAR_ROT, BarsCanvas, DamCanvas, GaugeCanvas, TankCanvas, barScreen} from './three3d';
import {BigNum, Blueprint, Connector, Cutout, DiagWipe, Emoji, Fade, HandEllipse, HandNote, NeonTitle, OrangeLabel, PeopleGrid, PhotoCard, Pin, PlaceName, inter, oswald, playfair, useSpring} from './ui';
import {Cam, camAt, clamp01, ease, easeOut, GEO, lerp, TimingCtx, useLocalStart, useSent} from './lib';
import attribution from '../public/photos/attribution.json';

const C = {
  hook0: {lon: -105.6, lat: 40.6, z: 8.2, pitch: 58, bearing: 22} as Cam,
  hook1: {lon: -107.6, lat: 38.7, z: 7.7, pitch: 52, bearing: 2} as Cam,
  states: {lon: -111.2, lat: 37.6, z: 6.25, pitch: 38, bearing: -6} as Cam,
  wide: {lon: -109.5, lat: 36.8, z: 5.8, pitch: 22, bearing: 0} as Cam,
  hoover0: {lon: -114.74, lat: 36.0, z: 11.35, pitch: 45, bearing: -15} as Cam,
  hoover1: {lon: -114.72, lat: 36.03, z: 11.6, pitch: 54, bearing: 8} as Cam,
  mead0: {lon: -114.6, lat: 36.1, z: 11.0, pitch: 54, bearing: 12} as Cam,
  mead1: {lon: -114.45, lat: 36.25, z: 10.7, pitch: 48, bearing: 32} as Cam,
};

const useT = () => {
  const f = useCurrentFrame();
  const {dur} = React.useContext(TimingCtx);
  return {f, t: clamp01(f / Math.max(1, dur)), dur};
};
const Tag: React.FC<{text: string; at: number}> = ({text, at}) => {
  const sp = useSpring(at);
  return <div style={{transform: `scale(${sp})`, fontFamily: oswald, fontWeight: 700, fontSize: 40, color: '#fff', background: 'rgba(240,138,18,0.92)', padding: '2px 16px', border: '2px solid #ffd08a', boxShadow: '0 6px 14px rgba(0,0,0,0.5)'}}>{text}</div>;
};
const Place: React.FC<{p: Proj; g: [number, number]; text?: string; at?: number; pin?: boolean; sub?: string; size?: number; lift?: number}> = ({p, g, text, at = 0, pin = true, sub, size = 44, lift = 0}) => {
  const q = p(g[0], g[1]);
  return (
    <>
      {pin && <Billboard x={q.x} y={q.y} lift={lift}><Pin at={at} /></Billboard>}
      {text && <Billboard x={q.x} y={q.y} lift={lift + 20}><div style={{marginBottom: 26, textAlign: 'center'}}><PlaceName text={text} at={at} size={size} />{sub && <div style={{fontFamily: oswald, fontSize: 30, color: '#ffd21f', textShadow: '0 2px 6px #000', letterSpacing: 3}}>{sub}</div>}</div></Billboard>}
    </>
  );
};

/* 1. HOOK: low tilted flyover of Rockies headwaters, neon title */
export const Hook: React.FC = () => {
  const {f, t} = useT();
  const cam = camAt(C.hook0, C.hook1, t);
  return (
    <Fade frames={1}>
      <MapView cam={cam} overlay={(p) => (<>
        <RiverLine proj={p} p={ease(t) * 0.3 + 0.02} width={7} />
        <Place p={p} g={GEO.river[0]} text="Rocky Mountains" at={14} />
      </>)} />
      <NeonTitle text="Colorado River" x={540} y={330} size={128} at={4} sub="FROM SNOW TO SEA" />
      <Emoji name="snowflake" x={170} y={720} size={170} at={18} />
      <Cutout src="cut/p39.png" x={800} y={1120} w={500} rot={4} at={26} from="right" />
    </Fade>
  );
};

/* 2. STATES */
export const States: React.FC = () => {
  const {f, t} = useT();
  const cam = camAt(C.hook1, C.states, t);
  const st: [string, [number, number]][] = [['WY', [-107.5, 43.0]], ['CO', [-105.6, 39.0]], ['UT', [-111.7, 39.5]], ['NM', [-106.1, 34.4]], ['AZ', [-111.7, 34.3]], ['NV', [-116.8, 38.4]], ['CA', [-119.6, 36.6]]];
  const {dur} = useT();
  return (
    <Fade frames={1}>
      <MapView cam={cam} overlay={(p) => (<>
        <RiverLine proj={p} p={lerp(0.3, 0.9, ease(t))} width={6} />
        {st.map(([n, g], i) => { const q = p(g[0], g[1]); return <Billboard key={n} x={q.x} y={q.y} lift={30}><Tag text={n} at={10 + i * (dur * 0.1)} /></Billboard>; })}
      </>)} />
      <NeonTitle text="7 STATES" x={540} y={330} size={120} at={8} color="#ffb347" sub="1,450 MILES" />
      <Emoji name="desert" x={880} y={640} size={150} at={30} />
    </Fade>
  );
};

/* 3. PEOPLE */
export const People: React.FC = () => {
  const {f, t} = useT();
  const cam = camAt(C.states, C.wide, t);
  const cities: [number, number][] = [[-104.99, 39.74], [-111.89, 40.76], [-112.07, 33.45], [-115.14, 36.17], [-118.24, 34.05], [-117.16, 32.72], [-110.97, 32.22], [-106.65, 35.08]];
  return (
    <Fade frames={1}>
      <MapView cam={cam} overlay={(p) => (<>
        <RiverLine proj={p} p={lerp(0.9, 1, easeOut(t * 2))} width={6} />
        {cities.map((g, i) => <Place key={i} p={p} g={g} at={8 + i * 6} />)}
      </>)} />
      <BigNum text="40 MILLION" x={540} y={330} size={140} at={6} sub="PEOPLE DEPEND ON IT" />
      <PeopleGrid x={540} y={560} cols={14} rows={2} size={78} at={20} perFrame={0.55} />
      <Emoji name="droplet" x={900} y={820} size={150} at={24} />
    </Fade>
  );
};

/* 4. ZOOM IN */
export const Zoom: React.FC = () => {
  const {f, t} = useT();
  const cam = camAt(C.wide, C.hoover0, t);
  const reticle = ease(t);
  const s = lerp(1.9, 1, reticle);
  return (
    <Fade frames={1}>
      <MapView cam={cam} overlay={(p) => <Place p={p} g={GEO.hoover} at={Math.round(t > 0 ? 12 : 12)} />} />
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: clamp01(t * 4) * (1 - clamp01((t - 0.9) * 10))}}>
        <g transform={`translate(540 960) scale(${s})`} stroke="#fff" strokeWidth={6} fill="none" style={{filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.9))'}}>
          <path d="M -200 -120 V -200 H -120 M 200 -120 V -200 H 120 M -200 120 V 200 H -120 M 200 120 V 200 H 120" />
        </g>
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 330, textAlign: 'center', fontFamily: oswald, fontWeight: 700, fontSize: 70, color: '#fff', letterSpacing: 8, textShadow: '0 0 20px #35e0ff, 0 3px 8px #000', opacity: clamp01(t * 3)}}>36.0°N  114.7°W</div>
    </Fade>
  );
};

/* 5. DAM */
export const Dam: React.FC = () => {
  const {f, t} = useT();
  const cam = camAt(C.hoover0, C.hoover1, t);
  return (
    <Fade frames={1}>
      <MapView cam={cam} overlay={(p) => <Place p={p} g={GEO.hoover} text="Hoover Dam" sub="BUILT 1936" at={6} size={54} />} />
      <PhotoCard src="photos/p02.jpg" x={290} y={560} w={430} h={310} rot={-5} at={14} from="left" />
      <PhotoCard src="photos/p03.jpg" x={790} y={640} w={420} h={300} rot={4} at={26} from="right" />
      <OrangeLabel text="Hoover Dam · 1936" x={540} y={330} at={4} size={52} />
    </Fade>
  );
};

/* 6. MEAD with 3D dam */
export const Mead: React.FC = () => {
  const {f, t} = useT();
  const cam = camAt(C.mead0, C.mead1, t);
  const sp = useSpring(10, {damping: 14});
  return (
    <Fade frames={1}>
      <MapView cam={cam} overlay={(p) => <Place p={p} g={[-114.42, 36.2]} text="Lake Mead" sub="LARGEST U.S. RESERVOIR" at={30} size={60} />} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 55%, rgba(0,10,30,0.55) 0%, rgba(0,10,30,0) 70%)'}} />
      <DamCanvas width={1080} height={1920} angle={lerp(-0.9, 0.35, ease(t))} appear={sp} />
      <OrangeLabel text="Lake Mead" x={540} y={330} at={6} size={56} />
    </Fade>
  );
};

/* 7. TANK */
export const Tank: React.FC = () => {
  const {f, t, dur} = useT();
  const cam = camAt(C.mead1, {...C.mead1, bearing: 55, z: 10.5}, t);
  const lvl = easeOut(f / (dur * 0.9));
  const n = Math.round(lvl * 9);
  return (
    <Fade frames={1}>
      <MapView cam={cam} />
      <AbsoluteFill style={{background: 'rgba(0,15,40,0.55)'}} />
      <TankCanvas width={1080} height={1920} level={lvl} spin={f / 40} />
      <BigNum text={`${n} TRILLION`} x={540} y={330} size={130} at={4} sub="GALLONS WHEN FULL" />
      <Emoji name="droplet" x={170} y={860} size={140} at={18} />
      <Emoji name="water_wave" x={910} y={900} size={150} at={30} />
    </Fade>
  );
};

/* 8. POWER */
export const Power: React.FC = () => {
  const {f, t} = useT();
  const cam = camAt({...C.hoover0, z: 11.2, bearing: -25}, {...C.hoover1, z: 11.4, bearing: -5}, t);
  return (
    <Fade frames={1}>
      <MapView cam={cam} overlay={(p) => <Place p={p} g={GEO.hoover} at={2} />} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 70%)'}} />
      <Cutout src="cut/p04.png" x={520} y={780} w={520} rot={-2} at={4} from="bottom" glow="rgba(255,225,120,0.7)" />
      <Cutout src="cut/p42.png" x={850} y={1010} w={290} rot={5} at={20} from="right" />
      <Emoji name="high_voltage" x={200} y={640} size={170} at={14} />
      <BigNum text="1M+ PEOPLE" x={540} y={330} size={120} at={8} sub="POWERED BY THE DAM" />
      <PeopleGrid x={540} y={1185} cols={9} rows={1} size={84} at={50} perFrame={0.3} color="#ffd21f" />
    </Fade>
  );
};

/* 9. SPLIT - blueprint org chart */
export const Split: React.FC = () => {
  const {f} = useT();
  const s8 = useLocalStart(8), s9 = useLocalStart(9);
  const sub: React.CSSProperties = {fontFamily: oswald, fontWeight: 600, fontSize: 36, color: '#fff', letterSpacing: 3, textAlign: 'center', textShadow: '0 2px 6px rgba(0,0,0,0.5)'};
  return (
    <DiagWipe>
      <Blueprint />
      <Emoji name="droplet" x={540} y={250} size={140} at={0} />
      <OrangeLabel text="Colorado River" x={540} y={390} at={4} size={50} />
      <Connector pts={[[540, 440], [540, 520], [290, 520], [290, 580]]} at={s8 + 32} />
      <Connector pts={[[540, 520], [790, 520], [790, 580]]} at={s8 + 32} />
      <OrangeLabel text="Upper Basin" x={290} y={630} at={s8 + 44} size={40} />
      <OrangeLabel text="Lower Basin" x={790} y={630} at={s8 + 52} size={40} />
      <div style={{...sub, position: 'absolute', left: 90, width: 400, top: 690, opacity: clamp01((f - (s8 + 60)) / 10)}}>CO · WY · UT · NM</div>
      <div style={{...sub, position: 'absolute', left: 590, width: 400, top: 690, opacity: clamp01((f - (s8 + 66)) / 10)}}>AZ · NV · CA</div>
      <HandEllipse x={540} y={665} w={900} h={210} at={s9 + 10} />
      <HandNote text="the 1922 deal" x={320} y={860} at={s9 + 18} size={72} rot={-6} />
      <Connector pts={[[540, 560], [540, 960], [540, 1010]]} at={s9 + 70} dur={20} />
      <OrangeLabel text="Mexico" x={540} y={1060} at={s9 + 84} size={44} />
      <Emoji name="eagle" x={880} y={1100} size={120} at={s9 + 40} />
    </DiagWipe>
  );
};

/* 10. BARS - 3D water shares */
export const Bars: React.FC = () => {
  const {f} = useT();
  const s10 = useLocalStart(10), s11 = useLocalStart(11);
  const g = (a: number) => easeOut((a) / 26);
  const data = [
    {n: 'CALIFORNIA', v: 4.4, a: s10 + 6, c: '#ff9a1f'},
    {n: 'ARIZONA', v: 2.8, a: s11 + 4, c: '#ffd21f'},
    {n: 'MEXICO', v: 1.5, a: s10 + 55, c: '#35c4ff'},
    {n: 'NEVADA', v: 0.3, a: s11 + 52, c: '#ff5a6a'},
  ];
  const order = [0, 1, 2, 3];
  const xs = [-210, -70, 70, 210];
  const wob = Math.sin(f / 50) * 0.12;
  const hs = order.map((i) => data[i].v * 78 * g(f - data[i].a));
  return (
    <Fade frames={6}>
      <Blueprint drift={40} />
      <OrangeLabel text="Share of the river · million acre-feet" x={540} y={310} at={2} size={36} />
      <BarsCanvas width={1080} height={1920} heights={hs} colors={order.map((i) => data[i].c)} xs={xs} wob={wob} />
      {order.map((i, k) => {
        const d = data[i];
        const top = barScreen(xs[k], hs[k], 0, wob);
        const base = barScreen(xs[k], 0, 70, wob);
        const sp = g(f - d.a);
        return (
          <React.Fragment key={d.n}>
            {sp > 0.05 && <BigNum text={d.v.toFixed(1)} x={540 + top.x} y={960 - top.y - 70} size={78} at={d.a + 10} />}
            <div style={{position: 'absolute', left: 540 + base.x - 110, width: 220, top: 960 - base.y + 36, textAlign: 'center', fontFamily: oswald, fontWeight: 700, fontSize: 28, color: '#fff', letterSpacing: 2, opacity: clamp01((f - d.a) / 8), textShadow: '0 2px 6px rgba(0,0,0,0.5)'}}>{d.n}</div>
          </React.Fragment>
        );
      })}
      <HandNote text="1 acre-foot ≈ 326,000 gallons" x={540} y={1190} at={s11 + 20} size={54} rot={-2} />
      <Emoji name="droplet" x={930} y={560} size={110} at={10} />
    </Fade>
  );
};

/* 11. FARMS */
export const Farms: React.FC = () => {
  const {f, t} = useT();
  const cam = camAt({lon: -114.9, lat: 33.3, z: 9.2, pitch: 40, bearing: 10}, {lon: -115.35, lat: 32.95, z: 10.3, pitch: 52, bearing: 22}, t);
  return (
    <DiagWipe>
      <MapView cam={cam} overlay={(p) => (<>
        <Place p={p} g={[-115.5, 32.85]} text="Imperial Valley" at={10} size={54} />
        <Place p={p} g={[-114.62, 32.73]} text="Yuma" at={22} size={40} />
      </>)} />
      <PhotoCard src="photos/p25.jpg" x={310} y={560} w={430} h={560} rot={-5} at={8} from="left" />
      <Cutout src="cut/p26.png" x={770} y={930} w={400} rot={3} at={24} from="right" />
      <OrangeLabel text="Food for the nation" x={540} y={310} at={4} size={50} />
    </DiagWipe>
  );
};

/* 12. PROBLEM */
export const Problem: React.FC = () => {
  const {f, t} = useT();
  const cam = camAt({...C.hoover1, z: 11.3, bearing: 10}, {...C.hoover1, z: 11.8, bearing: -10, pitch: 58}, t);
  const shake = f < 14 ? Math.sin(f * 7) * (14 - f) * 0.7 : 0;
  return (
    <Fade frames={1}>
      <div style={{position: 'absolute', inset: 0, transform: `translate(${shake}px, ${-shake}px)`}}>
        <MapView cam={cam} red={ease(clamp01(f / 12))} overlay={(p) => <Place p={p} g={GEO.hoover} at={0} />} />
      </div>
      <NeonTitle text="THE PROBLEM" x={540} y={640} size={150} at={2} color="#ff3b2f" sub="THE RIVER IS SHRINKING" />
      <Emoji name="sun" x={190} y={430} size={190} at={6} />
      <Emoji name="thermometer" x={900} y={470} size={180} at={12} />
    </Fade>
  );
};

/* 13. GAUGE */
export const Gauge: React.FC = () => {
  const {f, dur} = useT();
  const lvl = lerp(1, 0.4, ease(f / (dur * 0.85)));
  const drop = Math.round(lerp(0, 100, ease(f / (dur * 0.85))));
  return (
    <Fade frames={6}>
      <Blueprint drift={80} />
      <GaugeCanvas width={1080} height={1920} level={lvl} sway={Math.sin(f / 45) * 0.18} />
      <BigNum text={`−${drop}+ FT`} x={540} y={330} size={140} at={2} color="#ff6a4a" sub="LAKE MEAD SINCE 2000" />
      <Emoji name="chart_decreasing" x={900} y={760} size={150} at={20} />
      <HandNote text="water level" x={190} y={1000} at={30} size={60} rot={-8} />
    </Fade>
  );
};

/* 14. RINGS */
export const Rings: React.FC = () => {
  const {f, t} = useT();
  const cam = camAt({...C.mead1, z: 10.7}, {...C.mead1, z: 11.2, bearing: 5}, t);
  return (
    <Fade frames={6}>
      <MapView cam={cam} red={0.45} />
      <PhotoCard src="photos/p03.jpg" x={540} y={700} w={900} h={640} rot={-2} at={4} from="bottom" label="Lake Mead" />
      <HandEllipse x={300} y={640} w={300} h={300} at={30} />
      <HandNote text="the “bathtub ring”" x={560} y={1090} at={40} size={78} rot={-4} />
      <Cutout src="cut/p42.png" x={930} y={1090} w={200} rot={6} at={16} from="right" />
    </Fade>
  );
};

/* 15. DELTA */
export const Delta: React.FC = () => {
  const {f, t} = useT();
  const cam = camAt({lon: -114.4, lat: 33.4, z: 8.3, pitch: 40, bearing: 5}, {lon: -114.9, lat: 32.0, z: 9.3, pitch: 50, bearing: -8}, t);
  const fade = 1 - clamp01((cam.z - 9) / 0.8);
  return (
    <DiagWipe>
      <MapView cam={cam} overlay={(p) => <div style={{opacity: fade}}><RiverLine proj={p} p={1} dry={ease(clamp01((t - 0.3) * 1.6))} width={6} /></div>} />
      <PhotoCard src="photos/p36.jpg" x={320} y={560} w={450} h={330} rot={-5} at={10} from="left" />
      <PhotoCard src="photos/p33.jpg" x={770} y={840} w={450} h={330} rot={4} at={30} from="right" />
      <OrangeLabel text="Colorado River Delta" x={540} y={310} at={4} size={44} />
      <BigNum text="DRY" x={250} y={1010} size={150} at={52} color="#ff7a5a" />
    </DiagWipe>
  );
};

/* 16. OUTRO + credits */
export const Outro: React.FC = () => {
  const {f, t, dur} = useT();
  const s17 = useSent(17);
  const cam = camAt({lon: -114.95, lat: 31.95, z: 8.3, pitch: 45, bearing: -8}, {...C.wide, z: 5.9, pitch: 26}, ease(f / 80));
  const cr = clamp01((s17.f - (s17.dur + 10)) / 14);
  const used = ['p04', 'p42', 'p39', 'p02', 'p03', 'p25', 'p26', 'p36', 'p33'];
  const rows = (attribution as {id: string; title: string; lic: string; author: string}[]).filter((a) => used.includes(a.id) && /CC BY/i.test(a.lic));
  return (
    <DiagWipe>
      <MapView cam={cam} overlay={(p) => <RiverLine proj={p} p={1} width={7} />} />
      <div style={{opacity: 1 - cr}}>
        <NeonTitle text="Every drop counts" x={500} y={560} size={104} at={6} sub="FOLLOW FOR MORE MAPS" />
        <Emoji name="droplet" x={540} y={900} size={220} at={16} />
      </div>
      <AbsoluteFill style={{background: 'rgba(5,15,35,0.88)', opacity: cr}} />
      <div style={{position: 'absolute', left: 80, right: 150, top: 330, opacity: cr, color: '#fff', fontFamily: inter, fontSize: 25, lineHeight: 1.35}}>
        <div style={{fontFamily: oswald, fontSize: 54, letterSpacing: 5, marginBottom: 24, color: '#ffb347'}}>CREDITS</div>
        {rows.map((r) => <div key={r.id} style={{marginBottom: 10}}>{r.title.replace('File:', '').replace(/\.(jpg|jpeg|png)$/i, '').slice(0, 52)} — {r.author.slice(0, 28)} — {r.lic}</div>)}
        <div style={{marginTop: 20}}>3D emoji: Fluent Emoji by Microsoft (MIT License)</div>
      </div>
    </DiagWipe>
  );
};

export const SCENE_COMPONENTS: Record<string, React.FC> = {hook: Hook, states: States, people: People, zoom: Zoom, dam: Dam, mead: Mead, tank: Tank, power: Power, split: Split, bars: Bars, farms: Farms, problem: Problem, gauge: Gauge, rings: Rings, delta: Delta, outro: Outro};
