import type { ReactNode } from "react";
import { useState } from "react";
import { useRepresentation } from "../engine/hooks/useRepresentation";
import { findSpace, interiorForUnit } from "./interiors/lunaSpaceLookup";
import { GLASS_SURFACE, GLASS_ACCENT, useTwinData, useTwinRuntime, FloorPlan2D } from "../engine";
import { LUNA_LEVELS, LUNA_CORES } from "./lunaProgramme";
import { levelUse } from "./policy/lunaLevelUse";
import { floorPlanForLevel, unitStatusForFacility, roomTintColor } from "./policy/lunaFloorPlans";
import { residentialUnitsForLevel, residentialUnit } from "./lunaResidentialUnits";
import { unitLifecycleState } from "./policy/lunaUnitLifecycle";
import { SYSTEM_LABEL, SYSTEM_COLOR } from "./operational/systemPresentation";
import { commonInteriorForLevel } from "./interiors/lunaSpaceLookup";
import { Representation2D3DToggle } from "./Representation2D3DToggle";
import type { CanonicalRef } from "../engine/types";
import type { UnitLifecycleState } from "../engine/representationPolicy";

// A level's own lifecycle for its single canonical unit isn't always in
// lunaResidentialUnits.ts (L06/L10 keep real data elsewhere) — this small
// helper reads whichever source actually has it, without the card needing
// to know which.
function lifecycleFor(unitRef: string): UnitLifecycleState {
  return unitLifecycleState(unitRef) ?? residentialUnit(unitRef)?.lifecycle ?? "occupied";
}

const LIFECYCLE_DOT: Record<UnitLifecycleState, string> = { occupied: "#3ddc84", available: "#7c8699", reserved: "#e8a33d" };

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0" }}>
      <span style={{ opacity: 0.6 }}>{label}</span>
      <span style={{ color: valueColor, fontWeight: valueColor ? 600 : 400 }}>{value}</span>
    </div>
  );
}

interface LevelContextCardProps {
  levelRef: CanonicalRef;
  selectedUnitRef?: CanonicalRef | null;
  onFocusRegion?: (ref: CanonicalRef) => void;
  onSelectUnit: (unitRef: CanonicalRef) => void;
  onEnterLevelSpace?: (ref: CanonicalRef) => void;
  /** Spatial navigation restoration pass §7/§8 — the level's own
   * registered common-area interior (Ground Lobby, Residents' Club, Luna
   * Sky), if any. Never fabricated: undefined for every level without one
   * (B1, every plain residential floor), and this card renders nothing
   * extra in that case — no invented rooms. */
  onEnterInterior?: (interiorRef: CanonicalRef) => void;
  /** Back to the exterior building view — a level card is one step below
   * "Building" in the stack (restoration pass §9's diagram), so it gets
   * the same "‹ back" affordance every deeper card already has. */
  onExit: () => void;
  onClose: () => void;
  navigationControls?: ReactNode;
  livePosition?: { x: number; z: number } | null;
  representationMode: "2D" | "3D";
  onSetRepresentationMode: (mode: "2D" | "3D") => void;
}

/** Facility-view level card (Phase 16A §3) — content shape changes by the
 * level's own `lunaLevelUse` classification, built entirely from
 * canonical Luna data (never hardcoded to one level): residential levels
 * get a real floor plan + unit list + common areas; plant/common/amenity/
 * rooftop levels get a summary appropriate to what they actually are —
 * and, when the level has a registered common-area interior (Ground,
 * Residents' Club, Rooftop), that interior's real rooms plus an "Enter"
 * action, replacing the bare per-system asset tally for those levels. */
