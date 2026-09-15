import { useMemo } from "react";
import { OperationalAssetMarker, CurtainAssetMarker, PipeRun, CableTray, useRepresentation, representationAllows, useRuntimeAssetState } from "../../engine";
import type { OperationalAssetRecord } from "../../engine/twinData";
import { LUNA_OPERATIONAL_ASSETS } from "./lunaOperationalAssets";
import { SYSTEM_COLOR } from "./systemPresentation";
import { WaterTankGeometry, TreatmentUnitGeometry, BoosterPumpGeometry, IsolationValveGeometry } from "./WaterPlantEquipment";
import { SwitchboardCabinetGeometry, ATSCabinetGeometry, GeneratorSetGeometry, InverterCabinetGeometry, ElectricityMeterGeometry, DistributionBoardGeometry } from "./ElectricalPlantEquipment";
import { useBuildingPowerState } from "../runtime/lunaPowerResolver";
import { FireAlarmPanelGeometry, FirePumpGeometry, FireTankGeometry, SmokeDetectorGeometry } from "./FirePlantEquipment";
import { OutdoorCondenserGeometry, IndoorUnitGeometry } from "./HvacPlantEquipment";
import { AccessReaderPanelGeometry, AccessLockKeypadGeometry } from "./AccessPlantEquipment";
import { CameraGeometry } from "./CctvPlantEquipment";
import { CCTV_CAMERA_REFS } from "../runtime/lunaCameraResolver";
import { NetworkRackUnitGeometry, WifiApGeometry, NetworkTerminationBoxGeometry } from "./NetworkPlantEquipment";
import { DrainPointGeometry, DischargeChamberGeometry, VentCapGeometry, RoofDrainGeometry, DownpipeGeometry } from "./DrainagePlantEquipment";

// Domestic Water Reference System V1 (Part D) — recognizable reference
// equipment for the B1 water plant's specific canonical refs, dispatched
// by exact ref (there are only a handful, and it keeps tank/treatment/pump/
// valve visually distinct rather than inferring shape from type, which
// several unrelated non-water assets also share). Every other water asset
// (risers, branches, distribution points, meters) keeps the generic marker.
const WATER_EQUIPMENT_KIND: Record<string, "tank" | "treatment" | "pump" | "valve"> = {
  "LUNA-B1-WATER-TANK-01": "tank",
  "LUNA-B1-WATER-TREAT-01": "treatment",
  "LUNA-B1-WATER-BP-01": "pump",
  "LUNA-B1-WATER-BP-02": "pump",
  "LUNA-B1-WATER-VALVE-01": "valve",
  "LUNA-L06-APT-A-UTILITY-VALVE-01": "valve",
};

// Electrical System V1 — same by-exact-ref dispatch pattern as
// WATER_EQUIPMENT_KIND above. GRID-01 and MDB-01 both use "switchboard":
// the accepted equipment schedule has no separate registered switchgear/
// transformer instance (EQ-TRANSFORMER has "no registered instance yet"),
// so MDB-01 fills both the "main intake/distribution" and "switchgear/
// protection" conceptual slots the reference chain describes rather than
// a new asset being invented for the gap.
const ELECTRICAL_EQUIPMENT_KIND: Record<string, "switchboard" | "ats" | "generator" | "inverter" | "meter" | "db"> = {
  "LUNA-B1-ELECTRICAL-GRID-01": "switchboard",
  "LUNA-B1-ELECTRICAL-MDB-01": "switchboard",
  "LUNA-B1-ELECTRICAL-ATS-01": "ats",
  "LUNA-B1-ELECTRICAL-GEN-01": "generator",
  "LUNA-B1-ELECTRICAL-INV-01": "inverter",
  "LUNA-B1-ELECTRICAL-METER-01": "meter",
  "LUNA-L06-APT-A-METER-ELEC-01": "meter",
  "LUNA-L06-APT-A-DB-01": "db",
};

// HVAC System V1 — same by-exact-ref dispatch pattern. The outdoor
// condenser and the two indoor split units are visually distinct
// equipment categories (cabinet-with-fan vs. wall-mounted terminal), not
// one shared "hvac box" shape.
const HVAC_EQUIPMENT_KIND: Record<string, "outdoor" | "indoor"> = {
  "LUNA-L06-APT-A-AC-OUTDOOR-01": "outdoor",
  "LUNA-L06-APT-A-LIVING-AC-01": "indoor",
  "LUNA-L06-APT-A-BED-01-AC-01": "indoor",
};

