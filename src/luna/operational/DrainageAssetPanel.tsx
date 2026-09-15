import { useRuntimeAssetState, useTwinRuntime, type CommandName } from "../../engine/twinRuntime";
import { useRepresentation } from "../../engine/hooks/useRepresentation";
import { lunaTwinDataProvider } from "./lunaTwinDataProvider";
import { relationshipsFrom, relationshipsTo, reverseRelationshipLabel, relationshipLabel } from "../../engine/engineeringRelationships";
import { LUNA_ENGINEERING_RELATIONSHIPS } from "./lunaEngineeringRelationships";

// Drainage V1 — the Drainage Control Board's per-asset content, the same
// shape as WaterAssetPanel.tsx. Respects ASSET_ONLY/OBSERVABLE exactly as
// the catalog declares it — every current drainage asset is asset-only
// (no fabricated valves/actuators for a passive gravity system, per the
// brief's own explicit instruction), so CommandButtons never renders
// anything here; it stays only for structural parity with the other
// boards and in case a future phase legitimately adds one.

const COMMAND_LABEL: Record<string, string> = { turnOn: "Start", turnOff: "Stop", open: "Open", close: "Close" };

function formatValue(v: unknown): string {
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return String(v);
  return String(v ?? "—");
}

const STACK_CONNECTION_REF = "LUNA-L06-APT-A-DRAIN-01";
const FIXTURE_DRAINS = [
  { ref: "LUNA-L06-APT-A-KITCHEN-DRAIN-01", label: "Kitchen Drain" },
  { ref: "LUNA-L06-APT-A-BATH-01-DRAIN-01", label: "Primary Bathroom Drain" },
  { ref: "LUNA-L06-APT-A-BATH-02-DRAIN-01", label: "Bathroom 2 Drain" },
  { ref: "LUNA-L06-APT-A-BATH-03-DRAIN-01", label: "Bathroom 3 Drain" },
];

// DD10 (see docs/LUNA_MEP_COORDINATION_SPEC.md) — the exact set of refs
// this phase added or that mark an unresolved engineering boundary,
// disclosed directly on the panel rather than only in documentation.
const DD10_DISCLOSURE: Record<string, string> = {
  "LUNA-B1-DRAINAGE-MAIN-01": "Reference discharge/inspection point. Final municipal connection, treatment and pump strategy beyond this point is DESIGN DECISION REQUIRED (DD10).",
  "LUNA-ROOF-VENT-TERMINATION-01": "Single-stack vent — the soil/waste stack continues through the roof as its own vent (a real, common configuration). Per-fixture individual venting, if required, is DESIGN DECISION REQUIRED (DD10).",
  "LUNA-ROOFTOP-STORM-DRAIN-01": "Stormwater reference asset — genuinely separate from soil/waste drainage. Sizing, gradient and coverage are DESIGN DECISION REQUIRED (DD10).",
  "LUNA-STORM-DOWNPIPE-01": "Reference segment only. The full vertical run to grade is not modeled as continuous geometry — routing is DESIGN DECISION REQUIRED (DD10).",
  "LUNA-SITE-STORM-DISCHARGE-01": "Reference discharge point. Site levels, gravity feasibility and approved discharge authority are DESIGN DECISION REQUIRED (DD10).",
};

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
  if (parent) lines.push(`Downstream toward: ${parent.label}`);
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

export function DrainageAssetPanel({ focusedRef }: { focusedRef: string }) {
  const { identity, policy } = useRepresentation();
  const asset = lunaTwinDataProvider.getAsset(focusedRef);
  const isStackConnectionTab = focusedRef === STACK_CONNECTION_REF;
  const mode = policy.resolveMode({ ref: focusedRef, identity });
  if (!asset || mode === "HIDDEN") return null;
  const full = mode === "FULL_3D";
  const disclosure = DD10_DISCLOSURE[focusedRef];

  return (
    <div data-drainage-asset-panel data-drainage-ref={focusedRef}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.55, marginBottom: 6 }}>
        {asset.classification === "controllable" ? "Controllable" : asset.classification === "observable" ? "Observable" : "Asset only"}
      </div>
      <AssetRows ref_={focusedRef} />
      {full && <CommandButtons ref_={focusedRef} />}
      {full && <RelationshipList ref_={focusedRef} />}
      {isStackConnectionTab && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Fixtures draining to this connection</div>
          {FIXTURE_DRAINS.map((f) => (
            <div key={f.ref} style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>{f.label}</div>
          ))}
        </div>
      )}
      {disclosure && (
        <div style={{ marginTop: 10, fontSize: 11, opacity: 0.65, fontStyle: "italic" }}>{disclosure}</div>
      )}
      {!full && <div style={{ marginTop: 8, fontSize: 11, opacity: 0.55, fontStyle: "italic" }}>Facility-authorized context. Commands are not admitted in this view.</div>}
    </div>
  );
}
