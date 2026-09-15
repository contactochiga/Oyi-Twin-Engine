// Oyi Twin Engine — generic 2D floor/unit-plan primitive (Phase 8).
// Building-agnostic: it draws whatever `FloorPlanSpec` it's given, keyed
// entirely by canonical refs supplied by the building's own data layer
// (see src/luna/policy/lunaFloorPlans.ts for this reference building's
// spec) — it never invents geometry itself. This is a *representation* of
// the same canonical space identities the 3D engine already models, not
// an unrelated drawing: a unit's `ref` here is the exact ref its 3D
// interior (when authorized) resolves to elsewhere in the engine.

import type { CanonicalRef } from "../types";

/** Spatial Card + 2D Plan Visual Convergence V1 (Part 11.E) — a real
 * furniture footprint, projected onto the XZ plane from the SAME BoxSpec
 * data (`size`/`position`/`rotationY`) that already places this exact piece
 * in the real 3D interior (see lunaInteriors.ts's RoomLayoutSpec.furniture)
 * — never an invented decoration. `x`/`z` are room-local (room center = 0,0),
 * matching FloorPlan2D's own unit-local convention below. */
export interface FloorPlanFurnitureSpec {
  x: number;
  z: number;
  width: number;
  depth: number;
  rotation?: number;
}

export interface FloorPlanUnitSpec {
  ref: CanonicalRef;
  label: string;
  unitType?: string;
  color?: string;
  shortLabel?: string;
  kind?: "room" | "asset" | "core" | "unit";
  x: number;
  z: number;
  width: number;
  depth: number;
  /** Part 12 — a real semantic room-type tag (e.g. "kitchen"/"bedroom"),
   * sourced from the SAME data that already picks this room's real 3D floor
   * material (lunaMaterials.ts's FloorTint) — never a color chosen purely
   * for visual variety. Resolved to an actual color via `roomTintColor`;
   * left undefined this stays exactly the pre-existing tone/status coloring. */
  roomTint?: string;
  /** Part 11.E — real furniture silhouettes for this room, empty/omitted
   * when no furniture data exists for it (never fabricated to "fill" a
   * room). */
  furniture?: FloorPlanFurnitureSpec[];
}

export interface FloorPlanCoreSpec {
  x: number;
  z: number;
  width: number;
  depth: number;
  label?: string;
}

/** L06 Gold Standard (Part 15/16) — a real architectural door swing, not
 * just a rectangle boundary. `wall` is which boundary the door sits on
 * (north/south = a horizontal wall, the door's width runs along X;
 * east/west = a vertical wall, width runs along Z). `hinge` names which
 * end of that wall segment the door pivots from. `swingInto` is the
 * compass direction the leaf opens toward — computed once by whoever
 * authors the door data (it already knows which side is the room the
 * door belongs to), not inferred here, so two adjacent doors can be
 * authored to swing away from each other explicitly (Part 15: "do not
 * allow obviously colliding door swings"). */
export interface FloorPlanDoorSpec {
  ref: CanonicalRef;
  label?: string;
  x: number;
  z: number;
  width: number;
  wall: "north" | "south" | "east" | "west";
  hinge: "left" | "right" | "top" | "bottom";
  swingInto: "north" | "south" | "east" | "west";
}

export interface FloorPlanSpec {
  levelRef: CanonicalRef;
  label: string;
  outline: { width: number; depth: number };
  core: FloorPlanCoreSpec;
  units: FloorPlanUnitSpec[];
  /** Real door swings (Part 15/16) — optional so every existing spec
   * (Ground, Club, generated standard/premium levels) keeps rendering
   * unchanged without authoring doors it doesn't have real data for. */
  doors?: FloorPlanDoorSpec[];
}

export type UnitStatusTone = "normal" | "attention" | "maintenance" | "vacant" | "reserved" | "unknown";

export interface FloorPlanUnitState {
  tone: UnitStatusTone;
  statusLabel: string;
}

const DEFAULT_TONE_COLOR: Record<UnitStatusTone, string> = {
  normal: "#2f81f7",
  attention: "#e5484d",
  maintenance: "#e8a33d",
  vacant: "#5b6472",
  reserved: "#8e6fe0",
  unknown: "#3a4150",
};

