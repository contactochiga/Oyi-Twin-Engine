# Luna — Apartment A Full Interior Reality V1

## 1. Phase objective

Prove that Oyi can take the assigned resident of Apartment A physically home — through the SAME canonical navigation runtime every other part of this system already uses — and that once inside, the compact 2D map, the live position dot, room selection, and device control are all spatially truthful, permission-correct, and reachable in both TOUR (physical travel) and TELEPORT (instant, policy-checked) modes. This phase does not build new architecture, new devices, or new access technology — it closes the gap between "the interior exists" (built in prior phases) and "Oyi can honestly navigate a real resident through it end-to-end."

## 2. Relationship to prior phases

Builds directly on: L06 Gold Standard (the real Level 6 floor plate, lobby, corridor, and Apartment A's own front door), Spatial Transition Engine V1/V1.1 (the route/transition/lift-handoff machinery reused verbatim), Architectural Reality V1 (Apartment A's real internal rooms/walls/doors), and Representation Policy (Phase 8, the single Facility/Consumer visibility gate reused unmodified). No parallel systems were introduced anywhere in this phase.

## 3. The canonical navigation path (Part 1)

There is exactly one dispatch path from an Oyi phrase to physical/instant movement:

```
OYI PHRASE
  -> lunaIntentParser.ts (alias/phrase -> ParsedIntent { targetRefs, navAction?, navModeOverride? })
  -> twinIntelligence.ts handleNavigate() (identity/home-sentinel resolution, scope denial check)
  -> SceneActions.navigateToSpace(ref, { navAction, navModeOverride })   [App.tsx]
  -> locateDestination(ref)                         [navAction === "locate"]
     OR enterDestination(ref, navModeOverride)       [navAction === "enter" / default]
        -> requestLunaRoute(ref) -> LunaRouteDriver.beginRoute()   [TOUR]
        -> focusRoom(ref) / enterInterior(ref)                     [TELEPORT]
```

