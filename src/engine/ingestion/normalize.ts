// Oyi Twin Engine — Building Ingestion V1: normalization foundation
// (brief Part B6/B7). Confidence is computed from real, enumerable
// evidence only — never invented to make the UI look intelligent (Part
// B7's own explicit instruction). Ref proposal uses a small, disclosed,
// deterministic text heuristic, not a claim of semantic understanding —
// anything it can't confidently pattern-match stays UNRESOLVED rather
// than guessing.

import type { CanonicalTargetKind, ExtractedObject, MappingProposal, ReviewStatus } from "./types";

export interface ConfidenceEvidence {
  /** The extracted object's own name matches an existing canonical
   * label/alias exactly (case-insensitive), evidence a real building
   * module actually checked — never assumed true. */
  exactNameMatch: boolean;
  /** This object's source-declared parent already has a CONFIRMED
   * mapping — real hierarchical evidence, not inferred. */
  parentAlreadyConfirmed: boolean;
  /** The source system gave this object a real, non-empty, stable
   * identifier (an IFC GUID, a Revit element id, etc.) rather than an
   * adapter-invented index. */
  stableSourceId: boolean;
  /** Set ONLY when the object's identity is already a verbatim,
   * already-canonical Oyi ref (e.g. the Luna procedural adapter reading
   * already-canonical data 1:1) — never set by inference from a name. */
  alreadyCanonicalIdentity: boolean;
}

/** Deterministic, documented, capped-below-100%-unless-already-canonical
 * scoring — every weight here is a fixed, disclosed constant, not a
 * black box. Returns "UNKNOWN" when there is no real evidence at all,
 * per Part B7: "Where confidence cannot be calculated meaningfully, use
 * UNKNOWN... The system must never imply certainty where none exists." */
export function computeConfidence(evidence: ConfidenceEvidence): number | "UNKNOWN" {
  if (evidence.alreadyCanonicalIdentity) return 1;
  if (!evidence.exactNameMatch && !evidence.stableSourceId && !evidence.parentAlreadyConfirmed) return "UNKNOWN";
  let score = 0.5;
  if (evidence.exactNameMatch) score += 0.2;
  if (evidence.stableSourceId) score += 0.15;
  if (evidence.parentAlreadyConfirmed) score += 0.1;
  return Math.min(score, 0.98);
}

/** Small, disclosed pattern set — "Level 06" -> "L06", "Apartment A"/
 * "Unit A" -> "APT-A", "Stair West"/"Stair Core West" -> a stair-shaped
 * slug. Anything that doesn't match a known pattern returns null (no
 * guess), which callers must treat as UNRESOLVED, never a silent
 * fallback ref. This is literal string pattern-matching, not semantic
 * understanding — disclosed as exactly that in docs/OYI_BUILDING_INGESTION_V1.md. */
export function proposeRefSlug(sourceName: string): string | null {
  const name = sourceName.trim();
  const level = name.match(/^level\s*0*(\d{1,2})$/i) || name.match(/^floor\s*0*(\d{1,2})$/i);
  if (level) return `L${level[1].padStart(2, "0")}`;
  const apartment = name.match(/^(?:apartment|unit)\s+([a-z0-9]+)$/i);
  if (apartment) return `APT-${apartment[1].toUpperCase()}`;
  const stair = name.match(/^stair(?:\s+core)?\s+([a-z]+)$/i);
  if (stair) return `STAIR-${stair[1].toUpperCase()}`;
  return null;
}

let mappingSeq = 0;
function nextMappingId(): string {
  mappingSeq += 1;
  return `map_${Date.now().toString(36)}_${mappingSeq}`;
}

/** Builds ONE mapping proposal from one extracted object. Never marks
 * anything CONFIRMED — that only ever happens through an explicit human
 * review action (Part B8: "Only CONFIRMED mappings should be allowed to
 * become canonical"). `existingRef` is supplied by the caller only when
 * it already knows a real, already-canonical identity (see
 * ConfidenceEvidence.alreadyCanonicalIdentity). */
export function proposeMapping(
  object: ExtractedObject,
  projectId: string,
  buildingSourceId: string,
  targetKind: CanonicalTargetKind,
  evidence: ConfidenceEvidence,
  existingRef?: string
): MappingProposal {
  const confidence = computeConfidence(evidence);
  const proposedRef = existingRef ?? proposeRefSlug(object.sourceName);
  const status: ReviewStatus = evidence.alreadyCanonicalIdentity ? "PROPOSED" : proposedRef ? "PROPOSED" : "UNRESOLVED";
  return {
    mappingId: nextMappingId(),
    sourceId: object.sourceId,
    projectId,
    buildingSourceId,
    proposedRef: proposedRef ?? "",
    targetKind,
    confidence,
    status,
    sourceCrosswalk: { sourceId: object.sourceId, sourceType: object.sourceType, sourceName: object.sourceName },
  };
}
