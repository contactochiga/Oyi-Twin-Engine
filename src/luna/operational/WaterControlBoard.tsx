import { WATER_BOARD_ASSETS } from "./lunaWaterBoard";
import { WaterAssetPanel } from "./WaterAssetPanel";
import { SystemControlBoard } from "../../engine/components/spatial/SystemControlBoard";

export interface WaterControlBoardProps {
  focusedRef: string;
  onSelectTab: (ref: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

// Domestic Water Reference System V1 (Part I) — the second consumer of the
// Unified Spatial Control Surface v1 pattern (System -> Asset Selector ->
// Asset State -> Commands -> Views), proving SystemControlBoard is
// genuinely reusable rather than an elevator-only shape. Only reuses
// existing registered assets (lunaWaterBoard.ts); the actual state/command/
// relationship rendering lives in WaterAssetPanel.
export function WaterControlBoard({ focusedRef, onSelectTab, collapsed, onToggleCollapsed }: WaterControlBoardProps) {
  return (
    <SystemControlBoard
      title="Water"
      tabs={WATER_BOARD_ASSETS.map((a) => ({ key: a.ref, label: a.shortLabel }))}
      activeTabKey={focusedRef}
      onSelectTab={onSelectTab}
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
    >
      <WaterAssetPanel focusedRef={focusedRef} />
    </SystemControlBoard>
  );
}
