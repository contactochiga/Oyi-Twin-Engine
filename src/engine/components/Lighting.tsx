import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Environment, Lightformer } from "@react-three/drei";
import type { RenderQuality } from "../hooks/useRenderQuality";
import { shadowsEnabledFor } from "../hooks/useRenderQuality";

export interface LightingProps {
  /** "day" (default): bright tropical daylight, readable materials, high
   * key intensity. "goldenHour" (Phase 14 §8): a lower, warmer sun for
   * premium architectural presentation — its own tuned state, not a
   * blend of day and evening. "evening": low sun, warm color, dim fill —
   * pairs with each building's own night-glow glazing (Phase 11). Generic
   * tuning only — no building-specific values here. */
  mode?: "day" | "goldenHour" | "evening";
  /** Render-quality profile (Phase 11 section 22) — "embedded" skips the
   * shadow pass entirely (a real GPU cost on a small card), everything
   * else keeps the full lighting rig. Defaults to "standard". */
  quality?: RenderQuality;
  /** Optional local sky/ground reflection field; default host appearance stays unchanged. */
  outdoorReflections?: boolean;
  /** Optional packaged HDR for reflection/lighting only; never a background. */
  reflectionMap?: string;
}

interface LightingTuning {
  hemisphereColor: string;
  hemisphereGround: string;
  hemisphereIntensity: number;
  ambientColor: string;
  ambientIntensity: number;
  keyPosition: [number, number, number];
  keyIntensity: number;
  keyColor: string;
  fillIntensity: number;
  fillColor: string;
  formerWarm: number;
  formerWarmColor: string;
  formerCool: number;
  formerSky: number;
}

// Phase 14 §8 — three tuned states, not a day/evening interpolation:
// "goldenHour" is its own deliberate premium-presentation preset (a lower,
// warmer sun than day, brighter and less blue than evening), matching the
// brief's own framing as a distinct canonical preset rather than a
// midpoint blend.
const TUNING: Record<"day" | "goldenHour" | "evening", LightingTuning> = {
  day: {
    hemisphereColor: "#cfe0ff",
    hemisphereGround: "#3a332a",
    hemisphereIntensity: 0.75,
    ambientColor: "#dce6f5",
    ambientIntensity: 0.62,
    keyPosition: [60, 95, 40],
    keyIntensity: 2.6,
    keyColor: "#fff2de",
    fillIntensity: 0.6,
    fillColor: "#8fb4ff",
    formerWarm: 4,
    formerWarmColor: "#ffdcae",
    formerCool: 1.1,
    formerSky: 0.7,
  },
  goldenHour: {
    hemisphereColor: "#d9b48e",
    hemisphereGround: "#332a1e",
    hemisphereIntensity: 0.55,
    ambientColor: "#e0c19c",
    ambientIntensity: 0.48,
    keyPosition: [80, 34, 62],
    keyIntensity: 1.7,
    keyColor: "#ffb570",
    fillIntensity: 0.42,
    fillColor: "#7d99c9",
    formerWarm: 2.2,
    formerWarmColor: "#ffa768",
    formerCool: 0.7,
    formerSky: 0.45,
  },
  evening: {
    hemisphereColor: "#4a5a8f",
    hemisphereGround: "#241d17",
    hemisphereIntensity: 0.32,
    ambientColor: "#5a6c9a",
    ambientIntensity: 0.3,
    keyPosition: [-70, 26, 50],
    keyIntensity: 0.9,
    keyColor: "#ff9d5c",
    fillIntensity: 0.18,
    fillColor: "#405a9a",
    formerWarm: 1.4,
    formerWarmColor: "#ff9a5c",
    formerCool: 0.3,
    formerSky: 0.15,
  },
};

/** Warm architectural lighting rig: a low, warm-toned key light plus soft
 * fill, plus a small *procedural* local environment for PBR reflections.
 * Generic — no building-specific tuning lives here.
 *
 * Deliberately NOT drei's <Environment preset="..."> or files={...}: both
 * fetch an HDR file from a remote CDN at runtime. That's a real
 * dependency for a "local browser URL" deliverable — a slow or blocked
 * network leaves the whole scene stuck in Suspense showing nothing, with
 * no visible error (confirmed during Phase 1 verification). The
 * Lightformer children form below are baked into a small cubemap
 * synchronously, in-process — zero network requests, zero Suspense risk. */
