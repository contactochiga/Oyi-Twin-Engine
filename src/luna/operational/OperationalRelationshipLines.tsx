import { useMemo } from "react";
import { SystemRelationshipLine, useSceneMode } from "../../engine";
import type { OperationalAssetRecord } from "../../engine/twinData";
import { LUNA_OPERATIONAL_ASSETS } from "./lunaOperationalAssets";
import { RISER_REFS } from "./lunaMepBackbone";
import { SYSTEM_COLOR } from "./systemPresentation";
import { LUNA_LEVELS } from "../lunaProgramme";

// Matches LunaLevel.tsx's own unit-placement math exactly (gridX/gridZ *
// footprint/4.4) — Apartment A is the only unit with operational devices
// today, so this is the one offset actually needed; worldPositionOf below
// is written generally in case a future unit gains its own devices.
const UNIT_OFFSET: Record<string, { x: number; z: number }> = {
  "LUNA-L06-APT-A": { x: -1 * (36 / 4.4), z: -1 * (28 / 4.4) },
};

const RISER_REF_SET = new Set<string>(RISER_REFS);

/** Matches LevelMassing's own exploded-view vertical offset exactly
 * (stackIndex * explodeGap) so a relationship line's endpoint tracks the
 * same movement its actual marker undergoes when a floor "explodes" away
 * — without this, a line would stay anchored to an asset's pre-explode
 * position while the marker itself (nested inside that level's group,
 * which LevelMassing does move) visually floats away from it. Risers are
 * the one deliberate exception: like CoreShaft, a riser is static,
 * continuous, B1-to-roof infrastructure that never explodes with any
 * single floor — a riser->branch line correctly shows the branch pulling
 * away from a riser that stays put, exactly the way a real floor
 * separating from a fixed service shaft would look. */
function explodedOffsetFor(a: OperationalAssetRecord, exploded: boolean, explodeGap: number): number {
  if (!exploded || RISER_REF_SET.has(a.ref)) return 0;
  const stackIndex = LUNA_LEVELS.findIndex((l) => l.ref === a.ownerLevelRef);
  return stackIndex < 0 ? 0 : stackIndex * explodeGap;
}

function worldPositionOf(a: OperationalAssetRecord, exploded: boolean, explodeGap: number): [number, number, number] {
  const level = LUNA_LEVELS.find((l) => l.ref === a.ownerLevelRef);
  const baseElevation = level?.baseElevation ?? 0;
  const offset = a.unitRef ? UNIT_OFFSET[a.unitRef] ?? { x: 0, z: 0 } : { x: 0, z: 0 };
  return [offset.x + a.position.x, baseElevation + a.position.y + explodedOffsetFor(a, exploded, explodeGap), offset.z + a.position.z];
}

/** Renders every known parent/child operational relationship as a clean
 * schematic line — Grid -> MDB -> {ATS, Inverter, Meter}, Tank -> {Treatment,
 * Booster Pump 01, Booster Pump 02}, Fire Panel -> {Fire Pump, Ground
 * Detector}, Network Gateway -> Wi-Fi AP — reusing the exact parent_device_id
 * pairs already established in the backend (phase3c_infrastructure.sql),
 * not an invented topology. Mounted once at the building root since a
 * relationship can cross levels (the fire panel is in B1, its detector is
 * on Ground); each line independently fades with Systems Mode via the same
 * useSystemAssetOpacity hook the markers use, so it only ever appears
 * alongside the assets it connects. */
export function OperationalRelationshipLines() {
  const { exploded, explodeGap } = useSceneMode();
  const pairs = useMemo(() => {
    const byRef = new Map(LUNA_OPERATIONAL_ASSETS.map((a) => [a.ref, a]));
    return LUNA_OPERATIONAL_ASSETS.filter((a) => a.parentRef)
      .map((child) => {
        const parent = byRef.get(child.parentRef!);
        return parent ? { parent, child } : null;
      })
      .filter((x): x is { parent: OperationalAssetRecord; child: OperationalAssetRecord } => x !== null);
  }, []);

  return (
    <>
      {pairs.map(({ parent, child }) => (
        <SystemRelationshipLine
          key={`${parent.ref}->${child.ref}`}
          from={worldPositionOf(parent, exploded, explodeGap)}
          to={worldPositionOf(child, exploded, explodeGap)}
          system={child.system}
          color={SYSTEM_COLOR[child.system]}
        />
      ))}
    </>
  );
}
