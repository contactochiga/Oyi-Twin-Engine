// Oyi Twin Engine — Building Ingestion V2 Part 27: a small, deliberately
// unglamorous synthetic building, proving the generic engine/spatial/*
// derivation functions are not secretly hardcoded to Luna. Every function
// exercised against this fixture (LevelRail generation, floor control,
// camera derivation, navigation graph, crosswalk, alias resolution) is
// the EXACT SAME function exercised against Luna's own reference model
// (lunaSpatialModel.ts) — no fixture-specific code path exists anywhere
// in src/engine/spatial/.
//
// TEST BUILDING
//   Ground
//   L01 — Unit 101, Unit 102, Corridor, Lift Lobby, Stair
//   L02
//
// This is not a product demo — dimensions and positions are simple,
// round numbers, not an attempt at architectural realism.

import type { NormalizedBuildingModel } from "../types";
import { emptyNormalizedBuildingModel } from "../types";
import type { PlanRepresentation, ModelRepresentation } from "../representations";
import type { SpatialTransition } from "../transitions";

export const MINI_BUILDING_PROJECT_ID = "MINI-TEST";

/** Spatial Transition Engine V1 Part 29 — the exterior/entrance refs this
 * fixture's own transition uses, exported so tests can reference them
 * without hardcoding string literals in two places. */
export const MINI_EXTERIOR_REF = "MINI-EXTERIOR-PLAZA";
export const MINI_MAIN_ENTRANCE_DOOR_REF = "MINI-GROUND-MAIN-ENTRANCE-DOOR-01";

