import { GROUND_ENTRANCE_OPENING_WIDTH, GROUND_ENTRANCE_HEIGHT } from "./architecture/GroundEntrance";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LevelDescriptor } from "../engine/types";
import { useLevelFadeOpacity } from "../engine/hooks/useLevelFadeOpacity";
import { useSceneMode, systemFadeOverride } from "../engine/hooks/useSceneMode";
import { useLightingMode } from "../engine/hooks/useLightingMode";
import { sectionClipPlanes } from "../engine/utils/sectionClip";
import { lunaMaterialFactories as originalMaterials, tierForLevel } from "./lunaMaterials";
import { mergedBoxGeometry, type BoxSpec } from "../engine/utils/geometryUtils";

import { exteriorMaterials, exteriorWindowMaterial } from "./exterior/exteriorMaterials";
import { balconyFinish, arrivalCarGeometry } from "./exterior/exteriorGeometry";
import { plantingFromBoxes, leafMaterial } from "./exterior/plantGeometry";

// Exterior-only projection: interior factories and operational materials unchanged.
const lunaMaterialFactories = { ...originalMaterials,
  stone: exteriorMaterials.limestone, balconySlab: exteriorMaterials.limestone,
  bronzeFin: exteriorMaterials.bronze, bronzePergola: exteriorMaterials.bronze,
  darkAluminium: exteriorMaterials.metal, mullion: exteriorMaterials.metal,
  glassBalustrade: exteriorMaterials.glass, lobbyGlass: exteriorMaterials.glass,
  timberScreen: exteriorMaterials.timber, paving: exteriorMaterials.paving,
  windowGlowBright: exteriorWindowMaterial, windowGlowDim: exteriorWindowMaterial,
};

/** One fading mesh group for a level's facade detail. Every mesh here owns
 * a private material instance (via useMemo) and independently subscribes
 * to useLevelFadeOpacity for its OWN level — this is what makes isolate/
 * explode correctly carry the architecture instead of leaving a
 * decorative shell floating behind the massing. */
