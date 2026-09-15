# Luna Physical Reality / Visual Convergence V1

Status: REFERENCE DESIGN — a visual convergence pass over already-verified operational architecture (Four-Lift, Unified Control Surface, Water V1, Electrical V1/V1.1, Fire & Life Safety V1). No operational, runtime, control, intelligence, or permission architecture was rebuilt. This document covers only what this pass adds; each system's own spec remains authoritative for identity, topology, runtime state and control-surface behavior.

## 0. Core principle (unchanged from the brief)

> If it exists physically in Luna, represent it physically and spatially to an appropriate level of realism. If a knowledgeable person looks at the Twin, they should recognize what the equipment is before reading its label.

Every change below is geometry/material only. `Canonical model = identity`, `Runtime = state`, `RepresentationPolicy = authorization`, `Oyi = understanding` are untouched (§14 of the brief, non-negotiable) — reconfirmed by the unchanged RepresentationPolicy byte-hash and a fully green functional regression suite after every change.

## 1. Audit (performed before implementation)

**Realistic existing assets** — Water/Electrical/Fire plant equipment (tanks, treatment unit, booster pumps, isolation valve, switchboard cabinets, ATS, generator set, inverter cabinet, meters, distribution boards, fire alarm panel, fire pump, fire tank, smoke detectors) already use dedicated REFERENCE DESIGN geometry (volute+motor+base pump silhouettes, domed/cylindrical tanks, door-segmented cabinets, status-lamp panels) built across the Water/Electrical/Electrical V1.1/Fire phases — **not** cones/cubes. The elevator system (cars, doors, shaft, rails) remains the strongest precedent and was intentionally left untouched.

**Primitive placeholders remaining** — every other operational asset (network/edge nodes, cameras, access points, most apartment devices) still uses the generic `OperationalAssetMarker` box/cone/disc — out of scope this pass (HVAC/Access/CCTV/Network are explicitly excluded by the brief).

**Weak visual representation identified**:
- Pump assemblies (booster + fire) had a body/motor/base but no visible inlet/outlet connection, no local isolation valve, no gauge/instrumentation — reading as "a pump-shaped object," not a full skid.
- Electrical cable containment (B1 plant runs + apartment meter→DB run) used `PipeRun`, a round-pipe primitive meant for water/fire piping — an electrical cable run should read as tray/trunking, not a pipe.
- B1's three plant clusters (electrical/water/fire) sat in one open, undifferentiated basement volume with only a shared floor plinth (Phase 10) — no sense of "these are three separate plant rooms."

**Disconnected-looking network geometry** — none found beyond the above; risers, floor branches and B1 plant runs already follow the registered `parentRef`/typed-edge chains via `PipeRun`/`buildServiceRoute`, not geometry proximity.

**Routes needing physical refinement** — the water/electrical/fire reference chains (SOURCE→PLANT→RISER→FLOOR BRANCH→TERMINAL) already exist end-to-end per each system's own spec; this pass's job was equipment/containment realism at the chain's plant end, not re-routing.

