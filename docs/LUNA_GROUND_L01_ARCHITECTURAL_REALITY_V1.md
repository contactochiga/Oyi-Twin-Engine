# Luna Ground + L01 Architectural Reality V1 — Phase 2

Status: **PARTIAL — authorized L01 openings coordinated; continuous stair egress and untouched B1/L02 plate coordination remain unresolved.** Classification: **LUNA_REFERENCE_DESIGN**, not approved structural design, installed equipment or certified egress. This phase ends before furnishing, exterior changes or an atrium.

## Inherited authority and scope

Read before implementation: [Phase 1 audit](LUNA_GROUND_L01_ARCHITECTURAL_REALITY_V1_AUDIT.md) and [machine-readable audit](../artifacts/luna-ground-l01-architectural-reality-v1-audit.json). Both remain byte-identical. The 934-file working-tree snapshot included uncommitted exterior work; it was preserved, not reset or replaced. Phase-specific changes are separated from inherited Git changes in [preservation evidence](../artifacts/ground-l01-v1/preservation.json).

The audit established Ground 44 × 34 m, datum 0, height 5 m; L01 40 × 30 m, datum 5 m, height 3.5 m. It found low ceilings/pendant, a real entrance-axis column, blocked core approaches, room/stair overlaps, duplicate floor layers and incomplete vertical openings. These findings were used directly. `lunaProgramme.ts`, canonical lift identities/stops/coordinates and RepresentationPolicy are unchanged.

The user subsequently authorized openings restricted to existing canonical lift/stair/riser footprints. Those L01/interface apertures are now coordinated. Continuous stair egress remains PARTIAL because the source lacks flights/landings and B1/L02 doorway definitions. No atrium is authorized or implemented.

## Geometry changes and achieved heights

All dimensions below are metres; areas are square metres. Datums are existing canonical finished walking surfaces, consistent with lift landing thresholds.

| Item | Inherited | Phase 2 | Source / interpretation |
|---|---|---|---|
| Ground gross envelope | 44 × 34; 1,496 | unchanged; X ±22, Z ±17 | `LUNA_LEVELS`, `lunaProgramme.ts` |
| L01 gross envelope | 40 × 30; 1,200 | unchanged; X ±20, Z ±15 | same |
| Ground / L01 / L02 datums | 0 / 5 / 8.5 | unchanged | same |
| Ground structural slab | Y 0…0.35 | Y −0.35…0 | `slabFor`, `structure/lunaStructuralElements.ts:37` |
| L01 structural slab | Y 5…5.35 | Y 4.65…5 | same; **vertical structural representation correction**, not a new opening |
| Ground structural slab plan | 43.12 × 33.32 | unchanged | same; existing 0.98 envelope factor |
| L01 structural slab plan | 39.2 × 29.4 | unchanged | same |
| L01 transfer layer | Y 7.9…8.5, 37 × 29 | unchanged | `LUNA-STRUCT-L01-TRANSFER-01` |
| Ground floor skin | duplicated above datum | Y −0.16…0 | `GroundExteriorEnvelope`; room selection is a thin surface at +0.001 |
| L01 finish floor | duplicated full floor / raised room finish | common skin −0.08…0 local, room surfaces at 0 local | `AmenityEnvelope`, `InteriorLayer`, `InteriorRoom.floorTop` |
| Ground arrival and Reception ceiling underside | approximately 2.21 clear | **4.20** | `PODIUM_CEILINGS`, `GrandLobbyCeiling` |
| Waiting Lounge ceiling underside | approximately 2.21 clear | **3.60** | same |
| Lift gallery ceiling underside | low generic ceiling/soffits | **2.95** | same |
| L01 room ceiling underside | approximately 2.29 clear | **2.80** above datum 5, world Y 7.80 | `InteriorLayer`, `PODIUM_CEILINGS.amenities` |
| Reception pendant | approximately 1.26 clear | removed | shallow reference lights; no chandelier |

