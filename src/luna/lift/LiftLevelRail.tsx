import { LevelRail, type LevelRailProps } from "../../engine/components/spatial/LevelRail";
import { useRuntimeAssetState } from "../../engine/twinRuntime";
import { liftDefinition, liftStop } from "./lunaLift";
import type { LiftState } from "./liftSimulation";
/** Only this small rail subscribes at motion frequency; no new floor state.
 * Tracks exactly one lift at a time — whichever `liftRef` the host is
 * currently following. Switching which lift is followed is just the host
 * passing a different ref in on the next render; this component holds no
 * ownership state of its own to transfer. */
export function LiftLevelRail({ tracking, liftRef, ...props }: LevelRailProps & { tracking: boolean; liftRef?: string | null }) {
  const runtime = useRuntimeAssetState(liftRef ?? "");
  const s = runtime?.state as LiftState | undefined;
  const def = liftRef ? liftDefinition(liftRef) : undefined;
  return <div data-level-rail-mode={tracking && s ? "elevator" : "static"} data-tracking-lift-ref={tracking ? liftRef ?? "" : ""}>
    {tracking && s && def && <div className="lift-rail-status">{def.shortLabel} · {s.direction}<br />{s.currentFloor ? "At" : "Passing"} {liftStop(s.currentFloor ?? s.passingFloorRef)?.label}<br />→ {liftStop(s.targetFloor)?.label ?? "Arrived"}</div>}
    <LevelRail {...props} activeLevelRef={tracking && s ? s.currentFloor ?? s.passingFloorRef : props.activeLevelRef} />
  </div>;
}
