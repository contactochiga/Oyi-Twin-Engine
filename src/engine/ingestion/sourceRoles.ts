// Oyi Twin Engine — Building Ingestion V2 Part 3: the source ROLE
// registry. A project source's format (formatRegistry.ts) says what kind
// of FILE it is; its role says what it REPRESENTS. A real project
// commonly arrives with several coordinated sources declaring different
// roles — e.g. a Revit model (ARCHITECTURAL_3D) alongside a set of PDF
// floor plans (ARCHITECTURAL_2D) alongside a site survey (SITE). This
// registry exists so the UI never has to guess a role from a file
// extension, and so the source registry can retain real provenance
// (which file claimed to be the plan, which claimed to be the model).

import type { SourceRole } from "./types";

export interface SourceRoleDescriptor {
  role: SourceRole;
  label: string;
  /** What ingestion is entitled to assume about a source with this role —
   * never more than this, and never inferred from format alone. */
  description: string;
  /** Whether this role can feed a PlanRepresentation (a 2D floor-plan
   * control map, see spatial/representations.ts). */
  feedsPlanRepresentation: boolean;
  /** Whether this role can feed a ModelRepresentation (a 3D geometric
   * binding, see spatial/representations.ts). */
  feedsModelRepresentation: boolean;
}

export const SOURCE_ROLE_REGISTRY: SourceRoleDescriptor[] = [
  {
    role: "ARCHITECTURAL_2D",
    label: "Architectural 2D",
    description: "Authoritative floor plans/drawings — remains the architectural source; Oyi never redraws it.",
    feedsPlanRepresentation: true,
    feedsModelRepresentation: false,
  },
  {
    role: "ARCHITECTURAL_3D",
    label: "Architectural 3D",
    description: "Authoritative 3D/geometric model — remains the architectural geometry source; the imported mesh is a representation of canonical identity, never the identity itself.",
    feedsPlanRepresentation: false,
    feedsModelRepresentation: true,
  },
  {
    role: "BIM",
    label: "BIM exchange",
    description: "A structured BIM exchange (e.g. IFC) that may carry both plan- and model-derivable information — which representation(s) it actually feeds depends on what the adapter can extract from it, never assumed upfront.",
    feedsPlanRepresentation: true,
    feedsModelRepresentation: true,
  },
  {
    role: "STRUCTURAL",
    label: "Structural",
    description: "Structural engineering drawings/model — informs StructuralElement objects and coordination checks, not spatial rooms/units.",
    feedsPlanRepresentation: false,
    feedsModelRepresentation: false,
  },
  {
    role: "MEP",
    label: "MEP",
    description: "Mechanical/electrical/plumbing drawings/model — informs future OperationalAssetBinding candidates, never spatial architecture directly.",
    feedsPlanRepresentation: false,
    feedsModelRepresentation: false,
  },
  {
    role: "SITE",
    label: "Site",
    description: "Site plan/survey — building context (orientation, boundary, approach), not the building's own interior spaces.",
    feedsPlanRepresentation: false,
    feedsModelRepresentation: false,
  },
  {
    role: "SCHEDULE",
    label: "Schedule",
    description: "Door/window/room schedules and similar tabular data — corroborating evidence for confidence scoring, never a spatial source on its own.",
    feedsPlanRepresentation: false,
    feedsModelRepresentation: false,
  },
  {
    role: "REFERENCE_IMAGE",
    label: "Reference image",
    description: "A photo or rendering — context only. Never a source of extractable spatial data (matches the 'image' format's own REQUIRES_REVIEW support level).",
    feedsPlanRepresentation: false,
    feedsModelRepresentation: false,
  },
  {
    role: "SUPPLEMENTARY",
    label: "Supplementary",
    description: "Anything else the project attaches (reports, specs, correspondence) — retained for provenance, never extracted from.",
    feedsPlanRepresentation: false,
    feedsModelRepresentation: false,
  },
];

export function sourceRoleDescriptor(role: SourceRole): SourceRoleDescriptor | undefined {
  return SOURCE_ROLE_REGISTRY.find((r) => r.role === role);
}
