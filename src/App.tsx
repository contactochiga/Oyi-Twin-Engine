import { podiumStepAllowed } from "./luna/explore/podiumWalkability";
import { NavigationModeToggle } from "./luna/NavigationModeToggle";
import { isLiftRef, liftDefinition, liftCamera, isLiftTracking, LIFT_02_REF, type LiftView } from "./luna/lift/lunaLift";
import { ElevatorControlBoard } from "./luna/lift/ElevatorControlBoard";
import { WaterControlBoard } from "./luna/operational/WaterControlBoard";
import { isWaterBoardRef, waterBoardTabKeyFor, WATER_BOARD_DEFAULT_REF } from "./luna/operational/lunaWaterBoard";
import { ElectricalControlBoard } from "./luna/operational/ElectricalControlBoard";
import { isElectricalBoardRef, electricalBoardTabKeyFor, ELECTRICAL_BOARD_DEFAULT_REF } from "./luna/operational/lunaElectricalBoard";
import { FireControlBoard } from "./luna/operational/FireControlBoard";
import { isFireBoardRef, fireBoardTabKeyFor, FIRE_BOARD_DEFAULT_REF } from "./luna/operational/lunaFireBoard";
import { HvacControlBoard } from "./luna/operational/HvacControlBoard";
import { isHvacBoardRef, hvacBoardTabKeyFor, HVAC_BOARD_DEFAULT_REF } from "./luna/operational/lunaHvacBoard";
import { AccessControlBoard } from "./luna/operational/AccessControlBoard";
import { isAccessBoardRef, accessBoardTabKeyFor, ACCESS_BOARD_DEFAULT_REF } from "./luna/operational/lunaAccessBoard";
import { CctvControlBoard } from "./luna/operational/CctvControlBoard";
import { isCctvBoardRef, cctvBoardTabKeyFor, CCTV_BOARD_DEFAULT_REF } from "./luna/operational/lunaCctvBoard";
import { NetworkControlBoard } from "./luna/operational/NetworkControlBoard";
import { isNetworkBoardRef, networkBoardTabKeyFor, NETWORK_BOARD_DEFAULT_REF } from "./luna/operational/lunaNetworkBoard";
import { DrainageControlBoard } from "./luna/operational/DrainageControlBoard";
import { isDrainageBoardRef, drainageBoardTabKeyFor, DRAINAGE_BOARD_DEFAULT_REF } from "./luna/operational/lunaDrainageBoard";
import type { LiftState } from "./luna/lift/liftSimulation";
import { LiftLevelRail } from "./luna/lift/LiftLevelRail";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { SelectionContext } from "./engine/hooks/useSelection";
import { SceneModeContext } from "./engine/hooks/useSceneMode";
import { InteriorFocusContext } from "./engine/hooks/useInteriorFocus";
import { TwinDataContext } from "./engine/twinData";
import type { OperationalSystem } from "./engine/twinData";
import { TwinRuntimeContext } from "./engine/twinRuntime";
import { RepresentationContext } from "./engine/hooks/useRepresentation";
import { RouteHighlightContext } from "./engine/hooks/useRouteHighlight";
import { LightingModeContext, type LightingMode } from "./engine/hooks/useLightingMode";
import { HoverContext, type HoverInfo } from "./engine/hooks/useHover";
import { TwinIntelligenceController, type SceneActions, type TwinIntelligenceContext, type InteractionScope, type OyiResponse } from "./engine/twinIntelligence";
import type { TwinNodeDescriptor, CanonicalRef } from "./engine/types";
import { CameraRig, type CameraFlightTarget } from "./engine/components/CameraRig";
import { LiveWorldPositionReporter } from "./engine/components/LiveWorldPositionReporter";
import { handleSpatialTap } from "./engine/spatial/twoStageInteraction";
import { LunaSpatialMap } from "./luna/LunaSpatialMap";
import { LUNA_L06_FLOOR_PLAN, floorPlanForInterior } from "./luna/policy/lunaFloorPlans";
import { resolveSpatialMapContext } from "./luna/lunaSpatialFrame";
import type { SpatialMapContext } from "./luna/lunaSpatialFrame";
import { Lighting } from "./engine/components/Lighting";
import { SelectionFrameProbe, type WorldAABB, type ScreenRect } from "./engine/components/SelectionFrameProbe";
import { HoverLabel, OyiOrb, DashboardPanel, DraggableSurface, TopCommandBar, EngineeringDrawer, ScenesDrawer, ExploreController, ExploreCameraDriver, EMPTY_EXPLORE_MOVEMENT, movementWithAction, GLASS_ACCENT, type DockZone, type EngineeringLayerOption, type SceneOption, type ExploreInputAction, type ExploreMovementIntent, type ExploreTarget } from "./engine";
import { LunaBuilding } from "./luna/LunaBuilding";
import type { SlidingDoorState } from "./engine/components/SlidingGlassDoor";
import { LunaRouteDriver, type LunaRouteDriverHandle } from "./luna/transitions/LunaRouteDriver";
import type { SpatialRoute, NavigationMode } from "./engine/spatial/route";
import { requestRoute } from "./engine/spatial/routeRequest";
import type { LiftRuntimeSnapshot } from "./engine/spatial/liftHandoff";
import { requestLiftToLanding, requestLiftDestination } from "./engine/spatial/liftHandoff";
import { LUNA_TRANSITION_BINDINGS } from "./luna/transitions/lunaRouteTransitions";
import { lunaIsRouteEdgeAllowed } from "./luna/transitions/lunaRoutePolicy";
import { LUNA_EXTERIOR_ENTRANCE_PLAZA } from "./luna/transitions/lunaTransitions";
import { L06_LOBBY } from "./luna/architecture/l06FloorPlate";

// L06 Gold Standard (Part 34) — the mandatory re-run of the V1.1 golden
// journey: "Take me to Level 6" must now arrive in the REAL L06 Lift
// Lobby, not float at the bare level node. Levels with no real lobby of
// their own (every other residential floor) keep routing to the level
// itself — this map is additive, not a blanket behavior change. LOCATE
// (LevelRail's own instant click) is completely unaffected — only a real
// physical TRAVEL destination changes.
const LEVEL_ARRIVAL_REF: Record<string, CanonicalRef> = {
  "LUNA-L06": L06_LOBBY.ref,
};
import { buildLunaReferenceModel } from "./luna/ingestion/lunaSpatialModel";
import { LunaContextCard } from "./luna/LunaContextCard";
import { LevelContextCard } from "./luna/LevelContextCard";
import { ApartmentContextCard } from "./luna/ApartmentContextCard";
import { InteriorNavigationCard } from "./luna/InteriorNavigationCard";
import { LUNA_LEVEL_RAIL_ITEMS } from "./luna/lunaLevelRail";
import { LUNA_LEVELS, LUNA_CORES } from "./luna/lunaProgramme";
import { SYSTEM_ORDER, SYSTEM_LABEL, SYSTEM_COLOR } from "./luna/operational/systemPresentation";
import { LUNA_CAMERA_PRESETS, enterInteriorCamera, roomFocusCamera, levelCloseCamera, assetFocusCamera, unitExteriorFocusCamera } from "./luna/lunaCameraPresets";
import { unitPlanGeometry } from "./luna/lunaResidentialUnits";
import { lunaWeatherState, LUNA_WEATHER_LOCATION_LABEL } from "./luna/lunaWeatherStub";
import { LUNA_INTERIORS, type InteriorSpec, type RoomLayoutSpec } from "./luna/interiors/lunaInteriors";
import { findSpace, interiorForUnit, isPrivateUnitInteriorRef } from "./luna/interiors/lunaSpaceLookup";
import { lunaTwinDataProvider } from "./luna/operational/lunaTwinDataProvider";
import { lunaLevelHasSystemAssets } from "./luna/operational/OperationalAssetLayer";
import { lunaSimulationProvider } from "./luna/runtime/lunaSimulationProvider";
import { parseIntent } from "./luna/intelligence/lunaIntentParser";
import { lunaBuildRoute } from "./luna/intelligence/lunaServiceRoutes";
import { lunaResolveRelationship } from "./luna/intelligence/lunaRelationships";
import { buildScopePolicy, identityForScope } from "./luna/intelligence/lunaScope";
import { lunaRepresentationPolicy } from "./luna/policy/lunaRepresentationPolicy";
import { descriptorForExploreTarget, lunaExploreBounds, resolveLunaExploreSpace } from "./luna/explore/lunaExploreAwareness";
import { explainAsset } from "./luna/intelligence/lunaExplain";
import { ControlPanel } from "./ui/ControlPanel";
import { SelectionDebug } from "./ui/SelectionDebug";
import { AssetInfoPanel } from "./ui/AssetInfoPanel";
import { ScenarioPanel } from "./ui/ScenarioPanel";
import { OyiPanel } from "./ui/OyiPanel";
import { ProfileSurface } from "./engine/components/spatial/ProfileSurface";
import { CreateProjectFlow } from "./ui/ingestion/CreateProjectFlow";
import { projectStore } from "./engine/ingestion/projectStore";
import { SourceAdapterRegistry } from "./engine/ingestion/adapters";
import { lunaProceduralAdapter } from "./luna/ingestion/lunaProceduralAdapter";
import { ensureLunaProject } from "./luna/ingestion/lunaProjectSeed";
import { lunaL06AptAAdapter } from "./luna/ingestion/lunaL06AptAAdapter";
import { ensureL06AptAGoldStandardSource } from "./luna/ingestion/lunaL06AptASeed";
import { GLASS_SURFACE } from "./engine/components/spatial/glassStyle";
import { AccessCodePanel } from "./engine/components/spatial/AccessCodePanel";
import "./App.css";

const OYI_SUGGESTED_PROMPTS = ["Show me the water route to Apartment 6A", "Take me to Apartment 6A", "Show critical issues", "Take me to Luna Sky"];

// Building Ingestion V1 — one module-level adapter registry (the same
// "small, explicit registry" every prior board/resolver pattern already
// uses), registered once. Luna is the first project seeded through it
// (Part B11); a future building would register its own adapters here the
// same way, never by modifying the Twin Engine itself.
const ingestionAdapterRegistry = new SourceAdapterRegistry();
ingestionAdapterRegistry.register(lunaProceduralAdapter);
ingestionAdapterRegistry.register(lunaL06AptAAdapter);

// Phase 14 §8 — three canonical presentation presets, each its own tuned
// sky/fog rather than a two-state day/evening blend.
const SKY_COLOR: Record<LightingMode, string> = { day: "#bcd6ea", goldenHour: "#dcb68d", evening: "#161a2c" };
const FOG_NEAR: Record<LightingMode, number> = { day: 130, goldenHour: 120, evening: 100 };
// Phase 15B — raised substantially so Ring 2 (out to ~650 units) stays
// legible in the new context presets instead of fogging into the sky
// colour well before it's ever seen; the wide gap between NEAR and FAR
// still gives a real atmospheric-perspective gradient across Ring 2/3,
// it just now resolves over hundreds of metres instead of tens.
const FOG_FAR: Record<LightingMode, number> = { day: 1700, goldenHour: 1500, evening: 1250 };

const OPERATIONAL_KINDS = new Set(["device", "camera", "access-point", "edge-node"]);
const APARTMENT_A_LEVEL_REF = "LUNA-L06";
const APARTMENT_A_REF = "LUNA-L06-APT-A";