// Access & Security System V1 — same by-exact-ref dispatch pattern. The
// three common access points share one "reader panel" silhouette
// (registered, observable-only); the apartment's own entrance lock gets
// the distinct wall keypad/plate — the one governed asset whose LED
// reflects a real locked state.
const ACCESS_EQUIPMENT_KIND: Record<string, "reader" | "lock"> = {
  "LUNA-GROUND-ACCESS-MAIN-01": "reader",
  "LUNA-B1-ACCESS-SERVICE-01": "reader",
  "LUNA-GROUND-ACCESS-LIFT-LOBBY-01": "reader",
  "LUNA-L06-APT-A-ENTRY-LOCK-01": "lock",
};

// CCTV & Spatial Security System V1 — the four registered cameras (see
// lunaCameraResolver.ts's own CCTV_CAMERA_REFS, the single source for
// which refs this dispatch covers) share one recognizable bullet-camera
// silhouette.
const CCTV_EQUIPMENT_REFS = new Set(CCTV_CAMERA_REFS);

// Network / Edge & Physical Connectivity V1 — same by-exact-ref dispatch
// pattern. The core gateway and Oyi Edge/Core share the rack-unit
// silhouette (both physically live in the B1 Network Room); the
// apartment's ONT and its own router share the wall termination-box
// silhouette; the common-area Wi-Fi AP gets its own ceiling-disc shape.
// The data riser and floor branch are deliberately NOT given bespoke
// geometry here — matching every other system's own risers/branches,
// none of which get dedicated equipment shapes either, only real plant
// hardware does.
const NETWORK_EQUIPMENT_KIND: Record<string, "rack" | "wifi-ap" | "termination"> = {
  "LUNA-B1-NET-GATEWAY-01": "rack",
  "LUNA-EDGE-CORE-01": "rack",
  "LUNA-GROUND-NET-WIFI-AP-01": "wifi-ap",
  "LUNA-L06-APT-A-NET-ONT-01": "termination",
  "LUNA-L06-APT-A-ROUTER-01": "termination",
};

// Drainage V1 — same by-exact-ref dispatch pattern. Fixture-level drain
// points and the apartment's own wet-area stack connection share the
// floor-drain-grate silhouette; the B1/site discharge references share
// the access-chamber silhouette; the vent termination, roof drain and
// downpipe each get their own distinct reference shape (see
// DrainagePlantEquipment.tsx).
const DRAINAGE_EQUIPMENT_KIND: Record<string, "drain-point" | "chamber" | "vent-cap" | "roof-drain" | "downpipe"> = {
  "LUNA-L06-APT-A-DRAIN-01": "drain-point",
  "LUNA-L06-APT-A-KITCHEN-DRAIN-01": "drain-point",
  "LUNA-L06-APT-A-BATH-01-DRAIN-01": "drain-point",
  "LUNA-L06-APT-A-BATH-02-DRAIN-01": "drain-point",
  "LUNA-L06-APT-A-BATH-03-DRAIN-01": "drain-point",
  "LUNA-B1-DRAINAGE-MAIN-01": "chamber",
  "LUNA-SITE-STORM-DISCHARGE-01": "chamber",
  "LUNA-ROOF-VENT-TERMINATION-01": "vent-cap",
  "LUNA-ROOFTOP-STORM-DRAIN-01": "roof-drain",
  "LUNA-STORM-DOWNPIPE-01": "downpipe",
};

// Domestic Water Reference System V1 (Part D/H) — the B1 plant's own pipe
// connections, reusing PipeRun (previously only used for HVAC refrigerant
// lines) rather than inventing new geometry. Matches the real parentRef
// chain (tank <- intake; pumps <- tank) plus the new header/riser
// connection documented as an isolated_by edge, not a parentRef change.
const B1_WATER_PLANT_RUNS: Array<{ ref: string; from: string; to: string; thickness?: number }> = [
  { ref: "LUNA-B1-WATER-INTAKE-RUN-01", from: "LUNA-B1-WATER-INTAKE-01", to: "LUNA-B1-WATER-TANK-01", thickness: 0.07 },
  { ref: "LUNA-B1-WATER-TANK-BP01-RUN-01", from: "LUNA-B1-WATER-TANK-01", to: "LUNA-B1-WATER-BP-01", thickness: 0.06 },
  { ref: "LUNA-B1-WATER-TANK-BP02-RUN-01", from: "LUNA-B1-WATER-TANK-01", to: "LUNA-B1-WATER-BP-02", thickness: 0.06 },
  { ref: "LUNA-B1-WATER-BP01-HEADER-RUN-01", from: "LUNA-B1-WATER-BP-01", to: "LUNA-B1-WATER-VALVE-01", thickness: 0.06 },
  { ref: "LUNA-B1-WATER-BP02-HEADER-RUN-01", from: "LUNA-B1-WATER-BP-02", to: "LUNA-B1-WATER-VALVE-01", thickness: 0.06 },
];