**Architectural spaces needing refinement** — B1's plant clusters needed a legible "plant room" cue (§13 of the brief); Ground/upper floors' architecture was not touched (out of scope, no weakness identified that this pass's budget covers).

**Must remain unresolved (engineering, not fabricated)** — pump/fan duty and sizing, fire-water tank capacity, sprinkler/hose-reel coverage, cable/busbar sizing, discrimination/protection coordination, manufacturer/model selection, final containment routing — unchanged from each system's own DD register.

## 2. B1 plant equipment — pump assemblies (§3)

`BoosterPumpGeometry` (`WaterPlantEquipment.tsx`) and `FirePumpGeometry` (`FirePlantEquipment.tsx`) both gained, on top of their existing base/volute/motor/shaft:

- **Suction and discharge nozzle stubs** — short cylinders on either side of the volute, reading as real pipe connections rather than a floating shape.
- **A local discharge isolation valve body** — decorative pump-skid detail (no independent canonical ref or runtime state — see §3 below for why).
- **A pressure gauge** — a small dial face plus a needle whose rotation is driven by the pump's own live `pressure_bar` runtime field (0–10 bar reference sweep for the domestic booster, 0–16 bar for the fire pump), the one non-decorative addition: it still only ever *renders* runtime truth, per Digital Building Standard §3.

Water and fire pumps remain visually distinguishable by their existing proportions and system color, not a different silhouette language (brief's own requirement).

## 3. Decorative vs. canonical geometry — an explicit boundary

The new suction/discharge stubs and the local valve body carry **no canonical ref and no runtime state** — they are static pump-skid detail, the same category as a bolted flange or a nameplate: real equipment always has them, but this twin doesn't (and shouldn't) individually command every physical fitting. This is a deliberate, disclosed application of Digital Building Standard §14 ("no layer may reach into another's jurisdiction") — geometry realism must never quietly imply a canonical asset or a controllable state that doesn't exist. The gauge needle is the one exception, and it reads an *existing* field (`pressure_bar`) rather than inventing new state.

## 4. Electrical cable containment (§5, §11)

B1's electrical plant runs (GRID→MDB, MDB→ATS, GEN→ATS, MDB→INV, MDB→METER) and the apartment's meter→DB run previously used `PipeRun` (round pipe) as a stand-in. They now use the engine's existing `CableTray` primitive (`src/engine/components/MepComponents.tsx`) — a flat 0.3m-wide tray cross-section that **already matches** the electrical riser's own "duct" busway shape (Electrical V1.1), so horizontal containment and the vertical riser now read as the same physical containment language instead of two unrelated conventions. `CableTray` gained a `flowing?: boolean` prop (mirroring `PipeRun`'s existing restrained emissive pulse) so the V1.1 active-source-path emphasis (`sourceGate`/`resolveBuildingPower().activeSource`) is fully preserved — no behavior was lost in the swap, confirmed by the Electrical V1.1 browser suite's own active-generator-path check.

## 5. B1 plant zones (§1 Priority 1, §13)

`LunaPlantRoom.tsx` gained three translucent `ServiceZone` volumes (Electrical/Water/Fire Plant Room) each with its own `AccessPanel` "service door" marker, sized to each cluster's real asset footprint from `lunaOperationalAssets.ts` plus a working margin. This uses the **exact primitive already proven** for the Phase 10 riser maintenance gallery — deliberately not solid walls: a full enclosure risks clipping the existing camera presets/screenshots that fly into B1 to frame individual equipment, and the brief explicitly asks for the minimum change necessary, not an architectural redesign. Six new refs (`LUNA-B1-{ELECTRICAL,WATER,FIRE}-PLANT-{ZONE,ACCESS}-01`) were added — semantic zone/access markers, not operational assets, matching the riser gallery's own precedent exactly.

## 6. Building X-ray investigation (§9) — outcome: reverted, documented

The brief asks for "All Systems" mode to read architecture as transparent/subdued rather than fully solid, so B1→riser→floor distribution is visible from outside the whole building at once. Investigation found `systemFadeOverride()`'s `"all"` branch returns full opacity (1) unchanged — a real gap. A fix (multiplying the resting opacity by a constant factor for `"all"` mode) was implemented, verified via debug instrumentation to compute the correct reduced target on every affected level (confirmed 0.38, then 0.16, both computed correctly), but **did not produce a visually legible transparency effect** in the rendered scene at either value, unlike the pre-existing single-system fade (0.05 for non-matching levels), which **does** read clearly (confirmed by direct screenshot comparison). The root cause was not conclusively isolated within this pass's scope (candidates include material/lighting interaction specific to near-full-opacity blending, or additional non-fading meshes contributing to the same silhouette) and further investigation risked disproportionate budget for an uncertain payoff.

**Decision**: the `"all"` mode change was reverted to its original, byte-identical behavior (confirmed via diff) rather than ship an unverified, ineffective change. The brief's actual visual goal — seeing B1 plant/riser continuity from outside the whole building — **is already met** by the existing, verified single-system fade (e.g. Water/Electrical/Fire Engineering mode), which is what screenshot #12 (whole-building X-ray) uses. "All Systems" mode (screenshot #13) is used for its own, equally legitimate purpose: showing every system's markers simultaneously without any being hidden — "combined" taken literally. This is disclosed here as a known limitation, not silently worked around.

## 7. Elevators (§7)

Not modified. Inspected per the brief's instruction and confirmed to remain the realism benchmark (car, doors, shaft, rails, landing interfaces) — no change was needed or made.

## 8. Materials (§11)

No new material categories were introduced. Existing `MeshStandardMaterial` usage (roughness 0.3–0.85, metalness 0.1–0.6 across equipment) was already within the "painted steel / stainless / industrial equipment finish" range the brief asks for — audited and confirmed non-glossy, non-sci-fi. No changes made here beyond what the pump/tray geometry additions above already carry (same material palette, no new material types).

## 9. Truth status

Every addition in this pass is `REFERENCE DESIGN` geometry (Digital Building Standard §10) — visual realism was never used to imply `ENGINEER APPROVED`, `INSTALLED`, or `LIVE PHYSICAL` status for anything. No manufacturer or model was invented anywhere in this pass.

## 10. Unresolved design decisions (unchanged, not addressed by this phase)

DD07 (cable containment final routing), DD08 (electrical supply/resilience sizing), DD11 (fire engineering — pump duty, tank capacity, sprinkler coverage), DD15 (structural/fire-rating coordination), DD20 (elevator fire-mode/recall authority) — all remain exactly as documented in their own specs. This pass did not resolve, and did not silently choose values for, any of them.

## 11. Regression

Full suite re-run after every change: `tsc -b`, `vite build`, `oxlint` (0 errors), `verifyRepresentation`, `verifyArchitecture`, `verifyPresentation`, `verifyLift` (det+browser), `verifyFourLift` (det+browser), `verifyControlSurface`, `verifyWater` (det+browser), `verifyElectrical` (det+browser), `verifyElectricalLiveOps` (det+browser), `verifyFire` (det+browser) — all green. RepresentationPolicy byte-hash unchanged (`test:lift`'s own hash assertion). See `artifacts/luna-physical-reality-convergence-report.md` for the full results table.