The Ground arrival ceiling continues over the existing entrance approach (14 × 7 m, centre X 0 / Z 12.5), joining the unchanged 14 × 6 m Reception footprint at Z 9. Reception uses the high 4.2 m arrival ceiling because the two activities occupy the same canonical zone; a separate low concierge canopy was not invented. Waiting Lounge provides the moderate transition, and the gallery the lower transition.

Ceiling panels are 0.06 m thick. Ground flush reference lights project 0.012 m below them: minimum fixture undersides are 4.188 / 3.588 / 2.938 m. L01 ceiling top 7.86 is only **0.04 m below** the transfer underside; this is not a claimed MEP plenum. Conflicting generic amenity service-void markers were disabled. Service routing requires engineering coordination.

**Structural consequence:** lowering the Ground slab representation by 0.35 m reduces the reference B1 structural clearance (B1 slab top −3.65 to Ground underside −0.35) to **3.30 m**. B1 datum/geometry were not edited. This convention must be reviewed with the future structural source model. It is explicitly a canonical structural-element geometry correction, not merely a material edit.

Ground floor/structural slab openings now subtract the seven **existing** lift/stair/riser footprints. Total opening area is 78.94; structural gross area 1,436.7584 and net solid plan area 1,357.8184. Ground roof skin, L01 structural slab/finish and L01 transfer/roof openings are now coordinated; separate B1/L02 plate corrections and functional stair design remain unresolved. The physical lift simulation passing does not prove every enclosing slab is coordinated.

## Canonical spatial schedule

| Canonical ref | Centre X/Z | Width × depth; area | Change |
|---|---|---|---|
| `LUNA-GROUND-LOBBY-RECEPTION` | 0 / 6 | 14 × 6; 84 | footprint preserved; furniture/obstructing feature removed |
| `LUNA-GROUND-LOBBY-LOUNGE` | −15 / −2 | 10 × 10; 100 | footprint preserved; reference shell |
| `LUNA-GROUND-LOBBY-LIFTS` | 1.8 / 2.35 | 13.8 × 1.3; 17.94 | formerly 13.8 × 10 at Z −2, enclosing shafts; now front approach apron |
| `LUNA-L01-CLUB-POOL` | −14.5 / −4 | 9 × 16; 144 | moved from Z 0, dimensions/identity preserved |
| `LUNA-L01-CLUB-LOUNGE` | 14.5 / −4 | 9 × 16; 144 | same move |

Sources: `LUNA_GROUND_LOBBY` / `LUNA_L01_CLUB` in `interiors/lunaInteriors.ts:374`; `GROUND_LIFT_LOBBY_LAYOUT` in `architecture/groundLobbyLayout.ts`; `L01_AMENITY_CENTER_Z` in `architecture/podiumCoordination.ts:16`.

The 1.3 m Lift Lobby rectangle is a **threshold apron**, not the total waiting-area claim. Open Reception circulation continues immediately beyond it. Portal reveals occupy part of the apron; there is no new enclosed 1.3 m corridor. The Ground aggregate context envelope is 28.7 × 23 = 660.1, and the L01 Club aggregate is 38 × 17.5 = 665. These are bounding rectangles, **not net walkable or usable areas**; collision excludes cores/walls within them.

Three existing Ground room IDs are now normalized into the shared spatial model so 2D, selection and actual room arrivals agree. The existing `LUNA-L01-CLUB` aggregate is represented as a common area, not a third amenity room. No replacement asset identities were created.

Pool remains a reserved architectural zone. The old buried box representation was removed because it did not establish a coordinated pool basin. No water volume, slab recess, waterproofing, pool plant, telemetry or operability is claimed. Final basin and services remain DEFERRED.

## Structure, lift portals and stairs

The entrance-axis column (`LUNA-STRUCT-GROUND-COL-06`, centre X 0 / Z 14, 0.5 × 0.5 plan, 5 m high) is legitimate in the current structural catalogue and remains. All other column coordinates remain unchanged. Ground circulation detours on its east side; the main door has not moved.

