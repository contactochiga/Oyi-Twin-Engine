# Lift 02 implementation audit and reference decisions

Recorded before implementation. Source baseline: `/tmp/luna-dynamic-lift-baseline`. This local checkout has no .git directory, so changes are compared with that snapshot.

The nine authoritative specification/foundation inputs were read. The 43-home programme, 76 operational assets and 51 requirement families remain authoritative. No specification JSON is rewritten.

* Identity: reuse LUNA-LIFT-PASS-02, present in both operational catalogue and core list. Replace its old solid CoreShaft and lerped cabin indicator, not its asset record. Other three lifts, two protected stair references and service-riser references retain placement and static/reference status.
* DD19: retain current LUNA_LEVELS coordinates. Target floor-height migration would move every plan/room/camera/MEP interface and is deferred. Stop positions are generated from the live registry, never an equal-spacing list.
* DD06 reference stop matrix: B1, Ground, L01, L02–L12 (14 stops), common-side landings only. No PH or Roof landing admission. Residential landing access never grants home entry. No dispatch group or service/fire operation is implemented.
* REFERENCE DESIGN, not certified: existing 3×3m shaft centered X=0 Z=0; 0.15m enclosure; 2.1×2.1m car, 2.5m internal height; 1.2m two-panel door opening facing +Z; 1.4m pit below B1; top reference overhead to existing core top. Guide rails/controller/traction envelopes are representative, no manufacturer selected.
* Ground Lift Lobby identity remains LUNA-GROUND-LOBBY-LIFTS at its existing authored coordinates. New wait/threshold anchors belong to the lift at +Z and describe a common-side reference approach, not a new room. Architectural circulation between the old lobby polygon and threshold remains to be coordinated. Upper common-side landings are component anchors, not newly registered rooms.
* DD07: carve Lift02 reference openings in existing structural slab representation while retaining each slab's canonical ID. Existing shared LUNA-STRUCT-CORE-01 stays the shared core. No claim of structural approval, fire compartmentation or protected service-lobby certification.
* DD20: versioned state inside the existing RuntimeAssetState envelope. Simulation-only commands callLift, setPosition, open, close; existing hardware catalogue capabilities remain untouched. Explicit actor/policy admission for this new simulation path. Consumer CONTEXT_3D does not admit control or engineering views. The first passenger journey is Facility-authorized local reference/demo only.
* Fixed-step deterministic provider trajectory, 2.5m/s reference speed, 1m/s² acceleration and 1.2s doors. Busy destinations reject instead of silently superseding; request IDs deduplicate. No unsafe in-flight open or destination cancellation. Simulation fault stops progression; no automatic recovery teleport.
* Explode is a floor diagram: shaft/car remain building-fixed; ride/follow require normal floor geometry. External inspection may coexist with explode with a visible diagram note. Cutaway clips enclosure; moving equipment remains readable as in existing engineering asset overlays. Neither view mutates operational position.

The completed Ground import/fallback loader and RepresentationPolicy are not modified. Policy baseline SHA256: a8b0e655eafd12fc14498f3470ab31ae4a6ee8f8dd583fc2da378c633a79b499.