export function LevelContextCard({ levelRef, selectedUnitRef, onSelectUnit, onFocusRegion, onEnterLevelSpace, onEnterInterior, onExit, onClose, representationMode, onSetRepresentationMode, navigationControls, livePosition }: LevelContextCardProps) {
  const { identity, policy } = useRepresentation();
  const [regionRef, setRegionRef] = useState<string | null>(null);
  const twinData = useTwinData();
  const twinRuntime = useTwinRuntime();
  const level = LUNA_LEVELS.find((l) => l.ref === levelRef);
  const use = levelUse(levelRef);
  if (!level) return null;

  const plan = floorPlanForLevel(levelRef);
  const commonInterior = commonInteriorForLevel(levelRef);

  if (use === "residential" && levelRef !== "LUNA-PENTHOUSE" && plan) {
    const units = residentialUnitsForLevel(levelRef);
    // L06/L10 units aren't in lunaResidentialUnits.ts for L10 (single
    // canonical unit lives in lunaProgramme.ts) — fold that one in so the
    // list/summary is complete for every residential level uniformly.
    const unitRefs = units.length > 0 ? units.map((u) => u.ref) : plan.units.map((u) => u.ref);
    const lifecycles = unitRefs.map((ref) => lifecycleFor(ref));
    const occupied = lifecycles.filter((s) => s === "occupied").length;
    const vacant = lifecycles.filter((s) => s === "available").length;
    const reserved = lifecycles.filter((s) => s === "reserved").length;

    const assets = twinData.listAssets();
    const states = assets.map((a) => twinRuntime.getState(a.ref)).filter((s): s is NonNullable<typeof s> => Boolean(s));
    const unitStates = Object.fromEntries(plan.units.map((u) => [u.ref, unitStatusForFacility(u.ref, assets, states)]));

    const tier = units[0]?.tier ?? (levelRef === "LUNA-L10" ? "premium" : "standard");
    const tierLabel = tier === "premium" ? "Premium Residential Floor" : "Residential Floor";

    return (
      <div style={{ ...GLASS_SURFACE, width: "min(300px, 100%)", padding: "16px 18px", pointerEvents: "auto", maxHeight: "min(78vh, 640px)", overflowY: "auto" }}>
        <BackLink onClick={onExit} />
        <div data-spatial-card-breadcrumb style={{ fontSize: 9.5, opacity: 0.45, letterSpacing: "0.03em", marginTop: 4, marginBottom: 2 }}>{level.label}</div>
        <Header title={level.label} subtitle={tierLabel} badge={`${unitRefs.length} Unit${unitRefs.length === 1 ? "" : "s"}`} onClose={onClose} />

        <div style={{ display: "flex", gap: 14, marginTop: 8, marginBottom: 10, fontSize: 11 }}>
          <StatusDot color={LIFECYCLE_DOT.occupied} label={`${occupied} Occupied`} />
          <StatusDot color={LIFECYCLE_DOT.available} label={`${vacant} Vacant`} />
          <StatusDot color={LIFECYCLE_DOT.reserved} label={`${reserved} Reserved`} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
          <Representation2D3DToggle mode={representationMode} onSetMode={onSetRepresentationMode} />
        </div>
        {/* Interface convergence pass §9 — the plan itself is the primary
            selector: FloorPlan2D already renders each unit's label, type
            and colour-coded status directly on the drawing (see
            FloorPlan2D.tsx), so a second per-unit status list underneath
            duplicated the exact same information. Common areas stay
            listed below since Facility has genuine operational access to
            them and they aren't otherwise represented spatially here. */}
        <div style={{ width: "100%", aspectRatio: `${plan.outline.width} / ${plan.outline.depth}`, color: "rgba(255,255,255,0.85)" }}>
          <FloorPlan2D livePosition={livePosition} spec={plan} unitStates={unitStates} selectedRef={selectedUnitRef} onSelectUnit={onSelectUnit} roomTintColor={roomTintColor} />
        </div>

        {navigationControls}
        <CommonAreas />
      </div>
    );
  }

  const visiblePlan = plan && { ...plan, units: plan.units.filter((r) => policy.resolveMode({ ref: r.ref, identity }) !== "HIDDEN") };
  const region = visiblePlan?.units.find((r) => r.ref === regionRef);
  const found = region && findSpace(region.ref);
  const unitInterior = region?.kind === "unit" ? interiorForUnit(region.ref) : undefined;
  const canEnter = region && (unitInterior || (found && found.kind !== "level")) && policy.resolveMode({ ref: region.ref, identity }) === "FULL_3D";
  const asset = region && twinData.getAsset(region.ref);
  const state = asset && twinRuntime.getState(asset.ref);
  const useLabel: Record<string, string> = { plant: "Plant & Service Level", common: "Common / Arrival Level", amenity: "Amenity Level", rooftop: "Rooftop", residential: "Residential Floor" };
  const states = Object.fromEntries((visiblePlan?.units ?? []).map((r) => {
    const a = twinData.getAsset(r.ref);
    const runtime = a && twinRuntime.getState(a.ref);
    return [r.ref, { tone: runtime?.status === "critical" ? "attention" as const : runtime?.status === "warning" ? "maintenance" as const : "unknown" as const, statusLabel: a ? runtime?.status ?? "No telemetry" : r.kind === "unit" ? "Private residence" : "Modeled space" }];
  }));
  return (
    <div style={{ ...GLASS_SURFACE, width: "min(340px, 100%)", padding: "16px 18px", pointerEvents: "auto", maxHeight: "min(78vh, 640px)", overflowY: "auto" }}>
      <BackLink onClick={onExit} />
      <div data-spatial-card-breadcrumb style={{ fontSize: 9.5, opacity: 0.45, letterSpacing: "0.03em", marginTop: 4, marginBottom: 2 }}>{level.label}</div>
      <Header title={level.label} subtitle={useLabel[use ?? "residential"]} onClose={onClose} />
      {visiblePlan && <div style={{ marginTop: 12, aspectRatio: `${visiblePlan.outline.width} / ${visiblePlan.outline.depth}` }}>
        <FloorPlan2D livePosition={livePosition} spec={visiblePlan} unitStates={states} selectedRef={region?.ref} onSelectUnit={(ref) => { setRegionRef(ref); onFocusRegion?.(ref); }} roomTintColor={roomTintColor} />
      </div>}
      {navigationControls}
      {levelRef === "LUNA-B1" && <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 10px", marginTop: 8, fontSize: 10 }}>{[...new Set((visiblePlan?.units ?? []).flatMap((r) => { const a = twinData.getAsset(r.ref); return a ? [a.system] : []; }))].map((system) => <span key={system} style={{ color: SYSTEM_COLOR[system] }}>● {SYSTEM_LABEL[system]}</span>)}</div>}
      {levelRef === "LUNA-B1" && <p style={{ fontSize: 11, opacity: 0.65 }}>Equipment positions, lifts, stairs and risers. Parking/service room boundaries are not modeled. Select a marker to inspect it.</p>}
      {region && <div style={{ marginTop: 12, fontSize: 12 }} aria-live="polite">
        <strong>{region.label}</strong>
        <div style={{ opacity: 0.65, marginTop: 4 }}>{asset ? `${SYSTEM_LABEL[asset.system]} · ${state?.status ?? "No telemetry"}` : region.kind === "unit" ? "Private residence · operational plan" : "Modeled space"}</div>
        {canEnter && <button className="plan-enter" onClick={() => unitInterior ? onEnterInterior?.(unitInterior.interiorRef) : onEnterLevelSpace?.(region.ref)}>Enter {region.label}</button>}
      </div>}
      {commonInterior && onEnterInterior && policy.resolveMode({ ref: commonInterior.interiorRef, identity }) === "FULL_3D" && <button className="plan-enter" onClick={() => onEnterInterior(commonInterior.interiorRef)}>Enter {commonInterior.label.replace(/^.*—\s*/, "")}</button>}
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", color: GLASS_ACCENT, fontSize: 11.5, cursor: "pointer", padding: 0, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
      ‹ Exterior
    </button>
  );
}

function Header({ title, subtitle, badge, onClose }: { title: string; subtitle: string; badge?: string; onClose: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
      <div>
        <div style={{ fontSize: 17, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 1 }}>{subtitle}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {badge && (
          <span style={{ fontSize: 10, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "3px 8px", whiteSpace: "nowrap" }}>
            {badge}
          </span>
        )}
        <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", color: "inherit", opacity: 0.6, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 2 }}>
          ✕
        </button>
      </div>
    </div>
  );
}

function StatusDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5, opacity: 0.85 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {label}
    </span>
  );
}

