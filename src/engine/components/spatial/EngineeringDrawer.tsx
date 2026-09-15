import { useEffect, useState } from "react";
import { GLASS_SURFACE, GLASS_ACCENT } from "./glassStyle";
import { SystemIcon, type IconKey } from "./SystemIcon";
import type { OperationalSystem } from "../../twinData";

// A single scrolling row of existing engineering representations. Selection
// changes the main Twin and keeps this tray open for comparison. The host
// dismisses it on click-away; the explicit close control is provided here.
// Spatial view flags belong to the separate View workflow.

export interface EngineeringLayerOption {
  key: OperationalSystem | "all" | null;
  icon: IconKey;
  label: string;
  descriptor: string;
  color: string;
  preview?: { floors: { width: number; y: number; height: number }[]; points: { x: number; y: number }[]; label: string };
}

export interface EngineeringDrawerProps {
  open: boolean;
  onClose: () => void;
  options: EngineeringLayerOption[];
  activeSystem: OperationalSystem | "all" | null;
  onSelectSystem: (system: OperationalSystem | "all" | null) => void;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function LayerCard({ icon, label, descriptor, color, preview, active, onClick }: Omit<EngineeringLayerOption, "key"> & { active: boolean; onClick: () => void }) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 8,
        width: 128,
        flexShrink: 0,
        padding: "12px 12px 10px",
        borderRadius: 12,
        background: active ? "rgba(184, 138, 240, 0.16)" : "rgba(255,255,255,0.03)",
        border: active ? `1px solid ${GLASS_ACCENT}88` : "1px solid rgba(255,255,255,0.08)",
        cursor: "pointer",
        textAlign: "left",
        color: "inherit",
      }}
    >
      <div
        style={{
          width: "100%",
          height: 46,
          borderRadius: 8,
          background: `radial-gradient(circle at 30% 30%, ${color}33, transparent 70%)`,
          border: `1px solid ${color}40`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {preview ? <svg viewBox="-32 -4 64 72" width="100%" height="44" role="img" aria-label={preview.label}>
          {preview.floors.map((floor, index) => <rect key={index} x={-floor.width / 2} y={60 - floor.y - floor.height} width={floor.width} height={floor.height} fill={icon === "architecture" ? color : "none"} fillOpacity={0.25} stroke={color} strokeOpacity={0.45} strokeWidth={0.5} />)}
          {preview.points.map((point, index) => <circle key={index} cx={point.x} cy={60 - point.y} r={0.8} fill={color} />)}
        </svg> : <SystemIcon system={icon} color={active ? color : "rgba(242,242,245,0.75)"} />}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: active ? "#e6d6ff" : "inherit" }}>{label}</div>
        <div style={{ fontSize: 10, opacity: 0.55, marginTop: 1 }}>{descriptor}</div>
      </div>
    </button>
  );
}

export function EngineeringDrawer({ open, onClose, options, activeSystem, onSelectSystem }: EngineeringDrawerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const transition = reducedMotion ? "opacity 120ms linear" : "transform 340ms cubic-bezier(0.22, 1, 0.36, 1), opacity 280ms ease";

  return (
    <div
      data-engineering-tray
      onPointerDown={(event) => event.stopPropagation()}
      role="dialog"
      aria-label="Engineering Layers"
      aria-hidden={!open}
      inert={!open}
      style={{
        position: "absolute",
        left: 14,
        right: 14,
        bottom: 14,
        transform: open ? "translateY(0)" : "translateY(24px)",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition,
        zIndex: 35,
      }}
    >
      <div style={{ ...GLASS_SURFACE, padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Engineering Layers</div>
            <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 1 }}>Select a system to visualize the building's infrastructure</div>
          </div>
          <button onClick={onClose} aria-label="Close Engineering Layers" style={{ background: "transparent", border: "none", color: "inherit", opacity: 0.6, cursor: "pointer", fontSize: 16, padding: 2 }}>
            ✕
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "nowrap", overflowX: "auto", gap: 8, marginTop: 14 }}>
          {options.map((opt) => (
            <LayerCard
              key={String(opt.key)}
              preview={opt.preview}
              icon={opt.icon}
              label={opt.label}
              descriptor={opt.descriptor}
              color={opt.color}
              active={activeSystem === opt.key}
              onClick={() => onSelectSystem(opt.key)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
