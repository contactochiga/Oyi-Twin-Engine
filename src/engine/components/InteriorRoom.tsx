import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { CanonicalRef } from "../types";
import { useSelection, useIsSelected } from "../hooks/useSelection";
import { useRoomOpacity } from "../hooks/useRoomOpacity";
import { useCeilingOpacity } from "../hooks/useCeilingOpacity";
import { useCanonicalHoverHandlers } from "../hooks/useHover";
import { mergedBoxGeometry, type BoxSpec } from "../utils/geometryUtils";

export type DoorSide = "north" | "south" | "east" | "west";

/** Apartment A Full Interior Reality V1 (Part 9/10) — a real room commonly
 * needs more than one opening (a bedroom opens onto both a corridor AND
 * its own ensuite). `offset` is measured along the wall's own axis from
 * the room's center (positive = toward +x for a north/south wall, toward
 * +z for an east/west wall) — omit it for a centered opening, the same
 * position the original single-doorSide API always used. */
export interface DoorOpening {
  side: DoorSide;
  width?: number;
  offset?: number;
  ref?: CanonicalRef;
}

interface InteriorRoomProps {
  ref_: CanonicalRef;
  label: string;
  /** The level this room's floor ultimately sits on — drives level-scope
   * fade (same mechanism as every other node in the twin). */
  ownerLevelRef: CanonicalRef;
  /** The interior (home or level) this room belongs to for room-focus
   * purposes — e.g. "LUNA-L06-APT-A" for an apartment room, or
   * "LUNA-GROUND" for a lobby zone that isn't a home at all. */
  interiorRef: CanonicalRef;
  /** Rect local to the interior's own group origin. */
  x: number;
  z: number;
  width: number;
  depth: number;
  wallHeight?: number;
  /** Which side carries a door opening — "south" (-z) is the sensible
   * default for a grid of rooms opening toward a shared corridor/hallway
   * side; override per room where the real layout calls for a different
   * side. Phase 12: replaces the previous 4-corner-stub walls (which read
   * as decorative hints, not real partitions) with continuous walls on
   * three sides and a real opening on the fourth. Ignored when `doors` is
   * supplied. */
  doorSide?: DoorSide;
  doorWidth?: number;
  /** Architectural Reality V2 — when supplied alongside doorSide, this
   * room's door opening becomes its own selectable canonical object (an
   * invisible hit-target at the real gap position, not a rendered door
   * leaf — no door assembly geometry exists yet, see
   * lunaL06AptAAdapter.ts's own disclosure). Omit to keep the door gap
   * exactly as before (an opening with no separate identity). Ignored
   * when `doors` is supplied (give each entry its own `ref` instead). */
  doorRef?: CanonicalRef;
  /** Apartment A Full Interior Reality V1 — a real room may need more than
   * one opening (e.g. a bedroom: one to the corridor, one to its own
   * ensuite). When supplied, this REPLACES doorSide/doorWidth/doorRef
   * entirely — every existing interior that only ever needs one opening
   * keeps using the simpler doorSide API unchanged (strictly additive,
   * backward-compatible). Multiple openings on the SAME wall are
   * supported (segments are computed between them, sorted by offset). */
  doors?: DoorOpening[];
  floorMaterial: THREE.Material;
  wallMaterial: THREE.Material;
  /** Pre-merged furniture geometry for this room, or null for an empty room. */
  furnitureGeometry?: THREE.BufferGeometry | null;
  furnitureMaterial?: THREE.Material | null;
}

const WALL_THICKNESS = 0.12;

interface ResolvedGap {
  side: DoorSide;
  /** Gap center, measured along the wall's own axis from the room center. */
  center: number;
  width: number;
  ref?: CanonicalRef;
}

/** Builds the wall segments for one straight wall run (length `runLength`,
 * centered at the room's own center along the wall's axis) after
 * subtracting every gap that targets it, sorted so segments never overlap
 * even when two gaps are supplied on the same wall. */
function segmentsForWall(runLength: number, gaps: ResolvedGap[]): Array<{ center: number; length: number }> {
  if (gaps.length === 0) return [{ center: 0, length: runLength }];
  const half = runLength / 2;
  const sorted = [...gaps].sort((a, b) => a.center - b.center);
  const segments: Array<{ center: number; length: number }> = [];
  let cursor = -half;
  for (const gap of sorted) {
    const gapStart = gap.center - gap.width / 2;
    const gapEnd = gap.center + gap.width / 2;
    const segLength = gapStart - cursor;
    if (segLength > 0.05) segments.push({ center: cursor + segLength / 2, length: segLength });
    cursor = Math.max(cursor, gapEnd);
  }
  const tailLength = half - cursor;
  if (tailLength > 0.05) segments.push({ center: cursor + tailLength / 2, length: tailLength });
  return segments;
}

/** One addressable interior space. Fades via useRoomOpacity, which
 * combines level-scope isolation with interior room-focus. */
