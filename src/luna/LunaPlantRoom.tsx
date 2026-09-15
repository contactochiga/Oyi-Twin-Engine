import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useLevelFadeOpacity, ServiceZone, AccessPanel } from "../engine";

// Footprint chosen to enclose B1's actual electrical/water/fire plant
// cluster (see lunaOperationalAssets.ts — those assets sit roughly within
// x: -22..20, z: -17..2) without overlapping the parking/access area on
// the building's other side. A raised floor plinth, not walls — Phase 10
// prioritizes spatial/engineering correctness and inspectability, not
// final photorealism (no plant-room walls/doors modeled yet), but a
// visually distinct plant floor makes the massed B1 box legible as "this
// zone is plant, not parking" even in ordinary Architecture view.
const PLANT_ROOM = { x: -1, z: -8, width: 44, depth: 20 };

// Physical Reality V1 §13 — "proper plant-room enclosure... equipment
// clearances... equipment mounting zones" for the three plant clusters
// electrical/water/fire visually raised during this convergence pass.
// Deliberately translucent ServiceZone volumes (the same non-blocking
// primitive already proven for the riser maintenance gallery below), NOT
// solid walls — full walls would risk clipping the existing camera
// presets/screenshots that fly into B1 to frame individual equipment, and
// §13 explicitly asks for the minimum change necessary, not an
// architectural redesign. Each zone's own AccessPanel stands in for the
// plant room's service door. Bounds are each cluster's own real asset
// footprint (lunaOperationalAssets.ts) plus a working margin, not an
// arbitrary shape.
const ELECTRICAL_ZONE = { x: -16, z: -5.5, width: 13, depth: 9, height: 2.6, doorX: -16 };
const WATER_ZONE = { x: 2, z: -7, width: 15, depth: 8, height: 2.6, doorX: 2 };
const FIRE_ZONE = { x: 16, z: -7, width: 7.5, depth: 8, height: 2.6, doorX: 16 };

// Phase 13 §7 — the riser cluster (LUNA_CORES/RISERS, x=-8, z≈-0.6..1.0)
// transitions into the plant floor here: a valve/isolation gallery at
// riser base, not a full-height service void like an apartment ceiling —
// this is where a maintenance technician would actually stand to isolate
// or service any one of the five risers before they head up the building.
const RISER_MAINTENANCE_ZONE = { x: -8, z: 0.2, width: 3, depth: 3, height: 2.2 };

/** A subtle architectural legibility cue for B1 (Phase 10 section 11) —
 * ordinary architecture, not an operational asset overlay, so it fades
 * with the rest of B1's facade via useLevelFadeOpacity (Phase 11 audit:
 * this previously stayed always-visible even when B1 faded for an
 * unrelated Engineering Layer, which read as inconsistent with every
 * other facade element on the same level). */
export function LunaPlantRoom({ levelRef, levelHeight }: { levelRef: string; levelHeight: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(PLANT_ROOM.width, 0.12, PLANT_ROOM.depth), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a2d33", roughness: 0.85, metalness: 0.15 }), []);
  useLevelFadeOpacity(levelRef, meshRef);

  const z = RISER_MAINTENANCE_ZONE;

  return (
    <group position={[0, -levelHeight / 2, 0]}>
      <mesh ref={meshRef} geometry={geometry} material={material} position={[PLANT_ROOM.x, 0.08, PLANT_ROOM.z]} receiveShadow />
      <ServiceZone
        ref_="LUNA-B1-RISER-MAINTENANCE-ZONE-01"
        label="Riser Cluster — Maintenance Access Gallery"
        center={{ x: z.x, y: z.height / 2, z: z.z }}
        size={{ x: z.width, y: z.height, z: z.depth }}
      />
      <AccessPanel ref_="LUNA-B1-RISER-MAINTENANCE-ACCESS-01" label="Riser Cluster — Isolation Gallery Access" position={{ x: z.x, y: 0.02, z: z.z + z.depth / 2 }} width={1.2} depth={0.9} />
      <ServiceZone
        ref_="LUNA-B1-ELECTRICAL-PLANT-ZONE-01"
        label="Electrical Plant Room"
        center={{ x: ELECTRICAL_ZONE.x, y: ELECTRICAL_ZONE.height / 2, z: ELECTRICAL_ZONE.z }}
        size={{ x: ELECTRICAL_ZONE.width, y: ELECTRICAL_ZONE.height, z: ELECTRICAL_ZONE.depth }}
      />
      <AccessPanel ref_="LUNA-B1-ELECTRICAL-PLANT-ACCESS-01" label="Electrical Plant Room — Service Door" position={{ x: ELECTRICAL_ZONE.doorX, y: 0.02, z: ELECTRICAL_ZONE.z + ELECTRICAL_ZONE.depth / 2 }} width={1.3} depth={0.9} />
      <ServiceZone
        ref_="LUNA-B1-WATER-PLANT-ZONE-01"
        label="Water Plant Room"
        center={{ x: WATER_ZONE.x, y: WATER_ZONE.height / 2, z: WATER_ZONE.z }}
        size={{ x: WATER_ZONE.width, y: WATER_ZONE.height, z: WATER_ZONE.depth }}
      />
      <AccessPanel ref_="LUNA-B1-WATER-PLANT-ACCESS-01" label="Water Plant Room — Service Door" position={{ x: WATER_ZONE.doorX, y: 0.02, z: WATER_ZONE.z + WATER_ZONE.depth / 2 }} width={1.3} depth={0.9} />
      <ServiceZone
        ref_="LUNA-B1-FIRE-PLANT-ZONE-01"
        label="Fire Plant Room"
        center={{ x: FIRE_ZONE.x, y: FIRE_ZONE.height / 2, z: FIRE_ZONE.z }}
        size={{ x: FIRE_ZONE.width, y: FIRE_ZONE.height, z: FIRE_ZONE.depth }}
      />
      <AccessPanel ref_="LUNA-B1-FIRE-PLANT-ACCESS-01" label="Fire Plant Room — Service Door" position={{ x: FIRE_ZONE.doorX, y: 0.02, z: FIRE_ZONE.z + FIRE_ZONE.depth / 2 }} width={1.3} depth={0.9} />
    </group>
  );
}
