import { useRuntimeAssetState, useTwinRuntime, type CommandName } from "../../engine/twinRuntime";
import { useRepresentation } from "../../engine/hooks/useRepresentation";
import { lunaTwinDataProvider } from "./lunaTwinDataProvider";
import { relationshipsFrom, relationshipsTo, reverseRelationshipLabel, relationshipLabel } from "../../engine/engineeringRelationships";
import { LUNA_ENGINEERING_RELATIONSHIPS } from "./lunaEngineeringRelationships";
import { useCameraState } from "../runtime/lunaCameraResolver";
import { useAccessState, useAccessEvents } from "../runtime/lunaAccessResolver";

// CCTV & Spatial Security System V1 — the CCTV Control Board's per-asset
// content, the same generic ASSET_ONLY/OBSERVABLE/CONTROLLABLE template as
// Water/Electrical/Fire/HVAC/AccessAssetPanel.tsx. All four cameras'
// real capabilities are empty (Master Equipment Schedule's own
// "observable; none" — no PTZ, no recording, no live view is instrumented
// anywhere in this reference build), so CommandButtons correctly renders
// nothing for any of them: no fake controls, no dead buttons.

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

function RelationshipList({ ref_ }: { ref_: string }) {
  const asset = lunaTwinDataProvider.getAsset(ref_);
  const from = relationshipsFrom(LUNA_ENGINEERING_RELATIONSHIPS, ref_);
  const to = relationshipsTo(LUNA_ENGINEERING_RELATIONSHIPS, ref_);
  const parent = asset?.parentRef ? lunaTwinDataProvider.getAsset(asset.parentRef) : undefined;
  const lines: string[] = [];
  if (parent) lines.push(`Upstream: ${parent.label}`);
  for (const edge of from) lines.push(`${relationshipLabel(edge.type).replace(/^./, (c) => c.toUpperCase())}: ${lunaTwinDataProvider.getAsset(edge.to)?.label ?? edge.to}`);
  for (const edge of to) lines.push(`${reverseRelationshipLabel(edge.type).replace(/^./, (c) => c.toUpperCase())}: ${lunaTwinDataProvider.getAsset(edge.from)?.label ?? edge.from}`);
  if (!lines.length) return null;
  return (
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
      {lines.map((l) => (
        <div key={l} style={{ fontSize: 11, opacity: 0.65 }}>{l}</div>
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

/** Access-event correlation — shown only on a camera that has a real,
 * canonical monitored_by relationship to an access point (Section 11's
 * central feature). Reads the SAME resolveAccessState()/getAccessEvents()
 * truth the Access Control Board itself uses — never a second, divergent
 * notion of "what happened at the door." */
function AccessCorrelationSummary({ ref_ }: { ref_: string }) {
  const camera = useCameraState(ref_);
  const access = useAccessState();
  const events = useAccessEvents();
  if (!camera?.monitorsAccessPointRef) return null;
  const point = access?.points.find((p) => p.ref === camera.monitorsAccessPointRef);
  const pointAsset = lunaTwinDataProvider.getAsset(camera.monitorsAccessPointRef);
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.55, marginBottom: 6 }}>Associated Access Point</div>
      <div style={{ fontSize: 12 }}>
        <span style={{ opacity: 0.6 }}>{pointAsset?.label ?? camera.monitorsAccessPointRef}: </span>
        {point ? (point.instrumented ? (point.locked ? "Locked" : "Unlocked") : "Not instrumented") : "Unknown"}
      </div>
      <div style={{ fontSize: 10.5, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.55, margin: "10px 0 6px" }}>Recent Access Events</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {events.length === 0 && <div style={{ fontSize: 11, opacity: 0.5 }}>No access events recorded yet.</div>}
        {events.slice(0, 5).map((e) => (
          <div key={e.id} style={{ fontSize: 10.5, opacity: 0.65 }}>
            {e.label}
            {e.detail ? ` — ${e.detail}` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CctvAssetPanel({ focusedRef }: { focusedRef: string }) {
  const { identity, policy } = useRepresentation();
  const asset = lunaTwinDataProvider.getAsset(focusedRef);
  const mode = policy.resolveMode({ ref: focusedRef, identity });
  if (!asset || mode === "HIDDEN") return null;
  const full = mode === "FULL_3D";

  return (
    <div data-cctv-asset-panel data-cctv-ref={focusedRef}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.55, marginBottom: 6 }}>
        {asset.classification === "controllable" ? "Controllable" : asset.classification === "observable" ? "Observable" : "Asset only"}
      </div>
      <AssetRows ref_={focusedRef} />
      {full && <CommandButtons ref_={focusedRef} />}
      {asset.classification !== "controllable" && (
        <div style={{ marginTop: 8, fontSize: 11, opacity: 0.55, fontStyle: "italic" }}>
          No PTZ, recording or live-view capability is instrumented for this camera in this reference build (DESIGN DECISION REQUIRED).
        </div>
      )}
      {full && <RelationshipList ref_={focusedRef} />}
      {full && <AccessCorrelationSummary ref_={focusedRef} />}
      {!full && <div style={{ marginTop: 8, fontSize: 11, opacity: 0.55, fontStyle: "italic" }}>Facility-authorized context. Commands are not admitted in this view.</div>}
    </div>
  );
}
