import { podiumSlabPanels } from "../architecture/podiumSlabOpenings";
import { PODIUM_CORE_OPENINGS } from "../architecture/podiumCoordination";
import { mergedBoxGeometry } from "../../engine/utils/geometryUtils";
import { useEffect } from "react";
import { useMemo } from "react";
import { StructuralElement, StructuralCoreWall, Sleeve } from "../../engine";
import { LUNA_STRUCTURAL_ELEMENTS, LUNA_STRUCTURAL_CORE_WALL } from "./lunaStructuralElements";
import { LUNA_MEP_SLEEVES } from "./lunaMepSleeves";
import { lunaMaterialFactories } from "../lunaMaterials";

/** Renders every structural element owned by ONE level — nested inside
 * that level's own LevelMassing group (the same pattern LevelFacade
 * already uses) so columns/slabs explode and isolate with their own floor,
 * per Phase 13's "when floors separate, slabs/columns remain logically
 * attached [to their floor]" requirement. Shares one material instance
 * across every element on the level (and one shared selected-state
 * material) rather than allocating per-element — they all fade in/out of
 * Structure mode identically, so there's nothing sharing the instance
 * could get visually wrong, and it keeps material count flat regardless
 * of how many columns a level has. */
export function LunaLevelStructure({ levelRef, inspection = false }: { levelRef: string; inspection?: boolean }) {
  const material = useMemo(() => lunaMaterialFactories.basementConcrete(), []);
  const selectedMaterial = useMemo(() => lunaMaterialFactories.selectedHighlight(), []);
  const elements = useMemo(() => LUNA_STRUCTURAL_ELEMENTS.filter((e) => e.ownerLevelRef === levelRef), [levelRef]);
  const sleeves = useMemo(() => LUNA_MEP_SLEEVES.filter((s) => s.ownerLevelRef === levelRef), [levelRef]);

  // Existing structural identities/transforms; coordinated podium core apertures.
  const slabVisuals = useMemo(() => new Map(elements.filter(e => e.ref.includes("SLAB") || e.ref === "LUNA-STRUCT-L01-TRANSFER-01").map(e => {
    const w = e.size.x, d = e.size.z, h = e.size.y;
    if (levelRef === "LUNA-GROUND" || levelRef === "LUNA-L01-AMENITIES") {
      return [e.ref, mergedBoxGeometry(podiumSlabPanels(w,d,h))];
    }
    return [e.ref, mergedBoxGeometry([
      { size: [(w - 3) / 2, h, d], position: [-(w + 3) / 4, 0, 0] },
      { size: [(w - 3) / 2, h, d], position: [(w + 3) / 4, 0, 0] },
      { size: [3, h, (d - 3) / 2], position: [0, 0, -(d + 3) / 4] },
      { size: [3, h, (d - 3) / 2], position: [0, 0, (d + 3) / 4] },
    ])];
  })), [elements, levelRef]);
  useEffect(() => () => slabVisuals.forEach(g => g.dispose()), [slabVisuals]);
  if (elements.length === 0 && sleeves.length === 0) return null;

  return (
    <>
      {elements.map((el) => (
        <StructuralElement
          key={el.ref}
          inspectionOpacity={inspection ? 0.22 : undefined}
          visualGeometry={slabVisuals.get(el.ref)}
          ref_={el.ref}
          label={el.label}
          position={[el.position.x, el.position.y, el.position.z]}
          size={[el.size.x, el.size.y, el.size.z]}
          material={material}
          selectedMaterial={selectedMaterial}
        />
      ))}
      {sleeves.map((s) => (
        <Sleeve key={s.ref} ref_={s.ref} label={s.label} position={s.position} axis="y" />
      ))}
    </>
  );
}

/** The continuous structural core wall — mounted once at the building
 * root (like LunaRiserShafts), not per-level, since it is fixed regardless
 * of explode state. */
export function LunaStructuralCore({ inspection = false }: { inspection?: boolean }) {
  const material = useMemo(() => lunaMaterialFactories.basementConcrete(), []);
  const selectedMaterial = useMemo(() => lunaMaterialFactories.selectedHighlight(), []);
  const core = LUNA_STRUCTURAL_CORE_WALL;

  return (
    <StructuralCoreWall
      revealFront={inspection}
      frontOpenings={PODIUM_CORE_OPENINGS}
      ref_={core.ref}
      label={core.label}
      centerX={core.centerX}
      centerZ={core.centerZ}
      halfWidth={core.halfWidth}
      halfDepth={core.halfDepth}
      thickness={core.thickness}
      baseElevation={core.baseElevation}
      topElevation={core.topElevation}
      material={material}
      selectedMaterial={selectedMaterial}
    />
  );
}