export function buildMiniBuildingModel(): NormalizedBuildingModel {
  const model = emptyNormalizedBuildingModel(MINI_BUILDING_PROJECT_ID);

  model.building = {
    canonicalRef: "MINI-BUILDING",
    sourceRefs: ["src-building"],
    source2DRefs: [],
    source3DRefs: ["src-building"],
    spaceType: "building",
    name: "Mini Test Building",
    confidence: 1,
    reviewStatus: "CONFIRMED",
    provenance: { derivedFrom: "authored", sourceIds: ["src-building"] },
  };

  // Spatial Transition Engine V1 Part 29 — the exterior plaza the
  // fixture's own Main Entrance transition starts from.
  model.site = {
    canonicalRef: MINI_EXTERIOR_REF,
    sourceRefs: ["src-exterior"],
    source2DRefs: [],
    source3DRefs: ["src-exterior"],
    spaceType: "site",
    name: "Exterior Plaza",
    boundary: { kind: "rect", x: 0, z: 10, width: 20, depth: 12 },
    confidence: 1,
    reviewStatus: "CONFIRMED",
    provenance: { derivedFrom: "authored", sourceIds: ["src-exterior"] },
  };

  model.levels = [
    { canonicalRef: "MINI-GROUND", sourceRefs: ["src-ground"], source2DRefs: ["src-ground"], source3DRefs: ["src-ground"], spaceType: "level", name: "Ground", order: 0, baseElevation: 0, height: 4, boundary: { kind: "rect", x: 0, z: 0, width: 20, depth: 16 }, confidence: 1, reviewStatus: "CONFIRMED", provenance: { derivedFrom: "authored", sourceIds: ["src-ground"] } },
    { canonicalRef: "MINI-L01", sourceRefs: ["src-l01"], source2DRefs: ["src-l01"], source3DRefs: ["src-l01"], spaceType: "level", name: "Level 1", order: 1, baseElevation: 4, height: 3.2, boundary: { kind: "rect", x: 0, z: 0, width: 20, depth: 16 }, confidence: 1, reviewStatus: "CONFIRMED", provenance: { derivedFrom: "authored", sourceIds: ["src-l01"] } },
    { canonicalRef: "MINI-L02", sourceRefs: ["src-l02"], source2DRefs: ["src-l02"], source3DRefs: ["src-l02"], spaceType: "level", name: "Level 2", order: 2, baseElevation: 7.2, height: 3.2, boundary: { kind: "rect", x: 0, z: 0, width: 20, depth: 16 }, confidence: 1, reviewStatus: "CONFIRMED", provenance: { derivedFrom: "authored", sourceIds: ["src-l02"] } },
  ];

  model.units = [
    { canonicalRef: "MINI-L01-UNIT-101", sourceRefs: ["src-101"], source2DRefs: ["src-101"], source3DRefs: ["src-101"], levelRef: "MINI-L01", spaceType: "unit", unitCategory: "residential", name: "Unit 101", boundary: { kind: "rect", x: -6, z: 0, width: 7, depth: 10 }, entryPoints: [{ x: -2.5, y: 0, z: 0 }], confidence: 1, reviewStatus: "CONFIRMED", provenance: { derivedFrom: "authored", sourceIds: ["src-101"] } },
    { canonicalRef: "MINI-L01-UNIT-102", sourceRefs: ["src-102"], source2DRefs: ["src-102"], source3DRefs: ["src-102"], levelRef: "MINI-L01", spaceType: "unit", unitCategory: "residential", name: "Unit 102", boundary: { kind: "rect", x: 6, z: 0, width: 7, depth: 10 }, entryPoints: [{ x: 2.5, y: 0, z: 0 }], confidence: 1, reviewStatus: "CONFIRMED", provenance: { derivedFrom: "authored", sourceIds: ["src-102"] } },
  ];

  model.commonAreas = [
    { canonicalRef: "MINI-L01-CORRIDOR", sourceRefs: ["src-corridor"], source2DRefs: ["src-corridor"], source3DRefs: ["src-corridor"], levelRef: "MINI-L01", spaceType: "corridor", name: "Corridor", boundary: { kind: "rect", x: 0, z: 0, width: 4, depth: 10 }, confidence: 1, reviewStatus: "CONFIRMED", provenance: { derivedFrom: "authored", sourceIds: ["src-corridor"] } },
    { canonicalRef: "MINI-L01-LIFT-LOBBY", sourceRefs: ["src-lobby"], source2DRefs: ["src-lobby"], source3DRefs: ["src-lobby"], levelRef: "MINI-L01", spaceType: "common_area", name: "Lift Lobby", boundary: { kind: "rect", x: 0, z: -6, width: 4, depth: 3 }, confidence: 1, reviewStatus: "CONFIRMED", provenance: { derivedFrom: "authored", sourceIds: ["src-lobby"] } },
    // Spatial Transition Engine V1 Part 29 — a Ground common area the
    // fixture's own entrance transition leads into, proving the engine
    // requires zero Luna-specific code, not even for "the room behind the
    // front door."
    { canonicalRef: "MINI-GROUND-LOBBY", sourceRefs: ["src-ground-lobby"], source2DRefs: ["src-ground-lobby"], source3DRefs: ["src-ground-lobby"], levelRef: "MINI-GROUND", spaceType: "common_area", name: "Ground Lobby", boundary: { kind: "rect", x: 0, z: -4, width: 8, depth: 8 }, connectedSpaceRefs: ["MINI-GROUND-LOUNGE"], confidence: 1, reviewStatus: "CONFIRMED", provenance: { derivedFrom: "authored", sourceIds: ["src-ground-lobby"] } },
    // Spatial Transition Engine V1.1 Part 22 — a second Ground common area
    // with NO door/actuator between it and the Lobby, proving chained
    // routing through a real OPEN_PASSAGE step (Part 9/15), not just a
    // single door. connectedSpaceRefs above is what gives buildNavigation
    // Graph() a real "adjacency" edge to bind the passage transition onto.
    { canonicalRef: "MINI-GROUND-LOUNGE", sourceRefs: ["src-ground-lounge"], source2DRefs: ["src-ground-lounge"], source3DRefs: ["src-ground-lounge"], levelRef: "MINI-GROUND", spaceType: "common_area", name: "Ground Lounge", boundary: { kind: "rect", x: 0, z: -12, width: 8, depth: 6 }, confidence: 1, reviewStatus: "CONFIRMED", provenance: { derivedFrom: "authored", sourceIds: ["src-ground-lounge"] } },
  ];

  // Doors: Unit 101/102 each connect to the corridor — the ONLY way into
  // either unit per the navigation graph (Part 15's "do not over-connect"
  // discipline; a level is never auto-wired directly to a private unit).
  model.doors = [
    { canonicalRef: "MINI-L01-UNIT-101-DOOR-01", sourceRefs: ["src-door-101"], source2DRefs: ["src-door-101"], source3DRefs: ["src-door-101"], levelRef: "MINI-L01", spaceType: "door", name: "Unit 101 Entrance", doorKind: "hinged", fromSpaceRef: "MINI-L01-CORRIDOR", toSpaceRef: "MINI-L01-UNIT-101", confidence: 1, reviewStatus: "CONFIRMED", provenance: { derivedFrom: "authored", sourceIds: ["src-door-101"] } },
    { canonicalRef: "MINI-L01-UNIT-102-DOOR-01", sourceRefs: ["src-door-102"], source2DRefs: ["src-door-102"], source3DRefs: ["src-door-102"], levelRef: "MINI-L01", spaceType: "door", name: "Unit 102 Entrance", doorKind: "hinged", fromSpaceRef: "MINI-L01-CORRIDOR", toSpaceRef: "MINI-L01-UNIT-102", confidence: 1, reviewStatus: "CONFIRMED", provenance: { derivedFrom: "authored", sourceIds: ["src-door-102"] } },
    // The fixture's own Main Entrance — automatic sliding, condition (A)
    // fully animatable (Part 22/23), a real movable-leaf door with known
    // kinematics — connecting the exterior plaza to the Ground Lobby.
    {
      canonicalRef: MINI_MAIN_ENTRANCE_DOOR_REF,
      sourceRefs: ["src-door-main"],
      source2DRefs: ["src-door-main"],
      source3DRefs: ["src-door-main"],
      levelRef: "MINI-GROUND",
      spaceType: "door",
      name: "Main Entrance",
      doorKind: "automatic_sliding",
      fromSpaceRef: MINI_EXTERIOR_REF,
      toSpaceRef: "MINI-GROUND-LOBBY",
      slideAxis: "x",
      approachPoint: { x: 0, y: 1.7, z: 6 },
      entryPoint3D: { x: 0, y: 1.7, z: 0 },
      exitPoint: { x: 0, y: 1.7, z: -6 },
      animationReadiness: "ANIMATABLE",
      confidence: 1,
      reviewStatus: "CONFIRMED",
      provenance: { derivedFrom: "authored", sourceIds: ["src-door-main"] },
    },
  ];

  model.stairs = [
    { canonicalRef: "MINI-STAIR-01", sourceRefs: ["src-stair"], source2DRefs: ["src-stair"], source3DRefs: ["src-stair"], spaceType: "stair", name: "Stair 1", boundary: { kind: "rect", x: 8, z: -6, width: 3, depth: 4 }, servedLevelRefs: ["MINI-GROUND", "MINI-L01", "MINI-L02"], confidence: 1, reviewStatus: "CONFIRMED", provenance: { derivedFrom: "authored", sourceIds: ["src-stair"] } },
  ];

  model.lifts = [
    { canonicalRef: "MINI-LIFT-01", sourceRefs: ["src-lift"], source2DRefs: ["src-lift"], source3DRefs: ["src-lift"], spaceType: "lift", name: "Lift 1", boundary: { kind: "rect", x: -8, z: -6, width: 2.5, depth: 2.5 }, servedLevelRefs: ["MINI-GROUND", "MINI-L01", "MINI-L02"], confidence: 1, reviewStatus: "CONFIRMED", provenance: { derivedFrom: "authored", sourceIds: ["src-lift"] } },
  ];

  return model;
}

