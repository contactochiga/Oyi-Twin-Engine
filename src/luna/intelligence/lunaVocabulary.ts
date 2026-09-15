// Luna vocabulary — the "Luna-specific aliases/phrases" layer Phase 6
// calls for, deliberately kept out of the engine core. Every ref quoted
// here is a real canonical_ref already established in Phase 3C/4/5 —
// this file never invents a new identity, it only maps how a person
// might *say* one.

import type { OperationalSystem } from "../../engine/twinData";

export interface SystemAlias {
  system: OperationalSystem;
  patterns: string[];
}

export const SYSTEM_ALIASES: SystemAlias[] = [
  { system: "water", patterns: ["water"] },
  { system: "electrical", patterns: ["electrical", "electricity", "power system"] },
  // "fire-water"/"fire water" are listed explicitly (and are longer than
  // the bare "water" pattern above) so "show the fire-water path to L06"
  // resolves to the fire system, not water — the compound phrase would
  // otherwise also match "water" as a substring and lose the sort purely
  // on pattern length.
  { system: "fire", patterns: ["fire", "fire-water", "fire water"] },
  { system: "hvac", patterns: ["hvac", "air conditioning system", "climate system", "chiller"] },
  { system: "vertical-transport", patterns: ["elevator", "elevators", "lift", "lifts", "vertical transport"] },
  { system: "security", patterns: ["camera", "cameras", "security"] },
  { system: "access", patterns: ["access control", "access"] },
  { system: "network-edge", patterns: ["network", "edge", "gateway", "wifi", "wi-fi"] },
  { system: "apartment-devices", patterns: ["apartment devices", "apartment device"] },
  { system: "drainage", patterns: ["drainage", "drain", "sewage", "wastewater", "stormwater", "waste"] },
  { system: "structure", patterns: ["structure", "structural"] },
];

export interface AssetAlias {
  ref: string | string[];
  patterns: string[];
}

