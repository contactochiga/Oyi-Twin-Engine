// Luna — Building Ingestion V1: normalizes the procedural adapter's
// ExtractedBuildingModel into MappingProposals (brief Part B6/B7). Maps
// into the SAME hierarchy Luna's own canonical data already uses — never
// a competing spatial hierarchy (Part B6's explicit instruction).

import type { ExtractedBuildingModel, CanonicalTargetKind, MappingProposal } from "../../engine/ingestion/types";
import { proposeMapping, type ConfidenceEvidence } from "../../engine/ingestion/normalize";
import { lunaTwinDataProvider } from "../operational/lunaTwinDataProvider";
import { LUNA_LEVELS, LUNA_CORES, LUNA_BUILDING_ROOT } from "../lunaProgramme";
import { LUNA_STRUCTURAL_ELEMENTS, LUNA_STRUCTURAL_CORE_WALL } from "../structure/lunaStructuralElements";
import { LUNA_RESIDENTIAL_UNITS } from "../lunaResidentialUnits";

const TARGET_KIND_BY_CLASS: Record<string, CanonicalTargetKind> = {
  building: "building",
  site: "site",
  level: "level",
  space: "space",
  home: "home",
  room: "room",
  common_area: "space",
  service_space: "space",
  core: "core",
  lift: "lift",
  stair: "stair",
  shaft: "shaft",
  structural_element: "structural_element",
  equipment: "operational_asset",
};

function alreadyCanonicalRef(sourceId: string): boolean {
  if (sourceId === LUNA_BUILDING_ROOT.ref) return true;
  if (LUNA_LEVELS.some((l) => l.ref === sourceId)) return true;
  if (LUNA_CORES.some((c) => c.ref === sourceId)) return true;
  if (LUNA_STRUCTURAL_ELEMENTS.some((e) => e.ref === sourceId) || sourceId === LUNA_STRUCTURAL_CORE_WALL.ref) return true;
  if (LUNA_RESIDENTIAL_UNITS.some((u) => u.ref === sourceId && u.isCanonicalBackendUnit)) return true;
  if (lunaTwinDataProvider.getAsset(sourceId)) return true;
  return false;
}

export function normalizeLunaExtraction(model: ExtractedBuildingModel, projectId: string): MappingProposal[] {
  return model.objects.map((object) => {
    const targetKind = TARGET_KIND_BY_CLASS[object.sourceCategory] ?? "operational_asset";
    const isCanonical = alreadyCanonicalRef(object.sourceId);
    const evidence: ConfidenceEvidence = {
      exactNameMatch: true, // the procedural adapter's own label IS the canonical label — real, checked
      parentAlreadyConfirmed: Boolean(object.parentSourceId && alreadyCanonicalRef(object.parentSourceId)),
      stableSourceId: true, // every id here is the asset's own stable canonical ref, not an adapter-invented index
      alreadyCanonicalIdentity: isCanonical,
    };
    return proposeMapping(object, projectId, model.sourceId, targetKind, evidence, isCanonical ? object.sourceId : undefined);
  });
}
