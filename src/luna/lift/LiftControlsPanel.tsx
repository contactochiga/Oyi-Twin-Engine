import { useSceneMode } from "../../engine/hooks/useSceneMode";
import { useState } from "react";
import { useRuntimeAssetState, useTwinRuntime, type CommandName } from "../../engine/twinRuntime";
import { useRepresentation } from "../../engine/hooks/useRepresentation";
import { LIFT_STOPS, liftStop, liftDefinition, LIFT_REFERENCE_INTERFACES, type LiftView } from "./lunaLift";
import type { LiftState } from "./liftSimulation";

export interface LiftNavigationProps {
  liftView?: LiftView | null;
  onLiftView?: (view: LiftView | null) => void;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
      <span style={{ opacity: 0.6 }}>{label}</span>
      <span style={{ textAlign: "right" }}>{value}</span>
    </div>
  );
}

// All lift-specific content (state rows, destination/command controls, view
// buttons, status line) lives here, self-contained, so the SAME content can
// be embedded in either the legacy bottom-right ContextCard chrome
// (LiftContextCard.tsx, kept for non-Luna-lift "other" selections' visual
// consistency) or the new left-side ElevatorControlBoard tab body — no
// duplicated logic between the two surfaces.
export function LiftControlsPanel({ liftRef, liftView, onLiftView }: LiftNavigationProps & { liftRef: string }) {
  const runtime = useTwinRuntime();
  const { exploded, activeSystem } = useSceneMode();
  const snapshot = useRuntimeAssetState(liftRef);
  const { identity, policy } = useRepresentation();
  const def = liftDefinition(liftRef);
  const [destination, setDestination] = useState("LUNA-L06");
  const [message, setMessage] = useState("");
  const s = snapshot?.state as LiftState | undefined;
  const mode = policy.resolveMode({ ref: liftRef, identity });
  if (!s || !def || mode === "HIDDEN") return null;
  const full = mode === "FULL_3D";
  const ready = !s.faultState && s.serviceState === "normal" && !exploded && s.motionState === "IDLE" && !s.targetFloor && s.currentFloor && s.doorState === "OPEN";

  const command = async (name: CommandName, floor = destination) => {
    const result = await runtime.execute({ assetRef: liftRef, command: name, args: { floor, originFloorRef: floor, requestId: crypto.randomUUID() }, actor: identity });
    setMessage(result.message);
  };

  return (
    <div
      data-lift-card
      data-lift-ref={liftRef}
      data-lift-view={liftView ?? "none"}
      data-lift-floor={s.currentFloor ?? "between"}
      data-lift-target={s.targetFloor ?? ""}
      data-lift-motion={s.motionState}
      data-lift-door={s.doorState}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <InfoRow label={s.currentFloor ? "At" : "Passing (estimated)"} value={liftStop(s.currentFloor ?? s.passingFloorRef)?.label ?? "Unavailable"} />
        <InfoRow label="Destination" value={liftStop(s.targetFloor)?.label ?? "—"} />
        <InfoRow label="Motion" value={`${s.direction} · ${s.speed.toFixed(1)} m/s`} />
        <InfoRow label="Position" value={`${s.positionY.toFixed(2)} m`} />
        <InfoRow label="Doors / service" value={`${s.doorState} · ${s.faultState ?? s.serviceState}`} />
      </div>
      <div style={{ marginTop: 8, fontSize: 10.5, opacity: 0.55, fontStyle: "italic" }}>
        {full ? "Reference simulation · current building datums. PH / Roof not served." : "Common lift context. Passenger commands and Facility engineering access are not admitted."}
      </div>
      {full && (
        <div className="lift-controls">
          {def.kind === "service" && (
            <p data-service-lift-note>
              Service/Fire Elevator — normal reference simulation only. Fire recall, firefighter operation, protected-lobby logic, emergency-power sequencing and
              service-loading rules remain DESIGN DECISION REQUIRED (DD06/DD11/DD20) and are not implemented.
            </p>
          )}
          {activeSystem === "all" && <p>Reference interfaces, not commissioned: {LIFT_REFERENCE_INTERFACES.map((c) => c.label).join(" · ")}.</p>}
          <label>
            Destination / call floor
            <select aria-label="Lift destination" value={destination} onChange={(e) => setDestination(e.target.value)}>
              {LIFT_STOPS.map((stop) => (
                <option key={stop.ref} value={stop.ref}>
                  {stop.label}
                </option>
              ))}
            </select>
          </label>
          <div className="lift-buttons">
            <button onClick={() => void command("callLift")}>Call lift</button>
            <button onClick={() => void command("setPosition")}>Travel</button>
            <button onClick={() => void command("open")}>Open doors</button>
            <button onClick={() => void command("close")}>Close doors</button>
          </div>
          {onLiftView && (
            <div className="lift-buttons">
              <button onClick={() => onLiftView("shaft")}>Shaft external</button>
              <button disabled={exploded} onClick={() => onLiftView("follow")}>
                Follow lift
              </button>
              <button disabled={!s.currentFloor} onClick={() => onLiftView("lobby")}>
                Lift lobby
              </button>
              <button disabled={!ready} onClick={() => onLiftView(liftView === "interior" ? "lobby" : "interior")}>
                {liftView === "interior" ? "Exit car" : "Enter car"}
              </button>
              <button onClick={() => onLiftView("engineering")}>Engineering cutaway</button>
              <button onClick={() => onLiftView("structure")}>Structural view</button>
              {liftView && <button onClick={() => onLiftView(null)}>Exit lift view</button>}
            </div>
          )}
          {exploded && <p>Exploded diagram: shaft and car remain fixed. Choose View → Normal before following or boarding.</p>}
          <div role="status">{message || "Select a floor, then Call lift or Travel."}</div>
        </div>
      )}
    </div>
  );
}
