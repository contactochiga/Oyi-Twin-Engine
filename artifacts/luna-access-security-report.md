# Luna Access & Security System V1 — Final Report

Status: **Complete.** Full regression green. No CCTV/Network/Edge work begun. No new runtime/control architecture beyond a genuinely new (but minimal) authorization gate. `lunaRepresentationPolicy.ts` unchanged.

## Screenshots

| # | Requirement | File |
|---|---|---|
| 1 | Access NORMAL, Engineering → Access & Security | `artifacts/luna-access-normal-state.png` |
| 2 | Whole registered access-point network | `artifacts/luna-access-whole-network.png` |
| 3 | Main Entrance (spatial LOCATE) | `artifacts/luna-access-main-entrance.png` |
| 4 | Service Entrance (spatial LOCATE) | `artifacts/luna-access-service-entrance.png` |
| 5 | Lift Lobby (spatial LOCATE) | `artifacts/luna-access-lift-lobby.png` |
| 6 | Denial path (real authorization gate) | `artifacts/luna-access-denied.png` |
| 7 | Grant path (real authorization gate) | `artifacts/luna-access-granted.png` |
| 8 | Access Control Board with event history | `artifacts/luna-access-control-board.png` |
| 9 | Oyi investigation ("Why was access denied?") | `artifacts/luna-access-oyi-investigation.png` |

Screenshots 6/7 were captured by calling the LIVE app's own `runtime.execute()` directly with a Facility actor (denied) and then the assigned resident's actor (granted) — the real authorization gate, not a UI-hidden button — exactly proving the brief's own worked examples against the running app, not just the Node-side deterministic test.

## Existing access/security evidence (from the audit)

Three common access points and two apartment devices already existed with real canonical refs. The Master Equipment Schedule's own "Current instance register" was the decisive audit finding: the three common points are documented `observable; none` in the real backend data — upgrading them to controllable would have fabricated capability data. The apartment's own entrance lock, however, was already fully real and controllable (`lockBehavior`, `lock`/`unlock`). See `docs/LUNA_ACCESS_SECURITY_REFERENCE_SPEC.md` §1 for the full audit.

## Assets reused / canonical IDs

`LUNA-GROUND-ACCESS-MAIN-01`, `LUNA-B1-ACCESS-SERVICE-01`, `LUNA-GROUND-ACCESS-LIFT-LOBBY-01`, `LUNA-L06-APT-A-ENTRY-LOCK-01`, `LUNA-L06-APT-A-ENTRY-INTERCOM-01` (untouched) — all pre-existing. **Zero new canonical operational assets were created.**

## Access state model

Physical state (`AccessPointState.locked: boolean | null`) and authorization result (`AccessAuthorizationResult { granted, reason, role }`) are kept strictly separate, per the brief's own instruction — verified with both worked examples (GRANTED: door releases; DENIED: door stays locked) in the deterministic suite. Door-motion states (OPENING/OPEN/CLOSING/CLOSED) and FAULT were deliberately not implemented — no real capability or door-motion data supports them for this reference chain, matching the "do not blindly implement every state" instruction and the same discipline already applied to HVAC's "standby" and Fire's "pre-alarm."

## Identity/credential/authorization

`resolveAccessAuthorization()` (`src/luna/runtime/lunaSimulationProvider.ts`, re-exported from `lunaAccessResolver.ts`) reuses the existing `RepresentationIdentity` shape as the credential — no new identity database. Facility, the assigned resident, another resident, and the pre-existing `"public"` role (Visitor/Unauthorized) were all exercised in both the deterministic and live-browser suites. Wired into `execute()` at the same choke point every command already passes through — a genuinely new architectural layer (every prior system only ever gated by capability existence, never per-actor authorization), added specifically because the brief requires demonstrable GRANTED/DENIED outcomes with reasons and events, independent of whatever the renderer happens to show.

## Access event log

`AccessEvent`, capped at 40, newest-first — identical shape/convention to `FireEvent`/`ElectricalEvent`. Emits `ACCESS_GRANTED`/`ACCESS_DENIED` (with reason) on every authorization attempt at the governed lock, plus `LOCKED`/`UNLOCKED` on the resulting real state change.

## Physical geometry

