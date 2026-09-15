// Network / Edge & Physical Connectivity V1 — the Network Control Board's
// asset selector, the eighth SystemControlBoard consumer after Elevators,
// Water, Electrical, Fire, HVAC, Access and CCTV. Only the common,
// Facility-visible network/edge assets — the core gateway, the common-area
// Wi-Fi AP, and Oyi Edge/Core itself. Apartment 6A's own ONT and router
// are deliberately NOT tabs here: the ONT is Facility-owned infrastructure
// but private-unit-scoped (CONTEXT_3D, not a full board tab, matching the
// established "private-unit asset never becomes a Facility board tab"
// precedent), and the router is the resident's OWN equipment (HIDDEN to
// Facility, same boundary as HVAC's indoor units / Access's own lock).
export interface NetworkBoardAsset {
  ref: string;
  shortLabel: string;
}

export const NETWORK_BOARD_ASSETS: NetworkBoardAsset[] = [
  { ref: "LUNA-B1-NET-GATEWAY-01", shortLabel: "Gateway" },
  { ref: "LUNA-GROUND-NET-WIFI-AP-01", shortLabel: "Wi-Fi AP" },
  { ref: "LUNA-EDGE-CORE-01", shortLabel: "Oyi Edge Core" },
];

const NETWORK_BOARD_REFS = new Set(NETWORK_BOARD_ASSETS.map((a) => a.ref));

export function isNetworkBoardRef(ref: string): boolean {
  return NETWORK_BOARD_REFS.has(ref);
}

export function networkBoardTabKeyFor(ref: string): string {
  return ref;
}

export const NETWORK_BOARD_DEFAULT_REF = "LUNA-B1-NET-GATEWAY-01";
