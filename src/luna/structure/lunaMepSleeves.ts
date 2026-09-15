// Luna Residences — representative slab penetration markers (Phase 13 §4).
//
// Every one of RISERS (lunaMepBackbone.ts) is a continuous B1-to-roof run
// at a fixed x/z (LUNA-RISER-ELECTRICAL-01/WATER-01/DRAINAGE-01/FIRE-01/
// NETWORK-01, all clustered near x=-8) — which means, by definition, each
// one physically crosses every level's own structural slab (Phase 13's new
// LUNA_STRUCTURAL_ELEMENTS). That is exactly the "duct/pipe through a slab
// without a visible penetration" case §4 asks to fix. Rather than a real
// boolean cut through the slab geometry (out of scope — see Sleeve's own
// docstring), each crossing gets one representative Sleeve marker,
// generated here rather than hand-authored per level so it can't drift out
// of sync with RISERS/LUNA_LEVELS as either changes.

import { RISERS } from "../operational/lunaMepBackbone";
import { LUNA_LEVELS } from "../lunaProgramme";

export interface MepSleeveRecord {
  ref: string;
  label: string;
  ownerLevelRef: string;
  position: { x: number; y: number; z: number };
}

// Levels below B1 or above the roof don't exist, and the riser cluster
// doesn't serve the rooftop plant zone's own slab meaningfully differently
// from any other level — every level in the stack gets one marker per
// riser, at that level's own floor line (Phase 13's local-frame convention:
// a level's group origin is its vertical MID-height, so the floor line is
// -height/2 — see slabFor's own position.y in lunaStructuralElements.ts).
export const LUNA_MEP_SLEEVES: MepSleeveRecord[] = LUNA_LEVELS.flatMap((level) =>
  RISERS.map((riser) => {
    const system = riser.system.replace(/[^a-z0-9]/gi, "-").toUpperCase();
    return {
      ref: `LUNA-SLEEVE-${level.ref.replace("LUNA-", "")}-${system}-01`,
      label: `${level.label} — ${riser.label.replace(" (Representative)", "")} Slab Penetration`,
      ownerLevelRef: level.ref,
      position: { x: riser.position.x, y: -level.height / 2, z: riser.position.z },
    };
  })
);
