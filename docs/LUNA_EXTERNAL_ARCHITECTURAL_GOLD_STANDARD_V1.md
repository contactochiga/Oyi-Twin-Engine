# Luna exterior architectural finishing V1

Current acceptance: **PARTIAL — approved photorealistic target not met** (2026-09-20).

The current four-target pass is documented in [the acceptance report](../artifacts/luna-external-architectural-gold-standard-v1-report.md), with [machine-readable evidence](../artifacts/luna-external-architectural-gold-standard-v1.json) and [14 matched views](../artifacts/exterior-gold-standard/review.html). The [prior phase document](../artifacts/exterior-gold-standard/convergence-before/prior-phase-document.md) preserves historical audit, material provenance and earlier interventions; its performance/screenshot counts are historical, not current.

## Authority and freeze

The existing Luna is authoritative. The approved images supply a finish-quality target, not replacement geometry. `lunaProgramme.ts` still defines the existing 16 levels, 36×28 m residential floor, 44×34 m Ground/B1, 40×30 m amenities, 30×22 m Penthouse, 26×18 m roof and 62×52 m site. No source programme, elevation, canonical ID or floor/room geometry changed in this pass. No interpretation of revised programme prose was turned into a migration.

EXTERNAL MODEL = visual representation; CANONICAL MODEL = identity/relationships; RUNTIME = telemetry/state/commands; RepresentationPolicy = authorization/visibility; Oyi = intelligence/orchestration. Decorative vehicles, palms, curtains and crown finishes are `LUNA_REFERENCE_DESIGN`, not approved/installed/live assets.

## Four-target implementation

- Local CC0 authored sedan and palm glTF assets, fixed bounds/triangle budgets and 32 m LOD. Source/licence/transform records: `public/exterior-assets/sources.json`. Existing procedural fallbacks remain. No source metadata establishes runtime authority.
- Residential frame/glass/curtain assembly has physical depth while the opaque privacy backing remains. Existing balcony/balustrade placement and visual bay grid are preserved; no room-specific opening is invented.
- Crown receives finish construction for the existing core, terrace, pool coping, pergola connections, planters and glazed relaxation enclosure. No new amenity, new crown massing or lighting strategy.
- Only two inherited source files changed in this continuation; 250 inherited source hashes remain identical. Policy, runtime, navigation, UI, floors and engineering systems are unchanged.

## Current acceptance gaps

Vehicles: coarse body/lamp/arch detail and shading. Palms: close-up alpha-card folds/repeated crowns. Glazing: dark oblique views and repetitive curtain cards despite real layer separation. Crown: simplified water/basin, containment/guarding and relaxation detail. All four and overall remain PARTIAL against the approved reference.

## Unchanged design decisions

Basement vehicle access, parcel/civil boundary relationships, coordinated room-specific façade openings, engineered roof guarding/drainage and maintenance access require authoritative architectural/engineering decisions. No fabricated ramp, opening, safety certification or new operational capability.

## Verification / review

Run `npx tsc -b --pretty false`, `npm run lint`, `npm run build`, the preserved deterministic/browser runners and the targeted convergence/fallback scripts listed in the report. Baseline remains 23 deterministic passes plus the unchanged L06 ingestion V2 mismatch, six browser passes, 81 lint warnings/zero errors. The new human-eye comparisons and measured performance are linked from the report.

Use the local app at `http://127.0.0.1:5173/`; the review artifact is separate from product UI. Camera-only capture harness changes do not modify navigation. No production/cloud changes or commits. Stop before any next interior/site/runtime phase.
