Luna architectural asset pipeline foundation

Implemented locally, 8 September 2026. This is an ingestion foundation, not a production architectural model. The normal Luna entry remains procedural by default.

**Integration boundary**

`LunaBuilding` accepts an optional `groundArchitecture?: GroundAssetSource`. The standalone `App` forwards the same optional prop for verification. Omitting it, or setting it back to `undefined`, selects the existing procedural Ground envelope. No new UI controls, runtime provider, semantic hierarchy, engine mode, or intelligence path were added to the product.

The new visual is a child of the existing Ground `LevelMassing` group. That group continues to own its canonical level identity, floor position and animated explode offset. When an import has fully loaded and validated, its envelope replaces only the visible massing box and `LevelFacade`. Existing Ground rooms, service zones, structural elements and operational assets remain mounted as siblings. Loading, rejection, decode failure, checksum failure, or explicit rollback uses the original massing and facade. No source is enabled automatically.

This version deliberately admits only Ground envelope geometry. It does not replace Ground rooms or allow other floors, private homes, equipment, moving devices, or BIM identifiers to become canonical objects. The L06 coordinate discrepancy identified in the audit is therefore outside the supported import frame and cannot be introduced through this slot.

**Host contract**

Import `GroundAssetSource` from `./luna/architecture/groundAsset` and pass a trusted, reviewed manifest to `LunaBuilding` beneath the existing host contexts. All existing zero-prop callers remain valid.

A manifest must supply:

| Field | Required value/meaning |
|---|---|
| `revision` | Nonempty reviewed source revision |
| `url` | Same-origin absolute path under `/architectural-assets/`, ending `.glb` or `.gltf`; no remote URL, redirects, query or traversal |
| `sha256` | Lowercase 64-character SHA-256 of the exact package bytes |
| `ownerLevelRef` | `LUNA-GROUND` |
| `coordinateFrame` | `ground-floor-local-metres-y-up` |
| `bindings` | Unique `nodeName`, `canonicalRef: LUNA-GROUND`, `role: envelope` for every authored mesh node |

Use readable names such as `LUNA-GROUND__envelope__south-wall__LOD1`. Names are matched exactly after loading; avoid exporter characters that GLTFLoader sanitizes. A node with multiple material primitives may expand into a Group; its material parts inherit that node’s one validated binding. Unknown, duplicate, unreachable, missing or reused mesh-node content is rejected. Repeated mesh instances require a later explicit adapter; they are not inferred.

The manifest is trusted host configuration, not end-user input. A checksum identifies approved bytes; it does not prove that a model is architecturally accurate or that content labeled “Ground envelope” really is an envelope. Source review remains necessary. Do not accept arbitrary uploaded models/manifests as trusted input. This common-space-only foundation is not a private asset delivery service.

**Admission and coordinates**

Registry/scope checks precede RepresentationPolicy. An unknown ref never reaches the policy’s existing Facility fallback. The existing policy must return `FULL_3D` or `CONTEXT_3D` for Ground before any package request occurs, and is checked again before binding. Neither mode creates device control capabilities. Identity/source/policy changes invalidate the mounted asset immediately and cancel obsolete work. Results from canceled loads are disposed rather than mounted.

`lunaRepresentationPolicy.ts` is unchanged byte-for-byte. Regression SHA-256:
`a8b0e655eafd12fc14498f3470ab31ae4a6ee8f8dd583fc2da378c633a79b499`.

Authored coordinates are metres, right-handed Y-up, with Y=0 at Ground’s finished floor. The adapter applies only `[0, -level.height/2, 0]` inside LevelMassing, whose existing translation supplies the level datum, plan offset and explode motion. It never auto-centers, rescales, or applies explode twice. Finite geometry/world bounds must remain within X ±24m, Z ±19m, Y -0.1…5m in this floor-local frame. These are explicit integration safety bounds, not proof of source accuracy. Existing camera and room anchors are untouched.

**Format and resource handling**

