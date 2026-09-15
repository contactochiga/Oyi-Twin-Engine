import { SystemIcon, type IconKey } from "./SystemIcon";
import { GLASS_SURFACE } from "./glassStyle";
import type { CanonicalRef } from "../../types";

export interface LevelRailItem {
  ref: CanonicalRef;
  /** Short rail label — "ROOF", "PH", "L12", "G", "B1" — the host decides
   * its own abbreviation convention; this component just renders strings. */
  shortLabel: string;
}

export interface LevelRailProps {
  engineeringLabel?: string;
  engineeringIcon?: IconKey;
  engineeringOpen?: boolean;
  viewOpen?: boolean;
  onEngineering?: () => void;
  onView?: () => void;
  levels: LevelRailItem[];
  activeLevelRef: CanonicalRef | null;
  onHoverLevel?: (ref: CanonicalRef | null) => void;
  onSelectLevel: (ref: CanonicalRef) => void;
}

/** The minimal vertical glass level navigator (Phase 12) — synchronized
 * with whatever canonical level list the host passes in, top (roof) to
 * bottom (basement) in whatever order the caller supplies. Purely a
 * navigation strip: what "click" actually does (isolate vs. just fly the
 * camera) is the host's call via onSelectLevel, since that decision is
 * scope-dependent (Facility isolating an occupied floor must still land
 * on the privacy-safe 2D representation, not a bespoke rule this
 * building-agnostic component could ever know about). */
export function LevelRail({ levels, activeLevelRef, onHoverLevel, onSelectLevel, engineeringLabel = "Architecture", engineeringIcon = "architecture", engineeringOpen, viewOpen, onEngineering, onView }: LevelRailProps) {
  return (
    <div
      style={{
        ...GLASS_SURFACE,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: 6,
        maxHeight: "100%",
        overflowY: "auto",
        pointerEvents: "auto",
      }}
    >
      {levels.map((level) => {
        const active = level.ref === activeLevelRef;
        return (
          <button
            key={level.ref}
            onClick={() => onSelectLevel(level.ref)}
            onMouseEnter={() => onHoverLevel?.(level.ref)}
            onMouseLeave={() => onHoverLevel?.(null)}
            style={{
              background: active ? "rgba(184, 138, 240, 0.22)" : "transparent",
              border: active ? "1px solid rgba(184, 138, 240, 0.55)" : "1px solid transparent",
              color: active ? "#e6d6ff" : "rgba(242, 242, 245, 0.75)",
              borderRadius: 8,
              padding: "4px 6px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.03em",
              cursor: "pointer",
              textAlign: "center",
              minWidth: 44,
            }}
          >
            {level.shortLabel}
          </button>
        );
      })}
      <button data-engineering-launcher className="rail-launcher" aria-label={engineeringLabel} title="Change engineering representation" aria-expanded={engineeringOpen} onClick={onEngineering}>
        <span>{engineeringLabel}</span><span aria-hidden="true" data-system-icon={engineeringIcon}><SystemIcon system={engineeringIcon} color="currentColor" /></span>
      </button>
      <button data-view-launcher className="rail-launcher" aria-label="View" aria-expanded={viewOpen} onClick={onView}>View</button>
    </div>
  );
}