// Spatial navigation restoration pass §9 — the breadcrumb label one step
// "up" from a private apartment's interior nav state. Every private
// interior's own ref already IS the apartment's canonical ref (Phase 3
// convention — see lunaInteriors.ts), so this is just presentation:
// "Apartment A" for LUNA-L06-APT-A/LUNA-L10-APT-A, "Penthouse" for the one
// interior whose ref doesn't follow the "-APT-X" suffix convention.
function unitInteriorParentLabel(spec: InteriorSpec): string {
  if (spec.interiorRef === "LUNA-PENTHOUSE") return "Penthouse";
  return `Apartment ${spec.interiorRef.split("-").pop()}`;
}

type PresentationCardState =
  | { kind: "level"; levelRef: CanonicalRef }
  | { kind: "unit-summary"; unitRef: CanonicalRef }
  | { kind: "interior"; spec: InteriorSpec; isPrivateUnit: boolean }
  | { kind: "other" };

// Interface convergence pass §5 — real descriptors for the drawer's
// engineering cards, not decorative copy disconnected from what each
// system actually is. Only OperationalSystem values that don't already
// have a good one-line description via SYSTEM_LABEL alone get an entry
// here; every system in SYSTEM_ORDER still gets a card either way (see
// ENGINEERING_LAYER_OPTIONS below) — none are dropped.
const ENGINEERING_LAYER_DESCRIPTORS: Partial<Record<OperationalSystem, string>> = {
  structure: "Columns, Beams, Slabs",
  electrical: "Power & Lighting",
  water: "Water Supply / Pipes",
  drainage: "Waste & Stormwater",
  fire: "Fire Protection",
  hvac: "Ducting & Air Systems",
  "vertical-transport": "Lifts & Shafts",
  security: "Cameras & Monitoring",
  access: "Access Control",
  "network-edge": "Network & Edge Devices",
  "apartment-devices": "In-Home Devices",
};

// Architecture (activeSystem === null) + All Systems, then every real
// OperationalSystem in the SAME order the rest of the app already uses
// (SYSTEM_ORDER) — the brief's own 9-card example is exactly this list's
// first 9 entries; Security/Access/Network-Edge/Apartment Devices are
// preserved after them rather than dropped.
const ENGINEERING_LAYER_OPTIONS: EngineeringLayerOption[] = [
  { key: null, icon: "architecture", label: "Architecture", descriptor: "Full Building Model", color: "#b7c0cc" },
  { key: "all", icon: "all", label: "All Systems", descriptor: "Integrated View", color: GLASS_ACCENT },
  ...SYSTEM_ORDER.map((system) => ({
    key: system,
    icon: system,
    label: SYSTEM_LABEL[system],
    descriptor: ENGINEERING_LAYER_DESCRIPTORS[system] ?? SYSTEM_LABEL[system],
    color: SYSTEM_COLOR[system],
  })),
];

const VIEW_OPTIONS: SceneOption[] = [
  { ref: "normal", label: "Normal", descriptor: "Unsectioned building" },
  { ref: "cutaway", label: "Cutaway", descriptor: "Reveal building section" },
  { ref: "explode", label: "Explode", descriptor: "Separate building levels" },
];

