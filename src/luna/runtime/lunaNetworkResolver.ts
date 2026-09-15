// Network / Edge & Physical Connectivity V1 — the single authoritative
// connectivity resolver, the same philosophy as resolveBuildingPower()/
// resolveFireState()/resolveHvacState()/resolveAccessAuthorization()/
// resolveCameraState(): computed fresh from canonical assets' live
// runtime rows every call, never stored/duplicated state.
//
// THE NETWORK CARRIES TRUTH. IT DOES NOT CREATE TRUTH. This resolver
// reports ONLY the real, pre-existing physical connectivity chain
// established in Phase 10's MEP backbone data (parentRef, not a fabricated
// edge): LUNA-B1-NET-GATEWAY-01 <- LUNA-RISER-NETWORK-01 <-
// LUNA-L06-NETWORK-BRANCH-01 <- LUNA-L06-APT-A-NET-ONT-01 <-
// LUNA-L06-APT-A-ROUTER-01, and LUNA-B1-NET-GATEWAY-01 <-
// LUNA-GROUND-NET-WIFI-AP-01. It NEVER decides, gates, or overrides any
// OTHER system's own operational truth — Electrical/Water/Fire/HVAC/
// Elevators/Access/CCTV all remain fully independent of this resolver.
//
// THE MOST IMPORTANT DISCLOSURE: LUNA-EDGE-CORE-01 (the Oyi Edge/Core
// asset) has NO parentRef and NO relationship to the physical gateway
// chain anywhere in canonical data — its own seededState already says so
// explicitly ("Local digital-twin prototype placeholder, no real edge
// runtime connected"). This resolver does NOT invent that connection,
// even though a real building's edge controller would obviously plug
// into the network. `edgeCoreConnected` is hardcoded false for exactly
// this reason — a deliberate, code-level enforcement of "do not infer
// connectivity that isn't established," not an oversight to fix later.

import { useEffect, useState } from "react";
import { lunaSimulationProvider } from "./lunaSimulationProvider";

const GATEWAY_REF = "LUNA-B1-NET-GATEWAY-01";
const RISER_REF = "LUNA-RISER-NETWORK-01";
const BRANCH_REF = "LUNA-L06-NETWORK-BRANCH-01";
const ONT_REF = "LUNA-L06-APT-A-NET-ONT-01";
const ROUTER_REF = "LUNA-L06-APT-A-ROUTER-01";
const WIFI_AP_REF = "LUNA-GROUND-NET-WIFI-AP-01";
const EDGE_CORE_REF = "LUNA-EDGE-CORE-01";

export const NETWORK_STATE_SOURCE_REFS = [GATEWAY_REF, RISER_REF, BRANCH_REF, ONT_REF, ROUTER_REF, WIFI_AP_REF, EDGE_CORE_REF];

export interface NetworkBackboneNode {
  ref: string;
  label: string;
  reachable: boolean;
}

export interface NetworkOperationalState {
  gatewayUplinkUp: boolean;
  /** The one real, pre-existing physical chain (Phase 10 parentRef data):
   * riser -> floor branch -> Apartment 6A's ONT -> Apartment 6A's own
   * router, in that upstream-to-downstream order. */
  backbone: NetworkBackboneNode[];
  wifiApReachable: boolean;
  wifiApClientsConnected: number;
  edgeCoreOnline: boolean;
  /** Always false — see file header. Never becomes true, because no
   * canonical relationship establishes it. */
  edgeCoreConnected: false;
  quality: "simulated";
}

export function resolveNetworkState(): NetworkOperationalState | null {
  const gateway = lunaSimulationProvider.getState(GATEWAY_REF);
  const riser = lunaSimulationProvider.getState(RISER_REF);
  const branch = lunaSimulationProvider.getState(BRANCH_REF);
  const ont = lunaSimulationProvider.getState(ONT_REF);
  const router = lunaSimulationProvider.getState(ROUTER_REF);
  const wifiAp = lunaSimulationProvider.getState(WIFI_AP_REF);
  const edgeCore = lunaSimulationProvider.getState(EDGE_CORE_REF);
  if (!gateway || !riser || !branch || !ont || !router || !wifiAp || !edgeCore) return null;

  // Reachability is derived fresh from the gateway's own real uplink_up
  // field every call — never read back from a cached/written field on the
  // downstream assets, the same "never trust stored derived state"
  // discipline every prior resolver already follows.
  const gatewayUplinkUp = (gateway.state as { uplink_up?: boolean }).uplink_up !== false;

  return {
    gatewayUplinkUp,
    backbone: [
      { ref: RISER_REF, label: "Data / Fiber Riser", reachable: gatewayUplinkUp },
      { ref: BRANCH_REF, label: "Level 6 Data Distribution Point", reachable: gatewayUplinkUp },
      { ref: ONT_REF, label: "Fiber Termination Point (ONT)", reachable: gatewayUplinkUp },
      { ref: ROUTER_REF, label: "Home Router / Wi-Fi AP", reachable: gatewayUplinkUp },
    ],
    wifiApReachable: gatewayUplinkUp,
    wifiApClientsConnected: typeof wifiAp.state.clients_connected === "number" ? wifiAp.state.clients_connected : 0,
    edgeCoreOnline: (edgeCore.state as { online?: boolean }).online !== false,
    edgeCoreConnected: false,
    quality: "simulated",
  };
}

export function useNetworkState(): NetworkOperationalState | null {
  const [state, setState] = useState(() => resolveNetworkState());
  useEffect(() => {
    setState(resolveNetworkState());
    return lunaSimulationProvider.subscribe(() => setState(resolveNetworkState()));
  }, []);
  return state;
}