`PODIUM_CORE_OPENINGS` defines eight approach apertures: four existing shaft X positions at Ground and L01, each 1.4 m wide × 2.5 m high. Structural front-core blocking is partitioned around these apertures; `PodiumCoreApproach` adds plain portal reveals at the existing core face, not new shafts or elevator identities. The door/shaft runtime geometry stays authoritative. Architecture faces reach the actual structural underside rather than stopping at the gallery ceiling.

| Core ref | X / Z | Footprint |
|---|---|---|
| `LUNA-LIFT-PASS-01` | −3 / 0 | 3 × 3 |
| `LUNA-LIFT-PASS-02` | 0 / 0 | 3 × 3 |
| `LUNA-LIFT-PASS-03` | 3 / 0 | 3 × 3 |
| `LUNA-LIFT-SERVICE-01` | 6.5 / 0 | 3.2 × 3.4 |
| `LUNA-STAIR-01` | −14 / 9 | 3.5 × 5.5 |
| `LUNA-STAIR-02` | 14 / 9 | 3.5 × 5.5 |
| `LUNA-RISER-01` | −8 / 0 | 1.6 × 1.6 |

Source: unchanged `LUNA_CORES` in `lunaProgramme.ts`.

L01 room north edges now end at Z 4; protected stairs begin at Z 6.25. Nominal gap is **2.25 m**, or **2.19 m** from the room wall's outer face at 4.06. North room openings are 1.4 m wide, facing the common route at Z 5.2. Neither amenity room overlaps a protected stair footprint.

Two new reference spatial door records identify L01 stair access faces: `LUNA-STAIR-01-L01-DOOR-01` and `LUNA-STAIR-02-L01-DOOR-01`. Their existing Ground reference dimensions are reused: 1.05 × 2.1 m at X ±14, Z 6.19, local floor 0/world floor 5. These are **STATIC_BOUNDARY**, not operational access assets or certified fire doors. They have no new actuator and do not enable stair travel. Stair flights, true landing openings and compliant egress remain unverified. A door rendered on the existing reference enclosure is not proof of a usable stair.

Service/fire lift access remains visible at X 6.5. A fully separated service corridor is not currently supported by the source programme; it has not been invented. The existing representative riser/containment mismatch identified in the audit remains outside this correction.

## Circulation and camera/Explore integration

The same transition graph/driver is used. Previously context-only common edges are now bound to actual `OPEN_PASSAGE` crossing paths. The route driver executes these through the existing approach/clearance/waypoint lifecycle; no teleport fallback or parallel state system was added.

```text
Ground, +Z toward entrance
EXTERIOR Z22 → MAIN ENTRANCE Z16
                   ↓
         east-side column detour X1.2, Z15.5 → Z12.5
                   ↓
           ARRIVAL / RECEPTION X0,Z8
             ↙             ↓            ↘
 Waiting Lounge       Lift gallery     Reception focus
 X−15,Z0              X0,Z2.85          X−4,Z5
                         ↓
                existing 4 lift portals

L01
  protected stair01                    protected stair02
           ↑                                  ↑
           └──────── common route Z5.2 ────────┘
     Pool door X−14.5,Z4               Lounge door X14.5,Z4
           ↓                                  ↓
    Pool reserved zone                  Lounge shell
             existing core/lifts remain central
```

Exact forward/reverse paths are exported as `PODIUM_PASSAGES` in `architecture/podiumPassages.ts` and copied into the JSON deliverable. The entrance path in `lunaTransitions.ts` is `(0,22) → (0,16) → (1.2,15.5) → (1.2,12.5) → (0,8)` at eye Y 1.7. It preserves the column and ends inside Reception.