// Facility (building-wide) assets — real refs from phase3c_infrastructure.sql.
const FACILITY_ASSET_ALIASES: AssetAlias[] = [
  { ref: "LUNA-B1-ELECTRICAL-GRID-01", patterns: ["the grid", "grid", "incoming supply", "utility", "the utility"] },
  { ref: "LUNA-B1-ELECTRICAL-MDB-01", patterns: ["mdb", "main distribution board", "main electrical distribution", "distribution board"] },
  { ref: "LUNA-B1-ELECTRICAL-GEN-01", patterns: ["generator", "the generator", "standby generator"] },
  { ref: "LUNA-B1-ELECTRICAL-ATS-01", patterns: ["ats", "transfer switch", "automatic transfer switch"] },
  { ref: "LUNA-B1-ELECTRICAL-INV-01", patterns: ["inverter", "battery backup"] },
  { ref: "LUNA-B1-ELECTRICAL-METER-01", patterns: ["main electricity meter", "building electricity meter"] },
  { ref: "LUNA-B1-WATER-TANK-01", patterns: ["water tank", "main water tank", "the tank"] },
  { ref: "LUNA-B1-WATER-TREAT-01", patterns: ["water treatment", "treatment unit"] },
  { ref: "LUNA-B1-WATER-BP-01", patterns: ["booster pump 01", "booster pump 1", "booster pump one", "pump 01", "pump 1", "bp01", "bp 01"] },
  { ref: "LUNA-B1-WATER-BP-02", patterns: ["booster pump 02", "booster pump 2", "booster pump two", "pump 02", "pump 2", "bp02", "bp 02"] },
  { ref: "LUNA-B1-WATER-METER-01", patterns: ["main water meter", "building water meter"] },
  { ref: "LUNA-B1-WATER-VALVE-01", patterns: ["main water valve", "building water valve", "main isolation valve"] },
  { ref: "LUNA-B1-FIRE-PANEL-01", patterns: ["fire panel", "fire alarm panel"] },
  { ref: "LUNA-B1-FIRE-PUMP-01", patterns: ["fire pump"] },
  { ref: "LUNA-B1-FIRE-TANK-01", patterns: ["fire water tank", "fire tank"] },
  { ref: "LUNA-GROUND-FIRE-DET-01", patterns: ["fire detector", "ground fire detector"] },
  { ref: "LUNA-ROOFTOP-HVAC-PLANT-01", patterns: ["hvac plant", "chiller plant", "ahu", "air handling unit", "common area hvac"] },
  // HVAC System V1 — the shared outdoor condenser for the Apartment 6A
  // reference chain. Kept in the Facility list (not the apartment list
  // below) since it's Facility-serviced plant equipment on the unit's
  // service balcony, the same category as the meters/DBs already there.
  { ref: "LUNA-L06-APT-A-AC-OUTDOOR-01", patterns: ["outdoor unit", "outdoor condenser", "the condenser", "condensing unit", "ac outdoor unit", "6a outdoor unit"] },
  // Access & Security System V1 — the three registered common access
  // points. Deliberately full, qualified phrases (never a bare "the
  // door"/"gate"/"lock", which are already claimed by the apartment
  // entry lock's own patterns below) — checked against every existing
  // system's vocabulary/target-phrase list for substring collisions
  // before being added (see docs/LUNA_ACCESS_SECURITY_REFERENCE_SPEC.md).
  { ref: "LUNA-GROUND-ACCESS-MAIN-01", patterns: ["main resident entrance", "the main entrance", "main entrance", "main gate", "residential entrance", "building entrance", "the lobby entrance", "lobby entrance"] },
  { ref: "LUNA-B1-ACCESS-SERVICE-01", patterns: ["service entrance", "the service entrance", "b1 service entrance"] },
  { ref: "LUNA-GROUND-ACCESS-LIFT-LOBBY-01", patterns: ["lift lobby access", "the lift lobby access point"] },
  { ref: "LUNA-LIFT-PASS-01", patterns: ["elevator 1", "elevator one", "lift 1", "passenger elevator 1", "passenger elevator one"] },
  { ref: "LUNA-LIFT-PASS-02", patterns: ["elevator 2", "elevator two", "lift 2", "passenger elevator 2", "passenger elevator two"] },
  { ref: "LUNA-LIFT-PASS-03", patterns: ["elevator 3", "elevator three", "lift 3", "passenger elevator 3", "passenger elevator three"] },
  { ref: "LUNA-LIFT-SERVICE-01", patterns: ["service elevator", "fire elevator", "service lift"] },
  // CCTV & Spatial Security System V1 — "camera 01"-"04" are new patterns
  // matching the brief's own numbered-camera phrasing (Section 9's
  // CCTV Control Board selector); every existing descriptive pattern
  // above is kept unchanged.
  { ref: "LUNA-GROUND-SEC-CAM-01", patterns: ["entrance camera", "ground entrance camera", "main entrance camera", "camera 01", "camera 1"] },
  { ref: "LUNA-GROUND-LOBBY-CAM-01", patterns: ["lobby camera", "camera 02", "camera 2"] },
  { ref: "LUNA-B1-PARKING-CAM-01", patterns: ["parking camera", "basement camera", "camera 03", "camera 3"] },
  { ref: "LUNA-L06-COMMON-CAM-01", patterns: ["level 6 camera", "floor 6 camera", "common area camera", "camera 04", "camera 4"] },
  // The apartment video intercom is a camera-kind device (Access V1's own
  // reference chain, not a CCTV-system asset) — reached here so "Show me
  // the camera at Apartment 6A" resolves honestly to the real device.
  { ref: "LUNA-L06-APT-A-ENTRY-INTERCOM-01", patterns: ["the camera at apartment 6a", "apartment 6a camera", "the intercom", "video intercom", "the doorbell"] },
  { ref: "LUNA-EDGE-CORE-01", patterns: ["edge core", "oyi core", "edge node"] },
  { ref: "LUNA-B1-NET-GATEWAY-01", patterns: ["network gateway", "the gateway", "core gateway"] },
  { ref: "LUNA-GROUND-NET-WIFI-AP-01", patterns: ["wifi access point", "wi-fi access point"] },
  // Phase 10 — MEP backbone risers.
  { ref: "LUNA-RISER-ELECTRICAL-01", patterns: ["electrical riser", "the electrical riser"] },
  // Electrical System V1 — L06 branch + 6A meter/DB previously had no Oyi
  // aliases even though their service-route termination already existed.
  // "l06 electrical distribution branch" is deliberately the longest
  // pattern here (35 chars, exceeding MDB-01's own longest pattern) so
  // findByPattern's longest-pattern-first entry sort resolves "the l06
  // distribution board" to THIS asset rather than to MDB-01, whose own
  // "distribution board" pattern would otherwise also match as a
  // substring — the entries never actually collide on which text they
  // match, only on sort priority, so this fixes that deterministically.
  { ref: "LUNA-L06-ELECTRICAL-BRANCH-01", patterns: ["l06 electrical branch", "l06 distribution", "the l06 distribution board", "floor distribution", "l06 electrical distribution branch"] },
  { ref: "LUNA-L06-APT-A-METER-ELEC-01", patterns: ["6a meter", "the 6a meter", "apartment 6a meter", "apartment electricity meter"] },
  { ref: "LUNA-L06-APT-A-DB-01", patterns: ["6a db", "the 6a db", "apartment 6a distribution board", "apartment distribution board"] },
  { ref: "LUNA-RISER-WATER-01", patterns: ["water riser", "the water riser"] },
  // Drainage V1 — "soil stack"/"waste stack" added alongside the existing
  // "drainage riser"/"drainage stack" patterns (single-stack venting means
  // this same riser also answers "show me the vent stack serving
  // Apartment 6A" via the explicit vent-chain handling in lunaExplain.ts,
  // never a second riser asset).
  { ref: "LUNA-RISER-DRAINAGE-01", patterns: ["drainage riser", "drainage stack", "the drainage riser", "soil stack", "the soil stack", "soil/waste stack", "waste stack", "the soil/waste stack"] },
  // Drainage V1 — B1 discharge/inspection reference point. Previously
  // unaliased even though the asset itself (and its route termination)
  // already existed since Phase 10.
  { ref: "LUNA-B1-DRAINAGE-MAIN-01", patterns: ["main drainage", "the main drain", "drainage discharge", "main discharge", "drainage access point", "the drainage access point", "nearest drainage access point"] },
  { ref: "LUNA-L06-DRAINAGE-BRANCH-01", patterns: ["l06 drainage branch", "l06 drainage connection", "the drainage connection point", "floor drainage distribution"] },
  { ref: "LUNA-L06-APT-A-DRAIN-01", patterns: ["wet area drain", "wet-area drain", "the wet area connection", "stack connection", "apartment 6a drain connection", "6a drain connection"] },
  { ref: "LUNA-L06-APT-A-KITCHEN-DRAIN-01", patterns: ["kitchen drain", "the kitchen drain", "kitchen waste"] },
  // No room-level alias exists for any bathroom (SPACE_ALIASES only
  // covers living/kitchen/bedrooms/entry), so "master/primary bathroom"
  // phrases tie directly to the drain asset itself — the same "the
  // detector" bare-alias precedent Fire System V1 already established.
  { ref: "LUNA-L06-APT-A-BATH-01-DRAIN-01", patterns: ["master bathroom drain", "primary bathroom drain", "master bathroom waste", "primary bathroom waste", "the primary bathroom drain"] },
  { ref: "LUNA-L06-APT-A-BATH-02-DRAIN-01", patterns: ["bathroom 2 drain", "bathroom two drain"] },
  { ref: "LUNA-L06-APT-A-BATH-03-DRAIN-01", patterns: ["bathroom 3 drain", "bathroom three drain"] },
  // Drainage V1 — vent + stormwater reference chains (see
  // lunaMepBackbone.ts's DRAINAGE_VENT/DRAINAGE_STORMWATER comments).
  { ref: "LUNA-ROOF-VENT-TERMINATION-01", patterns: ["vent termination", "the vent termination", "roof vent", "vent stack roof termination"] },
  { ref: "LUNA-ROOFTOP-STORM-DRAIN-01", patterns: ["roof drain", "the roof drain", "stormwater collection", "roof stormwater collection"] },
  { ref: "LUNA-STORM-DOWNPIPE-01", patterns: ["downpipe", "the downpipe", "stormwater downpipe"] },
  { ref: "LUNA-SITE-STORM-DISCHARGE-01", patterns: ["site drainage", "stormwater discharge", "site stormwater discharge", "the site discharge"] },
  { ref: "LUNA-RISER-FIRE-01", patterns: ["fire riser", "the fire riser"] },
  // Fire System V1 — L06 fire zone/branch and the 6A smoke detector
  // previously had no Oyi aliases even though their service-route
  // termination and protected_by relationship already existed.
  { ref: "LUNA-L06-FIRE-BRANCH-01", patterns: ["l06 fire zone", "l06 fire branch", "the fire zone", "floor fire distribution"] },
  // "the detector" (bare) deliberately anchors on the reference incident's
  // own device (Part 4 scopes the one complete reference chain to L06/
  // Apartment 6A) rather than the common-area detector — an honest,
  // disclosed simplification, not a claim that it's the only detector.
  { ref: "LUNA-L06-APT-A-ENTRY-SMOKE-01", patterns: ["6a smoke detector", "the smoke detector", "apartment 6a smoke detector", "entry smoke detector", "the detector"] },
  { ref: "LUNA-RISER-NETWORK-01", patterns: ["network riser", "data riser", "fiber riser", "the network riser"] },
  // Network/Edge & Physical Connectivity V1 — the one missing link in the
  // already-registered floor branch (Phase 10 had no Oyi alias for it,
  // mirroring the electrical/fire branch fix above), plus first-ever
  // aliases for Apartment 6A's own fiber termination and router.
  { ref: "LUNA-L06-NETWORK-BRANCH-01", patterns: ["l06 data branch", "l06 network branch", "level 6 data distribution point", "floor data distribution"] },
  { ref: "LUNA-L06-APT-A-NET-ONT-01", patterns: ["the ont", "fiber termination", "fiber termination point", "apartment 6a ont"] },
  { ref: "LUNA-L06-APT-A-ROUTER-01", patterns: ["the router", "home router", "apartment 6a router", "6a router", "apartment 6a's router", "6a's router"] },
];

