// Luna Architectural Reality V2 — L06 Apartment A SourceAdapter (brief
// Parts 3/13/30 step 6-7). No real architectural source exists for L06
// Apartment A (repository audit confirmed: no RVT/IFC/Archicad/SketchUp/
// CAD/PDF anywhere). Per the brief's own Part 3 instruction for that
// case, this adapter does NOT fabricate a source — it extracts from the
// apartment's own existing, already-accepted procedural data
// (lunaInteriors.ts's LUNA_L06_APT_A, the same rooms already rendered,
// camera-preset-framed, and device-populated by Phases 3/10/12/13) so the
// SAME Building Ingestion V1 pipeline this repository already has can be
// proven at apartment/room granularity, not just whole-building — reusing
// 100% of engine/ingestion's existing contracts, zero new machinery.
//
// This is explicitly a PROCEDURAL REFERENCE FIXTURE, never claimed as
// architectural truth (Part 3: "Do not call a procedural reconstruction
// 'architectural reality'"). Every extracted object stays reviewable —
// rooms/apartment carry high extraction confidence (they ARE Oyi's own
// already-accepted data, read faithfully), but doors are DERIVED (a
// doorSide flag, not an authored door assembly) and disclosed as lower
// confidence with an explicit warning, never silently upgraded.

import type { SourceAdapter } from "../../engine/ingestion/adapters";
import type { BuildingSourceRecord, ExtractedBuildingModel, ExtractedObject, ExtractedObjectClass } from "../../engine/ingestion/types";
import { LUNA_L06_APT_A, type RoomLayoutSpec } from "../interiors/lunaInteriors";
import { LUNA_L06 } from "../lunaProgramme";

function object(sourceId: string, sourceType: string, sourceName: string, sourceCategory: ExtractedObjectClass, parentSourceId: string | undefined, confidence: number, geometryRef?: string): ExtractedObject {
  return { sourceId, sourceType, sourceName, sourceCategory, parentSourceId, confidence, classification: sourceCategory, geometryRef };
}

/** Room type, read verbatim off the room's own already-authored ref
 * suffix (e.g. "LUNA-L06-APT-A-BATH-03" -> "bathroom") — never invented.
 * Every one of these refs and labels was authored by Phase 3, long before
 * this adapter existed; this only classifies what's already there. */
export function roomSourceType(room: RoomLayoutSpec): string {
  if (room.ref.includes("-BATH-")) return "bathroom";
  if (room.ref.includes("-BED-")) return "bedroom";
  if (room.ref.includes("-KITCHEN")) return "kitchen";
  if (room.ref.includes("-ENTRY")) return "entry";
  if (room.ref.includes("-UTILITY")) return "utility";
  if (room.ref.includes("-DINING")) return "dining";
  if (room.ref.includes("-LIVING")) return "living";
  if (room.ref.includes("-BALCONY")) return "balcony";
  return "room"; // honest fallback — no room in the current 13 actually hits this
}

export function l06AptARoomGeometryRef(room: RoomLayoutSpec): string {
  return `massing-frame:x=${room.x},z=${room.z},w=${room.width},d=${room.depth}`;
}

export function l06AptADoorRef(roomRef: string, index = 0): string {
  return `${roomRef}-DOOR-${String(index + 1).padStart(2, "0")}`;
}

export const LUNA_L06_APT_A_ADAPTER_ID = "luna-l06-apt-a-procedural-reference";

export const lunaL06AptAAdapter: SourceAdapter = {
  id: LUNA_L06_APT_A_ADAPTER_ID,
  format: "gltf", // same "closest real category" convention as the whole-building procedural adapter
  async extract(source: BuildingSourceRecord): Promise<ExtractedBuildingModel> {
    const objects: ExtractedObject[] = [];
    const warnings: string[] = [];

    objects.push(object(LUNA_L06_APT_A.interiorRef, "home", LUNA_L06_APT_A.label, "home", LUNA_L06.ref, 1));

    for (const room of LUNA_L06_APT_A.rooms) {
      objects.push(object(room.ref, roomSourceType(room), room.label, "room", LUNA_L06_APT_A.interiorRef, 1, l06AptARoomGeometryRef(room)));

      // UPDATED (Apartment A Full Interior Reality V1): rooms now carry
      // their door(s) via the richer `doors` array (which superseded the
      // single `doorSide` field) and can legitimately have more than one
      // real door (e.g. the Foyer has three). Extract every entry, not
      // just one, so this pipeline stays honest about the apartment's
      // real internal topology instead of silently dropping doors 2..n.
      const doors = room.doors ?? [];
      if (doors.length > 0) {
        doors.forEach((door, index) => {
          const doorRef = l06AptADoorRef(room.ref, index);
          // Extraction confidence is real, not inflated: a door side flag
          // and a wall-gap tell us a door EXISTS and which wall it's on —
          // they do not tell us its real threshold or swing direction/
          // assembly type, none of which any door object in this codebase
          // has ever modeled. Disclosed here rather than implied by a
          // confident number.
          objects.push(object(doorRef, "door-opening", `${room.label} Door ${index + 1}`, "door", room.ref, 0.6, `massing-frame:wall=${door.side},room=${room.ref}`));
        });
      } else {
        warnings.push(`${room.ref}: no doors authored — this room has no extracted door opening.`);
      }
    }

    warnings.push("No window objects exist per-room anywhere in this codebase's procedural data — glazing is only modeled on the exterior facade, not tied to a specific apartment room. Left entirely unextracted rather than fabricated.");
    warnings.push("Fixture-level detail (WC/basin/shower models, appliance models) does not exist — furniture placeholders only. See docs/LUNA_ARCHITECTURAL_REALITY_V2_L06_GOLD_STANDARD.md.");

    return { sourceId: source.sourceId, extractedAt: new Date().toISOString(), objects, warnings };
  },
};