/** A minimal, real (not aspirational) crosswalk — one unit gets both a
 * plan region AND a model node, proving 2D<->3D correspondence on a
 * building that has never touched a line of Luna-specific code. */
export function buildMiniBuildingCrosswalk(): { planRepresentations: PlanRepresentation[]; modelRepresentations: ModelRepresentation[] } {
  const planRepresentations: PlanRepresentation[] = [
    { canonicalRef: "MINI-L01-UNIT-101", sourceRef: "src-101", levelRef: "MINI-L01", boundary: { kind: "rect", x: -6, z: 0, width: 7, depth: 10 }, label: "Unit 101", origin: "vector" },
  ];
  const modelRepresentations: ModelRepresentation[] = [
    { canonicalRef: "MINI-L01-UNIT-101", sourceRef: "src-model", nodeRefs: ["Unit_101_Mesh"], transform: { position: [-6, 4, 0] } },
  ];
  return { planRepresentations, modelRepresentations };
}

/** Spatial Transition Engine V1 Part 29 — the fixture's own real
 * SpatialTransition, built the exact same way lunaTransitions.ts builds
 * Luna's, proving the STE requires zero Luna-specific code to derive a
 * transition for a newly ingested, non-Luna building with a normalized
 * automatic-sliding door. */
export function buildMiniEntranceTransition(): SpatialTransition {
  const door = buildMiniBuildingModel().doors.find((d) => d.canonicalRef === MINI_MAIN_ENTRANCE_DOOR_REF)!;
  return {
    transitionId: "MINI-TRANSITION-MAIN-ENTRANCE-IN",
    type: "AUTOMATIC_DOOR",
    fromSpaceRef: door.fromSpaceRef!,
    toSpaceRef: door.toSpaceRef!,
    boundaryRef: door.canonicalRef,
    approachPoint: door.approachPoint!,
    entryPoint: door.entryPoint3D!,
    exitPoint: door.exitPoint!,
    crossingPath: [door.approachPoint!, door.entryPoint3D!, door.exitPoint!],
    accessRequirement: "NONE",
    clearanceRule: { requiredClearWidthMeters: 0.9 },
    status: "CONFIRMED",
  };
}

/** Spatial Transition Engine V1.1 Part 22 — a real OPEN_PASSAGE
 * transition (Lobby -> Lounge): no boundaryRef, no actuator, just a
 * genuine approach -> cross -> arrive sequence, proving the same generic
 * engine handles a boundary-free transition alongside a door, with zero
 * Luna-specific code anywhere in the call path. */
export function buildMiniOpenPassageTransition(): SpatialTransition {
  return {
    transitionId: "MINI-TRANSITION-LOBBY-LOUNGE",
    type: "OPEN_PASSAGE",
    fromSpaceRef: "MINI-GROUND-LOBBY",
    toSpaceRef: "MINI-GROUND-LOUNGE",
    approachPoint: { x: 0, y: 1.7, z: -6 },
    entryPoint: { x: 0, y: 1.7, z: -9 },
    exitPoint: { x: 0, y: 1.7, z: -12 },
    crossingPath: [
      { x: 0, y: 1.7, z: -6 },
      { x: 0, y: 1.7, z: -9 },
      { x: 0, y: 1.7, z: -12 },
    ],
    accessRequirement: "NONE",
    clearanceRule: { requiredClearWidthMeters: 0.9 },
    status: "CONFIRMED",
  };
}
