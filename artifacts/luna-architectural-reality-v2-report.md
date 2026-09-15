# Luna Architectural Reality V2 — L06 Apartment A Gold Standard — Report

## ARCHITECTURAL GOLD STANDARD SOURCE PENDING

No real architectural source exists for L06 Apartment A anywhere in this repository — confirmed by a full search before any implementation began (see `docs/LUNA_ARCHITECTURAL_REALITY_V2_L06_GOLD_STANDARD.md` §Source). Nothing in this phase fabricates one. What follows is the foundation: a coordinate frame contract, a real canonical room/door registry, structural and MEP coordination checks against existing real data, and a proven ingestion pathway — ready for a real source, not a substitute for one.

Full architecture, per-field detail, and disclosed limitations are in `docs/LUNA_ARCHITECTURAL_REALITY_V2_L06_GOLD_STANDARD.md`, written before this report. Structured facts are in `artifacts/luna-l06-apt-a-gold-standard.json`.

## 1. What was audited first (Part 1)

Read: `docs/LUNA_ARCHITECTURAL_REALITY_V2_PREREQUISITES.md`, `docs/OYI_BUILDING_INGESTION_V1.md`. Inspected: the Asset Pipeline Foundation (`groundAsset.ts`), Building Ingestion V1's full pipeline, L06 Apartment A's existing procedural implementation (`lunaInteriors.ts`, `LunaLevel.tsx`, `InteriorLayer.tsx`), the room registry, spatial hierarchy, canonical unit records, structural elements, MEP interfaces (`lunaOperationalAssets.ts`, `lunaServiceRoutes.ts`), camera/navigation logic (`lunaRoomCameraPresets.ts`, `InteriorNavigationCard.tsx`), picking/selection (`InteriorRoom.tsx`'s `onClick`), Facility/Consumer representation (`lunaRepresentationPolicy.ts`), existing GLB/glTF loading, existing tests and browser verification. This confirmed, precisely, the exact coordinate discrepancy the brief itself named ("L06 Apt A plan origin ≈ (-10.5, -9)" vs "current 3D/camera origin ≈ (-8.1818, -6.3636)") — traced to two real, deliberately different, pre-existing representations (Phase 3's 3D massing placeholder vs Phase 8's 2D operational plan), never previously reconciled and not reconciled here either — only formally named and versioned.

## 2. Files changed/added

**New (architecture/frame/coordination):**
- `src/luna/architecture/l06AptAFrame.ts` — coordinate frame contract.
- `src/luna/architecture/l06AptAStructuralCoordination.ts` — real column-vs-apartment overlap check.
- `src/luna/architecture/l06AptAServiceInterfaces.ts` — real room-to-device association.
- `src/luna/architecture/l06AptAGoldStandard.ts` — the canonical room registry, combining all of the above.

**New (ingestion — reusing Building Ingestion V1's existing architecture):**
- `src/luna/ingestion/lunaL06AptAAdapter.ts`, `lunaL06AptANormalizer.ts`, `lunaL06AptASeed.ts`.

**Modified (small, disclosed, backward-compatible):**
- `src/luna/lunaProgramme.ts` — extracted `l06UnitMassingBox()` (shared source of truth).
- `src/luna/LunaLevel.tsx` — uses the extracted helper (no behavior change).
- `src/engine/components/InteriorRoom.tsx` — optional `doorRef` prop (undefined everywhere except L06 Apt A).
- `src/luna/InteriorLayer.tsx` — wires `doorRef` for L06 Apt A only.
- `src/luna/LunaContextCard.tsx` — new `door` selection branch (Information Card).
- `src/engine/types.ts` — `TwinNodeKind` gained `"door"`.
- `src/engine/ingestion/types.ts` — `CanonicalTargetKind` gained `"door"`/`"window"`.
- `src/engine/components/spatial/ContextCard.tsx`, `src/luna/InteriorNavigationCard.tsx` — test-hook data attributes only, no visual change.
- `src/App.tsx` — registers the new adapter, sequences the new seed after the existing whole-building seed.

**Not touched:** `RepresentationPolicy`, any runtime provider/resolver, `TwinIntelligenceController` vocabulary for existing systems, any `SystemControlBoard`, `groundAsset.ts` (read and reused, not modified), production/cloud config.

## 3. What is real today

- A **coordinate frame contract** naming and versioning the massing/plan divergence — computed live from both frames' real values, never silently reconciled, with an honest `PENDING` source-frame placeholder.
- A **canonical room registry** for all 12 real L06 Apartment A rooms — every field (boundary, area, centroid, geometry ref, service interfaces, review status) derived from real existing data, not hand-invented.
- **12 real door openings**, newly proposed (first time ever in this codebase), each individually selectable live in the 3D scene, correctly inheriting `RepresentationPolicy`'s existing privacy rules with zero policy changes.
- A **structural coordination check** — real, computed, found CLEAR (6 columns checked, ≈0.106m minimum real clearance) — not an assumption.
- **MEP interface derivation** — 11 of 12 rooms associated with real, already-existing devices by position-containment; zero new devices or routes invented.
- The **same Building Ingestion V1 pipeline** (adapter → extract → normalize → review → publish) now proven at apartment/room granularity, registered as a second `BuildingSource` on the existing `LUNA` project — not a parallel system.
- Live, browser-proven **Consumer-scope walkability**: Level 6 → Apartment A → Living Room → Primary Bedroom → Kitchen (+ door) → Primary Bathroom → Entry/Foyer, each resolving to its real canonical ref.
- Live, browser-proven **Facility-scope restriction**: Apartment A stays exterior/operational-only for Facility, unchanged.

## 4. What is explicitly not done (disclosed, not hidden)

- No real architectural source was obtained or fabricated.
- No third-party file-format parser was built.
- Window objects remain UNRESOLVED (none exist in the procedural data).
- Door assembly detail (width/threshold/swing/hardware) is not modeled — only existence and wall side.
- Fixture-level detail (WC/basin/shower/appliance models) remains furniture placeholders, unchanged from Phase 3/12.
- Continuous walkthrough movement (WASD/physics) was not built — the existing camera-preset room-to-room mechanism is what "walkable" means in this codebase, and is what was used and verified.
- The whole tower was not rebuilt; no other floor's architecture was touched.

## 5. Test results

| Suite | Result |
|---|---|
| `npm run test:l06-gold-standard` (16 deterministic checks) | ✅ run twice, stable both times |
| `npm run test:l06-gold-standard:browser` (17 checks, real Chrome) | ✅ run twice, stable both times |
| `npx tsc --noEmit` | ✅ clean |
| `npm run lint` | ✅ exit 0, only pre-existing warnings |
| `npm run build` | ✅ clean |
| Full existing regression — deterministic: representation, presentation, architecture, lift, four-lift, water, electrical, electrical-live-ops, fire, hvac, access, cctv, network, drainage, ingestion | ✅ all PASS, zero regressions |
| Full existing regression — browser: oyi-identity, ingestion, lift, four-lift, control-surface, water, electrical, electrical-live-ops, fire, hvac, access, cctv, network, drainage | ✅ all PASS, zero regressions |

## 6. Known limitations

- Headless/SwiftShader screenshots render the 3D scene as a flat gradient — a previously-disclosed testing-harness characteristic (see `docs/LUNA_DRAINAGE_REFERENCE_SPEC.md`), not a rendering defect. Correctness is proven via the live selection-debug readout (real canonical refs, e.g. `LUNA-L06-APT-A-KITCHEN-DOOR-01`) and deterministic tests.
- The door hit-target's browser-test click position is computed from the room's own camera preset via real perspective-projection math — correct today; if `LUNA_ROOM_CAMERA_PRESETS` is ever re-tuned, this computed point should be recomputed alongside it.
- No real architectural source exists — everything here is `PROCEDURAL_REFERENCE`, explicitly not architectural truth.

## 7. Manual local testing steps

```
cd /Users/ochigaidoko/Oyi-Twin-Engine
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort   # if not already running
```
1. Default Presentation Mode (Facility scope): ask Oyi "Show me Apartment 6A" — stays exterior-only, no room list.
2. Profile "•••" → Development Mode → switch Oyi panel to "Consumer".
3. Ask "Apartment 6A" → real FULL_3D entry, 12-room list appears.
4. Click "Kitchen" → per-room camera preset; click near the door gap (top-center of frame) → SELECTED panel shows `LUNA-L06-APT-A-KITCHEN-DOOR-01`.
5. Click any other room in the list — each resolves to its own real canonical ref in the SELECTED panel.
6. Reload → confirm Engineering Layers, existing operational systems, and Oyi identity are all unaffected.

Automated: `npm run test:l06-gold-standard`, `npm run test:l06-gold-standard:browser` — both green.

## 8. Next scale plan (Part 26 — not implemented here)

```
L06 Apartment A Gold Standard
  -> L06 remaining apartments (B, C, D) — same adapter pattern, new room registries
  -> L06 complete floor
  -> standard residential floor template (L02-L09, 4 units/floor, per Part 27's own programme numbers — unchanged)
  -> premium floors (L10-L12, 3 units/floor)
  -> penthouses (2 signature units — DD03/DD18 remain unresolved, not invented here)
  -> L1 amenities
  -> Ground
  -> B1
  -> Roof
  -> site/environment
```
Each step: map from real source data where available (never blind procedural duplication), preserve distinct canonical identities, re-run the full regression suite, re-verify structural/MEP coordination against real geometry, re-verify Facility/Consumer representation unchanged. The 43-residence programme total (Part 27) is not silently altered by this phase.

---

**Stop condition met.** No architect source was fabricated. No other apartment or floor was rebuilt. `RepresentationPolicy` and every completed operational system are unchanged, re-confirmed by the full regression suite in §5. No production/cloud changes were made.
