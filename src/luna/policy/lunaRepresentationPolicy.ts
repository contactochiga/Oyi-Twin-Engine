// Luna Residences — the Phase 8 representation policy implementation.
// This is the ONE place that decides "what does this identity get to see
// of this canonical ref" for the whole building — Facility UI, Consumer
// UI and Oyi's own scope gate (see lunaScope.ts) all resolve through this,
// so there is exactly one source of truth rather than parallel rules that
// can drift out of sync.

import type { RepresentationPolicy, RepresentationQuery, RepresentationMode, RepresentationIdentity } from "../../engine/representationPolicy";
import type { OperationalAssetRecord } from "../../engine/twinData";
import { lunaTwinDataProvider } from "../operational/lunaTwinDataProvider";
import { LUNA_LEVELS } from "../lunaProgramme";
import { findSpace } from "../interiors/lunaSpaceLookup";
import { isFacilityManagedLevel } from "./lunaLevelUse";
import { isFacilityOwnedUnitAsset } from "./lunaUnitMepAssets";
import { unitLifecycleState } from "./lunaUnitLifecycle";

// Every private residential unit's canonical ref, across every level that
// has one modeled — the single list every other function here consults.
export const LUNA_PRIVATE_UNIT_REFS = ["LUNA-L06-APT-A", "LUNA-L06-APT-B", "LUNA-L06-APT-C", "LUNA-L06-APT-D", "LUNA-L10-APT-A", "LUNA-PENTHOUSE"];

function isPrivateUnitRef(ref: string): boolean {
  return LUNA_PRIVATE_UNIT_REFS.includes(ref);
}

/** If `ref` names a private unit itself, or a room/sub-space within one
 * (namespaced by convention, e.g. "LUNA-L06-APT-A-KITCHEN"), returns that
 * unit's own ref. Otherwise undefined. */
function unitOwning(ref: string): string | undefined {
  for (const unitRef of LUNA_PRIVATE_UNIT_REFS) {
    if (ref === unitRef || ref.startsWith(`${unitRef}-`)) return unitRef;
  }
  return undefined;
}

function resolveLevelRefFor(ref: string): string | undefined {
  const level = LUNA_LEVELS.find((l) => l.ref === ref);
  if (level) return level.ref;
  const found = findSpace(ref);
  if (!found) return undefined;
  if (found.kind === "level") return found.level.ref;
  // Architectural Reality V1 — the entrance/stair doors (kind "door")
  // have no InteriorSpec of their own to read an owner level from; both
  // real door families this phase adds live on Ground only.
  if (found.kind === "door") return "LUNA-GROUND";
  // L06 Gold Standard (Part 32/35) — "unit" (a private unit with no
  // registered interior, e.g. a Phase 16A generated unit on another
  // level) carries its own levelRef directly, no InteriorSpec involved.
  if (found.kind === "unit") return found.levelRef;
  return found.spec.ownerLevelRef;
}

function resolveAssetMode(asset: OperationalAssetRecord, identity: RepresentationIdentity): RepresentationMode {
  const owningUnit = asset.unitRef;
  if (owningUnit && isPrivateUnitRef(owningUnit)) {
    if (identity.role === "resident" && identity.assignedHomeRefs.includes(owningUnit)) return "FULL_3D";
    if (identity.facilityResponsibility && isFacilityOwnedUnitAsset(asset.ref)) return "CONTEXT_3D";
    return "HIDDEN";
  }
  // Common/plant infrastructure — not inside any private unit.
  if (identity.role === "facility") return "FULL_3D";
  if (identity.role === "resident") return asset.system === "vertical-transport" ? "CONTEXT_3D" : "HIDDEN";
  return "HIDDEN"; // public — no plant/common-asset access modeled yet
}

function resolveUnitMode(unitRef: string, identity: RepresentationIdentity): RepresentationMode {
  if (identity.role === "resident") return identity.assignedHomeRefs.includes(unitRef) ? "FULL_3D" : "HIDDEN";
  if (identity.role === "facility") return "OPERATIONAL_2D";
  // Public/sales — data-model-only for now (no portal built yet), but the
  // policy must already accept and branch on lifecycle state so Phase 9+
  // doesn't have to replace this contract.
  const lifecycle = unitLifecycleState(unitRef);
  if (lifecycle === "available") return "FULL_3D";
  if (lifecycle === "reserved") return "CONTEXT_2D";
  return "HIDDEN"; // occupied
}

function resolveLevelMode(levelRef: string, identity: RepresentationIdentity): RepresentationMode {
  if (isFacilityManagedLevel(levelRef)) {
    if (identity.role === "facility") return "FULL_3D";
    return "CONTEXT_3D"; // residents and the public can walk shared/common levels
  }
  // A residential level's own architecture (not any specific private unit
  // within it, which resolveUnitMode governs separately).
  if (identity.role === "facility") return "OPERATIONAL_2D";
  if (identity.role === "resident") return "CONTEXT_3D";
  return "HIDDEN";
}

export const lunaRepresentationPolicy: RepresentationPolicy = {
  resolveMode(query: RepresentationQuery): RepresentationMode {
    const { ref, identity } = query;

    const asset = lunaTwinDataProvider.getAsset(ref);
    if (asset) return resolveAssetMode(asset, identity);

    const owningUnit = unitOwning(ref);
    if (owningUnit) return resolveUnitMode(owningUnit, identity);

    const levelRef = resolveLevelRefFor(ref);
    if (levelRef) return resolveLevelMode(levelRef, identity);

    // Unrecognized ref — Facility (building-wide operational responsibility)
    // defaults open, everyone else defaults closed.
    return identity.role === "facility" ? "FULL_3D" : "HIDDEN";
  },

  filterAuthorizedAssets(assets: OperationalAssetRecord[], identity: RepresentationIdentity): OperationalAssetRecord[] {
    return assets.filter((asset) => resolveAssetMode(asset, identity) !== "HIDDEN");
  },
};
