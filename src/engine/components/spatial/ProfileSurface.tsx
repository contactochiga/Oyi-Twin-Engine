import { useEffect, useRef, useState } from "react";
import { GLASS_SURFACE } from "./glassStyle";

// Oyi Twin Engine — compact operator identity chip (Phase 16A §1),
// carrying its own secondary-actions menu (polish pass §3) so Presentation
// Mode never needs a separate floating "..." surface next to it. Building-
// agnostic presentational surface: the host supplies whatever identity it
// already has (this standalone reference app has no real auth session, so
// Luna's App.tsx supplies a fixed operator label — a real Facility OS host
// already has a logged-in user and would pass that instead, this
// component has no opinion on where the name comes from) and the two
// actions it wants exposed behind the menu.

export interface ProfileSurfaceProps {
  name: string;
  role: string;
  org?: string;
  onDevMode: () => void;
  onResetView: () => void;
  /** Building Ingestion V1 — reuses this existing overflow menu rather
   * than introducing a new floating chip (Part B12: "should feel like
   * part of Oyi"). Optional so other hosts of this building-agnostic
   * component are unaffected when omitted. */
  onNewProject?: () => void;
  /** Interface convergence pass §1 — plain inline content, no own glass
   * box, for nesting inside a shared parent glass surface (TopCommandBar).
   * The ••• menu popover itself keeps its own glass regardless. */
  bare?: boolean;
}

export function ProfileSurface({ name, role, org, onDevMode, onResetView, onNewProject, bare = false }: ProfileSurfaceProps) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [open]);

  return (
    <div
      ref={rootRef}
      style={bare ? { position: "relative", display: "flex", alignItems: "center", gap: 9, pointerEvents: "auto" } : { ...GLASS_SURFACE, position: "relative", display: "flex", alignItems: "center", gap: 9, padding: "8px 8px 8px 8px", pointerEvents: "auto" }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "radial-gradient(circle at 35% 30%, rgba(184,138,240,0.65), rgba(60,45,90,0.9))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11.5,
          fontWeight: 700,
          color: "#fff",
          flexShrink: 0,
        }}
      >
        {initials || "?"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{role}</span>
        <span style={{ fontSize: 10.5, opacity: 0.65 }}>{org ?? name}</span>
      </div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="More options"
        aria-expanded={open}
        style={{ background: "none", border: "none", color: "inherit", opacity: 0.5, cursor: "pointer", fontSize: 13, letterSpacing: 1.5, padding: "4px 6px", marginLeft: 2 }}
      >
        •••
      </button>

      {open && (
        <div
          style={{
            ...GLASS_SURFACE,
            position: "absolute",
            bottom: "calc(100% + 6px)",
            right: 0,
            width: 180,
            padding: 6,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            zIndex: 30,
          }}
        >
          <button
            onClick={() => {
              setOpen(false);
              onDevMode();
            }}
            style={{ textAlign: "left", background: "none", border: "none", color: "inherit", padding: "8px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}
          >
            Development Mode
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onResetView();
            }}
            style={{ textAlign: "left", background: "none", border: "none", color: "inherit", padding: "8px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}
          >
            Reset View
          </button>
          {onNewProject && (
            <button
              onClick={() => {
                setOpen(false);
                onNewProject();
              }}
              style={{ textAlign: "left", background: "none", border: "none", color: "inherit", padding: "8px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}
            >
              Create New Project
            </button>
          )}
        </div>
      )}
    </div>
  );
}
