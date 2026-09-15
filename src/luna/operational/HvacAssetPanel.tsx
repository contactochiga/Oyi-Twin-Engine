import { useRuntimeAssetState, useTwinRuntime, type CommandName } from "../../engine/twinRuntime";
import { useRepresentation } from "../../engine/hooks/useRepresentation";
import { lunaTwinDataProvider } from "./lunaTwinDataProvider";
import { relationshipsFrom, relationshipsTo, reverseRelationshipLabel, relationshipLabel } from "../../engine/engineeringRelationships";
import { LUNA_ENGINEERING_RELATIONSHIPS } from "./lunaEngineeringRelationships";
import { useHvacState } from "../runtime/lunaHvacResolver";

// HVAC System V1 — the HVAC Control Board's per-asset content, the same
// generic ASSET_ONLY/OBSERVABLE/CONTROLLABLE template as Water/Electrical/
// FireAssetPanel.tsx. The outdoor condenser's own real capabilities are
// empty (Part 2's "do not give the outdoor unit arbitrary start/stop
// controls" instruction, already true in lunaMepBackbone.ts's schedule),
// so CommandButtons correctly renders nothing for it — nothing HVAC-
// specific had to be added to enforce that boundary.

const COMMAND_LABEL: Record<string, string> = { turnOn: "Turn On", turnOff: "Turn Off" };

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

/** Condenser-only: a compact reference-chain summary — both zones' state
 * plus condenser demand, reusing the SAME resolveHvacState() truth the
 * header summary and Oyi both read, never a second notion of "what's
 * cooling Apartment 6A". */
function ChainSummary() {
  const hvac = useHvacState();
  if (!hvac) return null;
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.55, marginBottom: 6 }}>Reference Chain</div>
      <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 3 }}>
        {hvac.zones.map((z) => (
          <div key={z.ref}>
            <span style={{ opacity: 0.6 }}>{z.label}: </span>
            {z.state === "fault" ? "Fault" : z.on ? `On, ${z.targetTempC}°C target` : "Off"}
            {z.roomTempC !== null ? ` · ${z.roomTempC}°C` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HvacAssetPanel({ focusedRef }: { focusedRef: string }) {
  const { identity, policy } = useRepresentation();
  const asset = lunaTwinDataProvider.getAsset(focusedRef);
  const mode = policy.resolveMode({ ref: focusedRef, identity });
  if (!asset) return null;
  if (mode === "HIDDEN") {
    // The two indoor split units are the resident's OWN comfort devices —
    // a pre-existing, deliberate design decision (lunaUnitMepAssets.ts)
    // keeps them off the Facility-owned-unit allowlist, the same privacy
    // boundary already established for lights/curtains. Selecting this
    // tab is still a legitimate board action (the asset is real and the
    // reference chain is complete) — this is an honest, disclosed
    // boundary message, not a silently blank tab.
    return (
      <div data-hvac-asset-panel data-hvac-ref={focusedRef} style={{ fontSize: 11.5, opacity: 0.6, fontStyle: "italic" }}>
        Resident-managed comfort device. Not visible to Facility — the same privacy boundary as in-home lights/curtains.
      </div>
    );
  }
  const full = mode === "FULL_3D";
  const isOutdoor = focusedRef === "LUNA-L06-APT-A-AC-OUTDOOR-01";

  return (
    <div data-hvac-asset-panel data-hvac-ref={focusedRef}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.55, marginBottom: 6 }}>
        {asset.classification === "controllable" ? "Controllable" : asset.classification === "observable" ? "Observable" : "Asset only"}
      </div>
      <AssetRows ref_={focusedRef} />
      {full && <CommandButtons ref_={focusedRef} />}
      {full && <RelationshipList ref_={focusedRef} />}
      {full && isOutdoor && <ChainSummary />}
      {!full && <div style={{ marginTop: 8, fontSize: 11, opacity: 0.55, fontStyle: "italic" }}>Facility-authorized context. Commands are not admitted in this view.</div>}
    </div>
  );
}
