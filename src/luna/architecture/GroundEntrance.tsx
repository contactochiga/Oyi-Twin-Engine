// Luna Architectural Reality V1 — the Grand Entrance assembly (brief
// Parts 3-5). LUNA_REFERENCE_DESIGN: a real architectural door system,
// not a marker or a glowing rectangle — built on the engine's
// building-agnostic SlidingGlassDoor primitive.
//
// The real canonical entrance identity is LUNA-GROUND-ACCESS-MAIN-01
// ("Main Resident Entrance") — already seeded (Phase 3C) at exactly
// {x:0, z:16}, which is where this assembly is positioned. Selecting the
// door surfaces THIS real asset's own identity, not a fabricated one.
//
// Critical, disclosed limitation (confirmed by auditing
// lunaAccessResolver.ts before writing any of this): Access & Security V1
// deliberately instruments only ONE real governed lock in the whole
// building (the Apartment 6A entry lock) — LUNA-GROUND-ACCESS-MAIN-01
// itself carries `instrumented: false` by design, a documented scope
// boundary from that phase, not an oversight. Re-purposing it into a
// remotely-commandable door here would silently walk back that boundary.
// Instead, the open/close animation below is exactly what the brief's own
// Part 4 explicitly allows for this case: a local REFERENCE SIMULATION —
// never claimed as installed automatic-door hardware, and never routed
// through the Access system's authorization layer.
//
// Spatial Transition Engine V1 — this component no longer owns its own
// timer-based door state machine. Selecting the door now begins the real
// LUNA_MAIN_ENTRANCE_TRANSITION (approach -> resolve access -> actuate ->
// wait for real clearance -> cross -> arrive), driven by
// LunaEntranceTransitionDriver.tsx and the generic engine/spatial/
// transitionEngine.ts. This component is now purely controlled: doorState
// comes from the driver, onProgressChange reports the leaf's real
// rendered openness back to it (SlidingGlassDoor's own established
// "the geometry does not own operational truth" principle, now enforced
// one level higher up too).

import { useMemo } from "react";
import { SlidingGlassDoor, type SlidingDoorState } from "../../engine/components/SlidingGlassDoor";
import { lunaMaterialFactories } from "../lunaMaterials";
import { mergedBoxGeometry } from "../../engine/utils/geometryUtils";

export const GROUND_ENTRANCE_REF = "LUNA-GROUND-ACCESS-MAIN-01";
export const GROUND_ENTRANCE_OPENING_WIDTH = 3.6;
export const GROUND_ENTRANCE_HEIGHT = 2.8;
/** Matches LUNA-GROUND-ACCESS-MAIN-01's own real seeded position exactly
 * (lunaOperationalAssets.ts: {x:0, y:0.2, z:16}) — the architecture binds
 * to the operational identity's real location, not an invented one. */
export const GROUND_ENTRANCE_X = 0;
export const GROUND_ENTRANCE_Z = 16;

export interface GroundEntranceProps {
  levelHeight: number;
  /** Real, driver-owned door state — this component never decides it. */
  doorState: SlidingDoorState;
  /** Selecting the door begins the real transition (App.tsx wires this to
   * LunaEntranceTransitionDriver.beginEnter, gated by RepresentationPolicy
   * exactly as the pre-existing enterInterior fallback already was). */
  onSelectDoor?: () => void;
  /** The leaf's real, currently-animating progress (0..1) — reported up
   * every frame so the transition engine's clearance check reads the
   * ACTUAL rendered openness, not a parallel estimate. */
  onProgressChange?: (progress: number) => void;
}

export function GroundEntrance({ levelHeight, doorState, onSelectDoor, onProgressChange }: GroundEntranceProps) {
  const frameMaterial = useMemo(() => lunaMaterialFactories.darkAluminium(), []);
  const glassMaterial = useMemo(() => lunaMaterialFactories.lobbyGlass(), []);
  const jambGeometry = useMemo(
    () =>
      mergedBoxGeometry([
        { size: [0.18, GROUND_ENTRANCE_HEIGHT + 0.2, 0.3], position: [-GROUND_ENTRANCE_OPENING_WIDTH / 2 - 1.6, (GROUND_ENTRANCE_HEIGHT + 0.2) / 2, 0] },
        { size: [0.18, GROUND_ENTRANCE_HEIGHT + 0.2, 0.3], position: [GROUND_ENTRANCE_OPENING_WIDTH / 2 + 1.6, (GROUND_ENTRANCE_HEIGHT + 0.2) / 2, 0] },
        { size: [GROUND_ENTRANCE_OPENING_WIDTH + 3.4, 0.35, 0.3], position: [0, GROUND_ENTRANCE_HEIGHT + 0.37, 0] }, // header/lintel band above the whole glazed frontage
      ]),
    []
  );

  return (
    <group position={[GROUND_ENTRANCE_X, -levelHeight / 2, GROUND_ENTRANCE_Z]}>
      <mesh geometry={jambGeometry} material={frameMaterial} castShadow receiveShadow />
      <SlidingGlassDoor
        ref_={GROUND_ENTRANCE_REF}
        label="Main Entrance"
        state={doorState}
        openingWidth={GROUND_ENTRANCE_OPENING_WIDTH}
        height={GROUND_ENTRANCE_HEIGHT}
        glassMaterial={glassMaterial}
        frameMaterial={frameMaterial}
        onSelect={onSelectDoor}
        onProgressChange={onProgressChange}
      />
      {/* Extended glazed frontage either side of the entrance opening —
          the "materially richer, more transparent" podium frontage the
          brief's own Part 3 (glazing/entrance framing) and the existing
          lobbyGlass() material comment both call for. */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (GROUND_ENTRANCE_OPENING_WIDTH / 2 + 2.7), GROUND_ENTRANCE_HEIGHT / 2, 0]} material={glassMaterial} castShadow>
          <boxGeometry args={[2.2, GROUND_ENTRANCE_HEIGHT, 0.03]} />
        </mesh>
      ))}
    </group>
  );
}

export type { SlidingDoorState as GroundEntranceDoorState };
