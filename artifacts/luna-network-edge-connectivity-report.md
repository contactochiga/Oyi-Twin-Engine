# Luna Network / Edge & Physical Connectivity V1 — Implementation Report

**Principle enforced throughout: THE NETWORK CARRIES TRUTH. IT DOES NOT CREATE TRUTH.**

## 1. Screenshots

| File | What it shows |
|---|---|
| `luna-network-engineering-board.png` | Engineering → Network / Edge opens the Control Board (Gateway tab, default) |
| `luna-network-backbone-chain.png` | Gateway tab: NETWORK STATUS summary + full real parentRef backbone chain, all reachable |
| `luna-network-wifi-ap-selected.png` | Wi-Fi AP tab: reachability + connected-client count |
| `luna-network-edge-core-disclosure.png` | Oyi Edge Core tab: explicit "no established connection" disclosure |
| `luna-network-uplink-lost.png` | `network-uplink-lost` scenario applied — gateway and entire backbone show unreachable |
| `luna-network-recovery.png` | Reset — gateway and full backbone chain return to reachable |
| `luna-network-oyi-investigation.png` | "Show me the network." resolved through Oyi, board opens |
| `luna-network-facility-view.png` | Facility Control Board: exactly 3 tabs (Gateway, Wi-Fi AP, Edge Core) — no apartment-private assets exposed |

## 2. Existing evidence (audit, before any code was written)

- `LUNA-EDGE-CORE-01` already existed with no `parentRef` and no registered relationship to the physical chain anywhere in canonical data — its own pre-existing `seededState` already disclosed "no real edge runtime connected."
- A complete real backbone chain already existed via `parentRef` (Phase 10): Gateway ← Riser ← Branch ← ONT ← Router, and Gateway ← Wi-Fi AP. No resolver, geometry, board, or Oyi surface had been built on it before this phase.
- `LUNA-L06-APT-A-ROUTER-01` had a seeded state but no runtime row — a real, confirmed gap, now fixed with the exact declared value.
- `UNIT_SYSTEM_TERMINATION["network-edge"]` already pointed at the Apartment 6A ONT — "trace the network to Apartment 6A" worked before this phase touched anything.
- `FACILITY_OWNED_UNIT_ASSET_REFS` already correctly distinguished the ONT (Facility-owned demarcation point) from the router (resident-owned) — unchanged.

## 3. Assets reused (zero new canonical operational assets)

All 7 network/edge refs (Gateway, Wi-Fi AP, Riser, Branch, ONT, Router, Edge/Core) pre-existed. This phase added no new asset to the canonical registry.

## 4. State model

`resolveNetworkState()` — zero-arg, computed fresh every call from live runtime rows, mirroring every prior resolver's discipline:
- `gatewayUplinkUp`, `backbone[].reachable`, `wifiApReachable`/`wifiApClientsConnected` — all derived fresh from the gateway's own `uplink_up` field, never read back from a cached/stored field.
- `edgeCoreOnline` — the node's own real field.
- `edgeCoreConnected: false` — hardcoded as a TypeScript literal `false`, not `boolean`. This is the code-level enforcement of the central rule, not a documentation-only disclosure.

FAULT/MAINTENANCE states were not implemented — the runtime has no real field to back them, and inventing one would violate the same "don't fabricate truth" principle this phase exists to enforce.

## 5. Capabilities

Zero new capabilities were added. Every network/edge asset remains `capabilities: []`, matching its pre-existing canonical declaration — no remote-control affordance exists in the reference build, and none was fabricated.

## 6. Physical geometry

`NetworkPlantEquipment.tsx` — three reusable shapes by real equipment category: rack unit (Gateway, Edge/Core), ceiling Wi-Fi disc (AP), wall termination box (ONT, Router). All status LEDs are driven by that asset's own real runtime field. Riser/branch get no bespoke geometry, matching every other system's own riser/branch treatment.

## 7. Controls — the eighth SystemControlBoard consumer

`NetworkControlBoard` — 3 tabs (Gateway default, Wi-Fi AP, Oyi Edge Core), all Facility-visible common assets. Gateway tab shows the live `BackboneChainSummary`. Edge Core tab shows the explicit `EdgeCoreDisclosure` honesty statement in the UI itself. Apartment 6A's ONT/router are deliberately not board tabs (private-unit-scoped / resident-owned, matching HVAC and Access precedent).

