import { FIRE_BOARD_ASSETS } from "./lunaFireBoard";
import { FireAssetPanel } from "./FireAssetPanel";
import { SystemControlBoard } from "../../engine/components/spatial/SystemControlBoard";
import { useFireState, type FireBuildingState } from "../runtime/lunaFireResolver";

export interface FireControlBoardProps {
  focusedRef: string;
  onSelectTab: (ref: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

const STATE_LABEL: Record<FireBuildingState, string> = { normal: "NORMAL", alarm: "ALARM", trouble: "TROUBLE" };
const STATE_COLOR: Record<FireBuildingState, string> = { normal: "#3fbf6a", alarm: "#e8543f", trouble: "#e0a83c" };

// Fire & Life Safety System V1 (Part 5/9) — a compact, always-visible
// building fire-state strip, reading directly from the SAME
// resolveFireState() truth the 3D X-ray and Oyi both use. Deliberately
// restrained (Part 12: "professional building operations system", not
// arcade red-flashing) — a static color-coded readout, no animation.
function FireStatusSummary() {
  const fire = useFireState();
  if (!fire) return null;
  return (
    <div data-fire-status-summary data-fire-state={fire.fireState} style={{ borderRadius: 9, background: "rgba(255,255,255,0.05)", padding: "8px 10px", marginBottom: 2 }}>
      <div style={{ fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55 }}>Fire Status</div>
      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.03em", color: STATE_COLOR[fire.fireState], marginTop: 1 }}>{STATE_LABEL[fire.fireState]}</div>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2, fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ opacity: 0.6 }}>Zone</span><span>{fire.originatingZoneLabel ?? "—"}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ opacity: 0.6 }}>Devices</span><span>{fire.activeAlarmDeviceCount}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ opacity: 0.6 }}>Pump</span><span>{fire.pump.fault ? "Fault" : fire.pump.running ? "Running" : "Stopped"}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ opacity: 0.6 }}>Controller</span><span>{fire.controllerCommunicationOk ? "OK" : "Comms Fault"}</span></div>
      </div>
    </div>
  );
}

// Fire & Life Safety System V1 (Part 9) — the fourth consumer of the
// Unified Spatial Control Surface v1 pattern, after Elevators, Water and
// Electrical. Only reuses existing registered assets (lunaFireBoard.ts);
// the actual state/command/relationship rendering lives in FireAssetPanel.
export function FireControlBoard({ focusedRef, onSelectTab, collapsed, onToggleCollapsed }: FireControlBoardProps) {
  return (
    <SystemControlBoard
      title="Fire"
      tabs={FIRE_BOARD_ASSETS.map((a) => ({ key: a.ref, label: a.shortLabel }))}
      activeTabKey={focusedRef}
      onSelectTab={onSelectTab}
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      headerContent={<FireStatusSummary />}
    >
      <FireAssetPanel focusedRef={focusedRef} />
    </SystemControlBoard>
  );
}
