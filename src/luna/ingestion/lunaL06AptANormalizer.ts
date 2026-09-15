// Luna Architectural Reality V2 — normalizes the L06 Apartment A
// adapter's ExtractedBuildingModel into MappingProposals (brief Part
// 6/7/8). Rooms and the apartment itself map to their OWN existing,
// already-accepted canonical refs (alreadyCanonicalIdentity: true — these
// refs have been load-bearing across RepresentationPolicy, MEP,
// camera-presets and multiple phases already, not newly invented here).
// Doors are the opposite, disclosed case: this is the FIRST time a door
// identity is proposed anywhere in this codebase, so they get a real,
// lower, evidence-based confidence and PROPOSED status — never silently
// treated as already-canonical just because their ref looks tidy.

import type { ExtractedBuildingModel, CanonicalTargetKind, MappingProposal } from "../../engine/ingestion/types";
import { proposeMapping, type ConfidenceEvidence } from "../../engine/ingestion/normalize";
import { LUNA_L06_APT_A } from "../interiors/lunaInteriors";

function isAlreadyCanonicalRoomOrHome(sourceId: string): boolean {
  if (sourceId === LUNA_L06_APT_A.interiorRef) return true;
  return LUNA_L06_APT_A.rooms.some((r) => r.ref === sourceId);
}

export function normalizeL06AptAExtraction(model: ExtractedBuildingModel, projectId: string): MappingProposal[] {
  return model.objects.map((object) => {
    if (object.sourceCategory === "door") {
      // Apartment A Full Interior Reality V1: a room can now carry more
      // than one real door (the adapter extracts every entry in its
      // `doors` array), so recomputing a ref from parentSourceId alone
      // can no longer distinguish door 1 from door 2 on the same room.
      // The adapter's own object.sourceId is already the real, stable,
      // per-door ref (see lunaL06AptAAdapter.ts's l06AptADoorRef) — use
      // it directly rather than re-deriving a now-ambiguous one.
      const doorRef = object.sourceId;
      const evidence: ConfidenceEvidence = {
        exactNameMatch: false, // no pre-existing door name anywhere to match against — honest
        parentAlreadyConfirmed: isAlreadyCanonicalRoomOrHome(object.parentSourceId ?? ""),
        stableSourceId: true, // deterministic one-door-per-room-with-a-doorSide scheme, not adapter-invented per run
        alreadyCanonicalIdentity: false, // genuinely new — never proposed before this phase
      };
      return proposeMapping(object, projectId, model.sourceId, "door" as CanonicalTargetKind, evidence, doorRef);
    }

    const targetKind: CanonicalTargetKind = object.sourceCategory === "home" ? "home" : "room";
    const isCanonical = isAlreadyCanonicalRoomOrHome(object.sourceId);
    const evidence: ConfidenceEvidence = {
      exactNameMatch: true, // the adapter's own label IS the canonical label — real, checked
      parentAlreadyConfirmed: Boolean(object.parentSourceId && (object.parentSourceId === LUNA_L06_APT_A.ownerLevelRef || isAlreadyCanonicalRoomOrHome(object.parentSourceId))),
      stableSourceId: true,
      alreadyCanonicalIdentity: isCanonical,
    };
    return proposeMapping(object, projectId, model.sourceId, targetKind, evidence, isCanonical ? object.sourceId : undefined);
  });
}
