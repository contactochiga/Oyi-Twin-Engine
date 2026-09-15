import { LunaSiteSurface } from "./exterior/ExteriorPlanting";
import { DynamicLift } from "./lift/DynamicLift";
import { LIFT_DEFINITIONS, isLiftRef } from "./lift/lunaLift";
import type { GroundAssetSource } from "./architecture/groundAsset";
import { useMemo } from "react";
import { CoreShaft } from "../engine";
import { LUNA_LEVELS, LUNA_CORES, LUNA_SITE } from "./lunaProgramme";
import { lunaMaterialFactories } from "./lunaMaterials";
import { LunaLevel } from "./LunaLevel";
import { LunaEnvironment } from "./LunaEnvironment";
import { LunaSignage } from "./LunaSignage";
import { OperationalRelationshipLines } from "./operational/OperationalRelationshipLines";
import { RouteHighlightLines } from "./operational/RouteHighlightLines";
import { LunaRiserShafts } from "./operational/LunaRiserShafts";
import { ElevatorCabinLayer } from "./operational/ElevatorCabinLayer";
import { LunaStructuralCore } from "./structure/LunaStructuralLayer";
import { LunaSiteContext } from "./site/LunaSiteContext";
import type { SlidingDoorState } from "../engine/components/SlidingGlassDoor";

/** The Luna Residences reference implementation: composes the
 * building-agnostic Oyi Twin Engine primitives with Luna's own programme
 * data. Architectural detail is attached per-level (see LunaLevel /
 * LevelFacade) rather than layered on as one global decorative shell, so
 * isolate/explode always carries the right architecture with the right
 * floor. This is the file a future building's own "<Building />"
 * component would be modeled after — everything Luna-specific lives here
 * and in ./lunaProgramme + ./lunaMaterials, never inside src/engine. */
export function LunaBuilding({
  groundArchitecture,
  liftInspection = false,
  entranceDoorState,
  onSelectEntranceDoor,
  onEntranceDoorProgress,
  apartmentAEntranceOpen,
  onApartmentAAngleChange,
}: {
  groundArchitecture?: GroundAssetSource;
  liftInspection?: boolean;
  entranceDoorState?: SlidingDoorState;
  onSelectEntranceDoor?: () => void;
  onEntranceDoorProgress?: (progress: number) => void;
  apartmentAEntranceOpen?: boolean;
  onApartmentAAngleChange?: (openFraction: number) => void;
} = {}) {
  const coreMaterials = useMemo(() => LUNA_CORES.map(() => lunaMaterialFactories.core()), []);
  const coreSelectedMaterials = useMemo(() => LUNA_CORES.map(() => lunaMaterialFactories.selectedHighlight()), []);

  return (
    <group>
      <LunaSiteSurface width={LUNA_SITE.width} depth={LUNA_SITE.depth} />
      <LunaEnvironment />
      <LunaSiteContext />
      <LunaSignage />

      {LUNA_LEVELS.map((level, index) => (
        <LunaLevel
          key={level.ref}
          level={level}
          stackIndex={index}
          groundArchitecture={groundArchitecture}
          liftInspection={liftInspection}
          entranceDoorState={level.ref === "LUNA-GROUND" ? entranceDoorState : undefined}
          onSelectEntranceDoor={level.ref === "LUNA-GROUND" ? onSelectEntranceDoor : undefined}
          onEntranceDoorProgress={level.ref === "LUNA-GROUND" ? onEntranceDoorProgress : undefined}
          apartmentAEntranceOpen={level.ref === "LUNA-L06" ? apartmentAEntranceOpen : undefined}
          onApartmentAAngleChange={level.ref === "LUNA-L06" ? onApartmentAAngleChange : undefined}
        />
      ))}

      <OperationalRelationshipLines />
      <RouteHighlightLines />
      <LunaRiserShafts />
      <ElevatorCabinLayer />
      {LIFT_DEFINITIONS.map((def) => (
        <DynamicLift key={def.ref} def={def} inspection={liftInspection} />
      ))}
      <LunaStructuralCore inspection={liftInspection} />

      {LUNA_CORES.map((core, i) => isLiftRef(core.ref) ? null : (
        <group key={core.ref} visible={!liftInspection}>
        <CoreShaft
          key={core.ref}
          ref_={core.ref}
          label={core.label}
          baseElevation={core.baseElevation}
          topElevation={core.topElevation}
          x={core.x}
          z={core.z}
          width={core.width}
          depth={core.depth}
          material={coreMaterials[i]}
          selectedMaterial={coreSelectedMaterials[i]}
        />
        </group>
      ))}
    </group>
  );
}
