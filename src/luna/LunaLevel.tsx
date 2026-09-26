import { AmenityEnvelope } from "./architecture/AmenityEnvelope";
import { PodiumCoreApproach } from "./architecture/PodiumCoreApproach";
import { GroundExteriorEnvelope } from "./exterior/GroundExteriorEnvelope";
import type { GroundAssetSource } from "./architecture/groundAsset";
import { useGroundAsset } from "./architecture/useGroundAsset";
import { GroundArchitecture } from "./architecture/GroundArchitecture";
import { useMemo } from "react";
import { LevelMassing, UnitVolume, useLightingMode, useInteriorFocus } from "../engine";
import type { LevelDescriptor } from "../engine/types";
import { lunaMaterialFactories, massingMaterialForTier, tierForLevel } from "./lunaMaterials";
import { LevelFacade } from "./LevelFacade";
import { LUNA_L06, LUNA_L06_UNITS, LUNA_L10_APT_A_UNIT, l06UnitMassingBox } from "./lunaProgramme";
import { InteriorLayer } from "./InteriorLayer";
import type { InteriorSpec } from "./interiors/lunaInteriors";
import { LUNA_GROUND_LOBBY, LUNA_L01_CLUB, LUNA_L06_APT_A, LUNA_L10_APT_A, LUNA_PENTHOUSE_INTERIOR, LUNA_ROOFTOP_SKY } from "./interiors/lunaInteriors";
import { GrandLobbyArchitecture } from "./architecture/GrandLobbyArchitecture";
import { L06CommonArchitecture } from "./architecture/L06CommonArchitecture";
import { GROUND_ENTRANCE_HEIGHT, GROUND_ENTRANCE_OPENING_WIDTH, GROUND_ENTRANCE_X } from "./architecture/GroundEntrance";
import type { SlidingDoorState } from "../engine/components/SlidingGlassDoor";
import { LevelOperationalLayer, UnitOperationalLayer } from "./operational/OperationalAssetLayer";
import { LunaPlantRoom } from "./LunaPlantRoom";
import { LunaLevelStructure } from "./structure/LunaStructuralLayer";
import { residentialUnitsForLevel } from "./lunaResidentialUnits";
import { isResidentialLevel } from "./policy/lunaLevelUse";

// Levels whose interior is a direct child of the level's own massing (not
// nested inside a further unit subdivision) — the Lobby, Club, Penthouse,
// and Luna Sky are each a single addressable "home"-equivalent space.
const LEVEL_INTERIORS: Record<string, InteriorSpec | undefined> = {
  "LUNA-GROUND": LUNA_GROUND_LOBBY,
  "LUNA-L01-AMENITIES": LUNA_L01_CLUB,
  "LUNA-PENTHOUSE": LUNA_PENTHOUSE_INTERIOR,
  "LUNA-ROOFTOP": LUNA_ROOFTOP_SKY,
};

/** One residential/podium level, fully wired: its own massing material
 * instance (never shared across levels — see lunaMaterials.ts), its own
 * highlight material, its tier-appropriate architectural facade nested as
 * a child so it explodes/isolates with the massing, its addressable
 * apartment placeholders (L06, L10), and — Phase 3 — any authored interior
 * nested at the correct point in that same hierarchy. */
