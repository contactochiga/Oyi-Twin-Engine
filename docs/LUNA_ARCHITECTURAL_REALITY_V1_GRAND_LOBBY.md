# Luna Architectural Reality V1 — Grand Entrance + Lobby Gold Standard

## Classification: LUNA REFERENCE DESIGN

Luna is not the external architect's project — it is Oyi's own internally designed reference building. No real architectural source (RVT/IFC/CAD/PDF) exists for the Grand Entrance or Ground Lobby, and none was ever expected to: this phase's brief explicitly reverses the "source pending" framing used by the prior L06 Apartment A phase. Everything below is newly designed, original Luna architecture, honestly classified as **`LUNA_REFERENCE_DESIGN`** (new architecture authored for this reference building) or **`PROCEDURAL_REFERENCE`** (pre-existing procedural geometry this phase builds on, e.g. the podium massing box, the real lift/stair cores). Nothing here is labelled `ARCHITECT_APPROVED` or `CONSTRUCTION_APPROVED`.

The product thesis this phase serves: the building itself is the interface. Real architectural space, real spatial relationships, real interaction, canonical identity, operational state, and Oyi intelligence all converge in one place — the Ground Lobby is the first piece of Luna that reads as an actual building rather than a prototype.

---

## 1. Scope

Site arrival → Grand Entrance → entrance assembly → Grand Lobby → Reception/Lounge → passenger lift lobby → service/fire lift access → stair/service connections → ground-floor common circulation. Deliberately **not** in scope: the rest of the tower, L06 Apartment A (untouched, re-verified), facade redesign beyond the small entrance-area adjustment described in §9, B1/amenities/penthouse rebuild, a second ingestion architecture.

## 2. Design language

Premium contemporary Lagos waterfront residential tower — warm, sophisticated, restrained. Stone/glass/wood/bronze materials (§8), a coherent ceiling composition rather than a bare box, lighting that responds to the existing Day/Golden Hour/Evening modes. No gold excess, no sci-fi styling, no nightclub lighting, no oversized screens.

## 3. Main entrance

`src/luna/architecture/GroundEntrance.tsx` — an automatic sliding glass door assembly bound to the real canonical access-point asset `LUNA-GROUND-ACCESS-MAIN-01` (Access & Security V1's own "Main Resident Entrance", already real, already `instrumented: false` by that phase's own disclosed design). The door has a genuine state machine — `CLOSED → OPENING → OPEN → CLOSING → CLOSED` — driven by a `SlidingGlassDoor` engine primitive (`src/engine/components/SlidingGlassDoor.tsx`) whose leaf geometry actually translates in world space via `useFrame`, not a swapped sprite. Clicking the door mesh triggers the sequence; the opening pause is what actually fires `onEnter()` (the camera flight into the lobby), not a fixed timer racing the animation.

Because Access & Security V1 deliberately scoped `instrumented: true` to exactly one asset (`LUNA-L06-APT-A-ENTRY-LOCK-01`), the entrance door's own open/close behavior is explicitly a **REFERENCE SIMULATION** — local, client-side, non-authoritative — never routed through the Access authorization/command layer, and the door's own context card discloses this rather than claiming installed hardware. This is the same honest boundary the pre-existing Access Control Board already draws for this exact asset (`ACCESS STATUS (REFERENCE SIMULATION)` → `Main Resident Entrance: Not instrumented`).

## 4. Entering the building

