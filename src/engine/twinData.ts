// Oyi Twin Engine — Twin Data Provider contract (Phase 4).
// Building-agnostic on purpose, same discipline as types.ts: nothing here
// may name "Luna" or hardcode a Luna-specific value. The engine asks its
// data provider for operational assets; it never imports a building's data
// module directly. This is what lets the *same* renderer run against a
// static local dataset today (see src/luna/operational) and a live Oyi API
// tomorrow — only the provider implementation changes, never the engine or
// its React components.
//
//   Twin Engine  -->  Twin Data Provider  -->  Luna local simulation (today)
//                                          \->  Oyi API (tomorrow)

import { createContext, useContext } from "react";
import type { CanonicalRef, TwinNodeKind } from "./types";

export type OperationalSystem =
  | "structure"
  | "electrical"
  | "water"
  | "drainage"
  | "fire"
  | "hvac"
  | "vertical-transport"
  | "security"
  | "access"
  | "network-edge"
  | "apartment-devices";

/** Mirrors the Oyi backend's own three-tier model: an object with real
 * write capabilities (capabilities[] is non-empty in the devices table), a
 * pure telemetry point (a device_states row but no capabilities), or an
 * asset that exists in the twin purely for spatial/relationship context
 * (no capabilities, no state row — e.g. the incoming grid connection). */
export type AssetClassification = "controllable" | "observable" | "asset-only";

export interface OperationalAssetRecord {
  ref: CanonicalRef;
  label: string;
  kind: TwinNodeKind;
  system: OperationalSystem;
  /** Backend `type`/`category` (e.g. "pump", "energy_meter", "elevator"). */
  type: string;
  locationLabel: string;
  /** The level this asset should be spatially attached to, for placement,
   * fade-with-level, and isolate/explode participation. */
  ownerLevelRef: CanonicalRef;
  /** Set when the asset lives inside a unit (e.g. an apartment) rather than
   * directly in its level's own massing group — position is then local to
   * the unit's origin, not the level's. */
  unitRef?: CanonicalRef;
  /** Canonical ref of this asset's parent in the operational system graph
   * (e.g. an ATS's parent is its MDB) — distinct from spatial containment. */
  parentRef?: CanonicalRef;
  classification: AssetClassification;
  /** Always true for a locally-simulated provider; a future live-API
   * provider would report false for a genuinely connected device. */
  simulation: boolean;
  /** Backend capabilities[] — empty for observable/asset-only records. */
  capabilities: string[];
  /** Seeded device_states.status (or camera/access-point/edge-node
   * equivalent), or null when nothing has been seeded for this record yet
   * — shown as-is, never fabricated, per the read-only Phase 4 contract. */
  seededState: Record<string, unknown> | null;
  /** Local position (metres) — relative to unitRef's origin when set,
   * otherwise relative to ownerLevelRef's own massing-group origin (the
   * same floor-aligned local space InteriorLayer renders rooms into). The
   * y value is the asset's floor/mount contact point, not its geometric
   * center — marker components lift their own geometry by half-height. */
  position: { x: number; y: number; z: number };
}

export interface TwinDataProvider {
  listAssets(): OperationalAssetRecord[];
  getAsset(ref: CanonicalRef): OperationalAssetRecord | undefined;
}

export const TwinDataContext = createContext<TwinDataProvider | null>(null);

export function useTwinData(): TwinDataProvider {
  const ctx = useContext(TwinDataContext);
  if (!ctx) throw new Error("useTwinData must be used within a TwinDataContext.Provider");
  return ctx;
}
