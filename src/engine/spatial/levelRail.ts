// Oyi Twin Engine — Building Ingestion V2 Part 12: automatic LevelRail
// generation. LevelRail.tsx (spatial/LevelRail.tsx) was already generic —
// it renders whatever LevelRailItem[] it's handed. What V1/Luna never had
// was a generic PRODUCER of that array; every project had to hand-write
// its own short-label lookup table (see lunaLevelRail.ts). This file is
// that producer, working from NormalizedLevel data alone.

import type { LevelRailItem } from "../components/spatial/LevelRail";
import type { NormalizedLevel } from "./types";

/** Small, disclosed pattern set — same spirit as normalize.ts's
 * proposeRefSlug: literal pattern-matching against common real-world
 * level naming conventions, never a claim of semantic understanding.
 * Falls back to the level's own ref (truncated) when nothing matches, so
 * every level always gets SOME short label rather than an empty rail
 * button. */
export function deriveShortLabel(level: NormalizedLevel): string {
  if (level.shortLabel) return level.shortLabel;
  const name = level.name.trim();

  const basement = name.match(/^b(?:asement)?\s*(\d{1,2})$/i);
  if (basement) return `B${basement[1]}`;

  if (/^ground(\s*floor)?$/i.test(name)) return "G";
  if (/^mezzanine$/i.test(name)) return "MEZ";
  if (/^penthouse$/i.test(name)) return "PH";
  if (/^(roof|rooftop)$/i.test(name)) return "ROOF";

  const level0 = name.match(/^(?:level|floor|l|fl)\s*0*(\d{1,3})$/i);
  if (level0) return `L${level0[1].padStart(2, "0")}`;

  // Last resort: derive from the canonical ref's own trailing segment
  // (e.g. "PROJECT-L06" -> "L06") rather than an empty/unreadable label.
  const refTail = level.canonicalRef.split("-").pop();
  if (refTail && refTail.length <= 6) return refTail;
  return name.slice(0, 6).toUpperCase();
}

/** Building-order (ascending elevation) -> rail order (highest first, at
 * the top of the strip) — the same convention Luna's own
 * lunaLevelRail.ts already established ([...LUNA_LEVELS].reverse()),
 * generalized so a new project's levels don't have to be hand-reversed
 * either. Levels with equal `order` are stable-sorted by their existing
 * relative position (no arbitrary tie-break). */
export function deriveLevelRailItems(levels: NormalizedLevel[]): LevelRailItem[] {
  return [...levels]
    .sort((a, b) => b.order - a.order)
    .map((level) => ({ ref: level.canonicalRef, shortLabel: deriveShortLabel(level) }));
}
