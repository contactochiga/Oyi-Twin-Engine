import { useState } from "react";
import { CommandControls } from "../ui/AssetInfoPanel";
import { useRuntimeAssetState, type CommandResult } from "../engine/twinRuntime";
import type { OperationalAssetRecord } from "../engine/twinData";
import { GLASS_SURFACE, GLASS_ACCENT, useTwinData, useTwinRuntime, useRepresentation, FloorPlan2D, type FloorPlanUnitState } from "../engine";
import type { InteriorSpec, RoomLayoutSpec } from "./interiors/lunaInteriors";
import { Representation2D3DToggle } from "./Representation2D3DToggle";
import { NavigationModeToggle } from "./NavigationModeToggle";
import { floorPlanForInterior, roomTintColor } from "./policy/lunaFloorPlans";
import { lunaRepresentationPolicy } from "./policy/lunaRepresentationPolicy";
import { LUNA_LEVELS } from "./lunaProgramme";
import type { SpatialMapContext } from "./lunaSpatialFrame";
import type { NavigationMode } from "../engine/spatial/route";
import type { CanonicalRef } from "../engine/types";

function formatStateValue(v: unknown): string {
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

export interface InteriorNavigationCardProps {
  spec: InteriorSpec;
  /** The unit or level label to show in the breadcrumb one step up the
   * stack — "Apartment A" for a private unit interior, "Ground" for a
   * common-area interior owned directly by a level. */
  parentLabel: string;
  focusedRoomRef: CanonicalRef | null;
  selectedAssetRef?: CanonicalRef | null;
  onSelectAsset: (ref: CanonicalRef) => void;
  onEnterRoom: (ref: CanonicalRef) => void;
  onSelectRoom: (room: RoomLayoutSpec) => void;
  /** Back out one level of the stack: from a focused room to this
   * interior's own room list, or from the room list back to the parent
   * (unit summary / level card). The caller decides which, matching
   * exactly where `focusedRoomRef` currently sits. */
  onBack: () => void;
  onClose: () => void;
  representationMode: "2D" | "3D";
  onSetRepresentationMode: (mode: "2D" | "3D") => void;
  /** Spatial Card + 2D Plan Visual Convergence V1 (Parts 6, 15, 17) — the
   * SAME live-position/navigation-mode facts the persistent map already
   * derives in App.tsx, embedded directly in this one card instead of a
   * separate floating map surface. `mapContext`/`navigationMode` are
   * always passed (App.tsx already computes them unconditionally); the
   * live dot and mode toggle only render once a real plan exists for
   * THIS interior specifically. */
  mapContext: SpatialMapContext;
  navigationMode: NavigationMode;
  onSetNavigationMode: (mode: NavigationMode) => void;
}

/** The spatial-navigation state of the contextual card (restoration pass
 * §5/§6/§9/§11, extended by Spatial Card + 2D Plan Visual Convergence V1) —
 * what a card shows once its owning unit or level's common area has
 * actually been ENTERED (see App.tsx's activeInteriorRef), as opposed to
 * just selected. One component handles both a private apartment interior
 * (Apartment A's 14 real rooms) and a common-area interior (Ground Lobby,
 * Residents' Club, Luna Sky) — the data shape (InteriorSpec/RoomLayoutSpec)
 * is already identical for both, and so is the interaction: a real 2D plan
 * (when one exists for this interior — floorPlanForInterior's own disclosed
 * scope, currently Apartment A only) plus a "Navigate" list of the
 * interior's own real rooms. Selecting a room here drives the SAME camera
 * (App.tsx's focusRoom) every other entry point uses; this component only
 * ever renders, it never drives the camera itself. Once a room is focused,
 * the card also surfaces that room's real canonical devices (ROOM state
 * joining operational OS data to the spatial Twin, Part 7) with the same
 * runtime command execution every other device surface uses — never a
 * fabricated control. */
export function InteriorNavigationCard({ spec, parentLabel, focusedRoomRef, selectedAssetRef, onSelectAsset, onEnterRoom, onSelectRoom, onBack, onClose, representationMode, onSetRepresentationMode, mapContext, navigationMode, onSetNavigationMode }: InteriorNavigationCardProps) {
  const focusedRoom = spec.rooms.find((r) => r.ref === focusedRoomRef) ?? null;
  const levelLabel = LUNA_LEVELS.find((l) => l.ref === spec.ownerLevelRef)?.label;
  const twinData = useTwinData();
  const { identity } = useRepresentation();

  const plan = floorPlanForInterior(spec.interiorRef);
  const dotLocal = mapContext.kind === "apartment-a" && plan?.levelRef === "LUNA-L06-APT-A" ? mapContext.local : null;
  const planUnitStates: Record<string, FloorPlanUnitState> | undefined = plan
    ? Object.fromEntries(plan.units.map((u) => [u.ref, { tone: "normal" as const, statusLabel: "" }]))
    : undefined;

  // Part 7 — real canonical devices located inside the focused room, using
  // the SAME ref-namespacing convention every other room/device surface in
  // this app already relies on (e.g. LunaContextCard's room branch).
  const roomAssets = focusedRoom ? twinData.listAssets().filter((a) => a.ref.startsWith(`${focusedRoom.ref}-`)) : [];
  const authorizedRoomAssets = roomAssets.filter((a) => lunaRepresentationPolicy.resolveMode({ ref: a.ref, identity }) !== "HIDDEN");

  const selectedAsset = authorizedRoomAssets.find((asset) => asset.ref === selectedAssetRef);
  const interiorLabel = spec.interiorRef.includes("-APT-") ? parentLabel : spec.label;
  const assetBreadcrumbLabel = selectedAsset && focusedRoom?.label && selectedAsset.label.startsWith(`${focusedRoom.label} `)
    ? selectedAsset.label.slice(focusedRoom.label.length + 1)
    : selectedAsset?.label;
  const breadcrumb = [levelLabel, interiorLabel, focusedRoom?.label, assetBreadcrumbLabel].filter(Boolean).filter((label, index, labels) => label !== labels[index - 1]).join(" › ");

  return (
    <div data-interior-navigation-card style={{ ...GLASS_SURFACE, width: "min(320px, 100%)", padding: "14px 18px 16px", pointerEvents: "auto", maxHeight: "min(84vh, 720px)", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: GLASS_ACCENT, fontSize: 11.5, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
          ‹ {selectedAsset ? focusedRoom?.label : focusedRoom ? interiorLabel : parentLabel}
        </button>
        <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", color: "inherit", opacity: 0.5, cursor: "pointer", fontSize: 14, padding: 2 }}>
          ✕
        </button>
      </div>

      {/* Part 2/19 — a real breadcrumb of the current drill-down depth
          (Building -> Level -> Apartment/Area -> Room), not just a single
          "back one step" link. `parentLabel` is already either the private
          unit's own name ("Apartment A") or the owning level's own label
          (common-area case) — the level segment below only adds itself
          when it isn't already identical to that, so a common-area
          interior reads "Ground › Ground Lobby › Reception" instead of
          duplicating "Ground" twice. */}
      <div data-spatial-card-breadcrumb style={{ fontSize: 9.5, opacity: 0.45, letterSpacing: "0.03em", marginTop: 6 }}>
        {breadcrumb}
      </div>

      <div style={{ marginTop: 6, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedAsset?.label ?? focusedRoom?.label ?? interiorLabel}</div>
          <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 1 }}>{focusedRoom ? interiorLabel : "Interior"}</div>
        </div>
        <Representation2D3DToggle mode={representationMode} onSetMode={onSetRepresentationMode} />
      </div>

      {plan && planUnitStates && (
        <div style={{ marginTop: 12 }}>
          <NavigationModeToggle mode={navigationMode} onSetMode={onSetNavigationMode} />
          <div data-luna-spatial-map={plan.levelRef} style={{ position: "relative", width: "100%", aspectRatio: `${plan.outline.width} / ${plan.outline.depth}`, borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.85)" }}>
            <FloorPlan2D
              livePosition={dotLocal}
              spec={plan}
              unitStates={planUnitStates}
              selectedRef={focusedRoomRef}
              onSelectUnit={(ref) => {
                const room = spec.rooms.find((r) => r.ref === ref);
                if (room) onSelectRoom(room);
              }}
              roomTintColor={roomTintColor}
            />
            {!dotLocal && <span style={{ position: "absolute", right: 5, bottom: 5, fontSize: 9, opacity: .65 }}>Off floor</span>}

          </div>
        </div>
      )}

      <details open={!focusedRoom} style={{ marginTop: 14 }}>
        <summary style={{ fontSize: 11, cursor: "pointer" }}>Rooms · {spec.rooms.length}</summary>
        <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.5, marginBottom: 6 }}>Navigate</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {spec.rooms.map((room) => {
            const active = room.ref === focusedRoomRef;
            return (
              <button
                key={room.ref}
                onClick={() => onSelectRoom(room)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  background: active ? "rgba(79,209,255,0.10)" : "transparent",
                  border: "none",
                  borderRadius: 7,
                  padding: "7px 8px",
                  cursor: "pointer",
                  color: active ? "#a7e9ff" : "inherit",
                  fontWeight: active ? 600 : 400,
                  textAlign: "left",
                  fontFamily: "inherit",
                  fontSize: 12,
                }}
              >
                {room.label}
              </button>
            );
          })}
        </div>
      </details>

      {focusedRoom && !selectedAsset && <button onClick={() => onEnterRoom(focusedRoom.ref)} style={{ marginTop: 10, color: "#a7e9ff", background: "rgba(79,209,255,.1)", border: "1px solid #4fd1ff55", borderRadius: 7, padding: "7px 12px", cursor: "pointer" }}>Enter · {navigationMode}</button>}
      {focusedRoom && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.5, marginBottom: 6 }}>Devices</div>
          {authorizedRoomAssets.length === 0 ? (
            <div style={{ fontSize: 11.5, opacity: 0.55, fontStyle: "italic" }}>No devices modeled for this room.</div>
          ) : (
            (selectedAsset ? [selectedAsset] : authorizedRoomAssets).map((asset) => (
              <SpatialDeviceDetails key={asset.ref} asset={asset} expanded={Boolean(selectedAsset)} onSelect={() => onSelectAsset(asset.ref)} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Presentation only: subscribe to the existing runtime; commands retain actor authorization. */
function SpatialDeviceDetails({ asset, expanded, onSelect }: { asset: OperationalAssetRecord; expanded: boolean; onSelect: () => void }) {
  const runtime = useRuntimeAssetState(asset.ref);
  const provider = useTwinRuntime();
  const { identity, policy } = useRepresentation();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CommandResult | null>(null);
  const canControl = policy.resolveMode({ ref: asset.ref, identity }) === "FULL_3D";
  return <div style={{ marginBottom: 8, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,.03)" }}>
    <button data-spatial-asset={asset.ref} onClick={onSelect} style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 8, color: "inherit", textAlign: "left", background: "none", border: 0, padding: 0, cursor: "pointer", fontSize: 11.5, fontWeight: 600 }}>
      <span>{asset.label}</span><span style={{ opacity: .6, fontWeight: 400 }}>{runtime?.status ?? "Asset"}</span>
    </button>
    {expanded && runtime && Object.entries(runtime.state).map(([key, value]) => <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11, padding: "3px 0", opacity: .8 }}><span>{key.replace(/_/g, " ")}</span><span>{formatStateValue(value)}</span></div>)}
    {expanded && runtime && canControl && <CommandControls commands={runtime.availableCommands} state={runtime.state} pending={pending} run={async (command, args) => {
      setPending(true);
      try { setResult(await provider.execute({ assetRef: asset.ref, command, args, actor: identity })); }
      finally { setPending(false); }
    }} />}
    {expanded && result && <div role="status" style={{ fontSize: 11, marginTop: 6 }}>{result.message}</div>}
  </div>;
}
