// Oyi Twin Engine — Building Ingestion V1 foundation contracts.
// Building-agnostic on purpose, same discipline as twinData.ts/
// representationPolicy.ts: nothing here may name "Luna" or hardcode a
// Luna-specific value. This describes the SHAPE every future building's
// own ingestion pipeline produces — a Luna-specific adapter/seed lives
// under src/luna/ingestion/, never here.
//
// Core principle (brief Part B1): the uploaded/ingested model MUST NOT
// become a second source of truth. This file keeps four concerns
// deliberately separate at the type level, mirroring the same boundary
// every other Oyi layer already enforces:
//   SOURCE DATA        -> BuildingSourceRecord / ExtractedBuildingModel
//   OYI CANONICAL DATA  -> CanonicalMapping (only once CONFIRMED)
//   RUNTIME STATE        -> untouched by this file (twinRuntime.ts)
//   REPRESENTATION       -> untouched by this file (representationPolicy.ts)

import type { CanonicalRef } from "../types";

// ---------------------------------------------------------------------
// Part B3 — source file contract. The system must explicitly know what
// it can and cannot do with a given format; never claim full support it
// doesn't have.
// ---------------------------------------------------------------------

export type SourceCategory = "primary" | "secondary" | "document";

export type SourceFormat = "rvt" | "ifc" | "archicad" | "skp" | "glb" | "gltf" | "pdf" | "cad" | "image";

// ---------------------------------------------------------------------
// Building Ingestion V2 Part 3 — source roles. A project source's FORMAT
// (above) says what file type it is; its ROLE says what it REPRESENTS in
// the project. These are orthogonal — a project commonly arrives with
// several coordinated sources declaring different roles (an architect's
// 2D plan set AND a BIM/3D model AND a site survey), and ingestion must
// never assume one uploaded file stands in for all of them. See
// sourceRoles.ts for the registry of what each role means.
// ---------------------------------------------------------------------

export type SourceRole =
  | "ARCHITECTURAL_2D" // authoritative 2D floor plans/drawings — the plan-side of the crosswalk
  | "ARCHITECTURAL_3D" // authoritative 3D/geometric model — the model-side of the crosswalk
  | "BIM" // a structured BIM exchange (may carry both 2D and 3D-derivable information)
  | "STRUCTURAL" // structural engineering drawings/model
  | "MEP" // mechanical/electrical/plumbing drawings/model
  | "SITE" // site plan/survey — context, not the building interior
  | "SCHEDULE" // door/window/room schedules and similar tabular data
  | "REFERENCE_IMAGE" // a photo or rendering — context only, never extractable spatial data
  | "SUPPLEMENTARY"; // anything else the project attaches (reports, specs, etc.)

/** How much of the ingestion pipeline this format can actually walk
 * through today — never inferred, always an explicit, honest declaration
 * per format. See engine/ingestion/formatRegistry.ts for the current
 * value of every format; this type only defines the vocabulary. */
export type SourceSupportLevel =
  | "SUPPORTED" // a real, working adapter exists end-to-end
  | "PARTIALLY_SUPPORTED" // a real, working pipeline exists for a bounded subset
  | "VISUAL_ONLY" // geometry can be loaded/viewed; no semantic extraction
  | "REQUIRES_CONVERSION" // no direct adapter; must become a supported format first
  | "REQUIRES_REVIEW"; // document/drawing source; extraction is draft-quality by nature

export interface SourceFormatDescriptor {
  format: SourceFormat;
  category: SourceCategory;
  label: string;
  supportLevel: SourceSupportLevel;
  /** Why this level, in one sentence — never left implicit. */
  note: string;
}

// ---------------------------------------------------------------------
// Part B2 — project intake.
// ---------------------------------------------------------------------

export type ProjectPhase = "concept" | "reference" | "design" | "construction" | "operational";
export type IngestionStatus = "not_started" | "registered" | "extracting" | "extracted" | "normalizing" | "review" | "published" | "failed";