// Electrical System V1 — the B1 plant's own cable runs, reusing PipeRun
// as the cable-containment stand-in (a cylinder is a reasonable neutral
// silhouette; a dedicated rectangular busway cross-section is documented
// as future work, not fabricated here). Follows the registered parentRef
// chain (MDB<-GRID; ATS/INV/METER-01<-MDB) plus the new GEN->ATS
// supplied_by edge — never a relationship invented for the visual alone.
// Electrical System V1.1 — sourceGate lets each run's own "flowing"
// pulse reflect which physical path is ACTUALLY live right now (Part 9:
// "energized active source/path may receive subtle visual emphasis... the
// visual state should follow actual deterministic runtime transitions"),
// not just "is anything energized anywhere" — the GRID->MDB run only
// glows on utility, GEN->ATS only glows on generator, matching resolveBuildingPower()'s
// own activeSource exactly (never a second, independently-derived notion
// of "which path is live").
const B1_ELECTRICAL_PLANT_RUNS: Array<{ ref: string; from: string; to: string; thickness?: number; sourceGate: "utility" | "generator" | "bus" }> = [
  { ref: "LUNA-B1-ELECTRICAL-GRID-MDB-RUN-01", from: "LUNA-B1-ELECTRICAL-GRID-01", to: "LUNA-B1-ELECTRICAL-MDB-01", thickness: 0.06, sourceGate: "utility" },
  { ref: "LUNA-B1-ELECTRICAL-MDB-ATS-RUN-01", from: "LUNA-B1-ELECTRICAL-MDB-01", to: "LUNA-B1-ELECTRICAL-ATS-01", thickness: 0.05, sourceGate: "bus" },
  { ref: "LUNA-B1-ELECTRICAL-GEN-ATS-RUN-01", from: "LUNA-B1-ELECTRICAL-GEN-01", to: "LUNA-B1-ELECTRICAL-ATS-01", thickness: 0.05, sourceGate: "generator" },
  { ref: "LUNA-B1-ELECTRICAL-MDB-INV-RUN-01", from: "LUNA-B1-ELECTRICAL-MDB-01", to: "LUNA-B1-ELECTRICAL-INV-01", thickness: 0.04, sourceGate: "bus" },
  { ref: "LUNA-B1-ELECTRICAL-MDB-METER-RUN-01", from: "LUNA-B1-ELECTRICAL-MDB-01", to: "LUNA-B1-ELECTRICAL-METER-01", thickness: 0.04, sourceGate: "bus" },
];

// Fire System V1 — by-exact-ref dispatch, same pattern as water/electrical.
// Detectors (both common-area and 6A) use the SAME SmokeDetectorGeometry —
// a ceiling-mounted disc, the one detector silhouette regardless of
// location, never a different marker per room.
const FIRE_EQUIPMENT_KIND: Record<string, "panel" | "pump" | "tank" | "detector"> = {
  "LUNA-B1-FIRE-PANEL-01": "panel",
  "LUNA-B1-FIRE-PUMP-01": "pump",
  "LUNA-B1-FIRE-TANK-01": "tank",
  "LUNA-GROUND-FIRE-DET-01": "detector",
  "LUNA-L06-APT-A-ENTRY-SMOKE-01": "detector",
};

// Fire System V1 — the B1 plant's own hydraulic run (tank -> pump), the
// registered supplied_by relationship's physical counterpart. Pump ->
// riser is not drawn here since the riser's own parentRef IS the pump
// (see LunaRiserShafts.tsx for the vertical continuation).
const B1_FIRE_PLANT_RUNS: Array<{ ref: string; from: string; to: string; thickness?: number }> = [
  { ref: "LUNA-B1-FIRE-TANK-PUMP-RUN-01", from: "LUNA-B1-FIRE-TANK-01", to: "LUNA-B1-FIRE-PUMP-01", thickness: 0.07 },
];

