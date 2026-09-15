// Luna service-route resolution (Phase 10) — the Luna-specific mapping
// from "a unit + a system" to the actual termination asset that route
// should walk from, kept out of the building-agnostic engine layer the
// same way lunaVocabulary.ts keeps phrase aliases out of it. The actual
// route-walking logic lives in engine/serviceRoute.ts and is reused
// as-is here.

import type { TwinDataProvider, OperationalSystem } from "../../engine/twinData";
import { buildServiceRoute, type ServiceRoute } from "../../engine/serviceRoute";

/** Which asset a "route to <unit>" question for a given system should
 * actually resolve to — Apartment 6A's meter/valve/ONT/smoke detector,
 * not the apartment shell itself (which isn't an operational asset and
 * has no parentRef chain to walk). */
export const UNIT_SYSTEM_TERMINATION: Record<string, Partial<Record<OperationalSystem, string>>> = {
  "LUNA-L06-APT-A": {
    water: "LUNA-L06-APT-A-METER-WATER-01",
    electrical: "LUNA-L06-APT-A-METER-ELEC-01",
    drainage: "LUNA-L06-APT-A-DRAIN-01",
    fire: "LUNA-L06-APT-A-ENTRY-SMOKE-01",
    "network-edge": "LUNA-L06-APT-A-NET-ONT-01",
    // HVAC System V1 — the primary commandable indoor unit, used ONLY for
    // resolving an ambiguous command target ("set Apartment 6A to 22
    // degrees" in lunaIntentParser.ts's matchCommand). Deliberately NOT
    // used for "show the HVAC route" — that unit's own parentRef chain is
    // its ELECTRICAL AC circuit, not a genuine HVAC route, so routing
    // through buildServiceRoute() here would silently mislabel the
    // electrical supply path as HVAC (see matchShowRoute's own hvac
    // special-case, which intentionally does NOT use this mapping).
    hvac: "LUNA-L06-APT-A-LIVING-AC-01",
  },
};

export function terminationAssetFor(targetRef: string, system: OperationalSystem): string {
  return UNIT_SYSTEM_TERMINATION[targetRef]?.[system] ?? targetRef;
}

/** Resolves a route for Oyi's "show me the X route to Y" intents. `targetRef`
 * may already be an operational asset (e.g. a booster pump) or a unit/space
 * ref that needs translating to its termination asset first. */
export function lunaBuildRoute(twinData: TwinDataProvider, system: OperationalSystem, targetRef: string): ServiceRoute | null {
  return buildServiceRoute(twinData, terminationAssetFor(targetRef, system));
}
