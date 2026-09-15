// Apartment A Full Interior Reality V1 (Parts 26-30) — the persistent,
// compact spatial navigator. Visually subordinate to the 3D Twin by
// construction: fixed small size, no expand-to-fullscreen affordance, no
// separate "Map page" — a corner overlay, exactly like a game minimap.
//
// Reuses the generic FloorPlan2D engine primitive for rendering and
// resolveSpatialMapContext() for the live position dot — this file only
// supplies Luna's own data (which FloorPlanSpec applies, canonical refs)
// and the two-stage LOCATE/ENTER dispatch, never a second drawing or
// coordinate system.

import { FloorPlan2D, type FloorPlanSpec, type FloorPlanUnitState } from "../engine/components/FloorPlan2D";
import { GLASS_SURFACE } from "../engine/components/spatial/glassStyle";
import type { CanonicalRef } from "../engine/types";
import type { NavigationMode } from "../engine/spatial/route";
import type { SpatialMapContext } from "./lunaSpatialFrame";
import { roomTintColor } from "./policy/lunaFloorPlans";
import { NavigationModeToggle } from "./NavigationModeToggle";

const UNIT_STATE: FloorPlanUnitState = { tone: "normal", statusLabel: "" };

export interface LunaSpatialMapProps {
  spec: FloorPlanSpec;
  selectedRef: CanonicalRef | null;
  onLocate: (ref: CanonicalRef) => void;
  mapContext: SpatialMapContext;
  /** Part 31-32 — the ONE authoritative session navigation-mode preference,
   * exposed here (not duplicated in any other panel) since this map is the
   * one place ENTER actually happens from a 2D destination pick. */
  navigationMode: NavigationMode;
  onSetNavigationMode: (mode: NavigationMode) => void;
}

/** Part 10 — the smallest clear visual treatment for a position that
 * isn't truthfully on the represented plan: a subdued label, never a
 * fake dot placed somewhere plausible-looking. */
function offFloorLabel(mapContext: SpatialMapContext): string | null {
  if (mapContext.kind !== "off-floor") return null;
  return "Off floor";
}

export function LunaSpatialMap({ spec, selectedRef, onLocate, mapContext, navigationMode, onSetNavigationMode }: LunaSpatialMapProps) {
  const { width, depth } = spec.outline;
  const dotLocal = mapContext.kind !== "off-floor" ? mapContext.local : null;
  const unitStates: Record<string, FloorPlanUnitState> = {};
  for (const u of spec.units) unitStates[u.ref] = UNIT_STATE;
  const mapHeight = 176 * (depth / width);

  return (
    <div
      data-luna-spatial-map={spec.levelRef}
      style={{
        ...GLASS_SURFACE,
        position: "absolute",
        left: 14,
        bottom: 14,
        width: 176,
        padding: 8,
        zIndex: 15,
        pointerEvents: "auto",
      }}
    >
      <NavigationModeToggle mode={navigationMode} onSetMode={onSetNavigationMode} />
      <div style={{ position: "relative", width: "100%", height: Math.min(mapHeight, 220) }}>
        <FloorPlan2D
          livePosition={dotLocal}
          spec={spec}
          unitStates={unitStates}
          selectedRef={selectedRef}
          onSelectUnit={onLocate}
          toneColor={() => "#7c8aa0"}
          roomTintColor={roomTintColor}
        />
        {offFloorLabel(mapContext) && (
          <div style={{ position: "absolute", top: 4, right: 6, fontSize: 9, opacity: 0.55, letterSpacing: "0.04em", textTransform: "uppercase" }}>{offFloorLabel(mapContext)}</div>
        )}
      </div>
    </div>
  );
}