Ground/L01 walking waypoints now pass **minDistance 0.1 / maxPolarAngle π** through the existing camera preset contract. The measured reason: OrbitControls' building-scale 6 m default pulled the camera backward when a one-metre-lookahead walking waypoint settled. The same trace exposed the building camera’s 89.1° polar cap lifting the eye at settlement. CameraRig now accepts an optional per-shot polar limit through its existing preset contract. Only podium transitions opt into it; unrelated route targets retain the old defaults. No second camera controller was introduced. Browser checks inspect real intermediate camera positions, not just final DOM state.

Explore uses the existing planar camera/input system plus an optional conservative `allowStep` admission callback. `podiumWalkability.ts` sweeps in 0.05 m increments with a 0.22 m body radius against current podium boundaries, columns, cores and room walls. Main entrance passage requires the actual rendered door progress ≥0.95. No vertical drift or shaft-entry bypass is used to escape collision. Actual world Y filters room awareness before X/Z tests, preventing a Ground position from being classified as an L01 room. The shared current-space/card/map state updates; no manual-navigation shadow state was added.

Limits: this is reference X/Z collision, not mesh-complete physics or wheelchair/egress certification. Stair travel and free manual boarding into shafts remain blocked; lift travel uses the existing boarding/handoff runtime. Full manual access/boarding UX has not been redesigned. The existing entrance threshold top +0.04 m remains an unresolved accessibility detail.

A permitted TOUR journey exits active manual control only after policy/planning admits the route; denied private targets remain inspect-only without ending Explore. Explicit TELEPORT hands control to its existing guarded action. Explicit level navigation cancels an unfinished common route so late arrivals cannot reset the selected engineering representation. Existing shared Oyi parsing gained normal canonical L01 aliases; a numeric boundary prevents “Level 1” matching “Level 10/12”.

## Glazing, surfaces and services

The exterior frontage, entrance assembly, glazing rhythm, columns, thresholds and operational door are retained. Lowering/removing duplicate floor skins restores the intended floor relationship at the unchanged entrance. No new façade opening is inferred. L01's existing opaque backing is still opaque; there is no false overlook or invented interior glazing.

Working surfaces are restrained plain reference materials. Removed: low pendant, obstructing reception feature, premature concierge/furniture objects and conflicting pool box. Added: floor/ceiling coordination and unadorned lift/core faces. No final marble, timber, bronze, artworks, rugs, furniture, indoor trees, chandelier or signage package was added.

MEP routes and canonical devices were preserved, not redesigned. Ceiling height checks prove geometry fits the present structural layers, **not** engineered duct/sprinkler/lighting coordination. The L01 40 mm residual gap cannot accommodate a general services plenum. Future services must use genuinely coordinated zones or exposed distribution.

## Policy, runtime and host preservation

RepresentationPolicy remains byte-for-byte unchanged, SHA-256 `2a301cf10a6dbaaf9e9f81d49a8b852d308ae193837612cbfcca68e59fe19d7e`. Programme, operational catalog, simulation provider, dynamic lift model and exterior façade/environment are likewise unchanged against the phase-start working tree.

One explicit capability change: existing assigned L06 residents may ride passenger lifts 01–03 to the **common L01 amenity stop**, in addition to Ground and their assigned floor. This extends `passengerStopAllowed`, not RepresentationPolicy or engineering control. Public/unassigned users, service-lift privileges and unrelated private-floor permissions are not broadened. Deterministic and browser policy tests cover the distinction.

No production/cloud changes, migrations, physical commands, deployment, repository reset or commit were made.

## Future option — not built

**FUTURE OPTION: GROUND/L01 GRAND ATRIUM + L01 OVERLOOK**: existing Reception footprint X −7…7 / Z 3…9, 14 × 6 = 84 m². `FUTURE_ATRIUM_STUDY` records it without changing the L01 slab, programme or navigation. Any actual opening requires a future coordinated structural, circulation, fire/egress and service decision. The shell avoids adding heavy final objects that would prejudge it.

## Verification, evidence and acceptance

