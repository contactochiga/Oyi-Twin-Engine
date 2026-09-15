import { RiserShaft, useRuntimeAssetState } from "../../engine";
import { RISERS } from "./lunaMepBackbone";
import { SYSTEM_COLOR } from "./systemPresentation";
import { LUNA_BUILDING_SPAN } from "../lunaProgramme";

const ELECTRICAL_RISER_REF = "LUNA-RISER-ELECTRICAL-01";
const FIRE_RISER_REF = "LUNA-RISER-FIRE-01";

/** Mounts Phase 10's five representative vertical MEP risers as continuous
 * B1-to-roof geometry alongside the existing architectural service shaft
 * (LUNA-RISER-01 in LUNA_CORES) — each one its own selectable, Engineering
 * Layer Mode-aware asset so Oyi and the UI can address "the water riser"
 * independently of "the electrical riser" and each fades/isolates with its
 * own system, never all five appearing at once outside "All Systems". */
export function LunaRiserShafts() {
  // Electrical System V1 — the electrical riser's own energization
  // telemetry (recomputePowerNetwork()) now drives its emissive pulse, the
  // "illuminated route" reading Part 10 asks for. The other four risers
  // keep their existing constant-glow look; extending them the same way is
  // out of scope for this phase (documented as future Water/Fire/Drainage/
  // Network visual-convergence work, not invented here).
  const electricalRiser = useRuntimeAssetState(ELECTRICAL_RISER_REF);
  const electricalEnergized = electricalRiser?.state.energized !== false;
  // Fire System V1 — same principle, reusing the identical "energized"
  // pulse prop for the fire riser's own pressurized telemetry (the prop
  // is a generic restrained-emphasis driver, not electrical-specific).
  const fireRiser = useRuntimeAssetState(FIRE_RISER_REF);
  const firePressurized = Boolean(fireRiser?.state.pressurized);
  return (
    <>
      {RISERS.map((riser) => (
        <RiserShaft
          key={riser.ref}
          ref_={riser.ref}
          label={riser.label}
          system={riser.system}
          baseElevation={LUNA_BUILDING_SPAN.base}
          topElevation={LUNA_BUILDING_SPAN.top}
          x={riser.position.x}
          z={riser.position.z}
          color={SYSTEM_COLOR[riser.system]}
          energized={riser.ref === ELECTRICAL_RISER_REF ? electricalEnergized : riser.ref === FIRE_RISER_REF ? firePressurized : undefined}
          shape={riser.ref === ELECTRICAL_RISER_REF ? "duct" : "round"}
        />
      ))}
    </>
  );
}
