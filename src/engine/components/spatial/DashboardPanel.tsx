import type { ReactNode } from "react";
import { GLASS_SURFACE } from "./glassStyle";

export interface DashboardPanelProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** A temporary glass operational surface summoned on demand (Phase 12) —
 * "Oyi, give me Luna's status" opens one of these; closing it returns to
 * a clean twin. Deliberately not a permanent dashboard: the host decides
 * when to mount this (e.g. in response to a specific Oyi intent), and
 * unmounting it is the only "close" state that exists — no persisted
 * layout, no docked panel a user has to manually re-hide every session. */
export function DashboardPanel({ title, onClose, children }: DashboardPanelProps) {
  return (
    <div style={{ ...GLASS_SURFACE, width: 320, padding: 16, pointerEvents: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{title}</span>
        <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", color: "inherit", opacity: 0.6, cursor: "pointer", fontSize: 15 }}>
          ✕
        </button>
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}