See [phase report](../artifacts/luna-ground-l01-architectural-reality-v1-report.md), [structured deliverable](../artifacts/luna-ground-l01-architectural-reality-v1.json), and [live measurements](../artifacts/ground-l01-v1/measurements.json). Status remains PARTIAL: the authorized L01 openings are resolved, but continuous stair design and untouched B1/L02 coordination are not. Functional regression passing does not convert those known physical gaps into completed construction.

## Local review

Use the existing local server at `http://127.0.0.1:5173/`; if stopped, run `npm run dev -- --host 127.0.0.1` from the repository.

1. Use TOUR and ask Oyi “Take me to the lobby”. Observe the real entrance, opening sequence and column detour.
2. Ask “Take me to the waiting lounge”, then “Take me to reception”, then “Take me to the lobby”.
3. Ask “Take me to Level 1”. Observe the existing lift journey; then ask “Take me to the amenity lounge” / “Take me to the amenity pool”.
4. Activate Explore in a common area. WASD/arrows move; E/Enter interact; Escape exits. Walls/columns/closed entrance constrain walking. Pool is a reserved zone; static stairs are not traversable.
5. Ground/L01 level isolation and Engineering/View controls remain the existing UI. Do not interpret stair reference doors or structural cutaway visuals as certified egress.

Run dedicated checks with `node scripts/verifyGroundL01.mjs` and `node scripts/verifyGroundL01Browser.mjs`. The latter requires the local Vite server and Chrome at the repository's existing test path.

## Authorized vertical-opening correction — continuation of Phase 2

**L01 opening coordination: COMPLETE within the authorized core footprints. Continuous B1/Ground/L01/L02 stair egress: PARTIAL. Overall Phase 2 remains PARTIAL.** The user explicitly authorized existing lift/stair/riser openings after the initial working-baseline report. There is no outstanding permission question about those openings.

### Exact scope and geometry

`src/luna/architecture/podiumSlabOpenings.ts` exports `PODIUM_SLAB_OPENINGS` directly from the unchanged `LUNA_CORES`. Four lift footprints, two protected stair footprints and the one registered service-riser footprint are subtracted. No other opening or void is introduced. `podiumSlabPanels()` uses the existing rectangular-panel partition/merged geometry path; there is no CSG loader, new operational asset or per-frame geometry rebuild.

| Existing canonical core | Centre X / Z | Aperture width × depth | Area |
|---|---|---|---|
| LUNA-LIFT-PASS-01 | −3 / 0 | 3 × 3 | 9 |
| LUNA-LIFT-PASS-02 | 0 / 0 | 3 × 3 | 9 |
| LUNA-LIFT-PASS-03 | 3 / 0 | 3 × 3 | 9 |
| LUNA-LIFT-SERVICE-01 | 6.5 / 0 | 3.2 × 3.4 | 10.88 |
| LUNA-STAIR-01 | −14 / 9 | 3.5 × 5.5 | 19.25 |
| LUNA-STAIR-02 | 14 / 9 | 3.5 × 5.5 | 19.25 |
| LUNA-RISER-01 | −8 / 0 | 1.6 × 1.6 | 2.56 |
| Total | | | **78.94 m²** |

Source: `LUNA_CORES` in `src/luna/lunaProgramme.ts`; dimensions and positions are unchanged. The adjacent passenger footprints share boundaries and therefore read as a continuous opening in the slab; their existing shaft walls/identities remain separate. No extra strip between lifts has been removed.

| Corrected physical layer | Existing world Y range | Apertures |
|---|---|---|
| Ground roof skin / L01 underside interface | 4.84…5.00 | Seven existing core footprints |
| L01 finish floor | 4.92…5.00 | Same; existing room-finish exclusions retained |
| L01 structural slab | 4.65…5.00 | Same; replaces previous Lift-02-only opening |
| L01-owned transfer layer | 7.90…8.50 | Same |
| L01 roof skin / upper interface | 8.44…8.50 | Same |

