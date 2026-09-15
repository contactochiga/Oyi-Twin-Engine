// Oyi Twin Engine — Building Ingestion V2 Part 20: operational binding.
// A newly ingested architectural Twin may be spatial-only, and that is a
// fully acceptable end state — this file exists to make the
// SPATIAL TWIN / CONNECTED OPERATIONAL TWIN distinction real data, not an
// implied naming convention, and to make sure "connected" is never
// asserted without a real TwinDataProvider lookup backing it.

import type { CanonicalRef } from "../types";
import type { TwinDataProvider } from "../twinData";
import type { OperationalAssetBinding, OperationalBindingKind } from "./types";

export type TwinConnectivityLevel = "SPATIAL_TWIN" | "CONNECTED_OPERATIONAL_TWIN";

/** A space is a CONNECTED_OPERATIONAL_TWIN only if at least one of its
 * bindings is real and marked connected; otherwise it's SPATIAL_TWIN —
 * architecturally real, operationally inert. Both are valid, honest end
 * states (Part 20's own explicit instruction: "The Twin must
 * distinguish... Do not fabricate connectivity."). */
export function twinConnectivityLevel(spatialRef: CanonicalRef, bindings: OperationalAssetBinding[]): TwinConnectivityLevel {
  return bindings.some((b) => b.spatialRef === spatialRef && b.connected) ? "CONNECTED_OPERATIONAL_TWIN" : "SPATIAL_TWIN";
}

let bindingSeq = 0;
function nextBindingId(): string {
  bindingSeq += 1;
  return `bind_${bindingSeq}`;
}

/** The one legitimate way to create an OperationalAssetBinding —
 * `connected` is NEVER a caller-supplied boolean, it is derived by
 * actually resolving operationalAssetRef against a real
 * TwinDataProvider. Given a provider with no matching asset (the common
 * case for a freshly ingested building with no operational systems wired
 * up yet), this correctly returns `connected: false` — the architectural
 * relationship is recorded, but nothing is claimed to actually work. */
export function createOperationalBinding(spatialRef: CanonicalRef, operationalAssetRef: CanonicalRef, bindingKind: OperationalBindingKind, twinData: TwinDataProvider): OperationalAssetBinding {
  const asset = twinData.getAsset(operationalAssetRef);
  return {
    bindingId: nextBindingId(),
    spatialRef,
    operationalAssetRef,
    bindingKind,
    connected: Boolean(asset),
    note: asset ? undefined : "operationalAssetRef does not resolve in the current TwinDataProvider — recorded as a known architectural relationship only, not an active connection",
  };
}

export function bindingsFor(spatialRef: CanonicalRef, bindings: OperationalAssetBinding[]): OperationalAssetBinding[] {
  return bindings.filter((b) => b.spatialRef === spatialRef);
}