- Self-contained glTF 2.0: GLB with embedded binary/images, or JSON glTF with embedded base64 buffers and PNG/JPEG images.
- External buffers/images and remote decoder requests are blocked before GLTFLoader runs. Its LoadingManager additionally blocks unexpected non-data/non-blob dependencies.
- Animation, skinning, morph targets, cameras, non-triangle geometry, and glTF extensions are rejected. Draco, Meshopt, KTX2, instancing and LOD switching are intentionally deferred until their decoder/lifetime contracts are separately verified.
- Initial limits: 20 MiB package and declared buffer budget; 512 nodes; 256 bindings; 128 materials; 32 textures; 100k decoded triangles; 2 million summed accessor entries. PNG/JPEG dimensions are checked before browser decode: maximum 4096 per axis and 32 megapixels summed across images.
- GLTFLoader is dynamically imported only when a package is requested. There is no full-scene duplication or per-card scene.
- A failed embedded texture decode invalidates the import, even where GLTFLoader would otherwise continue with a missing texture.
- Geometry/textures may be shared within one owned package. Mutable PBR materials are cloned per mesh, including material arrays. Cloned materials retain base color/normal/roughness/metallic/emissive texture settings and authored transparency. The verification texture confirms sRGB base-color handling.
- Each load owns its resources. Rollback, source changes, identity changes and stale completion release geometry/materials/textures, including ImageBitmap resources. Disposal is idempotent. No global cache or eviction mechanism is introduced in this foundation.

**Behavior and picking**

Imported envelopes use the existing selection and hover contexts with the same Ground level descriptor; glTF extras cannot supply a ref, label, parent, command or runtime state. The existing contextual card and navigation callbacks handle the result.

The adapter applies `systemFadeOverride`, floor isolation and Ground selection styling to every material part. Architecture/All Systems/Water/etc. continue to come from the existing scene mode. View continues to come from the existing section/explode state, without an imported-model mode store.

Cutaway uses the existing `sectionClipPlanes` on all imported materials and their shadows. CPU raycasting independently discards hits behind those planes, under invisible ancestors, on invisible materials or on effectively hidden faded parts. This prevents shader-discarded geometry from consuming clicks. Geometry is not capped: the existing engine does not promise capped sections.

Room selection, floor plans, contextual Enter eligibility, camera presets, Oyi, system assets, relationship routes and runtime state are not replaced. When adding later interior roles, room focus/ceiling reveal must be bound explicitly; this envelope slot is not an implicit interior loader.

**Local verification and review**

`npm run test:architecture` starts an isolated loopback Vite server on port 5184, runs unit/admission and headless Chrome interaction checks, writes evidence under `artifacts/architecture-*`, then closes its server/browser. It requires local Google Chrome at the same path used by the existing presentation verification.

`npm run dev:architecture` serves a manual verification harness at:
`http://127.0.0.1:5185/tests/architecture/index.html`.

The harness initially shows procedural Luna. Its clearly marked TEST FIXTURE controls switch to synthetic GLB/glTF panels, restore procedural Ground, and exercise bad-checksum/unknown-binding fallbacks. The two panels and one-pixel texture only prove ingestion and binding; they are not architectural designs. Fixtures live under `tests/architecture`, are served only by the dedicated local middleware, and are absent from the production build/public asset directory. Regenerate them deterministically with `node scripts/createArchitectureFixture.mjs`.

Verification covers admission before requests; unchanged policy hash; Facility/Consumer common-space admission; denied 2D/hidden modes; unsupported content; bounds; shared materials and arrays; clipped/hidden picking; disposal; real GLB/glTF loading; actual pointer selection; retained parent UUID and floor-local origin; Water with Cutaway/Explode; floor isolation; rollback/re-import; checksum failure; unknown binding without network; canceled request; Lobby/Oyi privacy behavior; scope changes; runtime ref and sampled-state continuity. Existing representation and presentation scripts remain intact and are run separately.

**Remaining boundaries**

No approved architectural source exists in this change. Fidelity, authored materials, source-to-anchor calibration, real-device performance, private asset transport authorization, compressed geometry, LOD/cache behavior, and room-level replacement remain later acceptance work. Publicly serving a future private package would not be secured by this client-side adapter. No private package is admitted here.

No production deployment, cloud resources, Supabase writes, migrations, service keys, physical device commands, or uploads were made. No wider Facility OS or Twin redesign was started.
