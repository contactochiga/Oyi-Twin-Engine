import { useRuntimeAssetState, useTwinRuntime, type CommandName } from "../../engine/twinRuntime";
import { useRepresentation } from "../../engine/hooks/useRepresentation";
import { lunaTwinDataProvider } from "./lunaTwinDataProvider";
import { relationshipsFrom, relationshipsTo, reverseRelationshipLabel, relationshipLabel } from "../../engine/engineeringRelationships";
import { LUNA_ENGINEERING_RELATIONSHIPS } from "./lunaEngineeringRelationships";
import { METER_PAIRED_DB_REF } from "./lunaElectricalBoard";

// Electrical System V1 (Part 8) — the Electrical Control Board's per-asset
// content, the electrical-system equivalent of WaterAssetPanel.tsx. Same
// structure, same ASSET_ONLY/OBSERVABLE/CONTROLLABLE respect. One
// deliberate difference from Water's generic CommandButtons: setMode is
// excluded from the rendered button set for ATS-01/GEN-01 here — a
// zero-arg button press would silently default the ATS source / generator
// mode argument rather than represent a real operator decision, which
// Part 8 explicitly asks NOT to fabricate ("Do NOT provide unsafe/
// fabricated manual switching semantics merely for visual effect"). Start/
// Stop (turnOn/turnOff) remain real, safe, zero-arg commands and stay
// available exactly as the catalog's real capabilities allow.

const COMMAND_LABEL: Record<string, string> = { turnOn: "Start", turnOff: "Stop", open: "Open", close: "Close" };
const SUPPRESSED_COMMANDS = new Set<CommandName>(["setMode"]);

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
  const commands = snapshot.availableCommands.filter((c) => !SUPPRESSED_COMMANDS.has(c));
  if (!commands.length) return null;
  const command = async (name: CommandName) => {
    await runtime.execute({ assetRef: ref_, command: name, actor: identity });
  };
  return (
    <div className="lift-buttons" style={{ marginTop: 8 }}>
      {commands.map((cmd) => (
        <button key={cmd} onClick={() => void command(cmd)}>
          {COMMAND_LABEL[cmd] ?? cmd}
        </button>
      ))}
    </div>
  );
}

export function ElectricalAssetPanel({ focusedRef }: { focusedRef: string }) {
  const { identity, policy } = useRepresentation();
  const asset = lunaTwinDataProvider.getAsset(focusedRef);
  const pairedDb = lunaTwinDataProvider.getAsset(METER_PAIRED_DB_REF);
  const isMeterTab = focusedRef === "LUNA-L06-APT-A-METER-ELEC-01";
  const mode = policy.resolveMode({ ref: focusedRef, identity });
  if (!asset || mode === "HIDDEN") return null;
  const full = mode === "FULL_3D";

  return (
    <div data-electrical-asset-panel data-electrical-ref={focusedRef}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.55, marginBottom: 6 }}>
        {asset.classification === "controllable" ? "Controllable" : asset.classification === "observable" ? "Observable" : "Asset only"}
      </div>
      <AssetRows ref_={focusedRef} />
      {full && <CommandButtons ref_={focusedRef} />}
      {full && <RelationshipList ref_={focusedRef} />}
      {isMeterTab && pairedDb && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>{pairedDb.label}</div>
          <AssetRows ref_={METER_PAIRED_DB_REF} />
        </div>
      )}
      {!full && <div style={{ marginTop: 8, fontSize: 11, opacity: 0.55, fontStyle: "italic" }}>Facility-authorized context. Commands are not admitted in this view.</div>}
    </div>
  );
}