export default function App({ groundArchitecture }: { groundArchitecture?: import("./luna/architecture/groundAsset").GroundAssetSource } = {}) {
  const [selected, setSelected] = useState<TwinNodeDescriptor | null>(null);
  const [isolatedLevelRef, setIsolatedLevelRef] = useState<CanonicalRef | null>(null);
  const [exploded, setExploded] = useState(false);
  const [sectionMode, setSectionMode] = useState(false);
  const [sectionSide, setSectionSide] = useState<"north" | "south" | "east" | "west">("north");
  const [flightTarget, setFlightTarget] = useState<CameraFlightTarget | null>(LUNA_CAMERA_PRESETS.exteriorHero);
  const [activeInteriorRef, setActiveInteriorRef] = useState<CanonicalRef | null>(null);
  const [focusedRoomRef, setFocusedRoomRef] = useState<CanonicalRef | null>(null);
  const [activeSystem, setActiveSystem] = useState<OperationalSystem | "all" | null>(null);
  const [interactionScope, setInteractionScope] = useState<InteractionScope>("facility");
  // Apartment A Full Interior Reality V1 (Part 31-32) — ONE authoritative
  // navigation-mode preference for the whole Twin session, not a
  // per-component toggle. TOUR default preserves this app's own existing
  // pre-this-phase behavior (navigateToSpace already tried a real route
  // first before this phase existed); TELEPORT is an explicit opt-in.
  const [navigationMode, setNavigationMode] = useState<NavigationMode>("TOUR");
  // Apartment A Full Interior Reality V1 (Part 27-29) — the ONE real
  // world position the live map dot derives from, reported by
  // LiveWorldPositionReporter every frame the camera actually moves.
  // null until the first report arrives (honestly "off-floor" until then).
  const [liveWorldPosition, setLiveWorldPosition] = useState<{ x: number; y: number; z: number } | null>(null);
  const [oyiContext, setOyiContext] = useState<TwinIntelligenceContext>({});
  const [highlightedRefs, setHighlightedRefs] = useState<CanonicalRef[]>([]);
  const [lightingMode, setLightingMode] = useState<LightingMode>("day");
  const [presentationMode, setPresentationMode] = useState(true);
  const [hovered, setHovered] = useState<HoverInfo | null>(null);
  const [representationMode2D3D, setRepresentationMode2D3D] = useState<"2D" | "3D">("3D");
  const [dashboard, setDashboard] = useState<{ title: string; text: string } | null>(null);
  // Phase 16A correction §1 — ONE shared zone for the Level<->Apartment
  // context surface. It used to be two independent states (a "Level" zone
  // and an "Apartment" zone defaulting to opposite sides), which is
  // exactly why selecting a unit looked like a second card opening on the
  // other side of the screen instead of the same card transitioning in
  // place. Session-only, per the brief's own "persist only for the active
  // Presentation session".
  const [cardZone, setCardZone] = useState<DockZone>("left");
  // Phase 16A correction §3 — the on-screen rect of whatever residential
  // unit is currently framed, used ONLY to decide whether the context
  // surface above needs to protect the shot (see DraggableSurface's
  // avoidRect). Fed by SelectionFrameProbe, which is mounted inside the
  // Canvas (see below) since only there is a Three.js camera available.
  const [unitScreenRect, setUnitScreenRect] = useState<ScreenRect | null>(null);
  // Interface convergence pass §4/§8 — the two primary bottom drawers.
  // Mutually exclusive by convention (opening one closes the other, see
  // the toggle handlers below) so at most one bottom sheet is ever up.
  const [engineeringDrawerOpen, setEngineeringDrawerOpen] = useState(false);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Oyi Visual Identity Integration (Part A3) — ONE shared conversation-open
  // boolean so the top-bar Oyi identity mark and the bottom-right closed
  // orb are two entry points into the SAME Oyi conversation surface, never
  // two independent AI sessions. OyiOrb's own expand/collapse UI and
  // askOyiPresentation's parseIntent -> TwinIntelligenceController pipeline
  // are otherwise unchanged.
  const [oyiConversationOpen, setOyiConversationOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [exploreMode, setExploreMode] = useState(false);
  const [exploreMovement, setExploreMovement] = useState<ExploreMovementIntent>(EMPTY_EXPLORE_MOVEMENT);
  const [exploreTarget, setExploreTarget] = useState<ExploreTarget | null>(null);

  // Building Ingestion V1 — seed Luna as the first reference project once
  // per app load (idempotent — safe even if this effect re-runs). Never
  // blocks the Twin from rendering; failures are logged, not thrown, so a
  // broken ingestion seed can never break the existing Twin experience.
  // Architectural Reality V2 — seed L06 Apartment A as a second building
  // source on the same project, sequenced after the whole-building seed
  // above (it depends on the LUNA project already existing). Same
  // never-blocks-the-Twin, log-not-throw discipline.
  useEffect(() => {
    void ensureLunaProject(projectStore)
      .then(() => ensureL06AptAGoldStandardSource(projectStore))
      .catch((error) => console.error("Luna project ingestion seed failed:", error));
  }, []);
  // Capture observes the original target before React state changes. It never
  // cancels viewport events, so the same outside gesture can still orbit.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("#luna-sidebar, .sidebar-toggle")) setSidebarOpen(false);
      if (!target.closest("[data-engineering-tray], [data-engineering-launcher]")) setEngineeringDrawerOpen(false);
      if (!target.closest("[data-view-tray], [data-view-launcher]")) setViewDrawerOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  // Four-lift generalization — ONE state slot for "which lift, in which
  // view", not four parallel React state systems. Switching Follow from
  // one lift to another is just this single slot being overwritten
  // wholesale (ref AND view together) — clean transfer with no extra
  // bookkeeping, and "one navigation owner at a time" is structural.
  const [activeLift, setActiveLift] = useState<{ ref: string; view: LiftView } | null>(null);
  const [elevatorBoardCollapsed, setElevatorBoardCollapsed] = useState(false);
  const liftRestore = useRef<{ floor: string | null; camera: CameraFlightTarget | null } | null>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const routeDriverRef = useRef<LunaRouteDriverHandle>(null);
  const entranceClearanceRef = useRef(0); // same physical progress supplied to the transition driver
  const [entranceDoorState, setEntranceDoorState] = useState<SlidingDoorState>("CLOSED");
  const [apartmentAEntranceOpen, setApartmentAEntranceOpen] = useState(false);
  // Apartment A Full Interior Reality V1 (Part 6) — the boundary ref a
  // transition is genuinely PAUSED_FOR_USER_INPUT on, or null. The one
  // governed boundary in this reference build is Apartment A's entrance
  // door; this stays a boundary-ref comparison (not a Luna-specific
  // boolean) so a future second governed door needs no new App.tsx state.
  const [accessPromptBoundary, setAccessPromptBoundary] = useState<string | null>(null);

  const exitExploreMode = () => {
    setExploreMode(false);
    setExploreMovement(EMPTY_EXPLORE_MOVEMENT);
    setExploreTarget(null);
  };

  const endLiftView = () => {
    setActiveLift(null);
    if (liftRestore.current) {
      setIsolatedLevelRef(liftRestore.current.floor);
      setFlightTarget(liftRestore.current.camera ?? LUNA_CAMERA_PRESETS.overview);
      liftRestore.current = null;
    }
  };
  const showLiftView = (ref: string, view: LiftView | null) => {
    if (!view) { endLiftView(); return; }
    const def = liftDefinition(ref);
    if (!def) return;
    if (lunaRepresentationPolicy.resolveMode({ ref, identity: identityForScope(interactionScope) }) !== "FULL_3D") return;
    const state = lunaSimulationProvider.getState(ref)?.state as LiftState;
    if (view === "interior" && (state.doorState !== "OPEN" || !state.currentFloor || state.motionState !== "IDLE" || state.faultState || state.serviceState !== "normal")) return;
    if (view === "lobby" && !state.currentFloor) return;
    if (!liftRestore.current) liftRestore.current = { floor: isolatedLevelRef, camera: flightTarget };
    if (isLiftTracking(view)) setExploded(false);
    setActiveLift({ ref, view }); setIsolatedLevelRef(null); setActiveInteriorRef(null); setFocusedRoomRef(null);
    setSelected({ ref, kind: "device", label: def.label });
    if (view === "engineering") { setActiveSystem("vertical-transport"); setSectionMode(true); }
    if (view === "structure") setActiveSystem("structure");
    setFlightTarget(liftCamera(view, state.positionY, def.x));
  };
  const followTarget = useMemo(() => !activeLift || !isLiftTracking(activeLift.view) ? undefined : () => {
    const def = liftDefinition(activeLift.ref);
    const s = lunaSimulationProvider.getState(activeLift.ref)?.state as LiftState;
    return def && Number.isFinite(s.positionY) ? liftCamera(activeLift.view, s.positionY, def.x) : null;
  }, [activeLift]);
  // Unified Spatial Control Surface v1 — the board opens automatically from
  // either discoverability route (Engineering -> Elevators sets activeSystem,
  // spatial/Oyi selection sets activeLift via showLiftView) without forcing
  // an unwanted camera jump just from opening the Engineering tray. Focused
  // tab is derived, not separate state, so it's always in sync with
  // whichever lift last got a real showLiftView call; LIFT_02_REF is the
  // deterministic default before any lift has ever been focused.
  const elevatorBoardOpen = interactionScope === "facility" && (activeSystem === "vertical-transport" || activeLift !== null);
  const focusedLiftRef = activeLift?.ref ?? LIFT_02_REF;
  // Domestic Water Reference System V1 (Part I) — the second consumer of
  // the same Unified Spatial Control Surface v1 pattern. No LiftView-style
  // camera-mode state is needed: water equipment is static, so opening/
  // focusing the board reuses the EXISTING generic device-selection camera
  // effect below (setSelected -> assetFocusCamera) instead of any bespoke
  // logic. LUNA-B1-WATER-TANK-01 is the deterministic default focus.
  const waterBoardOpen = interactionScope === "facility" && (activeSystem === "water" || (selected !== null && isWaterBoardRef(selected.ref)));
  const focusedWaterRef = selected && isWaterBoardRef(selected.ref) ? waterBoardTabKeyFor(selected.ref) : WATER_BOARD_DEFAULT_REF;
  const [waterBoardCollapsed, setWaterBoardCollapsed] = useState(false);
  // Electrical System V1 (Part 7) — third SystemControlBoard consumer,
  // same derivation shape as the water board immediately above.
  const electricalBoardOpen = interactionScope === "facility" && (activeSystem === "electrical" || (selected !== null && isElectricalBoardRef(selected.ref)));
  const focusedElectricalRef = selected && isElectricalBoardRef(selected.ref) ? electricalBoardTabKeyFor(selected.ref) : ELECTRICAL_BOARD_DEFAULT_REF;
  const [electricalBoardCollapsed, setElectricalBoardCollapsed] = useState(false);
  // Fire System V1 (Part 9) — fourth SystemControlBoard consumer, same
  // derivation shape as the boards above.
  const fireBoardOpen = interactionScope === "facility" && (activeSystem === "fire" || (selected !== null && isFireBoardRef(selected.ref)));
  const focusedFireRef = selected && isFireBoardRef(selected.ref) ? fireBoardTabKeyFor(selected.ref) : FIRE_BOARD_DEFAULT_REF;
  const [fireBoardCollapsed, setFireBoardCollapsed] = useState(false);
  // HVAC System V1 — fifth SystemControlBoard consumer, same derivation
  // shape as the boards above.
  const hvacBoardOpen = interactionScope === "facility" && (activeSystem === "hvac" || (selected !== null && isHvacBoardRef(selected.ref)));
  const focusedHvacRef = selected && isHvacBoardRef(selected.ref) ? hvacBoardTabKeyFor(selected.ref) : HVAC_BOARD_DEFAULT_REF;
  const [hvacBoardCollapsed, setHvacBoardCollapsed] = useState(false);
  // Access & Security System V1 — sixth SystemControlBoard consumer, same
  // derivation shape as the boards above.
  const accessBoardOpen = interactionScope === "facility" && (activeSystem === "access" || (selected !== null && isAccessBoardRef(selected.ref)));
  const focusedAccessRef = selected && isAccessBoardRef(selected.ref) ? accessBoardTabKeyFor(selected.ref) : ACCESS_BOARD_DEFAULT_REF;
  const [accessBoardCollapsed, setAccessBoardCollapsed] = useState(false);
  // CCTV & Spatial Security System V1 — seventh SystemControlBoard
  // consumer, same derivation shape as the boards above.
  const cctvBoardOpen = interactionScope === "facility" && (activeSystem === "security" || (selected !== null && isCctvBoardRef(selected.ref)));
  const focusedCctvRef = selected && isCctvBoardRef(selected.ref) ? cctvBoardTabKeyFor(selected.ref) : CCTV_BOARD_DEFAULT_REF;
  const [cctvBoardCollapsed, setCctvBoardCollapsed] = useState(false);
  // Network/Edge & Physical Connectivity V1 — eighth SystemControlBoard
  // consumer, same derivation shape as the boards above.
  const networkBoardOpen = interactionScope === "facility" && (activeSystem === "network-edge" || (selected !== null && isNetworkBoardRef(selected.ref)));
  const focusedNetworkRef = selected && isNetworkBoardRef(selected.ref) ? networkBoardTabKeyFor(selected.ref) : NETWORK_BOARD_DEFAULT_REF;
  const [networkBoardCollapsed, setNetworkBoardCollapsed] = useState(false);
  // Drainage V1 — the ninth SystemControlBoard consumer, same derivation
  // shape as the boards above.
  const drainageBoardOpen = interactionScope === "facility" && (activeSystem === "drainage" || (selected !== null && isDrainageBoardRef(selected.ref)));
  const focusedDrainageRef = selected && isDrainageBoardRef(selected.ref) ? drainageBoardTabKeyFor(selected.ref) : DRAINAGE_BOARD_DEFAULT_REF;
  const [drainageBoardCollapsed, setDrainageBoardCollapsed] = useState(false);
  useEffect(() => {
    if (activeLift && (interactionScope !== "facility" || (exploded && isLiftTracking(activeLift.view)))) endLiftView();
  }, [interactionScope, exploded, activeLift]);
  useEffect(() => lunaSimulationProvider.subscribe(() => {
    if (!activeLift || !isLiftTracking(activeLift.view)) return;
    const s = lunaSimulationProvider.getState(activeLift.ref)?.state as LiftState;
    if (s.faultState || !Number.isFinite(s.positionY)) endLiftView();
  }), [activeLift]);
  const flyTo = (preset: CameraFlightTarget) => { endLiftView(); setFlightTarget(preset); };

  const isolateLevelAndFly = (levelRef: CanonicalRef | null, label: string) => {
    routeDriverRef.current?.cancelRoute(); // Level navigation supersedes a physical common-area journey.
    endLiftView();
    setActiveSystem(null);
    setIsolatedLevelRef(levelRef);
    setActiveInteriorRef(null);
    setFocusedRoomRef(null);
    if (levelRef) {
      setFlightTarget(levelCloseCamera(levelRef));
      setSelected({ ref: levelRef, kind: "level", label });
    } else {
      setSelected(null);
    }
  };

  const enterInterior = (spec: InteriorSpec) => {
    endLiftView();
    // Apartment A Full Interior Reality V1 (regression fix) — an instant
    // TELEPORT-style arrival must never race a still-in-flight TOUR route
    // left over from an earlier journey. LunaRouteDriver's own beginRoute()
    // already refuses to start a SECOND route while one is active, but
    // nothing previously cancelled a route the user has since abandoned by
    // switching to an instant entry point — its queued async step-advance
    // (e.g. a bare-level MOVE hop) could still fire afterwards and silently
    // overwrite `selected`/`currentSpaceRef` out from under this call.
    routeDriverRef.current?.cancelRoute();
    if (lunaRepresentationPolicy.resolveMode({ ref: spec.interiorRef, identity: identityForScope(interactionScope) }) !== "FULL_3D") {
      if (unitPlanGeometry(spec.interiorRef)) selectUnitAndFly(spec.interiorRef);
      else isolateLevelAndFly(spec.ownerLevelRef, spec.label);
      return;
    }
    setActiveSystem(null);
    setIsolatedLevelRef(spec.ownerLevelRef);
    setActiveInteriorRef(spec.interiorRef);
    setFocusedRoomRef(null);
    setFlightTarget(enterInteriorCamera(spec));
    setSelected({ ref: spec.interiorRef, kind: "unit", label: spec.label });
  };

  // Spatial Transition Engine V1 Part 4 — selecting the real Main
  // Entrance door begins a REAL physical transition (approach -> resolve
  // access -> door opens -> wait for real clearance -> camera crosses the
  // threshold -> arrive), never a teleport. Preserves the exact
  // pre-existing CONTEXT_3D fallback below unchanged — a resident viewing
  // the lobby at CONTEXT_3D has no real interior to physically walk into,
  // so that identity/mode keeps using the original enterInterior() path.
  // Spatial Transition Engine V1.1 — where the user's spatial context
  // REALLY is right now (Part 17), updated only when a route step
  // actually completes, never optimistically. Starts outside, matching
  // the default exterior hero camera.
  const [currentSpaceRef, setCurrentSpaceRef] = useState<CanonicalRef>(LUNA_EXTERIOR_ENTRANCE_PLAZA);
  const [activeRoute, setActiveRoute] = useState<SpatialRoute | null>(null);
  const [routeNarration, setRouteNarration] = useState<string | null>(null);

  // The one real entry point from "I want to go to X" to a walkable
  // SpatialRoute — Part 21: consumes ONLY the generic Building Ingestion
  // V2 model + this phase's own generic contracts, filtered through the
  // real, unmodified RepresentationPolicy/lift-control gate (Part 11).
  const requestLunaRoute = (destinationRef: CanonicalRef): SpatialRoute | null => {
    const model = buildLunaReferenceModel();
    const identity = identityForScope(interactionScope);
    const result = requestRoute(model, LUNA_TRANSITION_BINDINGS, (edge) => lunaIsRouteEdgeAllowed(edge, identity), currentSpaceRef, destinationRef, `route-${Date.now()}`);
    if (result.status !== "OK" || !result.route) {
      setRouteNarration(result.reason ?? `Route unavailable (${result.status})`);
      return null;
    }
    return result.route;
  };

  const enterGroundLobbyViaEntrance = () => {
    const spec = LUNA_INTERIORS.find((i) => i.interiorRef === "LUNA-GROUND-LOBBY");
    if (!spec) return;
    if (lunaRepresentationPolicy.resolveMode({ ref: spec.interiorRef, identity: identityForScope(interactionScope) }) !== "FULL_3D") {
      enterInterior(spec);
      return;
    }
    const route = requestLunaRoute(spec.interiorRef);
    if (route) routeDriverRef.current?.beginRoute(route);
  };

  // Called by LunaRouteDriver every time a real route step completes and
  // the user's spatial context genuinely changes (Part 17) — never
  // before the step's own real completion signal fires.
  const onRouteCurrentSpaceChange = (ref: CanonicalRef) => {
    setCurrentSpaceRef(ref);
    if (ref === "LUNA-GROUND-LOBBY") {
      const spec = LUNA_INTERIORS.find((i) => i.interiorRef === "LUNA-GROUND-LOBBY");
      if (!spec) return;
      setActiveSystem(null);
      setIsolatedLevelRef(spec.ownerLevelRef);
      setActiveInteriorRef(spec.interiorRef);
      setFocusedRoomRef(null);
      setSelected({ ref: spec.interiorRef, kind: "unit", label: spec.label });
      return;
    }
    if (ref === LUNA_EXTERIOR_ENTRANCE_PLAZA) {
      setActiveSystem(null);
      setIsolatedLevelRef(null);
      setActiveInteriorRef(null);
      setFocusedRoomRef(null);
      setSelected(null);
      setHighlightedRefs([]);
      return;
    }
    if (ref === L06_LOBBY.ref) {
      // L06 Gold Standard (Part 7/34) — the mandatory re-run of the
      // golden journey: a lift arrival at Level 6 now genuinely lands in
      // this real room, not a bare level node (see the MOVE-step fix in
      // LunaRouteDriver.tsx that makes this ref ever actually fire).
      setActiveSystem(null);
      setIsolatedLevelRef("LUNA-L06");
      setActiveInteriorRef(null);
      setFocusedRoomRef(null);
      setSelected({ ref: L06_LOBBY.ref, kind: "room", label: L06_LOBBY.label });
      return;
    }
    // L06 Gold Standard (Part 33) — a completed apartment-entrance
    // transition arrives at the real unit itself. Apartment A has a real
    // registered interior (its 12-room Entry/Foyer sequence); B/C/D don't
    // (Part 11: shell-level only), so they isolate the level and select
    // the unit shell rather than fabricating an interior to enter.
    const l06Interior = interiorForUnit(ref);
    if (l06Interior) {
      setActiveSystem(null);
      setIsolatedLevelRef(l06Interior.ownerLevelRef);
      setActiveInteriorRef(l06Interior.interiorRef);
      setFocusedRoomRef(null);
      setSelected({ ref: l06Interior.interiorRef, kind: "unit", label: l06Interior.label });
      return;
    }
    if (unitPlanGeometry(ref)) {
      setActiveSystem(null);
      setIsolatedLevelRef(unitPlanGeometry(ref)!.levelRef);
      setActiveInteriorRef(null);
      setFocusedRoomRef(null);
      setSelected({ ref, kind: "unit", label: ref });
      return;
    }
    const level = LUNA_LEVELS.find((l) => l.ref === ref);
    if (level) {
      setActiveSystem(null);
      setIsolatedLevelRef(level.ref);
      setActiveInteriorRef(null);
      setFocusedRoomRef(null);
      setSelected({ ref: level.ref, kind: "level", label: level.label });
      return;
    }
    // Apartment A Full Interior Reality V1 (Part 34, golden-journey
    // browser proof) — none of the cases above name a ROOM ref, so a TOUR
    // route arriving at one (every internal Apartment A hop — Foyer,
    // Kitchen, Living, ...) previously left `selected` untouched: the
    // canonical current position (currentSpaceRef, above) advanced
    // correctly, but the 3D highlight and the 2D map's own selection
    // never followed it. findSpace() is the SAME generic lookup every
    // other destination-entry path already uses — never a second
    // room-resolution mechanism.
    const found = findSpace(ref);
    if (found?.kind === "room") {
      if (["LUNA-GROUND", "LUNA-L01-AMENITIES"].includes(found.spec.ownerLevelRef)) {
        setIsolatedLevelRef(found.spec.ownerLevelRef);
        if (lunaRepresentationPolicy.resolveMode({ ref, identity: identityForScope(interactionScope) }) === "FULL_3D") setActiveInteriorRef(found.spec.interiorRef);
      }
      setFocusedRoomRef(found.room.ref);
      setSelected({ ref: found.room.ref, kind: "room", label: found.room.label, parentRef: found.spec.interiorRef });
    }
  };

  // Part 4 — the real lift-handoff wiring, every one of these reuses an
  // EXISTING function/mechanism (showLiftView, liftCamera, the real
  // TwinRuntimeProvider) rather than duplicating lift behavior.
  const getLevelElevation = (levelRef: CanonicalRef) => LUNA_LEVELS.find((l) => l.ref === levelRef)?.baseElevation ?? 0;
  const onFlyToLiftLanding = (liftRef: CanonicalRef, elevation: number) => {
    const def = liftDefinition(liftRef);
    if (def) setFlightTarget(liftCamera("lobby", elevation, def.x));
  };
  const onEnterLiftCar = (liftRef: CanonicalRef) => showLiftView(liftRef, "interior");
  // Deliberately bypasses endLiftView()'s own "restore the PRE-lift
  // camera" behavior — a routed exit continues on to the destination
  // space, it does not undo the journey back to where the user started.
  const onExitLiftCar = (liftRef: CanonicalRef, destinationLevelRef: CanonicalRef) => {
    setActiveLift(null);
    liftRestore.current = null;
    const def = liftDefinition(liftRef);
    if (def) setFlightTarget(liftCamera("lobby", getLevelElevation(destinationLevelRef), def.x));
  };
  const getLiftSnapshot = (liftRef: CanonicalRef): LiftRuntimeSnapshot | undefined => {
    const s = lunaSimulationProvider.getState(liftRef)?.state as LiftState | undefined;
    if (!s) return undefined;
    return { currentFloor: s.currentFloor, doorState: s.doorState, faultState: s.faultState, serviceState: s.serviceState };
  };
  const requestLiftCommand = (liftRef: CanonicalRef, kind: "call" | "destination", floorRef: CanonicalRef) => {
    const identity = identityForScope(interactionScope);
    if (kind === "call") requestLiftToLanding(lunaSimulationProvider, liftRef, floorRef, identity);
    else requestLiftDestination(lunaSimulationProvider, liftRef, floorRef, identity);
  };

  const focusRoom = (spec: InteriorSpec, room: RoomLayoutSpec) => {
    // See enterInterior's own comment above — the same stale-route race
    // applies here, and focusRoom is reachable directly (the "Inside:" room
    // list) without ever passing through enterInterior first.
    routeDriverRef.current?.cancelRoute();
    if (lunaRepresentationPolicy.resolveMode({ ref: room.ref, identity: identityForScope(interactionScope) }) !== "FULL_3D") { enterInterior(spec); return; }
    setIsolatedLevelRef(spec.ownerLevelRef);
    setActiveInteriorRef(spec.interiorRef);
    setFocusedRoomRef(room.ref);
    setFlightTarget(roomFocusCamera(spec, room));
    setSelected({ ref: room.ref, kind: "room", label: room.label, parentRef: spec.interiorRef });
    // Apartment A Full Interior Reality V1 (Part 33) — TELEPORT is a real
    // navigation mode, not a camera-only side effect: the traveler's
    // spatial context genuinely changes, exactly like a completed TOUR
    // route step already does via onRouteCurrentSpaceChange.
    setCurrentSpaceRef(room.ref);
  };

  // Apartment A Full Interior Reality V1 (Part 5) — the ONE destination-
  // entry path every real entry point (map, room list, Oyi) shares.
  // Resolves the canonical destination via the SAME findSpace() lookup
  // every other navigation path already uses, then dispatches to whichever
  // EXISTING mechanism the current/overridden navigationMode calls for —
  // TOUR always uses the real route engine (requestLunaRoute +
  // LunaRouteDriver, never a silent fallback to an instant camera jump:
  // Part 16's own "no hidden teleport fallback" requirement), TELEPORT
  // always uses the existing policy-checked instant-arrival functions
  // (enterInterior/focusRoom/isolateLevelAndFly). Never a second policy
  // check, a second route engine, or a per-destination special case.
  const enterDestination = (ref: CanonicalRef, modeOverride?: NavigationMode) => {
    const mode = modeOverride ?? navigationMode;
    const found = findSpace(ref);
    if (!found) return;

    if (mode === "TOUR") {
      const destRef =
        found.kind === "level" ? (LEVEL_ARRIVAL_REF[found.level.ref] ?? found.level.ref)
        : found.kind === "interior" ? found.spec.interiorRef
        : found.kind === "room" ? found.room.ref
        : found.ref;
      const route = requestLunaRoute(destRef);
      if (route) {
        // Hand off only after policy/planning admits a real journey. A denied
        // private target remains inspect-only and must not end manual Explore.
        if (exploreMode) exitExploreMode();
        routeDriverRef.current?.beginRoute(route); return;
      }
      // requestLunaRoute() already reports a real, honest reason via
      // setRouteNarration on failure. Part 16 forbids a TOUR silently
      // completing as if physical travel happened when it didn't — but
      // showing the traveler WHERE the destination is (LOCATE, which
      // never claims arrival) is a different, honest courtesy the
      // pre-Apartment-A code already gave (e.g. a Facility identity
      // asking for a private apartment got an exterior peek, not
      // nothing). Falling back to LOCATE here preserves that, without
      // ever pretending the TOUR itself succeeded.
      locateDestination(ref);
      return;
    }

    // Explicit TELEPORT hands camera ownership to the existing guarded action.
    if (exploreMode) exitExploreMode();
    if (found.kind === "level") { isolateLevelAndFly(found.level.ref, found.level.label); return; }
    if (found.kind === "interior") { enterInterior(found.spec); return; }
    if (found.kind === "door") { setFlightTarget(found.cameraTarget); setSelected({ ref: found.ref, kind: "door", label: found.label }); return; }
    if (found.kind === "unit") { setFlightTarget(found.cameraTarget); setSelected({ ref: found.ref, kind: "unit", label: found.label }); return; }
    focusRoom(found.spec, found.room);
  };

  // Apartment A Full Interior Reality V1 (Part 6) — LOCATE: select and
  // highlight the real canonical destination without moving the traveler
  // into it. A room ref gets a pure selection (the existing
  // useIsSelected/useRoomOpacity 3D highlight machinery already reacts to
  // `selected` with no camera movement needed); a door/unit ref keeps the
  // existing exterior-peek camera behavior every other LOCATE-only path
  // already used before this phase (a peek AT something from outside is
  // not "entering" it).
  const locateDestination = (ref: CanonicalRef) => {
    const found = findSpace(ref);
    if (!found) return;
    if (found.kind === "room") { setSelected({ ref: found.room.ref, kind: "room", label: found.room.label, parentRef: found.spec.interiorRef }); return; }
    if (found.kind === "door") { setFlightTarget(found.cameraTarget); setSelected({ ref: found.ref, kind: "door", label: found.label }); return; }
    if (found.kind === "unit") { setFlightTarget(found.cameraTarget); setSelected({ ref: found.ref, kind: "unit", label: found.label }); return; }
    if (found.kind === "level") { setSelected({ ref: found.level.ref, kind: "level", label: found.level.label }); return; }
    // interior — the same real exterior-peek enterInterior() itself falls
    // back to when policy denies FULL_3D (selectUnitAndFly/isolateLevelAndFly),
    // never a bare selection with no camera movement.
    if (unitPlanGeometry(found.spec.interiorRef)) selectUnitAndFly(found.spec.interiorRef);
    else isolateLevelAndFly(found.spec.ownerLevelRef, found.spec.label);
  };

  // Phase 16A §7 — selecting a residential unit from the Level card's
  // floor plan (or its 3D UnitVolume box) rotates/frames it from OUTSIDE
  // the facade rather than entering it: Facility's own representation
  // policy never grants a full 3D interior of a private unit
  // (resolveUnitMode is unconditionally OPERATIONAL_2D for facility
  // identity), so "enter" is deliberately not what this path does — that
  // remains a Development Mode-only capability (enterInterior, below).
  const selectUnitAndFly = (unitRef: CanonicalRef) => {
    endLiftView();
    const geo = unitPlanGeometry(unitRef);
    if (!geo) return;
    setActiveSystem(null);
    setIsolatedLevelRef(geo.levelRef);
    setActiveInteriorRef(null);
    setFocusedRoomRef(null);
    setFlightTarget(unitExteriorFocusCamera(geo.levelRef, geo));
    setSelected({ ref: unitRef, kind: "unit", label: unitRef, parentRef: geo.levelRef });
  };

  const exitToExterior = () => {
    endLiftView();
    setActiveSystem(null);
    setIsolatedLevelRef(null);
    setActiveInteriorRef(null);
    setFocusedRoomRef(null);
    setFlightTarget(LUNA_CAMERA_PRESETS.exteriorHero);
    setSelected(null);
    setHighlightedRefs([]);
  };

  const resetOverview = () => {
    endLiftView();
    setFlightTarget(LUNA_CAMERA_PRESETS.overview);
    setActiveSystem(null);
    setIsolatedLevelRef(null);
    setActiveInteriorRef(null);
    setFocusedRoomRef(null);
    setExploded(false);
    setSelected(null);
    setHighlightedRefs([]);
  };

  // Systems Mode is a distinct interaction mode from architectural
  // isolate/interior navigation — entering it clears the other two so the
  // fades never fight (see systemFadeOverride, which already takes
  // precedence, but a clean state read is worth more than relying on
  // precedence alone). Picking a specific system also flies to a wide
  // overview shot: "Water -> building fades -> B1 becomes emphasized" reads
  // as a single establishing view, not whatever close-up the user happened
  // to be at.
  const selectSystem = (system: OperationalSystem | "all" | null) => {
    setActiveSystem(system);
    setIsolatedLevelRef(null);
    setActiveInteriorRef(null);
    setFocusedRoomRef(null);
    if (!activeLift) setSelected(null);
    setHighlightedRefs([]);
    if (!activeLift && system !== null) setFlightTarget(LUNA_CAMERA_PRESETS.overview);
  };

  const returnToBuildingFromAsset = () => {
    setSelected(null);
    setFlightTarget(LUNA_CAMERA_PRESETS.overview);
  };

  // Clicking an operational asset marker in the 3D scene selects it (same
  // useSelection() path every other engine primitive already uses) — this
  // effect is what turns that selection into the "smooth navigation to an
  // asset" requirement, without OperationalAssetMarker itself needing to
  // know anything about the camera system. Oyi's own asset navigation
  // (see sceneActions.navigateToAsset below) reuses this exact same path
  // by just calling setSelected — it never sets flightTarget directly.
  useEffect(() => {
    if (!selected || !OPERATIONAL_KINDS.has(selected.kind)) return;
    if (isLiftRef(selected.ref)) { if (!activeLift || activeLift.ref !== selected.ref) showLiftView(selected.ref, "shaft"); return; }
    endLiftView();
    const asset = lunaTwinDataProvider.getAsset(selected.ref);
    if (asset) setFlightTarget(assetFocusCamera(asset));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.ref]);

  // Phase 6 — the Twin Intelligence orchestration layer. sceneActions is
  // Oyi's *only* way to move the twin: it never touches React state
  // directly, it calls these three methods, which reuse the exact same
  // state setters every manual UI control already uses. Built once (every
  // setState function React gives back is referentially stable), so this
  // never re-triggers the controller below on unrelated re-renders.
  const sceneActions: SceneActions = useMemo(
    () => ({
      assetView(ref, view) { if (!isLiftRef(ref)) return false; showLiftView(ref, view as LiftView); return true; },
      navigateToAsset(ref) {
        if (isLiftRef(ref) && interactionScope === "facility") { showLiftView(ref, activeLift?.ref === ref ? activeLift.view : "shaft"); return; }
        endLiftView();
        const asset = lunaTwinDataProvider.getAsset(ref);
        if (!asset) return;
        setHighlightedRefs([]);
        // Apartment A Full Interior Reality V1 (Part 6) — this branch used
        // to set activeInteriorRef unconditionally, which is exactly the
        // "data reaches the rendered map/room-list model" leak Part 6
        // warns about: activeInteriorRef alone drives ControlPanel's
        // "Inside:" 14-room list and (until this fix) could feed mapSpec
        // too, with no policy check of its own. Gated behind the SAME
        // FULL_3D check enterInterior() already uses — Facility asking Oyi
        // about an apartment device still gets the device's own state and
        // focus, just never the private room list, matching what clicking
        // the device directly would (never) grant them either.
        if (asset.system === "apartment-devices" && lunaRepresentationPolicy.resolveMode({ ref: APARTMENT_A_REF, identity: identityForScope(interactionScope) }) === "FULL_3D") {
          // Apartment devices are only visible/interactive while the
          // apartment interior is "entered" (see Phase 5's Consumer-scope
          // visibility fix) — Oyi has to open the same door a person
          // clicking "Enter Apartment A" would.
          setActiveSystem(null);
          setIsolatedLevelRef(APARTMENT_A_LEVEL_REF);
          setActiveInteriorRef(APARTMENT_A_REF);
        } else {
          setIsolatedLevelRef(null);
          setActiveInteriorRef(null);
          setFocusedRoomRef(null);
          setActiveSystem(asset.system);
        }
        setSelected({ ref: asset.ref, kind: asset.kind, label: asset.label, parentRef: asset.parentRef });
      },
      navigateToSpace(ref, options) {
        // Apartment A Full Interior Reality V1 (Part 1/2/19) — Oyi resolves
        // language to a canonical destination, then calls the SAME
        // enterDestination()/locateDestination() every other real entry
        // point (map, room list) uses; it never contains its own bespoke
        // navigation logic. `options.navAction` ("locate" vs the default
        // "enter") and `options.navModeOverride` (a one-shot TOUR/TELEPORT
        // override for just this call) come straight from the phrase the
        // user actually typed (see lunaIntentParser.ts's
        // matchSpatialNavAction) — never a second route/camera system.
        setHighlightedRefs([]);
        if (options?.navAction === "locate") {
          locateDestination(ref);
          return;
        }
        if (ref === LUNA_EXTERIOR_ENTRANCE_PLAZA) {
          const mode = options?.navModeOverride ?? navigationMode;
          if (mode === "TOUR") {
            const route = requestLunaRoute(LUNA_EXTERIOR_ENTRANCE_PLAZA);
            if (route) { routeDriverRef.current?.beginRoute(route); return; }
            locateDestination(ref);
            return;
          }
          exitToExterior();
          return;
        }
        enterDestination(ref, options?.navModeOverride);
      },
      setSystemMode(system) {
        selectSystem(system);
      },
      highlightRoute(refs) {
        setHighlightedRefs(refs);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [interactionScope, activeLift, isolatedLevelRef, flightTarget, navigationMode, currentSpaceRef, exploreMode]
  );

  const controller = useMemo(
    () =>
      new TwinIntelligenceController(
        lunaTwinDataProvider,
        lunaSimulationProvider,
        sceneActions,
        (ref) => explainAsset(lunaTwinDataProvider, lunaSimulationProvider, ref),
        (system, targetRef) => lunaBuildRoute(lunaTwinDataProvider, system, targetRef),
        (ref, type) => lunaResolveRelationship(ref, type)
      ),
    [sceneActions]
  );

  const askOyi = async (text: string): Promise<OyiResponse> => {
    const intent = parseIntent(text, oyiContext);
    const scopePolicy = buildScopePolicy(identityForScope(interactionScope));
    const response = await controller.handleIntent(intent, scopePolicy, oyiContext);
    setOyiContext(response.context);
    return response;
  };

  // Presentation mode's on-demand dashboard (Phase 12) — "Oyi, give me
  // Luna's status" summons a temporary glass summary instead of a
  // permanently-docked panel; any other question just moves/explains the
  // twin as usual and leaves no panel behind. A simple phrasing heuristic,
  // not a new intent kind — the underlying parseIntent/controller pipeline
  // is unchanged, this only decides whether to ALSO show a dismissible
  // summary of the same real response.
  const askOyiPresentation = async (text: string): Promise<OyiResponse> => {
    const response = await askOyi(text);
    if (/\bstatus\b/i.test(text)) {
      setDashboard({ title: "Luna — Status", text: response.text });
    }
    return response;
  };

  const representationIdentity = useMemo(() => identityForScope(interactionScope), [interactionScope]);

  // Apartment A Full Interior Reality V1 (Part 8, 22) — which FloorPlanSpec
  // the persistent map shows right now. The interior plan only ever
  // appears when RepresentationPolicy genuinely grants FULL_3D for THIS
  // identity (Part 22: "the data/render path itself should respect
  // policy, not hidden click handlers") — a Facility identity with
  // isolatedLevelRef "LUNA-L06" still only ever gets the common L06 plan,
  // never the private room breakdown, even though activeInteriorRef can
  // still be set (e.g. Development Mode's own enterInterior() bypass).
  const apartmentAAuthorized = lunaRepresentationPolicy.resolveMode({ ref: "LUNA-L06-APT-A", identity: representationIdentity }) === "FULL_3D";
  // A completed TOUR arrival advances currentSpaceRef (STE1.1's own real,
  // route-step-driven "where the user really is") without necessarily
  // touching isolatedLevelRef/activeInteriorRef — those two are TELEPORT/
  // camera-focus concepts. Resolving currentSpaceRef the same way keeps
  // the map honestly showing wherever the traveler really ended up,
  // regardless of which mechanism (TOUR or TELEPORT) got them there.
  const currentSpaceLookup = findSpace(currentSpaceRef);
  const currentSpaceOwnerLevelRef =
    currentSpaceLookup?.kind === "level" ? currentSpaceLookup.level.ref
    : currentSpaceLookup?.kind === "interior" || currentSpaceLookup?.kind === "room" ? currentSpaceLookup.spec.ownerLevelRef
    : null;
  const currentSpaceInteriorRef =
    currentSpaceLookup?.kind === "interior" || currentSpaceLookup?.kind === "room" ? currentSpaceLookup.spec.interiorRef : null;
  // The SAME "are we really in Apartment A" fact mapSpec uses to pick
  // which plan to render also has to gate the dot's own world->local
  // transform (resolveSpatialMapContext branches apartment-local vs
  // L06-common purely off this ref) — computed once here so a TOUR
  // arrival and a TELEPORT arrival both produce a live dot in the right
  // frame, not just the right map.
  const effectiveInteriorRef = activeInteriorRef ?? currentSpaceInteriorRef;
  const mapSpec =
    (activeInteriorRef === "LUNA-L06-APT-A" || currentSpaceInteriorRef === "LUNA-L06-APT-A") && apartmentAAuthorized
      ? floorPlanForInterior("LUNA-L06-APT-A")
      : isolatedLevelRef === "LUNA-L06" || currentSpaceOwnerLevelRef === "LUNA-L06"
      ? LUNA_L06_FLOOR_PLAN
      : null;
  const mapContext: SpatialMapContext = liveWorldPosition ? resolveSpatialMapContext(liveWorldPosition, effectiveInteriorRef) : { kind: "off-floor" };

  // Spatial navigation restoration pass §5/§6/§9 — derives which
  // contextual-card state is current purely from EXISTING state
  // (selected + activeInteriorRef + the spatial registry), rather than
  // adding a new parallel "what card is open" state that could drift out
  // of sync. "unit-summary" (selected, not entered) and "interior"
  // (activeInteriorRef matches — actually ENTERED) are deliberately
  // different states even when `selected.ref` is identical (true for
  // every private unit, since Phase 3 gave each private interior the
  // exact same ref as its owning unit) — selecting is never entering.
  const cardState: PresentationCardState = useMemo(() => {
    if (!selected) return { kind: "other" };
    if (selected.kind === "level") return { kind: "level", levelRef: selected.ref };
    if (selected.kind === "unit") {
      const geo = unitPlanGeometry(selected.ref);
      if (geo) {
        if (activeInteriorRef === selected.ref) {
          const spec = interiorForUnit(selected.ref);
          if (spec) return { kind: "interior", spec, isPrivateUnit: true };
        }
        return { kind: "unit-summary", unitRef: selected.ref };
      }
      // Not a residential unit ref — this is the interiorRef of an
      // ENTERED common area (Ground Lobby, Residents' Club, Luna Sky) or
      // a private single-unit level (Penthouse), both reached only via
      // enterInterior, so `selected` already resolves through findSpace.
      const found = findSpace(selected.ref);
      if (found?.kind === "interior") return { kind: "interior", spec: found.spec, isPrivateUnit: isPrivateUnitInteriorRef(found.spec.interiorRef) };
    }
    if (selected.kind === "room" && selected.parentRef) {
      const found = findSpace(selected.parentRef);
      if (found?.kind === "interior") return { kind: "interior", spec: found.spec, isPrivateUnit: isPrivateUnitInteriorRef(found.spec.interiorRef) };
    }
    const asset = lunaTwinDataProvider.getAsset(selected.ref);
    const assetInterior = asset?.unitRef ? interiorForUnit(asset.unitRef) : undefined;
    if (assetInterior && lunaRepresentationPolicy.resolveMode({ ref: assetInterior.interiorRef, identity: representationIdentity }) === "FULL_3D") {
      return { kind: "interior", spec: assetInterior, isPrivateUnit: true };
    }
    return { kind: "other" };
  }, [selected, activeInteriorRef, representationIdentity]);

  // Lightweight elevation previews share canonical geometry; no extra WebGL scenes.
  const engineeringOptions = useMemo(() => {
    const assets = lunaRepresentationPolicy.filterAuthorizedAssets(lunaTwinDataProvider.listAssets(), representationIdentity);
    const floors = LUNA_LEVELS.map((level) => ({ width: level.footprint.width, y: level.baseElevation, height: level.height }));
    return ENGINEERING_LAYER_OPTIONS.filter((option) => option.key !== "apartment-devices" || assets.some((asset) => asset.system === option.key)).map((option) => {
      const matching = assets.filter((asset) => option.key === "all" || asset.system === option.key);
      return { ...option, preview: { floors, points: matching.map((asset) => ({ x: asset.position.x, y: (LUNA_LEVELS.find((level) => level.ref === asset.ownerLevelRef)?.baseElevation ?? 0) + asset.position.y })), label: `${option.label}: modeled building elevation${matching.length ? `, ${matching.length} authorized assets` : ""}` } };
    });
  }, [representationIdentity]);

  // Derived from the engine's existing flags; no parallel view-mode state.
  const activeView = exploded ? "explode" : sectionMode ? "cutaway" : "normal";
  const selectView = (mode: string) => {
    setSectionMode(mode === "cutaway");
    setExploded(mode === "explode");
  };
  const engineeringButtonLabel = activeSystem === null ? "Architecture" : activeSystem === "all" ? "All Systems" : SYSTEM_LABEL[activeSystem];
  const exploreBounds = useMemo(() => lunaExploreBounds(activeInteriorRef, isolatedLevelRef), [activeInteriorRef, isolatedLevelRef]);
  const exploreTargetDescriptor = useMemo(() => exploreTarget ? descriptorForExploreTarget(exploreTarget.ref) : null, [exploreTarget]);
  const exploreTargetLabel = exploreTargetDescriptor ? `Interact · ${exploreTargetDescriptor.label}` : null;

  const updateExploreMovement = (action: ExploreInputAction, active: boolean) => {
    setExploreMovement((intent) => movementWithAction(intent, action, active));
  };

  const onExploreMoveSample = (position: { x: number; y: number; z: number }) => {
    setLiveWorldPosition(position);
    const resolved = resolveLunaExploreSpace(position, activeInteriorRef);
    if (resolved !== currentSpaceRef) onRouteCurrentSpaceChange(resolved);
  };

  const handleExploreInteract = () => {
    const descriptor = exploreTargetDescriptor ?? selected;
    if (!descriptor) return;
    const targetRef = descriptor.ref;
    setHighlightedRefs([targetRef]);

    if (descriptor.kind === "door") {
      const transition = LUNA_TRANSITION_BINDINGS.doorTransitions.find((t) =>
        t.boundaryRef === targetRef && (t.fromSpaceRef === currentSpaceRef || t.toSpaceRef === currentSpaceRef)
      );
      if (transition) {
        const destination = transition.fromSpaceRef === currentSpaceRef ? transition.toSpaceRef : transition.fromSpaceRef;
        const route = requestLunaRoute(destination);
        if (route) {
          routeDriverRef.current?.beginRoute(route);
          return;
        }
      }
      setSelected(descriptor);
      return;
    }

    if (isLiftRef(targetRef)) {
      showLiftView(targetRef, "shaft");
      return;
    }

    if (descriptor.kind === "unit") {
      enterDestination(targetRef);
      return;
    }

    if (descriptor.kind === "room") {
      locateDestination(targetRef);
      return;
    }

    setSelected(descriptor);
  };

  useEffect(() => {
    if (!exploreMode) return;
    const actionForKey = (key: string): ExploreInputAction | null => {
      if (key === "w" || key === "W" || key === "ArrowUp") return "MOVE_FORWARD";
      if (key === "s" || key === "S" || key === "ArrowDown") return "MOVE_BACKWARD";
      if (key === "a" || key === "A" || key === "ArrowLeft") return "MOVE_LEFT";
      if (key === "d" || key === "D" || key === "ArrowRight") return "MOVE_RIGHT";
      if (key === "e" || key === "E" || key === "Enter") return "INTERACT";
      if (key === "Escape") return "EXIT";
      return null;
    };
    const isTypingTarget = (target: EventTarget | null) => target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const action = actionForKey(event.key);
      if (!action) return;
      event.preventDefault();
      if (action === "EXIT") { exitExploreMode(); return; }
      if (action === "INTERACT") { handleExploreInteract(); return; }
      setExploreMovement((intent) => movementWithAction(intent, action, true));
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const action = actionForKey(event.key);
      if (!action || action === "INTERACT" || action === "EXIT") return;
      event.preventDefault();
      setExploreMovement((intent) => movementWithAction(intent, action, false));
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exploreMode, exploreTargetDescriptor, currentSpaceRef, interactionScope, selected]);

  // Phase 16A correction §3 — the selected residential unit's world-space
  // AABB, fed to SelectionFrameProbe so DraggableSurface can tell whether
  // the context card is actually obstructing the framed subject. Only
  // ever set for a real/generated apartment selection (unitPlanGeometry
  // resolves), matching exactly the same "is this a real unit" test the
  // card-rendering branch below uses.
  const selectedUnitBox: WorldAABB | null = useMemo(() => {
    if (!selected || selected.kind !== "unit") return null;
    const geo = unitPlanGeometry(selected.ref);
    if (!geo) return null;
    const level = LUNA_LEVELS.find((l) => l.ref === geo.levelRef);
    const base = level?.baseElevation ?? 0;
    const height = level?.height ?? 3.25;
    return {
      minX: geo.x - geo.width / 2,
      maxX: geo.x + geo.width / 2,
      minY: base,
      maxY: base + height,
      minZ: geo.z - geo.depth / 2,
      maxZ: geo.z + geo.depth / 2,
    };
  }, [selected]);

  // Phase 16A correction §3 (fix) — SelectionFrameProbe only ever gets a
  // box once CameraRig has had time to actually settle on it. Feeding it
  // the box immediately would have the probe project the AABB through
  // every INTERMEDIATE frame of the flight too — including the very first
  // frames right after a still-distant previous camera position, where
  // the projected box can transiently swing across huge swathes of the
  // screen — producing spurious "collision" relocations that have nothing
  // to do with the final, settled composition. CameraRig's own lerp
  // (0.11/frame, see CameraRig.tsx) converges well inside this window for
  // every distance this app's unit-focus flights actually cover.
  const [settledUnitBox, setSettledUnitBox] = useState<WorldAABB | null>(null);
  useEffect(() => {
    setSettledUnitBox(null);
    if (!selectedUnitBox) return;
    const t = setTimeout(() => setSettledUnitBox(selectedUnitBox), 1400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <RepresentationContext.Provider value={{ identity: representationIdentity, policy: lunaRepresentationPolicy }}>
    <RouteHighlightContext.Provider value={{ highlightedRefs, setHighlightedRefs }}>
    <HoverContext.Provider value={{ hovered, setHovered }}>
    <TwinDataContext.Provider value={lunaTwinDataProvider}>
      <TwinRuntimeContext.Provider value={lunaSimulationProvider}>
        <SelectionContext.Provider value={{ selected, select: setSelected }}>
          <SceneModeContext.Provider
            value={{
              isolatedLevelRef,
              isolateLevel: setIsolatedLevelRef,
              exploded,
              toggleExploded: () => setExploded((v) => !v),
              explodeGap: 3.5,
              activeSystem,
              setActiveSystem,
              sectionMode,
              toggleSectionMode: () => setSectionMode((v) => !v),
              sectionSide,
              setSectionSide,
              levelHasSystemAssets: lunaLevelHasSystemAssets,
            }}
          >
            <InteriorFocusContext.Provider value={{ activeInteriorRef, setActiveInterior: setActiveInteriorRef, focusedRoomRef, setFocusedRoom: setFocusedRoomRef }}>
              <div className={`viewer-root${sidebarOpen ? " sidebar-open" : ""}`}>
                <Canvas
                  shadows
                  dpr={[1, 2]}
                  camera={{ position: LUNA_CAMERA_PRESETS.exteriorHero.position, fov: 42, near: 0.1, far: 2600 }}
                  gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05, localClippingEnabled: true }}
                  onPointerMissed={() => { endLiftView(); setSelected(null); }}
                >
                  <color attach="background" args={[SKY_COLOR[lightingMode]]} />
                  <fog attach="fog" args={[SKY_COLOR[lightingMode], FOG_NEAR[lightingMode], FOG_FAR[lightingMode]]} />
                  <Suspense fallback={null}>
                    <Lighting mode={lightingMode} quality="high" outdoorReflections reflectionMap="/exterior-materials/venice_sunset_1k.hdr" />
                    <LightingModeContext.Provider value={lightingMode}>
                      <LunaBuilding
                        groundArchitecture={groundArchitecture}
                        liftInspection={Boolean(activeLift) && interactionScope === "facility"}
                        entranceDoorState={entranceDoorState}
                        onSelectEntranceDoor={enterGroundLobbyViaEntrance}
                        onEntranceDoorProgress={(p) => { entranceClearanceRef.current = p; routeDriverRef.current?.setEntranceDoorProgress(p); }}
                        apartmentAEntranceOpen={apartmentAEntranceOpen}
                        onApartmentAAngleChange={(p) => routeDriverRef.current?.setApartmentADoorProgress(p)}
                      />
                      <LunaRouteDriver
                        ref={routeDriverRef}
                        identity={representationIdentity}
                        onFlightTargetChange={setFlightTarget}
                        onEntranceDoorStateChange={setEntranceDoorState}
                        onApartmentADoorStateChange={setApartmentAEntranceOpen}
                        onAccessPromptChange={setAccessPromptBoundary}
                        onRouteChange={setActiveRoute}
                        onNarration={setRouteNarration}
                        onCurrentSpaceChange={onRouteCurrentSpaceChange}
                        getLevelElevation={getLevelElevation}
                        onFlyToLiftLanding={onFlyToLiftLanding}
                        onEnterLiftCar={onEnterLiftCar}
                        onExitLiftCar={onExitLiftCar}
                        getLiftSnapshot={getLiftSnapshot}
                        requestLiftCommand={(liftRef, kind, floorRef) => requestLiftCommand(liftRef, kind, floorRef)}
                      />
                    </LightingModeContext.Provider>
                  </Suspense>
                  <CameraRig ref={controlsRef} flightTarget={exploreMode ? null : flightTarget} followTarget={exploreMode ? undefined : followTarget} manualLook={exploreMode} onArrive={(t) => routeDriverRef.current?.handleCameraArrive(t)} />
                  <ExploreCameraDriver
                    active={exploreMode}
                    movement={exploreMovement}
                    controlsRef={controlsRef}
                    bounds={exploreBounds}
                    allowStep={(from, to) => podiumStepAllowed(from, to, entranceClearanceRef.current >= 0.95)}
                    onTargetChange={setExploreTarget}
                    onMoveSample={onExploreMoveSample}
                  />
                  {/* Apartment A Full Interior Reality V1 (Part 27) — only
                      tracked while a map is actually on screen to consume it
                      (mapSpec truthy): nothing renders the live dot
                      otherwise, so reporting position every frame elsewhere
                      (e.g. mid-flight during an unrelated lift/route journey)
                      would just be wasted per-frame App-level re-renders. */}
                  {mapSpec && <LiveWorldPositionReporter controlsRef={controlsRef} onPosition={setLiveWorldPosition} />}
                  <SelectionFrameProbe box={settledUnitBox} onRectChange={setUnitScreenRect} />
                </Canvas>

                {/* Phase 16A correction §6 — Development Mode's own entry
                    point into Presentation Mode. The reverse direction (a
                    permanent "Exit to Dev Harness" button) is gone —
                    Presentation Mode now exposes that same action from
                    inside its own top-right overflow menu instead, so this
                    button only ever needs to say one thing. */}
                {/* Spatial Transition Engine V1.1 Part 14 — lightweight,
                    real route narration (never a verbose travel-narration
                    engine): shown only while a real route is actually in
                    flight, reflecting the SAME status the route engine
                    itself is in. */}
                {activeRoute && activeRoute.status !== "ARRIVED" && activeRoute.status !== "CANCELLED" && (
                  <div
                    style={{
                      position: "absolute",
                      top: 14,
                      left: "50%",
                      transform: "translateX(-50%)",
                      zIndex: 20,
                      background: "rgba(14,16,22,0.78)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#eee",
                      borderRadius: 8,
                      padding: "6px 14px",
                      fontSize: 12,
                      pointerEvents: "none",
                    }}
                  >
                    {routeNarration ?? "Travelling…"}
                  </div>
                )}

                {/* Apartment A Full Interior Reality V1 (Part 6) — mounted
                    strictly off the real PAUSED_FOR_USER_INPUT signal
                    LunaRouteDriver reports via onAccessPromptChange, never
                    a decorative always-there login box. Validation happens
                    entirely through submitCredential() -> the same real
                    AccessResolver every other access check already uses —
                    this component never compares the code itself. */}
                {accessPromptBoundary === "LUNA-L06-APT-A-ENTRANCE-DOOR" && (
                  <div style={{ position: "absolute", inset: 0, zIndex: 25, pointerEvents: "none" }}>
                    <AccessCodePanel label="Apartment A" onSubmit={(code) => routeDriverRef.current?.submitCredential(code)} />
                  </div>
                )}

                {/* Apartment A Full Interior Reality V1 (Parts 8, 12, 26) —
                    the persistent compact map. Tap 1 (not already
                    selected, or already entered) = LOCATE only; tap 2 (the
                    already-selected-but-not-entered destination) = ENTER,
                    which dispatches through enterDestination() using the
                    session's current navigationMode — the SAME two-stage
                    grammar and destination resolver every other real entry
                    point (Oyi, the room list) already uses.
                    Spatial Card + 2D Plan Visual Convergence V1 (Part 9) —
                    suppressed here specifically when InteriorNavigationCard
                    is already showing this EXACT SAME plan embedded in the
                    one persistent Spatial Card, so the traveler is never
                    shown two live maps of the same interior at once. Any
                    other context (no matching card open, or the card is
                    showing a level/apartment-summary state that doesn't yet
                    embed its own live map) keeps this corner map as the
                    honest fallback for continuous live-position tracking. */}
                {mapSpec && (!presentationMode || cardState.kind === "other") && (
                  <LunaSpatialMap
                    spec={mapSpec}
                    selectedRef={selected?.ref ?? null}
                    mapContext={mapContext}
                    navigationMode={navigationMode}
                    onSetNavigationMode={setNavigationMode}
                    onLocate={(ref) =>
                      handleSpatialTap(ref, { selectedRef: selected?.ref ?? null, enteredRef: focusedRoomRef }, { onLocate: locateDestination, onEnter: (r) => enterDestination(r) })
                    }
                  />
                )}

                {!presentationMode && (
                  <button
                    onClick={() => setPresentationMode(true)}
                    style={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      zIndex: 20,
                      background: "rgba(14,16,22,0.75)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#eee",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    Presentation Mode
                  </button>
                )}

                {!presentationMode && (
                  <>
                    <ControlPanel
                      controlsRef={controlsRef}
                      onFlyTo={flyTo}
                      onResetOverview={resetOverview}
                      onIsolateLevel={isolateLevelAndFly}
                      activeInteriorRef={activeInteriorRef}
                      onEnterInterior={enterInterior}
                      onFocusRoom={focusRoom}
                      onExitInterior={exitToExterior}
                      onSelectSystem={selectSystem}
                      lightingMode={lightingMode}
                      onSetLightingMode={setLightingMode}
                    />
                    <AssetInfoPanel onReturnToBuilding={returnToBuildingFromAsset} />
                    <ScenarioPanel />
                    <OyiPanel onAsk={askOyi} scope={interactionScope} onScopeChange={setInteractionScope} />
                    <SelectionDebug />
                  </>
                )}

                {presentationMode && (
                  <>
                    <HoverLabel />

                    {/* Interface convergence pass §1 — one coherent top
                        command glass: Oyi search (same controller the orb
                        uses), a reserved (empty) identity slot, and the
                        existing weather/time/lighting + Facility Manager
                        surfaces reused in "bare" mode so nothing reads as
                        a second nested card. */}
                    <TopCommandBar
                      onAsk={askOyiPresentation}
                      locationLabel={LUNA_WEATHER_LOCATION_LABEL}
                      weather={lunaWeatherState()}
                      lightingMode={lightingMode}
                      onSetLightingMode={setLightingMode}
                      sidebarOpen={sidebarOpen}
                      onToggleSidebar={() => setSidebarOpen((v) => !v)}
                      onOpenOyi={() => setOyiConversationOpen(true)}
                    />

                    {/* Sidebar shell and compact representation/view launchers. */}
                    <aside id="luna-sidebar" aria-label="Facility sidebar" inert={!sidebarOpen} className="luna-sidebar" style={GLASS_SURFACE}>
                      <footer><ProfileSurface bare name="Facility Manager" role="Facility Manager" org="Ochiga Properties" onDevMode={() => setPresentationMode(false)} onResetView={resetOverview} onNewProject={() => setCreateProjectOpen(true)} /></footer>
                    </aside>
                    <div className="luna-rail">
                      <LiftLevelRail tracking={Boolean(activeLift && isLiftTracking(activeLift.view))} liftRef={activeLift?.ref ?? null}
                        engineeringLabel={engineeringButtonLabel}
                        engineeringIcon={activeSystem ?? "architecture"}
                        engineeringOpen={engineeringDrawerOpen}
                        viewOpen={viewDrawerOpen}
                        onEngineering={() => { setViewDrawerOpen(false); setEngineeringDrawerOpen((v) => !v); }}
                        onView={() => { setEngineeringDrawerOpen(false); setViewDrawerOpen((v) => !v); }}
                        levels={LUNA_LEVEL_RAIL_ITEMS}
                        activeLevelRef={isolatedLevelRef}
                        onSelectLevel={(ref) => {
                          const level = LUNA_LEVEL_RAIL_ITEMS.find((l) => l.ref === ref);
                          isolateLevelAndFly(ref, level?.shortLabel ?? ref);
                        }}
                      />
                      {elevatorBoardOpen && (
                        <ElevatorControlBoard
                          focusedRef={focusedLiftRef}
                          liftView={activeLift?.ref === focusedLiftRef ? activeLift.view : null}
                          onSelectLift={(ref) => showLiftView(ref, activeLift?.ref === ref ? activeLift.view : "shaft")}
                          onLiftView={(view) => showLiftView(focusedLiftRef, view)}
                          collapsed={elevatorBoardCollapsed}
                          onToggleCollapsed={() => setElevatorBoardCollapsed((v) => !v)}
                        />
                      )}
                      {waterBoardOpen && (
                        <WaterControlBoard
                          focusedRef={focusedWaterRef}
                          onSelectTab={(ref) => setSelected({ ref, kind: "device", label: lunaTwinDataProvider.getAsset(ref)?.label ?? ref })}
                          collapsed={waterBoardCollapsed}
                          onToggleCollapsed={() => setWaterBoardCollapsed((v) => !v)}
                        />
                      )}
                      {electricalBoardOpen && (
                        <ElectricalControlBoard
                          focusedRef={focusedElectricalRef}
                          onSelectTab={(ref) => setSelected({ ref, kind: "device", label: lunaTwinDataProvider.getAsset(ref)?.label ?? ref })}
                          collapsed={electricalBoardCollapsed}
                          onToggleCollapsed={() => setElectricalBoardCollapsed((v) => !v)}
                        />
                      )}
                      {fireBoardOpen && (
                        <FireControlBoard
                          focusedRef={focusedFireRef}
                          onSelectTab={(ref) => setSelected({ ref, kind: "device", label: lunaTwinDataProvider.getAsset(ref)?.label ?? ref })}
                          collapsed={fireBoardCollapsed}
                          onToggleCollapsed={() => setFireBoardCollapsed((v) => !v)}
                        />
                      )}
                      {hvacBoardOpen && (
                        <HvacControlBoard
                          focusedRef={focusedHvacRef}
                          onSelectTab={(ref) => setSelected({ ref, kind: "device", label: lunaTwinDataProvider.getAsset(ref)?.label ?? ref })}
                          collapsed={hvacBoardCollapsed}
                          onToggleCollapsed={() => setHvacBoardCollapsed((v) => !v)}
                        />
                      )}
                      {accessBoardOpen && (
                        <AccessControlBoard
                          focusedRef={focusedAccessRef}
                          onSelectTab={(ref) => setSelected({ ref, kind: "device", label: lunaTwinDataProvider.getAsset(ref)?.label ?? ref })}
                          collapsed={accessBoardCollapsed}
                          onToggleCollapsed={() => setAccessBoardCollapsed((v) => !v)}
                        />
                      )}
                      {cctvBoardOpen && (
                        <CctvControlBoard
                          focusedRef={focusedCctvRef}
                          onSelectTab={(ref) => setSelected({ ref, kind: "device", label: lunaTwinDataProvider.getAsset(ref)?.label ?? ref })}
                          collapsed={cctvBoardCollapsed}
                          onToggleCollapsed={() => setCctvBoardCollapsed((v) => !v)}
                        />
                      )}
                      {networkBoardOpen && (
                        <NetworkControlBoard
                          focusedRef={focusedNetworkRef}
                          onSelectTab={(ref) => setSelected({ ref, kind: "device", label: lunaTwinDataProvider.getAsset(ref)?.label ?? ref })}
                          collapsed={networkBoardCollapsed}
                          onToggleCollapsed={() => setNetworkBoardCollapsed((v) => !v)}
                        />
                      )}
                      {drainageBoardOpen && (
                        <DrainageControlBoard
                          focusedRef={focusedDrainageRef}
                          onSelectTab={(ref) => setSelected({ ref, kind: "device", label: lunaTwinDataProvider.getAsset(ref)?.label ?? ref })}
                          collapsed={drainageBoardCollapsed}
                          onToggleCollapsed={() => setDrainageBoardCollapsed((v) => !v)}
                        />
                      )}
                    </div>
                    <ExploreController
                      active={exploreMode}
                      movement={exploreMovement}
                      targetLabel={exploreTargetLabel}
                      onActivate={() => { setExploreMode(true); setFlightTarget(null); }}
                      onActionStart={(action) => updateExploreMovement(action, true)}
                      onActionEnd={(action) => updateExploreMovement(action, false)}
                      onInteract={handleExploreInteract}
                      onOpenOyi={() => setOyiConversationOpen(true)}
                      onExit={exitExploreMode}
                    />
                    {(!exploreMode || oyiConversationOpen) && (
                      <div style={{ position: "absolute", right: 16, bottom: 18, pointerEvents: "none" }}>
                        <OyiOrb
                          onAsk={askOyiPresentation}
                          suggestedPrompts={OYI_SUGGESTED_PROMPTS}
                          expanded={oyiConversationOpen}
                          onExpandedChange={setOyiConversationOpen}
                        />
                      </div>
                    )}

                    <EngineeringDrawer
                      open={engineeringDrawerOpen}
                      onClose={() => setEngineeringDrawerOpen(false)}
                      options={engineeringOptions}
                      activeSystem={activeSystem}
                      onSelectSystem={selectSystem}
                    />
                    <ScenesDrawer title="View" description="Apply a spatial view to the active engineering representation" closeOnSelect={false} open={viewDrawerOpen} onClose={() => setViewDrawerOpen(false)} scenes={VIEW_OPTIONS} activeRef={activeView} onSelectScene={selectView} />

                    {/* Spatial navigation restoration pass §5/§6/§9/§11 —
                        ONE contextual card, whose CONTENT follows the
                        Building -> Level -> Apartment -> Interior -> Room
                        depth hierarchy (cardState, derived above from
                        selected + activeInteriorRef + the spatial
                        registry — never a second parallel state). Camera
                        choreography (isolateLevelAndFly / selectUnitAndFly
                        / enterInterior / focusRoom) stays completely
                        independent of where the card sits or what it's
                        currently showing. Anything outside this hierarchy
                        (a device/asset marker) still uses the original
                        generic LunaContextCard, unchanged. */}
                    {cardState.kind !== "other" && (
                      <DraggableSurface zone={cardZone} onZoneChange={setCardZone} avoidRect={unitScreenRect}>
                        {cardState.kind === "level" && (
                          <LevelContextCard
                            key={cardState.levelRef}
                            navigationControls={<NavigationModeToggle mode={navigationMode} onSetMode={setNavigationMode} />}
                            livePosition={cardState.levelRef === "LUNA-L06" && mapContext.kind === "l06-common" ? mapContext.local : null}
                            onFocusRegion={(ref) => {
                              setHighlightedRefs([ref]);
                              const asset = lunaTwinDataProvider.getAsset(ref);
                              const space = findSpace(ref);
                              if (asset) setFlightTarget(unitExteriorFocusCamera(cardState.levelRef, { ...asset.position, width: 3, depth: 3 }));
                              else if (space?.kind === "room") setFlightTarget(unitExteriorFocusCamera(space.spec.ownerLevelRef, space.room));
                              else { const core = LUNA_CORES.find((c) => c.ref === ref); if (core) setFlightTarget(unitExteriorFocusCamera(cardState.levelRef, core)); }
                            }}
                            levelRef={cardState.levelRef}
                            selectedUnitRef={null}
                            onSelectUnit={selectUnitAndFly}
                            onEnterLevelSpace={(ref) => sceneActions.navigateToSpace(ref)}
                            onEnterInterior={(interiorRef) => {
                              const spec = LUNA_INTERIORS.find((i) => i.interiorRef === interiorRef);
                              if (spec) enterDestination(spec.interiorRef);
                            }}
                            onExit={exitToExterior}
                            onClose={() => setSelected(null)}
                            representationMode={representationMode2D3D}
                            onSetRepresentationMode={setRepresentationMode2D3D}
                          />
                        )}
                        {cardState.kind === "unit-summary" && (
                          <ApartmentContextCard
                            unitRef={cardState.unitRef}
                            navigationControls={<NavigationModeToggle mode={navigationMode} onSetMode={setNavigationMode} />}
                            livePosition={mapContext.kind === "l06-common" ? mapContext.local : null}
                            onBack={() => {
                              const levelRef = selected?.parentRef ?? unitPlanGeometry(cardState.unitRef)?.levelRef;
                              if (!levelRef) return;
                              const label = LUNA_LEVELS.find((l) => l.ref === levelRef)?.label ?? levelRef;
                              isolateLevelAndFly(levelRef, label);
                            }}
                            onClose={() => setSelected(null)}
                            onEnter={() => {
                              const spec = interiorForUnit(cardState.unitRef);
                              if (spec) enterDestination(spec.interiorRef);
                            }}
                            representationMode={representationMode2D3D}
                            onSetRepresentationMode={setRepresentationMode2D3D}
                          />
                        )}
                        {cardState.kind === "interior" && (
                          <InteriorNavigationCard
                            spec={cardState.spec}
                            parentLabel={
                              cardState.isPrivateUnit
                                ? unitInteriorParentLabel(cardState.spec)
                                : LUNA_LEVELS.find((l) => l.ref === cardState.spec.ownerLevelRef)?.label ?? cardState.spec.ownerLevelRef
                            }
                            focusedRoomRef={cardState.spec.rooms.find((room) => selected?.ref === room.ref || selected?.ref.startsWith(`${room.ref}-`))?.ref ?? focusedRoomRef}
                            selectedAssetRef={selected?.ref}
                            onSelectAsset={(ref) => { const asset = lunaTwinDataProvider.getAsset(ref); if (asset) setSelected({ ref, kind: asset.kind, label: asset.label, parentRef: asset.unitRef }); }}
                            onSelectRoom={(room) => locateDestination(room.ref)}
                            onEnterRoom={(ref) => enterDestination(ref)}
                            onBack={() => {
                              const selectedRoom = cardState.spec.rooms.find((room) => selected?.ref.startsWith(`${room.ref}-`));
                              if (selectedRoom) { locateDestination(selectedRoom.ref); return; }
                              if (selected?.kind === "room" || focusedRoomRef) {
                                enterInterior(cardState.spec);
                                return;
                              }
                              if (cardState.isPrivateUnit) {
                                selectUnitAndFly(cardState.spec.interiorRef);
                                return;
                              }
                              // Spatial Transition Engine V1 Part 11 — the
                              // Grand Lobby's own back-out is a REAL Exit
                              // Building transition (camera physically
                              // crosses back through the entrance), not a
                              // teleport to the exterior hero shot. Every
                              // other interior's back-out is unaffected.
                              if (cardState.spec.interiorRef === "LUNA-GROUND-LOBBY") {
                                const route = requestLunaRoute(LUNA_EXTERIOR_ENTRANCE_PLAZA);
                                if (route) routeDriverRef.current?.beginRoute(route);
                                return;
                              }
                              const parentLevel = LUNA_LEVELS.find((l) => l.ref === cardState.spec.ownerLevelRef);
                              isolateLevelAndFly(cardState.spec.ownerLevelRef, parentLevel?.label ?? cardState.spec.ownerLevelRef);
                            }}
                            onClose={() => setSelected(null)}
                            representationMode={representationMode2D3D}
                            onSetRepresentationMode={setRepresentationMode2D3D}
                            mapContext={mapContext}
                            navigationMode={navigationMode}
                            onSetNavigationMode={setNavigationMode}
                          />
                        )}
                      </DraggableSurface>
                    )}
                    {cardState.kind === "other" && selected && !isLiftRef(selected.ref) && !isWaterBoardRef(selected.ref) && !isElectricalBoardRef(selected.ref) && !isFireBoardRef(selected.ref) && !isHvacBoardRef(selected.ref) && !isAccessBoardRef(selected.ref) && !isCctvBoardRef(selected.ref) && !isNetworkBoardRef(selected.ref) && !isDrainageBoardRef(selected.ref) && (
                      <div style={{ position: "absolute", right: 16, bottom: 90, pointerEvents: "none" }}>
                        <LunaContextCard
                          liftView={activeLift?.ref === selected.ref ? activeLift.view : null}
                          onLiftView={(view) => { if (isLiftRef(selected.ref)) showLiftView(selected.ref, view); }}
                          onEnterSpace={(ref) => sceneActions.navigateToSpace(ref)}
                        />
                      </div>
                    )}

                    {dashboard && (
                      <div style={{ position: "absolute", left: 16, top: 80, pointerEvents: "none" }}>
                        <DashboardPanel title={dashboard.title} onClose={() => setDashboard(null)}>
                          {dashboard.text}
                        </DashboardPanel>
                      </div>
                    )}

                    {createProjectOpen && (
                      <CreateProjectFlow store={projectStore} adapters={ingestionAdapterRegistry} onClose={() => setCreateProjectOpen(false)} />
                    )}
                  </>
                )}
              </div>
            </InteriorFocusContext.Provider>
          </SceneModeContext.Provider>
        </SelectionContext.Provider>
      </TwinRuntimeContext.Provider>
    </TwinDataContext.Provider>
    </HoverContext.Provider>
    </RouteHighlightContext.Provider>
    </RepresentationContext.Provider>
  );
}