// Drainage V1 — the rooftop's own short stormwater run (roof drain ->
// downpipe head), the one plant-level pipe both endpoints share a level
// with (see lunaMepBackbone.ts's DRAINAGE_STORMWATER comment for why the
// downpipe's full run to grade is deliberately NOT drawn as continuous
// geometry). Drainage's own soil/waste riser -> B1 main is likewise not
// drawn here, matching the fire precedent above exactly: the riser's own
// continuous RiserShaft geometry already IS that connection.
const ROOFTOP_STORMWATER_RUNS: Array<{ ref: string; from: string; to: string; thickness?: number }> = [
  { ref: "LUNA-ROOFTOP-STORM-DRAIN-DOWNPIPE-RUN-01", from: "LUNA-ROOFTOP-STORM-DRAIN-01", to: "LUNA-STORM-DOWNPIPE-01", thickness: 0.045 },
];

// Apartment 6A's own electrical run — meter -> distribution board, matching
// METER-ELEC-01 <- ELECTRICAL-BRANCH-01 / DB-01 <- METER-ELEC-01 parentRefs.
const APARTMENT_A_ELECTRICAL_RUNS: Array<{ ref: string; from: string; to: string }> = [
  { ref: "LUNA-L06-APT-A-METER-DB-RUN-01", from: "LUNA-L06-APT-A-METER-ELEC-01", to: "LUNA-L06-APT-A-DB-01" },
];

// 6A's own distribution runs — main -> hot/cold manifold -> each fixture
// branch (kitchen unaffected/hot bath-01 unaffected; the three new cold
// bathroom branches complete the reference coverage Part F asks for).
const APARTMENT_A_WATER_RUNS: Array<{ ref: string; from: string; to: string }> = [
  { ref: "LUNA-L06-APT-A-WATER-MAIN-HOT-RUN-01", from: "LUNA-L06-APT-A-WATER-MAIN-01", to: "LUNA-L06-APT-A-WATER-HOT-01" },
  { ref: "LUNA-L06-APT-A-WATER-MAIN-COLD-RUN-01", from: "LUNA-L06-APT-A-WATER-MAIN-01", to: "LUNA-L06-APT-A-WATER-COLD-01" },
  { ref: "LUNA-L06-APT-A-WATER-COLD-KITCHEN-RUN-01", from: "LUNA-L06-APT-A-WATER-COLD-01", to: "LUNA-L06-APT-A-KITCHEN-FIXTURE-BRANCH-01" },
  { ref: "LUNA-L06-APT-A-WATER-HOT-BATH01-RUN-01", from: "LUNA-L06-APT-A-WATER-HOT-01", to: "LUNA-L06-APT-A-BATH-01-FIXTURE-BRANCH-01" },
  { ref: "LUNA-L06-APT-A-WATER-COLD-BATH01-RUN-01", from: "LUNA-L06-APT-A-WATER-COLD-01", to: "LUNA-L06-APT-A-BATH-01-FIXTURE-BRANCH-02" },
  { ref: "LUNA-L06-APT-A-WATER-COLD-BATH02-RUN-01", from: "LUNA-L06-APT-A-WATER-COLD-01", to: "LUNA-L06-APT-A-BATH-02-FIXTURE-BRANCH-01" },
  { ref: "LUNA-L06-APT-A-WATER-COLD-BATH03-RUN-01", from: "LUNA-L06-APT-A-WATER-COLD-01", to: "LUNA-L06-APT-A-BATH-03-FIXTURE-BRANCH-01" },
];

// Drainage V1 — the apartment's own wastewater runs, fixture -> wet-area
// stack connection (the real physical flow direction, opposite the water
// runs above — see lunaDrainageResolver.ts's direction note). Completes
// the physical realism gap Part 5 flags: these four fixture drain points
// existed as canonical assets with no connecting pipe geometry at all
// before this phase.
const APARTMENT_A_DRAINAGE_RUNS: Array<{ ref: string; from: string; to: string }> = [
  { ref: "LUNA-L06-APT-A-KITCHEN-DRAIN-RUN-01", from: "LUNA-L06-APT-A-KITCHEN-DRAIN-01", to: "LUNA-L06-APT-A-DRAIN-01" },
  { ref: "LUNA-L06-APT-A-BATH-01-DRAIN-RUN-01", from: "LUNA-L06-APT-A-BATH-01-DRAIN-01", to: "LUNA-L06-APT-A-DRAIN-01" },
  { ref: "LUNA-L06-APT-A-BATH-02-DRAIN-RUN-01", from: "LUNA-L06-APT-A-BATH-02-DRAIN-01", to: "LUNA-L06-APT-A-DRAIN-01" },
  { ref: "LUNA-L06-APT-A-BATH-03-DRAIN-RUN-01", from: "LUNA-L06-APT-A-BATH-03-DRAIN-01", to: "LUNA-L06-APT-A-DRAIN-01" },
];

