# Four-Lift Generalization — Implementation Audit

Audit of the verified Lift 02 implementation before any generalization work. Identifies what is already generic, what is Lift-02-specific configuration (safe to parameterize), and what is hardcoded logic that must actually change.

## Files inspected

`src/luna/lift/lunaLift.ts`, `liftSimulation.ts`, `DynamicLift.tsx`, `LiftContextCard.tsx`, `LiftLevelRail.tsx`; `src/luna/runtime/lunaSimulationProvider.ts`, `lunaRuntimeSeed.ts`, `lunaScenarios.ts`; `src/luna/LunaBuilding.tsx`; `src/luna/intelligence/lunaIntentParser.ts`, `lunaVocabulary.ts`; `src/engine/twinIntelligence.ts`; `src/App.tsx`.

## Already generic — reusable as-is

- **`liftSimulation.ts`** (`initialLiftState`, `project`, `requestLift`, `advanceLift`): pure functions operating on a generic `LiftState` object. They import shared `LIFT_STOPS`/`liftStop`/`nearestLiftFloor` but never reference `LIFT_02_REF` directly. **Zero changes needed** — this is the reusable runtime core the brief asks for.
- **`LIFT_STOPS`/`liftStop`/`nearestLiftFloor`** (`lunaLift.ts`): the 14-stop reference matrix (B1, Ground, L01–L12) is not lift-specific. DD06 defines one matrix for the whole system; nothing in this phase requires per-lift stop lists, so all four lifts share it — matching "reuse the same core runtime/state/geometry system."
- **`TwinRuntimeProvider` interface, `getState`/`execute`/`subscribe` contract**: fully generic already, keyed by `assetRef` throughout.
- **`twinIntelligence.ts`'s `SceneActions.assetView(ref, view)` and `handleCommand`**: already ref-parameterized at the controller level — the controller has no Lift-02 knowledge at all. The command-authorization boundary (Facility-only control) lives inside `lunaSimulationProvider.execute()`, not here.
- **`lunaVocabulary.ts`'s `FACILITY_ASSET_ALIASES`**: already lists all four canonical lift refs with distinct phrase patterns (lift 1/2/3, service/fire elevator) — only used today for generic navigate/query fallback, not for view/command routing.

## Lift-02-specific configuration — needs to become per-lift data

- **`lunaLift.ts`**: `LIFT_02_REF` constant, `LIFT_CORE` (single lookup), `liftCamera()`'s hardcoded shaft X position (assumes X=0, which is only true for Lift 02 — Lifts 01/03/Service sit at X=−3/+3/+6.5 per `LUNA_CORES`).
- **`DynamicLift.tsx`**: every mesh name (`${LIFT_02_REF}::role`), the `select()` call's ref/label, `LIFT_CORE` lookup — all hardcoded to the one ref. The component itself (shaft/car/doors/landing geometry, `visible`/`engineering` logic, `useFrame` position sync) is otherwise generic and reusable per-instance.
- **`LiftContextCard.tsx`**: hardcoded `LIFT_02_REF`, hardcoded `"Passenger Lift 02"` subtitle — otherwise fully generic (reads whatever state/policy it's given).
- **`LiftLevelRail.tsx`**: hardcoded `LIFT_02_REF`, hardcoded `"Lift 02"` in the status string — otherwise generic.
- **`LunaBuilding.tsx`**: renders exactly one `<DynamicLift/>`, and excludes only `LIFT_02_REF` from the static `CoreShaft` fallback map (Lifts 01/03/Service currently render as **solid, static, non-dynamic** `CoreShaft` boxes — the same primitive used for stairs/risers).
- **`lunaRuntimeSeed.ts`**: Lifts 01/03/Service are seeded with the **old, simple Phase-5 `elevatorBehavior`** state shape (`{floor, direction, door, fault}`), not the v2 `LiftState` schema. `lunaSimulationProvider.ts`'s `buildRow`/`setAssetState`/`execute` special-case `ref === LIFT_02_REF` to swap in `initialLiftState()`/`requestLift`/`advanceLift` — the other three refs fall through to the old generic asset-behavior path entirely.
- **`advanceLiftClock`** (`lunaSimulationProvider.ts`): single hardcoded `store.get(LIFT_02_REF)!` and one module-level `liftRemainder` — genuinely needs to become per-ref (a `Map`, looping over all lift refs each tick) to support independent concurrent motion.

## Hardcoded logic that must actually change

- **`App.tsx`**: `liftView` state has no ref associated with it — every lift interaction (`showLiftView`, `endLiftView`, `followTarget`, the two `useEffect`s watching lift state, `sceneActions.assetView`/`navigateToAsset`, the selection-effect's `selected.ref === LIFT_02_REF` check) is written against the single constant `LIFT_02_REF`. This is the one real architectural change: `liftView: LiftView | null` must become `activeLift: { ref: CanonicalRef; view: LiftView } | null` (or equivalent), and every one of those call sites needs the ref threaded through instead of assumed.
- **`lunaIntentParser.ts`'s `matchLift`**: its regex is hardcoded to the digit "2" (`lift\s*0?2\b`) and unconditionally returns `LIFT_02_REF` — it doesn't attempt to resolve which of the four lifts was named. This is the only parser change required; the rest of the pipeline (vocabulary aliases, `handleCommand`, `handleIntent`'s `asset_view` case) is already generic.
- **`lunaScenarios.ts`**'s "Elevator Fault" scenario patches `LUNA-LIFT-PASS-01` with the **old** field shape (`fault`, `door`) via a raw `setAssetState` merge. Once Lift 01 moves to the v2 schema, this patch would silently write dead fields instead of the real `faultState`/`doorState` the new system reads — a direct, small, necessary fix, not scope creep.

## Boundary this audit sets for implementation

Generalize by introducing one `LiftDefinition` registry (`ref`, label, shaft X/Z, core dimensions) driving: `DynamicLift` (instanced ×4), `LiftContextCard`/`LiftLevelRail` (ref-prop), `lunaSimulationProvider` (predicate + per-ref clock), `App.tsx`'s single `activeLift` state slot, and the vocabulary/parser. No new React state systems, no per-lift duplicated simulation loops, no new canonical identities — exactly per the brief's constraints.
