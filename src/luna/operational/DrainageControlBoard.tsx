import { DRAINAGE_BOARD_ASSETS } from "./lunaDrainageBoard";
import { DrainageAssetPanel } from "./DrainageAssetPanel";
import { SystemControlBoard } from "../../engine/components/spatial/SystemControlBoard";
import { useDrainageState } from "../runtime/lunaDrainageResolver";

export interface DrainageControlBoardProps {
  focusedRef: string;
  onSelectTab: (ref: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

// Drainage V1 — a compact, always-visible status strip, reading directly
// from the SAME resolveDrainageState() truth the 3D Twin and Oyi both
// use. DD10 (final discharge/stormwater design) is disclosed here too,
// not only in documentation — matching THE NETWORK CARRIES TRUTH
// precedent's own discipline of surfacing the honesty statement on the
// panel itself.
function DrainageStatusSummary() {
  const drainage = useDrainageState();
  if (!drainage) return null;
  const stackState = drainage.wastewaterBackbone[0]?.state ?? "NORMAL";
  return (
    <div data-drainage-status-summary style={{ borderRadius: 9, background: "rgba(255,255,255,0.05)", padding: "8px 10px", marginBottom: 2 }}>
      <div style={{ fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55 }}>Drainage Status (reference simulation)</div>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2, fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ opacity: 0.6 }}>6A Wet-Area Stack Connection</span>
          <span>{stackState.charAt(0) + stackState.slice(1).toLowerCase()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ opacity: 0.6 }}>Vent</span>
          <span>Single-stack (reference)</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ opacity: 0.6 }}>Stormwater</span>
          <span>Reference only — DESIGN DECISION REQUIRED</span>
        </div>
      </div>
    </div>
  );
}

// Drainage V1 — the ninth consumer of the Unified Spatial Control Surface
// pattern, after Elevators, Water, Electrical, Fire, HVAC, Access, CCTV
// and Network/Edge. Only reuses existing registered assets
// (lunaDrainageBoard.ts); the actual state/relationship rendering lives
// in DrainageAssetPanel.
export function DrainageControlBoard({ focusedRef, onSelectTab, collapsed, onToggleCollapsed }: DrainageControlBoardProps) {
  return (
    <SystemControlBoard
      title="Drainage"
      tabs={DRAINAGE_BOARD_ASSETS.map((a) => ({ key: a.ref, label: a.shortLabel }))}
      activeTabKey={focusedRef}
      onSelectTab={onSelectTab}
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      headerContent={<DrainageStatusSummary />}
    >
      <DrainageAssetPanel focusedRef={focusedRef} />
    </SystemControlBoard>
  );
}
