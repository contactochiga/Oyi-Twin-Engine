import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const checks = [];
try {
  const load = (path) => server.ssrLoadModule('/src/' + path);
  const { LocalProjectStore } = await load('engine/ingestion/projectStore.ts');
  const { lunaL06AptAAdapter, LUNA_L06_APT_A_ADAPTER_ID, l06AptADoorRef } = await load('luna/ingestion/lunaL06AptAAdapter.ts');
  const { normalizeL06AptAExtraction } = await load('luna/ingestion/lunaL06AptANormalizer.ts');
  const { ensureL06AptAGoldStandardSource } = await load('luna/ingestion/lunaL06AptASeed.ts');
  const { ensureLunaProject, LUNA_PROJECT_ID } = await load('luna/ingestion/lunaProjectSeed.ts');
  const { LUNA_L06_APT_A } = await load('luna/interiors/lunaInteriors.ts');
  const { checkL06AptAStructuralCoordination } = await load('luna/architecture/l06AptAStructuralCoordination.ts');
  const { deriveL06AptARoomServiceInterfaces } = await load('luna/architecture/l06AptAServiceInterfaces.ts');
  const { buildL06AptAGoldStandardRegistry } = await load('luna/architecture/l06AptAGoldStandard.ts');
  const { L06_APT_A_FRAME_CONTRACT, L06_APT_A_SOURCE_FRAME, MASSING_TO_PLAN_OFFSET, sourceToBuildingFrame } = await load('luna/architecture/l06AptAFrame.ts');
  const { lunaRepresentationPolicy } = await load('luna/policy/lunaRepresentationPolicy.ts');

  const store = new LocalProjectStore();
  store.reset();

  // ---- 1. L06 A source registration ----
  await ensureLunaProject(store);
  const { source } = await ensureL06AptAGoldStandardSource(store);
  assert.equal(source.adapter, LUNA_L06_APT_A_ADAPTER_ID);
  assert.equal(source.projectId, LUNA_PROJECT_ID);
  const sourcesAfter = store.listSources(LUNA_PROJECT_ID);
  assert.ok(sourcesAfter.some((s) => s.adapter === LUNA_L06_APT_A_ADAPTER_ID), 'L06 Apartment A must be registered as its own BuildingSource on the existing LUNA project');
  assert.ok(sourcesAfter.length >= 2, 'the LUNA project must now carry at least two real sources (whole-building + L06 Apt A)');
  checks.push('1. L06 A source registration: registered as a second real BuildingSource on the existing LUNA project, not a new project or a new store');

  // ---- 2. Source -> apartment mapping ----
  const model = await lunaL06AptAAdapter.extract(source);
  const apartmentObject = model.objects.find((o) => o.sourceId === LUNA_L06_APT_A.interiorRef);
  assert.ok(apartmentObject, 'the apartment itself must be extracted as a real object');
  assert.equal(apartmentObject.sourceCategory, 'home');
  const mappings = normalizeL06AptAExtraction(model, LUNA_PROJECT_ID);
  const apartmentMapping = mappings.find((m) => m.sourceId === LUNA_L06_APT_A.interiorRef);
  assert.equal(apartmentMapping.proposedRef, 'LUNA-L06-APT-A', 'the apartment must map to its OWN existing canonical ref, never a new one');
  assert.equal(apartmentMapping.confidence, 1, 'the apartment identity is already canonical — full confidence, real evidence');
  checks.push('2. Source -> apartment mapping: LUNA-L06-APT-A extracted and mapped to its own already-canonical ref at full confidence');

  // ---- 3. Room mapping ----
  assert.equal(model.objects.filter((o) => o.sourceCategory === 'room').length, LUNA_L06_APT_A.rooms.length, 'every one of the apartment\'s real rooms must be extracted exactly once');
  const kitchenMapping = mappings.find((m) => m.sourceId === 'LUNA-L06-APT-A-KITCHEN');
  assert.equal(kitchenMapping.proposedRef, 'LUNA-L06-APT-A-KITCHEN', 'a real, already-authored room must map to its own existing ref');
  assert.equal(kitchenMapping.targetKind, 'room');
  checks.push(`3. Room mapping: all ${LUNA_L06_APT_A.rooms.length} real rooms extracted and mapped to their own existing canonical refs`);

  // ---- 4. Mapping confidence ----
  for (const room of LUNA_L06_APT_A.rooms) {
    const m = mappings.find((mm) => mm.sourceId === room.ref);
    assert.equal(m.confidence, 1, `${room.ref}: an already-canonical room must resolve to full confidence, not an invented lower number`);
  }
  const doorMappings = mappings.filter((m) => m.targetKind === 'door');
  assert.ok(doorMappings.every((m) => typeof m.confidence === 'number' && m.confidence < 1), 'newly-proposed door identities must carry real, sub-1.0 confidence — never silently treated as already-canonical');
  checks.push('4. Mapping confidence: rooms/apartment (already-canonical) score full confidence; doors (newly proposed) score a real, lower, evidence-based confidence — an honest gradient, not uniform certainty');

  // ---- 5. Unresolved room handling ----
  // UPDATED (Apartment A Full Interior Reality V1): all 14 rooms now carry
  // their door(s) via the richer `doors` array instead of the single
  // `doorSide` field it superseded (RoomLayoutSpec's own doc comment says
  // `doors` replaces `doorSide` entirely when supplied) — checking for
  // EITHER preserves this assertion's original intent (every room has a
  // real, resolved door) without asserting a shape this apartment no
  // longer uses.
  const roomsWithoutDoor = LUNA_L06_APT_A.rooms.filter((r) => !r.doorSide && !(r.doors && r.doors.length));
  assert.equal(roomsWithoutDoor.length, 0, 'sanity: every current L06 Apt A room has a real door (doorSide or doors[]) today');
  assert.ok(model.warnings.some((w) => w.includes('window')), 'the adapter must honestly disclose that no window objects exist per-room, never fabricate one');
  checks.push('5. Unresolved handling: no window objects exist per room and this is disclosed via a real extraction warning, never silently invented');

  // ---- 6. Coordinate transform ----
  assert.equal(L06_APT_A_FRAME_CONTRACT.chain.length, 5);
  // RESOLVED (True Floor Plan System V1, L06 Gold Standard, Part 2): the
  // plan frame and massing frame used to diverge (-10.5 vs -8.1818) —
  // that phase's own real-core coordination work found the unreconciled
  // massing frame silently overlapping the real Lift 01/02 shafts, so the
  // 2D plan now reads the SAME LUNA_L06_UNITS entry the massing box does.
  // This assertion is updated to check convergence, not divergence.
  assert.ok(Math.abs(L06_APT_A_FRAME_CONTRACT.apartmentMassing.x - (-8.1818)) < 0.01, 'the massing frame origin must match the real, actually-rendered UnitVolume position');
  assert.equal(L06_APT_A_FRAME_CONTRACT.apartmentPlan.x, L06_APT_A_FRAME_CONTRACT.apartmentMassing.x, 'the plan frame origin must now equal the massing frame origin exactly (Part 2 resolution)');
  assert.equal(MASSING_TO_PLAN_OFFSET.offsetX, 0, 'the disclosed offset must be exactly zero now that the two frames are unified');
  assert.deepEqual(sourceToBuildingFrame({ x: 3, z: 4 }), { x: 3, z: 4 }, 'with no real source bound yet, the source->building transform must be the identity, never a fabricated one');
  checks.push('6. Coordinate transform: the massing/plan frame divergence this phase originally disclosed was resolved by a later phase (L06 Gold Standard Part 2) — both frames now read the same live value, computed not hand-typed; source frame remains an honest identity transform pending a real source');

  // ---- 7. Asset binding readiness ----
  assert.equal(L06_APT_A_SOURCE_FRAME.status, 'PENDING', 'no real architectural source exists yet — this must be disclosed as PENDING, never BOUND');
  assert.ok(L06_APT_A_SOURCE_FRAME.note.includes('pending'), 'the pending state must carry a real, human-readable disclosure');
  checks.push('7. Asset binding readiness: source status honestly PENDING (no real source registered) — the adapter/normalizer/store pathway is real and ready to receive one');

  // ---- 8. Canonical identity preservation ----
  assert.equal(LUNA_L06_APT_A.interiorRef, 'LUNA-L06-APT-A', 'the canonical apartment ref must be exactly the pre-existing identity, never renamed for this phase\'s convenience');
  for (const room of LUNA_L06_APT_A.rooms) {
    const m = mappings.find((mm) => mm.sourceId === room.ref);
    assert.equal(m.proposedRef, room.ref, `${room.ref} must propose itself, not a renamed identity`);
  }
  checks.push('8. Canonical identity preservation: LUNA-L06-APT-A and every real room ref are preserved exactly, never renamed');

  // ---- 9. Duplicate detection (within one extraction) ----
  const ids = model.objects.map((o) => o.sourceId);
  assert.equal(new Set(ids).size, ids.length, 'no duplicate sourceId within the L06 Apt A extraction');
  checks.push('9. Duplicate detection (extraction): zero duplicate source ids in the L06 Apt A model');

  // ---- 10. Door/opening mapping ----
  // UPDATED (Apartment A Full Interior Reality V1): rooms now carry their
  // real door(s) via `doors` (which superseded the single `doorSide`
  // field) and can legitimately have more than one (e.g. the Foyer has
  // three) — the adapter extracts every entry, so the expected ref set
  // must be derived the same way, not by counting rooms with a doorSide.
  const doorRefs = LUNA_L06_APT_A.rooms.flatMap((r) => (r.doors ?? []).map((_, index) => l06AptADoorRef(r.ref, index)));
  assert.equal(doorMappings.length, doorRefs.length, 'every real door in every room\'s doors[] must produce exactly one door mapping proposal');
  assert.ok(doorMappings.every((m) => m.status === 'PROPOSED'), 'newly-proposed door identities must be PROPOSED, never auto-CONFIRMED');
  assert.equal(new Set(doorMappings.map((m) => m.proposedRef)).size, doorMappings.length, 'every proposed door ref must be unique');
  checks.push(`10. Door/opening mapping: ${doorMappings.length} real door openings extracted from doors[] data, each proposed as PROPOSED (never auto-confirmed)`);

  // ---- 11. Structural coordination ----
  const coordination = checkL06AptAStructuralCoordination();
  assert.ok(coordination.checkedElementRefs.length > 0, 'the coordination check must inspect real LUNA-L06 columns, not an empty set');
  assert.ok(['CLEAR', 'COORDINATION_REVIEW_REQUIRED'].includes(coordination.status));
  if (coordination.status === 'COORDINATION_REVIEW_REQUIRED') assert.ok(coordination.conflicts.length > 0, 'a REVIEW_REQUIRED status must always carry at least one real, named conflict');
  checks.push(`11. Structural coordination: checked against ${coordination.checkedElementRefs.length} real LUNA-L06 columns — status ${coordination.status}, min clearance ${coordination.minClearanceMetres}m`);

  // ---- 12. MEP interface compatibility ----
  const serviceInterfaces = deriveL06AptARoomServiceInterfaces();
  assert.ok(serviceInterfaces.size > 0, 'at least some real rooms must associate with real existing MEP/device assets');
  for (const [roomRef, assets] of serviceInterfaces) {
    assert.ok(LUNA_L06_APT_A.rooms.some((r) => r.ref === roomRef), `${roomRef}: service interfaces must only ever key off a real existing room ref`);
    for (const a of assets) assert.ok(a.assetRef.startsWith('LUNA-L06-APT-A-'), `${a.assetRef}: every associated asset must be a real, already-existing Apartment A device, never fabricated`);
  }
  checks.push(`12. MEP interface compatibility: ${serviceInterfaces.size} rooms associated with real, already-existing device/asset refs by position-containment — no new assets or routes invented`);

  // ---- 13. Facility representation ----
  const facilityIdentity = { role: 'facility', permissions: [], assignedHomeRefs: [], facilityResponsibility: true };
  const kitchenModeForFacility = lunaRepresentationPolicy.resolveMode({ ref: 'LUNA-L06-APT-A-KITCHEN', identity: facilityIdentity });
  const doorModeForFacility = lunaRepresentationPolicy.resolveMode({ ref: doorRefs[0], identity: facilityIdentity });
  assert.notEqual(kitchenModeForFacility, 'FULL_3D', 'Facility must not receive FULL_3D depth into a private apartment room merely because a room registry now exists');
  assert.equal(doorModeForFacility, kitchenModeForFacility, 'a door inside the apartment must resolve to the exact same representation mode as its own room — inherited from the existing prefix-based policy rule, not a new one');
  checks.push(`13. Facility representation: private-room and door refs both resolve to ${kitchenModeForFacility} for Facility — unchanged privacy boundary, RepresentationPolicy untouched`);

  // ---- 14. Consumer representation ----
  const residentIdentity = { role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-A'], facilityResponsibility: false };
  const otherResidentIdentity = { role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-B'], facilityResponsibility: false };
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: 'LUNA-L06-APT-A-KITCHEN', identity: residentIdentity }), 'FULL_3D', 'the assigned resident must see their own room FULL_3D');
  assert.notEqual(lunaRepresentationPolicy.resolveMode({ ref: 'LUNA-L06-APT-A-KITCHEN', identity: otherResidentIdentity }), 'FULL_3D', 'a different resident must not see FULL_3D into Apartment A');
  checks.push('14. Consumer representation: the assigned resident sees FULL_3D, a different resident does not — unchanged, real, RepresentationPolicy-enforced boundary');

  // ---- 15. Versioning / replaceability readiness ----
  assert.equal(L06_APT_A_FRAME_CONTRACT.version, 1);
  const registry = buildL06AptAGoldStandardRegistry();
  assert.equal(registry.frameContractVersion, 1);
  assert.equal(registry.sourceStatus.status, 'PENDING');
  assert.equal(registry.rooms.length, LUNA_L06_APT_A.rooms.length);
  for (const r of registry.rooms) assert.equal(r.representationStatus, 'PROCEDURAL_REFERENCE', `${r.canonicalRef}: must be explicitly disclosed as procedural reference, never claimed as architectural truth`);
  checks.push('15. Versioning/replaceability: frame contract is explicitly versioned (v1); the Gold Standard registry is fully derived (not hand-duplicated) and every room discloses PROCEDURAL_REFERENCE status');

  // ---- 16. Cross-source duplicate detection (publish-time dedup) ----
  store.reset();
  await ensureLunaProject(store);
  await ensureL06AptAGoldStandardSource(store);
  const allProjectSources = store.listSources(LUNA_PROJECT_ID);
  for (const s of allProjectSources) {
    for (const m of store.listMappings(s.sourceId)) {
      if (m.proposedRef === 'LUNA-L06-APT-A') store.updateMappingStatus(m.mappingId, 'CONFIRMED', { reviewer: 'test-architect' });
    }
  }
  const publishResult = store.publish(LUNA_PROJECT_ID);
  const aptAPublished = publishResult.published.filter((p) => p.ref === 'LUNA-L06-APT-A');
  assert.equal(aptAPublished.length, 1, 'even though BOTH the whole-building adapter and the L06 Apt A adapter independently propose LUNA-L06-APT-A, publishing must never produce two canonical records for the same ref');
  assert.ok(publishResult.skipped.some((s) => s.reason.includes('duplicate canonical ref')), 'the second, redundant confirmation must be explicitly skipped with a disclosed reason');
  checks.push('16. Cross-source duplicate detection: two independent sources both proposing LUNA-L06-APT-A converge to exactly one published canonical record, with the duplicate explicitly skipped and disclosed — never silently double-counted');

  writeFileSync('artifacts/luna-l06-gold-standard-runtime-results.json', JSON.stringify({ passed: true, checks }, null, 2));
  console.log(checks.map((c) => 'PASS ' + c).join('\n'));
} catch (error) {
  writeFileSync('artifacts/luna-l06-gold-standard-runtime-results.json', JSON.stringify({ passed: false, checks, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await server.close();
}
