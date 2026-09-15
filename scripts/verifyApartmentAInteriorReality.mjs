// Apartment A Full Interior Reality V1 — deterministic checks for the new
// 14-room layout (Part 50, built incrementally as the phase progresses).
// Same Vite ssrLoadModule convention every other verify*.mjs already uses.
import { createServer } from 'vite';
import assert from 'node:assert/strict';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const checks = [];
try {
  const load = (path) => server.ssrLoadModule('/src/' + path);

  const { LUNA_L06_APT_A } = await load('luna/interiors/lunaInteriors.ts');
  const { LUNA_OPERATIONAL_ASSETS } = await load('luna/operational/lunaOperationalAssets.ts');
  const { lunaRepresentationPolicy } = await load('luna/policy/lunaRepresentationPolicy.ts');

  const rooms = LUNA_L06_APT_A.rooms;

  function rectOf(room) {
    return { minX: room.x - room.width / 2, maxX: room.x + room.width / 2, minZ: room.z - room.depth / 2, maxZ: room.z + room.depth / 2 };
  }
  function overlaps(a, b) {
    const ra = rectOf(a), rb = rectOf(b);
    const EPS = 0.01; // shared walls touch at the boundary — only real interpenetration counts
    return ra.minX < rb.maxX - EPS && ra.maxX > rb.minX + EPS && ra.minZ < rb.maxZ - EPS && ra.maxZ > rb.minZ + EPS;
  }

  // ---- 1. Canonical room count + uniqueness ----
  assert.equal(rooms.length, 14, 'Apartment A Full Interior Reality V1 is 14 real canonical rooms — 12 original + Guest WC + Corridor');
  const refs = rooms.map((r) => r.ref);
  assert.equal(new Set(refs).size, refs.length, 'every room ref must be unique');
  checks.push(`1. 14 unique canonical rooms: ${refs.join(', ')}`);

  // ---- 2. Programme: 3 bedrooms, 3 ensuites, 1 guest WC = 4 toilets ----
  const bedrooms = rooms.filter((r) => /^LUNA-L06-APT-A-BED-0[1-3]$/.test(r.ref));
  const ensuites = rooms.filter((r) => /^LUNA-L06-APT-A-BATH-0[1-3]$/.test(r.ref));
  const guestWc = rooms.find((r) => r.ref === 'LUNA-L06-APT-A-GUEST-WC');
  assert.equal(bedrooms.length, 3, 'must be exactly 3 bedrooms');
  assert.equal(ensuites.length, 3, 'must be exactly 3 ensuites, one per bedroom');
  assert.ok(guestWc, 'a real Guest WC must exist — Part 2\'s disclosed 4-toilet programme gap');
  checks.push('2. Programme: 3 bedrooms x 1 ensuite each + 1 Guest WC = 4 real toilets');

  // ---- 3. Room containment inside Apartment A's real, unchanged envelope ----
  const AW = 15.652174, AD = 12.173913, HW = AW / 2, HD = AD / 2;
  const EPS = 0.001;
  // The Balcony is deliberately cantilevered beyond the south facade (the
  // same "existing precedent" every other Luna balcony already uses) — the
  // one room this envelope check must not apply to.
  for (const room of rooms.filter((r) => r.ref !== 'LUNA-L06-APT-A-BALCONY')) {
    const r = rectOf(room);
    assert.ok(r.minX >= -HW - EPS && r.maxX <= HW + EPS, `${room.ref} must stay within Apartment A's real X envelope`);
    assert.ok(r.minZ >= -HD - EPS && r.maxZ <= HD + EPS, `${room.ref} must stay within Apartment A's real Z envelope`);
  }
  const balcony = rooms.find((r) => r.ref === 'LUNA-L06-APT-A-BALCONY');
  assert.ok(balcony, 'the Balcony must exist');
  const balconyRect = rectOf(balcony);
  assert.ok(balconyRect.maxZ <= -HD + EPS, 'the Balcony must be a real cantilever beyond the south facade, not floating inside the envelope');
  checks.push('3. All 13 interior rooms stay within Apartment A\'s real, unchanged massing envelope; the Balcony is a real cantilever beyond the south facade');

  // ---- 4. No major room overlap (adjacent rooms share walls, never interpenetrate) ----
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      assert.ok(!overlaps(rooms[i], rooms[j]), `${rooms[i].ref} and ${rooms[j].ref} must not overlap`);
    }
  }
  checks.push('4. No pairwise room overlap across all 14 rooms');

  // ---- 5. Door connectivity: every doorSide/doors gap on one room's shared
  // wall has a real counterpart on the neighboring room at the same world
  // position (checked via the room-center + offset math, not eyeballed) ----
  function doorWorldPositions(room) {
    const doors = room.doors ?? (room.doorSide ? [{ side: room.doorSide, offset: 0 }] : []);
    return doors.map((d) => {
      const offset = d.offset ?? 0;
      if (d.side === 'north') return { axis: 'z', at: room.z + room.depth / 2, along: room.x + offset, side: d.side };
      if (d.side === 'south') return { axis: 'z', at: room.z - room.depth / 2, along: room.x + offset, side: d.side };
      if (d.side === 'east') return { axis: 'x', at: room.x + room.width / 2, along: room.z + offset, side: d.side };
      return { axis: 'x', at: room.x - room.width / 2, along: room.z + offset, side: d.side };
    });
  }
  const byRef = new Map(rooms.map((r) => [r.ref, r]));
  const internalDoorPairs = [
    ['LUNA-L06-APT-A-ENTRY', 'LUNA-L06-APT-A-KITCHEN'],
    ['LUNA-L06-APT-A-ENTRY', 'LUNA-L06-APT-A-GUEST-WC'],
    ['LUNA-L06-APT-A-KITCHEN', 'LUNA-L06-APT-A-DINING'],
    ['LUNA-L06-APT-A-DINING', 'LUNA-L06-APT-A-LIVING'],
    ['LUNA-L06-APT-A-DINING', 'LUNA-L06-APT-A-CORRIDOR'],
    ['LUNA-L06-APT-A-DINING', 'LUNA-L06-APT-A-UTILITY'],
    ['LUNA-L06-APT-A-LIVING', 'LUNA-L06-APT-A-BALCONY'],
    ['LUNA-L06-APT-A-CORRIDOR', 'LUNA-L06-APT-A-BED-01'],
    ['LUNA-L06-APT-A-CORRIDOR', 'LUNA-L06-APT-A-BED-02'],
    ['LUNA-L06-APT-A-CORRIDOR', 'LUNA-L06-APT-A-BED-03'],
    ['LUNA-L06-APT-A-BED-01', 'LUNA-L06-APT-A-BATH-01'],
    ['LUNA-L06-APT-A-BED-02', 'LUNA-L06-APT-A-BATH-02'],
    ['LUNA-L06-APT-A-BED-03', 'LUNA-L06-APT-A-BATH-03'],
  ];
  for (const [aRef, bRef] of internalDoorPairs) {
    const a = byRef.get(aRef), b = byRef.get(bRef);
    assert.ok(a && b, `both ${aRef} and ${bRef} must exist`);
    const aDoors = doorWorldPositions(a), bDoors = doorWorldPositions(b);
    const matched = aDoors.some((da) => bDoors.some((db) => da.axis === db.axis && Math.abs(da.at - db.at) < 0.05 && Math.abs(da.along - db.along) < 0.05));
    assert.ok(matched, `${aRef} <-> ${bRef} must share a real, aligned door opening at the same world position`);
  }
  checks.push(`5. Door connectivity: ${internalDoorPairs.length} real internal door pairs all align at the same world position on both sides`);

  // ---- 6. Real entrance door gap present on the Foyer's north wall ----
  const foyer = byRef.get('LUNA-L06-APT-A-ENTRY');
  const hasEntranceGap = (foyer.doors ?? []).some((d) => d.side === 'north');
  assert.ok(hasEntranceGap, 'the Foyer must carve a real wall gap for the L06 Gold Standard entrance door');
  checks.push('6. Foyer carries a real wall gap for the L06 apartment entrance door');

  // ---- 7. MEP/device-room semantic containment: every Apartment A device's
  // XYZ position must fall inside the room its locationLabel/ref claims to
  // be in — not just placed somewhere plausible-looking. ----
  const roomByLabel = new Map(rooms.map((r) => [r.label, r]));
  const apartmentADevices = LUNA_OPERATIONAL_ASSETS.filter((a) => a.unitRef === 'LUNA-L06-APT-A');
  assert.ok(apartmentADevices.length > 0, 'Apartment A must have real operational devices to check');
  const labelToRoomRefOverride = { 'Living Room': 'LUNA-L06-APT-A-LIVING', 'Utility': 'LUNA-L06-APT-A-UTILITY', 'Kitchen': 'LUNA-L06-APT-A-KITCHEN', 'Foyer': 'LUNA-L06-APT-A-ENTRY', 'Primary Bedroom': 'LUNA-L06-APT-A-BED-01', 'Primary Ensuite': 'LUNA-L06-APT-A-BATH-01', 'Bedroom 2': 'LUNA-L06-APT-A-BED-02', 'Ensuite 2': 'LUNA-L06-APT-A-BATH-02', 'Bedroom 3': 'LUNA-L06-APT-A-BED-03', 'Ensuite 3': 'LUNA-L06-APT-A-BATH-03', 'Balcony': 'LUNA-L06-APT-A-BALCONY' };
  let checkedContainment = 0;
  const containmentFailures = [];
  for (const device of apartmentADevices) {
    const label = device.locationLabel.split(' — ').pop().trim();
    const roomRef = labelToRoomRefOverride[label];
    if (!roomRef) continue; // device whose locationLabel doesn't map to a single interior room (e.g. common riser terminations) — not this check's concern
    const room = byRef.get(roomRef);
    if (!room) continue;
    const r = rectOf(room);
    const inX = device.position.x >= r.minX - 0.05 && device.position.x <= r.maxX + 0.05;
    const inZ = device.position.z >= r.minZ - 0.05 && device.position.z <= r.maxZ + 0.05;
    checkedContainment++;
    if (!inX || !inZ) containmentFailures.push(`${device.ref} (${device.locationLabel}) at (${device.position.x}, ${device.position.z}) is outside ${roomRef}'s real rect`);
  }
  assert.ok(checkedContainment >= 10, `expected at least 10 room-mappable devices to check, got ${checkedContainment}`);
  assert.equal(containmentFailures.length, 0, containmentFailures.join('; '));
  checks.push(`7. MEP/device room containment: ${checkedContainment} Apartment A devices' real XYZ positions fall inside the room their own locationLabel claims`);

  // ---- 8. RepresentationPolicy re-verification across all 14 rooms —
  // Part 25's mandatory re-check: Facility must NOT gain unrestricted 3D
  // access to the private interior merely because real architecture now
  // exists. unitOwning()'s prefix match (lunaRepresentationPolicy.ts) is a
  // GENERIC mechanism keyed on the canonical ref string, not a per-room
  // allowlist — this proves it actually covers all 14 refs, including the
  // 2 new ones (Guest WC, Corridor) added this phase, without any policy
  // code change. ----
  const resident = { role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-A'], facilityResponsibility: false };
  const otherResident = { role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-B'], facilityResponsibility: false };
  const facility = { role: 'facility', permissions: [], assignedHomeRefs: [], facilityResponsibility: true };
  const publicIdentity = { role: 'public', permissions: [], assignedHomeRefs: [], facilityResponsibility: false };
  for (const room of rooms) {
    const residentMode = lunaRepresentationPolicy.resolveMode({ ref: room.ref, identity: resident });
    const facilityMode = lunaRepresentationPolicy.resolveMode({ ref: room.ref, identity: facility });
    const otherResidentMode = lunaRepresentationPolicy.resolveMode({ ref: room.ref, identity: otherResident });
    const publicMode = lunaRepresentationPolicy.resolveMode({ ref: room.ref, identity: publicIdentity });
    assert.equal(residentMode, 'FULL_3D', `${room.ref}: the assigned resident must get real, full interior access`);
    assert.notEqual(facilityMode, 'FULL_3D', `${room.ref}: Facility must NOT get unrestricted 3D interior access merely because the architecture exists`);
    assert.equal(otherResidentMode, 'HIDDEN', `${room.ref}: a resident of a different home must not see inside Apartment A`);
    assert.equal(publicMode, 'HIDDEN', `${room.ref}: an unauthenticated/public identity must not see inside a private, occupied home`);
  }
  checks.push('8. RepresentationPolicy re-verified across all 14 rooms (including the 2 new this phase): resident FULL_3D, Facility never FULL_3D, other-resident/public HIDDEN — the existing generic unit-prefix mechanism, no per-room policy code added');

  console.log(checks.map((c) => `PASS ${c}`).join('\n'));
} finally {
  await server.close();
}
