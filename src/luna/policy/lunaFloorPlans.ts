// Luna Residences — 2D floor plan data for residential levels (Phase 8).
// Derives directly from the same canonical unit records the 3D massing
// already uses (LUNA_L06_UNITS's planX/planZ/planWidth/planDepth, added
// alongside the existing gridX/gridZ fields Phase 3 already relies on) —
// this is a second representation of the same identities, not a separate
// drawing invented for this phase.

import type { FloorPlanDoorSpec, FloorPlanFurnitureSpec, FloorPlanSpec, FloorPlanUnitSpec, FloorPlanUnitState, UnitStatusTone } from "../../engine/components/FloorPlan2D";
import type { OperationalAssetRecord } from "../../engine/twinData";
import type { RuntimeAssetState } from "../../engine/twinRuntime";
import type { UnitLifecycleState } from "../../engine/representationPolicy";
import type { RoomLayoutSpec } from "../interiors/lunaInteriors";
import type { DoorOpening, DoorSide } from "../../engine/components/InteriorRoom";
import type { FloorTint } from "../lunaMaterials";
import { LUNA_LEVELS, LUNA_L06_UNITS, LUNA_CORES } from "../lunaProgramme";
import { unitLifecycleState } from "./lunaUnitLifecycle";
import { residentialUnitsForLevel, residentialUnit, RESIDENTIAL_CORE_BAND, LUNA_L10_CANONICAL_UNIT } from "../lunaResidentialUnits";
import { L06_LOBBY, L06_STAIR_LINK_WEST, L06_STAIR_LINK_EAST, L06_APARTMENT_DOORS } from "../architecture/l06FloorPlate";

import { SYSTEM_COLOR } from "../operational/systemPresentation";
import { LUNA_INTERIORS } from "../interiors/lunaInteriors";
import { lunaTwinDataProvider } from "../operational/lunaTwinDataProvider";

// Spatial Card + 2D Plan Visual Convergence V1 (Part 11.B/11.E/12) — real
// door swings and furniture silhouettes for a room's own 2D representation,
// derived from the EXACT SAME data (RoomLayoutSpec.doors/doorSide and
// .furniture) that already places the real door opening and real furniture
// in this room's real 3D interior (InteriorRoom.tsx's own wall/gap
// convention below, mirrored exactly so the 2D swing lands on the same
// wall/side the 3D gap actually is) — never invented geometry.
function apartmentDoorSpecsForRoom(room: RoomLayoutSpec): FloorPlanDoorSpec[] {
  const openings: DoorOpening[] = room.doors ?? (room.doorSide ? [{ side: room.doorSide }] : []);
  const opposite: Record<DoorSide, DoorSide> = { north: "south", south: "north", east: "west", west: "east" };
  return openings.map((d, i) => {
    const width = d.width ?? 0.9;
    const offset = d.offset ?? 0;
    const horizontal = d.side === "north" || d.side === "south";
    const x = horizontal ? room.x + offset : room.x + (d.side === "west" ? -room.width / 2 : room.width / 2);
    const z = horizontal ? room.z + (d.side === "south" ? -room.depth / 2 : room.depth / 2) : room.z + offset;
    return {
      ref: d.ref ?? `${room.ref}-DOOR-${i}`,
      x,
      z,
      width,
      wall: d.side,
      // Rendering-only hinge convention (no hinge side exists in the real
      // 3D data, which only models the gap itself) — deterministic from
      // the opening's own offset so adjacent doors don't visually collide.
      hinge: horizontal ? (offset <= 0 ? "left" : "right") : offset <= 0 ? "top" : "bottom",
      swingInto: opposite[d.side],
    };
  });
}

function furnitureFootprint(room: RoomLayoutSpec): FloorPlanFurnitureSpec[] {
  return room.furniture.map((f) => ({ x: f.position[0], z: f.position[2], width: f.size[0], depth: f.size[2], rotation: f.rotationY }));
}

