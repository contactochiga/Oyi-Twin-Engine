import { useMemo } from "react";
import { RouteHighlightLine, useRouteHighlight, useSceneMode } from "../../engine";
import type { OperationalAssetRecord } from "../../engine/twinData";
import { LUNA_OPERATIONAL_ASSETS } from "./lunaOperationalAssets";
import { RISER_REFS } from "./lunaMepBackbone";
import { SYSTEM_COLOR } from "./systemPresentation";
import { LUNA_LEVELS } from "../lunaProgramme";

// Same unit-offset table and exploded-view offset logic as
// OperationalRelationshipLines.tsx — kept as a separate small copy rather
// than a shared import so this file has no dependency beyond
// LUNA_OPERATIONAL_ASSETS/LUNA_LEVELS, matching that component's own
// self-contained shape.
const UNIT_OFFSET: Record<string, { x: number; z: number }> = {
  "LUNA-L06-APT-A": { x: -1 * (36 / 4.4), z: -1 * (28 / 4.4) },
};

const RISER_REF_SET = new Set<string>(RISER_REFS);

function explodedOffsetFor(a: OperationalAssetRecord, exploded: boolean, explodeGap: number): number {
  if (!exploded || RISER_REF_SET.has(a.ref)) return 0;
  const stackIndex = LUNA_LEVELS.findIndex((l) => l.ref === a.ownerLevelRef);
  return stackIndex < 0 ? 0 : stackIndex * explodeGap;
}

function worldPositionOf(a: OperationalAssetRecord, exploded: boolean, explodeGap: number): [number, number, number] {
  const level = LUNA_LEVELS.find((l) => l.ref === a.ownerLevelRef);
  const baseElevation = level?.baseElevation ?? 0;
  const offset = a.unitRef ? UNIT_OFFSET[a.unitRef] ?? { x: 0, z: 0 } : { x: 0, z: 0 };
  return [offset.x + a.position.x, baseElevation + a.position.y + explodedOffsetFor(a, exploded, explodeGap), offset.z + a.position.z];
}

/** Renders Oyi's spatial reveal for a service route — the sequence of
 * bright, pulsing segments connecting the ordered refs the intelligence
 * layer resolved (see handleShowRoute in engine/twinIntelligence.ts).
 * Mounted once at the building root, same as OperationalRelationshipLines;
 * it stays empty and costs nothing until Oyi actually reveals a route. */
export function RouteHighlightLines() {
  const { highlightedRefs } = useRouteHighlight();
  const { exploded, explodeGap } = useSceneMode();

  const segments = useMemo(() => {
    if (highlightedRefs.length < 2) return [];
    const byRef = new Map(LUNA_OPERATIONAL_ASSETS.map((a) => [a.ref, a]));
    const result: Array<{ from: [number, number, number]; to: [number, number, number]; color: string }> = [];
    for (let i = 0; i < highlightedRefs.length - 1; i++) {
      const a = byRef.get(highlightedRefs[i]);
      const b = byRef.get(highlightedRefs[i + 1]);
      if (!a || !b) continue;
      result.push({ from: worldPositionOf(a, exploded, explodeGap), to: worldPositionOf(b, exploded, explodeGap), color: SYSTEM_COLOR[b.system] });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedRefs, exploded, explodeGap]);

  return (
    <>
      {segments.map((s, i) => (
        <RouteHighlightLine key={`route-${i}-${s.from.join(",")}-${s.to.join(",")}`} from={s.from} to={s.to} color={s.color} />
      ))}
    </>
  );
}