// Apartment 6A devices — the Consumer-capable scope. "the living room
// light" deliberately resolves to both circuits (Living Room Light
// Circuit 1 and 2), matching what a resident actually means.
const APARTMENT_ASSET_ALIASES: AssetAlias[] = [
  { ref: ["LUNA-L06-APT-A-LIVING-LIGHT-01", "LUNA-L06-APT-A-LIVING-LIGHT-02"], patterns: ["living room light", "living room lights", "the living room light"] },
  { ref: "LUNA-L06-APT-A-KITCHEN-LIGHT-01", patterns: ["kitchen light"] },
  { ref: "LUNA-L06-APT-A-BED-01-LIGHT-01", patterns: ["primary bedroom light", "bedroom light", "bedroom 1 light", "master bedroom light"] },
  { ref: "LUNA-L06-APT-A-BED-02-LIGHT-01", patterns: ["bedroom 2 light", "bedroom two light"] },
  { ref: "LUNA-L06-APT-A-BED-03-LIGHT-01", patterns: ["bedroom 3 light", "bedroom three light"] },
  // HVAC System V1 — anchors the brief's two literal bare-"AC" phrases
  // ("Turn on the AC.", "Is the AC running?") plus "indoor unit" on the
  // Living Room unit (the one fully-detailed reference chain's primary
  // commandable device), an honest, disclosed simplification — the same
  // pattern already established for Fire's bare "the detector". A short
  // "the ac" (or bare "ac") pattern is deliberately NOT used:
  // findByPattern matches by plain substring (text.includes(p)), and "the
  // ac" is itself a substring of "the active" — it silently hijacked
  // Electrical V1.1's own "Show me the active power path." phrase in
  // testing (a real, confirmed regression, not a hypothetical). The two
  // full-phrase patterns below are long enough to avoid that collision
  // while still matching the brief's exact required wording (and any
  // natural prefix, since substring matching still allows "please turn on
  // the ac" etc.).
  { ref: "LUNA-L06-APT-A-LIVING-AC-01", patterns: ["living room ac", "living room air conditioning", "living room air conditioner", "the living room ac", "turn on the ac", "is the ac running", "indoor unit", "the indoor unit"] },
  { ref: "LUNA-L06-APT-A-BED-01-AC-01", patterns: ["bedroom ac", "primary bedroom ac", "master bedroom ac"] },
  { ref: "LUNA-L06-APT-A-LIVING-CURTAIN-01", patterns: ["living room curtain", "living room curtains", "the living room curtains", "the curtain", "the curtains"] },
  { ref: "LUNA-L06-APT-A-BED-01-CURTAIN-01", patterns: ["bedroom curtain", "bedroom curtains", "primary bedroom curtains"] },
  { ref: "LUNA-L06-APT-A-ENTRY-LOCK-01", patterns: ["the lock", "front door", "entrance lock", "the door", "apartment 6a lock", "apartment door"] },
  { ref: "LUNA-L06-APT-A-UTILITY-VALVE-01", patterns: ["apartment water valve", "the water valve", "isolation valve", "the isolation valve"] },
  { ref: "LUNA-L06-APT-A-KITCHEN-LEAK-01", patterns: ["leak sensor", "kitchen leak sensor"] },
  { ref: "LUNA-L06-APT-A-LIVING-TH-01", patterns: ["living room temperature sensor", "temperature sensor"] },
  { ref: "LUNA-L06-APT-A-LIVING-OCC-01", patterns: ["occupancy sensor", "living room occupancy sensor"] },
  { ref: "LUNA-L06-APT-A-ENTRY-SMOKE-01", patterns: ["smoke detector", "smoke sensor", "entry smoke detector"] },
];