function FacadeMesh({ levelRef, geometry, materialFactory, castShadow = true }: {
  levelRef: string;
  geometry: THREE.BufferGeometry;
  materialFactory: () => THREE.Material;
  castShadow?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const material = useMemo(() => materialFactory(), [materialFactory]);
  const restingOpacity = useMemo(() => material.opacity, [material]);
  useLevelFadeOpacity(levelRef, meshRef, restingOpacity);
  const { sectionMode, sectionSide } = useSceneMode();
  useEffect(() => {
    material.clippingPlanes = sectionClipPlanes(sectionMode, sectionSide);
    material.clipShadows = true;
  }, [material, sectionMode, sectionSide]);
  // Purely decorative surface detail (fins, mullions, balcony slabs, ...) —
  // never a canonical selectable/hoverable node itself. Excluded from
  // raycasting so it can't shadow the real canonical LevelMassing volume
  // it rides on top of (Phase 12: hover/selection must resolve to real
  // canonical geometry, and dense Phase 11 facade detail was intercepting
  // the ray in front of every level's actual hit target).
  return <mesh ref={meshRef} geometry={geometry} material={material} castShadow={castShadow} receiveShadow raycast={() => null} />;
}

// Phase 14 — per-window occupied-building glow (§6). Shares FacadeMesh's
// own fade/section-clip behavior but additionally lerps its material's
// emissiveIntensity toward `baseIntensity` in evening/golden-hour mode and
// toward 0 in day mode, so lit windows are invisible by day (the ordinary
// glazing shows through underneath) and glow warmly once the sun goes
// down — without a second fade subscription or per-window state.
function WindowGlowMesh({ levelRef, geometry, materialFactory, baseIntensity }: { levelRef: string; geometry: THREE.BufferGeometry; materialFactory: () => THREE.Material; baseIntensity: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const material = useMemo(() => materialFactory(), [materialFactory]);
  useLevelFadeOpacity(levelRef, meshRef);
  const { sectionMode, sectionSide } = useSceneMode();
  useEffect(() => {
    material.clippingPlanes = sectionClipPlanes(sectionMode, sectionSide);
    material.clipShadows = true;
  }, [material, sectionMode, sectionSide]);
  const lightingMode = useLightingMode();
  useFrame(() => {
    // Golden hour gets a soft first hint of interior glow (a third of full
    // strength) — the sun is still up, most residents haven't switched
    // their lights on yet, short of evening's fully night-lit facade.
    const target = lightingMode === "day" ? 0 : lightingMode === "goldenHour" ? baseIntensity * 0.35 : baseIntensity;
    const mat = material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity += (target - mat.emissiveIntensity) * 0.06;
  });
  return <mesh ref={meshRef} geometry={geometry} material={material} receiveShadow raycast={() => null} />;
}

function BalconyFinish({level, projection, frontScale=1}: {level:LevelDescriptor;projection:number;frontScale?:number}) {
  const finish=useMemo(()=>balconyFinish(level.footprint.width,level.footprint.depth,projection,-level.height/2,frontScale),[level,projection,frontScale]);
  return <>
    <FacadeMesh levelRef={level.ref} geometry={finish.fittings} materialFactory={exteriorMaterials.bronze} castShadow={false}/>
    <FacadeMesh levelRef={level.ref} geometry={finish.shadow} materialFactory={exteriorMaterials.joint} castShadow={false}/>
    <FacadeMesh levelRef={level.ref} geometry={finish.soffit} materialFactory={exteriorMaterials.soffit}/>
    <WindowGlowMesh levelRef={level.ref} geometry={finish.light} materialFactory={exteriorMaterials.warmLight} baseIntensity={1.4}/>
  </>;
}
function PlanterFinish({levelRef, geometry}:{levelRef:string;geometry:THREE.BufferGeometry}) {
  const foliage=useMemo(()=>plantingFromBoxes(geometry),[geometry]);
  return <>
    <FacadeMesh levelRef={levelRef} geometry={geometry} materialFactory={exteriorMaterials.limestone}/>
    <FacadeMesh levelRef={levelRef} geometry={foliage} materialFactory={leafMaterial} castShadow={false}/>
  </>;
}
function CanopyLighting({level}:{level:LevelDescriptor}){
  const left=useRef<THREE.PointLight>(null),right=useRef<THREE.PointLight>(null);
  const lighting=useLightingMode(),mode=useSceneMode();
  useFrame(()=>{
    const fade=systemFadeOverride(mode,level.ref,1)??(mode.isolatedLevelRef&&mode.isolatedLevelRef !== level.ref ? .02 : 1);
    // Two bounded, non-shadow lights; no light per downlight/per balcony.
    const power=(lighting==='day'?0:lighting==='goldenHour'?6:18)*fade;
    for(const ref of [left,right])if(ref.current)ref.current.intensity=power;
  });
  return <>
    <pointLight ref={left} position={[-6,level.height/2-.6,level.footprint.depth/2+4]} color="#ffdab0" distance={12} decay={2}/>
    <pointLight ref={right} position={[6,level.height/2-.6,level.footprint.depth/2+4]} color="#ffdab0" distance={12} decay={2}/>
  </>;
}
function ArrivalCars({level,z}:{level:LevelDescriptor;z:number}) {
  const car=useMemo(()=>arrivalCarGeometry(),[]);
  return <>{[-4.2,3.4].map(x=><group key={x} position={[x,-level.height/2,z]}>
    <FacadeMesh levelRef={level.ref} geometry={car.body} materialFactory={originalMaterials.carBody}/>
    <FacadeMesh levelRef={level.ref} geometry={car.glass} materialFactory={originalMaterials.carGlass} castShadow={false}/>
    <FacadeMesh levelRef={level.ref} geometry={car.roof} materialFactory={originalMaterials.carBody}/>
    <FacadeMesh levelRef={level.ref} geometry={car.wheels} materialFactory={exteriorMaterials.joint}/>
    <FacadeMesh levelRef={level.ref} geometry={car.hubs} materialFactory={exteriorMaterials.metal} castShadow={false}/>
    <FacadeMesh levelRef={level.ref} geometry={car.lamps} materialFactory={exteriorMaterials.warmLight} castShadow={false}/>
  </group>)}</>;
}

// Deterministic per-bay window state — a small hash of level number + bay
// index + face id, never Math.random(), so the pattern is stable across
// re-renders and reads as a considered "some units lit, some dim, some
// dark" rhythm rather than flicker. Roughly two-thirds lit, a fifth dim, the
// rest dark — "occupied but not every window blazing" per §6's own words.
function windowState(levelNumber: number, faceId: number, bayIndex: number): "bright" | "dim" | "dark" {
  const h = (levelNumber * 13 + faceId * 29 + bayIndex * 7) % 20;
  if (h < 13) return "bright";
  if (h < 17) return "dim";
  return "dark";
}

function finPositions(width: number, depth: number, count: number): BoxSpec[] {
  const specs: BoxSpec[] = [];
  for (let i = 0; i < count; i++) {
    const x = -width / 2 + (width / (count - 1)) * i;
    specs.push({ size: [0.4, 1000, 0.7], position: [x, 0, depth / 2 + 0.35] });
    specs.push({ size: [0.4, 1000, 0.7], position: [x, 0, -depth / 2 - 0.35] });
  }
  return specs;
}

// Phase 14 — the same fin rhythm wrapped onto the east/west faces too.
// Phase 11's facade only ever dressed the front/back (±z) faces, leaving
// every side elevation as a bare glazing box with zero articulation —
// the single biggest reason the tower stopped reading as Luna from any
// angle but the hero shot. `spacing` (not a fixed count) is shared with
// finPositions' own front/back call so both axes keep the same physical
// bay rhythm regardless of each side's own length.
function sideFinPositions(width: number, depth: number, count: number): BoxSpec[] {
  const specs: BoxSpec[] = [];
  for (let i = 0; i < count; i++) {
    const z = -depth / 2 + (depth / (count - 1)) * i;
    specs.push({ size: [0.7, 1000, 0.4], position: [width / 2 + 0.35, 0, z] });
    specs.push({ size: [0.7, 1000, 0.4], position: [-width / 2 - 0.35, 0, z] });
  }
  return specs;
}

function finCountForSpan(span: number, baySize: number): number {
  return Math.max(2, Math.round(span / baySize) + 1);
}

// Standard / premium residential facade: bronze fins + a projecting
// balcony slab with a glass balustrade at the front face, plus a slab-edge
// spandrel band and mullion rhythm so the glazing reads as a real curtain
// wall (floor plates + framed bays) rather than one blank glass sheet.
function ResidentialFacade({ level, premium }: { level: LevelDescriptor; premium: boolean }) {
  const { width, depth } = level.footprint;
  const h = level.height;
  const finCount = premium ? 7 : 9;
  const balconyDepth = premium ? 2.6 : 1.7;
  const balconyHeight = 1.1;
  const floorLocalBottom = -h / 2;
  const spandrelHeight = 0.55;

  // Phase 14 — bay size (not raw fin count) is the shared unit, so the
  // east/west faces get a proportional fin count at the same physical
  // rhythm as the front/back faces rather than a mismatched density.
  const baySize = width / (finCount - 1);
  const sideFinCount = finCountForSpan(depth, baySize);

  const finGeometry = useMemo(() => {
    const specs = [...finPositions(width, depth, finCount), ...sideFinPositions(width, depth, sideFinCount)].map((s) => ({
      ...s,
      size: [s.size[0], h, s.size[2]] as [number, number, number],
    }));
    return mergedBoxGeometry(specs);
  }, [width, depth, finCount, sideFinCount, h]);

  const glazingBacking=useMemo(()=>mergedBoxGeometry([
    ...[-1,1].map(side=>({size:[width,h*.86,.012] as [number,number,number],position:[0,0,side*(depth/2+.012)] as [number,number,number]})),
    ...[-1,1].map(side=>({size:[.012,h*.86,depth] as [number,number,number],position:[side*(width/2+.012),0,0] as [number,number,number]})),
  ]),[width,depth,h]);

  // One mullion between every pair of fins, wrapped onto all four faces —
  // a finer, purely visual glazing-frame rhythm distinct from the
  // structural fins, thin enough to read as a window mullion rather than a
  // second fin. Phase 11 only ever wrapped the front/back faces, leaving
  // every side elevation a bare glazing box with no window rhythm at all —
  // confirmed the hard way reviewing a waterfront-angle Phase 14 screenshot
  // where the tower read as a generic blue office block from the side.
  const mullionGeometry = useMemo(() => {
    const specs: BoxSpec[] = [];
    const bays = finCount * 2;
    for (let i = 0; i <= bays; i++) {
      const x = -width / 2 + (width / bays) * i;
      specs.push({ size: [0.08, h * 0.86, 0.06], position: [x, 0, depth / 2 + 0.03] });
      specs.push({ size: [0.08, h * 0.86, 0.06], position: [x, 0, -depth / 2 - 0.03] });
    }
    const sideBays = sideFinCount * 2;
    for (let i = 0; i <= sideBays; i++) {
      const z = -depth / 2 + (depth / sideBays) * i;
      specs.push({ size: [0.06, h * 0.86, 0.08], position: [width / 2 + 0.03, 0, z] });
      specs.push({ size: [0.06, h * 0.86, 0.08], position: [-width / 2 - 0.03, 0, z] });
    }
    return mergedBoxGeometry(specs);
  }, [width, depth, h, finCount, sideFinCount]);

  // Slab-edge spandrel band at the floor line, wrapped on all four faces —
  // the horizontal counterpart to the vertical fins, matching how a real
  // curtain wall reveals its floor plates between glazing courses.
  const spandrelGeometry = useMemo(
    () =>
      mergedBoxGeometry([
        { size: [width * 0.98, spandrelHeight, 0.1], position: [0, floorLocalBottom + spandrelHeight / 2, depth / 2 + 0.05] },
        { size: [width * 0.98, spandrelHeight, 0.1], position: [0, floorLocalBottom + spandrelHeight / 2, -depth / 2 - 0.05] },
        { size: [0.1, spandrelHeight, depth * 0.98], position: [width / 2 + 0.05, floorLocalBottom + spandrelHeight / 2, 0] },
        { size: [0.1, spandrelHeight, depth * 0.98], position: [-width / 2 - 0.05, floorLocalBottom + spandrelHeight / 2, 0] },
      ]),
    [width, depth, floorLocalBottom]
  );

  // Balcony slabs + balustrades wrap all four faces as one continuous
  // banded ring (Phase 14) rather than a single front-only projection —
  // the reference's identity is exactly this: vertical bronze lines against
  // continuous horizontal balcony bands, visible from every angle, not
  // just the hero shot. A true per-unit balcony (with corner returns/gaps)
  // is a further refinement a future phase can add without changing this
  // shape; the continuous ring already reads correctly at hero distance.
  const balconyGeometry = useMemo(
    () =>
      mergedBoxGeometry([
        { size: [width + balconyDepth * 2, 0.22, balconyDepth], position: [0, floorLocalBottom + 0.14, depth / 2 + balconyDepth / 2] },
        { size: [width + balconyDepth * 2, 0.22, balconyDepth], position: [0, floorLocalBottom + 0.14, -depth / 2 - balconyDepth / 2] },
        { size: [balconyDepth, 0.22, depth], position: [width / 2 + balconyDepth / 2, floorLocalBottom + 0.14, 0] },
        { size: [balconyDepth, 0.22, depth], position: [-width / 2 - balconyDepth / 2, floorLocalBottom + 0.14, 0] },
      ]),
    [width, depth, balconyDepth, floorLocalBottom]
  );

  const balustradeGeometry = useMemo(() => {
    const by = floorLocalBottom + 0.14 + balconyHeight / 2;
    return mergedBoxGeometry([
      { size: [width + balconyDepth * 2, balconyHeight, 0.08], position: [0, by, depth / 2 + balconyDepth - 0.05] },
      { size: [width + balconyDepth * 2, balconyHeight, 0.08], position: [0, by, -depth / 2 - balconyDepth + 0.05] },
      { size: [0.08, balconyHeight, depth + balconyDepth * 2 - 0.1], position: [width / 2 + balconyDepth - 0.05, by, 0] },
      { size: [0.08, balconyHeight, depth + balconyDepth * 2 - 0.1], position: [-width / 2 - balconyDepth + 0.05, by, 0] },
    ]);
  }, [width, floorLocalBottom, balconyDepth, depth, balconyHeight]);

  // Controlled facade variation (section 7): every level alternates
  // between two credible balcony treatments — a privacy screen at one end
  // (an ensuite/wardrobe zone) or a planting pocket at the other — derived
  // deterministically from the level number so it reads as a considered
  // rhythm, never per-floor randomness. Premium levels get both, larger.
  const levelNumberMatch = level.ref.match(/L(\d+)$/);
  const levelNumber = levelNumberMatch ? Number(levelNumberMatch[1]) : 0;
  const showScreen = premium || levelNumber % 2 === 0;
  const showPlanting = premium || levelNumber % 2 === 1;

  const accentScreenGeometry = useMemo(() => {
    if (!showScreen) return null;
    return mergedBoxGeometry([
      { size: [premium ? 2.2 : 1.5, balconyHeight + 0.3, 0.06], position: [width * 0.36, floorLocalBottom + 0.14 + (balconyHeight + 0.3) / 2, depth / 2 + balconyDepth - 0.4] },
    ]);
  }, [showScreen, premium, width, floorLocalBottom, balconyDepth, balconyHeight, depth]);

  const accentPlantingGeometry = useMemo(() => {
    if (!showPlanting) return null;
    return mergedBoxGeometry([
      { size: [premium ? 1.6 : 1.1, 0.5, balconyDepth * 0.6], position: [-width * 0.36, floorLocalBottom + 0.14 + 0.25, depth / 2 + balconyDepth * 0.55] },
    ]);
  }, [showPlanting, premium, width, floorLocalBottom, balconyDepth, depth]);

  // Phase 14 §6 — per-window occupied glow, split into two merged
  // geometries (bright / dim) using the exact same bay grid the mullions
  // above already established, so every glow quad sits centered in its
  // own window bay on all four faces. "Dark" bays get no extra geometry
  // at all — the ordinary glazing shows through unchanged.
  const windowGlowGeometry = useMemo(() => {
    const bays = finCount * 2;
    const sideBays = sideFinCount * 2;
    const winW = (width / bays) * 0.72;
    const winSideW = (depth / sideBays) * 0.72;
    const winH = h * 0.62;
    const bright: BoxSpec[] = [];
    const dim: BoxSpec[] = [];
    const pushFace = (state: "bright" | "dim" | "dark", spec: BoxSpec) => {
      if (state === "bright") bright.push(spec);
      else if (state === "dim") dim.push(spec);
    };
    for (let i = 0; i < bays; i++) {
      const x = -width / 2 + (width / bays) * (i + 0.5);
      pushFace(windowState(levelNumber, 0, i), { size: [winW, winH, 0.03], position: [x, 0, depth / 2 + 0.015] });
      pushFace(windowState(levelNumber, 1, i), { size: [winW, winH, 0.03], position: [x, 0, -depth / 2 - 0.015] });
    }
    for (let i = 0; i < sideBays; i++) {
      const z = -depth / 2 + (depth / sideBays) * (i + 0.5);
      pushFace(windowState(levelNumber, 2, i), { size: [0.03, winH, winSideW], position: [width / 2 + 0.015, 0, z] });
      pushFace(windowState(levelNumber, 3, i), { size: [0.03, winH, winSideW], position: [-width / 2 - 0.015, 0, z] });
    }
    return { bright: mergedBoxGeometry(bright), dim: mergedBoxGeometry(dim) };
  }, [width, depth, h, finCount, sideFinCount, levelNumber]);

  return (
    <>
      <FacadeMesh levelRef={level.ref} geometry={glazingBacking} materialFactory={exteriorMaterials.glazing} castShadow={false}/>
      <FacadeMesh levelRef={level.ref} geometry={finGeometry} materialFactory={lunaMaterialFactories.bronzeFin} />
      <FacadeMesh levelRef={level.ref} geometry={mullionGeometry} materialFactory={lunaMaterialFactories.mullion} castShadow={false} />
      <FacadeMesh levelRef={level.ref} geometry={spandrelGeometry} materialFactory={lunaMaterialFactories.spandrelBand} />
      <BalconyFinish level={level} projection={balconyDepth}/>
      <FacadeMesh levelRef={level.ref} geometry={balconyGeometry} materialFactory={lunaMaterialFactories.balconySlab} />
      <FacadeMesh levelRef={level.ref} geometry={balustradeGeometry} materialFactory={lunaMaterialFactories.glassBalustrade} castShadow={false} />
      {accentScreenGeometry && <FacadeMesh levelRef={level.ref} geometry={accentScreenGeometry} materialFactory={lunaMaterialFactories.privacyScreen} castShadow={false} />}
      {accentPlantingGeometry && <PlanterFinish levelRef={level.ref} geometry={accentPlantingGeometry} />}
      <WindowGlowMesh levelRef={level.ref} geometry={windowGlowGeometry.bright} materialFactory={lunaMaterialFactories.windowGlowBright} baseIntensity={1.1} />
      <WindowGlowMesh levelRef={level.ref} geometry={windowGlowGeometry.dim} materialFactory={lunaMaterialFactories.windowGlowDim} baseIntensity={0.45} />
    </>
  );
}

// Ground/podium — Phase 11 makes this the strongest visual moment on the
// building: a full-height transparent lobby frontage behind slender
// columns (so reception/concierge reads as visible, not just implied), a
// deep porte-cochere canopy over the drop-off with its own support posts,
// and a couple of parked cars for scale and life under it.
function GroundFacade({ level }: { level: LevelDescriptor }) {
  const { width, depth } = level.footprint;
  const h = level.height;
  const columnCount = 11;
  const floorLocalBottom = -h / 2;

  const columnGeometry = useMemo(() => {
    const specs: BoxSpec[] = [];
    for (let i = 0; i < columnCount; i++) {
      const x = -width / 2 + (width / (columnCount - 1)) * i;
      // This is a decorative mullion/post rhythm, not structuralCatalog.
      // The inherited centre post crossed the existing canonical entrance.
      if (Math.abs(x) >= GROUND_ENTRANCE_OPENING_WIDTH / 2 + .175)
        specs.push({ size: [0.35, h, 0.35], position: [x, 0, depth / 2 + 0.5] });
    }
    return mergedBoxGeometry(specs);
  }, [width, depth, h, columnCount]);

  // A near-full-height glass curtain set just behind the column line —
  // "reception/concierge visibility" and "materially richer and more
  // transparent than the tower above" per section 5, without modeling
  // furniture at this scale.
  const lobbyGlassGeometry = useMemo(
    () => {
      const side=(width*.92-GROUND_ENTRANCE_OPENING_WIDTH)/2;
      const top=h*.86-GROUND_ENTRANCE_HEIGHT;
      return mergedBoxGeometry([
        {size:[side,h*.82,.12],position:[-(GROUND_ENTRANCE_OPENING_WIDTH+side)/2,-h*.05,depth/2+.15]},
        {size:[side,h*.82,.12],position:[(GROUND_ENTRANCE_OPENING_WIDTH+side)/2,-h*.05,depth/2+.15]},
        {size:[GROUND_ENTRANCE_OPENING_WIDTH,top,.12],position:[0,-h/2+GROUND_ENTRANCE_HEIGHT+top/2,depth/2+.15]},
      ]);
    },
    [width, depth, h]
  );

  // Deep porte-cochere canopy — wider and further out than Phase 2's canopy
  // stub, with its own slim support posts at the drop-off edge so it reads
  // as a real covered arrival rather than a shallow ledge.
  const canopyDepth = 9;
  const canopyGeometry = useMemo(
    () => mergedBoxGeometry([{ size: [width * 0.62, 0.32, canopyDepth], position: [0, h / 2 - 0.16, depth / 2 + canopyDepth / 2 + 1] }]),
    [width, depth, h, canopyDepth]
  );
  const canopyPostGeometry = useMemo(() => {
    const specs: BoxSpec[] = [];
    const postX = width * 0.29;
    const postZ = depth / 2 + canopyDepth + 0.6;
    for (const x of [-postX, postX]) {
      specs.push({ size: [0.3, h - 0.3, 0.3], position: [x, -0.15, postZ] });
    }
    return mergedBoxGeometry(specs);
  }, [width, depth, h, canopyDepth]);

  const stoneJoints=useMemo(()=>{
    const boxes:BoxSpec[]=[];
    for(const side of [-1,1]){
      for(let z=-depth/2+1.7;z<depth/2;z+=1.7)boxes.push({size:[.008,h,.014],position:[side*(width/2+.006),0,z]});
      for(let y=-h/2+1;y<h/2;y+=1)boxes.push({size:[.008,.012,depth],position:[side*(width/2+.006),y,0]});
    }
    return mergedBoxGeometry(boxes);
  },[width,depth,h]);

  const canopyFinish = useMemo(()=>{
    const soffit:BoxSpec[]=[],metal:BoxSpec[]=[],lights:BoxSpec[]=[],stone:BoxSpec[]=[];
    const w=width*.62, z=depth/2+canopyDepth/2+1, y=h/2-.335;
    for(let x=-w/2+.15;x<w/2;x+=.24)soffit.push({size:[.22,.028,canopyDepth-.12],position:[x,y,z]});
    for(const side of [-1,1]) {
      metal.push({size:[w,.11,.08],position:[0,h/2-.23,z+side*(canopyDepth/2-.025)]});
      lights.push({size:[w-.6,.015,.032],position:[0,y-.02,z+side*(canopyDepth/2-.3)]});
      lights.push({size:[.032,.015,canopyDepth-.6],position:[side*(w/2-.3),y-.02,z]});
      // Finish sleeves at the existing two support positions.
      stone.push({size:[.34,.38,.34],position:[side*width*.29,floorLocalBottom+.19,depth/2+canopyDepth+.6]});
    }
    for(let x=-w/2+1.3;x<w/2;x+=2.7)for(const dz of [-2.8,0,2.8]){
      metal.push({size:[.16,.025,.16],position:[x,y-.019,z+dz]});
      lights.push({size:[.095,.018,.095],position:[x,y-.039,z+dz]});
    }
    // Horizontal heads/sills subdivide the EXISTING decorative lobby glazing.
    metal.push({size:[width*.92,.085,.16],position:[0,h/2-.48,depth/2+.15]});
    for(let i=0;i<=20;i++){
      const x=-width*.46+i*width*.92/20;
      if(Math.abs(x)>GROUND_ENTRANCE_OPENING_WIDTH/2+.03)metal.push({size:[.055,h*.82,.16],position:[x,-h*.05,depth/2+.15]});
    }
    return {soffit:mergedBoxGeometry(soffit),metal:mergedBoxGeometry(metal),lights:mergedBoxGeometry(lights),stone:mergedBoxGeometry(stone)};
  },[width,depth,h,floorLocalBottom]);

  return (
    <>
      <FacadeMesh levelRef={level.ref} geometry={stoneJoints} materialFactory={exteriorMaterials.joint} castShadow={false}/>
      <FacadeMesh levelRef={level.ref} geometry={columnGeometry} materialFactory={lunaMaterialFactories.darkAluminium} />
      <FacadeMesh levelRef={level.ref} geometry={lobbyGlassGeometry} materialFactory={lunaMaterialFactories.lobbyGlass} castShadow={false} />
      <FacadeMesh levelRef={level.ref} geometry={canopyGeometry} materialFactory={lunaMaterialFactories.darkAluminium} />
      <FacadeMesh levelRef={level.ref} geometry={canopyPostGeometry} materialFactory={lunaMaterialFactories.darkAluminium} />
      <FacadeMesh levelRef={level.ref} geometry={canopyFinish.soffit} materialFactory={exteriorMaterials.timber}/>
      <FacadeMesh levelRef={level.ref} geometry={canopyFinish.metal} materialFactory={exteriorMaterials.bronze} castShadow={false}/>
      <FacadeMesh levelRef={level.ref} geometry={canopyFinish.stone} materialFactory={exteriorMaterials.limestone}/>
      <WindowGlowMesh levelRef={level.ref} geometry={canopyFinish.lights} materialFactory={exteriorMaterials.warmLight} baseIntensity={2}/>
      <ArrivalCars level={level} z={depth/2+canopyDepth*.55}/>
      <CanopyLighting level={level}/>
    </>
  );
}

// Residents' Club (L1) — deliberately more open than the residential
// stack above it: a transparent glazing plane behind the timber brise-
// soleil (so the amenity level reads as glass, not solid stone, from
// outside per section 6), plus a planted terrace ledge front and back.
function AmenityFacade({ level }: { level: LevelDescriptor }) {
  const { width, depth } = level.footprint;
  const h = level.height;
  const slatCount = 22;
  const floorLocalBottom = -h / 2;
  const terraceDepth = 2.2;

  const screenGeometry = useMemo(() => {
    const specs: BoxSpec[] = [];
    for (let i = 0; i < slatCount; i++) {
      const x = -width / 2 + (width / (slatCount - 1)) * i;
      specs.push({ size: [0.18, h * 0.85, 0.3], position: [x, 0, depth / 2 + 0.25] });
      specs.push({ size: [0.18, h * 0.85, 0.3], position: [x, 0, -depth / 2 - 0.25] });
    }
    return mergedBoxGeometry(specs);
  }, [width, depth, h, slatCount]);

  const glazingGeometry = useMemo(
    () =>
      mergedBoxGeometry([
        { size: [width * 0.9, h * 0.78, 0.12], position: [0, 0, depth / 2 - 0.05] },
        { size: [width * 0.9, h * 0.78, 0.12], position: [0, 0, -depth / 2 + 0.05] },
      ]),
    [width, depth, h]
  );

  const terraceGeometry = useMemo(
    () =>
      mergedBoxGeometry([
        { size: [width * 0.7, 0.2, terraceDepth], position: [0, floorLocalBottom + 0.1, depth / 2 + terraceDepth / 2 + 0.4] },
      ]),
    [width, depth, terraceDepth, floorLocalBottom]
  );

  const plantingGeometry = useMemo(() => {
    const specs: BoxSpec[] = [];
    for (const x of [-width * 0.32, 0, width * 0.32]) {
      specs.push({ size: [1.3, 0.6, terraceDepth * 0.6], position: [x, floorLocalBottom + 0.3, depth / 2 + terraceDepth + 0.1] });
    }
    return mergedBoxGeometry(specs);
  }, [width, depth, terraceDepth, floorLocalBottom]);

  return (
    <>
      <FacadeMesh levelRef={level.ref} geometry={glazingGeometry} materialFactory={lunaMaterialFactories.lobbyGlass} castShadow={false} />
      <FacadeMesh levelRef={level.ref} geometry={screenGeometry} materialFactory={lunaMaterialFactories.timberScreen} />
      <FacadeMesh levelRef={level.ref} geometry={terraceGeometry} materialFactory={lunaMaterialFactories.balconySlab} />
      <PlanterFinish levelRef={level.ref} geometry={plantingGeometry} />
    </>
  );
}

function PenthouseFacade({ level }: { level: LevelDescriptor }) {
  const { width, depth } = level.footprint;
  const h = level.height;
  const floorLocalBottom = -h / 2;
  const terraceDepth = 2.8;

  const frames=useMemo(()=>{
    const boxes:BoxSpec[]=[];
    for(let x=-width/2;x<=width/2;x+=2.5)for(const side of [-1,1])boxes.push({size:[.065,h,.085],position:[x,0,side*(depth/2+.045)]});
    for(let z=-depth/2;z<=depth/2;z+=2.75)for(const side of [-1,1])boxes.push({size:[.085,h,.065],position:[side*(width/2+.045),0,z]});
    return mergedBoxGeometry(boxes);
  },[width,depth,h]);

  // Wraparound terrace ring on all four sides, plus corner glazing strips
  // so the glazing reads as wrapping the corner rather than stopping flat.
  const terraceGeometry = useMemo(
    () =>
      mergedBoxGeometry([
        { size: [width + terraceDepth * 2, 0.22, terraceDepth], position: [0, floorLocalBottom + 0.14, depth / 2 + terraceDepth / 2] },
        { size: [width + terraceDepth * 2, 0.22, terraceDepth], position: [0, floorLocalBottom + 0.14, -depth / 2 - terraceDepth / 2] },
        { size: [terraceDepth, 0.22, depth], position: [width / 2 + terraceDepth / 2, floorLocalBottom + 0.14, 0] },
        { size: [terraceDepth, 0.22, depth], position: [-width / 2 - terraceDepth / 2, floorLocalBottom + 0.14, 0] },
      ]),
    [width, depth, terraceDepth, floorLocalBottom]
  );

  const balustradeGeometry = useMemo(() => {
    const bh = 1.1;
    const by = floorLocalBottom + 0.14 + bh / 2;
    return mergedBoxGeometry([
      { size: [width + terraceDepth * 2, bh, 0.08], position: [0, by, depth / 2 + terraceDepth - 0.05] },
      { size: [width + terraceDepth * 2, bh, 0.08], position: [0, by, -depth / 2 - terraceDepth + 0.05] },
      { size: [0.08, bh, depth + terraceDepth * 2 - 0.1], position: [width / 2 + terraceDepth - 0.05, by, 0] },
      { size: [0.08, bh, depth + terraceDepth * 2 - 0.1], position: [-width / 2 - terraceDepth + 0.05, by, 0] },
    ]);
  }, [width, depth, terraceDepth, floorLocalBottom]);

  const cornerGlazingGeometry = useMemo(
    () =>
      mergedBoxGeometry([
        { size: [1.2, h * 0.9, 0.15], position: [width / 2 - 0.2, 0, depth / 2 - 0.6], rotationY: Math.PI / 4 },
        { size: [1.2, h * 0.9, 0.15], position: [-width / 2 + 0.2, 0, depth / 2 - 0.6], rotationY: -Math.PI / 4 },
      ]),
    [width, depth, h]
  );

  // A private plunge pool on the rear terrace — signature-level per
  // section 9, kept credibly small (a residence's own terrace pool, not
  // the building's rooftop amenity pool).
  const plungePoolGeometry = useMemo(
    () => mergedBoxGeometry([{ size: [4.2, 0.35, 2.6], position: [-width / 2 - terraceDepth * 1.1, floorLocalBottom + 0.05, -depth / 2 - terraceDepth * 0.6] }]),
    [width, depth, terraceDepth, floorLocalBottom]
  );
  const plungePoolDeckGeometry = useMemo(
    () => mergedBoxGeometry([{ size: [5.6, 0.16, 3.6], position: [-width / 2 - terraceDepth * 1.1, floorLocalBottom + 0.08, -depth / 2 - terraceDepth * 0.6] }]),
    [width, depth, terraceDepth, floorLocalBottom]
  );

  return (
    <>
      <FacadeMesh levelRef={level.ref} geometry={frames} materialFactory={exteriorMaterials.bronze} castShadow={false}/>
      <BalconyFinish level={level} projection={terraceDepth} frontScale={1}/>
      <FacadeMesh levelRef={level.ref} geometry={terraceGeometry} materialFactory={lunaMaterialFactories.balconySlab} />
      <FacadeMesh levelRef={level.ref} geometry={balustradeGeometry} materialFactory={lunaMaterialFactories.glassBalustrade} castShadow={false} />
      <FacadeMesh levelRef={level.ref} geometry={cornerGlazingGeometry} materialFactory={lunaMaterialFactories.penthouseGlazing} />
      <FacadeMesh levelRef={level.ref} geometry={plungePoolDeckGeometry} materialFactory={lunaMaterialFactories.paving} />
      <FacadeMesh levelRef={level.ref} geometry={plungePoolGeometry} materialFactory={lunaMaterialFactories.poolWater} castShadow={false} />
    </>
  );
}

// Phase 14 — the two protected-stair cores (LUNA_CORES: x=±14, z=9) run
// the building's full height at a fixed x/z and terminate right at Luna
// Sky's own roof line, so their raw near-black core() material was
// poking through the deck as two bare, unclad prisms — read exactly as
// "miscellaneous rooftop boxes" in the Phase 14 visual audit. This wraps
// each one in a proper mechanical-penthouse cladding shell (real towers
// dress their stair/lift overrun the same way) using the crown's own
// material language, turning a visual bug into an intentional element.
const STAIR_CORE_SPOTS: Array<[number, number]> = [
  [-14, 9],
  [14, 9],
];

function RooftopCrown({ level }: { level: LevelDescriptor }) {
  const { width, depth } = level.footprint;
  const h = level.height;
  const topLocal = h / 2;

  const crownFinish=useMemo(()=>{
    const joints:BoxSpec[]=[],light:BoxSpec[]=[],metal:BoxSpec[]=[];
    for(const [x,z] of STAIR_CORE_SPOTS){
      for(const side of [-1,1]){
        for(let j=-1.4;j<=1.4;j+=1.4)joints.push({size:[.014,3.6,.008],position:[x+j,topLocal+1.8,z+side*3.104]});
        light.push({size:[4.12,.025,.028],position:[x,topLocal+3.55,z+side*3.11]});
        metal.push({size:[.025,.035,6.2],position:[x+side*2.1,topLocal+3.55,z]});
      }
      for(const yy of [.9,1.8,2.7])for(const side of [-1,1])joints.push({size:[4.2,.012,.009],position:[x,topLocal+yy,z+side*3.105]});
    }
    return {joints:mergedBoxGeometry(joints),light:mergedBoxGeometry(light),metal:mergedBoxGeometry(metal)};
  },[topLocal]);

  const stairCladdingGeometry = useMemo(() => {
    const specs: BoxSpec[] = [];
    const ch = 3.6;
    for (const [x, z] of STAIR_CORE_SPOTS) {
      specs.push({ size: [4.2, ch, 6.2], position: [x, topLocal + ch / 2, z] });
    }
    return mergedBoxGeometry(specs);
  }, [topLocal]);
  const stairCladdingCapGeometry = useMemo(() => {
    const specs: BoxSpec[] = [];
    const ch = 3.6;
    for (const [x, z] of STAIR_CORE_SPOTS) {
      specs.push({ size: [4.5, 0.18, 6.5], position: [x, topLocal + ch + 0.09, z] });
    }
    return mergedBoxGeometry(specs);
  }, [topLocal]);
  const stairCladdingFinGeometry = useMemo(() => {
    const specs: BoxSpec[] = [];
    const ch = 3.6;
    for (const [x, z] of STAIR_CORE_SPOTS) {
      for (const fx of [-1.6, -0.53, 0.53, 1.6]) {
        specs.push({ size: [0.16, ch, 0.3], position: [x + fx, topLocal + ch / 2, z + 3.25] });
      }
    }
    return mergedBoxGeometry(specs);
  }, [topLocal]);

  // A bronze pergola over the pool only — Phase 11's version spanned the
  // full roof depth with 7 crossing beams and read as visual clutter (the
  // Phase 14 audit's own words: "miscellaneous rooftop boxes"). Four wider-
  // spaced beams over just the pool zone reads as one deliberate covered
  // gesture instead of a lattice roof over everything.
  const pergolaGeometry = useMemo(() => {
    const specs: BoxSpec[] = [];
    const postHeight = 3.4;
    const pergolaDepth = depth * 0.55;
    const postPositions: Array<[number, number]> = [
      [width * 0.06 - width * 0.19, -pergolaDepth / 2],
      [width * 0.06 + width * 0.19, -pergolaDepth / 2],
      [width * 0.06 - width * 0.19, pergolaDepth / 2],
      [width * 0.06 + width * 0.19, pergolaDepth / 2],
    ];
    for (const [x, z] of postPositions) {
      specs.push({ size: [0.28, postHeight, 0.28], position: [x, topLocal + postHeight / 2, z] });
    }
    const beamCount = 4;
    for (let i = 0; i < beamCount; i++) {
      const z = -pergolaDepth / 2 + (pergolaDepth / (beamCount - 1)) * i;
      specs.push({ size: [width * 0.42, 0.22, 0.28], position: [width * 0.06, topLocal + postHeight - 0.15, z] });
    }
    return mergedBoxGeometry(specs);
  }, [width, depth, topLocal]);

  const greeneryGeometry = useMemo(() => {
    const specs: BoxSpec[] = [];
    const spots: Array<[number, number]> = [
      [-width / 2 + 1, -depth / 2 + 3],
      [width / 2 - 1, -depth / 2 + 3],
      [-width / 2 + 1, depth / 2 - 3],
      [width / 2 - 1, depth / 2 - 3],
    ];
    for (const [x, z] of spots) {
      specs.push({ size: [1.6, 0.7, 1.6], position: [x, topLocal + 0.35, z] });
    }
    return mergedBoxGeometry(specs);
  }, [width, depth, topLocal]);

  // Luna Sky as a real destination, not just a service plant box: an
  // infinity pool under the pergola, an enclosed sky lounge/bar volume at
  // one end, and a pair of cabanas at the other — Phase 11 section 10.
  // Concealed technical plant (risers/B1 MEP) stays entirely separate,
  // addressed elsewhere in the operational asset table, never merged here.
  const poolGeometry = useMemo(() => mergedBoxGeometry([{ size: [width * 0.42, 0.3, depth * 0.5], position: [width * 0.06, topLocal + 0.1, 0] }]), [width, depth, topLocal]);
  const poolDeckGeometry = useMemo(
    () => mergedBoxGeometry([{ size: [width * 0.5, 0.14, depth * 0.6], position: [width * 0.06, topLocal + 0.13, 0] }]),
    [width, depth, topLocal]
  );

  const loungeWallGeometry = useMemo(() => {
    const lw = width * 0.24;
    const ld = depth * 0.55;
    const lh = 2.6;
    const lx = -width / 2 + lw / 2 + 0.6;
    return mergedBoxGeometry([
      { size: [0.18, lh, ld], position: [lx - lw / 2, topLocal + lh / 2, 0] },
      { size: [lw, lh, 0.18], position: [lx, topLocal + lh / 2, -ld / 2] },
      { size: [lw, lh, 0.18], position: [lx, topLocal + lh / 2, ld / 2] },
    ]);
  }, [width, depth, topLocal]);
  const loungeGlazingGeometry = useMemo(() => {
    const lw = width * 0.24;
    const ld = depth * 0.55;
    const lh = 2.6;
    const lx = -width / 2 + lw / 2 + 0.6;
    return mergedBoxGeometry([{ size: [lw - 0.2, lh - 0.3, ld - 0.2], position: [lx, topLocal + lh / 2, 0] }]);
  }, [width, depth, topLocal]);
  const loungeRoofGeometry = useMemo(() => {
    const lw = width * 0.24;
    const ld = depth * 0.55;
    const lh = 2.6;
    const lx = -width / 2 + lw / 2 + 0.6;
    return mergedBoxGeometry([{ size: [lw + 0.4, 0.2, ld + 0.4], position: [lx, topLocal + lh + 0.1, 0] }]);
  }, [width, depth, topLocal]);

  // Phase 14 — the previous pair of 2.4m cube cabanas (each with its own
  // flat roof) added two more boxy volumes competing with the crown for
  // attention; low sun-loungers read as the same "pool deck is furnished"
  // idea at a fraction of the visual weight.
  const cabanaGeometry = useMemo(() => {
    const specs: BoxSpec[] = [];
    const spots: Array<[number, number]> = [
      [width / 2 - 2.6, -depth * 0.3],
      [width / 2 - 2.6, -depth * 0.18],
      [width / 2 - 2.6, depth * 0.18],
      [width / 2 - 2.6, depth * 0.3],
    ];
    for (const [x, z] of spots) {
      specs.push({ size: [1.8, 0.32, 0.7], position: [x, topLocal + 0.16, z] });
    }
    return mergedBoxGeometry(specs);
  }, [width, depth, topLocal]);
  return (
    <>
      <FacadeMesh levelRef={level.ref} geometry={crownFinish.joints} materialFactory={exteriorMaterials.joint} castShadow={false}/>
      <FacadeMesh levelRef={level.ref} geometry={crownFinish.metal} materialFactory={exteriorMaterials.bronze} castShadow={false}/>
      <WindowGlowMesh levelRef={level.ref} geometry={crownFinish.light} materialFactory={exteriorMaterials.warmLight} baseIntensity={1.5}/>
      <FacadeMesh levelRef={level.ref} geometry={pergolaGeometry} materialFactory={lunaMaterialFactories.bronzePergola} />
      <PlanterFinish levelRef={level.ref} geometry={greeneryGeometry} />
      <FacadeMesh levelRef={level.ref} geometry={poolDeckGeometry} materialFactory={lunaMaterialFactories.paving} />
      <FacadeMesh levelRef={level.ref} geometry={poolGeometry} materialFactory={lunaMaterialFactories.poolWater} castShadow={false} />
      <FacadeMesh levelRef={level.ref} geometry={loungeWallGeometry} materialFactory={lunaMaterialFactories.stone} />
      <FacadeMesh levelRef={level.ref} geometry={loungeGlazingGeometry} materialFactory={lunaMaterialFactories.lobbyGlass} castShadow={false} />
      <FacadeMesh levelRef={level.ref} geometry={loungeRoofGeometry} materialFactory={lunaMaterialFactories.darkAluminium} />
      <FacadeMesh levelRef={level.ref} geometry={cabanaGeometry} materialFactory={lunaMaterialFactories.timberScreen} />
      <FacadeMesh levelRef={level.ref} geometry={stairCladdingGeometry} materialFactory={lunaMaterialFactories.stone} />
      <FacadeMesh levelRef={level.ref} geometry={stairCladdingCapGeometry} materialFactory={lunaMaterialFactories.darkAluminium} />
      <FacadeMesh levelRef={level.ref} geometry={stairCladdingFinGeometry} materialFactory={lunaMaterialFactories.bronzeFin} castShadow={false} />
    </>
  );
}

function BasementDetail({ level }: { level: LevelDescriptor }) {
  const { width, depth } = level.footprint;
  const h = level.height;

  const louvreGeometry = useMemo(
    () =>
      mergedBoxGeometry([
        { size: [width * 0.5, 0.6, 0.15], position: [0, h / 2 - 0.6, depth / 2 + 0.08] },
        { size: [width * 0.5, 0.6, 0.15], position: [0, h / 2 - 0.6, -depth / 2 - 0.08] },
      ]),
    [width, depth, h]
  );

  return <FacadeMesh levelRef={level.ref} geometry={louvreGeometry} materialFactory={lunaMaterialFactories.darkAluminium} castShadow={false} />;
}

/** Tier-dispatched architectural detail for a single level. Rendered as a
 * child of that level's LevelMassing group, so it inherits the group's
 * position (explode offset) automatically and independently fades via
 * useLevelFadeOpacity when a sibling level is isolated. */
export function LevelFacade({ level }: { level: LevelDescriptor }) {
  const tier = tierForLevel(level.ref);
  switch (tier) {
    case "basement":
      return <BasementDetail level={level} />;
    case "ground":
      return <GroundFacade level={level} />;
    case "amenity":
      return <AmenityFacade level={level} />;
    case "penthouse":
      return <PenthouseFacade level={level} />;
    case "rooftop":
      return <RooftopCrown level={level} />;
    case "premium":
      return <ResidentialFacade level={level} premium />;
    case "standard":
    default:
      return <ResidentialFacade level={level} premium={false} />;
  }
}