## 8. Central finding: the network never becomes a dependency

Enforced three ways:
1. `edgeCoreConnected` is structurally hardcoded `false`.
2. The cascade (`recomputeNetworkState()`) only ever writes to network/edge's own assets.
3. **Proven directly**: with the gateway uplink forced offline and the full backbone cascaded unreachable, `resolveFireState()` and `resolveHvacState()` were queried and both still resolved complete, correct, fully independent state.

## 9. Oyi

New matcher `matchNetworkInvestigation` ("Show me the network."), new vocabulary for the branch/ONT/router (including possessive "Apartment 6A's router"). "What connects the fire panel to the network?" was deliberately left without special-case code — it honestly falls through to a plain query with no network mention. "Is the fire panel connected to the network?" reaches the pre-existing generic relationship mechanism and correctly answers "I don't have that relationship on record." No fabrication anywhere in the Oyi surface.

## 10. Permissions / no-defect-found statement

RepresentationPolicy was not modified. Facility sees common network infrastructure in full; residents see none of it. The ONT remains Facility-context-visible (pre-existing), the router remains resident-only (pre-existing). No privacy or authorization defect was found or introduced by this phase.

## 11. Unresolved design decisions (explicitly not resolved by this phase)

- Overall network/edge strategy beyond the one registered reference chain.
- Final Oyi Edge/Core ↔ network runtime integration.
- Bandwidth/QoS provisioning, VLAN/segmentation, cybersecurity posture.
- Connectivity modeling for Electrical/Water/Fire/HVAC/Elevators/Access/CCTV — none have any real, canonical connectivity relationship registered anywhere.

## 12. Safety boundaries

Network/Edge cascade scope is fully contained to its own 5 downstream assets. No other system's resolver reads network state. No other system's cascade or resolver was modified.

## 13. Test results

- `scripts/verifyNetwork.mjs`: 17/17 checks passing.
- `scripts/verifyNetworkBrowser.mjs`: 5/5 journeys, 8/8 screenshots, all passing.
- Regression: Elevator, Water, Electrical, Fire, HVAC, Access, CCTV Control Boards all confirmed still working after this phase.
- `tsc -b`, `vite build`, `oxlint`: clean.

## 14. Known limitations

- No bandwidth/latency/packet/protocol telemetry — state limited to online/offline/uplink/reachable/client-count fields the runtime already supports.
- Oyi Edge/Core has no established connection to the physical network — disclosed everywhere, never silently fixed.
- Only Apartment 6A has a registered ONT/router pair.
- Individual asset-tab camera framing can land inside architecture geometry (pre-existing, already-disclosed limitation from the Physical Reality Convergence report).

## 15. Regressions checked

Elevator, Water, Electrical, Electrical Live Ops, Fire, HVAC, Access, CCTV — all re-verified green, both deterministic and browser suites.

## 16. Final validation checklist

- [x] Audit performed and documented before any code was written
- [x] Oyi Edge/Core's real (non-)connection state confirmed and honored, not silently fixed
- [x] Real pre-existing backbone chain (parentRef) discovered and surfaced, not reinvented
- [x] Runtime seed gap (router) fixed with the exact pre-declared value
- [x] Zero new canonical operational assets
- [x] Zero new capabilities
- [x] `edgeCoreConnected` hardcoded false at the type level
- [x] Cascade scope contained to network/edge's own assets only
- [x] Independence from network state proven for Fire and HVAC under a live outage scenario
- [x] Control Board built as 8th SystemControlBoard consumer, correct tab scoping
- [x] Facility/Consumer representation policy unchanged and correctly scoped
- [x] Oyi vocabulary/intent additions collision-checked against all prior systems
- [x] No special-case fabrication for the negative relationship case
- [x] Reference scenario + reset fully wired
- [x] Deterministic suite green (17/17)
- [x] Browser suite green (5/5 journeys, 8/8 screenshots)
- [x] Full regression suite green across all 7 prior systems
- [x] typecheck/build/lint clean

## 17. Stop condition

Per the brief's own Do Not Overbuild section: no SDN/VLAN tooling, no packet inspection or bandwidth telemetry, no intrusion detection, no cloud network console, no fabricated protocol stack, no new operational assets for schedule gaps, and no new capabilities for any of the eight completed systems were added. This phase is complete.