export function InteriorRoom({
  ref_,
  label,
  ownerLevelRef,
  interiorRef,
  x,
  z,
  width,
  depth,
  wallHeight = 2.4,
  doorSide = "south",
  doorWidth = 1.0,
  doorRef,
  doors,
  floorMaterial,
  wallMaterial,
  furnitureGeometry,
  furnitureMaterial,
}: InteriorRoomProps) {
  const floorRef = useRef<THREE.Mesh>(null);
  const wallRef = useRef<THREE.Mesh>(null);
  const ceilingRef = useRef<THREE.Mesh>(null);
  const furnitureRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  // Room "selection" is communicated by room-focus dimming siblings (see
  // useRoomOpacity) rather than a material swap — kept for the debug panel
  // and future room-scoped UI, not for a highlight color here.
  useIsSelected(ref_);

  useRoomOpacity(ownerLevelRef, interiorRef, ref_, floorRef);
  useRoomOpacity(ownerLevelRef, interiorRef, ref_, wallRef);
  useCeilingOpacity(ownerLevelRef, interiorRef, ref_, ceilingRef);
  useRoomOpacity(ownerLevelRef, interiorRef, ref_, furnitureRef);

  const floorGeometry = useMemo(() => new THREE.BoxGeometry(width, 0.08, depth), [width, depth]);

  const effectiveDoors: DoorOpening[] = useMemo(() => doors ?? (doorSide ? [{ side: doorSide, width: doorWidth, ref: doorRef }] : []), [doors, doorSide, doorWidth, doorRef]);

  const resolvedGaps: ResolvedGap[] = useMemo(
    () => effectiveDoors.map((d) => ({ side: d.side, center: d.offset ?? 0, width: Math.min(d.width ?? 1.0, Math.max(width, depth) - 0.6), ref: d.ref })),
    [effectiveDoors, width, depth]
  );

  const wallGeometry = useMemo(() => {
    const hw = width / 2;
    const hd = depth / 2;
    const y = wallHeight / 2;
    const specs: BoxSpec[] = [];

    function addAlongX(zPos: number, side: DoorSide) {
      const gaps = resolvedGaps.filter((g) => g.side === side);
      for (const seg of segmentsForWall(width, gaps)) {
        specs.push({ size: [seg.length, wallHeight, WALL_THICKNESS], position: [seg.center, y, zPos] });
      }
    }
    function addAlongZ(xPos: number, side: DoorSide) {
      const gaps = resolvedGaps.filter((g) => g.side === side);
      for (const seg of segmentsForWall(depth, gaps)) {
        specs.push({ size: [WALL_THICKNESS, wallHeight, seg.length], position: [xPos, y, seg.center] });
      }
    }

    addAlongX(-hd, "south");
    addAlongX(hd, "north");
    addAlongZ(-hw, "west");
    addAlongZ(hw, "east");

    return mergedBoxGeometry(specs);
  }, [width, depth, wallHeight, resolvedGaps]);

  // The door openings' own selectable hit targets, one per resolvedGap
  // that carries a ref — positioned at the exact same gap the wall
  // geometry above already carves out. Invisible (opacity 0, not
  // visible=false — a transparent mesh still raycasts normally in
  // three.js) because no door leaf/assembly geometry exists to actually
  // render for most internal openings (see InteriorRoomProps.doors's own
  // docstring) — a handful of rooms get a REAL leaf via a separate
  // HingedDoor placed by the caller at the same gap position instead.
  const doorHitTargets = useMemo(() => {
    const hw = width / 2;
    const hd = depth / 2;
    return resolvedGaps
      .filter((g) => g.ref)
      .map((g) => {
        if (g.side === "south") return { ref: g.ref!, size: [g.width, wallHeight, WALL_THICKNESS] as [number, number, number], position: [g.center, wallHeight / 2, -hd] as [number, number, number] };
        if (g.side === "north") return { ref: g.ref!, size: [g.width, wallHeight, WALL_THICKNESS] as [number, number, number], position: [g.center, wallHeight / 2, hd] as [number, number, number] };
        if (g.side === "west") return { ref: g.ref!, size: [WALL_THICKNESS, wallHeight, g.width] as [number, number, number], position: [-hw, wallHeight / 2, g.center] as [number, number, number] };
        return { ref: g.ref!, size: [WALL_THICKNESS, wallHeight, g.width] as [number, number, number], position: [hw, wallHeight / 2, g.center] as [number, number, number] };
      });
  }, [resolvedGaps, width, depth, wallHeight]);
  const doorMaterial = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), []);

  // A thin ceiling plane (Phase 11 section 16). Phase 13: gets its own
  // cloned material instance (rather than sharing wallMaterial's, as
  // before) because useCeilingOpacity now needs to fade it independently
  // of the walls — the ceiling opens up in any engineering layer to reveal
  // the concealed service void above (see ServiceVoidZone), while walls
  // stay solid so the room doesn't visually disappear.
  const ceilingGeometry = useMemo(() => new THREE.BoxGeometry(width, 0.06, depth), [width, depth]);
  const ceilingMaterial = useMemo(() => wallMaterial.clone(), [wallMaterial]);
  const hoverHandlers = useCanonicalHoverHandlers({ ref: ref_, kind: "room", label });

  return (
    <group position={[x, 0, z]}>
      <mesh
        ref={floorRef}
        geometry={floorGeometry}
        material={floorMaterial}
        position={[0, 0.04, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          select({ ref: ref_, kind: "room", label, parentRef: interiorRef });
        }}
        {...hoverHandlers}
      />
      <mesh ref={wallRef} geometry={wallGeometry} material={wallMaterial} castShadow receiveShadow />
      {doorHitTargets.map((d) => (
        <mesh
          key={d.ref}
          position={d.position}
          material={doorMaterial}
          onClick={(e) => {
            e.stopPropagation();
            select({ ref: d.ref, kind: "door", label: `${label} Door`, parentRef: ref_ });
          }}
        >
          <boxGeometry args={d.size} />
        </mesh>
      ))}
      <mesh ref={ceilingRef} geometry={ceilingGeometry} material={ceilingMaterial} position={[0, wallHeight, 0]} receiveShadow />
      {furnitureGeometry && furnitureMaterial && <mesh ref={furnitureRef} geometry={furnitureGeometry} material={furnitureMaterial} castShadow receiveShadow />}
    </group>
  );
}