interface FloorPlan2DProps {
  spec: FloorPlanSpec;
  unitStates: Record<string, FloorPlanUnitState>;
  selectedRef?: string | null;
  onSelectUnit?: (ref: CanonicalRef) => void;
  toneColor?: (tone: UnitStatusTone) => string;
  /** Part 12 — resolves a unit's real `roomTint` tag to an actual color.
   * Omitted entirely (not just a no-op default) when the caller supplies
   * no semantic room-type data, so nothing invents color meaning that
   * doesn't exist. */
  roomTintColor?: (tint: string) => string | undefined;
  className?: string;
  livePosition?: { x: number; z: number } | null;
}

export function FloorPlan2D({ spec, unitStates, selectedRef, onSelectUnit, toneColor = (t) => DEFAULT_TONE_COLOR[t], roomTintColor, className, livePosition }: FloorPlan2DProps) {
  const { width, depth } = spec.outline;
  const toSvg = (x: number, z: number) => ({ x: x + width / 2, y: z + depth / 2 });
  // Frame all source-backed regions without changing their canonical coordinates
  // or silently resizing the declared architectural envelope.
  const minX = Math.min(0, ...spec.units.map((u) => u.x - u.width / 2 + width / 2)) - .3;
  const minY = Math.min(0, ...spec.units.map((u) => u.z - u.depth / 2 + depth / 2)) - .3;
  const maxX = Math.max(width, ...spec.units.map((u) => u.x + u.width / 2 + width / 2)) + .3;
  const maxY = Math.max(depth, ...spec.units.map((u) => u.z + u.depth / 2 + depth / 2)) + .3;
  const outlineTL = toSvg(-width / 2, -depth / 2);

  return (
    <svg className={className} viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} width="100%" height="100%" role="group" aria-label={`${spec.label} operational floor plan`}>
      {/* Part 11.A — the outer envelope reads as the heaviest, most solid
          boundary; internal room/unit boundaries (below) stay a lighter
          weight, giving the plan a real wall hierarchy instead of one flat
          line weight everywhere. */}
      <rect x={outlineTL.x} y={outlineTL.y} width={width} height={depth} fill="none" stroke="currentColor" strokeOpacity={0.55} strokeWidth={0.5} />

      {(() => {
        const core = toSvg(spec.core.x - spec.core.width / 2, spec.core.z - spec.core.depth / 2);
        return (
          <g>
            <rect x={core.x} y={core.y} width={spec.core.width} height={spec.core.depth} fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeOpacity={0.3} strokeWidth={0.15} />
            {spec.core.label && (
              <text x={core.x + spec.core.width / 2} y={core.y + spec.core.depth / 2} fontSize={0.9} textAnchor="middle" dominantBaseline="middle" fill="currentColor" fillOpacity={0.6}>
                {spec.core.label}
              </text>
            )}
          </g>
        );
      })()}

      {spec.units.map((unit) => {
        const tl = toSvg(unit.x - unit.width / 2, unit.z - unit.depth / 2);
        const state = unitStates[unit.ref];
        const tone = state?.tone ?? "unknown";
        const isSelected = selectedRef === unit.ref;
        // Part 12 — semantic room-type tint wins over the generic
        // kind-gray/tone-gray defaults, but a real status (attention/
        // maintenance) still overrides it: color communicates identity
        // AND state, it never permanently loses the state signal.
        const tintColor = unit.roomTint ? roomTintColor?.(unit.roomTint) : undefined;
        const fill = tone === "attention" || tone === "maintenance" ? toneColor(tone) : unit.color ?? tintColor ?? (unit.kind ? "#b7c5d9" : toneColor(tone));
        return (
          <g key={unit.ref} role={onSelectUnit ? "button" : undefined} tabIndex={onSelectUnit ? 0 : undefined} aria-label={`${unit.label}${state ? ` · ${state.statusLabel}` : ""}`} aria-pressed={isSelected} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectUnit?.(unit.ref); } }} onClick={() => onSelectUnit?.(unit.ref)} style={{ cursor: onSelectUnit ? "pointer" : "default" }}>
            <title>{unit.label}{state ? ` — ${state.statusLabel}` : ""}</title>
            <rect
              x={tl.x}
              y={tl.y}
              width={unit.width}
              height={unit.depth}
              fill={fill}
              // Part 13 — a selected room/unit no longer becomes one giant
              // opaque block: a modest fill lift plus a crisper, brighter
              // stroke reads as "selected" while the room's own tint/
              // furniture/label underneath stay legible, not buried.
              fillOpacity={isSelected ? 0.12 : unit.kind === "asset" ? 0.7 : 0.16}
              stroke={isSelected ? "#4fd1ff" : fill}
              strokeOpacity={isSelected ? 1 : 0.55}
              strokeWidth={isSelected ? 0.16 : 0.10}
            />
            {unit.furniture?.map((f, i) => {
              const fc = toSvg(unit.x + f.x - f.width / 2, unit.z + f.z - f.depth / 2);
              const cx = fc.x + f.width / 2;
              const cy = fc.y + f.depth / 2;
              return (
                <rect
                  key={i}
                  x={fc.x}
                  y={fc.y}
                  width={f.width}
                  height={f.depth}
                  transform={f.rotation ? `rotate(${(f.rotation * 180) / Math.PI} ${cx} ${cy})` : undefined}
                  fill="currentColor"
                  fillOpacity={0.14}
                  stroke="currentColor"
                  strokeOpacity={0.22}
                  strokeWidth={0.05}
                  rx={0.08}
                />
              );
            })}
            {tone === "attention" && <circle cx={tl.x + unit.width - 1.2} cy={tl.y + 1.2} r={0.7} fill={DEFAULT_TONE_COLOR.attention} />}
            {unit.kind !== "asset" && <text x={tl.x + unit.width / 2} y={tl.y + unit.depth / 2 - 0.6} fontSize={Math.min(unit.kind === "room" ? 0.48 : 1.1, unit.width * 0.88 / Math.max((unit.shortLabel ?? unit.label).length * 0.55, 1))} fontWeight={600} textAnchor="middle" fill="currentColor">
              {unit.shortLabel ?? unit.label}
            </text>}
            {unit.unitType && (
              <text x={tl.x + unit.width / 2} y={tl.y + unit.depth / 2 + 0.7} fontSize={0.7} textAnchor="middle" fill="currentColor" fillOpacity={0.6}>
                {unit.unitType}
              </text>
            )}
            {state && !unit.kind && (
              <text x={tl.x + unit.width / 2} y={tl.y + unit.depth / 2 + 1.8} fontSize={0.6} textAnchor="middle" fill="currentColor" fillOpacity={0.75}>
                {state.statusLabel}
              </text>
            )}
          </g>
        );
      })}

      {spec.doors?.map((door) => {
        const center = toSvg(door.x, door.z);
        const horizontal = door.wall === "north" || door.wall === "south";
        // Hinge point: one end of the wall segment the door sits on.
        const hinge = horizontal
          ? { x: center.x + (door.hinge === "left" ? -door.width / 2 : door.width / 2), y: center.y }
          : { x: center.x, y: center.y + (door.hinge === "top" ? -door.width / 2 : door.width / 2) };
        // Closed-leaf endpoint: the OTHER end of the same wall segment.
        const closedEnd = horizontal
          ? { x: center.x + (door.hinge === "left" ? door.width / 2 : -door.width / 2), y: center.y }
          : { x: center.x, y: center.y + (door.hinge === "top" ? door.width / 2 : -door.width / 2) };
        // Open-leaf endpoint: swung 90 degrees from the hinge, toward swingInto.
        const openEnd = { x: hinge.x, y: hinge.y };
        if (door.swingInto === "north") openEnd.y = hinge.y - door.width;
        else if (door.swingInto === "south") openEnd.y = hinge.y + door.width;
        else if (door.swingInto === "west") openEnd.x = hinge.x - door.width;
        else openEnd.x = hinge.x + door.width;
        const sweepFlag = horizontal === (door.swingInto === "south" || door.swingInto === "east") ? 1 : 0;
        return (
          <g key={door.ref} opacity={0.85}>
            <title>{door.label ?? door.ref}</title>
            <path d={`M ${closedEnd.x} ${closedEnd.y} A ${door.width} ${door.width} 0 0 ${sweepFlag} ${openEnd.x} ${openEnd.y}`} fill="none" stroke="currentColor" strokeOpacity={0.4} strokeWidth={0.08} strokeDasharray="0.3,0.2" />
            <line x1={hinge.x} y1={hinge.y} x2={openEnd.x} y2={openEnd.y} stroke="currentColor" strokeOpacity={0.75} strokeWidth={0.12} />
          </g>
        );
      })}
      {livePosition && <circle data-luna-live-dot cx={livePosition.x + width / 2} cy={livePosition.z + depth / 2} r={Math.max(width, depth) * .018} fill="#4fd1ff" stroke="#0b1220" strokeWidth={Math.max(width, depth) * .006} pointerEvents="none" />}
    </svg>
  );
}
