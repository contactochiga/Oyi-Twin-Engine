import { useEffect, useRef, useState } from "react";
import { GLASS_SURFACE } from "./glassStyle";
import { WeatherTimeSurface, type WeatherState } from "./WeatherTimeSurface";
import oyiLogo from "../../assets/oyi-logo.png";

import type { LightingMode } from "../../hooks/useLightingMode";
import type { OyiResponse } from "../../twinIntelligence";

// Oyi Twin Engine — the unified top command glass (interface convergence
// pass §1). ONE horizontal glass surface rather than several floating
// chips: an identity mark, the hamburger, the Oyi command field, and the
// existing weather/time/lighting + Facility Manager surfaces reused in
// "bare" mode (no nested glass-on-glass) so the whole bar reads as one
// premium container. Building-agnostic — the host supplies the Oyi
// controller call and weather/profile data.
//
// Oyi Visual Identity Integration — the identity slot this component
// already reserved (previously left intentionally empty, "no logo
// invented here") is now filled with the real Oyi brand asset
// (engine/assets/oyi-logo.png — copied byte-for-byte from Facility's own
// public/oyi-logo-transparent.png, never redrawn), positioned first so the
// left edge reads [OYI][HAMBURGER][ASK OYI...]. Clicking it opens the
// SAME Oyi conversation surface the bottom-right orb opens (via
// onOpenOyi) — one shared conversation, never a second AI entry point.

export interface TopCommandBarProps {
  onAsk: (text: string) => Promise<OyiResponse>;
  oyiPlaceholder?: string;
  locationLabel: string;
  weather: WeatherState;
  lightingMode: LightingMode;
  onSetLightingMode: (mode: LightingMode) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  /** Opens the shared Oyi conversation surface (the same one the
   * closed-state orb opens) — optional so this component still renders
   * sensibly for a host that hasn't wired a conversation surface yet. */
  onOpenOyi?: () => void;
}

function Divider() {
  return <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />;
}

export function TopCommandBar({
  onAsk,
  oyiPlaceholder = "Ask Oyi about the building...",
  locationLabel,
  weather,
  lightingMode,
  onSetLightingMode,
  sidebarOpen,
  onToggleSidebar,
  onOpenOyi,
}: TopCommandBarProps) {
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [response, setResponse] = useState<OyiResponse | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (clearTimer.current) clearTimeout(clearTimer.current); }, []);

  const submit = async () => {
    const question = input.trim();
    if (!question || pending) return;
    setPending(true);
    setInput("");
    // Same controller path as the Oyi orb — parseIntent ->
    // TwinIntelligenceController -> sceneActions. No parallel intelligence
    // pathway.
    let res: OyiResponse;
    try { res = await onAsk(question); } catch { res = { ok: false, text: "Oyi could not complete that request. Please try again.", context: {} }; setInput(question); }
    setResponse(res);
    setPending(false);
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setResponse(null), 7000);
  };

  return (
    <div style={{ position: "absolute", top: 14, left: 14, right: 14, zIndex: 30, pointerEvents: "none" }}>
      <div className="top-command-glass" style={{ ...GLASS_SURFACE, display: "flex", alignItems: "center", gap: 16, padding: "8px 14px", pointerEvents: "auto" }}>
        {/* Logo + hamburger read as one compact control group — a small,
            intentional gap between them, distinct from the larger gap
            (the row's own "gap: 16") before the Ask Oyi field. */}
        <div className="identity-group" style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button
            type="button"
            className="identity-slot"
            aria-label="Open Oyi"
            onClick={onOpenOyi}
            style={{ display: "flex", alignItems: "center", padding: 0, background: "none", border: "none", cursor: onOpenOyi ? "pointer" : "default", flexShrink: 0 }}
          >
            <img src={typeof oyiLogo === "string" ? oyiLogo : oyiLogo.src} alt="Oyi" width={22} height={22} style={{ display: "block", borderRadius: 6 }} />
          </button>
          <button className="sidebar-toggle" aria-label="Toggle sidebar" aria-expanded={sidebarOpen} aria-controls="luna-sidebar" onClick={onToggleSidebar}>☰</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 auto", minWidth: 140 }}>
          <span style={{ opacity: 0.5, display: "flex" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            style={{ flex: 1 }}
          >
            <input
              value={input}
              disabled={pending}
              onChange={(e) => setInput(e.target.value)}
              placeholder={oyiPlaceholder}
              aria-label="Ask Oyi about the building"
              style={{ width: "100%", background: "none", border: "none", outline: "none", color: "inherit", fontSize: 13, padding: "6px 0" }}
            />
          </form>
        </div>

        <Divider />
        <WeatherTimeSurface bare locationLabel={locationLabel} weather={weather} lightingMode={lightingMode} onSetLightingMode={onSetLightingMode} />

      </div>

      {(pending || response) && (
        <div
          style={{
            ...GLASS_SURFACE,
            marginTop: 8,
            maxWidth: 480,
            padding: "9px 14px",
            fontSize: 12.5,
            lineHeight: 1.4,
            pointerEvents: "auto",
            color: pending ? "#f2f2f5" : response?.deniedByScope ? "#ffdca0" : response?.ok ? "#f2f2f5" : "#f5b8b0",
          }}
        >
          {pending ? <span style={{ opacity: 0.6, fontStyle: "italic" }}>Thinking…</span> : response?.text}
        </div>
      )}
    </div>
  );
}