export function Lighting({ mode = "day", quality = "standard", outdoorReflections = false, reflectionMap }: LightingProps) {
  const [environment,setEnvironment]=useState<{url:string;texture:THREE.DataTexture}|null>(null);
  useEffect(()=>{
    if(!reflectionMap)return;
    let active=true,owned:THREE.DataTexture|undefined;
    void import('three/examples/jsm/loaders/HDRLoader.js').then(({HDRLoader})=>new HDRLoader().loadAsync(reflectionMap)).then(texture=>{
      if(!active){texture.dispose();return;}
      owned=texture;texture.mapping=THREE.EquirectangularReflectionMapping;setEnvironment({url:reflectionMap,texture});
    }).catch(()=>console.warn('Optional reflection map unavailable; local procedural environment retained.'));
    return()=>{active=false;owned?.dispose();};
  },[reflectionMap]);
  const activeEnvironment=environment?.url===reflectionMap?environment?.texture:null;
  const t = TUNING[mode];
  const shadowsOn = shadowsEnabledFor(quality);
  const shadowMapSize = quality === "high" ? 2048 : 1024;
  return (
    <>
      <hemisphereLight color={t.hemisphereColor} groundColor={t.hemisphereGround} intensity={t.hemisphereIntensity} />
      {/* Ambient bumped from 0.16/0.4 (Phase 12) — fully-enclosed interior
          rooms (their own walls + ceiling) sit almost entirely outside the
          directional key light's reach, and ambient was their only real
          light source; every communal interior without an operational
          light asset (Lobby, Club, Luna Sky, Penthouse, L10) rendered
          near-black. A global ambient bump costs nothing extra per frame
          (unlike per-room point lights, which were tried first and cut a
          bad regression into render throughput — reverted) and lifts every
          enclosed space uniformly. Kept modest so the sunlit exterior,
          already dominated by the much stronger directional light, isn't
          visibly washed out. */}
      <ambientLight intensity={t.ambientIntensity} color={t.ambientColor} />
      <directionalLight
        position={t.keyPosition}
        intensity={t.keyIntensity}
        color={t.keyColor}
        castShadow={shadowsOn}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-camera-far={250}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-50, 40, -60]} intensity={t.fillIntensity} color={t.fillColor} />
      {activeEnvironment ? <Environment map={activeEnvironment} environmentIntensity={mode==='day'?.65:mode==='goldenHour'?.5:.18} environmentRotation={[0,.6,0]}/> : <Environment resolution={128}>
        <group>
          {outdoorReflections && <ReflectionSky mode={mode}/>}
          <Lightformer intensity={t.formerWarm} color={t.formerWarmColor} position={[20, 12, 10]} scale={[16, 8, 1]} />
          <Lightformer intensity={t.formerCool} color="#9fc0ff" position={[-18, 8, -14]} scale={[14, 10, 1]} />
          <Lightformer intensity={t.formerSky} color="#ffffff" position={[0, 24, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[40, 40, 1]} />
        </group>
      </Environment>}
    </>
  );
}

/** Local cubemap backdrop, not geographic imagery or another scene model.
 * Baked by the existing Environment once per mode; no network/Suspense source. */
function ReflectionSky({mode}:{mode:NonNullable<LightingProps['mode']>}){
  const geometry=useMemo(()=>{
    const g=new THREE.SphereGeometry(80,32,16),p=g.getAttribute('position'),colors=new Float32Array(p.count*3);
    const palette=mode==='day'?['#819aa9','#d7d5c8','#706f60']:mode==='goldenHour'?['#6f818c','#d5b18a','#625844']:['#202a43','#62687a','#262820'];
    const zenith=new THREE.Color(palette[0]),horizon=new THREE.Color(palette[1]),ground=new THREE.Color(palette[2]);
    for(let i=0;i<p.count;i++){
      const height=p.getY(i)/80,c=height>=0?horizon.clone().lerp(zenith,Math.sqrt(height)):horizon.clone().lerp(ground,Math.min(1,-height*3));
      colors.set([c.r,c.g,c.b],i*3);
    }
    g.setAttribute('color',new THREE.BufferAttribute(colors,3));return g;
  },[mode]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry}><meshBasicMaterial vertexColors side={THREE.BackSide}/></mesh>;
}
