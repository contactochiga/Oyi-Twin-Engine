import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergedBoxGeometry, type BoxSpec } from "../../engine/utils/geometryUtils";
import { lunaMaterialFactories } from "../lunaMaterials";
import { RING2_ROAD_SEGMENTS, RING2_BUILDINGS } from "./lunaRing2Data";
import { LUNA_CONTEXT_RINGS } from "../lunaSite";

// Phase 15B — Ring 2 (real Victoria Island context, ~100-500m) and Ring 3
// (art-directed Lagos/VI horizon, 500m+). Both rendered here, composed
// once into LunaBuilding.tsx alongside the existing Ring 1 site
// (LunaEnvironment.tsx). Nothing here is part of the addressable twin
// hierarchy — same as LunaEnvironment's own static context meshes, no
// useSelection/fade wiring, no canonical refs, no interiors (Phase 15
// brief §4: "do not create interiors or canonical twin asset IDs for
// neighbouring buildings").

// Phase 15C — Ring 2's original hard visible=true/false toggle at a
// single 55m threshold could pop abruptly if the camera lingered right on
// that boundary (a real, if narrow, presentation risk the brief flagged).
// Replaced with a smoothstep opacity fade across a band (45m-70m) plus a
// lerp toward that target — the same "continuous lerp, never a binary
// snap" convention already established by every other fade in this
// engine (useLevelFadeOpacity, WindowGlowMesh's emissive lerp, etc.), not
// a new technique. `visible` still gets a hard cut once opacity is
// negligible, so the render-cost saving inside Ring 1 is unchanged.
const FADE_START = LUNA_CONTEXT_RINGS.ring1OuterRadius * 0.45;
const FADE_END = LUNA_CONTEXT_RINGS.ring1OuterRadius * 0.7;
const FADE_LERP = 0.08;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Fades its own mesh's material opacity in/out based on camera distance
 * from the origin, rather than snapping visibility at one threshold. The
 * wrapped material must have `transparent: true` set (done once, in the
 * contextRoad/contextMassing factories) — at opacity 1 a transparent
 * material is visually identical to an opaque one, so this costs nothing
 * once fully faded in. */
function DistanceFadeMesh({ geometry, material }: { geometry: THREE.BufferGeometry; material: THREE.Material & { opacity: number } }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dist = Math.hypot(camera.position.x, camera.position.z);
    const target = smoothstep(FADE_START, FADE_END, dist);
    material.opacity += (target - material.opacity) * FADE_LERP;
    const visible = material.opacity > 0.01;
    if (mesh.visible !== visible) mesh.visible = visible;
  });
  return <mesh ref={meshRef} geometry={geometry} material={material} receiveShadow={false} castShadow={false} raycast={() => null} />;
}

/** The ground plane under Ring 2/3 — without this, distant buildings and
 * roads would render floating over empty background with nothing beneath
 * them between Ring 1's own small SiteBase plate and the horizon. Sits at
 * y=-0.15, below Ring 1's plate (y=-0.05) and every Ring 1 surface detail,
 * so Luna's own landscaped ground is always the visible foreground within
 * its footprint. Always rendered — one plane, negligible cost — never
 * distance-gated (it must already be visible at the same moment Ring 1's
 * own ground is, right at the Ring 1/2 seam). */
function ContextGround() {
  const material = useMemo(() => lunaMaterialFactories.contextGround(), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]} material={material} receiveShadow={false} raycast={() => null}>
      <planeGeometry args={[3000, 3000]} />
    </mesh>
  );
}

function Ring2Roads() {
  const material = useMemo(() => lunaMaterialFactories.contextRoad(), []);
  const geometry = useMemo(() => {
    const specs: BoxSpec[] = RING2_ROAD_SEGMENTS.map((seg) => ({
      size: [seg.width, 0.06, seg.length],
      position: [seg.x, 0.02, seg.z],
      rotationY: seg.rotationY,
    }));
    return mergedBoxGeometry(specs);
  }, []);
  return <DistanceFadeMesh geometry={geometry} material={material} />;
}

function Ring2Buildings() {
  const material = useMemo(() => lunaMaterialFactories.contextMassing(), []);
  const geometry = useMemo(() => {
    const specs: BoxSpec[] = RING2_BUILDINGS.map((b) => ({
      size: [b.width, b.height, b.depth],
      position: [b.x, b.height / 2, b.z],
    }));
    return mergedBoxGeometry(specs);
  }, []);
  return <DistanceFadeMesh geometry={geometry} material={material} />;
}

/** Ring 3 — deliberately non-literal (Phase 15A §6/§7, reaffirmed in the
 * Phase 15B brief §5): a handful of merged silhouette blocks plus one
 * large water plane toward geographic south (local -Z under the site's
 * heading=0 anchor — see lunaSite.ts's heading note for why the real
 * coastline/Eko Atlantic direction lands there, not at Phase 1-14's old
 * artistic -X placeholder). This is the "hybrid" the brief asks for:
 * real macro orientation (water is south, the city fabric is inland/north
 * of it), art-directed everything else. */
function Ring3Horizon() {
  const skylineMaterial = useMemo(() => lunaMaterialFactories.silhouette(), []);
  const waterMaterial = useMemo(() => lunaMaterialFactories.water(), []);

  const skylineGeometry = useMemo(() => {
    const specs: BoxSpec[] = [];
    // A loose arc of distant massing across the inland (north) side,
    // where the real OSM data confirms dense VI city fabric continues —
    // heights/positions are art-directed, not sourced (Phase 15A §7).
    const positions: Array<[number, number]> = [
      [-520, 780], [-260, 860], [40, 900], [340, 840], [600, 760],
      [-680, 620], [720, 600], [-420, 1040], [180, 1080], [500, 1000],
    ];
    positions.forEach(([x, z], i) => {
      const height = 30 + ((i * 53) % 70);
      specs.push({ size: [46, height, 46], position: [x, height / 2, z] });
    });
    return mergedBoxGeometry(specs);
  }, []);

  return (
    <group>
      <mesh geometry={skylineGeometry} material={skylineMaterial} castShadow={false} receiveShadow={false} raycast={() => null} />
      {/* South-facing water plane — the real Eko Atlantic/coastline
          direction (Phase 15B lunaSite.ts heading note). Starts beyond
          Ring 2's real (waterless, per the actual OSM extract at this
          radius) neighbourhood fabric. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.1, -900]}
        material={waterMaterial}
        receiveShadow={false}
        raycast={() => null}
      >
        <planeGeometry args={[2600, 900]} />
      </mesh>
    </group>
  );
}

/** Composes Ring 2 + Ring 3. Ring 2 fades smoothly in/out around the
 * Ring 1/2 seam (Phase 15C — see DistanceFadeMesh); Ring 3 is cheap
 * enough by construction to always render (Phase 15A §7/§9 — two merged
 * draw calls total). */
export function LunaSiteContext() {
  return (
    <group>
      <ContextGround />
      <Ring2Roads />
      <Ring2Buildings />
      <Ring3Horizon />
    </group>
  );
}
