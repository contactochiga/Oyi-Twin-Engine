import { ELECTRICAL_BOARD_ASSETS } from "./lunaElectricalBoard";
import { ElectricalAssetPanel } from "./ElectricalAssetPanel";
import { SystemControlBoard } from "../../engine/components/spatial/SystemControlBoard";
import { useBuildingPowerState, type BuildingSupplySource } from "../runtime/lunaPowerResolver";

export interface ElectricalControlBoardProps {
  focusedRef: string;
  onSelectTab: (ref: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

const SOURCE_LABEL: Record<BuildingSupplySource, string> = { utility: "UTILITY", generator: "GENERATOR", inverter: "INVERTER", mixed: "TRANSFERRING", none: "NONE" };
const SOURCE_COLOR: Record<BuildingSupplySource, string> = { utility: "#8fe3a6", generator: "#f2c744", inverter: "#7fc8ff", mixed: "#f2c744", none: "#ff6b6b" };

// Electrical System V1.1 (Part 4) — a compact, always-visible "what is
// Luna running on right now" strip, reading directly from the SAME
// resolveBuildingPower() truth the 3D X-ray and Oyi both use — never a
// second, independently-maintained summary. Deliberately terse (Part 4:
// "keep this minimal, the building remains the primary interface").
function BuildingSupplySummary() {
  const power = useBuildingPowerState();
  if (!power) return null;
  const genLabel = power.generator.fault ? "Fault" : power.generator.phase === "running" ? "Running" : power.generator.phase === "starting" ? "Starting" : power.generator.phase === "stopping" ? "Cooldown" : "Standby";
  const atsLabel = power.ats.transitioning ? "Transferring…" : power.ats.source === "generator" ? "Generator" : "Utility";
  return (
    <div data-building-supply-summary data-building-supply-source={power.activeSource} style={{ borderRadius: 9, background: "rgba(255,255,255,0.05)", padding: "8px 10px", marginBottom: 2 }}>
      <div style={{ fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55 }}>Current Building Supply</div>
      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.03em", color: SOURCE_COLOR[power.activeSource], marginTop: 1 }}>{SOURCE_LABEL[power.activeSource]}</div>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2, fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ opacity: 0.6 }}>Utility</span><span>{power.utilityAvailable ? "Available" : "Unavailable"}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ opacity: 0.6 }}>Generator</span><span>{genLabel}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ opacity: 0.6 }}>ATS</span><span>{atsLabel}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ opacity: 0.6 }}>Main Bus</span><span>{power.mainBusEnergized ? "Energized" : "De-energized"}</span></div>
      </div>
    </div>
  );
}

// Electrical System V1 (Part 7) — the third consumer of the Unified
// Spatial Control Surface v1 pattern, after Elevators and Water. Only
// reuses existing registered assets (lunaElectricalBoard.ts); the actual
// state/command/relationship rendering lives in ElectricalAssetPanel.
export function ElectricalControlBoard({ focusedRef, onSelectTab, collapsed, onToggleCollapsed }: ElectricalControlBoardProps) {
  return (
    <SystemControlBoard
      title="Electrical"
      tabs={ELECTRICAL_BOARD_ASSETS.map((a) => ({ key: a.ref, label: a.shortLabel }))}
      activeTabKey={focusedRef}
      onSelectTab={onSelectTab}
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      headerContent={<BuildingSupplySummary />}
    >
      <ElectricalAssetPanel focusedRef={focusedRef} />
    </SystemControlBoard>
  );
}