// Part 12 — a stable, real semantic room-type color, one step removed from
// the exact same FloorTint that already picks this room's real 3D floor
// material (lunaMaterials.ts) — not a palette invented purely for the plan.
const ROOM_TINT_COLOR: Record<FloorTint, string> = {
  living: "#5b8fd6",
  kitchen: "#e8a33d",
  bedroom: "#8e6fe0",
  bathroom: "#4fb8c9",
  wet: "#4fb8c9",
  outdoor: "#5fae7a",
  neutral: "#7c8aa0",
};
export function roomTintColor(tint: string): string | undefined {
  return ROOM_TINT_COLOR[tint as FloorTint];
}

const LUNA_L06_LEVEL = LUNA_LEVELS.find((l) => l.ref === "LUNA-L06")!;

// L06 Gold Standard (Parts 4/12) — real unit type per apartment (A=3BED,
// B=3BED, C=2BED, D=2BED), read from the SAME lunaResidentialUnits.ts
// record the Level/Apartment context cards already use, not a second
// hand-typed label.
const L06_UNIT_TYPE_BY_REF = new Map(residentialUnitsForLevel("LUNA-L06").map((u) => [u.ref, u.unitType]));

// L06 Gold Standard (Part 6/7/9/10) — the real coordinated core: 3
// passenger lifts, the service/fire lift, the riser, and both protected
// stairs, exactly as LUNA_CORES already defines them (no second hand-typed
// core rectangle) — plus the real Lift Lobby and stair-link corridors
// this phase adds (l06FloorPlate.ts), coordination-checked to be
// non-overlapping with every apartment and every core element.
const L06_CORE_REGIONS: FloorPlanUnitSpec[] = LUNA_CORES.map((c) => ({
  ref: c.ref,
  label: c.label,
  kind: "core" as const,
  shortLabel: c.label.includes("Stair") ? "Stairs" : c.label.includes("Riser") ? "Riser" : c.label.includes("Service") ? "Service" : `Lift ${c.ref.slice(-2)}`,
  x: c.x,
  z: c.z,
  width: c.width,
  depth: c.depth,
}));

const L06_CIRCULATION_REGIONS: FloorPlanUnitSpec[] = [
  { ref: L06_LOBBY.ref, label: L06_LOBBY.label, kind: "room" as const, x: L06_LOBBY.x, z: L06_LOBBY.z, width: L06_LOBBY.width, depth: L06_LOBBY.depth },
  { ref: L06_STAIR_LINK_WEST.ref, label: L06_STAIR_LINK_WEST.label, kind: "room" as const, x: L06_STAIR_LINK_WEST.x, z: L06_STAIR_LINK_WEST.z, width: L06_STAIR_LINK_WEST.width, depth: L06_STAIR_LINK_WEST.depth },
  { ref: L06_STAIR_LINK_EAST.ref, label: L06_STAIR_LINK_EAST.label, kind: "room" as const, x: L06_STAIR_LINK_EAST.x, z: L06_STAIR_LINK_EAST.z, width: L06_STAIR_LINK_EAST.width, depth: L06_STAIR_LINK_EAST.depth },
];

// L06 Gold Standard (Part 15/16) — real door swings, one per apartment
// entrance, oriented away from the lobby into the apartment (no two doors
// swing toward each other: A/C hinge left+swing-into-own-unit, B/D hinge
// right+swing-into-own-unit — see l06FloorPlate.ts's own L06_APARTMENT_DOORS).
const L06_DOORS: FloorPlanDoorSpec[] = L06_APARTMENT_DOORS.map((d) => ({
  ref: d.ref,
  label: d.label,
  x: d.x,
  z: d.z,
  width: d.width,
  wall: d.facing,
  hinge: d.hinge,
  swingInto: d.facing === "north" ? "south" : "north",
}));

// Part 12 — one stable, low-saturation tint per real apartment letter
// (A-D), used only for LEVEL-view identity so the four units read as
// distinct real homes without competing with status/selection color.
const L06_UNIT_IDENTITY_COLOR: Record<string, string> = { A: "#6d90c2", B: "#8a7ecb", C: "#5fae9b", D: "#c08a6a" };