// Phase 13 §6 — representative refrigerant lines from each indoor split
// unit to the shared outdoor condenser (see lunaEngineeringRelationships.ts'
// matching connected_to edges). Geometry only — the electrical/power
// relationship stays the AC circuit's own parentRef; this is the separate
// "what physically runs to the condenser" line.
const HVAC_REFRIGERANT_RUNS: Array<{ ref: string; from: string; to: string }> = [
  { ref: "LUNA-L06-APT-A-LIVING-AC-REFRIGERANT-01", from: "LUNA-L06-APT-A-LIVING-AC-01", to: "LUNA-L06-APT-A-AC-OUTDOOR-01" },
  { ref: "LUNA-L06-APT-A-BED-01-AC-REFRIGERANT-01", from: "LUNA-L06-APT-A-BED-01-AC-01", to: "LUNA-L06-APT-A-AC-OUTDOOR-01" },
];

// Phase 12: apartment-devices fixtures read as credible objects, not
// uniform generic cubes — a recessed downlight is flat and round, a
// wall-mounted AC unit is wide and thin, a door lock is a small slim
// keypad. Every other device kind keeps its pre-Phase-12 proportions
// exactly (uniform number, unchanged scale table).
function scaleForAsset(a: OperationalAssetRecord): number | [number, number, number] {
  if (a.system === "apartment-devices") {
    if (a.type === "climate") return [0.62, 0.24, 0.2]; // wall-mounted AC unit
    if (a.type === "lock") return [0.12, 0.22, 0.06]; // slim door keypad/latch
    return 0.3;
  }
  if (a.kind === "edge-node") return 0.85;
  if (a.kind === "camera") return 0.4;
  if (a.kind === "access-point") return 0.5;
  if (/TANK|PLANT/.test(a.ref)) return 1.3;
  if (/MDB|GRID|GEN-|PUMP|PANEL/.test(a.ref)) return 0.85;
  return 0.55;
}

function shapeForAsset(a: OperationalAssetRecord): "box" | "cone" | "disc" {
  if (a.kind === "camera") return "cone";
  if (a.kind === "access-point") return "disc";
  if (a.system === "apartment-devices" && a.type === "light") return "disc"; // recessed downlight puck
  return "box";
}

// Track width authored per curtain — the width of the window/opening each
// one covers, matching its room's own dimensions from lunaInteriors.ts
// (Living Room is 7m wide, the Primary Bedroom 3.5m), not an arbitrary
// constant shared by both.
const CURTAIN_TRACK_WIDTH: Record<string, number> = {
  "LUNA-L06-APT-A-LIVING-CURTAIN-01": 5,
  "LUNA-L06-APT-A-BED-01-CURTAIN-01": 2.6,
};

