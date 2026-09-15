import { useEffect, useRef, useState } from "react";
import { GLASS_SURFACE, GLASS_ACCENT } from "./glassStyle";
import type { LightingMode } from "../../hooks/useLightingMode";

// Oyi Twin Engine — compact glass weather/time surface (Phase 16A §1,
// refined in the Presentation Mode polish pass §2). Building-agnostic:
// takes a location label + WeatherState as props from the host, never
// fetches anything itself. `WeatherState` is deliberately shaped so a
// later phase can swap the stub provider for a real Ochiga backend call
// keyed off the building's own lat/lon (see Luna's own
// `lunaWeatherStub.ts`) without touching this component at all — only the
// value flowing into the `weather` prop would change.
//
// Time is the one piece that's genuinely live (the visitor's own system
// clock) — weather/temperature stay whatever the host passes in, since no
// new weather backend is being built yet. Lighting is manual (Day/Golden
// Hour/Evening) and now lives behind a click-to-open "Lighting Preview"
// dropdown rather than a permanently visible row — the collapsed surface
// itself shows only weather/location/time/date, matching the polish
// pass's "extremely limited permanent UI" rule. The dropdown is the one
// place a later phase would swap this manual control for something driven
// by site coordinates + backend weather + local time, without touching
// the collapsed surface at all.

export type WeatherCondition = "sunny" | "partly-cloudy" | "cloudy" | "rain" | "storm";

export interface WeatherState {
  condition: WeatherCondition;
  temperatureC: number;
}

export interface WeatherTimeSurfaceProps {
  locationLabel: string;
  weather: WeatherState;
  lightingMode: LightingMode;
  onSetLightingMode: (mode: LightingMode) => void;
  /** Interface convergence pass §1 — when true, renders as plain inline
   * content (no own glass box/padding/rounded corners) so it can sit
   * inside a shared parent glass surface (TopCommandBar) without reading
   * as a nested card. The click-to-open Lighting Preview dropdown behaves
   * identically either way. */
  bare?: boolean;
}

function WeatherGlyph({ condition }: { condition: WeatherCondition }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (condition) {
    case "sunny":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8" />
        </svg>
      );
    case "cloudy":
      return (
        <svg {...common}>
          <path d="M7 18a4.5 4.5 0 0 1-.5-8.97A5.5 5.5 0 0 1 17.2 9.5 4 4 0 0 1 17 18H7Z" />
        </svg>
      );
    case "rain":
      return (
        <svg {...common}>
          <path d="M7 15a4.5 4.5 0 0 1-.5-8.97A5.5 5.5 0 0 1 17.2 6.5 4 4 0 0 1 17 15H7Z" />
          <path d="M8 18.5 7 21M12 18.5l-1 2.5M16 18.5l-1 2.5" />
        </svg>
      );
    case "storm":
      return (
        <svg {...common}>
          <path d="M7 13a4.5 4.5 0 0 1-.5-8.97A5.5 5.5 0 0 1 17.2 4.5 4 4 0 0 1 17 13H7Z" />
          <path d="m13 15-2.5 4H13l-2 3.5" />
        </svg>
      );
    case "partly-cloudy":
    default:
      return (
        <svg {...common}>
          <circle cx="8" cy="8.5" r="3.2" />
          <path d="M8 3.3v1.4M4 8.5H2.6M13.7 12a4 4 0 0 0-.5-7.98" />
          <path d="M11 19a4 4 0 0 1-.3-7.98A5 5 0 0 1 20.5 12.5 3.5 3.5 0 0 1 20 19h-9Z" />
        </svg>
      );
  }
}

const LIGHTING_LABEL: Record<LightingMode, string> = { day: "Day", goldenHour: "Golden Hour", evening: "Evening" };
const LIGHTING_ORDER: LightingMode[] = ["day", "goldenHour", "evening"];

export function WeatherTimeSurface({ locationLabel, weather, lightingMode, onSetLightingMode, bare = false }: WeatherTimeSurfaceProps) {
  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [open]);

  const dateLabel = now.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
  const timeLabel = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <div ref={rootRef} style={{ position: "relative", pointerEvents: "auto" }}>
      {/* Spatial navigation restoration pass §1 — this button must NOT set
          its own `color`: GLASS_SURFACE already carries the correct light
          foreground token (#f2f2f5) for the glass surface, and an explicit
          `color: "inherit"` here previously pulled the browser's default
          black button text color from the plain (colorless) wrapper div
          above instead, making the temp/location/time/date unreadable. The
          fix is to let GLASS_SURFACE's own color cascade to the child
          spans untouched — verified identical, correct contrast in Day,
          Golden Hour and Evening, since this glass chip's background/text
          never depend on the 3D lighting mode. */}
      <button className="weather-time-button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Weather and lighting"
        aria-expanded={open}
        style={
          bare
            ? { background: "none", border: "none", color: "inherit", display: "flex", alignItems: "center", gap: 10, padding: 0, cursor: "pointer", textAlign: "left", font: "inherit" }
            : { ...GLASS_SURFACE, display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", textAlign: "left" }
        }
      >
        <span style={{ color: GLASS_ACCENT }}>
          <WeatherGlyph condition={weather.condition} />
        </span>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{Math.round(weather.temperatureC)}°C</span>
          <span style={{ fontSize: 10.5, opacity: 0.65 }}>{locationLabel}</span>
        </div>
        <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.12)", margin: "0 2px" }} />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{timeLabel}</span>
          <span style={{ fontSize: 10.5, opacity: 0.65 }}>{dateLabel}</span>
        </div>
      </button>

      {open && (
        <div style={{ ...GLASS_SURFACE, position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, padding: 10, zIndex: 30 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.5, marginBottom: 6 }}>Lighting Preview</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {LIGHTING_ORDER.map((mode) => (
              <button
                key={mode}
                onClick={() => onSetLightingMode(mode)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: lightingMode === mode ? "rgba(184, 138, 240, 0.16)" : "transparent",
                  border: "none",
                  borderRadius: 7,
                  padding: "7px 9px",
                  fontSize: 12,
                  fontWeight: lightingMode === mode ? 600 : 400,
                  color: lightingMode === mode ? "#e6d6ff" : "inherit",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {LIGHTING_LABEL[mode]}
                {lightingMode === mode && <span style={{ color: GLASS_ACCENT }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
