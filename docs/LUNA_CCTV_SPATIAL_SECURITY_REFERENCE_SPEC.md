# Luna CCTV & Spatial Security System V1 — Access Event → Camera Association → Spatial Investigation → Camera Context → Oyi

Status: REFERENCE / CONCEPTUAL / SIMULATED. No live video, PTZ, or recording exists anywhere in this reference build — this document describes four registered reference cameras and one real, canonical camera-to-access-point correlation, never a production surveillance system.

## 1. Audit (performed before implementation)

**Existing CCTV assets.** Exactly four cameras already existed with real canonical refs, all `kind: "camera"`, `system: "security"`, `classification: "observable"`, `capabilities: []`, driven by `readOnlyBehavior((s) => s.online === false ? "offline" : "normal")` with `initialState: { online: true }`: `LUNA-GROUND-SEC-CAM-01` (Ground Entrance), `LUNA-GROUND-LOBBY-CAM-01` (Lobby), `LUNA-B1-PARKING-CAM-01` (Parking/B1), `LUNA-L06-COMMON-CAM-01` (Level 6 Corridor). A `camera-offline` scenario already existed (`lunaScenarios.ts`) that drops `LUNA-GROUND-SEC-CAM-01` offline — reused as-is, not recreated. Oyi vocabulary already existed for all four ("entrance camera", "lobby camera", "parking camera", "level 6 camera", etc.) — extended, not duplicated.

**No live-video abstraction exists.** `lunaRuntimeSeed.ts`'s own pre-existing comment states plainly: camera streams have "no non-fake way to represent" in this codebase, which is why `stream.start`/`stream.stop`/`door_release` are deliberately unmapped capabilities everywhere they appear. No WebRTC/RTSP/video-tag/HLS code exists anywhere in `src/`.

**Master Equipment Schedule boundary.** EQ-CCTV documents exactly these four cameras as `observable; DD13, DD14`. EQ-RECORDING documents "No registered instance yet" — no NVR/recording asset exists at all. Both confirm: PTZ, recording, playback and event-search must not be fabricated.

**Existing Access V1 event model reused, not recreated.** `AccessEvent { id, at, label, detail? }`, capped at 40, newest-first, produced exclusively by `resolveAccessAuthorization()`'s gate inside `execute()` for the one governed reference lock (`LUNA-L06-APT-A-ENTRY-LOCK-01`). This phase reads that log; it never writes to it.

**The one real camera-to-access-point correlation.** `LUNA-L06-APT-A-ENTRY-INTERCOM-01` ("Video Intercom / Doorbell") is already `kind: "camera"` in the canonical schedule, sitting at the identical `locationLabel` ("Level 06, Apartment A — Entry") and within a metre of the apartment's own entrance lock — the obvious, real correlation for the one access point Access V1 actually generates GRANTED/DENIED events for. `LUNA-GROUND-SEC-CAM-01` sits at the identical `locationLabel` ("Ground — Main Entrance") as `LUNA-GROUND-ACCESS-MAIN-01`, ~1m apart — a second real correlation. Every other access-point/camera pair (Service Entrance vs. the Parking camera — different `locationLabel`s, 3m apart; Lift Lobby; the Floor 6 corridor camera) was deliberately left **without** an edge: an honest, disclosed DESIGN DECISION REQUIRED gap, never inferred from proximity.

**No camera geometry existed** — all four rendered via the generic tinted marker box before this phase.

## 2. Canonical camera model — zero new assets

Every ref this phase touches already existed. The conceptual model (Identity/Location/State/Telemetry/Capabilities/View Context/Relationships/Events/Permissions) maps entirely onto the existing canonical asset registry — no second camera registry was created:

| Field | Source |
|---|---|
| Identity/Location | `lunaOperationalAssets.ts` (unchanged) |
| State | `resolveCameraState()` (new, reads the existing runtime row) |
| Capabilities | `availableCommandsFor()` (unchanged — always `[]` for these four) |
| Relationships | `LUNA_ENGINEERING_RELATIONSHIPS` (two new `monitored_by` edges) |
| Events | Access V1's own `AccessEvent` log (read-only, never duplicated) |
| Permissions | `lunaRepresentationPolicy.ts` (unchanged) |

## 3. Camera state — `resolveCameraState()`

