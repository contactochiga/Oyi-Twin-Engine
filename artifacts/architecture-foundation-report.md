Architectural Asset Pipeline foundation — local handoff

The implemented scope is Ground envelope ingestion beneath the existing semantic hierarchy, with the procedural envelope retained as default and rollback. No production architectural source model was fabricated.

Implementation details and host contract: [foundation guide](/Users/ochigaidoko/Oyi-Twin-Engine/docs/LUNA_ARCHITECTURAL_ASSET_FOUNDATION.md).
Complete continuation file list: [changed files](/Users/ochigaidoko/Oyi-Twin-Engine/artifacts/architecture-changed-files.txt).

Existing work preserved:
- RepresentationPolicy is byte-identical to the saved pre-implementation baseline and the fixed regression hash.
- Canonical catalogs, floor plans, room geometry, camera presets, runtime provider, existing verification scripts, Oyi logic, presentation shell, engineering/view controls and contextual cards remain intact.
- The App change only forwards an optional Ground source. LevelMassing gains an optional visual child; its semantic and animated transform remain mounted. LunaLevel swaps only massing/facade visuals after validation.

Foundation completed:
- Lazy GLB/self-contained glTF loading, trusted revision/checksum manifest, exact registered Ground bindings, admission before requests and again before binding.
- Explicit floor-local coordinate/bounds validation; unbound, unknown, unreachable, unsupported and external content rejection.
- PBR material ownership, material arrays/multi-primitive binding, embedded image bounds, cutaway/shadow clipping and CPU picking filters.
- Failed decode/checksum fallback, source/identity invalidation, cancellation, disposal and procedural rollback without replacing runtime/selection providers.
- Separate local synthetic fixture harness, absent from production output. No new permanent product controls.

Verification:
- Build and TypeScript check passed. Existing large-bundle advisory remains; GLTFLoader is a separate dynamically loaded chunk.
- Lint passed with 25 existing warnings and no new architecture-file warnings.
- Representation regression passed across all 16 plans and existing Facility/Consumer privacy boundaries.
- Existing presentation/browser regression passed: sidebar and rail, active engineering labels, temporary tray persistence/dismissal, View composition, canvas orbit and Oyi privacy.
- Architecture unit/browser regression verifies GLB/glTF loading, PBR texture color space, canonical pointer selection, same Ground parent UUID, coordinates, isolation, Water + Cutaway/Explode, switching, rollback, rejected imports without requests, cancellation, host-scope changes and runtime continuity. See [evidence](/Users/ochigaidoko/Oyi-Twin-Engine/artifacts/architecture-regression.json).

Local review: run `npm run dev:architecture`, then open [fixture harness](http://127.0.0.1:5185/tests/architecture/index.html). Normal Luna at port 5173 remains procedural. The fixture controls clearly identify their synthetic panels as tests, not architectural design.

Remaining scope limits: Ground envelope only; no interior replacement, private delivery, compressed extensions, animation, instancing, LOD streaming or shared model cache. An approved source model and calibrated anchors/materials are still required before replacing any real architecture. Existing private procedural-room admission concerns identified in the audit are not silently rewritten by this foundation; no private imported content is supported.

This checkout has no Git metadata. A local pre-change snapshot at `/tmp/luna-asset-foundation-baseline` supports comparison; no commit was fabricated. No production deploy, cloud changes, Supabase writes, remote migrations, keys, physical commands or uploads occurred.