function MarkerFor({ asset }: { asset: OperationalAssetRecord }) {
  if (asset.type === "curtain") {
    return (
      <CurtainAssetMarker
        ref_={asset.ref}
        label={asset.label}
        parentRef={asset.parentRef}
        system={asset.system}
        position={[asset.position.x, asset.position.y, asset.position.z]}
        color={SYSTEM_COLOR[asset.system]}
        trackWidth={CURTAIN_TRACK_WIDTH[asset.ref] ?? 3}
      />
    );
  }
  const waterKind = WATER_EQUIPMENT_KIND[asset.ref];
  if (waterKind) {
    const props = { ref_: asset.ref, label: asset.label, position: [asset.position.x, asset.position.y, asset.position.z] as [number, number, number], color: SYSTEM_COLOR.water };
    if (waterKind === "tank") return <WaterTankGeometry {...props} />;
    if (waterKind === "treatment") return <TreatmentUnitGeometry {...props} />;
    if (waterKind === "pump") return <BoosterPumpGeometry {...props} />;
    return <IsolationValveGeometry {...props} />;
  }
  const electricalKind = ELECTRICAL_EQUIPMENT_KIND[asset.ref];
  if (electricalKind) {
    const props = { ref_: asset.ref, label: asset.label, position: [asset.position.x, asset.position.y, asset.position.z] as [number, number, number], color: SYSTEM_COLOR.electrical };
    if (electricalKind === "switchboard") return <SwitchboardCabinetGeometry {...props} />;
    if (electricalKind === "ats") return <ATSCabinetGeometry {...props} />;
    if (electricalKind === "generator") return <GeneratorSetGeometry {...props} />;
    if (electricalKind === "inverter") return <InverterCabinetGeometry {...props} />;
    if (electricalKind === "meter") return <ElectricityMeterGeometry {...props} />;
    return <DistributionBoardGeometry {...props} />;
  }
  const fireKind = FIRE_EQUIPMENT_KIND[asset.ref];
  if (fireKind) {
    const props = { ref_: asset.ref, label: asset.label, position: [asset.position.x, asset.position.y, asset.position.z] as [number, number, number], color: SYSTEM_COLOR.fire };
    if (fireKind === "panel") return <FireAlarmPanelGeometry {...props} />;
    if (fireKind === "pump") return <FirePumpGeometry {...props} />;
    if (fireKind === "tank") return <FireTankGeometry {...props} />;
    return <SmokeDetectorGeometry {...props} />;
  }
  const hvacKind = HVAC_EQUIPMENT_KIND[asset.ref];
  if (hvacKind) {
    const props = { ref_: asset.ref, label: asset.label, position: [asset.position.x, asset.position.y, asset.position.z] as [number, number, number], color: SYSTEM_COLOR[asset.system] };
    return hvacKind === "outdoor" ? <OutdoorCondenserGeometry {...props} /> : <IndoorUnitGeometry {...props} />;
  }
  const accessKind = ACCESS_EQUIPMENT_KIND[asset.ref];
  if (accessKind) {
    const props = { ref_: asset.ref, label: asset.label, position: [asset.position.x, asset.position.y, asset.position.z] as [number, number, number], color: SYSTEM_COLOR[asset.system] };
    return accessKind === "reader" ? <AccessReaderPanelGeometry {...props} /> : <AccessLockKeypadGeometry {...props} />;
  }
  if (CCTV_EQUIPMENT_REFS.has(asset.ref)) {
    const props = { ref_: asset.ref, label: asset.label, position: [asset.position.x, asset.position.y, asset.position.z] as [number, number, number], color: SYSTEM_COLOR[asset.system] };
    return <CameraGeometry {...props} />;
  }
  const networkKind = NETWORK_EQUIPMENT_KIND[asset.ref];
  if (networkKind) {
    const props = { ref_: asset.ref, label: asset.label, position: [asset.position.x, asset.position.y, asset.position.z] as [number, number, number], color: SYSTEM_COLOR[asset.system] };
    if (networkKind === "rack") return <NetworkRackUnitGeometry {...props} />;
    if (networkKind === "wifi-ap") return <WifiApGeometry {...props} />;
    return <NetworkTerminationBoxGeometry {...props} />;
  }
  const drainageKind = DRAINAGE_EQUIPMENT_KIND[asset.ref];
  if (drainageKind) {
    const props = { ref_: asset.ref, label: asset.label, position: [asset.position.x, asset.position.y, asset.position.z] as [number, number, number], color: SYSTEM_COLOR.drainage };
    if (drainageKind === "drain-point") return <DrainPointGeometry {...props} />;
    if (drainageKind === "chamber") return <DischargeChamberGeometry {...props} />;
    if (drainageKind === "vent-cap") return <VentCapGeometry {...props} />;
    if (drainageKind === "roof-drain") return <RoofDrainGeometry {...props} />;
    return <DownpipeGeometry {...props} />;
  }
  return (
    <OperationalAssetMarker
      ref_={asset.ref}
      label={asset.label}
      kind={asset.kind}
      parentRef={asset.parentRef}
      system={asset.system}
      position={[asset.position.x, asset.position.y, asset.position.z]}
      color={SYSTEM_COLOR[asset.system]}
      shape={shapeForAsset(asset)}
      scale={scaleForAsset(asset)}
      emitsLight={asset.type === "light"}
    />
  );
}

