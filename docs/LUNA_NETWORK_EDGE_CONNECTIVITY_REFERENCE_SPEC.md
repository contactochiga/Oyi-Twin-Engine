# Luna Network / Edge & Physical Connectivity V1 — Asset → Edge → Protocol/Connection → Runtime → Oyi

Status: REFERENCE / CONCEPTUAL / SIMULATED. No SDN, packet inspection, bandwidth/latency telemetry, or cybersecurity tooling exists in this reference build. THE NETWORK CARRIES TRUTH. IT DOES NOT CREATE TRUTH — this document describes ONE real, pre-existing physical backbone chain plus an honest, disclosed non-connection, never a whole-building network claim.

## 1. Audit (performed before implementation)

**The existing Oyi Edge/Core asset.** `LUNA-EDGE-CORE-01` ("Luna Oyi Edge Core") already existed: `kind: "edge-node"`, `system: "network-edge"`, `classification: "observable"`, `capabilities: []`, runtime state `{ online: true, uplink_up: true }`. Critically, it has **no `parentRef`** and **no relationship of any kind** to the physical network chain anywhere in canonical data. Its own `seededState` already carried an explicit disclosure predating this phase: *"Local digital-twin prototype placeholder, no real edge runtime connected."* This is the single most important audit finding and the one this entire phase is built around honoring, not silently fixing.

**The rest of the canonical network/edge inventory** — exactly six other assets, all pre-existing:

| Ref | Kind | Classification | Real capabilities |
|---|---|---|---|
| `LUNA-B1-NET-GATEWAY-01` | device (gateway) | observable | none |
| `LUNA-GROUND-NET-WIFI-AP-01` | device (gateway) | observable | none |
| `LUNA-RISER-NETWORK-01` | device (riser) | asset-only | none |
| `LUNA-L06-NETWORK-BRANCH-01` | device (floor_branch) | asset-only | none |
| `LUNA-L06-APT-A-NET-ONT-01` | device (ont) | observable | none |
| `LUNA-L06-APT-A-ROUTER-01` | device (router) | observable | none |

**The real physical backbone chain already exists — via `parentRef`, from Phase 10.** This was the second major audit finding: `LUNA-RISER-NETWORK-01.parentRef = LUNA-B1-NET-GATEWAY-01`, `LUNA-L06-NETWORK-BRANCH-01.parentRef = LUNA-RISER-NETWORK-01`, `LUNA-L06-APT-A-NET-ONT-01.parentRef = LUNA-L06-NETWORK-BRANCH-01`, `LUNA-L06-APT-A-ROUTER-01.parentRef = LUNA-L06-APT-A-NET-ONT-01`, and separately `LUNA-GROUND-NET-WIFI-AP-01.parentRef = LUNA-B1-NET-GATEWAY-01`. This is a complete, real, physically-plausible "Asset → Edge → Runtime" chain that simply had no resolver, geometry, Control Board, or Oyi surface built on top of it before this phase — the exact kind of "connectivity already established but never surfaced" situation Section 3 of the brief anticipated.

**A real, confirmed data gap.** `LUNA-L06-APT-A-ROUTER-01` already had a `seededState` declaring `{ simulated: true, uplink_up: true }` in the canonical asset table, but had **no corresponding row at all** in `RUNTIME_SEED_ROWS` — `lunaSimulationProvider.getState()` would have returned `undefined` for it. This phase completes that wiring with the exact value already declared, not new data.

**Existing relationship model.** `EngineeringRelationshipType` already includes `monitored_by`, `supplied_by`, `connected_to`, etc. No new type was needed: the real chain is already fully expressed via `parentRef`, and Oyi's existing generic "connected to"/"connects to" relationship-question mechanism (`RELATIONSHIP_PHRASES`) correctly and honestly returns "I don't have that relationship on record" for any asset with no real edge — proven directly in this phase's own tests against the fire panel, with zero special-case code written for that negative answer.

