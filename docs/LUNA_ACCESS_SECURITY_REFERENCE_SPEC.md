# Luna Access & Security System V1 — Identity → Credential → Access Point → Authorization → Physical Boundary → Access Event → Audit

Status: REFERENCE / CONCEPTUAL / SIMULATED. Security zoning is unresolved (DD13) — this document describes ONE governed reference access point (Apartment 6A's own entrance lock) plus three registered, honestly-uninstrumented common access points, never a whole-building access-control claim, a certified security system, or a statutory-compliance posture.

## 1. Audit (performed before implementation)

**Existing access/security assets.** Three common access points already existed with real canonical refs: `LUNA-GROUND-ACCESS-MAIN-01` (Main Resident Entrance), `LUNA-B1-ACCESS-SERVICE-01` (Service Entrance), `LUNA-GROUND-ACCESS-LIFT-LOBBY-01` (Lift Lobby Access) — all `kind: "access-point"`, `system: "access"`, `classification: "observable"`, `capabilities: []`. Two apartment-scoped devices already existed and were already real, controllable, runtime-backed assets: `LUNA-L06-APT-A-ENTRY-LOCK-01` (`lockBehavior`, capabilities `lock`/`unlock`, already driving a visual lock indicator since Phase 12) and `LUNA-L06-APT-A-ENTRY-INTERCOM-01` (capabilities `stream.start`/`stream.stop`/`door_release`, of which only the stream commands are mapped — `door_release` is a pre-existing, deliberate architectural decision, documented in `docs/LUNA_MASTER_EQUIPMENT_SCHEDULE.md`'s own interpretation notes: "elevator `call`/service `fire_service_mode`, intercom stream/release and fire-panel silence/reset are not generally mapped by today's runtime"). No dedicated access resolver, authorization model, event log, Control Board, geometry, or Oyi vocabulary existed for any of these before this phase.

**Master Equipment Schedule boundary — the single most load-bearing audit finding.** The schedule's own "Current instance register" documents the three common access points as `observable; none` and the private lock as `controllable; lock, unlock` — nothing more. This means the three common points cannot legitimately be upgraded to controllable without fabricating capability data the backend never seeded, exactly the discipline `lunaOperationalAssets.ts`'s own header comment establishes ("every ref, capability, and seeded state below is copied verbatim from the actual local backend data... nothing here is invented for the viewer"). This single finding shaped the entire phase: rather than inventing an "open the main gate" command that doesn't exist anywhere in the canonical data, the reference chain this phase builds its full IDENTITY → CREDENTIAL → ACCESS POINT → AUTHORIZATION → PHYSICAL BOUNDARY → ACCESS EVENT model around is the ONE already-real, already-controllable access point: Apartment 6A's own entrance lock.

**No architectural door-leaf geometry exists anywhere in the codebase.** `InteriorRoom.tsx`'s `doorSide` prop only cuts a wall opening (a gap) — it has never rendered an actual door mesh, at the Ground main entrance or anywhere else. A separate, currently-dormant glTF import pipeline (`src/luna/architecture/groundAsset.ts`/`GroundArchitecture.tsx`, a hardened, unrelated foundation-scope adapter for a *possible future* imported Ground envelope) exists but has zero registered asset files and is not the active Ground rendering path (`LunaLevel.tsx` falls back to the same procedural `LevelFacade` every other level uses whenever no `groundArchitecture` source is supplied, which is always, today). Per the brief's own escape hatch ("If the geometry cannot safely support the behaviour yet, implement the operational contract first and document the geometry gap"), this phase does not fabricate a door leaf — it adds recognizable reader/lock/keypad hardware only, and discloses the door-leaf gap here rather than silently working around it.

**What remains DESIGN DECISION REQUIRED because DD13 is unresolved:** overall security/access zoning strategy, credential technology (card/fob/biometric/mobile — none chosen or implied), lock manufacturer/model, encryption standard, statutory compliance posture, parking gate (Master Equipment Schedule: "parking gate provision pending" — no vehicle gate asset exists and none is fabricated here), door-leaf/motion hardware for the three common points, and any CCTV correlation (DD13 explicitly: "no private-home CCTV implied").

## 2. Canonical assets — zero new operational assets

Every access-related ref this phase touches already existed:

| Ref | Classification | Real capabilities | Role in this phase |
|---|---|---|---|
| `LUNA-GROUND-ACCESS-MAIN-01` | observable | none | Reference-chain aggregate anchor (Oyi + Control Board default tab); honestly discloses no instrumented lock |
| `LUNA-B1-ACCESS-SERVICE-01` | observable | none | Registered physical boundary marker only |
| `LUNA-GROUND-ACCESS-LIFT-LOBBY-01` | observable | none | Registered physical boundary marker only |
| `LUNA-L06-APT-A-ENTRY-LOCK-01` | controllable | lock, unlock (unchanged) | The one governed reference access point — full authorization/event model |
| `LUNA-L06-APT-A-ENTRY-INTERCOM-01` | controllable | stream.start/stop (door_release stays unmapped, unchanged) | Untouched, out of scope |

No classification, capability, or behavior was changed on any pre-existing asset. `lockBehavior` in `lunaRuntimeBehaviors.ts` is byte-for-byte unchanged.

## 3. Access state model — physical state vs. authorization result

Per the brief's explicit instruction, these are two strictly separate concepts, never collapsed:

- **Physical state** (`AccessPointState.locked: boolean | null`) — the lock's own real runtime field. `null` for the three uninstrumented common points (never a fabricated boolean), a real boolean for the governed lock.
- **Authorization result** (`AccessAuthorizationResult { granted, reason, role }`) — computed fresh by `resolveAccessAuthorization()` on every command attempt, entirely independent of physical state, and never itself stored as state.

Worked examples, both verified end-to-end in `scripts/verifyAccess.mjs`:

- Door: LOCKED. Access attempt (assigned resident): AUTHORIZATION GRANTED → command proceeds → door: UNLOCKED. Two access events logged: `ACCESS_GRANTED`, `UNLOCKED`.
- Door: LOCKED. Access attempt (Facility / wrong resident / visitor / no credential): AUTHORIZATION DENIED → command refused → door: still LOCKED (physical state untouched). One event logged: `ACCESS_DENIED`, with the reason.

Door-motion states (OPENING/OPEN/CLOSING/CLOSED) and the FAULT/UNKNOWN access states are deliberately **not implemented** for this reference chain — per the brief's own "do not blindly implement every state" instruction, nothing in the canonical capability data (`lock`/`unlock` only) supports a door-motion command, and no fault scenario is wired for this asset. This mirrors the exact discipline HVAC applied to "standby" and Fire applied to "pre-alarm": states are added only when the architecture actually supports them.

## 4. Identity/credential/authorization — `resolveAccessAuthorization()`

`src/luna/runtime/lunaSimulationProvider.ts` (re-exported from `src/luna/runtime/lunaAccessResolver.ts`, matching every other resolver's own file shape). Reuses the exact same `RepresentationIdentity` shape (`role: "facility"|"resident"|"public"`, `assignedHomeRefs`) every other system already reads as its "credential" — no new identity/credential database was created, per the brief's explicit instruction. The pre-existing `"public"` role (already a data-model placeholder before this phase) stands in for Visitor/Unauthorized.

```ts
function resolveAccessAuthorization(identity, ref): { granted: boolean; reason: string; role: "facility"|"resident"|"public" }
```

Rules, all deterministic:
1. Not a governed ref (the three common points) → always denied, reason discloses "no controllable capability... DESIGN DECISION REQUIRED" — never a fabricated grant/deny for a point that has no real lock to grant or deny.
2. Facility role at the private lock → **denied**. No master-key capability is documented anywhere in the canonical catalog; this deliberately mirrors the HVAC phase's own disclosed precedent (resident-owned in-home devices stay resident-only, no fabricated Facility override).
3. Resident role, `assignedHomeRefs` includes the lock's `unitRef` → **granted**.
4. Resident role, different `unitRef` → denied.
5. Public role or no identity presented at all → denied. Never fails open.

This is a genuinely new architectural layer (every prior system only ever gated commands by capability-existence, never by per-actor authorization) — wired into `execute()` at the exact same choke point every command already passes through, so it protects the real runtime regardless of which UI or Oyi path reaches it, not merely which button the renderer happens to render.

## 5. Access event log

`AccessEvent { id, at, label, detail? }`, capped at 40, newest-first — the exact same shape/convention as `FireEvent`/`ElectricalEvent`, piggybacking on the same `notify()`/`subscribe()` pub-sub every asset-state change already uses. Every authorization attempt at the governed lock logs `ACCESS_GRANTED` or `ACCESS_DENIED` (with the authorization reason), and every resulting physical-state change additionally logs `LOCKED`/`UNLOCKED`. Read via `lunaRuntimeInternals.getAccessEvents()` and the `useAccessEvents()` hook.

## 6. `resolveAccessState()` — the single derived truth

`src/luna/runtime/lunaAccessResolver.ts` — one derived, zero-arg read, mirroring `resolveFireState()`/`resolveHvacState()`'s exact philosophy: computed fresh from canonical assets' live runtime rows every call, never stored/duplicated state. Returns all four registered points (`instrumented`/`locked` per point, honest `null` for the three uninstrumented ones) plus the most recent access event. The Access Control Board, Oyi, and the Oyi narrative layer all read this exact function — never a second, independently-derived notion of "what's locked."

## 7. Physical equipment geometry

`src/luna/operational/AccessPlantEquipment.tsx` (two components, replacing the generic tinted-box marker):

- **`AccessReaderPanelGeometry`** — a slim wall/post-mounted control panel with a card-reader face and a status LED, used for the three common access points. No door-leaf geometry (see §1's disclosed gap) — the panel stands on its own as recognizable hardware.
- **`AccessLockKeypadGeometry`** — a compact wall-mounted keypad/plate beside the apartment entry, whose LED reflects the governed lock's OWN real `locked` state (green when locked, amber when unlocked) — geometry only ever renders runtime state, never owns it.

Both are manufacturer-neutral REFERENCE DESIGN, matching every prior system's own equipment contract — no security-certification, biometric technology, or lock-manufacturer claim anywhere in the geometry or its labels.

## 8. Access Control Board

`src/luna/operational/{lunaAccessBoard.ts, AccessAssetPanel.tsx, AccessControlBoard.tsx}` — the sixth `SystemControlBoard` consumer, after Elevators/Water/Electrical/Fire/HVAC. Three tabs: Main Entrance (default), Service Entrance, Lift Lobby — the three common, Facility-visible points. Apartment 6A's own lock is deliberately **not** a tab here (it is `HIDDEN` to Facility — see §9), exactly the same disclosed boundary HVAC's indoor units already established; it stays operable via the existing interior device-interaction surface, not this board. Discoverable via Engineering → Access (no Oyi command required — the `"access"` system entry already existed in `systemPresentation.ts` from an earlier phase) and via spatial selection of any of the three markers. Live `AccessStatusSummary` header widget reads the same `resolveAccessState()` truth; the Main Entrance tab additionally shows a `ReferenceChainSummary` with all four registered points plus recent access events.

## 9. Facility/Consumer representation — RepresentationPolicy unchanged

`lunaRepresentationPolicy.ts` was not modified (byte-hash re-verified by `test:lift`). The three common access points are ordinary common infrastructure — `FULL_3D` for Facility (unchanged, pre-existing behavior). The private lock follows the exact pre-existing rule for private-unit assets not on the Facility-owned-unit allowlist: `HIDDEN` to Facility, `FULL_3D` for the assigned resident, `HIDDEN` for any other resident. No defect was found in `resolveAssetMode()` during this phase's audit — a resident's inability to see common-plant operational markers (including the three access points) is consistent, pre-existing, intentional behavior already established identically for Water/Electrical/Fire/HVAC; the brief's Consumer-visibility requirement ("their own home access, relevant common entrance/access context") is satisfied by the resident's own apartment lock (already `FULL_3D`) plus ordinary architectural navigability of common spaces — a separate concern from RepresentationPolicy's operational-asset-marker governance, not a gap that needed a policy change.

## 10. Oyi integration

Extends the existing `lunaVocabulary.ts`/`lunaIntentParser.ts`/`lunaExplain.ts` only — no Access-specific intelligence system. New `matchAccessStatus` matcher (inserted after `matchHvacStatus`, before the generic `matchQuery`) resolves aggregate/investigation phrasing that names no specific asset alias. New vocabulary aliases for the three common points (`"main entrance"`, `"main gate"`, `"residential entrance"`, `"building entrance"`, `"the lobby entrance"`, `"service entrance"`, `"lift lobby access"`, etc.) — every new pattern was checked against the full existing pattern list and every other system's own target-phrase list for substring collisions before being added, the exact discipline the HVAC phase's own "the ac"/"the active" regression established as mandatory. `LUNA-GROUND-ACCESS-MAIN-01` is the one aggregate anchor general access questions resolve to (mirroring `PANEL-01`/`AC-OUTDOOR-01`'s own precedent) — its `explainAccessState()` narrative covers every registered point plus the real event log. All 9 of the brief's own target phrases verified in `scripts/verifyAccess.mjs`, including the two imperative phrases naming uncontrollable common points ("Open the main gate.", "Lock the lobby entrance.") which correctly resolve to a command intent and then are honestly refused by the pre-existing generic capability check in `execute()` — no access-specific code was needed to produce that honesty.

## 11. Reference simulation — worked flows verified end-to-end

- Resident → valid credential → the reference lock → AUTHORIZED → ACCESS_GRANTED event → lock releases (real state change) → UNLOCKED event recorded.
- Unauthorized credential (Facility / wrong resident / visitor / missing) → the reference lock → DENIED → reason recorded → door remains locked → ACCESS_DENIED event recorded.
- Oyi, the Control Board, and the 3D representation all read the identical `resolveAccessState()`/event-log truth — verified via a full `TwinIntelligenceController` round-trip (resident unlock succeeds; Facility attempt denied) in both the deterministic and live-browser suites.

## 12. Elevator relationship

Untouched. Access and elevators remain fully separate systems — no group dispatch, no modification to the four-lift motion architecture. No canonical relationship exists tying any access point to elevator destination authorization, so none was fabricated; `CONTEXT_3D` for a lift remains strictly a viewing/context grant, never a control authorization, unchanged.

## 13. DO NOT OVERBUILD — explicitly honored

No CCTV correlation, biometric system, production credential infrastructure, external access-control integration, cloud identity provider, real-world security certification, visitor-management platform, SOC, or Network/Edge implementation was added. The access event model and spatial context this phase produces are structured so a future CCTV phase could consume them, but none of that consumption was built here.

## 14. Known limitations (disclosed, not defects)

- The three common access points have no instrumented lock/door telemetry — this is the current, real backend state (`observable; none`), not a gap this phase could close without inventing data.
- No door-leaf geometry exists anywhere in the codebase (see §1) — the reader/lock hardware is recognizable on its own, but there is no animated door to show opening/closing, because no real capability or door-motion data exists to drive one.
- The intercom's `door_release` capability remains unmapped — a pre-existing, deliberate architectural decision from before this phase, not reversed here.
- Camera framing for individual asset tab selections can land inside architecture geometry — the same pre-existing camera-preset limitation already disclosed in the Physical Reality Convergence report, not introduced by this phase.
