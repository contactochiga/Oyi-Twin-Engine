import { CCTV_BOARD_ASSETS } from "./lunaCctvBoard";
import { CctvAssetPanel } from "./CctvAssetPanel";
import { SystemControlBoard } from "../../engine/components/spatial/SystemControlBoard";
import { useAllCameraStates } from "../runtime/lunaCameraResolver";

export interface CctvControlBoardProps {
  focusedRef: string;
  onSelectTab: (ref: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

// CCTV & Spatial Security System V1 — a compact, always-visible status
// strip, reading directly from the SAME resolveCameraState() truth the 3D
// Twin and Oyi both use. "(reference simulation)" is deliberately part of
// the label text, matching every other system's own disclosure.
function CctvStatusSummary() {
  const cameras = useAllCameraStates();
  if (!cameras.length) return null;
  return (
    <div data-cctv-status-summary style={{ borderRadius: 9, background: "rgba(255,255,255,0.05)", padding: "8px 10px", marginBottom: 2 }}>
      <div style={{ fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55 }}>CCTV Status (reference simulation)</div>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2, fontSize: 11 }}>
        {cameras.map((c) => (
          <div key={c.ref} data-cctv-camera-state={c.state} style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ opacity: 0.6 }}>{c.label}</span>
            <span>{c.state === "online" ? "Online" : "Offline"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// CCTV & Spatial Security System V1 — the seventh consumer of the Unified
// Spatial Control Surface pattern, after Elevators, Water, Electrical,
// Fire, HVAC and Access. Only reuses existing registered assets
// (lunaCctvBoard.ts); the actual state/relationship/correlation rendering
// lives in CctvAssetPanel.
export function CctvControlBoard({ focusedRef, onSelectTab, collapsed, onToggleCollapsed }: CctvControlBoardProps) {
  return (
    <SystemControlBoard
      title="CCTV & Security"
      tabs={CCTV_BOARD_ASSETS.map((a) => ({ key: a.ref, label: a.shortLabel }))}
      activeTabKey={focusedRef}
      onSelectTab={onSelectTab}
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      headerContent={<CctvStatusSummary />}
    >
      <CctvAssetPanel focusedRef={focusedRef} />
    </SystemControlBoard>
  );
}