export const LUNA_L06_FLOOR_PLAN: FloorPlanSpec = {
  levelRef: "LUNA-L06",
  label: LUNA_L06_LEVEL.label,
  outline: LUNA_L06_LEVEL.footprint,
  // The old single-rectangle "core" concept is superseded by the real,
  // individually-coordinated core elements + circulation zones below
  // (Part 16: "do not make it a generic four-box diagram") — kept as a
  // zero-size placeholder so the FloorPlanSpec shape stays satisfied.
  core: { x: 0, z: 0, width: 0, depth: 0 },
  units: [
    ...LUNA_L06_UNITS.map((unit) => ({
      ref: unit.ref,
      label: unit.label,
      kind: "unit" as const,
      unitType: L06_UNIT_TYPE_BY_REF.get(unit.ref) ?? "Residential",
      // Part 12 — a stable, low-saturation apartment-identity tint at LEVEL
      // view (deterministic per real unit-letter suffix, not random), quiet
      // enough that a real status tone (attention/maintenance, checked
      // first in FloorPlan2D) or the selected state still wins visually.
      color: L06_UNIT_IDENTITY_COLOR[unit.ref.slice(-1)] ?? "#7c8aa0",
      x: unit.planX,
      z: unit.planZ,
      width: unit.planWidth,
      depth: unit.planDepth,
    })),
    ...L06_CORE_REGIONS,
    ...L06_CIRCULATION_REGIONS,
  ],
  doors: L06_DOORS,
};

// L06 Gold Standard (Part 32) — real circulation edges for the navigation
// graph and Oyi alias resolution to consume, derived from the SAME
// rectangles the 2D plan and 3D architecture both render, not a
// hand-drawn graph invented separately. See lunaSpatialModel.ts.
export const LUNA_L06_CIRCULATION_REFS = {
  lobbyRef: L06_LOBBY.ref,
  stairLinkRefs: [L06_STAIR_LINK_WEST.ref, L06_STAIR_LINK_EAST.ref],
};

// LUNA-L10's floor plan shows its one real, canonical premium residence
// (LUNA-L10-APT-A) rather than the Phase 16A generated 3-unit premium
// layout — Phase 3 modeled L10 as a single representative residence on
// purpose (see lunaResidentialUnits.ts's own note), so its plan stays
// faithful to that instead of implying two more units exist that were
// never actually placed in the 3D massing.
const LUNA_L10_FLOOR_PLAN: FloorPlanSpec = {
  levelRef: "LUNA-L10",
  label: LUNA_LEVELS.find((l) => l.ref === "LUNA-L10")!.label,
  outline: LUNA_LEVELS.find((l) => l.ref === "LUNA-L10")!.footprint,
  core: { x: 0, z: 0, width: RESIDENTIAL_CORE_BAND.planWidth, depth: RESIDENTIAL_CORE_BAND.planDepth, label: "Core" },
  units: [
    {
      ref: LUNA_L10_CANONICAL_UNIT.ref,
      label: LUNA_L10_CANONICAL_UNIT.label,
      unitType: "3 Bed Premium",
      x: LUNA_L10_CANONICAL_UNIT.x,
      z: LUNA_L10_CANONICAL_UNIT.z,
      width: LUNA_L10_CANONICAL_UNIT.width,
      depth: LUNA_L10_CANONICAL_UNIT.depth,
    },
  ],
};

// Phase 16A — every other standard/premium residential level gets a
// generated plan from lunaResidentialUnits.ts's own generated unit
// records (see that file's disclosure header: deterministic reference
// data, not backend-real, except where it re-uses L06/L10's real rows).
function generatedFloorPlan(levelRef: string): FloorPlanSpec {
  const level = LUNA_LEVELS.find((l) => l.ref === levelRef)!;
  const units = residentialUnitsForLevel(levelRef);
  return {
    levelRef,
    label: level.label,
    outline: level.footprint,
    core: { x: 0, z: 0, width: RESIDENTIAL_CORE_BAND.planWidth, depth: RESIDENTIAL_CORE_BAND.planDepth, label: "Core" },
    units: units.map((unit) => ({
      ref: unit.ref,
      label: unit.label.replace(/ — .*/, ""),
      unitType: unit.unitType,
      x: unit.planX,
      z: unit.planZ,
      width: unit.planWidth,
      depth: unit.planDepth,
    })),
  };
}

