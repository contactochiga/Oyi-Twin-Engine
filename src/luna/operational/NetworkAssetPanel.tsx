import { useRuntimeAssetState, useTwinRuntime, type CommandName } from "../../engine/twinRuntime";
import { useRepresentation } from "../../engine/hooks/useRepresentation";
import { lunaTwinDataProvider } from "./lunaTwinDataProvider";
import { useNetworkState } from "../runtime/lunaNetworkResolver";

// Network / Edge & Physical Connectivity V1 — the Network Control Board's
// per-asset content, the same generic ASSET_ONLY/OBSERVABLE/CONTROLLABLE
// template as every prior system's own AssetPanel. All network/edge
// assets' real capabilities are empty (no command is documented anywhere
// in the canonical schedule for this system), so CommandButtons correctly
// renders nothing for any of them — no fake controls, no dead buttons.

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

/** Gateway only: the one real, physical backbone chain (Phase 10's own
 * parentRef data) — riser, floor branch, Apartment 6A's ONT and router —
 * reusing the SAME resolveNetworkState() truth the header summary and Oyi
 * both read, never a second notion of "what's reachable." */
function BackboneChainSummary() {
  const network = useNetworkState();
  if (!network) return null;
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.55, marginBottom: 6 }}>Physical Backbone (real parentRef chain)</div>
      <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 3 }}>
        {network.backbone.map((node) => (
          <div key={node.ref} style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ opacity: 0.6 }}>{node.label}</span>
            <span>{node.reachable ? "Reachable" : "Unreachable"}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ opacity: 0.6 }}>Wi-Fi AP (Common Area)</span>
          <span>{network.wifiApReachable ? `Reachable — ${network.wifiApClientsConnected} clients` : "Unreachable"}</span>
        </div>
      </div>
    </div>
  );
}

/** Oyi Edge/Core only: the central honesty disclosure. No established
 * physical connection exists anywhere in canonical data between this
 * asset and the gateway chain — this is stated here explicitly rather
 * than silently leaving the panel blank. */
function EdgeCoreDisclosure() {
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.55, marginBottom: 6 }}>Network Connection</div>
      <div style={{ fontSize: 11.5, opacity: 0.7, fontStyle: "italic" }}>
        No established physical or logical connection exists between Oyi Edge/Core and the building's network infrastructure in this reference build (DESIGN DECISION REQUIRED). This asset's own record already discloses it as a local prototype placeholder — the network does not create a connection that isn't real.
      </div>
    </div>
  );
}

export function NetworkAssetPanel({ focusedRef }: { focusedRef: string }) {
  const { identity, policy } = useRepresentation();
  const asset = lunaTwinDataProvider.getAsset(focusedRef);
  const mode = policy.resolveMode({ ref: focusedRef, identity });
  if (!asset || mode === "HIDDEN") return null;
  const full = mode === "FULL_3D";
  const isGateway = focusedRef === "LUNA-B1-NET-GATEWAY-01";
  const isEdgeCore = focusedRef === "LUNA-EDGE-CORE-01";

  return (
    <div data-network-asset-panel data-network-ref={focusedRef}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.55, marginBottom: 6 }}>
        {asset.classification === "controllable" ? "Controllable" : asset.classification === "observable" ? "Observable" : "Asset only"}
      </div>
      <AssetRows ref_={focusedRef} />
      {full && <CommandButtons ref_={focusedRef} />}
      {asset.classification !== "controllable" && (
        <div style={{ marginTop: 8, fontSize: 11, opacity: 0.55, fontStyle: "italic" }}>
          No remote-control capability is instrumented for this network asset in this reference build.
        </div>
      )}
      {full && isGateway && <BackboneChainSummary />}
      {full && isEdgeCore && <EdgeCoreDisclosure />}
      {!full && <div style={{ marginTop: 8, fontSize: 11, opacity: 0.55, fontStyle: "italic" }}>Facility-authorized context. Commands are not admitted in this view.</div>}
    </div>
  );
}