**The route mechanism already worked.** `lunaServiceRoutes.ts`'s `UNIT_SYSTEM_TERMINATION` table already contained `"network-edge": "LUNA-L06-APT-A-NET-ONT-01"` for Apartment 6A (Phase 10) — meaning "Trace the network to Apartment 6A" already resolved correctly through the pre-existing `buildServiceRoute()` mechanism before this phase touched anything.

**RepresentationPolicy.** `LUNA-L06-APT-A-NET-ONT-01` was already on `FACILITY_OWNED_UNIT_ASSET_REFS` (Phase 10, with its own comment explaining it as the Facility demarcation point) — `CONTEXT_3D` for Facility. `LUNA-L06-APT-A-ROUTER-01` was deliberately **not** added to that list at the time, with the code's own comment already anticipating this: *"the resident's own router/AP, downstream of the ONT... distinct from the ONT (Facility-owned demarcation point) the same way a real apartment's router is the resident's own equipment."* This phase honors that pre-existing decision unchanged.

## 2. Canonical model — zero new operational assets

Every ref this phase touches already existed. No second network/edge registry was created; every asset, its state, and its one real relationship (`parentRef`) live entirely in the existing canonical registry and runtime provider.

## 3. Network state — `resolveNetworkState()`

`src/luna/runtime/lunaNetworkResolver.ts` — one derived, zero-arg read, mirroring `resolveBuildingPower()`/`resolveFireState()`/`resolveHvacState()`/`resolveAccessAuthorization()`/`resolveCameraState()`'s exact philosophy: computed fresh from canonical assets' live runtime rows every call, never stored/duplicated state.

State is limited to what the runtime already supports:

- `gatewayUplinkUp: boolean` — the gateway's own real `uplink_up` field.
- `backbone: NetworkBackboneNode[]` — riser/branch/ONT/router, each with a `reachable` boolean **derived fresh from the gateway's own uplink_up on every call**, never read back from a cached field.
- `wifiApReachable` / `wifiApClientsConnected` — derived the same way.
- `edgeCoreOnline: boolean` — Edge/Core's own real `online` field.
- **`edgeCoreConnected: false`** — hardcoded, always false. This is the resolver's own code-level enforcement of the central rule: no connection is claimed that isn't real.

## 4. THE NETWORK CARRIES TRUTH. IT DOES NOT CREATE TRUTH.

Enforced three separate ways in this implementation, not just stated as a principle:

1. **`edgeCoreConnected` is hardcoded `false`** in the resolver's own return type (`false` as a TypeScript literal, not `boolean`) — it is structurally impossible for this field to ever read `true` without changing the resolver's own type signature.
2. **The cascade (`recomputeNetworkState()`) only ever touches network/edge's own assets** — riser, branch, ONT, router, Wi-Fi AP — the exact same "cascade within one system's own domain" precedent as `recomputePowerNetwork()`'s MDB energization cascade. It never reaches into Electrical, Water, Fire, HVAC, Elevators, Access, or CCTV state.
3. **Proven directly in the test suite**: with the network fully offline (gateway uplink lost, entire backbone unreachable), Fire and HVAC were queried and both resolved their own complete, correct, fully independent state — Network/Edge is not a dependency of any other system's resolver.

## 5. Physical realism

