import { LiftContextCard } from "./lift/LiftContextCard";
import type { LiftNavigationProps } from "./lift/LiftControlsPanel";
import { isLiftRef } from "./lift/lunaLift";
import { useSelection, useRepresentation, useTwinData, useTwinRuntime, ContextCard, type ContextCardContent } from "../engine";
import { LUNA_OPERATIONAL_ASSETS } from "./operational/lunaOperationalAssets";
import { lunaRepresentationPolicy } from "./policy/lunaRepresentationPolicy";
import { LUNA_STRUCTURAL_ELEMENTS, LUNA_STRUCTURAL_CORE_WALL } from "./structure/lunaStructuralElements";
import { LUNA_LEVELS } from "./lunaProgramme";
import { LUNA_L06_APT_A } from "./interiors/lunaInteriors";
import { roomSourceType } from "./ingestion/lunaL06AptAAdapter";
import { GROUND_ENTRANCE_REF } from "./architecture/GroundEntrance";
import { GROUND_STAIR_REFS } from "./architecture/groundLobbyLayout";
import { isAccessGovernedRef } from "./runtime/lunaAccessResolver";

const STRUCTURAL_TYPE_LABEL: Record<string, string> = {
  foundation: "Foundation",
  "retaining-wall": "Retaining Wall",
  "core-wall": "Core Wall",
  column: "Column",
  slab: "Slab",
  "transfer-beam": "Transfer Beam",
  beam: "Beam",
  "stair-structure": "Stair Structure",
  "roof-structure": "Roof Structure",
};

const COMMAND_LABEL: Record<string, string> = {
  turnOn: "Turn On",
  turnOff: "Turn Off",
  lock: "Lock",
  unlock: "Unlock",
  open: "Open",
  close: "Close",
  start: "Start",
  stop: "Stop",
  resetFault: "Reset Fault",
};

function formatStateValue(v: unknown): string {
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return String(v);
  return String(v);
}

/** Luna's content resolver for the engine's building-agnostic ContextCard
 * (Phase 12) — everything it shows comes from the SAME canonical selection
 * + TwinRuntimeProvider + RepresentationPolicy every other surface already
 * uses; this component only decides how to phrase it for a compact card,
 * never invents a parallel state store. */
