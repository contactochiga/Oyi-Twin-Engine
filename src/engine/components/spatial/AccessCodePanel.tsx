import { useState } from "react";
import { GLASS_SURFACE, GLASS_ACCENT } from "./glassStyle";

export interface AccessCodePanelProps {
  /** The human-readable boundary this code is for — "Apartment A", not a
   * canonical ref. Purely presentational; this component has no idea what
   * building or boundary it's attached to. */
  label: string;
  /** Called with whatever the actor typed — this component NEVER compares
   * the code itself (Apartment A Full Interior Reality V1 Part 6: "Do not
   * hardcode `if code === "1234"` inside a visual component"). Validation
   * happens entirely on the caller's side, through the real access
   * resolver every other credential check already uses. */
  onSubmit: (code: string) => void;
}

/** A small, contextual "simulated keypad" surface — Part 6's own
 * "APARTMENT A / ACCESS REQUIRED / [Enter access code] / UNLOCK" shape,
 * building-agnostic (no Luna import, no knowledge of what's behind the
 * boundary). Mounted only while the real Spatial Transition Engine is
 * genuinely PAUSED_FOR_USER_INPUT — never a decorative always-there login
 * box. Classified SIMULATED / REFERENCE ACCESS, not physical biometric
 * authentication — the caller's own resolver enforces that classification
 * by construction (a fixed demo code, not a real credential store). */
export function AccessCodePanel({ label, onSubmit }: AccessCodePanelProps) {
  const [code, setCode] = useState("");

  const submit = () => {
    if (!code.trim()) return;
    onSubmit(code.trim());
    setCode("");
  };

  return (
    <div
      style={{
        ...GLASS_SURFACE,
        width: 240,
        padding: "16px 18px",
        pointerEvents: "auto",
        position: "absolute",
        left: "50%",
        bottom: 96,
        transform: "translateX(-50%)",
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>Access Required</div>
      <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>Simulated / Reference Access</div>
      <input
        aria-label="Access code"
        type="password"
        inputMode="numeric"
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder="Enter access code"
        style={{
          marginTop: 10,
          width: "100%",
          boxSizing: "border-box",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 8,
          color: "#f2f2f5",
          fontSize: 14,
          letterSpacing: "0.2em",
          padding: "8px 10px",
        }}
      />
      <button
        onClick={submit}
        disabled={!code.trim()}
        style={{
          marginTop: 10,
          width: "100%",
          background: code.trim() ? "rgba(184, 138, 240, 0.16)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${GLASS_ACCENT}55`,
          color: code.trim() ? "#e6d6ff" : "rgba(255,255,255,0.35)",
          borderRadius: 9,
          padding: "8px 10px",
          fontSize: 12,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          cursor: code.trim() ? "pointer" : "default",
        }}
      >
        Unlock
      </button>
    </div>
  );
}
