// Apartment A Full Interior Reality V1 — Part 12 deterministic coverage for
// the map/live-position policy gate itself (the underlying decision the
// browser privacy test observes, proven here at the pure-function level so
// it can't silently regress without a fast, deterministic failure).
import { createServer } from 'vite';
import assert from 'node:assert/strict';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const { lunaRepresentationPolicy } = await server.ssrLoadModule('/src/luna/policy/lunaRepresentationPolicy.ts');

const APT_A = 'LUNA-L06-APT-A';
const results = [];

// ---- 1. Facility must NOT resolve to FULL_3D for Apartment A (map denial) ----
const facilityMode = lunaRepresentationPolicy.resolveMode({ ref: APT_A, identity: { role: 'facility', assignedHomeRefs: [] } });
assert.notEqual(facilityMode, 'FULL_3D', 'Facility must never resolve Apartment A to FULL_3D — this is the exact gate App.tsx checks before ever activating the private 14-room map');
results.push(`1. Facility + Apartment A -> ${facilityMode} (not FULL_3D): map/live-dot must never activate for Facility`);

// ---- 2. An unrelated Consumer (not assigned to Apartment A) must be denied ----
const unrelatedMode = lunaRepresentationPolicy.resolveMode({ ref: APT_A, identity: { role: 'resident', assignedHomeRefs: ['LUNA-L06-APT-B'] } });
assert.equal(unrelatedMode, 'HIDDEN', 'a resident not assigned to Apartment A must resolve to HIDDEN, never FULL_3D — the map must stay off for any unrelated identity');
results.push(`2. Unrelated Consumer (assigned to Apt B) + Apartment A -> ${unrelatedMode}: map denial confirmed for a real, specific unrelated identity`);

// ---- 3. The assigned resident must genuinely resolve to FULL_3D (map allowed) ----
const assignedMode = lunaRepresentationPolicy.resolveMode({ ref: APT_A, identity: { role: 'resident', assignedHomeRefs: [APT_A] } });
assert.equal(assignedMode, 'FULL_3D', 'the assigned resident must resolve to FULL_3D — privacy is scoped correctly, not a blanket denial for every Consumer');
results.push(`3. Assigned resident + Apartment A -> ${assignedMode}: the same real gate legitimately opens for the correct identity`);

// ---- 4. A room-level ref within the apartment inherits the same unit-level gate ----
const facilityRoomMode = lunaRepresentationPolicy.resolveMode({ ref: `${APT_A}-KITCHEN`, identity: { role: 'facility', assignedHomeRefs: [] } });
assert.notEqual(facilityRoomMode, 'FULL_3D', 'a specific room ref (e.g. the Kitchen) must inherit the same unit-level denial for Facility — no per-room bypass exists');
results.push(`4. Facility + Apartment A Kitchen (room-level ref) -> ${facilityRoomMode}: room-level refs correctly inherit the owning unit\'s gate, no per-room bypass`);

// ---- 5. LiveWorldPositionReporter must be source-gated behind mapSpec, not a
// separate/independent condition that could drift out of sync with the map
// itself (App.tsx:1055 mounts it only inside `{mapSpec && ...}`) ----
const fs = await import('node:fs');
const appSource = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
assert.match(appSource, /\{mapSpec &&\s*<LiveWorldPositionReporter/, 'LiveWorldPositionReporter must be mounted only inside the same `mapSpec &&` gate the map itself uses — proves it cannot report a live position while the map (and therefore the policy check that produced it) is inactive');
results.push('5. LiveWorldPositionReporter is mounted strictly behind `mapSpec &&` — it cannot be active while the map itself is not, so it can never leak a live position independent of the same policy-gated mapSpec');

console.log(results.join('\n'));
await server.close();
