// Oyi Twin Engine — Building Ingestion V1: the persistence boundary
// (brief Part B13/B2). A clean interface + an honest local/reference
// implementation — this codebase has no backend, so pretending to have
// cloud persistence would itself be a fabrication. `ProjectStore` is the
// only thing UI code depends on; swapping in a real backend later means
// implementing this same interface, not rewriting call sites.

import type { BuildingSourceRecord, ExtractedBuildingModel, MappingProposal, ProjectRecord, PublishResult, PublishedCanonicalRecord, ReviewStatus, SourceFormat, SourceRole } from "./types";

export interface CreateProjectInput {
  name: string;
  projectId: string;
  developerOwner?: string;
  projectType?: string;
  buildingType?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  orientationTrueNorthDeg?: number;
  phase: ProjectRecord["phase"];
  designRevision?: string;
  notes?: string;
}

export interface RegisterSourceInput {
  projectId: string;
  fileName: string;
  sourceFormat: SourceFormat;
  adapter: string;
  /** Building Ingestion V2 Part 3 — declared explicitly by the caller,
   * never inferred from sourceFormat (see sourceRoles.ts). Optional so
   * existing V1 call sites keep compiling unchanged. */
  role?: SourceRole;
  revision?: string;
  author?: string;
  bytes?: ArrayBuffer;
}

export interface ProjectStore {
  createProject(input: CreateProjectInput): ProjectRecord;
  listProjects(): ProjectRecord[];
  getProject(projectId: string): ProjectRecord | undefined;
  updateProjectStatus(projectId: string, status: ProjectRecord["ingestionStatus"]): void;

  /** Async because a real checksum (Part B13) requires hashing real bytes
   * when supplied — never fabricated. Idempotent: registering the exact
   * same file content twice for the same project returns the existing
   * record instead of creating a duplicate source. */
  registerSource(input: RegisterSourceInput): Promise<BuildingSourceRecord>;
  listSources(projectId: string): BuildingSourceRecord[];
  getSource(sourceId: string): BuildingSourceRecord | undefined;

  recordExtraction(sourceId: string, model: ExtractedBuildingModel): void;
  getExtraction(sourceId: string): ExtractedBuildingModel | undefined;

  recordMappings(mappings: MappingProposal[]): void;
  listMappings(sourceId: string): MappingProposal[];
  updateMappingStatus(mappingId: string, status: ReviewStatus, options?: { editedRef?: string; reviewer?: string }): void;

  publish(projectId: string): PublishResult;
  listPublished(projectId: string): PublishedCanonicalRecord[];

  /** Reference-implementation-only escape hatch for deterministic tests —
   * never used by production UI code. */
  reset(): void;
}

function nowIso(): string {
  return new Date().toISOString();
}

const STORAGE_KEY = "oyi-ingestion-v1";

interface StoreShape {
  projects: ProjectRecord[];
  sources: BuildingSourceRecord[];
  extractions: Record<string, ExtractedBuildingModel>;
  mappings: MappingProposal[];
  published: PublishedCanonicalRecord[];
}

function emptyShape(): StoreShape {
  return { projects: [], sources: [], extractions: {}, mappings: [], published: [] };
}

function hasLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

let sourceSeq = 0;
function nextSourceId(): string {
  sourceSeq += 1;
  return `src_${Date.now().toString(36)}_${sourceSeq}`;
}

/** The honest local/reference persistence implementation (Part B13's own
 * explicit instruction: "create a clean interface and an honest local/
 * reference implementation rather than pretending to have cloud
 * persistence"). Backed by localStorage when available (survives a
 * reload, the minimum a real "Create New Project" flow needs), falling
 * back to a plain in-memory object in any non-browser context (tests,
 * SSR) — same data shape either way. */
export class LocalProjectStore implements ProjectStore {
  private memory: StoreShape = emptyShape();