export function LunaContextCard({ onEnterSpace, liftView, onLiftView }: { onEnterSpace?: (ref: string) => void } & LiftNavigationProps) {
  const { selected, select } = useSelection();
  const twinData = useTwinData();
  const twinRuntime = useTwinRuntime();
  const { identity } = useRepresentation();

  if (!selected) return null;

  const mode = lunaRepresentationPolicy.resolveMode({ ref: selected.ref, identity });
  if (mode === "HIDDEN") return null;

  if (isLiftRef(selected.ref)) return <LiftContextCard liftRef={selected.ref} onClose={() => select(null)} liftView={liftView} onLiftView={onLiftView} />;

  let content: ContextCardContent;

  if (selected.kind === "device") {
    const asset = twinData.getAsset(selected.ref);
    const runtime = twinRuntime.getState(selected.ref);
    const rows = runtime
      ? Object.entries(runtime.state)
          .slice(0, 4)
          .map(([k, v]) => ({ label: k.replace(/_/g, " "), value: formatStateValue(v) }))
      : [];
    rows.unshift({ label: "Status", value: runtime ? runtime.status.charAt(0).toUpperCase() + runtime.status.slice(1) : "—" });
    const actions =
      mode === "FULL_3D" && runtime
        ? runtime.availableCommands.slice(0, 2).map((cmd) => ({
            label: COMMAND_LABEL[cmd] ?? cmd,
            onClick: () => void twinRuntime.execute({ assetRef: selected.ref, command: cmd }),
          }))
        : [];
    content = {
      title: asset?.system.replace("-", " ") ?? "Device",
      subtitle: selected.label,
      rows,
      actions,
      privacyNote: mode === "CONTEXT_3D" ? "Facility-authorized service point — resident detail not shown." : undefined,
    };
  } else if (selected.kind === "room" || selected.kind === "unit") {
    const linked = LUNA_OPERATIONAL_ASSETS.filter((a) => a.ref === selected.ref || a.ref.startsWith(`${selected.ref}-`));
    const lights = linked.filter((a) => a.type === "light");
    const lightsOn = lights.filter((a) => Boolean(twinRuntime.getState(a.ref)?.state.on)).length;
    const ac = linked.find((a) => a.type === "climate");
    const acState = ac ? twinRuntime.getState(ac.ref) : undefined;
    const rows = [
      ...(lights.length ? [{ label: "Lights", value: `${lightsOn} of ${lights.length} on` }] : []),
      ...(ac && acState ? [{ label: "AC", value: `${acState.state.on ? "On" : "Off"} · ${acState.state.target_temp_c}°C` }] : []),
    ];
    content = {
      title: selected.kind === "unit" ? "Home" : "Room",
      subtitle: selected.label,
      rows,
      actions: onEnterSpace && mode !== "OPERATIONAL_2D" ? [{ label: "Enter", onClick: () => onEnterSpace(selected.ref) }] : [],
      privacyNote: mode === "OPERATIONAL_2D" ? "Occupied private residence — shown as an operational shell only." : undefined,
    };
  } else if (selected.kind === "level") {
    content = { title: "Level", subtitle: selected.label, actions: onEnterSpace ? [{ label: "Focus", onClick: () => onEnterSpace(selected.ref) }] : [] };
  } else if (selected.kind === "structural-element") {
    // Engineering wrap-up — a real, confirmed gap: structural elements had
    // no dedicated card content before this, falling through to the final
    // generic branch below (title="structural-element", no useful fields).
    // Structural elements are Information Cards, never Control Cards — no
    // runtime state, no commands, no fabricated capacities/reinforcement/
    // loads/member sizes, matching engine/structuralCatalog.ts's own
    // "conceptual, coordinated reference" disclosure.
    const isCore = selected.ref === LUNA_STRUCTURAL_CORE_WALL.ref;
    const element = isCore ? undefined : LUNA_STRUCTURAL_ELEMENTS.find((e) => e.ref === selected.ref);
    const elementType = isCore ? "core-wall" : element?.elementType;
    const levelRef = isCore ? undefined : element?.ownerLevelRef;
    const level = levelRef ? LUNA_LEVELS.find((l) => l.ref === levelRef) : undefined;
    const rows = [
      { label: "Type", value: elementType ? STRUCTURAL_TYPE_LABEL[elementType] ?? elementType : "Structural element" },
      ...(level ? [{ label: "Level", value: level.label }] : []),
      ...(isCore ? [{ label: "Extent", value: "Continuous — building-fixed, all levels" }] : []),
      ...(element ? [{ label: "Location (local)", value: `x ${element.position.x.toFixed(1)}, z ${element.position.z.toFixed(1)}` }] : []),
      ...(element?.parentRef ? [{ label: "Connected to", value: LUNA_STRUCTURAL_ELEMENTS.find((e) => e.ref === element.parentRef)?.label ?? element.parentRef }] : []),
    ];
    content = {
      title: "Structure",
      subtitle: selected.label,
      rows,
      actions: [],
      privacyNote: "Conceptual, coordinated reference structural element — not certified structural design, reinforcement, loads or member sizing.",
    };
  } else if (selected.kind === "door") {
    // A door is an Information Card, same discipline as structural
    // elements above: no runtime state, no commands, no fabricated
    // capability (Part 17: "do not attach actuator commands to passive
    // architecture").
    if (selected.ref === GROUND_ENTRANCE_REF) {
      // Architectural Reality V1 (brief Parts 4/16/27) — the Grand
      // Entrance binds to its own real canonical access-point identity.
      // isAccessGovernedRef() is the SAME real check the Access &
      // Security system itself uses — this card discloses exactly what
      // that system already knows, never a different or friendlier
      // answer than Oyi's own would give (Part 27).
      const asset = LUNA_OPERATIONAL_ASSETS.find((a) => a.ref === GROUND_ENTRANCE_REF);
      const governed = isAccessGovernedRef(GROUND_ENTRANCE_REF);
      content = {
        title: "Door",
        subtitle: "Main Entrance",
        rows: [
          { label: "Type", value: "Automatic sliding glass entrance" },
          { label: "Classification", value: "LUNA_REFERENCE_DESIGN" },
          { label: "Canonical asset", value: asset?.label ?? GROUND_ENTRANCE_REF },
          { label: "Remotely controllable", value: governed ? "Yes" : "No" },
        ],
        actions: [],
        privacyNote: governed
          ? undefined
          : "Reference simulation — this door opens automatically on approach/selection. The real Main Resident Entrance access-point asset is not remotely instrumented in this build (Access & Security V1's own disclosed scope: only the Apartment 6A lock is a governed, commandable lock) — Oyi can locate and explain this door, not command it.",
      };
    } else if (GROUND_STAIR_REFS.some((ref) => selected.ref.startsWith(ref))) {
      const stairRef = GROUND_STAIR_REFS.find((ref) => selected.ref.startsWith(ref))!;
      content = {
        title: "Door",
        subtitle: selected.label,
        rows: [
          { label: "Type", value: "Hinged stair access door" },
          { label: "Classification", value: "LUNA_REFERENCE_DESIGN" },
          { label: "Stair", value: stairRef === "LUNA-STAIR-01" ? "Stair 01" : "Stair 02" },
        ],
        actions: [],
        privacyNote: "Conceptual reference door — fire-rating and hardware certification are not modeled (see Structure engineering layer for the stair core itself).",
      };
    } else {
      const room = LUNA_L06_APT_A.rooms.find((r) => r.ref === selected.parentRef);
      content = {
        title: "Door",
        subtitle: selected.label,
        rows: [
          { label: "Room", value: room?.label ?? selected.parentRef ?? "—" },
          ...(room ? [{ label: "Room type", value: roomSourceType(room) }] : []),
          ...(room?.doorSide ? [{ label: "Wall", value: room.doorSide.charAt(0).toUpperCase() + room.doorSide.slice(1) }] : []),
        ],
        actions: [],
        privacyNote: "Procedural reference opening — door existence and wall side are known; width, threshold, swing direction and hardware are not modeled yet.",
      };
    }
  } else {
    content = { title: selected.kind, subtitle: selected.label };
  }

  return <ContextCard content={content} onClose={() => select(null)} />;
}