export function LunaLevel({ level, stackIndex, groundArchitecture, liftInspection = false, entranceDoorState, onSelectEntranceDoor, onEntranceDoorProgress, apartmentAEntranceOpen = false, onApartmentAAngleChange }: { level: LevelDescriptor; stackIndex: number; groundArchitecture?: GroundAssetSource; liftInspection?: boolean; entranceDoorState?: SlidingDoorState; onSelectEntranceDoor?: () => void; onEntranceDoorProgress?: (progress: number) => void; apartmentAEntranceOpen?: boolean; onApartmentAAngleChange?: (openFraction: number) => void }) {
  const imported = useGroundAsset(level.ref === "LUNA-GROUND" ? groundArchitecture : undefined);
  const tier = tierForLevel(level.ref);
  const material = useMemo(() => massingMaterialForTier(tier), [tier]);
  const lightingMode = useLightingMode();
  // Phase 14 — dropped from 0.5: the per-window glow (LevelFacade's
  // WindowGlowMesh) now carries the actual "occupied building" read, so
  // the massing box itself only needs a faint base warmth on the bare
  // glass between windows, not a second wash competing with it (that
  // uniform whole-box glow was the audit's own "flat orange wall" finding).
  const nightGlowIntensity = lightingMode === "day" ? 0 : lightingMode === "goldenHour" ? 0.03 : 0.06;
  // Selecting a level/unit lights it up like an occupied apartment at dusk
  // rather than a generic UI-orange highlight — that treatment is reserved
  // for non-glazing elements (core shafts) where "lit interior" makes no
  // sense. See lunaMaterials.warmInteriorGlow.
  const selectedMaterial = useMemo(() => lunaMaterialFactories.warmInteriorGlow(), []);
  const unitMaterial = useMemo(() => lunaMaterialFactories.unitGlass(), []);
  const unitSelectedMaterial = useMemo(() => lunaMaterialFactories.warmInteriorGlow(), []);
  const unitWithInteriorMaterial = useMemo(() => lunaMaterialFactories.unitGlassWithInterior(), []);
  const unitWithInteriorSelectedMaterial = useMemo(() => lunaMaterialFactories.warmInteriorGlow(), []);

  const isL06 = level.ref === LUNA_L06.ref;
  const isL10 = level.ref === LUNA_L10_APT_A_UNIT.parentRef;
  const levelInterior = LEVEL_INTERIORS[level.ref];
  // Phase 16A — every OTHER residential level (L02-L05, L07-L09, L11-L12)
  // gets its own generated units (lunaResidentialUnits.ts) rendered as
  // plain UnitVolume placeholders — no nested interior (none is modeled
  // for these levels), just a real, selectable, highlightable 3D volume
  // on the facade so the new Level/Apartment presentation cards have
  // actual geometry to fly the camera to and outline, exactly the same
  // "placeholder volume for a unit without an authored interior yet" role
  // UnitVolume's own docstring already anticipated.
  const generatedUnits = isL06 || isL10 || !isResidentialLevel(level.ref) ? [] : residentialUnitsForLevel(level.ref);
  // Phase 15C — real-browser validation found that a unit's own ghosted
  // "dollhouse" shell (restingOpacity 0.12, for viewing the interior FROM
  // OUTSIDE) was still applied at that same near-invisible opacity once a
  // viewer actually ENTERED that same interior — standing inside a
  // 12%-opaque shell means looking straight through it to the sky/exterior
  // beyond, which is exactly the "floating furniture against open sky"
  // defect real-GPU screenshots surfaced (previously misdiagnosed as a
  // SwiftShader-only artifact in the Phase 14 report — confirmed here to
  // be a real, pre-existing product bug, not a test-harness quirk). The
  // shell only needs to go opaque while THIS SPECIFIC unit's interior is
  // the active one; viewed from outside (or with no interior entered) it
  // keeps the original ghosted look unchanged.
  const { activeInteriorRef } = useInteriorFocus();

  // Architectural Reality V1 (Grand Lobby) — the Ground level's own solid
  // massing box (LevelMassing's full-footprint hit-target) sits in front
  // of the real, recessed Main Entrance door (GroundEntrance: x=0, z=16,
  // 1m behind the podium's outer face at z=17) and was winning every
  // raycast aimed at the door, since it's the nearer surface along the
  // same ray. This carves out exactly the entrance opening's own x/y
  // bounds so a click there falls through to the door mesh behind it
  // instead of selecting the level — a real structural-coordination fix
  // (Part 29), not a general click-through mechanism.
  const groundEntranceClickThrough =
    level.ref === "LUNA-GROUND"
      ? (point: { x: number; y: number }) =>
          Math.abs(point.x - GROUND_ENTRANCE_X) <= GROUND_ENTRANCE_OPENING_WIDTH / 2 &&
          point.y - level.baseElevation >= 0 &&
          point.y - level.baseElevation <= GROUND_ENTRANCE_HEIGHT
      : undefined;

  return (
    <LevelMassing hideVisual={liftInspection} level={level} stackIndex={stackIndex} material={material} selectedMaterial={selectedMaterial} nightGlowIntensity={nightGlowIntensity}
      isClickThrough={groundEntranceClickThrough}
      visual={imported.asset ? <GroundArchitecture asset={imported.asset} levelHeight={level.height} label={level.label} /> : level.ref === "LUNA-GROUND" ? <GroundExteriorEnvelope level={level}/> : level.ref === "LUNA-L01-AMENITIES" ? <AmenityEnvelope level={level} /> : undefined}>
      {level.ref === "LUNA-GROUND" && <group name="ground-architecture-status" userData={{ status: imported.status, error: imported.error }} />}
      <group visible={!liftInspection}>
      {!imported.asset && <LevelFacade level={level} />}

      {level.ref === "LUNA-GROUND" && !imported.asset && (
        <GrandLobbyArchitecture levelHeight={level.height} entranceDoorState={entranceDoorState ?? "CLOSED"} onSelectEntranceDoor={onSelectEntranceDoor} onEntranceDoorProgress={onEntranceDoorProgress} />
      )}
      {!imported.asset && ["LUNA-GROUND", "LUNA-L01-AMENITIES"].includes(level.ref) && <PodiumCoreApproach level={level} />}
      {levelInterior && level.ref !== "LUNA-GROUND" && <InteriorLayer spec={levelInterior} levelHeight={level.height} />}
      {isL06 && <L06CommonArchitecture apartmentAEntranceOpen={apartmentAEntranceOpen} onApartmentAAngleChange={onApartmentAAngleChange} />}
      {level.ref === "LUNA-B1" && <LunaPlantRoom levelRef={level.ref} levelHeight={level.height} />}
      <LevelOperationalLayer levelRef={level.ref} levelHeight={level.height} />

      {isL06 &&
        LUNA_L06_UNITS.map((unit) => {
          const hasInterior = unit.ref === LUNA_L06_APT_A.interiorRef;
          const box = l06UnitMassingBox(unit);
          return (
            <UnitVolume
              key={unit.ref}
              ref_={unit.ref}
              label={unit.label}
              parentRef={LUNA_L06.ref}
              x={box.x}
              z={box.z}
              width={box.width}
              depth={box.depth}
              height={LUNA_L06.height}
              material={hasInterior ? unitWithInteriorMaterial : unitMaterial}
              selectedMaterial={hasInterior ? unitWithInteriorSelectedMaterial : unitSelectedMaterial}
              restingOpacity={hasInterior ? (activeInteriorRef === LUNA_L06_APT_A.interiorRef ? 1 : 0.12) : 1}
            >
              {hasInterior && <InteriorLayer spec={LUNA_L06_APT_A} levelHeight={LUNA_L06.height} />}
              {hasInterior && <UnitOperationalLayer unitRef={unit.ref} levelHeight={LUNA_L06.height} />}
            </UnitVolume>
          );
        })}

      {isL10 && (
        <UnitVolume
          ref_={LUNA_L10_APT_A_UNIT.ref}
          label={LUNA_L10_APT_A_UNIT.label}
          parentRef={level.ref}
          x={LUNA_L10_APT_A_UNIT.x}
          z={LUNA_L10_APT_A_UNIT.z}
          width={LUNA_L10_APT_A_UNIT.width}
          depth={LUNA_L10_APT_A_UNIT.depth}
          height={level.height}
          material={unitWithInteriorMaterial}
          selectedMaterial={unitWithInteriorSelectedMaterial}
          restingOpacity={activeInteriorRef === LUNA_L10_APT_A.interiorRef ? 1 : 0.12}
        >
          <InteriorLayer spec={LUNA_L10_APT_A} levelHeight={level.height} />
        </UnitVolume>
      )}

      {generatedUnits.map((unit) => (
        <UnitVolume
          key={unit.ref}
          ref_={unit.ref}
          label={unit.label}
          parentRef={level.ref}
          x={unit.planX}
          z={unit.planZ}
          width={unit.planWidth}
          depth={unit.planDepth}
          height={level.height}
          material={unitMaterial}
          selectedMaterial={unitSelectedMaterial}
        />
      ))}
      </group>
      <LunaLevelStructure levelRef={level.ref} inspection={liftInspection} />
    </LevelMassing>
  );
}