No elevation, thickness, slab outline, lift/stair location, room coordinate, identity, navigation binding, runtime/provider or RepresentationPolicy changed in this correction. The Ground floor's already-approved apertures merely reuse the shared helper. No new holes are cut in the separate **B1 or L02 structural plates**. L02's independent slab still has its older Lift-02-only opening; this is a whole-building coordination limit, not silently included in the claim of completed L01 corrections.

### Service/riser boundary

Only `LUNA-RISER-01` has a canonical shaft footprint used here. `lunaMepBackbone.ts::RISERS` contains representative services at X −8 and Z −0.6/−0.2/0.2/0.6/1.0. The last network riser lies outside the registered shaft's Z ±0.8 envelope. `lunaMepSleeves.ts` and `MepComponents.tsx::Sleeve` describe **representative markers**, not an authored penetrations schedule. Their visual torus default must not be promoted into an approved additional slab opening. That mismatch remains **PARTIAL / DESIGN INFORMATION REQUIRED**; neither riser coordinates nor the shaft were enlarged.

### Stair truth — why holes do not complete egress

For both `LUNA-STAIR-01` and `LUNA-STAIR-02`, the existing spatial model says the stair serves B1, Ground, L01 and L02. This is connectivity intent, not a physical flight definition. The executable source contains:

- A 3.5 × 5.5 m protected footprint (`LUNA_CORES`).
- A representative 3 × 4.5 × 5 m solid structural volume at Ground (`lunaStructuralElements.ts::STAIRS`), and another representative record at L06. These are not tread/landing geometry.
- Ground and L01 static door faces, 1.05 × 2.1 m, with no stair door actuator. No corresponding B1/L02 doorway/approach geometry is registered (`lunaSpatialModel.ts::buildDoors`).
- `LUNA_STAIR_CAPABLE_REFS` remains empty (`lunaRouteTransitions.ts`). No executable stair path is bound. `routePlanning.ts` correctly rejects unbound stair edges.

Missing for a truthful continuous stair: run direction/number of flights, tread and riser schedule for the unequal 4.0/5.0/3.5 m storeys, intermediate landing elevations/extents, floor landing and door swing positions at B1/L02, enclosure openings, headroom envelope, handrails/guards, and clearance/door-state integration. None is inferred from the solid placeholder or fabricated to obtain a passing test. Existing closed boundaries and conservative Explore core admission remain in force, so the new holes do not create a claimed traversable route or a manual fall-through path.

**No new functional stair flight was built because the source lacks those inputs. Continuous egress remains PARTIAL on all three intervals: B1→Ground, Ground→L01 and L01→L02.** This explicitly follows the user's instruction to leave unsupported portions partial. No certified egress claim is made.

### Lift collision and threshold proof

The dedicated browser check drives all four existing canonical lifts through the **real simulation provider**: Ground → L01 → Ground, then parks at L01 for the diagnostic. It observes intermediate runtime and rendered car positions, door states, and actual generated horizontal-face triangles of the corrected layers. Collision tests ignore opacity/section clipping, so an invisible or clipped obstruction cannot pass. Sampled moving-car bounds and moving L01 landing doors must not intersect corrected slab cells. All seven full aperture bounds are checked through the complete corrected layer range.

Existing landing door bottoms and threshold tops remain at world Y **5.0 m**. The existing static threshold is 1.3 × 0.1 × 0.6 m, centred Z 1.5 / Y 4.95 (`DynamicLift.tsx`). Its support/bearing portion extends into slab material beyond the shaft boundary. That intentional existing static overlap is retained and disclosed; it is **not** reported as zero volumetric intersection or confused with a moving car collision. A future recessed threshold construction detail is not invented by cutting outside the approved footprint.

This proves passage through **corrected Ground/L01 layers**, not the uncorrected B1/L02 plates, every storey, imported external architecture, or full stair egress. Lift identities, stops, door/car dimensions, positions, runtime and commands are unchanged.

