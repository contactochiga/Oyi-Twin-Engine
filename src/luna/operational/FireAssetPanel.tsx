import { useRuntimeAssetState, useTwinRuntime, type CommandName } from "../../engine/twinRuntime";
import { useRepresentation } from "../../engine/hooks/useRepresentation";
import { lunaTwinDataProvider } from "./lunaTwinDataProvider";
import { relationshipsFrom, relationshipsTo, reverseRelationshipLabel, relationshipLabel } from "../../engine/engineeringRelationships";
import { LUNA_ENGINEERING_RELATIONSHIPS } from "./lunaEngineeringRelationships";
import { useFireState, useFireEvents } from "../runtime/lunaFireResolver";

// Fire & Life Safety System V1 (Part 9/10) — the Fire Control Board's
// per-asset content, the fire-system equivalent of WaterAssetPanel.tsx/
// ElectricalAssetPanel.tsx. Same ASSET_ONLY/OBSERVABLE/CONTROLLABLE
// respect — the panel's own real capabilities (silence/reset) are
// deliberately NOT mapped by the runtime (a pre-existing, explicit
// architectural decision — see lunaRuntimeSeed.ts's CAPABILITY_TO_COMMAND
// comment), so CommandButtons correctly renders nothing for it: Fire is
// the system where "control" mostly means investigation, not buttons
// (Part 10), and this generic panel already produces that honestly from
// real capability data — nothing fire-specific had to be added to enforce it.

const COMMAND_LABEL: Record<string, string> = { turnOn: "Start", turnOff: "Stop", open: "Open", close: "Close" };

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
          {COMMAND_LABEL[cmd] ?? cmd}
        </button>
      ))}
    </div>
  );
}

/** Panel-only: a compact "active incident" investigation summary — Part
 * 10's "Locate / Investigate / Show event" value, reusing the SAME
 * resolveFireState()/event-log truth the building summary and Oyi both
 * read, never a second incident notion. */
function ActiveIncidentSummary() {
  const fire = useFireState();
  const events = useFireEvents();
  if (!fire || !fire.alarmActive) return null;
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.55, marginBottom: 6, color: "#e8543f" }}>Active Incident</div>
      <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 3 }}>
        <div><span style={{ opacity: 0.6 }}>Origin: </span>{fire.originatingZoneLabel ?? "Unknown"}</div>
        <div><span style={{ opacity: 0.6 }}>Affected level: </span>{fire.affectedLevelRef ?? "Unknown"}</div>
        <div><span style={{ opacity: 0.6 }}>Active devices: </span>{fire.activeAlarmDeviceCount}</div>
      </div>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
        {events.slice(0, 5).map((e) => (
          <div key={e.id} style={{ fontSize: 10.5, opacity: 0.6 }}>{e.label}</div>
        ))}
      </div>
    </div>
  );
}

export function FireAssetPanel({ focusedRef }: { focusedRef: string }) {
  const { identity, policy } = useRepresentation();
  const asset = lunaTwinDataProvider.getAsset(focusedRef);
  const mode = policy.resolveMode({ ref: focusedRef, identity });
  if (!asset || mode === "HIDDEN") return null;
  const full = mode === "FULL_3D";
  const isPanel = focusedRef === "LUNA-B1-FIRE-PANEL-01";

  return (
    <div data-fire-asset-panel data-fire-ref={focusedRef}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.55, marginBottom: 6 }}>
        {asset.classification === "controllable" ? "Controllable" : asset.classification === "observable" ? "Observable" : "Asset only"}
      </div>
      <AssetRows ref_={focusedRef} />
      {full && <CommandButtons ref_={focusedRef} />}
      {full && <RelationshipList ref_={focusedRef} />}
      {full && isPanel && <ActiveIncidentSummary />}
      {!full && <div style={{ marginTop: 8, fontSize: 11, opacity: 0.55, fontStyle: "italic" }}>Facility-authorized context. Commands are not admitted in this view.</div>}
    </div>
  );
}