export const ASSET_ALIASES: AssetAlias[] = [...APARTMENT_ASSET_ALIASES, ...FACILITY_ASSET_ALIASES];

export interface SpaceAlias {
  ref: string;
  kind: "level" | "interior" | "room" | "door" | "unit";
  patterns: string[];
}

export const SPACE_ALIASES: SpaceAlias[] = [
  { ref: "LUNA-L06-APT-A", kind: "interior", patterns: ["apartment 6a", "apartment a", "unit 6a", "apartment six a"] },
  // L06 Gold Standard (Part 35) — Apartment B/C/D have no registered
  // interior (Part 11: shell-level only), so `kind: "unit"` resolves
  // through findSpace()'s own real exterior-focus branch, never a
  // fabricated interior enter. "Take me to Apartment B" still attempts a
  // real route (App.tsx checks findSpace().kind === "unit" too) —
  // RepresentationPolicy is what actually stops a non-resident, not the
  // vocabulary layer.
  { ref: "LUNA-L06-APT-B", kind: "unit", patterns: ["apartment b", "apartment 6b", "unit 6b"] },
  { ref: "LUNA-L06-APT-C", kind: "unit", patterns: ["apartment c", "apartment 6c", "unit 6c"] },
  { ref: "LUNA-L06-APT-D", kind: "unit", patterns: ["apartment d", "apartment 6d", "unit 6d"] },
  { ref: "LUNA-L06-LOBBY", kind: "room", patterns: ["the l06 lift lobby", "level 6 lift lobby", "the lift lobby on level 6"] },
  { ref: "LUNA-L06-STAIR-LINK-01", kind: "room", patterns: ["stair 1 access corridor", "the stair 1 corridor on level 6"] },
  { ref: "LUNA-L06-STAIR-LINK-02", kind: "room", patterns: ["stair 2 access corridor", "the stair 2 corridor on level 6"] },
  // Architectural Reality V1 — the Grand Entrance (a real door, not a
  // room/interior) and the two protected stairs. Deliberately avoids
  // "the entry"/"the foyer" below (Apartment 6A's own entry room) and
  // "the main entrance"/"main entrance" (already claimed by the
  // pre-existing ASSET_ALIASES entry for this same real ref — Access &
  // Security V1's own vocabulary, matched first by matchNavigateOrAsset,
  // left untouched per Part 28). "front door"/"the front door" were
  // tested and confirmed to ALSO already be claimed — by
  // LUNA-L06-APT-A-ENTRY-LOCK-01's own APARTMENT_ASSET_ALIASES patterns
  // — but that match resolves to a command-shaped intent that returns
  // nothing useful for a bare navigation phrase, so those two strings are
  // deliberately excluded here rather than left as dead, silently-broken
  // vocabulary. "the entrance door" is confirmed collision-free and
  // working.
  { ref: "LUNA-GROUND-ACCESS-MAIN-01", kind: "door", patterns: ["the entrance door"] },
  { ref: "LUNA-STAIR-01", kind: "door", patterns: ["stair 1", "stair one", "stairway 1"] },
  { ref: "LUNA-STAIR-02", kind: "door", patterns: ["stair 2", "stair two", "stairway 2"] },
  { ref: "LUNA-GROUND-LOBBY-RECEPTION", kind: "room", patterns: ["the reception", "reception", "the front desk", "the concierge"] },
  { ref: "LUNA-GROUND-LOBBY-LOUNGE", kind: "room", patterns: ["the lounge", "waiting lounge", "waiting area"] },
  { ref: "LUNA-GROUND-LOBBY-LIFTS", kind: "room", patterns: ["the lift lobby", "lift lobby", "the elevator lobby"] },
  { ref: "LUNA-L06-APT-A-LIVING", kind: "room", patterns: ["the living room", "living room"] },
  { ref: "LUNA-L06-APT-A-KITCHEN", kind: "room", patterns: ["the kitchen", "kitchen"] },
  { ref: "LUNA-L06-APT-A-BED-01", kind: "room", patterns: ["the primary bedroom", "primary bedroom", "master bedroom"] },
  { ref: "LUNA-L06-APT-A-BED-02", kind: "room", patterns: ["bedroom 2", "bedroom two"] },
  { ref: "LUNA-L06-APT-A-BED-03", kind: "room", patterns: ["bedroom 3", "bedroom three"] },
  { ref: "LUNA-L06-APT-A-ENTRY", kind: "room", patterns: ["the entry", "the foyer", "entrance foyer"] },
  { ref: "LUNA-ROOFTOP-SKY", kind: "interior", patterns: ["luna sky", "the rooftop", "sky bar", "rooftop"] },
  { ref: "LUNA-GROUND-LOBBY", kind: "interior", patterns: ["the lobby", "ground lobby", "main lobby"] },
  { ref: "LUNA-L01-CLUB", kind: "interior", patterns: ["residents club", "residents' club", "the club", "the gym", "fitness club"] },
  { ref: "LUNA-PENTHOUSE", kind: "interior", patterns: ["the penthouse", "penthouse"] },
  { ref: "LUNA-L10-APT-A", kind: "interior", patterns: ["premium residence", "level 10 apartment"] },
  { ref: "LUNA-B1", kind: "level", patterns: ["the basement", "basement", "b1"] },
  { ref: "LUNA-GROUND", kind: "level", patterns: ["the ground floor", "ground floor", "the ground level"] },
  { ref: "LUNA-L06", kind: "level", patterns: ["level 6", "floor 6", "the sixth floor", "l06"] },
  { ref: "LUNA-L10", kind: "level", patterns: ["level 10", "floor 10", "the tenth floor"] },
];