  private read(): StoreShape {
    if (!hasLocalStorage()) return this.memory;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as StoreShape) : emptyShape();
    } catch {
      return emptyShape();
    }
  }

  private write(shape: StoreShape): void {
    if (!hasLocalStorage()) {
      this.memory = shape;
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shape));
    } catch {
      this.memory = shape;
    }
  }

  createProject(input: CreateProjectInput): ProjectRecord {
    const shape = this.read();
    const existing = shape.projects.find((p) => p.projectId === input.projectId);
    if (existing) return existing;
    const record: ProjectRecord = {
      projectId: input.projectId,
      name: input.name,
      developerOwner: input.developerOwner,
      projectType: input.projectType,
      buildingType: input.buildingType,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      orientationTrueNorthDeg: input.orientationTrueNorthDeg,
      phase: input.phase,
      designRevision: input.designRevision,
      notes: input.notes,
      ingestionStatus: "not_started",
      createdAt: nowIso(),
    };
    shape.projects.push(record);
    this.write(shape);
    return record;
  }

  listProjects(): ProjectRecord[] {
    return this.read().projects;
  }

  getProject(projectId: string): ProjectRecord | undefined {
    return this.read().projects.find((p) => p.projectId === projectId);
  }

  updateProjectStatus(projectId: string, status: ProjectRecord["ingestionStatus"]): void {
    const shape = this.read();
    const project = shape.projects.find((p) => p.projectId === projectId);
    if (!project) return;
    project.ingestionStatus = status;
    this.write(shape);
  }

  async registerSource(input: RegisterSourceInput): Promise<BuildingSourceRecord> {
    const checksum = input.bytes ? await sha256Hex(input.bytes) : undefined;
    if (checksum) {
      // Idempotent registration: the SAME file (by content, not just
      // name) registered twice for the same project returns the
      // existing record rather than creating a duplicate source.
      const existing = this.read().sources.find((s) => s.projectId === input.projectId && s.checksum === checksum);
      if (existing) return existing;
    }
    const shape = this.read();
    const record: BuildingSourceRecord = {
      sourceId: nextSourceId(),
      projectId: input.projectId,
      fileName: input.fileName,
      sourceFormat: input.sourceFormat,
      role: input.role,
      revision: input.revision,
      registeredAt: nowIso(),
      author: input.author,
      checksum,
      fileSizeBytes: input.bytes?.byteLength,
      adapter: input.adapter,
      extractionStatus: "pending",
      normalizationStatus: "pending",
      reviewStatus: "pending",
    };
    shape.sources.push(record);
    this.write(shape);
    return record;
  }

  listSources(projectId: string): BuildingSourceRecord[] {
    return this.read().sources.filter((s) => s.projectId === projectId);
  }

  getSource(sourceId: string): BuildingSourceRecord | undefined {
    return this.read().sources.find((s) => s.sourceId === sourceId);
  }

  recordExtraction(sourceId: string, model: ExtractedBuildingModel): void {
    const shape = this.read();
    const source = shape.sources.find((s) => s.sourceId === sourceId);
    if (!source) return;
    shape.extractions[sourceId] = model; // re-running extraction overwrites, never duplicates
    source.extractionStatus = "extracted";
    this.write(shape);
  }

  getExtraction(sourceId: string): ExtractedBuildingModel | undefined {
    return this.read().extractions[sourceId];
  }

  recordMappings(mappings: MappingProposal[]): void {
    if (mappings.length === 0) return;
    const shape = this.read();
    // Replace-by-source, not upsert-by-mappingId: normalization is a full
    // re-derivation from the current extraction (matching
    // recordExtraction's own "re-running overwrites, never duplicates"
    // discipline), and mappingIds are freshly minted every call — an
    // upsert-only merge would silently accumulate duplicate proposals for
    // the same real object if normalization ever runs twice for the same
    // source (e.g. a double-invoked effect in dev), which would be a real,
    // user-visible "530 mappings for 265 objects" bug, not a cosmetic one.
    const sourceId = mappings[0].buildingSourceId;
    shape.mappings = shape.mappings.filter((m) => m.buildingSourceId !== sourceId);
    shape.mappings.push(...mappings);
    const source = shape.sources.find((s) => s.sourceId === sourceId);
    if (source) source.normalizationStatus = "normalized";
    this.write(shape);
  }

  listMappings(sourceId: string): MappingProposal[] {
    return this.read().mappings.filter((m) => m.buildingSourceId === sourceId);
  }

  updateMappingStatus(mappingId: string, status: ReviewStatus, options?: { editedRef?: string; reviewer?: string }): void {
    const shape = this.read();
    const mapping = shape.mappings.find((m) => m.mappingId === mappingId);
    if (!mapping) return;
    mapping.status = status;
    mapping.reviewedAt = nowIso();
    if (options?.reviewer) mapping.reviewer = options.reviewer;
    if (options?.editedRef) mapping.editedRef = options.editedRef;
    const source = shape.sources.find((s) => s.sourceId === mapping.buildingSourceId);
    if (source) source.reviewStatus = "in_review";
    this.write(shape);
  }

  publish(projectId: string): PublishResult {
    const shape = this.read();
    const projectMappings = shape.mappings.filter((m) => m.projectId === projectId);
    const published: PublishedCanonicalRecord[] = [];
    const skipped: PublishResult["skipped"] = [];
    for (const mapping of projectMappings) {
      // The ONLY door into canonical truth: CONFIRMED or EDITED (a human
      // corrected it, then it must still be explicitly confirmed status
      // — EDITED here means "edited AND accepted", never a silent pass).
      if (mapping.status !== "CONFIRMED" && mapping.status !== "EDITED") {
        skipped.push({ mappingId: mapping.mappingId, status: mapping.status, reason: `status is ${mapping.status}, not CONFIRMED/EDITED — remains unresolved, never silently canonical` });
        continue;
      }
      const ref = mapping.editedRef ?? mapping.proposedRef;
      if (!ref) {
        skipped.push({ mappingId: mapping.mappingId, status: mapping.status, reason: "no resolved ref available" });
        continue;
      }
      const record: PublishedCanonicalRecord = { ref, projectId, mappingId: mapping.mappingId, targetKind: mapping.targetKind, publishedAt: nowIso() };
      published.push(record);
    }
    // No duplicate canonical refs from this publish pass.
    const seen = new Set<string>();
    const deduped = published.filter((p) => (seen.has(p.ref) ? false : (seen.add(p.ref), true)));
    const duplicates = published.length - deduped.length;
    if (duplicates > 0) {
      for (const p of published) if (!deduped.includes(p)) skipped.push({ mappingId: p.mappingId, status: "CONFIRMED", reason: `duplicate canonical ref ${p.ref} — already published from another mapping in this project` });
    }
    shape.published = [...shape.published.filter((p) => p.projectId !== projectId), ...deduped];
    const project = shape.projects.find((p) => p.projectId === projectId);
    if (project) project.ingestionStatus = "published";
    this.write(shape);
    return { publishedCount: deduped.length, published: deduped, skipped };
  }

  listPublished(projectId: string): PublishedCanonicalRecord[] {
    return this.read().published.filter((p) => p.projectId === projectId);
  }

  reset(): void {
    this.write(emptyShape());
  }
}

export const projectStore = new LocalProjectStore();
