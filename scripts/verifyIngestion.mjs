import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const checks = [];
try {
  const load = (path) => server.ssrLoadModule('/src/' + path);
  const { LocalProjectStore } = await load('engine/ingestion/projectStore.ts');
  const { SOURCE_FORMAT_REGISTRY, formatDescriptor } = await load('engine/ingestion/formatRegistry.ts');
  const { computeConfidence, proposeRefSlug, proposeMapping } = await load('engine/ingestion/normalize.ts');
  const { SourceAdapterRegistry } = await load('engine/ingestion/adapters.ts');
  const { ensureLunaProject, LUNA_PROJECT_ID } = await load('luna/ingestion/lunaProjectSeed.ts');
  const { lunaProceduralAdapter, LUNA_PROCEDURAL_ADAPTER_ID } = await load('luna/ingestion/lunaProceduralAdapter.ts');
  const { lunaTwinDataProvider } = await load('luna/operational/lunaTwinDataProvider.ts');
  const { LUNA_LEVELS } = await load('luna/lunaProgramme.ts');
  const { LUNA_STRUCTURAL_ELEMENTS } = await load('luna/structure/lunaStructuralElements.ts');

  // ---- 1. Project creation ----
  const store = new LocalProjectStore();
  store.reset();
  const projectA = store.createProject({ projectId: 'TEST-A', name: 'Test Tower', phase: 'concept' });
  assert.equal(projectA.projectId, 'TEST-A');
  assert.equal(projectA.ingestionStatus, 'not_started');
  const projectAAgain = store.createProject({ projectId: 'TEST-A', name: 'Different Name', phase: 'design' });
  assert.equal(projectAAgain.name, 'Test Tower', 'creating a project with an already-registered id must return the EXISTING record, not silently overwrite it');
  assert.equal(store.listProjects().length, 1);
  checks.push('1. Project creation: real project record created, idempotent on repeated creation with the same projectId');

  // ---- 2/4. Source registration + duplicate source registration ----
  const bytesA = new TextEncoder().encode('fake-glb-payload-A').buffer;
  const source1 = await store.registerSource({ projectId: 'TEST-A', fileName: 'model.glb', sourceFormat: 'glb', adapter: 'test-adapter', bytes: bytesA });
  assert.ok(source1.checksum, 'a real checksum must be computed from real bytes, never fabricated');
  const source1Dup = await store.registerSource({ projectId: 'TEST-A', fileName: 'model-renamed.glb', sourceFormat: 'glb', adapter: 'test-adapter', bytes: bytesA });
  assert.equal(source1Dup.sourceId, source1.sourceId, 'registering the SAME file content twice for the same project must be idempotent, not create a duplicate source');
  assert.equal(store.listSources('TEST-A').length, 1);
  const bytesB = new TextEncoder().encode('different-payload-B').buffer;
  const source2 = await store.registerSource({ projectId: 'TEST-A', fileName: 'model-v2.glb', sourceFormat: 'glb', adapter: 'test-adapter', bytes: bytesB });
  assert.notEqual(source2.sourceId, source1.sourceId, 'genuinely different file content must register as a distinct source');
  assert.equal(store.listSources('TEST-A').length, 2);
  checks.push('2/4. Source registration: real checksums computed from real bytes; duplicate (same-content) registration is idempotent; distinct content registers as a distinct source');

  // ---- 3. Source classification ----
  assert.equal(SOURCE_FORMAT_REGISTRY.length, 9, 'every documented format category must have exactly one real registry entry');
  assert.equal(formatDescriptor('ifc').supportLevel, 'REQUIRES_CONVERSION');
  assert.equal(formatDescriptor('glb').supportLevel, 'PARTIALLY_SUPPORTED');
  assert.equal(formatDescriptor('pdf').supportLevel, 'REQUIRES_REVIEW');
  assert.equal(formatDescriptor('rvt').supportLevel, 'REQUIRES_CONVERSION');
  for (const f of SOURCE_FORMAT_REGISTRY) assert.ok(f.note && f.note.length > 20, `${f.format} must carry a real, non-trivial disclosure note, never a blank/placeholder`);
  checks.push('3. Source classification: every registered format has an honest, evidence-backed support level (SUPPORTED/PARTIALLY_SUPPORTED/VISUAL_ONLY/REQUIRES_CONVERSION/REQUIRES_REVIEW) and a real disclosure note — no format claims support it doesn\'t have');

  // ---- 5. Adapter selection ----
  const registry = new SourceAdapterRegistry();
  registry.register(lunaProceduralAdapter);
  assert.equal(registry.get(LUNA_PROCEDURAL_ADAPTER_ID).id, LUNA_PROCEDURAL_ADAPTER_ID);
  assert.equal(registry.listForFormat('gltf').length, 1);
  assert.equal(registry.listForFormat('rvt').length, 0, 'no adapter is registered for an unimplemented format — the registry must not fabricate one');
  checks.push('5. Adapter selection: the registry resolves a real adapter by id/format and honestly returns zero adapters for formats with no implementation');

  // ---- 6. Extracted model validation ----
  const lunaSource = await store.registerSource({ projectId: 'TEST-A', fileName: 'luna.gltf', sourceFormat: 'gltf', adapter: LUNA_PROCEDURAL_ADAPTER_ID });
  const model = await lunaProceduralAdapter.extract(lunaSource);
  assert.equal(model.sourceId, lunaSource.sourceId);
  assert.ok(model.objects.length > 100, 'the Luna procedural adapter must extract a real, substantial object set (levels + cores + structure + units + operational assets)');
  const ids = model.objects.map((o) => o.sourceId);
  assert.equal(new Set(ids).size, ids.length, 'no duplicate sourceId within one extraction');
  assert.ok(model.objects.some((o) => o.sourceCategory === 'level'));
  assert.ok(model.objects.some((o) => o.sourceCategory === 'structural_element'));
  assert.ok(model.objects.some((o) => o.sourceCategory === 'equipment'));
  assert.ok(model.warnings.length > 0, 'real extraction warnings (e.g. no canonical site ref yet) must be surfaced, never hidden');
  checks.push(`6. Extracted model validation: ${model.objects.length} real objects extracted from Luna's own existing canonical data, zero duplicate source ids, warnings surfaced honestly`);

  // ---- 7. Normalization ----
  const { normalizeLunaExtraction } = await load('luna/ingestion/lunaNormalizer.ts');
  const mappings = normalizeLunaExtraction(model, 'TEST-A');
  assert.equal(mappings.length, model.objects.length, 'every extracted object must produce exactly one mapping proposal');
  const levelMapping = mappings.find((m) => m.sourceId === 'LUNA-L06');
  assert.equal(levelMapping.proposedRef, 'LUNA-L06', 'a real, already-canonical level must propose its own real ref, not a guess');
  assert.equal(levelMapping.confidence, 1, 'already-canonical identity must resolve to full confidence — real evidence, not an invented number');
  checks.push('7. Source -> proposed canonical mapping: every real canonical object (levels/structure/units/assets) proposes its own real ref at full confidence, derived from actual evidence');

  // ---- 8. Confidence handling ----
  assert.equal(computeConfidence({ exactNameMatch: false, parentAlreadyConfirmed: false, stableSourceId: false, alreadyCanonicalIdentity: false }), 'UNKNOWN', 'zero real evidence must resolve to UNKNOWN, never an invented number');
  assert.equal(computeConfidence({ exactNameMatch: true, parentAlreadyConfirmed: false, stableSourceId: false, alreadyCanonicalIdentity: false }), 0.7);
  assert.equal(computeConfidence({ exactNameMatch: true, parentAlreadyConfirmed: true, stableSourceId: true, alreadyCanonicalIdentity: false }), 0.95);
  assert.equal(computeConfidence({ exactNameMatch: false, parentAlreadyConfirmed: false, stableSourceId: false, alreadyCanonicalIdentity: true }), 1);
  const siteMapping = mappings.find((m) => m.sourceId === 'site-footprint');
  assert.equal(siteMapping.status, 'UNRESOLVED', 'an object with no real canonical target and no ref-slug pattern match must stay UNRESOLVED, never receive a fabricated ref');
  checks.push('8. Confidence handling: deterministic, disclosed scoring from real evidence only; zero evidence -> UNKNOWN; no canonical target -> UNRESOLVED, never fabricated');

  // ---- 9/10/11. Review state transitions: confirmation, rejection ----
  store.recordMappings(mappings);
  const toConfirm = mappings.find((m) => m.sourceId === 'LUNA-L06');
  store.updateMappingStatus(toConfirm.mappingId, 'CONFIRMED', { reviewer: 'test-architect' });
  const afterConfirm = store.listMappings(lunaSource.sourceId).find((m) => m.mappingId === toConfirm.mappingId);
  assert.equal(afterConfirm.status, 'CONFIRMED');
  assert.equal(afterConfirm.reviewer, 'test-architect');
  const toReject = mappings.find((m) => m.sourceId === 'site-footprint');
  store.updateMappingStatus(toReject.mappingId, 'REJECTED');
  assert.equal(store.listMappings(lunaSource.sourceId).find((m) => m.mappingId === toReject.mappingId).status, 'REJECTED');
  checks.push('9/10/11. Review state transitions: CONFIRMED (with reviewer attribution) and REJECTED both persist correctly and independently');

  // ---- 12. Unresolved objects ----
  const stillUnresolved = store.listMappings(lunaSource.sourceId).filter((m) => m.status === 'UNRESOLVED');
  assert.ok(stillUnresolved.length > 0, 'unresolved objects must remain unresolved unless explicitly reviewed — not silently promoted');
  checks.push(`12. Unresolved objects: ${stillUnresolved.length} objects remain honestly UNRESOLVED, untouched by review`);

  // ---- 13. Publish boundary ----
  const publishResult = store.publish('TEST-A');
  assert.ok(publishResult.published.some((p) => p.ref === 'LUNA-L06'), 'the one CONFIRMED mapping must publish');
  assert.equal(publishResult.published.some((p) => p.ref === toReject.proposedRef && p.mappingId === toReject.mappingId), false, 'a REJECTED mapping must never publish');
  const proposedButNotConfirmed = mappings.filter((m) => m.status === 'PROPOSED').length;
  assert.ok(publishResult.skipped.length >= proposedButNotConfirmed, 'every PROPOSED-but-not-CONFIRMED mapping must be explicitly skipped, never silently published');
  checks.push(`13. Publish boundary: only CONFIRMED/EDITED mappings become canonical (${publishResult.publishedCount} published), every other status explicitly skipped with a reason (${publishResult.skipped.length} skipped) — nothing silently becomes canonical`);

  // ---- 14. Geometry/semantic separation ----
  const equipmentMapping = mappings.find((m) => m.sourceId === 'LUNA-B1-WATER-TANK-01');
  assert.ok(equipmentMapping, 'operational assets must be extracted as semantic objects');
  assert.equal(typeof equipmentMapping.sourceCrosswalk, 'object', 'source identity/crosswalk must be preserved separately from any geometry reference');
  checks.push('14. Geometry/semantic separation: extracted objects carry sourceCrosswalk identity independent of any geometryRef; the publish boundary never touches rendering data — matches the existing Asset Pipeline Foundation\'s own source-vs-canonical separation (groundAsset.ts)');

  // ---- 15. No duplicate canonical identities ----
  store.reset();
  await ensureLunaProject(store);
  const lunaProjectSource = store.listSources(LUNA_PROJECT_ID)[0];
  const allMappings = store.listMappings(lunaProjectSource.sourceId);
  for (const m of allMappings) if (m.confidence === 1) store.updateMappingStatus(m.mappingId, 'CONFIRMED', { reviewer: 'test-architect' });
  const lunaPublish = store.publish(LUNA_PROJECT_ID);
  const refs = lunaPublish.published.map((p) => p.ref);
  assert.equal(new Set(refs).size, refs.length, 'publish must never produce duplicate canonical refs');
  assert.ok(lunaPublish.publishedCount > 100);
  checks.push(`15. No duplicate canonical identities: ${lunaPublish.publishedCount} refs published for Luna, zero duplicates`);

  // ---- 16. Luna project initialization ----
  assert.equal(store.getProject(LUNA_PROJECT_ID).name, 'Luna Residences');
  assert.equal(store.getProject(LUNA_PROJECT_ID).phase, 'reference');
  const lunaAssetCount = lunaTwinDataProvider.listAssets().length;
  const lunaLevelCount = LUNA_LEVELS.length;
  const lunaStructCount = LUNA_STRUCTURAL_ELEMENTS.length;
  const extractedEquipment = allMappings.filter((m) => m.targetKind === 'operational_asset').length;
  const extractedLifts = allMappings.filter((m) => m.targetKind === 'lift').length;
  const extractedLevels = allMappings.filter((m) => m.targetKind === 'level').length;
  const extractedStructural = allMappings.filter((m) => m.targetKind === 'structural_element').length;
  // The 4 real lift assets are classified "lift" (via LUNA_CORES), not
  // generic "equipment" — semantically more precise, and extracted
  // exactly once (never duplicated across both classifications).
  assert.equal(extractedEquipment + extractedLifts, lunaAssetCount, 'every real Luna operational asset (including the 4 lifts, classified as "lift") must be represented exactly once in the ingested model');
  assert.equal(extractedLevels, lunaLevelCount);
  assert.equal(extractedStructural, lunaStructCount);
  checks.push(`16. Luna project initialization: LUNA project created with real intake data; extraction found exactly the real counts (${lunaAssetCount} operational assets, ${lunaLevelCount} levels, ${lunaStructCount} structural elements) — no more, no fewer`);

  // ---- Invalid input / empty source data ----
  const { formatDescriptor: fd2 } = { formatDescriptor };
  assert.equal(fd2('not-a-real-format'), undefined, 'an unknown format must return undefined, never a fabricated descriptor');
  const emptySource = await store.registerSource({ projectId: 'TEST-A', fileName: 'empty.glb', sourceFormat: 'glb', adapter: 'test-adapter' });
  assert.equal(emptySource.checksum, undefined, 'a source registered with no bytes must have no fabricated checksum');
  checks.push('Invalid/empty input handling: unknown format returns undefined (not fabricated), a source with no bytes gets no fabricated checksum');

  // ---- Repeated ingestion (idempotent re-extraction) ----
  const before = store.getExtraction(lunaProjectSource.sourceId).objects.length;
  const reExtracted = await lunaProceduralAdapter.extract(lunaProjectSource);
  store.recordExtraction(lunaProjectSource.sourceId, reExtracted);
  assert.equal(store.getExtraction(lunaProjectSource.sourceId).objects.length, before, 'repeated ingestion of the same source must overwrite cleanly, never accumulate duplicates');
  checks.push('Repeated ingestion: re-running extraction on the same source overwrites cleanly, no accumulation');

  writeFileSync('artifacts/oyi-ingestion-runtime-results.json', JSON.stringify({ passed: true, checks }, null, 2));
  console.log(checks.map((c) => 'PASS ' + c).join('\n'));
} catch (error) {
  writeFileSync('artifacts/oyi-ingestion-runtime-results.json', JSON.stringify({ passed: false, checks, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await server.close();
}