/** Which sensor a bare "temperature in <space>" / "leak in <space>"
 * question resolves to — keeps that mapping out of the parser itself. */
export const SPACE_SENSOR_ALIASES: Array<{ spaceRef: string; kind: "temperature" | "leak"; sensorRef: string }> = [
  { spaceRef: "LUNA-L06-APT-A-LIVING", kind: "temperature", sensorRef: "LUNA-L06-APT-A-LIVING-TH-01" },
  { spaceRef: "LUNA-L06-APT-A", kind: "temperature", sensorRef: "LUNA-L06-APT-A-LIVING-TH-01" },
  { spaceRef: "LUNA-L06-APT-A", kind: "leak", sensorRef: "LUNA-L06-APT-A-KITCHEN-LEAK-01" },
  { spaceRef: "LUNA-L06-APT-A-KITCHEN", kind: "leak", sensorRef: "LUNA-L06-APT-A-KITCHEN-LEAK-01" },
];

function findByPattern<T extends { patterns: string[] }>(list: T[], text: string): T | undefined {
  // Longest-pattern-first so "primary bedroom light" beats a shorter
  // "bedroom light" collision, and "booster pump 01" beats "pump 01" vs
  // "pump 1" ambiguity consistently.
  const sorted = [...list].sort((a, b) => Math.max(...b.patterns.map((p) => p.length)) - Math.max(...a.patterns.map((p) => p.length)));
  return sorted.find((item) => item.patterns.some((p) => text.includes(p)));
}

export function matchSystem(text: string): OperationalSystem | undefined {
  return findByPattern(SYSTEM_ALIASES, text)?.system;
}

export function matchAsset(text: string): string[] | undefined {
  const found = findByPattern(ASSET_ALIASES, text);
  if (!found) return undefined;
  return Array.isArray(found.ref) ? found.ref : [found.ref];
}

export function matchSpace(text: string): SpaceAlias | undefined {
  return findByPattern(SPACE_ALIASES, text);
}