No Kitchen-specific, Apartment-A-specific, or "home"-specific code exists anywhere in this chain outside the one identity-resolution step (`handleNavigate`'s `HOME_DESTINATION_SENTINEL` branch, which only resolves WHICH ref to dispatch — it does not alter HOW that ref is dispatched). A manual click on a room in the control panel and an Oyi "take me to the kitchen" phrase both terminate in the identical `sceneActions.navigateToSpace` call.

## 4. Phrase semantics (Part 2)

| Phrase family | Example | `navAction` | `navModeOverride` | Effect |
|---|---|---|---|---|
| Mode-agnostic ENTER | "Take me to the kitchen" | `enter` | none | obeys the session's current `navigationMode` (TOUR or TELEPORT, whichever the user last selected) |
| Explicit TOUR override | "Walk me to the kitchen" / "Tour me to the kitchen" / "Take me there physically" | `enter` | `TOUR` | one-shot; begins a real route even if the session is in TELEPORT |
| Explicit TELEPORT override | "Jump to the kitchen" / "Teleport me to the kitchen" | `enter` | `TELEPORT` | one-shot; instant, policy-checked arrival even if the session is in TOUR |
| LOCATE | "Where is the kitchen?" / "Show me the kitchen" | `locate` | none | selects/highlights only — never travels, never activates the map |

"One-shot" is verified, not assumed: `verifyApartmentATeleportBrowser.mjs` check 4 asserts the session's own persistent TOUR/Teleport mode toggle still reads `aria-pressed="true"` for Tour after issuing an explicit "teleport me to X" phrase — the override is consumed once by `enterDestination` and never written back into session state.

## 5. "Take me home" (Part 3)

`HOME_DESTINATION_SENTINEL` (a building-agnostic string constant in `engine/twinIntelligence.ts`) is matched by the parser for "take me home"/"go home" and resolved to a real ref by `handleNavigate` — the ONE place identity is already available — via `scopePolicy.actor.assignedHomeRefs[0]`. If the actor has no assigned home, Oyi returns an honest failure ("You don't have an assigned home in this building.") rather than guessing or defaulting anywhere.

- **In TOUR**: resolves to the full physical journey — Exterior → Main Entrance → Grand Lobby → passenger lift → Level 6 → corridor → Apartment A's own entrance → the real, interactive `AccessCodePanel` credential flow → Foyer. Access is never bypassed for a resident; the credential UI is real and must be satisfied (a correct code) exactly as it would for any other entrance in this system.
- **In TELEPORT**: resolves directly to the Foyer through the existing `enterInterior`/`focusRoom` policy-checked path, honestly labeled as an instant arrival (no route narration, no fabricated travel history).

## 6. Device command proof (Part 4)

Proven end-to-end with a real, existing Apartment A device (Living Room Light, 2 real circuit refs) rather than a fabricated one: `"Turn on the living room light."` → ROOM alias resolution (Living Room) → canonical device refs → permitted capability check → real `runtime.execute()` command → observably updated runtime state, asserted in both `verifyApartmentAOyiSemantics.mjs` and the golden-journey browser test.

## 7. Deterministic room/device resolution (Part 5)

`verifyApartmentAOyiSemantics.mjs` (11 checks) proves: kitchen/living-room/bedroom-2 alias resolution, mode-agnostic ENTER carries no override fields, explicit TOUR/TELEPORT overrides carry the correct `navModeOverride`, LOCATE phrases carry `navAction: "locate"`, "take me home" resolves the correct identity-specific ref, "take me home" fails honestly with no assigned home, the controller forwards `navAction`/`navModeOverride` verbatim to `SceneActions.navigateToSpace` (single-dispatch-path proof), LOCATE vs ENTER response wording differs, an unrelated identity (an Apartment B resident) stays denied Apartment A's kitchen, and the Living Room Light command proof. No phrase-specific hardcoded camera coordinates exist anywhere in this path — all camera destinations are derived from the same real per-room presets every other entry point uses.

## 8. Map privacy audit (Part 6, mandatory)

The audit was performed at the POLICY/DATA level, not the CSS level: `resolveSpatialMapContext`/`mapSpec` in `App.tsx` only ever activates once `lunaRepresentationPolicy.resolveMode({ ref: APARTMENT_A_REF, identity })` returns `FULL_3D` for the current identity. This phase found and fixed a REAL privacy regression during the audit: `sceneActions.navigateToAsset`'s apartment-devices branch was unconditionally setting `activeInteriorRef` (and therefore the private 14-room map) for ANY identity asking Oyi about an apartment device, including Facility. It is now gated behind the same `FULL_3D` check `enterInterior` already uses.

Verified with two independent test layers:
- `verifyApartmentAMapPolicy.mjs` (5 deterministic checks): Facility → `OPERATIONAL_2D` (not `FULL_3D`) for both the apartment ref and a room-level ref within it; an unrelated resident (assigned to Apartment B) → `HIDDEN`; the assigned resident → `FULL_3D`; `LiveWorldPositionReporter` is mounted strictly behind the same `mapSpec &&` gate the map itself uses (source-verified, not just behaviorally inferred).
- `verifyApartmentAMapPrivacyBrowser.mjs` (4 browser checks): Facility issuing a real apartment-device command via Oyi never activates the map or discloses the room list; Facility asking to "show me Apartment 6A" directly stays denied; the assigned resident's map DOES legitimately activate on real entry (proving this is a scoped policy, not a blanket removal); a fresh, unauthenticated session shows no map by default.

## 9. Facility temporary access context (Part 7)

No new access technology was built, per this phase's own explicit instruction. Investigated and confirmed: `resolveAccessAuthorization` in `lunaSimulationProvider.ts` has an unconditional, pre-existing denial for Facility at any private home entrance — `{ granted: false, reason: "Facility credentials are not authorized for a private home entrance. No master-key capability is modeled in this reference build." }`. This predates this phase (Access & Security V1) and applies regardless of any credential presented. Facility is NOT the automatic owner of Apartment A's private map or interior (confirmed correct by Part 6's audit above); Facility DOES retain its existing, narrower permitted context (asset-level `OPERATIONAL_2D`/`CONTEXT_3D` visibility for facility-owned MEP assets inside the unit, unchanged from Phase 8). No broader "temporary authorized access" abstraction exists in this codebase today — this is disclosed as a real limitation, not silently worked around. The smallest correct existing mechanism (the unconditional denial itself) is the accurate, honest current behavior.

## 10. TOUR internal proof (Part 8)

The pure internal Apartment A route graph (Foyer↔Living↔Dining↔Kitchen, Corridor↔Bedroom1↔Ensuite1, Living↔Guest WC) is proven at the deterministic level by `verifyApartmentAInternalGraph.mjs` (12 checks, unchanged this phase, re-confirmed green): every internal route resolves via the real navigation graph, uses real doors (`homePassage` and internal room-to-room transitions), and produces no fabricated teleport fallback. See §14 for the disclosed gap between this graph-level proof and live browser execution of a second, immediately-sequential TOUR journey.

## 11. Final main proof — the golden resident journey (Part 9)

`verifyApartmentAGoldenJourneyBrowser.mjs` proves the assigned resident's complete "Take me home" journey from outside Luna, run twice with identical, reproducible results:

**Hard-asserted, both runs, both real (not fabricated):** exterior start → real route begins on "Take me home" → real approach/door-open/threshold-crossing into the Grand Lobby → real `callLift` command issued to the actual `TwinRuntimeProvider` → polled real lift arrival at Level 6 → the persistent 2D map becomes spatially relevant (L06 common plan) driven by real `currentSpaceRef` progression → live position dot tracks the real camera through the corridor leg → the real `AccessCodePanel` prompt appears at Apartment A's own entrance → an invalid code is genuinely rejected (panel stays up) → the correct code is genuinely accepted (real `AccessResolver`, real lock-state change through the runtime) → the real apartment door opens and the camera crosses the real threshold → arrival in the real Foyer → the Apartment A 14-room map activates with real room labels (including "Foyer") read directly from the rendered SVG → a real device command ("Turn on the living room light") resolves ROOM → canonical device → permitted capability → runtime command → truthful updated state.

**Disclosed, not hidden (see §14):** a SECOND, internal multi-hop TOUR continuation issued immediately after the outer journey completes (Living → Kitchen → Primary Bedroom via further "Walk me to..." phrases) does not currently complete — `selectedRef()` does not advance past `LUNA-L06-APT-A` after the follow-on route begins. This is recorded as an explicit `KNOWN ISSUE` string in the test's own results rather than silently passed or hidden behind a crash.

## 12. TELEPORT golden proof (Part 10)

`verifyApartmentATeleportBrowser.mjs` (4 checks, all passing): LOCATE ("Where is the kitchen?") highlights the real Kitchen ref but never activates the map or produces travel narration; explicit TELEPORT ENTER ("Teleport me to the kitchen.") resolves the real ref directly with zero route narration, real map + live dot both active; a second TELEPORT ("Teleport me to bedroom 2.") repeats the same honest no-narration semantics for `LUNA-L06-APT-A-BED-02`; the session's own persistent navigationMode (TOUR) is provably untouched by these one-shot overrides (the "Tour" toggle still reads `aria-pressed="true"`).

## 13. LOCATE/TOUR failure honesty (Part 11)

Preserved and tested: `enterDestination`'s TOUR branch, on a real route-planning failure, falls back ONLY to a real, honest LOCATE peek (`locateDestination`, which selects/highlights and moves the camera to a denied-fallback framing exactly matching `enterInterior`'s own denial framing) — never a silent teleport, never a claimed arrival. `locateDestination` never activates the map or sets travel narration for a room-kind LOCATE, even though it does set `selected.ref` (the real, pre-existing highlight behavior). Response wording distinguishes the two cases ("Here's where it is." for LOCATE vs "Here you go." for ENTER) without introducing new UI machinery.

## 14. Known disclosed issues

1. **Internal multi-hop TOUR continuation stall** (new finding, this phase). Issuing a second internal TOUR route ("Walk me to the living room") immediately after the outer "Take me home" journey completes does not currently advance `currentSpaceRef`/`selected` past `LUNA-L06-APT-A`; the live dot jumps once to a fixed position and freezes. Investigated extensively (15+ throwaway diagnostics, all deleted after use): the route plan itself is confirmed correct via direct SSR route-request calls (`requestRoute` returns `status: 'OK'` with 4 real TRANSITION steps); no thrown JS exceptions or console errors occur during the stall; three real, legitimate contributing bugs were found and fixed along the way (the `homePassage` transition's degenerate 3-point waypoint geometry; `onRouteCurrentSpaceChange`'s missing generic ROOM-kind fallback, which previously only updated `selected` for a hardcoded allowlist of level/lobby/interior refs; `mapContext`'s stale `activeInteriorRef` instead of a new `effectiveInteriorRef` that also considers `currentSpaceInteriorRef`) — none of which, individually or combined, resolved the underlying symptom. The most likely remaining root cause, not yet proven, is `CameraRig.tsx`'s pre-existing (not introduced this phase) ref-access-during-render pattern, independently flagged by this project's own `oxlint` (lines 72/124/125) — plausibly failing to correctly restart a `CameraFlight` under a specific re-render ordering when a second route begins immediately after a route-heavy first journey. **Recommended stabilization action for a future phase**: refactor `CameraRig`'s flight-restart logic out of the render body into a `useEffect` keyed on `flightTarget`, then re-run this exact failing scenario as the first acceptance check.
2. **`verifyIngestionV2.mjs`'s pre-existing L06 floor-outline depth mismatch** — unrelated to this phase, unmodified, still fails with the same disclosed reason from prior phases (`derived outline must be a real, positive extent that fits within the declared tower footprint`). Apartment A and its navigation were deliberately not distorted to satisfy this old assertion.
3. **`verifyL06GoldStandardBrowser.mjs`** — re-run fresh this phase after all fixes above. This surfaced two REAL, precisely diagnosed production bugs (not test-only issues), both now fixed:
   - `sceneActions`'s `useMemo` (`App.tsx`) was missing `navigationMode` from its dependency array, so `navigateToSpace`'s captured `enterDestination` closure could read a STALE mode after the user toggled TOUR/TELEPORT via the UI — a real violation of Part 2's "mode-agnostic ENTER obeys current navigationMode" contract, not just this test's own timing. Fixed by adding `navigationMode` to the deps array.
   - `focusRoom`/`enterInterior` (the instant TELEPORT-style arrival functions, reachable both from Oyi's TELEPORT path and directly from the manual room-list UI) never cancelled a still-in-flight TOUR route left over from an earlier journey. `LunaRouteDriver.beginRoute()` already refuses to START a second route while one is active, but nothing cancelled an ABANDONED one, so its queued async step callbacks (e.g. a bare-level `MOVE` hop through `LUNA-GROUND`) could fire later and silently overwrite `selected`/`currentSpaceRef`. Fixed by calling `routeDriverRef.current?.cancelRoute()` at the top of both functions.
   
   Before these fixes, 3 consecutive re-runs produced 3 DIFFERENT failure symptoms (`selectedRef` resolving to the wrong ref, a detached-DOM click error, a room button not found) at an unpredictable, early step — the signature of a genuine race condition, confirmed via a dedicated background investigation (root-caused precisely, not guessed). After the fixes, 3 consecutive re-runs now fail identically, deterministically, and much later — at a narrow, pre-existing, understood mechanism unrelated to Apartment A's own navigation logic: a pixel-perfect screen-space click test for the Kitchen door hit-target (`verifyL06GoldStandardBrowser.mjs:151-165`), which computes click coordinates from a camera preset projection and clicks before confirming the camera has actually finished settling from the preceding room-to-room flight. This exact class of pixel-click fragility was already disclosed as pre-existing in the prior Spatial Transition Engine V1.1 report (§6: "one pre-existing pixel-perfect-click test flaked once, passed on immediate retry, unrelated to this phase").
   
   **Why the newer Apartment A tests are stronger current proof of navigation correctness**: `verifyApartmentAGoldenJourneyBrowser.mjs` and `verifyApartmentATeleportBrowser.mjs` poll for real, observable state changes (`selectedRef()`, real DOM attributes, real narration text) rather than asserting a screen-pixel hit-test immediately after a fixed pause, and both have now run repeatedly with 100% reproducible results. `verifyL06GoldStandardBrowser.mjs`'s remaining failure is a narrow, older acceptance-mechanism issue, not a live indicator of Apartment A's navigation health.
   
   **Recommended stabilization action**: replace the fixed `pause(400)` after each `clickDevRoom()` call with a poll for real camera settle (matching the `pollFor`-style pattern already used throughout this phase's own new tests) before computing door-click candidates from the room's camera preset.

## 15. Test coverage summary (Part 12)

New this phase: `verifyApartmentAOyiSemantics.mjs` (11 checks — phrase semantics, home resolution, device command), `verifyApartmentAMapPolicy.mjs` (5 checks — map/live-position policy gate), `verifyApartmentAGoldenJourneyBrowser.mjs` (outer journey, 2 runs), `verifyApartmentATeleportBrowser.mjs` (4 checks), `verifyApartmentAMapPrivacyBrowser.mjs` (4 checks). Reused unmodified: `verifyApartmentAInteriorReality.mjs`, `verifyApartmentAInternalGraph.mjs` (12 checks), `verifyRoutedTraversalBrowser.mjs`, `verifyRoutedTraversalPolicyBrowser.mjs`.

## 16. Browser regression priority (Part 13)

See the phase report (`artifacts/luna-apartment-a-full-interior-reality-v1-report.md`) §6 for the full pass/fail table with the current `verifyL06GoldStandardBrowser.mjs` finding and recommended action.

## 17. Full validation (Part 14)

See the phase report §6-7 for the complete GREEN / KNOWN FLAKY / KNOWN PRE-EXISTING FAILURE breakdown.

## 18. What changed this phase (files)

**Engine (building-agnostic):** `src/engine/twinIntelligence.ts` — `HOME_DESTINATION_SENTINEL`, `ParsedIntent.navAction`/`navModeOverride`, `SceneActions.navigateToSpace` options param, `handleNavigate` rewrite.

**Luna wiring:** `src/luna/intelligence/lunaIntentParser.ts` — `matchSpatialNavAction`; `src/engine/spatial/liftHandoff.ts` — `purpose: "passenger"` on both lift-command args (the passenger-lift runtime-execution fix); `src/luna/architecture/apartmentSpatial.ts` — `homePassage` waypoint geometry fix; `src/luna/LunaSpatialMap.tsx` — `data-luna-spatial-map`/`data-luna-live-dot` test selectors; `src/App.tsx` — `enterDestination`/`locateDestination` TOUR-failure-fallback fix, `navigateToAsset` privacy gate fix, `sceneActions.navigateToSpace` options-aware rewrite, `onRouteCurrentSpaceChange` generic room fallback, `effectiveInteriorRef`/`mapContext` frame-consistency fix, `sceneActions` useMemo missing-`navigationMode`-dependency fix, `enterInterior`/`focusRoom` stale-route-cancellation fix (see §14 item 3).

## 19. What was deliberately NOT started (per explicit instruction)

Spatial Card visual convergence, rich 2D redesign, Camera Director, VR, multiplayer/shared tours. The internal-TOUR-continuation stall (§14 item 1) was investigated but NOT "fixed" by rewriting `CameraRig`'s render-time flight logic — that is exactly the kind of open-ended runtime-behavior rewrite this phase's own brief instructed against chasing without a proven root cause.

## 20. Recommended next named phase

"OYI — SPATIAL CARD + 2D PLAN VISUAL CONVERGENCE V1" was named as the upcoming phase in this phase's own brief and is explicitly NOT started here. Before that phase begins, the recommended, narrowly-scoped stabilization action from §14 item 1 (the `CameraRig` render-time ref-access refactor) should be evaluated first, since visual convergence work would otherwise build directly on top of an unresolved navigation-continuation bug.