### Evidence and validation

- [Opening schedule and stair audit](../artifacts/ground-l01-v1/openings/deterministic.json): exact aperture area, retained atrium material, source gaps and unchanged datums.
- [Actual browser geometry/motion samples](../artifacts/ground-l01-v1/openings/browser.json).
- [Actual slab apertures](../artifacts/ground-l01-v1/openings/actual-openings.png) and [provider-driven cars at L01](../artifacts/ground-l01-v1/openings/cars-at-l01.png). Diagnostic snapshots clone live geometry/world transforms; they are not substitute authored geometry.
- Existing Ground/L01, lift, representation, routed traversal, Explore, presentation and asset-pipeline regressions are rerun. Final counts are in the correction validation record linked below.

Changed application source in this correction only:

1. `src/luna/architecture/podiumSlabOpenings.ts` — new shared source-derived aperture construction.
2. `src/luna/architecture/AmenityEnvelope.tsx` — matching L01 floor/roof skins.
3. `src/luna/exterior/GroundExteriorEnvelope.tsx` — Ground roof underside interface; no façade redesign.
4. `src/luna/structure/LunaStructuralLayer.tsx` — L01 slab/transfer apertures; existing IDs/transforms.

Added tests: `scripts/verifyGroundL01Openings.mjs`, `scripts/verifyGroundL01OpeningsBrowser.mjs`. Existing navigation, lift and policy source is untouched. The same Ground/L01 documents/JSON are updated, not a new phase.

**FUTURE GROUND/L01 GRAND ATRIUM + L01 OVERLOOK: DEFERRED.** Reception X ±7 / Z 3…9 remains solid at L01. No mezzanine, overlook, new architectural void, furniture, pool design or Phase 3 finish. No production/cloud changes, physical commands, migrations or commit.

## Final opening-correction verification

### Final correction validation

- Typecheck and build: **PASS**. Existing large-bundle advisory remains.
- Lint: **81 warnings / 0 errors**, unchanged baseline.
- Ground/L01 deterministic checks: **18 PASS**; new opening checks: **13 PASS**.
- Existing deterministic suites: **23 PASS**; the sole **KNOWN PRE-EXISTING FAILURE** remains the unchanged L06 ingestion outline assertion at `verifyIngestionV2.mjs:101`. No new deterministic failure.
- Existing browser suites: **11 PASS**, including lift, routes, Explore, privacy, presentation and asset fallback.
- Ground/L01 journey assertions: **PASS**, with 16 refreshed views. **Harness shutdown issue:** after writing a passing result and closing Chrome, the idle Node process did not exit; it was stopped with SIGTERM. This is disclosed separately from functional assertions, not reported as a clean process exit.
- New opening browser: **PASS**; 992 samples, zero moving-car/corrected-slab collisions, zero landing-door/corrected-slab collisions and no browser errors. Runtime/rendered Y differed by at most 0.1302 m while moving (frame/provider sampling lag); thresholds and arrivals align at datum 5.
- Preservation: **PASS**. 259 existing source files and every existing verification script are byte-identical to this correction's starting snapshot. Three existing geometry files changed and one helper was added. Policy, runtime, navigation, level/core coordinates and Phase 1 audit artifacts are unchanged.

[Correction validation](../artifacts/ground-l01-v1/openings/validation.json) · [Correction preservation](../artifacts/ground-l01-v1/openings/preservation.json) · [Typecheck](../artifacts/ground-l01-v1/openings/typecheck.log) · [Lint](../artifacts/ground-l01-v1/openings/lint.log) · [Build](../artifacts/ground-l01-v1/openings/build.log).

The two new diagnostic screenshots were visually inspected: matching existing shaft/stair/riser apertures are visible in the actual slab/transfer meshes, four provider-positioned cars sit at the L01 slab datum, and the future atrium footprint remains solid. Diagnostic material colours are test-only and do not modify Luna.