const GENERATED_LEVEL_REFS = ["LUNA-L02", "LUNA-L03", "LUNA-L04", "LUNA-L05", "LUNA-L07", "LUNA-L08", "LUNA-L09", "LUNA-L11", "LUNA-L12"];

/** Every residential level now has a 2D plan: L06 uses its original
 * hand-authored (real, backend-seeded) spec unchanged, L10 shows its one
 * real premium unit, and every other residential level (L02-L05,
 * L07-L09, L11-L12) gets a Phase 16A generated plan from
 * lunaResidentialUnits.ts. Penthouse remains outside this map (it's a
 * single-unit level covered directly by its own interior, not a
 * multi-unit plan). */
export const LUNA_FLOOR_PLANS: Record<string, FloorPlanSpec> = {
  "LUNA-L06": LUNA_L06_FLOOR_PLAN,
  "LUNA-L10": LUNA_L10_FLOOR_PLAN,
  ...Object.fromEntries(GENERATED_LEVEL_REFS.map((ref) => [ref, generatedFloorPlan(ref)])),
};

// Existing modeled room rectangles and asset positions, never inferred room walls.
// Penthouse uses its existing whole-level unit footprint (no private room disclosure).
for (const ref of ["LUNA-B1", "LUNA-GROUND", "LUNA-L01-AMENITIES", "LUNA-PENTHOUSE", "LUNA-ROOFTOP"]) {
  const level = LUNA_LEVELS.find((l) => l.ref === ref)!;
  const interior = LUNA_INTERIORS.find((i) => i.ownerLevelRef === ref);
  const regions: FloorPlanSpec["units"] = ref === "LUNA-PENTHOUSE"
    ? [{ ref, label: "Penthouse", unitType: "Private residence", kind: "unit", x: 0, z: 0, ...level.footprint }]
    : (interior?.rooms ?? []).map((r) => ({ ref: r.ref, label: r.label, x: r.x, z: r.z, width: r.width, depth: r.depth, kind: "room" }));
  if (ref !== "LUNA-PENTHOUSE") regions.unshift(...LUNA_CORES.filter((c) => Math.abs(c.x) + c.width / 2 <= level.footprint.width / 2 && Math.abs(c.z) + c.depth / 2 <= level.footprint.depth / 2).map((c) => ({ ...c, shortLabel: c.label.includes("Stair") ? "Stairs" : c.label.includes("Riser") ? "Riser" : c.label.includes("Service") ? "Service" : `Lift ${c.ref.slice(-2)}`, kind: "core" as const })));
  if (ref === "LUNA-B1") {

    regions.push(...lunaTwinDataProvider.listAssets().filter((a) => a.ownerLevelRef === ref && !a.unitRef).map((a) => ({ ref: a.ref, label: a.label, x: a.position.x, z: a.position.z, width: 1.8, depth: 1.8, color: SYSTEM_COLOR[a.system], kind: "asset" as const })));
  }
  // B1 placements include equipment just beyond the podium massing footprint.
  const width = Math.max(level.footprint.width, ...regions.map((r) => 2 * Math.abs(r.x) + r.width));
  const depth = Math.max(level.footprint.depth, ...regions.map((r) => 2 * Math.abs(r.z) + r.depth));
  LUNA_FLOOR_PLANS[ref] = { levelRef: ref, label: level.label, outline: { width, depth }, core: { x: 0, z: 0, width: 0, depth: 0 }, units: regions };
}

export function floorPlanForLevel(levelRef: string): FloorPlanSpec | undefined {
  return LUNA_FLOOR_PLANS[levelRef];
}

