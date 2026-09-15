import { HVAC_BOARD_ASSETS } from "./lunaHvacBoard";
import { HvacAssetPanel } from "./HvacAssetPanel";
import { SystemControlBoard } from "../../engine/components/spatial/SystemControlBoard";
import { useHvacState, type HvacBuildingState } from "../runtime/lunaHvacResolver";

export interface HvacControlBoardProps {
  focusedRef: string;
  onSelectTab: (ref: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

const STATE_LABEL: Record<HvacBuildingState, string> = { off: "OFF", running: "RUNNING", fault: "FAULT" };
const STATE_COLOR: Record<HvacBuildingState, string> = { off: "#8b93a1", running: "#57cf9a", fault: "#e8543f" };

// HVAC System V1 — a compact, always-visible reference-chain state strip,
// reading directly from the SAME resolveHvacState() truth the 3D Twin and
// Oyi both use. "(reference simulation)" is deliberately part of the
// label text, not just prose, so the SIMULATED vs LIVE distinction (Part
// 6) is visible even at a glance, not only in the longer Oyi narrative.
function HvacStatusSummary() {
  const hvac = useHvacState();
  if (!hvac) return null;
  return (
    <div data-hvac-status-summary data-hvac-state={hvac.hvacState} style={{ borderRadius: 9, background: "rgba(255,255,255,0.05)", padding: "8px 10px", marginBottom: 2 }}>
      <div style={{ fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55 }}>HVAC Status (reference simulation)</div>
      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.03em", color: STATE_COLOR[hvac.hvacState], marginTop: 1 }}>{STATE_LABEL[hvac.hvacState]}</div>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2, fontSize: 11 }}>
        {hvac.zones.map((z) => (
          <div key={z.ref} style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ opacity: 0.6 }}>{z.label}</span>
            <span>{z.state === "fault" ? "Fault" : z.on ? `On${z.roomTempC !== null ? `, ${z.roomTempC}°C` : ""}` : "Off"}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ opacity: 0.6 }}>Condenser</span><span>{hvac.outdoorDemand ? "Active" : "Idle"}</span></div>
      </div>
    </div>
  );
}

// HVAC System V1 — the fifth consumer of the Unified Spatial Control
// Surface pattern, after Elevators, Water, Electrical and Fire. Only
// reuses existing registered assets (lunaHvacBoard.ts); the actual state/
// command/relationship rendering lives in HvacAssetPanel.
export function HvacControlBoard({ focusedRef, onSelectTab, collapsed, onToggleCollapsed }: HvacControlBoardProps) {
  return (
    <SystemControlBoard
      title="HVAC"
      tabs={HVAC_BOARD_ASSETS.map((a) => ({ key: a.ref, label: a.shortLabel }))}
      activeTabKey={focusedRef}
      onSelectTab={onSelectTab}
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      headerContent={<HvacStatusSummary />}
    >
      <HvacAssetPanel focusedRef={focusedRef} />
    </SystemControlBoard>
  );
}