`AccessPlantEquipment.tsx` — a reader/control-panel silhouette for the three common points and a wall keypad/plate (real-state-driven LED) for the apartment lock, both manufacturer-neutral REFERENCE DESIGN. No door-leaf geometry exists anywhere in the codebase (confirmed during the audit — `InteriorRoom`'s `doorSide` only cuts a wall opening) — disclosed as a geometry gap rather than fabricated, per the brief's own escape hatch.

## Controls

Sixth `SystemControlBoard` consumer (`AccessControlBoard.tsx`), three real tabs (Main Entrance default/Service Entrance/Lift Lobby), a live `AccessStatusSummary` header widget plus a `ReferenceChainSummary` (all four points + recent events) on the Main Entrance tab. The three common points correctly expose zero commands (no fabricated control authority, matching the real schedule). The apartment lock is deliberately not a board tab (HIDDEN to Facility) — it stays operable via the existing interior device-interaction surface, the same disclosed boundary HVAC's indoor units already established.

## Oyi

All 9 of the brief's own target phrases verified end-to-end (parser + narrative). `matchAccessStatus` resolves aggregate/investigation questions to `LUNA-GROUND-ACCESS-MAIN-01`, the one honest anchor whose narrative covers every registered point plus the real event log — the same "one anchor for an aggregate question" precedent as Fire's panel and HVAC's outdoor condenser. Every new vocabulary pattern was checked for substring collisions against the full existing pattern list and every other system's target phrases — directly re-tested in `scripts/verifyAccess.mjs` (Electrical's "active power path" and HVAC's "turn on the AC"/"is the AC running" phrases re-verified unaffected), the discipline the HVAC phase's own "the ac"/"the active" regression made mandatory going forward.

## Permissions — no defect found, no change made

The three common points remain `FULL_3D` for Facility (ordinary common infrastructure, unchanged rule). The apartment lock remains `HIDDEN` to Facility / `FULL_3D` for the assigned resident (unchanged, pre-existing private-unit rule). This phase's audit specifically considered whether `resolveAssetMode()`'s resident-HIDDEN-for-common-infrastructure rule was a defect relative to the brief's Consumer-visibility requirement, and concluded it is not: it is consistent, pre-existing, intentional behavior already identical across Water/Electrical/Fire/HVAC, and the brief's requirement is satisfied by the resident's own already-`FULL_3D` apartment lock plus ordinary architectural navigability — a separate concern from operational-asset-marker governance. `lunaRepresentationPolicy.ts` was not modified.

## DD13 unresolved decisions

Overall security/access zoning strategy, credential technology, lock manufacturer/model, encryption standard, statutory compliance, the parking gate ("provision pending" per the schedule, no vehicle gate asset fabricated), door-leaf hardware for the three common points, and any CCTV correlation — all remain exactly as documented in the canonical decision register. None were resolved or silently chosen by this phase.

## Safety/engineering boundaries

- No lock/door capability was fabricated for the three common access points.
- The one governed lock keeps its exact pre-existing capability — no door-motion command was invented.
- Facility is denied master-key authority at the private lock — no such capability is documented anywhere.
- No security certification, biometric technology, credential technology, lock manufacturer, or encryption standard was claimed.
- No new simulator, control architecture, or `RepresentationPolicy` change.

## Test results

- **Deterministic** (`npm run test:access`) — 18/18 PASS, including both GRANTED and DENIED worked examples (resident/Facility/other-resident/visitor/no-actor), event-log capping, vocabulary collision re-checks, RepresentationPolicy re-verification, and a full Oyi controller round-trip.
- **Browser** (`npm run test:access:browser`) — all checks PASS, 9 screenshots, denial and grant proven against the LIVE app's own `runtime.execute()`, full Elevator/Water/Electrical/Fire/HVAC regression included.
- **Full regression re-run, all green**: `test:representation`, `test:presentation` (browser), `test:architecture`, `test:lift` (det+browser, RepresentationPolicy hash unchanged), `test:four-lift` (det+browser), `test:control-surface` (browser), `test:water` (det+browser), `test:electrical` (det+browser), `test:electrical-live-ops` (det+browser), `test:fire` (det+browser), `test:hvac` (det+browser), `tsc -b`, `npm run build`, `npm run lint`.

## Known limitations

- The three common access points have no instrumented lock telemetry — the real, current backend state, not a gap this phase could close without inventing data.
- No door-leaf geometry exists anywhere in the codebase — the reader/lock hardware is recognizable on its own, but there is no animated door leaf, since no real capability or motion data exists to drive one.
- The intercom's `door_release` capability remains unmapped, a pre-existing decision predating this phase.
- Camera framing for individual asset tab selections can land inside architecture geometry — the same pre-existing, already-disclosed camera-preset limitation from the Physical Reality Convergence report.

## Regressions checked

Four lifts, Elevator Control Board, Water reference chain + Control Board, Electrical V1/V1.1 (incl. live building-supply summary), Fire Control Board + investigation flow, HVAC Control Board + reference chain, Unified Control Surface, Presentation, Representation (byte-hash unchanged), Architecture — all explicitly re-verified green.

## Final validation checklist

- [x] Every modified/created file inspected
- [x] No duplicate canonical assets (zero new assets created)
- [x] No renderer-owned truth (`resolveAccessAuthorization()`/`resolveAccessState()` are the single source; the renderer only ever displays them)
- [x] No second simulator (authorization + events live inside the existing provider's `execute()`)
- [x] No new intelligence subsystem (extends the existing parser/vocabulary/explain layer only)
- [x] Oyi/UI consume the same resolver (`resolveAccessState()`/`getAccessEvents()`)
- [x] `RepresentationPolicy` unchanged (byte-hash re-verified)
- [x] Existing systems intact (full regression green)
- [x] Full regression run (deterministic + browser)
- [x] Browser verification performed against the live app
- [x] Screenshots captured (9, covering every required visual-quality item)
- [x] Final report written

## Stop condition

Complete and fully verified. Per the brief's own "DO NOT OVERBUILD" list: no CCTV/biometric/production-credential/external-integration/cloud-identity/visitor-management/SOC/Network-Edge work begun. `lunaRepresentationPolicy.ts` unchanged (byte-hash re-verified), no canonical IDs duplicated, no production/cloud changes.
