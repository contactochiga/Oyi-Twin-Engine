import { LUNA_LEVELS, LUNA_CORES } from "../lunaProgramme";
import type { CameraFlightTarget } from "../../engine/components/CameraRig";

// Four-lift generalization — the reusable elevator subsystem's config
// registry. Lift 02 remains the proven reference: its shaft sits at X=0,
// so every camera offset below was originally tuned against that X. Other
// lifts reuse the exact same relative framing, just re-centered on their
// own shaft's real core position (from LUNA_CORES — never invented here).
export interface LiftDefinition {
  ref: string;
  label: string;
  shortLabel: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  kind: "passenger" | "service";
}

export function coreFor(ref: string) {
  const core = LUNA_CORES.find((c) => c.ref === ref);
  if (!core) throw new Error(`No LUNA_CORES entry for lift ref "${ref}" — refusing to invent a shaft position.`);
  return core;
}

export const LIFT_DEFINITIONS: LiftDefinition[] = [
  { ref: "LUNA-LIFT-PASS-01", label: "Passenger Lift 01", shortLabel: "Lift 01", kind: "passenger", ...pick(coreFor("LUNA-LIFT-PASS-01")) },
  { ref: "LUNA-LIFT-PASS-02", label: "Passenger Lift 02", shortLabel: "Lift 02", kind: "passenger", ...pick(coreFor("LUNA-LIFT-PASS-02")) },
  { ref: "LUNA-LIFT-PASS-03", label: "Passenger Lift 03", shortLabel: "Lift 03", kind: "passenger", ...pick(coreFor("LUNA-LIFT-PASS-03")) },
  { ref: "LUNA-LIFT-SERVICE-01", label: "Service / Fire Elevator", shortLabel: "Service Lift", kind: "service", ...pick(coreFor("LUNA-LIFT-SERVICE-01")) },
];
function pick(core: { x: number; z: number; width: number; depth: number }) {
  return { x: core.x, z: core.z, width: core.width, depth: core.depth };
}

const LIFT_REFS = new Set(LIFT_DEFINITIONS.map((d) => d.ref));
export function isLiftRef(ref: unknown): boolean {
  return typeof ref === "string" && LIFT_REFS.has(ref);
}
export function liftDefinition(ref: string): LiftDefinition | undefined {
  return LIFT_DEFINITIONS.find((d) => d.ref === ref);
}

/** Kept as the one already-verified identity other modules may still
 * reference directly (e.g. a sensible default before any lift is
 * selected) — no longer the only lift the runtime/UI knows about. */
export const LIFT_02_REF = "LUNA-LIFT-PASS-02";
export const LIFT_CORE = coreFor(LIFT_02_REF);

/** Reference stops use the CURRENT registry revision. PH/Roof are not admitted.
 * Shared across all four lifts — DD06 defines one stop matrix for the whole
 * system; nothing in this phase requires per-lift stop lists. */
export const LIFT_STOPS = LUNA_LEVELS.filter(l => !["LUNA-PENTHOUSE", "LUNA-ROOFTOP"].includes(l.ref)).map(l => ({ ref: l.ref, label: l.label, y: l.baseElevation }));
export const liftStop = (ref: unknown) => LIFT_STOPS.find(s => s.ref === ref);
export type LiftView = "shaft" | "follow" | "lobby" | "interior" | "engineering" | "structure";
export const isLiftTracking = (view: LiftView | null) => view === "follow" || view === "interior";
export function nearestLiftFloor(y: number): string {
  return LIFT_STOPS.reduce((a, b) => Math.abs(a.y - y) <= Math.abs(b.y - y) ? a : b).ref;
}
/** Camera offsets were tuned against Lift 02's shaft at X=0 — `shaftX`
 * re-centers the same relative framing on any lift's real shaft position.
 * Z is shared across all lifts (the whole core cluster sits at Z≈0), so
 * only X needs to travel with the lift. */
export function liftCamera(view: LiftView, y: number, shaftX = 0): CameraFlightTarget {
  if (view === "interior") return { position: [shaftX, y + 1.65, -0.65], target: [shaftX, y + 1.65, 2], fov: 72, minDistance: 0.1 };
  if (view === "lobby") return { position: [shaftX, y + 1.65, 5], target: [shaftX, y + 1.35, 0], fov: 58, minDistance: 0.2 };
  if (view === "shaft" || view === "structure") return { position: [shaftX + 10, 24, 65], target: [shaftX, 23, 0], fov: 55, minDistance: 3 };
  return { position: [shaftX + 6, y + 4, 10], target: [shaftX, y + 1.3, 0], fov: 52, minDistance: 1 };
}

/** Coordination interfaces only, not commissioned connectivity or new assets. */
export const LIFT_REFERENCE_INTERFACES = [
  { ref: "LUNA-B1-ELECTRICAL-MDB-01", label: "Power interface", system: "electrical" },
  { ref: "LUNA-B1-FIRE-PANEL-01", label: "Fire recall interface", system: "fire" },
  { ref: "LUNA-GROUND-ACCESS-LIFT-LOBBY-01", label: "Lobby access interface", system: "access" },
  { ref: "LUNA-EDGE-CORE-01", label: "Edge / telemetry interface", system: "network-edge" },
] as const;
