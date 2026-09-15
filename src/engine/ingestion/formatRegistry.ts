// Oyi Twin Engine — Building Ingestion V1: the source-format support
// registry (brief Part B3). Every format the intake UI offers must have
// a real entry here — the system must never imply support it doesn't
// have. Levels are re-verified against the actual codebase, not
// aspirational: "glb" is PARTIALLY_SUPPORTED because
// src/luna/architecture/groundAsset.ts is a real, working, security-
// hardened GLB/glTF loader + validator + semantic binder — but it is
// currently scoped to exactly one bounded case (the Ground envelope,
// one binding role), not a general multi-object ingestion adapter.

import type { SourceFormatDescriptor } from "./types";

export const SOURCE_FORMAT_REGISTRY: SourceFormatDescriptor[] = [
  {
    format: "ifc",
    category: "primary",
    label: "IFC",
    supportLevel: "REQUIRES_CONVERSION",
    note: "A structured BIM source with real semantic/relationship data — the best target for a future adapter — but no IFC parser exists in this codebase yet. No adapter is implemented.",
  },
  {
    format: "rvt",
    category: "primary",
    label: "Revit (RVT)",
    supportLevel: "REQUIRES_CONVERSION",
    note: "A structured BIM source, but Revit's native format requires a conversion path (e.g. to IFC or glTF) before this pipeline can read it. No adapter is implemented.",
  },
  {
    format: "archicad",
    category: "primary",
    label: "Archicad",
    supportLevel: "REQUIRES_CONVERSION",
    note: "Same class as RVT — structured BIM source requiring an export/conversion step before ingestion. No adapter is implemented.",
  },
  {
    format: "skp",
    category: "secondary",
    label: "SketchUp (SKP)",
    supportLevel: "VISUAL_ONLY",
    note: "Geometry-only source with no reliable structured semantics (spaces/levels/relationships are not consistently encoded). Would need conversion to glTF for even visual loading. No adapter is implemented.",
  },
  {
    format: "glb",
    category: "secondary",
    label: "GLB",
    supportLevel: "PARTIALLY_SUPPORTED",
    note: "A real, working, security-validated loader already exists (src/luna/architecture/groundAsset.ts) — GLB/glTF 2.0, embedded buffers/images only, explicit node-name-to-canonical-ref bindings, budget limits, checksum verification. It is scoped to exactly one bounded case today (the Ground envelope, single 'envelope' binding role) and must be GENERALIZED for multi-object ingestion, not replaced.",
  },
  {
    format: "gltf",
    category: "secondary",
    label: "glTF",
    supportLevel: "PARTIALLY_SUPPORTED",
    note: "Same pipeline and same scope caveat as GLB — the loader accepts either container.",
  },
  {
    format: "pdf",
    category: "document",
    label: "PDF plans",
    supportLevel: "REQUIRES_REVIEW",
    note: "A document/draft source requiring human interpretation — no automated extraction is implemented or claimed. Every object detected from a PDF must enter review as DESIGN_DECISION_REQUIRED or UNRESOLVED, never a confident proposal.",
  },
  {
    format: "cad",
    category: "document",
    label: "CAD / drawing exports",
    supportLevel: "REQUIRES_REVIEW",
    note: "Same class as PDF plans — 2D drawing data requiring human interpretation. No adapter is implemented.",
  },
  {
    format: "image",
    category: "document",
    label: "Image references",
    supportLevel: "REQUIRES_REVIEW",
    note: "Reference-only (e.g. a site photo or rendering) — never a source of extractable spatial data. No adapter is implemented.",
  },
];

export function formatDescriptor(format: string): SourceFormatDescriptor | undefined {
  return SOURCE_FORMAT_REGISTRY.find((f) => f.format === format);
}
