import type { ReactNode } from "react";
import { GLASS_SURFACE, GLASS_ACCENT } from "./glassStyle";

export interface SystemControlTab {
  key: string;
  label: string;
}

export interface SystemControlBoardProps {
  title: string;
  tabs: SystemControlTab[];
  activeTabKey: string;
  onSelectTab: (key: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Optional compact summary rendered between the title row and the tab
   * selector, visible regardless of which tab is focused — e.g.
   * Electrical's "CURRENT BUILDING SUPPLY" strip (V1.1). Generic and
   * building-agnostic like every other prop here: any system-derived,
   * cross-asset summary a future consumer wants at-a-glance can use this
   * same slot, never a new board layout. */
  headerContent?: ReactNode;
  children?: ReactNode;
}

// Oyi Twin Engine — Unified Spatial Control Surface v1. A building-
// agnostic shell for the "System -> Asset Selector -> Asset State ->
// Commands -> Views" control-zone pattern. Elevators is the first system
// to use it (see src/luna/lift/ElevatorControlBoard.tsx); Water,
// Electrical, Fire, HVAC, Access, CCTV and Network/Edge can each reuse
// this exact shell later by supplying their own tabs + content — nothing
// in here is elevator-specific or Luna-specific. This component only
// owns the glass/tabs/collapse chrome, never system-specific knowledge.
export function SystemControlBoard({ title, tabs, activeTabKey, onSelectTab, collapsed, onToggleCollapsed, headerContent, children }: SystemControlBoardProps) {
  return (
    <div
      data-system-control-board={title}
      style={{
        ...GLASS_SURFACE,
        width: collapsed ? "auto" : 268,
        padding: collapsed ? 8 : "12px 14px 14px",
        pointerEvents: "auto",
        alignSelf: "flex-start",
        maxHeight: "calc(100vh - 120px)",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6, whiteSpace: "nowrap" }}>{title}</div>
        <button
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand" : "Collapse"}
          data-board-collapse-toggle
          style={{ background: "transparent", border: "none", color: "inherit", opacity: 0.65, cursor: "pointer", fontSize: 13, padding: 2, lineHeight: 1 }}
        >
          {collapsed ? "▸" : "▾"}
        </button>
      </div>

      {!collapsed && headerContent && <div style={{ marginTop: 9 }}>{headerContent}</div>}

      {!collapsed && (
        <>
          <div role="tablist" aria-label={`${title} selector`} style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 9, background: "rgba(255,255,255,0.05)", borderRadius: 9, padding: 3 }}>
            {tabs.map((tab) => {
              const active = tab.key === activeTabKey;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => onSelectTab(tab.key)}
                  title={tab.label}
                  style={{
                    flex: "1 1 auto",
                    minWidth: 44,
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    background: active ? "rgba(184, 138, 240, 0.28)" : "transparent",
                    border: active ? `1px solid ${GLASS_ACCENT}88` : "1px solid transparent",
                    color: active ? "#e6d6ff" : "rgba(242,242,245,0.7)",
                    borderRadius: 7,
                    padding: "6px 2px",
                    fontSize: 10.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 10 }}>{children}</div>
        </>
      )}
    </div>
  );
}