`src/luna/operational/NetworkPlantEquipment.tsx` — three shapes, reused across the six devices by real equipment category, not one per ref: `NetworkRackUnitGeometry` (the core gateway and Oyi Edge/Core — both physically live in the B1 Network Room), `WifiApGeometry` (a ceiling disc for the common-area AP), `NetworkTerminationBoxGeometry` (a compact wall box shared by the apartment's ONT and its own router). Every status LED reflects that asset's own real runtime field. The data riser and floor branch deliberately get no bespoke geometry, matching every other system's own risers/branches — none of them get dedicated equipment shapes either.

## 6. Spatial discovery

Selecting a network/edge marker already flies the Twin camera to it and opens the contextual Control Board via the exact same generic `select()`/camera-flight mechanism every other operational asset already uses — no new spatial code was needed. Engineering → Network / Edge (already a fully-wired `SYSTEM_ORDER`/`SYSTEM_LABEL` entry from an earlier phase) opens the same board with no Oyi command required.

## 7. Control Board

`src/luna/operational/{lunaNetworkBoard.ts, NetworkAssetPanel.tsx, NetworkControlBoard.tsx}` — the eighth `SystemControlBoard` consumer. Three tabs: Gateway (default), Wi-Fi AP, Oyi Edge Core — the three common, Facility-visible assets. The Gateway tab shows a `BackboneChainSummary` (the real physical chain, live). The Oyi Edge Core tab shows an explicit `EdgeCoreDisclosure` — the central honesty statement rendered directly in the UI, not just documented. Apartment 6A's own ONT and router are deliberately **not** board tabs: the ONT is Facility-owned but private-unit-scoped (matching the established "private-unit asset is never a Facility board tab" precedent, even when `CONTEXT_3D`), and the router is the resident's own equipment (`HIDDEN` to Facility, same boundary as HVAC's indoor units / Access's own lock).

## 8. Reference simulation

A new scenario, `network-uplink-lost` (`lunaScenarios.ts`), reusing the exact `camera-offline` precedent's shape: patches the gateway's own real `uplink_up` field, then calls the one new `recomputeNetworkState()` cascade. Fully resettable via the existing `resetAll()` mechanism, which now also calls `recomputeNetworkState()` at the end, matching every other system's own reset behavior.

## 9. Oyi

Extends `lunaVocabulary.ts`/`lunaIntentParser.ts`/`lunaExplain.ts` only — no Network-specific intelligence system. New `matchNetworkInvestigation` matcher handles "Show me the network." (the same end-anchored-regex fix CCTV's own "show me the cameras" needed, since neither phrase contains the literal word "system"). New vocabulary aliases for the previously-unaliased floor branch, ONT, and router (including the possessive "Apartment 6A's router" phrasing). Every new pattern was checked for substring collisions against CCTV/Access/HVAC/Water's own target phrases — all re-verified unaffected in `scripts/verifyNetwork.mjs`. "What connects the fire panel to the network?" was deliberately given **no special-case code**: it honestly falls through to a plain query on the fire panel itself (no network mention, no fabrication); the more literal "Is the fire panel connected to the network?" correctly reaches the pre-existing generic relationship mechanism and answers "I don't have that relationship on record." "Trace the network to Apartment 6A" already worked before this phase touched anything (§1).

## 10. Facility/Consumer representation — RepresentationPolicy unchanged

`lunaRepresentationPolicy.ts` was not modified. Common network infrastructure (gateway, Wi-Fi AP, Edge/Core): `FULL_3D` for Facility, `HIDDEN` for any resident (a resident does not gain Facility network visibility merely because common infrastructure exists). The apartment's ONT: `CONTEXT_3D` for Facility (pre-existing allowlist entry, unchanged). The apartment's own router: `HIDDEN` to Facility, `FULL_3D` for the assigned resident (pre-existing, unchanged, and already anticipated by Phase 10's own code comment).

## 11. Known limitations (disclosed, not defects)

- No bandwidth, latency, packet, or protocol-level telemetry exists anywhere — state is limited to online/offline/uplink/reachable/client-count, the only fields the runtime already supports.
- Oyi Edge/Core has no established connection to the physical network — disclosed everywhere (resolver, panel, Oyi narrative), never silently fixed.
- Only one downstream apartment (6A) has a registered ONT/router pair; no other unit's connectivity is modeled.
- Camera framing for individual asset tab selections can land inside architecture geometry — the same pre-existing, already-disclosed camera-preset limitation from the Physical Reality Convergence report.

## 12. Unresolved design decisions

Overall network/edge strategy beyond the one registered reference chain, final edge-runtime integration for Oyi Edge/Core, bandwidth/QoS provisioning, VLAN/segmentation, any cybersecurity posture, and connectivity for Electrical/Water/Fire/HVAC/Elevators/Access/CCTV assets (none of which have any real, canonical connectivity relationship registered anywhere) all remain exactly as documented — none were resolved or silently chosen by this phase.
