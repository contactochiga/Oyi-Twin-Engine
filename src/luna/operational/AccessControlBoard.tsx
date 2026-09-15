import { ACCESS_BOARD_ASSETS } from "./lunaAccessBoard";
import { AccessAssetPanel } from "./AccessAssetPanel";
import { SystemControlBoard } from "../../engine/components/spatial/SystemControlBoard";
import { useAccessState } from "../runtime/lunaAccessResolver";

export interface AccessControlBoardProps {
  focusedRef: string;
  onSelectTab: (ref: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

// Access & Security System V1 — a compact, always-visible status strip,
// reading directly from the SAME resolveAccessState() truth the 3D Twin
// and Oyi both use. Only the one really-instrumented reference lock
// (Apartment 6A's entrance) reports a real LOCKED/UNLOCKED read; the three
// common access points are disclosed as "not instrumented" rather than a
// fabricated state — see lunaAccessResolver.ts / lunaSimulationProvider.ts.
function AccessStatusSummary() {
  const access = useAccessState();
  if (!access) return null;
  const instrumented = access.points.find((p) => p.instrumented);
  return (
    <div data-access-status-summary style={{ borderRadius: 9, background: "rgba(255,255,255,0.05)", padding: "8px 10px", marginBottom: 2 }}>
      <div style={{ fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55 }}>Access Status (reference simulation)</div>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2, fontSize: 11 }}>
        {access.points.map((p) => (
          <div key={p.ref} style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ opacity: 0.6 }}>{p.label}</span>
            <span>{p.instrumented ? (p.locked ? "Locked" : "Unlocked") : "Not instrumented"}</span>
          </div>
        ))}
        {access.lastEvent && (
          <div style={{ marginTop: 4, opacity: 0.55 }}>
            Last event: {access.lastEvent.label}
            {access.lastEvent.detail ? ` — ${access.lastEvent.detail}` : ""}
          </div>
        )}
      </div>
      {!instrumented && <div style={{ marginTop: 4, fontSize: 10, opacity: 0.45, fontStyle: "italic" }}>No common access point has instrumented lock telemetry yet.</div>}
    </div>
  );
}

// Access & Security System V1 — the sixth consumer of the Unified Spatial
// Control Surface pattern, after Elevators, Water, Electrical, Fire and
// HVAC. Only reuses existing registered assets (lunaAccessBoard.ts); the
// actual state/command rendering lives in AccessAssetPanel.
export function AccessControlBoard({ focusedRef, onSelectTab, collapsed, onToggleCollapsed }: AccessControlBoardProps) {
  return (
    <SystemControlBoard
      title="Access & Security"
      tabs={ACCESS_BOARD_ASSETS.map((a) => ({ key: a.ref, label: a.shortLabel }))}
      activeTabKey={focusedRef}
      onSelectTab={onSelectTab}
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      headerContent={<AccessStatusSummary />}
    >
      <AccessAssetPanel focusedRef={focusedRef} />
    </SystemControlBoard>
  );
}
