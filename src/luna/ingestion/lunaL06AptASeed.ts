// Luna Architectural Reality V2 — registers L06 Apartment A as a SECOND
// BuildingSource on the existing LUNA project (brief Parts 3/13/30). Not
// a new project, not a new store, not a new pipeline: this proves the
// exact same Building Ingestion V1 architecture (adapter -> extract ->
// normalize -> review -> publish) reaches apartment/room granularity, not
// just whole-building — the LUNA project itself was already created by
// ensureLunaProject() (lunaProjectSeed.ts), which this depends on having
// run first (App.tsx sequences both in its one seed effect).

import type { ProjectStore } from "../../engine/ingestion/projectStore";
import { LUNA_PROJECT_ID } from "./lunaProjectSeed";
import { LUNA_L06_APT_A_ADAPTER_ID, lunaL06AptAAdapter } from "./lunaL06AptAAdapter";
import { normalizeL06AptAExtraction } from "./lunaL06AptANormalizer";

// Same React 19 StrictMode double-effect-invocation hazard the whole-
// building seed already had to guard against (see lunaProjectSeed.ts's
// own comment) — identical fix, same reasoning, applied independently
// here since this is a second, separate seed call.
let inFlight: ReturnType<typeof runEnsureL06AptAGoldStandardSource> | null = null;

export function ensureL06AptAGoldStandardSource(store: ProjectStore) {
  if (!inFlight) inFlight = runEnsureL06AptAGoldStandardSource(store).finally(() => { inFlight = null; });
  return inFlight;
}

async function runEnsureL06AptAGoldStandardSource(store: ProjectStore) {
  const existingSources = store.listSources(LUNA_PROJECT_ID);
  let source = existingSources.find((s) => s.adapter === LUNA_L06_APT_A_ADAPTER_ID);
  if (!source) {
    source = await store.registerSource({
      projectId: LUNA_PROJECT_ID,
      fileName: "luna-l06-apt-a-procedural-reference (in-application data)",
      sourceFormat: "gltf",
      adapter: LUNA_L06_APT_A_ADAPTER_ID,
      revision: "R1",
      author: "Oyi Twin Engine (procedural — Architectural Reality V2 reference fixture)",
    });
  }

  if (!store.getExtraction(source.sourceId)) {
    const model = await lunaL06AptAAdapter.extract(source);
    store.recordExtraction(source.sourceId, model);
    const mappings = normalizeL06AptAExtraction(model, LUNA_PROJECT_ID);
    store.recordMappings(mappings);
  }

  return { source };
}
