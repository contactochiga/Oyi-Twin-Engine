import type { RoomCameraPreset } from "../engine/components/CameraRig";

// Phase 12 — explicit, hand-framed camera shots for Apartment 6A's 12
// rooms, replacing the generic "40% corner inset" heuristic that Phase 11
// found hugs the building's own facade for any room near the unit's outer
// edge (see Phase 11's disclosed known gap). Coordinates are LOCAL to the
// interior's own group origin — the exact same room.x/room.z space
// lunaInteriors.ts already uses — so the caller (roomFocusCamera) applies
// the same INTERIOR_ORIGIN_OFFSET + baseElevation it always has.
//
// Each shot stands just inside one wall (0.4-0.6m clearance, safe for
// these ~3.5m x 3.7m rooms) and looks toward that room's actual furniture
// cluster (cross-checked against each place(...) call in lunaInteriors.ts,
// including rotation), not a formula blind to what's actually in the room.
// Apartment A Full Interior Reality V1 — recomputed for the new 14-room
// layout (lunaInteriors.ts's LUNA_L06_APT_A), which moved every room to
// coordinate with the real corridor entrance point the L06 Gold Standard
// phase established (local x≈5.68, z≈6.09 — far from where the old
// pre-Gold-Standard grid ever assumed the front door would be). Two refs
// are new this phase (GUEST-WC, CORRIDOR); every other ref is repositioned
// but keeps its original canonical identity. Each shot is cross-checked
// against that room's actual furniture placement in lunaInteriors.ts, the
// same discipline the Phase 12 comments below (kept for history on LIVING)
// already established for this file.
export const LUNA_ROOM_CAMERA_PRESETS: Record<string, RoomCameraPreset> = {
  "LUNA-L06-APT-A-ENTRY": { position: [5.663043, 1.7, 2.6], target: [5.663043, 1.3, 5.4], preferredFov: 55, minimumDistance: 1.2 },
  "LUNA-L06-APT-A-KITCHEN": { position: [5.663043, 1.7, -1.6], target: [5.363043, 1.1, 0.6], preferredFov: 55, minimumDistance: 1.2 },
  "LUNA-L06-APT-A-DINING": { position: [1.6, 1.7, -1.6], target: [1.6, 1.05, 0.5], preferredFov: 55, minimumDistance: 1.2 },
  "LUNA-L06-APT-A-UTILITY": { position: [0.6, 1.7, 5.6], target: [0.6, 1.1, 3.3], preferredFov: 55, minimumDistance: 1.0 },
  "LUNA-L06-APT-A-GUEST-WC": { position: [2.5, 1.7, 5.6], target: [2.5, 1.1, 3.3], preferredFov: 55, minimumDistance: 1.0 },
  // Phase 15C — a previous "recompute" (see prior comment, kept below for
  // history) still left the camera almost touching the sofa/media-wall
  // furniture cluster: real-browser validation (not just SwiftShader,
  // which visually degraded this exact shot into looking like a
  // "rendering artifact" instead of a badly-aimed camera) showed the
  // furniture filling the entire frame at point-blank range. The
  // furniture cluster's own merged bounding box (sofa + sofa-back +
  // coffee table + media wall panel + shelf, all place()'d with cz=0.4,
  // rotationY=Math.PI) spans roughly z∈[2.2, 4.9] in this room's own
  // local frame — the OLD camera position (z=4.967) sat right at its
  // back edge. Moved hard against the room's actual north wall (z=5.5)
  // with real clearance, target aimed across the room toward the media
  // wall without landing inside it, minimumDistance raised so a viewer
  // zooming in can't re-clip through the sofa.
  // (Prior comment, now superseded: "Stand near the +z wall ... looking
  // toward the media wall ... recomputed after the sofa furniture cluster
  // grew a media wall panel that the ORIGINAL preset put the camera
  // almost inside of." — that recompute used the same z=4.967 that is
  // itself the actual bug; verified only against SwiftShader output.)
  // V1 note: LIVING moved (south exterior wall, real windows/balcony) but
  // keeps this same "stand near the corridor-facing wall, look across
  // toward the balcony doors" logic that fixed the original clipping bug.
  "LUNA-L06-APT-A-LIVING": { position: [1.5, 1.7, -2.4], target: [4.0, 1.15, -5.5], preferredFov: 58, minimumDistance: 2.5 },
  // Shallow balcony (1.5m deep, ~8.1m wide) — the only public-wing room
  // where the interesting sightline runs along its length, not across its
  // depth (same logic as the ensuites below, which share this shape).
  "LUNA-L06-APT-A-BALCONY": { position: [0.26, 1.7, -6.836957], target: [7.0, 1.3, -6.836957], preferredFov: 62, minimumDistance: 1.5 },
  // Corridor — narrow (1.4m) and long (full apartment depth): stand at
  // the south end (dining junction) and look north along its length,
  // toward the three bedroom doors.
  "LUNA-L06-APT-A-CORRIDOR": { position: [-1.0, 1.7, -5.5], target: [-1.0, 1.4, 5.0], preferredFov: 60, minimumDistance: 1.5 },
  // Bedrooms — stand near the solid partition wall opposite the corridor
  // door, looking across the bed toward the wardrobe run.
  "LUNA-L06-APT-A-BED-01": { position: [-4.763043, 1.7, -2.429], target: [-4.763043, 1.3, -4.3], preferredFov: 55, minimumDistance: 1.2 },
  "LUNA-L06-APT-A-BED-02": { position: [-4.763043, 1.7, 1.629], target: [-4.763043, 1.3, -0.3], preferredFov: 55, minimumDistance: 1.2 },
  "LUNA-L06-APT-A-BED-03": { position: [-4.763043, 1.7, 5.687], target: [-4.763043, 1.3, 3.8], preferredFov: 55, minimumDistance: 1.2 },
  // Ensuites — wide-but-shallow (~1.16m deep, ~6.1m wide, see
  // furniture.ts's longEnsuite()): the sightline runs along the length,
  // standing near the real exterior wall end and looking along the WC ->
  // basin -> shower row, the same "along its length" treatment as the
  // Balcony above.
  "LUNA-L06-APT-A-BATH-01": { position: [-7.363043, 1.5, -5.507971], target: [-2.763043, 1.15, -5.507971], preferredFov: 60, minimumDistance: 2.0 },
  "LUNA-L06-APT-A-BATH-02": { position: [-7.363043, 1.5, -1.45], target: [-2.763043, 1.15, -1.45], preferredFov: 60, minimumDistance: 2.0 },
  "LUNA-L06-APT-A-BATH-03": { position: [-7.363043, 1.5, 2.607972], target: [-2.763043, 1.15, 2.607972], preferredFov: 60, minimumDistance: 2.0 },

  // Phase 12 light interior pass — the "largest room" anchor of each of
  // the other 5 interiors (the one enterInteriorCamera actually frames on
  // "Enter X"). These communal spaces are 10-20m across, so the generic
  // 40%-corner-inset heuristic (tuned against ~4m apartment cells) lands
  // barely 1m off a wall — confirmed the hard way via screenshot: it put
  // the camera nearly against a wall/ceiling surface. Each shot below
  // keeps 1.5-3m real clearance from the nearest wall and was cross-
  // checked against that room's actual furniture placement so it doesn't
  // just trade "inside a wall" for "inside a sofa."
  "LUNA-GROUND-LOBBY-LOUNGE": { position: [-18.5, 1.7, -5.5], target: [-15, 1.3, -2.5], preferredFov: 58, minimumDistance: 2.2 },
  // Architectural Reality V1 — Reception (real room rect unchanged from
  // Phase 3: x=0, z=6, 14x6) and Lift Lobby (rect corrected this phase —
  // see groundLobbyLayout.ts — to actually wrap the real passenger/
  // service lift doors DynamicLift.tsx already renders). Reception stands
  // near the entrance-facing edge looking at the real feature wall/desk;
  // Lift Lobby stands clear of the lift bank looking at the real landing
  // doors (z≈1.43-1.5, DynamicLift.tsx's own Doors group z).
  "LUNA-GROUND-LOBBY-RECEPTION": { position: [0, 1.7, 8], target: [0, 1.3, 3.5], preferredFov: 58, minimumDistance: 2 },
  "LUNA-GROUND-LOBBY-LIFTS": { position: [1.8, 1.7, -5.5], target: [1.8, 1.3, 1.4], preferredFov: 60, minimumDistance: 2.5 },
  "LUNA-L01-CLUB-POOL": { position: [-14.5, 1.7, -6.5], target: [-14.5, 1.3, 4], preferredFov: 58, minimumDistance: 2.2 },
  "LUNA-L10-APT-A-LIVING": { position: [6.65, 1.7, 4.33], target: [0.65, 1.3, 4.33], preferredFov: 60, minimumDistance: 2 },
  // Stands on the east side, clear of LUNA-STAIR-02 (lunaProgramme.ts —
  // its footprint clips the room's own NE corner, confirmed the hard way:
  // the original westward camera looked straight at it), and looks west
  // toward the sofa/media-wall cluster instead of the dining end.
  "LUNA-PENTHOUSE-GREATROOM": { position: [11, 1.7, 5], target: [1.5, 1.3, 7], preferredFov: 62, minimumDistance: 2.5 },
  "LUNA-ROOFTOP-SKYBAR": { position: [-8, 1.7, -5], target: [2, 1.3, -3.7], preferredFov: 58, minimumDistance: 2 },
  "LUNA-ROOFTOP-POOLDECK": { position: [0, 1.7, 2.2], target: [0, 1.2, 6], preferredFov: 58, minimumDistance: 2 },
};