/** Operational assets that belong directly to a level (not nested inside a
 * further unit) — B1's electrical/water/fire/network plant, Ground's
 * detector/cameras/access points, Rooftop's HVAC plant, L06's common-area
 * camera. Elevators are excluded here — Phase 5 gives them a moving cabin
 * indicator (see ElevatorCabinLayer.tsx) rendered at the building root
 * instead of a static per-level marker, since their whole point is to
 * move between levels' coordinate spaces, not sit inside one. Nested
 * exactly like InteriorLayer: nothing here introduces a second,
 * separately-positioned scene — it's the same -levelHeight/2
 * floor-alignment fix InteriorLayer required in Phase 3, reused for the
 * same reason (a level's group origin is its vertical center, not its
 * floor). */
export function LevelOperationalLayer({ levelRef, levelHeight }: { levelRef: string; levelHeight: number }) {
  const assets = useMemo(() => LUNA_OPERATIONAL_ASSETS.filter((a) => a.ownerLevelRef === levelRef && !a.unitRef && a.system !== "vertical-transport"), [levelRef]);
  const assetByRef = useMemo(() => new Map(assets.map((a) => [a.ref, a])), [assets]);
  const plantRuns = useMemo(() => (levelRef === "LUNA-B1" ? B1_WATER_PLANT_RUNS.filter((r) => assetByRef.has(r.from) && assetByRef.has(r.to)) : []), [levelRef, assetByRef]);
  const electricalPlantRuns = useMemo(() => (levelRef === "LUNA-B1" ? B1_ELECTRICAL_PLANT_RUNS.filter((r) => assetByRef.has(r.from) && assetByRef.has(r.to)) : []), [levelRef, assetByRef]);
  const firePlantRuns = useMemo(() => (levelRef === "LUNA-B1" ? B1_FIRE_PLANT_RUNS.filter((r) => assetByRef.has(r.from) && assetByRef.has(r.to)) : []), [levelRef, assetByRef]);
  const stormwaterRuns = useMemo(() => (levelRef === "LUNA-ROOFTOP" ? ROOFTOP_STORMWATER_RUNS.filter((r) => assetByRef.has(r.from) && assetByRef.has(r.to)) : []), [levelRef, assetByRef]);
  const riser = useRuntimeAssetState("LUNA-RISER-WATER-01");
  const flowing = riser?.state.flow_status === "flowing";
  const mdb = useRuntimeAssetState("LUNA-B1-ELECTRICAL-MDB-01");
  const electricalEnergized = mdb?.state.energized !== false;
  const buildingPower = useBuildingPowerState();
  const runFlowing = (gate: "utility" | "generator" | "bus") => (gate === "bus" ? electricalEnergized : buildingPower?.activeSource === gate);
  const firePump = useRuntimeAssetState("LUNA-B1-FIRE-PUMP-01");
  const firePressurized = Boolean(firePump?.state.running) && !firePump?.state.fault;
  if (!assets.length) return null;
  return (
    <group position={[0, -levelHeight / 2, 0]}>
      {assets.map((a) => (
        <MarkerFor key={a.ref} asset={a} />
      ))}
      {plantRuns.map((run) => (
        <PipeRun key={run.ref} ref_={run.ref} label="Water Plant Pipe" system="water" from={assetByRef.get(run.from)!.position} to={assetByRef.get(run.to)!.position} color={SYSTEM_COLOR.water} thickness={run.thickness} flowing={flowing} />
      ))}
      {electricalPlantRuns.map((run) => (
        <CableTray key={run.ref} ref_={run.ref} label="Electrical Cable Containment" system="electrical" from={assetByRef.get(run.from)!.position} to={assetByRef.get(run.to)!.position} color={SYSTEM_COLOR.electrical} thickness={run.thickness} flowing={runFlowing(run.sourceGate)} />
      ))}
      {firePlantRuns.map((run) => (
        <PipeRun key={run.ref} ref_={run.ref} label="Fire Water Pipe" system="fire" from={assetByRef.get(run.from)!.position} to={assetByRef.get(run.to)!.position} color={SYSTEM_COLOR.fire} thickness={run.thickness} flowing={firePressurized} />
      ))}
      {stormwaterRuns.map((run) => (
        <PipeRun key={run.ref} ref_={run.ref} label="Stormwater Pipe" system="drainage" from={assetByRef.get(run.from)!.position} to={assetByRef.get(run.to)!.position} color={SYSTEM_COLOR.drainage} thickness={run.thickness} />
      ))}
    </group>
  );
}

/** Operational assets scoped to one unit (Apartment A's 19 smart devices) —
 * nested inside that unit's own UnitVolume group, in the exact same local
 * coordinate space its InteriorLayer rooms already use. */
