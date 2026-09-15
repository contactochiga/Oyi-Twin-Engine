// Spatial navigation restoration pass §3 — 2D/3D used to be a permanent
// global control in the centre-bottom dock; it now lives beside whatever
// spatial preview the active contextual card is showing (level floor
// plan, apartment floor plan, interior room list), one small pill pair
// per card. Same shared state, same (currently presentational-only)
// behaviour as before — this is a relocation, not a rebuild of the 2D/3D
// representation itself.

export interface Representation2D3DToggleProps {
  mode: "2D" | "3D";
  onSetMode: (mode: "2D" | "3D") => void;
}

export function Representation2D3DToggle({ mode, onSetMode }: Representation2D3DToggleProps) {
  return (
    <div style={{ display: "inline-flex", gap: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, padding: 2 }}>
      {(["2D", "3D"] as const).map((m) => (
        <button
          key={m}
          onClick={() => onSetMode(m)}
          style={{
            background: mode === m ? "rgba(184, 138, 240, 0.22)" : "transparent",
            border: "none",
            color: mode === m ? "#e6d6ff" : "rgba(242, 242, 245, 0.55)",
            borderRadius: 5,
            padding: "3px 8px",
            fontSize: 10,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
