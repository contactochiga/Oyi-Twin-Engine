import type { LevelRailItem } from "../engine";
import { LUNA_LEVELS } from "./lunaProgramme";

const SHORT_LABEL: Record<string, string> = {
  "LUNA-ROOFTOP": "ROOF",
  "LUNA-PENTHOUSE": "PH",
  "LUNA-L12": "L12",
  "LUNA-L11": "L11",
  "LUNA-L10": "L10",
  "LUNA-L09": "L09",
  "LUNA-L08": "L08",
  "LUNA-L07": "L07",
  "LUNA-L06": "L06",
  "LUNA-L05": "L05",
  "LUNA-L04": "L04",
  "LUNA-L03": "L03",
  "LUNA-L02": "L02",
  "LUNA-L01-AMENITIES": "L01",
  "LUNA-GROUND": "G",
  "LUNA-B1": "B1",
};

/** Top (roof) to bottom (basement) — the rail's own natural reading order,
 * the reverse of LUNA_LEVELS' bottom-up construction order. */
export const LUNA_LEVEL_RAIL_ITEMS: LevelRailItem[] = [...LUNA_LEVELS]
  .reverse()
  .map((level) => ({ ref: level.ref, shortLabel: SHORT_LABEL[level.ref] ?? level.ref }));
