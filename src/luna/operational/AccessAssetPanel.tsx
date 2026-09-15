import { useRuntimeAssetState, useTwinRuntime, type CommandName } from "../../engine/twinRuntime";
import { useRepresentation } from "../../engine/hooks/useRepresentation";
import { lunaTwinDataProvider } from "./lunaTwinDataProvider";
import { useAccessState, useAccessEvents } from "../runtime/lunaAccessResolver";

// Access & Security System V1 — the Access Control Board's per-asset
// content, the same generic ASSET_ONLY/OBSERVABLE/CONTROLLABLE template as
// Water/Electrical/Fire/HvacAssetPanel.tsx. The three common access points'
// real capabilities are empty (Master Equipment Schedule's own "observable;
// none" — see lunaSimulationProvider.ts's schedule-boundary comment), so
// CommandButtons correctly renders nothing for any of them: nothing
// access-specific had to be added to enforce that boundary.

function formatValue(v: unknown): string {
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return String(v);
  return String(v ?? "—");
}

function AssetRows({ ref_ }: { ref_: string }) {
  const snapshot = useRuntimeAssetState(ref_);
  const asset = lunaTwinDataProvider.getAsset(ref_);
  if (!snapshot || !asset) return null;
  const entries = Object.entries(snapshot.state).filter(([k]) => k !== "sampledAt");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {entries.length === 0 && <div style={{ fontSize: 11.5, opacity: 0.55 }}>No telemetry recorded for this asset.</div>}
      {entries.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ opacity: 0.6 }}>{k.replace(/_/g, " ")}</span>
          <span>{formatValue(v)}</span>
        </div>
      ))}
    </div>
  );
}

function CommandButtons({ ref_ }: { ref_: string }) {
  const runtime = useTwinRuntime();
  const { identity } = useRepresentation();
  const snapshot = useRuntimeAssetState(ref_);
  const asset = lunaTwinDataProvider.getAsset(ref_);
  if (!snapshot || !asset || asset.classification !== "controllable" || !snapshot.availableCommands.length) return null;
  const command = async (name: CommandName) => {
    await runtime.execute({ assetRef: ref_, command: name, actor: identity });
  };
  return (
    <div className="lift-buttons" style={{ marginTop: 8 }}>
      {snapshot.availableCommands.map((cmd) => (
        <button key={cmd} onClick={() => void command(cmd)}>
          {cmd}
        </button>
      ))}
    </div>
  );
}

/** Main Entrance only: a compact reference-chain summary — the whole
 * building's registered access points plus the real access event log,
 * reusing the SAME resolveAccessState()/getAccessEvents() truth the
 * header summary and Oyi both read, never a second notion of "what
 * happened at the door." Apartment 6A's own lock appears here as a READ
 * row even though its own tab isn't on this Facility board — the exact
 * same disclosed boundary HVAC's ChainSummary already established. */
function ReferenceChainSummary() {
  const access = useAccessState();
  const events = useAccessEvents();
  if (!access) return null;
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.55, marginBottom: 6 }}>Registered Access Points</div>
      <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 3 }}>
        {access.points.map((p) => (
          <div key={p.ref} style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ opacity: 0.6 }}>{p.label}</span>
            <span>{p.instrumented ? (p.locked ? "Locked" : "Unlocked") : "Not instrumented"}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10.5, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.55, margin: "10px 0 6px" }}>Recent Access Events</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {events.length === 0 && <div style={{ fontSize: 11, opacity: 0.5 }}>No access events recorded yet.</div>}
        {events.slice(0, 6).map((e) => (
          <div key={e.id} style={{ fontSize: 10.5, opacity: 0.65 }}>
            {e.label}
            {e.detail ? ` — ${e.detail}` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AccessAssetPanel({ focusedRef }: { focusedRef: string }) {
  const { identity, policy } = useRepresentation();
  const asset = lunaTwinDataProvider.getAsset(focusedRef);
  const mode = policy.resolveMode({ ref: focusedRef, identity });
  if (!asset || mode === "HIDDEN") return null;
  const full = mode === "FULL_3D";
  const isMainEntrance = focusedRef === "LUNA-GROUND-ACCESS-MAIN-01";

  return (
    <div data-access-asset-panel data-access-ref={focusedRef}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.55, marginBottom: 6 }}>
        {asset.classification === "controllable" ? "Controllable" : asset.classification === "observable" ? "Observable" : "Asset only"}
      </div>
      <AssetRows ref_={focusedRef} />
      {full && <CommandButtons ref_={focusedRef} />}
      {asset.classification !== "controllable" && (
        <div style={{ marginTop: 8, fontSize: 11, opacity: 0.55, fontStyle: "italic" }}>
          No lock/door capability is instrumented for this access point in this reference build (DESIGN DECISION REQUIRED).
        </div>
      )}
      {full && isMainEntrance && <ReferenceChainSummary />}
      {!full && <div style={{ marginTop: 8, fontSize: 11, opacity: 0.55, fontStyle: "italic" }}>Facility-authorized context. Commands are not admitted in this view.</div>}
    </div>
  );
}