`src/luna/runtime/lunaCameraResolver.ts` — one derived, zero-arg-per-camera read, mirroring `resolveBuildingPower()`/`resolveFireState()`/`resolveHvacState()`/`resolveAccessAuthorization()`'s exact philosophy: computed fresh from canonical assets' live runtime rows every call, never stored/duplicated state.

```ts
type CctvCameraState = "online" | "offline";
interface CctvCamera { ref, label, locationLabel, state, online, monitorsAccessPointRef }
```

State is deliberately limited to **online/offline** — the only field the runtime already tracks. **FAULT and MAINTENANCE are NOT implemented**: no `fault`/`maintenance` field exists on any camera's runtime row and no scenario sets one. This is the same "do not blindly implement every state" discipline Access V1 already established for door-motion states — implementing them would mean inventing new runtime fields with no backend basis, exactly what the brief prohibits.

## 4. Camera capabilities — zero, honestly

All four cameras expose `availableCommands: []`. No LIVE_VIEW, PTZ, ZOOM, SNAPSHOT, RECORDING, PLAYBACK, or EVENT_SEARCH capability is exposed anywhere — the Control Board's `CommandButtons` component correctly renders nothing for any of them (the exact same generic mechanism every other system's own "no fabricated commands" boundary already relies on), and the asset panel explicitly discloses why ("No PTZ, recording or live-view capability is instrumented for this camera in this reference build (DESIGN DECISION REQUIRED)").

## 5. Physical realism

`src/luna/operational/CctvPlantEquipment.tsx` — `CameraGeometry`: a wall/ceiling-mounted bullet camera with a distinct body, a short mounting bracket, a forward-facing dark lens, and a status LED whose **color** (not just intensity) follows the camera's own real online/offline state (green/red). Manufacturer-neutral REFERENCE DESIGN, replacing the generic marker box via the same by-ref dispatch pattern every prior system's equipment uses. No field-of-view cone was added — the brief's own instruction that such a cone, if present, "must NOT determine authorization/event truth" made it simpler and more honest to omit it entirely for V1 rather than build a purely decorative element that could be misread as operational.

## 6. Spatial camera selection

Selecting a camera (Engineering → Security, or directly in the 3D view) already flies the Twin camera to it, highlights it, and opens the contextual Control Board via the exact same generic `select()`/`useIsSelected()`/camera-flight mechanism every other operational asset already uses — no camera-specific spatial code was needed. All three discovery paths (Engineering → Security/CCTV; spatial selection; Oyi) converge on the identical `resolveCameraState()` truth, verified in both the deterministic and browser suites.

## 7. Control Board

