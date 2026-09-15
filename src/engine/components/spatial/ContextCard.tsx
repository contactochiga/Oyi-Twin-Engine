import type { ReactNode } from "react";
import { GLASS_SURFACE, GLASS_ACCENT } from "./glassStyle";

export interface ContextCardRow {
  label: string;
  value: string;
}

export interface ContextCardAction {
  label: string;
  onClick: () => void;
}

export interface ContextCardContent {
  title: string;
  subtitle?: string;
  rows?: ContextCardRow[];
  actions?: ContextCardAction[];
  /** Set when the policy resolved this to a privacy-reduced view (Facility
   * looking at an occupied unit's operational shell, etc.) — renders a
   * small disclosure line instead of pretending the card is showing full
   * detail. Phase 12's "must obey RepresentationPolicy" requirement. */
  privacyNote?: string;
}

/** One reusable building-agnostic glass surface (Phase 12) — content is
 * entirely supplied by the caller (a building's own resolver reads the
 * selected canonical entity + TwinRuntimeProvider + RepresentationPolicy
 * and produces this shape); this component only owns the glass layout,
 * never building-specific knowledge of what a "room" or "pump" is. */
export function ContextCard({ content, onClose, children }: { content: ContextCardContent; onClose: () => void; children?: ReactNode }) {
  return (
    <div data-context-card data-context-card-title={content.title} style={{ ...GLASS_SURFACE, width: 280, padding: "16px 18px", pointerEvents: "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6, marginBottom: 2 }}>{content.title}</div>
          {content.subtitle && <div style={{ fontSize: 15, fontWeight: 600 }}>{content.subtitle}</div>}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ background: "transparent", border: "none", color: "inherit", opacity: 0.6, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 2 }}
        >
          ✕
        </button>
      </div>

      {content.rows && content.rows.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
          {content.rows.map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
              <span style={{ opacity: 0.6 }}>{row.label}</span>
              <span>{row.value}</span>
            </div>
          ))}
        </div>
      )}

      {content.privacyNote && (
        <div style={{ marginTop: 10, fontSize: 11, opacity: 0.55, fontStyle: "italic" }}>{content.privacyNote}</div>
      )}

      {children}
      {content.actions && content.actions.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          {content.actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              style={{
                flex: 1,
                background: "rgba(184, 138, 240, 0.16)",
                border: `1px solid ${GLASS_ACCENT}55`,
                color: "#e6d6ff",
                borderRadius: 9,
                padding: "7px 10px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ContextCardHost({ children }: { children: ReactNode }) {
  return <div style={{ position: "absolute", pointerEvents: "none" }}>{children}</div>;
}
