// Luna Residences — which assets inside a private unit are Facility-owned
// service infrastructure rather than resident-owned smart-home devices.
//
// The existing Phase 3C/4 asset data tags every apartment asset uniformly
// as `system: "apartment-devices"` (see lunaOperationalAssets.ts) — there
// is no separate system tag distinguishing "the electricity meter Facility
// reads" from "the resident's own light switch". `type` alone isn't a
// reliable signal either: "energy_meter"/"water_meter" are unambiguous,
// but the isolation valve is tagged the same generic "switch" type used
// elsewhere. Rather than retag already-accepted Phase 3C/4 data (out of
// scope for a policy-only phase), this is an explicit, disclosed allowlist
// of refs that are Facility-responsibility even though they sit inside a
// resident's private unit — exactly the "meters/risers/isolation valves"
// carve-out Phase 8 asks for. Extend this list, not the asset table, when
// more such infrastructure is added.
const FACILITY_OWNED_UNIT_ASSET_REFS = new Set<string>([
  "LUNA-L06-APT-A-METER-ELEC-01",
  "LUNA-L06-APT-A-METER-WATER-01",
  "LUNA-L06-APT-A-UTILITY-VALVE-01",
  // Phase 10 — MEP backbone terminations inside the unit. These already
  // carry a non-"apartment-devices" system tag (network-edge/drainage),
  // but resolveAssetMode checks unitRef before system, so they still need
  // this explicit carve-out to remain visible to Facility.
  "LUNA-L06-APT-A-NET-ONT-01",
  "LUNA-L06-APT-A-DRAIN-01",
  // Phase 13 — deeper apartment anatomy. The DB/circuits, water main/hot/
  // cold distribution, and the extra drain branches are still Facility
  // service infrastructure (the electrical/plumbing "backbone inside the
  // wall"), not resident-owned devices, so they need the same carve-out.
  "LUNA-L06-APT-A-DB-01",
  "LUNA-L06-APT-A-LIGHTING-CIRCUIT-01",
  "LUNA-L06-APT-A-LIGHTING-CIRCUIT-02",
  "LUNA-L06-APT-A-AC-CIRCUIT-01",
  "LUNA-L06-APT-A-WATER-MAIN-01",
  "LUNA-L06-APT-A-WATER-HOT-01",
  "LUNA-L06-APT-A-WATER-COLD-01",
  "LUNA-L06-APT-A-KITCHEN-FIXTURE-BRANCH-01",
  "LUNA-L06-APT-A-BATH-01-FIXTURE-BRANCH-01",
  "LUNA-L06-APT-A-KITCHEN-DRAIN-01",
  "LUNA-L06-APT-A-BATH-01-DRAIN-01",
  // The outdoor condenser is HVAC plant equipment Facility services (like
  // the fire pump or a booster pump), not a resident-controlled device —
  // the resident's own indoor split units stay "apartment-devices" and
  // fully resident-only, unaffected by this.
  "LUNA-L06-APT-A-AC-OUTDOOR-01",
  // Domestic Water Reference System V1 — the new bathroom cold-water
  // fixture branches and drains are the same class of Facility service
  // infrastructure as the existing kitchen/bath-01 branches and drains
  // above (the plumbing "backbone inside the wall"), not resident-owned
  // devices.
  "LUNA-L06-APT-A-BATH-01-FIXTURE-BRANCH-02",
  "LUNA-L06-APT-A-BATH-02-FIXTURE-BRANCH-01",
  "LUNA-L06-APT-A-BATH-03-FIXTURE-BRANCH-01",
  "LUNA-L06-APT-A-BATH-02-DRAIN-01",
  "LUNA-L06-APT-A-BATH-03-DRAIN-01",
  // Fire & Life Safety System V1 — the entry smoke detector is monitored
  // by the central building fire alarm panel (its parentRef is the L06
  // fire branch, feeding LUNA-B1-FIRE-PANEL-01), the same "building
  // infrastructure that happens to sit inside a private unit" category as
  // the meters/DBs/circuits above — real fire alarm systems are Facility/
  // life-safety responsibility regardless of whose apartment a detector is
  // physically in, not a resident-owned smart-home device.
  "LUNA-L06-APT-A-ENTRY-SMOKE-01",
]);

export function isFacilityOwnedUnitAsset(ref: string): boolean {
  return FACILITY_OWNED_UNIT_ASSET_REFS.has(ref);
}