// Apartment A Full Interior Reality V1 (Part 26) — the compact persistent
// map's second, progressive layer: Apartment A's own real 14-room interior
// plan, in the SAME local frame lunaInteriors.ts's room.x/room.z already
// use (apartment-center origin) — the identical frame roomFocusCamera's
// own INTERIOR_ORIGIN_OFFSET subtracts a world position down to, so the
// live position dot (lunaSpatialFrame.ts) and this plan agree by
// construction, never two independently-typed coordinate systems.
const APT_A_INTERIOR = LUNA_INTERIORS.find((i) => i.interiorRef === "LUNA-L06-APT-A")!;
export const LUNA_L06_APT_A_FLOOR_PLAN: FloorPlanSpec = {
  levelRef: "LUNA-L06-APT-A",
  label: "Apartment A",
  outline: { width: 15.652174, depth: 12.173913 }, // L06_UNIT_BOXES["LUNA-L06-APT-A"] — the real, unchanged massing envelope
  core: { x: 0, z: 0, width: 0, depth: 0 },
  units: APT_A_INTERIOR.rooms.map((r) => ({
    ref: r.ref,
    label: r.label,
    kind: "room" as const,
    x: r.x,
    z: r.z,
    width: r.width,
    depth: r.depth,
    roomTint: r.floorTint,
    furniture: furnitureFootprint(r),
  })),
  // Spatial Card + 2D Plan Visual Convergence V1 (Part 11.B) — real internal
  // door swings for Apartment A's own plan, derived per-room exactly like
  // L06_DOORS already derives the common floor's apartment ENTRANCE doors
  // above. This apartment's own plan previously had zero doors modeled.
  doors: APT_A_INTERIOR.rooms.flatMap(apartmentDoorSpecsForRoom),
};

/** Apartment A Full Interior Reality V1 — the ONE private-unit interior
 * with a real, disclosed 2D plan today (every other private unit stays
 * exterior-only, matching L06 Gold Standard's own disclosed scope
 * boundary). Building-agnostic callers should treat an undefined return as
 * "no interior plan available for this ref," not a bug. */
export function floorPlanForInterior(interiorRef: string): FloorPlanSpec | undefined {
  if (interiorRef === "LUNA-L06-APT-A") return LUNA_L06_APT_A_FLOOR_PLAN;
  return undefined;
}

const TONE_LABEL: Record<Exclude<UnitStatusTone, "unknown">, string> = {
  normal: "Occupied · Normal",
  attention: "Facility attention required",
  maintenance: "Maintenance due",
  vacant: "Available — vacant",
  reserved: "Reserved",
};

/** Privacy-safe unit status for Facility's 2D plan — derived from the
 * SAME runtime states every other Facility surface reads, but reduced to
 * a single tone/label per unit rather than per-device detail. No resident
 * device state (which light is on, curtain position, etc.) is exposed
 * here even though the underlying runtime states carry it. */
export function unitStatusForFacility(unitRef: string, assets: OperationalAssetRecord[], states: RuntimeAssetState[]): FloorPlanUnitState {
  // Phase 16A — generated units (every residential level besides L06/L10's
  // real rows) carry their own deterministic lifecycle on the residential-
  // unit record itself; lunaUnitLifecycle.ts only ever knew about the 5
  // real units, so it's consulted first (unchanged behaviour for those 5)
  // and the generated record is the fallback, not a blanket "occupied".
  const lifecycle: UnitLifecycleState = unitLifecycleState(unitRef) ?? residentialUnit(unitRef)?.lifecycle ?? "occupied";
  if (lifecycle === "available") return { tone: "vacant", statusLabel: TONE_LABEL.vacant };
  if (lifecycle === "reserved") return { tone: "reserved", statusLabel: TONE_LABEL.reserved };

  const unitAssetRefs = new Set(assets.filter((a) => a.unitRef === unitRef).map((a) => a.ref));
  const unitStates = states.filter((s) => unitAssetRefs.has(s.ref));
  if (unitStates.some((s) => s.status === "critical")) return { tone: "attention", statusLabel: TONE_LABEL.attention };
  if (unitStates.some((s) => s.status === "warning")) return { tone: "maintenance", statusLabel: TONE_LABEL.maintenance };
  return { tone: "normal", statusLabel: TONE_LABEL.normal };
}
