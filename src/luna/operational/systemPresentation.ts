import type { OperationalSystem } from "../../engine/twinData";

export const SYSTEM_ORDER: OperationalSystem[] = [
  "structure",
  "electrical",
  "water",
  "drainage",
  "fire",
  "hvac",
  "vertical-transport",
  "security",
  "access",
  "network-edge",
  "apartment-devices",
];

export const SYSTEM_LABEL: Record<OperationalSystem, string> = {
  structure: "Structure",
  electrical: "Electrical",
  water: "Water",
  drainage: "Drainage",
  fire: "Fire",
  hvac: "HVAC",
  "vertical-transport": "Elevators",
  security: "Security",
  access: "Access",
  "network-edge": "Network / Edge",
  "apartment-devices": "Apartment Devices",
};

// Distinct, legible hex per system — used for marker color and the systems
// panel's swatches. Kept separate from Luna's architectural material
// palette (lunaMaterials.ts) since these need to read clearly as UI/system
// color-coding rather than blend into the building's own material language.
export const SYSTEM_COLOR: Record<OperationalSystem, string> = {
  structure: "#9aa5b1",
  electrical: "#f2c744",
  water: "#4fb0e8",
  drainage: "#a67c52",
  fire: "#e8543f",
  hvac: "#57cf9a",
  "vertical-transport": "#b98af0",
  security: "#5ce1e6",
  access: "#e6a95c",
  "network-edge": "#8a95ff",
  "apartment-devices": "#ff8fb0",
};