export function UnitOperationalLayer({ unitRef, levelHeight }: { unitRef: string; levelHeight: number }) {
  const { identity, policy } = useRepresentation();
  // Privacy enforcement lives HERE, at render time, not only at Oyi's
  // query gate — a viewer whose camera can physically enter this unit's
  // interior (e.g. Facility inspecting an authorized meter) must still
  // not see markers for devices the representation policy hides from
  // them (a resident's lights, curtains, lock, sensors, TV, etc.).
  const assets = useMemo(
    () => LUNA_OPERATIONAL_ASSETS.filter((a) => a.unitRef === unitRef && representationAllows(policy, a.ref, identity)),
    [unitRef, policy, identity]
  );
  const assetByRef = useMemo(() => new Map(assets.map((a) => [a.ref, a])), [assets]);
  // Both endpoints must independently pass the same privacy filter above
  // before a run is drawn — a viewer who can't see the outdoor condenser
  // (Consumer, without AC-OUTDOOR-01's Facility carve-out reasoning
  // applying to them) never sees a line pointing at something hidden.
  const refrigerantRuns = useMemo(() => HVAC_REFRIGERANT_RUNS.filter((r) => assetByRef.has(r.from) && assetByRef.has(r.to)), [assetByRef]);
  const waterRuns = useMemo(() => APARTMENT_A_WATER_RUNS.filter((r) => assetByRef.has(r.from) && assetByRef.has(r.to)), [assetByRef]);
  const drainageRuns = useMemo(() => APARTMENT_A_DRAINAGE_RUNS.filter((r) => assetByRef.has(r.from) && assetByRef.has(r.to)), [assetByRef]);
  const electricalRuns = useMemo(() => APARTMENT_A_ELECTRICAL_RUNS.filter((r) => assetByRef.has(r.from) && assetByRef.has(r.to)), [assetByRef]);
  const meter = useRuntimeAssetState("LUNA-L06-APT-A-METER-WATER-01");
  const waterFlowing = meter?.state.supply_active !== false;
  const elecMeter = useRuntimeAssetState("LUNA-L06-APT-A-METER-ELEC-01");
  const electricalFlowing = elecMeter?.state.supply_active !== false;
  if (!assets.length) return null;
  return (
    <group position={[0, -levelHeight / 2, 0]}>
      {assets.map((a) => (
        <MarkerFor key={a.ref} asset={a} />
      ))}
      {waterRuns.map((run) => (
        <PipeRun key={run.ref} ref_={run.ref} label="Apartment Water Pipe" system="water" from={assetByRef.get(run.from)!.position} to={assetByRef.get(run.to)!.position} color={SYSTEM_COLOR.water} thickness={0.035} flowing={waterFlowing} />
      ))}
      {drainageRuns.map((run) => (
        <PipeRun key={run.ref} ref_={run.ref} label="Apartment Drainage Pipe" system="drainage" from={assetByRef.get(run.from)!.position} to={assetByRef.get(run.to)!.position} color={SYSTEM_COLOR.drainage} thickness={0.045} />
      ))}
      {electricalRuns.map((run) => (
        <CableTray key={run.ref} ref_={run.ref} label="Apartment Electrical Cable" system="electrical" from={assetByRef.get(run.from)!.position} to={assetByRef.get(run.to)!.position} color={SYSTEM_COLOR.electrical} thickness={0.03} flowing={electricalFlowing} />
      ))}
      {refrigerantRuns.map((run) => (
        <PipeRun
          key={run.ref}
          ref_={run.ref}
          label="AC Refrigerant Line"
          system="hvac"
          from={assetByRef.get(run.from)!.position}
          to={assetByRef.get(run.to)!.position}
          color={SYSTEM_COLOR.hvac}
          thickness={0.035}
        />
      ))}
    </group>
  );
}

/** Does `levelRef` host any asset of `system`? Powers the Systems Mode
 * architecture fade (see useSceneMode's levelHasSystemAssets) — this is the
 * one piece of Luna-specific knowledge the engine can't have itself.
 * Unaffected by where an asset's *marker* renders (see the elevator note
 * above) — this reads the catalog's ownerLevelRef, which elevators still
 * carry (Ground) regardless of their moving cabin's current position. */
export function lunaLevelHasSystemAssets(levelRef: string, system: OperationalAssetRecord["system"]): boolean {
  return LUNA_OPERATIONAL_ASSETS.some((a) => a.ownerLevelRef === levelRef && a.system === system);
}