`src/luna/operational/{lunaCctvBoard.ts, CctvAssetPanel.tsx, CctvControlBoard.tsx}` — the seventh `SystemControlBoard` consumer, after Elevators/Water/Electrical/Fire/HVAC/Access. Four tabs (Camera 01–04, matching the brief's own numbered-selector example, default: Camera 01/Ground Entrance Camera), a live `CctvStatusSummary` header widget listing all four cameras' real state, and an `AccessCorrelationSummary` section (shown whenever the focused camera has a real `monitored_by` relationship) displaying the correlated access point's live state and recent access events — reading the identical `resolveAccessState()`/`getAccessEvents()` truth the Access Control Board itself uses.

## 8. Access event correlation — the central feature

Two real, canonical `monitored_by` edges (added to the pre-existing `LUNA_ENGINEERING_RELATIONSHIPS` array, the exact relationship type already used for the kitchen leak sensor — no new relationship type was needed):

```
LUNA-GROUND-ACCESS-MAIN-01     --monitored_by-->  LUNA-GROUND-SEC-CAM-01
LUNA-L06-APT-A-ENTRY-LOCK-01   --monitored_by-->  LUNA-L06-APT-A-ENTRY-INTERCOM-01
```

`resolveCameraForAccessPoint(ref)` walks this edge in the forward direction; the generic `RelationshipList` component (already used by every other system's asset panel) walks it in reverse to show "Monitors: X" on the camera's own panel — no bespoke correlation UI code was needed beyond the two data edges themselves. Verified end-to-end: a real `ACCESS_GRANTED`/`ACCESS_DENIED` event at the governed lock is immediately reflected in the intercom's own Oyi narrative and Control-Board-style correlation summary.

## 9. Investigation flow

"Show me the camera associated with the last denied access." resolves — deterministically, without reading live state inside the parser itself (the same purity every other matcher preserves) — to `LUNA-L06-APT-A-ENTRY-INTERCOM-01`, since it is the one real, canonical correlation for the one governed reference access point in this catalog. The resulting narrative (composed by `lunaExplain.ts`, which *does* read live state) then honestly reports the camera's own online/offline state, what it monitors, and the real most-recent access event — a genuine investigation, not a fabricated one. The Twin itself is the map: no separate surveillance UI was built.

## 10. Oyi

Extends `lunaVocabulary.ts`/`lunaIntentParser.ts`/`lunaExplain.ts` only — no CCTV-specific intelligence system. New `matchCctvInvestigation` matcher (inserted after `matchAccessStatus`, before the generic `matchQuery`) resolves "Show me the cameras.", "Show me the camera associated with...", "Show me the last access event."/"Show me the security event.", and "Take me to the camera." New vocabulary aliases: `"camera 01"`–`"camera 04"` (added to each camera's existing pattern list, matching the brief's own numbered-selector phrasing) and the apartment intercom's own first-ever aliases (`"the camera at apartment 6a"`, `"the intercom"`, etc.). Every new pattern was checked for substring collisions against the full existing pattern list and every other system's own target-phrase list — directly re-tested in `scripts/verifyCctv.mjs` (Electrical's "active power path", HVAC's "turn on the AC", Access's "is the main entrance locked", and Water's "the water tank" all re-verified unaffected). All 8 of the brief's own target phrases verified end-to-end.

## 11. Facility/Consumer representation — RepresentationPolicy unchanged

`lunaRepresentationPolicy.ts` was not modified. The four common cameras are ordinary common infrastructure (`system: "security"`, not `vertical-transport`) — `FULL_3D` for Facility, and per the pre-existing `resolveAssetMode()` rule, **`HIDDEN` for any resident** (a resident does not gain Facility CCTV visibility merely because a camera exists in a common space they pass through — Section 15's requirement, already true before this phase, re-verified not broken). The apartment intercom follows the exact pre-existing private-unit rule: `HIDDEN` to Facility, `FULL_3D` for the assigned resident. Proven end-to-end via a full `TwinIntelligenceController` round-trip: the assigned resident's "Show me the camera associated with the last denied access." investigation succeeds completely; the identical Facility request is denied completely — **the camera never becomes an authorization authority, and private-unit privacy holds even for security investigation.**

## 12. Access/CCTV boundary

Access owns identity, credential, authorization, physical access, access result, and the access event. CCTV owns camera identity, camera state, camera capability, camera context, and camera-related events (`CAMERA_ONLINE`/`CAMERA_OFFLINE`, observable via the existing `online` field transitions — no new event TYPE object was created; camera state changes are read directly off the runtime row, the same way every other system's state change already is). Verified directly: a camera going offline never writes to the Access event log (`scripts/verifyCctv.mjs` check 6) — CCTV consumes/correlates Access's events, it never produces or duplicates them, and it never decides whether access should be allowed.

## 13. Elevator relationship

Untouched. No canonical relationship ties any camera to elevator interiors, lobbies, or dispatch — none was fabricated. The four-lift motion architecture and its own Control Board are unmodified and re-verified green.

## 14. DO NOT OVERBUILD — explicitly honored

No Network/Edge implementation, facial recognition, computer vision, person tracking, threat detection, autonomous surveillance, production camera stream, cloud video management, external CCTV vendor, biometric system, advanced recording infrastructure, or security operations centre was added.

## 15. Known limitations (disclosed, not defects)

- Only two of the four common access points (Main Entrance, and the apartment's own lock) have a real, canonical camera correlation — Service Entrance and Lift Lobby are honestly left uncorrelated rather than guessed from proximity.
- No live video, PTZ, recording, or playback exists anywhere — every camera is state-only reference/context, clearly labelled "(reference simulation)" throughout.
- FAULT/MAINTENANCE camera states are not modeled — no runtime field or scenario supports them.
- No field-of-view cone geometry was added, to avoid any risk of a purely visual element being misread as operational/authorization truth.
- Camera framing for individual asset tab selections can land inside architecture geometry — the same pre-existing, already-disclosed camera-preset limitation from the Physical Reality Convergence report.