export interface ProjectRecord {
  projectId: string;
  name: string;
  developerOwner?: string;
  projectType?: string;
  buildingType?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  orientationTrueNorthDeg?: number;
  phase: ProjectPhase;
  designRevision?: string;
  notes?: string;
  ingestionStatus: IngestionStatus;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Part B13 — source registration.
// ---------------------------------------------------------------------

export interface BuildingSourceRecord {
  sourceId: string;
  projectId: string;
  fileName: string;
  sourceFormat: SourceFormat;
  revision?: string;
  registeredAt: string;
  author?: string;
  /** Declared, never invented: computed only when real file bytes are
   * available (see projectStore.ts's registerSource). */
  checksum?: string;
  fileSizeBytes?: number;
  adapter: string; // adapter id that will/did handle this source
  /** What this source REPRESENTS in the project (Part 3) — optional and
   * additive so every V1 record/call site keeps compiling unchanged;
   * ingestion UI should prompt for it but must not assume/default a role
   * from the file format alone (a .pdf could be ARCHITECTURAL_2D or
   * SCHEDULE or REFERENCE_IMAGE — the format never implies the role). */
  role?: SourceRole;
  extractionStatus: "unregistered" | "pending" | "extracted" | "failed";
  normalizationStatus: "pending" | "normalized" | "failed";
  reviewStatus: "pending" | "in_review" | "complete";
}

// ---------------------------------------------------------------------
// Part B5 — extracted building model (normalized INTERMEDIATE
// representation — not yet canonical, see Part B9's publish boundary).
// ---------------------------------------------------------------------

export type ExtractedObjectClass =
  | "project"
  | "site"
  | "building"
  | "level"
  | "space"
  | "room"
  | "home"
  | "common_area"
  | "service_space"
  | "door"
  | "window"
  | "stair"
  | "lift"
  | "core"
  | "shaft"
  | "structural_element"
  | "equipment"
  // Building Ingestion V2 Part 5 — additive kinds the normalized spatial
  // model needs and V1 didn't yet name. "home" (private residential unit,
  // V1) is kept unchanged for backward compatibility; "unit" is the
  // broader term Part 9 requires (office suite, hotel room, retail unit —
  // not just residential), so future adapters may propose either
  // depending on what the source actually is.
  | "unit"
  | "riser"
  | "corridor"
  | "amenity";

export interface ExtractedObject {
  /** Stable within THIS extraction only — never assumed globally unique
   * across sources/projects (see MappingProposal.sourceCrosswalk for the
   * durable identity). */
  sourceId: string;
  sourceType: string; // the source system's own type/category string, verbatim
  sourceName: string; // the source system's own name/label, verbatim
  sourceCategory: ExtractedObjectClass;
  geometryRef?: string; // opaque pointer into the source geometry payload, if any
  parentSourceId?: string;
  /** How sure the extraction step itself is that this object was
   * correctly identified/classified — see normalize.ts's
   * computeConfidence for how this must be derived, never invented. */
  confidence: number | "UNKNOWN";
  classification: ExtractedObjectClass;
}

export interface ExtractedBuildingModel {
  sourceId: string;
  extractedAt: string;
  objects: ExtractedObject[];
  /** Non-fatal issues the adapter found (missing data, ambiguous names,
   * unsupported features it skipped) — surfaced to review, never hidden. */
  warnings: string[];
}

// ---------------------------------------------------------------------
// Part B6/B7/B8 — normalization, confidence, and the review/mapping model.
// ---------------------------------------------------------------------

/** The target Oyi spatial hierarchy every normalizer maps into — reuses
 * the SAME hierarchy Luna's own canonical data already follows
 * (lunaProgramme.ts's LUNA_LEVELS, twinData.ts's OperationalAssetRecord,
 * structuralCatalog.ts's StructuralElementRecord), never a competing one. */
export type CanonicalTargetKind = "building" | "site" | "level" | "space" | "home" | "room" | "door" | "window" | "core" | "lift" | "stair" | "shaft" | "structural_element" | "operational_asset" | "unit" | "riser" | "corridor" | "amenity" | "common_area" | "service_space";

export type ReviewStatus = "DETECTED" | "PROPOSED" | "CONFIRMED" | "EDITED" | "REJECTED" | "UNRESOLVED" | "DESIGN_DECISION_REQUIRED";

export interface MappingProposal {
  mappingId: string;
  sourceId: string; // ExtractedObject.sourceId this proposal is for
  projectId: string;
  buildingSourceId: string;
  proposedRef: string; // e.g. "LUNA-L06-APT-A" — a PROPOSAL, not yet canonical
  targetKind: CanonicalTargetKind;
  confidence: number | "UNKNOWN";
  status: ReviewStatus;
  reviewer?: string;
  reviewedAt?: string;
  /** Present only when status === "EDITED" — the human-corrected ref,
   * distinct from the original machine proposal so both remain visible. */
  editedRef?: string;
  /** Source system's own identifier(s), preserved for traceability even
   * after canonical publish — never discarded (Part B10's "source
   * crosswalk"). */
  sourceCrosswalk: { sourceId: string; sourceType: string; sourceName: string };
}

// ---------------------------------------------------------------------
// Part B9 — publish boundary. Only CONFIRMED/EDITED mappings may ever
// appear here; this type's own shape makes that the only way to reach a
// CanonicalRef via ingestion.
// ---------------------------------------------------------------------

export interface PublishedCanonicalRecord {
  ref: CanonicalRef;
  projectId: string;
  mappingId: string;
  targetKind: CanonicalTargetKind;
  publishedAt: string;
}

export interface PublishResult {
  publishedCount: number;
  published: PublishedCanonicalRecord[];
  /** Every mapping that was NOT published, and why — unresolved/rejected
   * objects are enumerated here, never silently dropped (Part B9: "they
   * must not silently become fake rooms/apartments/lifts/..."). */
  skipped: Array<{ mappingId: string; status: ReviewStatus; reason: string }>;
}
