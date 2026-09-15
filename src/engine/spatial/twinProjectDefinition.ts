// Oyi Twin Engine — Building Ingestion V2 Parts 23/24: the publish
// contract and the generic project-loading contract.
//
// Part 23: after Publish, derive a generic runtime package sufficient
// for the Twin Engine to instantiate a project WITHOUT Luna-specific
// code. TwinProjectDefinition is that package — everything below it is
// pure data, assembled once from a NormalizedBuildingModel using only
// the generic derivation functions this phase already built (LevelRail,
// floor control, camera destinations, navigation graph, crosswalk, alias
// index). RepresentationPolicy is deliberately NOT baked in here — it's
// evaluated per-identity at request time (see representationPolicy.ts),
// never precomputed into a static definition that would go stale the
// moment a user's role/assignment changes.
//
// Part 24: LOAD PROJECT -> LOAD CANONICAL SPATIAL MODEL -> LOAD
// REPRESENTATIONS -> BUILD LEVELRAIL -> BUILD FLOOR CONTROL -> BUILD
// SELECTION INDEX -> BUILD NAVIGATION -> BUILD CAMERA DESTINATIONS ->
// APPLY REPRESENTATION POLICY -> LOAD OPERATIONAL BINDINGS -> START TWIN.
// buildTwinProjectDefinition() performs every one of those steps except
// the last two (policy is per-identity, "start Twin" is host-side
// rendering, not a data transform) — LOAD_STEPS below documents the full
// sequence for tests/docs without pretending this function renders
// anything.

import type { CanonicalRef } from "../types";
import type { FloorPlanSpec } from "../components/FloorPlan2D";
import type { LevelRailItem } from "../components/spatial/LevelRail";
import type { ProjectRecord, SourceFormat, SourceRole } from "../ingestion/types";
import type { NormalizedBuildingModel, OperationalAssetBinding } from "./types";
import type { SpatialRepresentationCrosswalk } from "./representations";
import type { NavigationGraph } from "./navigationGraph";
import type { DerivedCameraDestination } from "./cameraDerivation";
import type { SpatialAlias } from "./oyiAliasIndex";

import { deriveLevelRailItems } from "./levelRail";
import { deriveFloorPlanSpec, levelsWithFloorControl } from "./floorControl";
import { buildNavigationGraph } from "./navigationGraph";
import { deriveBuildingOverviewCamera, deriveLevelOverviewCamera, deriveSpaceEntryCamera, deriveSpaceExteriorCamera, validateCameraDestination } from "./cameraDerivation";
import { buildSpatialAliasIndex } from "./oyiAliasIndex";
import { spacesOnLevel } from "./types";

export const LOAD_STEPS = [
  "LOAD_PROJECT",
  "LOAD_CANONICAL_SPATIAL_MODEL",
  "LOAD_REPRESENTATIONS",
  "BUILD_LEVELRAIL",
  "BUILD_FLOOR_CONTROL",
  "BUILD_SELECTION_INDEX",
  "BUILD_NAVIGATION",
  "BUILD_CAMERA_DESTINATIONS",
  "APPLY_REPRESENTATION_POLICY",
  "LOAD_OPERATIONAL_BINDINGS",
  "START_TWIN",
] as const;
export type LoadStep = (typeof LOAD_STEPS)[number];

export interface SourceProvenanceEntry {
  sourceId: string;
  fileName: string;
  role?: SourceRole;
  format: SourceFormat;
}

export interface TwinProjectDefinition {
  projectId: string;
  projectMeta: ProjectRecord;
  model: NormalizedBuildingModel;
  crosswalk: SpatialRepresentationCrosswalk;
  levelRailItems: LevelRailItem[];
  floorPlans: Record<CanonicalRef, FloorPlanSpec>;
  navigationGraph: NavigationGraph;
  cameraDestinations: DerivedCameraDestination[];
  operationalBindings: OperationalAssetBinding[];
  aliasIndex: SpatialAlias[];
  sourceProvenance: SourceProvenanceEntry[];
  /** Unresolved/rejected items — carried forward honestly rather than
   * silently dropped (matches PublishResult.skipped's own discipline). */
  reviewRequired: Array<{ ref: CanonicalRef; reason: string }>;
}

/** Assembles the full generic runtime package from an already-normalized
 * model. Every sub-piece reuses this phase's own derivation functions —
 * nothing here re-implements LevelRail/floor-control/camera/navigation
 * logic a second time. */
export function buildTwinProjectDefinition(projectMeta: ProjectRecord, model: NormalizedBuildingModel, crosswalk: SpatialRepresentationCrosswalk, sourceProvenance: SourceProvenanceEntry[] = [], buildingCenter: { x: number; z: number } = { x: 0, z: 0 }): TwinProjectDefinition {
  const levelRailItems = deriveLevelRailItems(model.levels);

  const floorPlans: Record<CanonicalRef, FloorPlanSpec> = {};
  for (const level of levelsWithFloorControl(model)) {
    const spec = deriveFloorPlanSpec(model, level.canonicalRef);
    if (spec) floorPlans[level.canonicalRef] = spec;
  }

  const navigationGraph = buildNavigationGraph(model);

  const cameraDestinations: DerivedCameraDestination[] = [];
  const buildingOverview = deriveBuildingOverviewCamera(model);
  cameraDestinations.push(validateCameraDestination(buildingOverview, model));
  for (const level of model.levels) {
    cameraDestinations.push(validateCameraDestination(deriveLevelOverviewCamera(level, model), model));
    for (const space of spacesOnLevel(model, level.canonicalRef)) {
      cameraDestinations.push(validateCameraDestination(deriveSpaceExteriorCamera(space, level, buildingCenter), model));
      cameraDestinations.push(validateCameraDestination(deriveSpaceEntryCamera(space, level, buildingCenter), model));
    }
  }

  const aliasIndex = buildSpatialAliasIndex(model);

  const reviewRequired = cameraDestinations.filter((d) => d.status === "CAMERA_REVIEW_REQUIRED").map((d) => ({ ref: d.spatialRef, reason: d.note ?? "camera destination requires review" }));

  return {
    projectId: projectMeta.projectId,
    projectMeta,
    model,
    crosswalk,
    levelRailItems,
    floorPlans,
    navigationGraph,
    cameraDestinations,
    operationalBindings: model.operationalBindings,
    aliasIndex,
    sourceProvenance,
    reviewRequired,
  };
}