Approach (real `entranceApproach` camera preset, target = the door's own real world position) → the real door mesh's own click handler (not a UI button) triggers `OPENING` → passing through is represented by the existing `enterInterior()` camera flight, fired from the door's real state transition (`onEnter`), landing inside the real Ground Lobby volume. No camera teleport bypasses the physical entrance — the same `SlidingGlassDoor` click IS what causes entry.

## 5. Grand Lobby architecture

`src/luna/architecture/GrandLobbyArchitecture.tsx` replaces the generic `InteriorLayer` for the Ground level. **Design decision, disclosed here rather than left silent:** the three lobby zones (Reception, Lounge, Lift Lobby) are rendered as one continuous open-plan floor+ceiling volume with three selectable zones, not three separately walled `InteriorRoom` boxes with doors between them — matching the brief's own "strong sense of arrival" language for a premium residential lobby, where a resident should see the whole space on entry rather than a corridor of closed rooms. Each zone remains independently selectable and independently identified by its own real canonical ref (`LUNA-GROUND-LOBBY-RECEPTION` / `-LOUNGE` / `-LIFTS`), unchanged from Phase 3.

### Ceiling and lighting

`src/luna/architecture/GrandLobbyCeiling.tsx` composes a perimeter soffit band, a recessed field, a linear light seam, a downlight grid, and (Reception only) a feature pendant — a real assembly, not a flat plane. `useGlowIntensity()` reads the existing `useLightingMode()` hook and lerps emissive intensity per mode (0.05 day / 0.55 golden hour / 0.9 evening) — every light source ties to the existing lighting system, none is invented independently of it.

### Materials

`lunaMaterials.ts` gained `ceilingFeature()`, `ceilingSoffit()`, `downlightGlow()`, `linearLightGlow()`, `receptionFeatureWall()`, `lobbyFloorStone()`, `lobbyFeaturePendant()` — premium stone/bronze/warm-glass PBR concepts, never a single uniformly glossy surface.

## 6. Reception and Lounge

Real feature wall + reception desk (Reception), real seating + planting (Lounge), both laid out with real circulation clearance around the open-plan volume — furniture placed, not just dropped into the pre-existing box.

## 7. Passenger lift lobby — the Part 12 fix

**Audit finding, not a rebuild:** `DynamicLift.tsx` already contained real, functional, per-floor landing-door geometry (jambs, lintel, threshold, animated sliding doors) — no new lift-door geometry was needed. What was genuinely broken: the Lift Lobby room rect (previously centered at x=9) never actually contained the real lift shaft positions (x≈-3…6.5 from `LUNA_CORES`). `src/luna/architecture/groundLobbyLayout.ts`'s `GROUND_LIFT_LOBBY_LAYOUT` recomputes the correct rect **live from the real `LUNA_CORES` data** (`coreExtentX()`), not a second hand-typed constant — it can never silently drift out of sync with the real lift positions again. This single computed value now feeds both the 3D room boundary and (via the existing derivation logic) the 2D floor plan, so 2D and 3D corrected together, automatically.

## 8. Service/fire lift and stairs

`LUNA-LIFT-SERVICE-01` is preserved exactly — no new certification claimed, the existing DD06/DD11/DD20 disclosures are unchanged — and is now architecturally distinguished by its own real signage panel rather than looking identical to the passenger bank. Both stairs (`LUNA-STAIR-01`/`-02`) get a real door/opening/landing at Ground, using the new `HingedDoor` engine primitive (`src/engine/components/HingedDoor.tsx`) — a genuinely different kinematic (pivot-around-hinge rotation) from the entrance's sliding translation, per the brief's own "do not make every door use the same animation" instruction. No fire-rating certification is claimed for either.

## 9. Structural coordination

Ground's real perimeter columns sit at z≈±14 (`LUNA_STRUCTURAL_ELEMENTS`), outside the lobby's own z∈[-7, 9] footprint — checked, not assumed; no column was moved or deleted to make room for the new architecture.

**Signage/entrance coordination fix (disclosed):** the pre-existing `LunaSignage.tsx` "LUNA RESIDENCES" panel was originally centered directly on the entrance's own approach axis (x=0) at almost the same depth as the new door (z≈17.32 vs the door's z=16) — a real conflict discovered live in the browser test, not assumed: it filled the entire `entranceApproach` camera frame and physically blocked raycasts meant for the door mesh. Fixed by moving the sign to `x=-16` (still on the same building face, still legible arrival signage, now clear of the entrance's own sightline and click path) and raising it slightly (`y = baseElevation + 3.2`). This is the one small, disclosed facade-area adjustment referenced in §1's scope note — no other exterior geometry was touched.

**Massing click-through fix (engine-level, disclosed):** `LevelMassing` (the generic engine primitive rendering every level's own solid, full-footprint hit-target box) unconditionally intercepted clicks anywhere on its front face, including exactly where the new, real, recessed entrance door sits 1m behind that face — the massing box was always nearer along the camera ray, so it always won the raycast. Fixed with a new, narrowly-scoped optional prop, `isClickThrough?: (point: THREE.Vector3) => boolean` (`src/engine/components/LevelMassing.tsx`): when a click point falls inside a caller-supplied region, the massing box declines to select itself and the click falls through to whatever real geometry is recessed behind it. Only `LunaLevel.tsx`'s Ground level supplies a predicate (bounded to the entrance opening's own real x/y extent); every other level's behavior is byte-identical to before. This is a real structural-coordination fix, not a general-purpose click-through mechanism.

## 10. Selection and context cards

`LunaContextCard.tsx`'s `door` branch now covers three real sub-cases — entrance, stair, and (unchanged) the L06 apartment lock — each with its own title/rows/privacy note. No actuator commands are attached to passive architecture: the entrance door's card discloses REFERENCE SIMULATION status rather than exposing a fake remote-open control.

## 11. Camera and navigation

`lunaCameraPresets.ts` gained `entranceApproach`; `lunaRoomCameraPresets.ts` gained Reception and Lift Lobby (Lounge already existed). All extend the existing `CameraFlightTarget`/`RoomCameraPreset` mechanisms — no second camera system was built.

## 12. 2D/3D correspondence

The Ground 2D floor plan derives its Reception/Lift Lobby regions from the exact same canonical room data (`LUNA_GROUND_LOBBY.rooms`, including the corrected `GROUND_LIFT_LOBBY_LAYOUT`) the 3D architecture reads — selecting the Lift Lobby region in 2D resolves to the same `LUNA-GROUND-LOBBY-LIFTS` ref the 3D scene uses. One building, two representations, proven live (`test:grand-lobby:browser` items 17–19).

## 13. Oyi

`lunaVocabulary.ts` gained a `"door"` kind for `SpaceAlias`, threaded through `ParsedIntent.targetKind`, `SpaceLookupResult`, and `navigateToSpace()` — the same generic machinery every other space kind already uses, not a parallel system. New aliases cover the entrance ("the entrance door"), both stairs, the three lobby zones, and "the ground floor". Two real vocabulary collisions were found and resolved live in the browser, not assumed: "the main entrance"/"main entrance" were already claimed by the pre-existing Access-system asset alias for the same ref (kept, not duplicated — see §14); "front door"/"the front door" were already claimed by the L06 apartment lock's own alias. Both colliding phrases were dropped from the new vocabulary rather than touching the pre-existing (already-completed) vocabulary they belonged to.

"Open the main entrance" was deliberately not wired to a fabricated command: no authorized, instrumented command exists for this asset (§3), so Oyi can locate and explain the entrance but does not claim to operate it.

## 14. A genuine dual-path outcome (not a bug)

Selecting the real Main Entrance ref (`LUNA-GROUND-ACCESS-MAIN-01`) is reachable through **two independent, pre-existing-vs-new** vocabulary paths that legitimately coexist: the original Access-system asset alias (`matchAsset` → `navigateToAsset` → `assetFocusCamera`, a close-up inspection shot) and this phase's new door alias (`matchSpace` → `navigateToSpace` → the `entranceApproach` preset). Both resolve to the same canonical ref; each fires a different, real camera behavior appropriate to its own use case (asset inspection vs. architectural approach). Verified non-colliding, not accidentally merged.

## 15. Facility vs. Consumer

**Facility** retains full common-infrastructure access: selecting the Main Entrance opens the pre-existing, real Access Control Board (`ACCESS STATUS (REFERENCE SIMULATION)`), unaffected by this phase. Facility also reaches granular per-room `FULL_3D` selection inside the lobby (Reception/Lounge/Lift Lobby individually, via `focusRoom()`).

**Consumer** (a resident) reaches the Grand Lobby as real, walkable spatial context under `lunaRepresentationPolicy.ts`'s pre-existing, **unmodified** `resolveLevelMode()`: residents get `CONTEXT_3D` for shared/common levels (not the private-unit `FULL_3D` reserved for their own assigned home) — confirmed live: clicking "Enter Ground Lobby" as Consumer resolves selection to the level itself (`LUNA-GROUND`), not per-room `FULL_3D` entry. This is the same policy every other common interior (Residents' Club, etc.) already uses; RepresentationPolicy was **not** broadened for this phase's visual convenience, per its own Part 25 instruction. The private raw access-point asset card stays `HIDDEN` to residents — the pre-existing Access & Security V1 boundary, re-verified, not a regression.

## 16. Performance

Ceiling/lighting geometry (soffit band, downlight grid, linear seam) uses merged geometry per composed group rather than one mesh per fixture; materials are created once via `useMemo` and shared per zone, not re-instantiated per frame; no new per-frame heavy computation was added beyond the existing `useFrame` lerps already used elsewhere in this codebase (door leaf translation, ceiling glow).

## 17. Architectural component library

Two new, genuinely building-agnostic engine primitives were added — `SlidingGlassDoor` and `HingedDoor` — both living in `src/engine/`, both using the existing `useSelection`/`useIsSelected`/`useCanonicalHoverHandlers` hooks with `kind: "door"`. Deliberately limited: this phase did not attempt a general component-framework rewrite. Luna-specific configuration (dimensions, materials, positions) stays in `src/luna/`; the engine primitives know nothing about Luna.

## 18. Reuse for future ingested buildings

The `"door"` kind now threads through the same generic layers (`TwinNodeKind`, `SpaceAlias.kind`, `SpaceLookupResult`, `ParsedIntent.targetKind`, `navigateToSpace()`) every other space kind uses — none of it is hardcoded to `LUNA-GROUND-LOBBY` specifically. A future ingested building's own entrance/lobby would reuse `SlidingGlassDoor`/`HingedDoor` and the same door-kind navigation path without engine changes.

## 19. Unresolved / design decisions required

- No real controllable hardware exists for the Main Entrance, Service Entrance, or Lift Lobby access points (Access & Security V1's own disclosed scope boundary) — the entrance door's open/close behavior remains a client-side REFERENCE SIMULATION until a real instrumented asset is registered.
- Whether Consumer scope should ever reach granular per-room `FULL_3D` selection inside common amenity spaces (vs. today's `CONTEXT_3D` whole-level view) is an open product question, not resolved here — today's behavior matches every other pre-existing common interior and was not changed.
- Fixture-level lobby furniture (exact reception desk hardware, precise lounge seating models) remains representative, not catalog-accurate.

## 20. Testing

- Deterministic: `npm run test:grand-lobby` (`scripts/verifyGrandLobby.mjs`) — 14 checks, run twice, stable both times.
- Browser: `npm run test:grand-lobby:browser` (`scripts/verifyGrandLobbyBrowser.mjs`) — 25-item acceptance walk, run twice, stable both times, zero page errors.
- Full existing regression suite (every prior phase, deterministic + browser) re-run clean — see `artifacts/luna-grand-lobby-report.md` §5.

## 21. Next phase (not started here)

"LUNA — TRUE FLOOR PLAN SYSTEM V1 / L06 GOLD STANDARD FLOOR", then "L06 APARTMENT A — FULL INTERIOR REALITY" (entrance → smart lock → foyer → living → dining → kitchen → bedrooms → bathrooms → windows → balcony → lighting → finishes → devices → MEP interfaces). Neither was begun in this phase.
