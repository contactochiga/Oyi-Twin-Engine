import { NETWORK_BOARD_ASSETS } from "./lunaNetworkBoard";
import { NetworkAssetPanel } from "./NetworkAssetPanel";
import { SystemControlBoard } from "../../engine/components/spatial/SystemControlBoard";
import { useNetworkState } from "../runtime/lunaNetworkResolver";

export interface NetworkControlBoardProps {
  focusedRef: string;
  onSelectTab: (ref: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

// Network / Edge & Physical Connectivity V1 — a compact, always-visible
// status strip, reading directly from the SAME resolveNetworkState()
// truth the 3D Twin and Oyi both use. THE NETWORK CARRIES TRUTH, IT DOES
// NOT CREATE TRUTH: edgeCoreConnected is always false here too — the
// summary never implies a connection that isn't real.
function NetworkStatusSummary() {
  const network = useNetworkState();
  if (!network) return null;
  return (
    <div data-network-status-summary style={{ borderRadius: 9, background: "rgba(255,255,255,0.05)", padding: "8px 10px", marginBottom: 2 }}>
      <div style={{ fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55 }}>Network Status (reference simulation)</div>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2, fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ opacity: 0.6 }}>Core Gateway Uplink</span>
          <span>{network.gatewayUplinkUp ? "Up" : "Down"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ opacity: 0.6 }}>Wi-Fi AP (Common Area)</span>
          <span>{network.wifiApReachable ? "Reachable" : "Unreachable"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ opacity: 0.6 }}>Oyi Edge/Core</span>
          <span>{network.edgeCoreOnline ? "Online" : "Offline"}, not connected to gateway</span>
        </div>
      </div>
    </div>
  );
}

// Network / Edge & Physical Connectivity V1 — the eighth consumer of the
// Unified Spatial Control Surface pattern, after Elevators, Water,
// Electrical, Fire, HVAC, Access and CCTV. Only reuses existing
// registered assets (lunaNetworkBoard.ts); the actual state/backbone
// rendering lives in NetworkAssetPanel.
export function NetworkControlBoard({ focusedRef, onSelectTab, collapsed, onToggleCollapsed }: NetworkControlBoardProps) {
  return (
    <SystemControlBoard
      title="Network / Edge"
      tabs={NETWORK_BOARD_ASSETS.map((a) => ({ key: a.ref, label: a.shortLabel }))}
      activeTabKey={focusedRef}
      onSelectTab={onSelectTab}
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      headerContent={<NetworkStatusSummary />}
    >
      <NetworkAssetPanel focusedRef={focusedRef} />
    </SystemControlBoard>
  );
}
