import { useEffect, useState } from "react";
import { GLASS_SURFACE, GLASS_ACCENT } from "./glassStyle";

// Reusable compact options tray. Luna reuses this existing surface for spatial
// views; its camera presets and authorized interior navigation remain unchanged.
// The host controls selection, title, and whether selection dismisses the tray.

export interface SceneOption {
  ref: string;
  label: string;
  descriptor?: string;
}

export interface ScenesDrawerProps {
  title?: string;
  description?: string;
  closeOnSelect?: boolean;
  open: boolean;
  onClose: () => void;
  scenes: SceneOption[];
  activeRef?: string | null;
  onSelectScene: (ref: string) => void;
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

export function ScenesDrawer({ open, onClose, scenes, activeRef, onSelectScene, title = "Scenes", description = "Navigate to an authorized space", closeOnSelect = true }: ScenesDrawerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const transition = reducedMotion ? "opacity 120ms linear" : "transform 340ms cubic-bezier(0.22, 1, 0.36, 1), opacity 280ms ease";

  return (
    <div
      data-view-tray
      onPointerDown={(event) => event.stopPropagation()}
      role="dialog"
      aria-label={title}
      aria-hidden={!open}
      inert={!open}
      style={{
        position: "absolute",
        left: "50%",
        width: "calc(100% - 28px)",
        maxWidth: 720,
        bottom: 14,
        transform: open ? "translate(-50%, 0)" : "translate(-50%, 24px)",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition,
        zIndex: 35,
      }}
    >
      <div style={{ ...GLASS_SURFACE, padding: "10px 12px", maxWidth: 720, marginInline: "auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 1 }}>{description}</div>
          </div>
          <button onClick={onClose} aria-label={`Close ${title}`} style={{ background: "transparent", border: "none", color: "inherit", opacity: 0.6, cursor: "pointer", fontSize: 16, padding: 2 }}>
            ✕
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "nowrap", overflowX: "auto", gap: 8, marginTop: 14 }}>
          {scenes.map((scene) => {
            const active = activeRef === scene.ref;
            return (
              <button
                key={scene.ref}
                aria-pressed={active}
                onClick={() => {
                  onSelectScene(scene.ref);
                  if (closeOnSelect) onClose();
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 3,
                  minWidth: 150,
                  flexShrink: 0,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: active ? "rgba(184, 138, 240, 0.16)" : "rgba(255,255,255,0.03)",
                  border: active ? `1px solid ${GLASS_ACCENT}88` : "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "inherit",
                }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 600, color: active ? "#e6d6ff" : "inherit" }}>{scene.label}</span>
                {scene.descriptor && <span style={{ fontSize: 10.5, opacity: 0.55 }}>{scene.descriptor}</span>}
              </button>
            );
          })}
          {scenes.length === 0 && <div style={{ fontSize: 12, opacity: 0.55, fontStyle: "italic" }}>No authorized scenes for the current identity.</div>}
        </div>
      </div>
    </div>
  );
}
