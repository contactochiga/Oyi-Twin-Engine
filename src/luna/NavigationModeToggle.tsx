// Spatial Card + 2D Plan Visual Convergence V1 (Part 17) — extracted from
// LunaSpatialMap.tsx so the SAME real navigationMode control (never a
// second, UI-only mode flag) can be embedded directly inside the Spatial
// Card's own navigation surface, not just a separate floating map corner.

import type { NavigationMode } from "../engine/spatial/route";

export function NavigationModeToggle({ mode, onSetMode }: { mode: NavigationMode; onSetMode: (mode: NavigationMode) => void }) {
  const option = (value: NavigationMode, label: string) => {
    const active = mode === value;
    return (
      <button
        key={value}
        onClick={() => onSetMode(value)}
        aria-pressed={active}
        style={{
          flex: 1,
          background: active ? "rgba(79,209,255,.14)" : "transparent",
          border: "none",
          color: active ? "#a7e9ff" : "rgba(255,255,255,0.5)",
          fontSize: 9,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          padding: "3px 0",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  };
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 6, background: "rgba(255,255,255,0.05)", borderRadius: 7, padding: 2 }}>
      {option("TELEPORT", "Teleport")}
      {option("TOUR", "Tour")}
    </div>
  );
}