// Building-wide core/circulation elements (lift lobby, stairs, risers,
// service corridor) — the same LUNA_CORES cluster every level shares
// (see lunaProgramme.ts). These are structural elements, not devices with
// live runtime telemetry, so "Operational" here asserts real structural
// presence/continuity (confirmed by the twin's own geometry existing and
// being unobstructed), not fabricated sensor readings.
function CommonAreas() {
  const rows: Array<{ label: string; refs: string[] }> = [
    { label: "Lift Lobby", refs: LUNA_CORES.filter((c) => c.ref.startsWith("LUNA-LIFT-PASS")).map((c) => c.ref) },
    { label: "Stairs", refs: LUNA_CORES.filter((c) => c.ref.startsWith("LUNA-STAIR")).map((c) => c.ref) },
    { label: "Risers", refs: LUNA_CORES.filter((c) => c.ref.startsWith("LUNA-RISER")).map((c) => c.ref) },
    { label: "Service Corridor", refs: LUNA_CORES.filter((c) => c.ref.startsWith("LUNA-LIFT-SERVICE")).map((c) => c.ref) },
  ].filter((r) => r.refs.length > 0);

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.5, marginBottom: 6 }}>Common Areas</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {rows.map((r) => (
          <Row key={r.label} label={r.label} value="Modeled" />
        ))}
      </div>
    </div>
  );
}
