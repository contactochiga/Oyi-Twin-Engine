import type { CSSProperties } from "react";

// A shared inline "Spatial Glass" visual language (Phase 12) — inline
// styles rather than an external stylesheet, deliberately: this package
// is consumed by three different hosts (the standalone dev harness's
// plain CSS, Facility OS's Tailwind, Consumer OS's Tailwind) with no
// shared build step, so a component that "just works" wherever it's
// dropped in beats one that requires a host to remember to import a CSS
// file. Hosts that want their own visual identity can still override via
// the `style` prop each component accepts.
export const GLASS_SURFACE: CSSProperties = {
  background: "rgba(14, 16, 22, 0.72)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 14,
  color: "#f2f2f5",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
};

export const GLASS_ACCENT = "#b88af0";
