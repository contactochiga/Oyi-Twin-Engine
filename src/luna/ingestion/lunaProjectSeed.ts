// Luna — Building Ingestion V1: wires Luna Residences into the generic
// intake model as the first reference project (brief Part B11/B19). This
// does NOT rebuild Luna's architecture — it represents the EXISTING
// procedural building as an ingested/normalized project, proving the
// pipeline end-to-end. Luna is simply the first project that exercises
// the system, never hardcoded as the only one (Part B2's own instruction).

import type { ProjectStore } from "../../engine/ingestion/projectStore";
import { LUNA_PROCEDURAL_ADAPTER_ID, lunaProceduralAdapter } from "./lunaProceduralAdapter";
import { normalizeLunaExtraction } from "./lunaNormalizer";

export const LUNA_PROJECT_ID = "LUNA";

// React 19/StrictMode mounts effects twice in dev — two near-simultaneous
// calls to ensureLunaProject() would otherwise both see "not yet
// extracted", both run normalization, and (since recordMappings replaces
// by source) the second call's fresh mappingIds would silently orphan
// any review action already taken against the first call's mappingIds.
// A simple in-flight guard makes concurrent calls await the SAME run
// instead of racing — this is a real concurrency fix, not a cosmetic one.
let inFlight: Promise<{ project: ReturnType<ProjectStore["createProject"]>; source: Awaited<ReturnType<ProjectStore["registerSource"]>> }> | null = null;

/** Idempotent AND safe under concurrent invocation — safe to call on
 * every app load. createProject/registerSource both already return the
 * existing record rather than duplicating one. */
export function ensureLunaProject(store: ProjectStore) {
  if (!inFlight) inFlight = runEnsureLunaProject(store).finally(() => { inFlight = null; });
  return inFlight;
}

async function runEnsureLunaProject(store: ProjectStore) {
  const project = store.createProject({
    projectId: LUNA_PROJECT_ID,
    name: "Luna Residences",
    developerOwner: "Ochiga Properties",
    projectType: "Residential Tower",
    buildingType: "Residential — Mixed Tier (Standard/Premium/Penthouse)",
    address: "Lagos, Nigeria",
    phase: "reference",
    designRevision: "R1",
    notes: "First reference project exercising Building Ingestion V1. Represents the EXISTING procedural Luna building as an ingested/normalized project — the procedural implementation remains the current live Twin; this does not replace it.",
  });

  const existingSources = store.listSources(project.projectId);
  let source = existingSources.find((s) => s.adapter === LUNA_PROCEDURAL_ADAPTER_ID);
  if (!source) {
    source = await store.registerSource({
      projectId: project.projectId,
      fileName: "luna-procedural-reference (in-application data)",
      sourceFormat: "gltf",
      adapter: LUNA_PROCEDURAL_ADAPTER_ID,
      revision: "R1",
      author: "Oyi Twin Engine (procedural)",
    });
  }

  if (!store.getExtraction(source.sourceId)) {
    store.updateProjectStatus(project.projectId, "extracting");
    const model = await lunaProceduralAdapter.extract(source);
    store.recordExtraction(source.sourceId, model);
    const mappings = normalizeLunaExtraction(model, project.projectId);
    store.recordMappings(mappings);
    store.updateProjectStatus(project.projectId, "review");
  }

  return { project, source };
}
