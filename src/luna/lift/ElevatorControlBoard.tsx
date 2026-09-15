import { LIFT_DEFINITIONS, type LiftView } from "./lunaLift";
import { LiftControlsPanel } from "./LiftControlsPanel";
import { SystemControlBoard } from "../../engine/components/spatial/SystemControlBoard";

export interface ElevatorControlBoardProps {
  focusedRef: string;
  liftView: LiftView | null;
  onSelectLift: (ref: string) => void;
  onLiftView: (view: LiftView | null) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

// Luna's first consumer of the Unified Spatial Control Surface v1 pattern
// (System -> Asset Selector -> Asset State -> Commands -> Views). Supplies
// the generic SystemControlBoard shell with the four canonical lifts as
// tabs and reuses LiftControlsPanel (the same content the legacy bottom-
// right card used) for the focused lift's state/commands/views — switching
// tabs updates this one board rather than spawning another card.
export function ElevatorControlBoard({ focusedRef, liftView, onSelectLift, onLiftView, collapsed, onToggleCollapsed }: ElevatorControlBoardProps) {
  return (
    <SystemControlBoard
      title="Elevators"
      tabs={LIFT_DEFINITIONS.map((d) => ({ key: d.ref, label: d.shortLabel }))}
      activeTabKey={focusedRef}
      onSelectTab={onSelectLift}
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
    >
      <LiftControlsPanel liftRef={focusedRef} liftView={liftView} onLiftView={onLiftView} />
    </SystemControlBoard>
  );
}
