// Luna — Building Ingestion V1: the one genuinely complete, real, working
// adapter this phase ships (brief Part B11). It does not parse a foreign
// file format — it "extracts" from Luna's own already-existing canonical
// data (lunaProgramme.ts/lunaOperationalAssets.ts/lunaStructuralElements.ts/
// lunaResidentialUnits.ts), which is real, structured, and already true.
// This proves the full pipeline (extract -> normalize -> propose -> review
// -> publish) end-to-end against 100% real data, with zero fabrication —
// the honest starting point Part B1 requires before any foreign-format
// adapter is attempted.
//
// Confidence is NOT uniformly 100%: data with a real isCanonicalBackendUnit
// flag or a genuine registered ref gets alreadyCanonicalIdentity evidence;
// Phase 16A's own disclosed GENERATED reference units (not backend-seeded)
// get lower, real evidence instead — the same honest gradient a real
// foreign-source extraction would need to show.

import type { SourceAdapter } from "../../engine/ingestion/adapters";
import type { BuildingSourceRecord, ExtractedBuildingModel, ExtractedObject, ExtractedObjectClass } from "../../engine/ingestion/types";
import { LUNA_LEVELS, LUNA_CORES, LUNA_BUILDING_ROOT, LUNA_SITE } from "../lunaProgramme";
import { lunaTwinDataProvider } from "../operational/lunaTwinDataProvider";
import { LUNA_STRUCTURAL_ELEMENTS } from "../structure/lunaStructuralElements";
import { LUNA_RESIDENTIAL_UNITS } from "../lunaResidentialUnits";

function object(sourceId: string, sourceType: string, sourceName: string, sourceCategory: ExtractedObjectClass, parentSourceId: string | undefined, confidence: number): ExtractedObject {
  return { sourceId, sourceType, sourceName, sourceCategory, parentSourceId, confidence, classification: sourceCategory };
}

export const LUNA_PROCEDURAL_ADAPTER_ID = "luna-procedural-v1";

export const lunaProceduralAdapter: SourceAdapter = {
  id: LUNA_PROCEDURAL_ADAPTER_ID,
  format: "gltf", // the closest real category — Luna's own already-rendered scene graph
  async extract(_source: BuildingSourceRecord): Promise<ExtractedBuildingModel> {
    const objects: ExtractedObject[] = [];
    const warnings: string[] = [];

    objects.push(object(LUNA_BUILDING_ROOT.ref, "building", LUNA_BUILDING_ROOT.label, "building", undefined, 1));
    // No canonical site ref exists anywhere in this codebase yet (Part B5
    // still requires the site be DESCRIBABLE, not that a target already
    // exist) — extracted honestly, left for review to resolve rather
    // than inventing a ref.
    objects.push(object("site-footprint", "site", `Site (${LUNA_SITE.width}m x ${LUNA_SITE.depth}m)`, "site", LUNA_BUILDING_ROOT.ref, 0.5));
    warnings.push("Site has no established canonical ref in this codebase yet — extracted as a real object, but normalization cannot propose a target without one.");

    for (const level of LUNA_LEVELS) {
      objects.push(object(level.ref, "level", level.label, "level", LUNA_BUILDING_ROOT.ref, 1));
    }

    for (const core of LUNA_CORES) {
      const cls: ExtractedObjectClass = core.ref.includes("LIFT") ? "lift" : core.ref.includes("STAIR") ? "stair" : "shaft";
      objects.push(object(core.ref, cls, core.label, cls, LUNA_BUILDING_ROOT.ref, 1));
    }

    for (const element of LUNA_STRUCTURAL_ELEMENTS) {
      objects.push(object(element.ref, element.elementType, element.label, "structural_element", element.ownerLevelRef, 1));
    }

    for (const unit of LUNA_RESIDENTIAL_UNITS) {
      // The real, disclosed evidence gradient (see file header): backend-
      // seeded units get full canonical-identity confidence; Phase 16A's
      // own generated reference units do NOT — same honest distinction
      // that file's own code comments already make.
      objects.push(object(unit.ref, "home", unit.label, "home", unit.levelRef, unit.isCanonicalBackendUnit ? 1 : 0.65));
      if (!unit.isCanonicalBackendUnit) warnings.push(`${unit.ref}: generated reference unit, not backend-seeded — lower confidence, needs review.`);
    }

    // LUNA_CORES already covers the four lift refs (classified "lift"
    // above, semantically more precise than generic "equipment") — skip
    // them here so each real asset is extracted exactly once.
    const coreRefs = new Set(LUNA_CORES.map((c) => c.ref));
    for (const asset of lunaTwinDataProvider.listAssets()) {
      if (coreRefs.has(asset.ref)) continue;
      objects.push(object(asset.ref, asset.type, asset.label, "equipment", asset.unitRef ?? asset.ownerLevelRef, 1));
    }

    return { sourceId: _source.sourceId, extractedAt: new Date().toISOString(), objects, warnings };
  },
};
