import { GLASS_SURFACE, GLASS_ACCENT } from "./glassStyle";

// Oyi Twin Engine — the two primary spatial controls (interface
// convergence pass §3). Deliberately minimal: only Engineering Layers
// (WHAT representation) and Scenes (WHERE/what spatial experience) — no
// Settings, no Profile, nothing else. This replaces the old permanent
// 2D/3D/Systems/Cameras toolbar entirely; it does not coexist with it.

export interface BottomControlBarProps {
  engineeringActive: boolean;
  engineeringLabel: string;
  onToggleEngineering: () => void;
  scenesActive: boolean;
  onToggleScenes: () => void;
}

function ControlButton({ label, active, onClick, icon }: { label: string; active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: active ? "rgba(184, 138, 240, 0.22)" : "transparent",
        border: active ? `1px solid ${GLASS_ACCENT}88` : "1px solid transparent",
        color: active ? "#e6d6ff" : "rgba(242, 242, 245, 0.85)",
        borderRadius: 10,
        padding: "9px 16px",
        fontSize: 12.5,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

export function BottomControlBar({ engineeringActive, engineeringLabel, onToggleEngineering, scenesActive, onToggleScenes }: BottomControlBarProps) {
  return (
    <div style={{ ...GLASS_SURFACE, display: "flex", gap: 4, padding: 6, pointerEvents: "auto" }}>
      <ControlButton
        label={engineeringLabel}
        active={engineeringActive}
        onClick={onToggleEngineering}
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 3 8l9 5 9-5-9-5Z" />
            <path d="M3 12l9 5 9-5" />
          </svg>
        }
      />
      <ControlButton
        label="Scenes"
        active={scenesActive}
        onClick={onToggleScenes}
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
            <path d="M3.5 15.5 8 11l3 3 4-4.5 5.5 6" />
          </svg>
        }
      />
    </div>
  );
}
