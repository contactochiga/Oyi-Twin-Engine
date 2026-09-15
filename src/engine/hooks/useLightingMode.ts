import { createContext, useContext } from "react";

/** Presentation lighting mode — a building-agnostic toggle for the
 * exterior hero experience (Phase 11; extended to three states in Phase
 * 14 §8). Not tied to any real-world clock or geolocation; a deliberate
 * art-directed choice, the same way "Systems Mode" is a deliberate toggle
 * rather than live data. "goldenHour" sits between the two: a warmer,
 * lower sun than day with a soft first hint of interior glow, short of
 * evening's fully night-lit facade. */
export type LightingMode = "day" | "goldenHour" | "evening";

export const LightingModeContext = createContext<LightingMode>("day");

export function useLightingMode(): LightingMode {
  return useContext(LightingModeContext);
}
