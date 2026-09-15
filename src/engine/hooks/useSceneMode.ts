import { createContext, useContext } from "react";
import type { CanonicalRef } from "../types";
import type { OperationalSystem } from "../twinData";

export interface SceneModeState {
  /** ref of the level currently isolated, or null when the whole building
   * is shown. Generic: works for any level, not just Luna's floors. */
  isolatedLevelRef: CanonicalRef | null;
  isolateLevel: (ref: CanonicalRef | null) => void;
  exploded: boolean;
  toggleExploded: () => void;
  /** vertical gap (metres) inserted between levels when exploded=true */
  explodeGap: number;
  /** Phase 4 — Systems Mode. Null when off (default architectural/interior
   * navigation is entirely unaffected, matching Phases 1-3 behaviour
   * exactly); "all" shows every operational asset; a specific system shows
   * only that system's assets and de-emphasizes the rest. */
  activeSystem: OperationalSystem | "all" | null;
  setActiveSystem: (system: OperationalSystem | "all" | null) => void;
  /** Phase 13 §11 — a lightweight, building-agnostic sectional reveal: not
   * real clipping planes (too fragile for this scope — see the brief's own
   * "if full clipping is too fragile, keep it simpler" guidance), just
   * "fade away the facade on one side of the building" so a camera outside
   * that side can see straight into structure/MEP/rooms. `sectionSide`
   * names which side is cut; `sectionMode` gates whether the cut applies
   * at all, so choosing a side doesn't also have to mean "on". */
  sectionMode: boolean;
  toggleSectionMode: () => void;
  sectionSide: "north" | "south" | "east" | "west";
  setSectionSide: (side: "north" | "south" | "east" | "west") => void;
  /** Does `levelRef` contain any asset belonging to `system`? Drives
   * architecture fade while a specific system is active (e.g. "Water"
   * keeps B1 relatively present and fades everything else near-invisible).
   * The engine has no knowledge of any building's asset registry, so this
   * is a plain function supplied by whoever composes the scene — Luna's
   * App.tsx builds it from lunaTwinDataProvider. */
  levelHasSystemAssets: (levelRef: CanonicalRef, system: OperationalSystem) => boolean;
}

export const SceneModeContext = createContext<SceneModeState | null>(null);

export function useSceneMode(): SceneModeState {
  const ctx = useContext(SceneModeContext);
  if (!ctx) throw new Error("useSceneMode must be used within a SceneModeContext.Provider");
  return ctx;
}

/** Shared by LevelMassing and useLevelFadeOpacity so both pieces of a
 * level's architecture (its own massing box and everything using the fade
 * hook — facade detail, unit placeholders) agree on the same Systems Mode
 * override. Returns null when Systems Mode is off, meaning "fall back to
 * your own ordinary isolate-elsewhere logic, unchanged from Phases 1-3" —
 * this function only ever adds a new override, never removes the old
 * behaviour it sits in front of. */
export function systemFadeOverride(
  scene: Pick<SceneModeState, "activeSystem" | "levelHasSystemAssets">,
  levelRef: CanonicalRef,
  restingOpacity: number
): number | null {
  if (scene.activeSystem === "all") return restingOpacity;
  if (scene.activeSystem) {
    // "Emphasized" means fully solid, not semi-transparent — a level held
    // at a mid-opacity reads fine from a wide shot, but a camera flying
    // *inside* that level's own massing box (to frame a close-up asset,
    // e.g. a B1 pump) would otherwise see outside light bleed straight
    // through its own walls, washing the shot out. Only non-matching
    // levels fade, and they fade hard (0.05) since they're purely context.
    return scene.levelHasSystemAssets(levelRef, scene.activeSystem) ? restingOpacity : 0.05;
  }
  return null;
}
