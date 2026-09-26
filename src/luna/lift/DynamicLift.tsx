import { SystemRelationshipLine } from "../../engine/components/SystemRelationshipLine";
import { LUNA_OPERATIONAL_ASSETS } from "../operational/lunaOperationalAssets";
import { LUNA_LEVELS } from "../lunaProgramme";
import { SYSTEM_COLOR } from "../operational/systemPresentation";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSelection } from "../../engine/hooks/useSelection";
import { useSceneMode } from "../../engine/hooks/useSceneMode";
import { useRepresentation } from "../../engine/hooks/useRepresentation";
import { useTwinRuntime } from "../../engine/twinRuntime";
import { sectionClipPlanes } from "../../engine/utils/sectionClip";
import { LIFT_STOPS, LIFT_REFERENCE_INTERFACES, coreFor, type LiftDefinition } from "./lunaLift";
import type { LiftState } from "./liftSimulation";

type V3 = [number, number, number];
function Part({ liftRef, role, position, size, color = "#a9b2bb", opacity = 1, clipped = false }: { liftRef: string; role: string; position: V3; size: V3; color?: string; opacity?: number; clipped?: boolean }) {
  const { sectionMode, sectionSide } = useSceneMode();
  const groundDoorFinish = role === "LUNA-GROUND-door-left" || role === "LUNA-GROUND-door-right" || role === "LUNA-L01-AMENITIES-door-left" || role === "LUNA-L01-AMENITIES-door-right";
  return <mesh name={`${liftRef}::${role}`} userData={{ canonicalRef: liftRef, componentRole: role }} position={position} castShadow={opacity === 1} receiveShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial color={groundDoorFinish ? "#57483b" : color} roughness={groundDoorFinish ? 0.32 : 0.45} metalness={groundDoorFinish ? 0.7 : 0.25} transparent={opacity < 1} opacity={opacity} depthWrite={opacity === 1} clippingPlanes={sectionClipPlanes(clipped && sectionMode, sectionSide)} />
  </mesh>;
}
function Doors({ liftRef, floorRef, y = 0, z, car = false }: { liftRef: string; floorRef?: string; y?: number; z: number; car?: boolean }) {
  const left = useRef<THREE.Group>(null), right = useRef<THREE.Group>(null);
  const runtime = useTwinRuntime();
  useFrame(() => {
    const state = runtime.getState(liftRef)?.state as LiftState | undefined;
    const progress = state && (car || state.currentFloor === floorRef) ? state.doorProgress : 0;
    if (left.current) left.current.position.x = -0.3 - progress * 0.6;
    if (right.current) right.current.position.x = 0.3 + progress * 0.6;
  });
  return <group position={[0, y, z]} name={`${liftRef}::${car ? "car-doors" : `landing-${floorRef}`}`}>
    <group ref={left}><Part liftRef={liftRef} role={`${car ? "car" : floorRef}-door-left`} position={[0, 1.1, 0]} size={[0.59, 2.2, 0.07]} color="#657581" /></group>
    <group ref={right}><Part liftRef={liftRef} role={`${car ? "car" : floorRef}-door-right`} position={[0, 1.1, 0]} size={[0.59, 2.2, 0.07]} color="#657581" /></group>
  </group>;
}
/** One asset, one car, fixed building frame. Geometry never confirms
 * arrival. Four-lift generalization: the shape is identical for every
 * lift — only `def` (canonical ref, shaft X/Z) and the runtime state it
 * reads differ, so this is one reusable component instanced per lift
 * rather than four copies. Selecting one lift only ever affects that
 * instance's own `onClick`/select() call — independence is structural,
 * not an extra highlight mechanism. */
export function DynamicLift({ def, inspection = false }: { def: LiftDefinition; inspection?: boolean }) {
  const liftRef = def.ref;
  const car = useRef<THREE.Group>(null);
  const runtime = useTwinRuntime();
  const { select } = useSelection();
  const { identity, policy } = useRepresentation();
  const { activeSystem, isolatedLevelRef } = useSceneMode();
  const mode = policy.resolveMode({ ref: liftRef, identity });
  const engineering = mode === "FULL_3D" && (activeSystem === "vertical-transport" || activeSystem === "all" || activeSystem === "structure");
  const visible = (mode === "FULL_3D" || mode === "CONTEXT_3D") && (!activeSystem || engineering) && (!isolatedLevelRef || Boolean(LIFT_STOPS.find(s => s.ref === isolatedLevelRef)));
  useFrame(() => {
    const state = runtime.getState(liftRef)?.state;
    const y = state?.positionY;
    if (car.current) {
      car.current.visible = typeof y === "number" && Number.isFinite(y);
      if (typeof y === "number") car.current.position.y = y;
    }
  });
  const x = def.x;
  const bottom = LIFT_STOPS[0].y - 1.4;
  const top = coreFor(liftRef).topElevation;
  const height = top - bottom;
  const wallOpacity = inspection || engineering ? 0.12 : 0.9;
  const carHalf = def.width / 2 - 0.45;
  return <group name={liftRef} userData={{ canonicalRef: liftRef }} position={[x, 0, 0]} visible={visible} onClick={e => { if (!visible) return; e.stopPropagation(); select({ ref: liftRef, kind: "device", label: def.label }); }}>
    <Part liftRef={liftRef} role="shaft-back" position={[0, bottom + height / 2, -1.425]} size={[def.width, height, 0.15]} opacity={wallOpacity} clipped />
    {[-1, 1].map(side => <Part key={side} liftRef={liftRef} role={`shaft-side-${side}`} position={[side * (def.width / 2 - 0.075), bottom + height / 2, 0]} size={[0.15, height, def.depth - 0.3]} opacity={wallOpacity} clipped />)}
    <Part liftRef={liftRef} role="pit" position={[0, bottom - 0.15, 0]} size={[def.width, 0.3, def.depth]} color="#63717c" />
    {LIFT_STOPS.map(stop => <group key={stop.ref} visible={!isolatedLevelRef || isolatedLevelRef === stop.ref}>
      <Doors liftRef={liftRef} floorRef={stop.ref} y={stop.y} z={1.43} />
      <Part liftRef={liftRef} role={`threshold-${stop.ref}`} position={[0, stop.y - 0.05, 1.5]} size={[1.3, 0.1, 0.6]} color="#dabf8b" />
      {[-1, 1].map(side => <Part key={side} liftRef={liftRef} role={`jamb-${stop.ref}-${side}`} position={[side * 0.95, stop.y + 1.15, 1.425]} size={[0.7, 2.3, 0.15]} opacity={wallOpacity} clipped />)}
      <Part liftRef={liftRef} role={`lintel-${stop.ref}`} position={[0, stop.y + 2.45, 1.425]} size={[def.width, 0.3, 0.15]} opacity={wallOpacity} clipped />
      <group name={`${liftRef}::anchor-${stop.ref}`} position={[0, stop.y, 1.5]} userData={{ floorRef: stop.ref, alignmentY: stop.y, lobbyRef: stop.ref === "LUNA-GROUND" ? "LUNA-GROUND-LOBBY-LIFTS" : null }} />
    </group>)}
    {engineering && <group name={`${liftRef}::engineering`}>
      {[-1.18, 1.18].map(gx => <Part key={gx} liftRef={liftRef} role={`guide-${gx}`} position={[gx, bottom + height / 2, -0.7]} size={[0.09, height, 0.12]} color="#eab965" />)}
      <Part liftRef={liftRef} role="traction-reference" position={[0, top - 0.7, -0.6]} size={[1.4, 0.65, 0.8]} color="#7794a5" />
      <Part liftRef={liftRef} role="controller-reference" position={[1, top - 1, 0.5]} size={[0.4, 1, 0.65]} color="#599bb3" />
      <Part liftRef={liftRef} role="pit-buffer" position={[0, bottom + 0.3, 0]} size={[0.5, 0.6, 0.5]} color="#d6a953" />
    </group>}
    {activeSystem === "all" && mode === "FULL_3D" && <group name={`${liftRef}::reference-interfaces`} userData={{ authority: "reference-design-not-commissioned" }}>
      {LIFT_REFERENCE_INTERFACES.map(connection => {
        const asset = LUNA_OPERATIONAL_ASSETS.find(a => a.ref === connection.ref);
        if (!asset || policy.resolveMode({ ref: asset.ref, identity }) !== "FULL_3D") return null;
        const index = LUNA_LEVELS.findIndex(l => l.ref === asset.ownerLevelRef);
        const y = (LUNA_LEVELS[index]?.baseElevation ?? 0) + asset.position.y;
        return <SystemRelationshipLine key={connection.ref} from={[1.2, 0.8, 0]} to={[asset.position.x - x, y, asset.position.z]} system={connection.system} color={SYSTEM_COLOR[connection.system]} />;
      })}
    </group>}
    <group ref={car} name={`${liftRef}::car`} userData={{ canonicalRef: liftRef, componentRole: "car" }}>
      <Part liftRef={liftRef} role="car-floor" position={[0, -0.08, 0]} size={[carHalf * 2, 0.16, carHalf * 2]} color="#e6cf9c" />
      <Part liftRef={liftRef} role="car-back" position={[0, 1.25, -1]} size={[carHalf * 2, 2.5, 0.1]} color="#baaa8e" />
      {[-1, 1].map(cx => <Part key={cx} liftRef={liftRef} role={`car-wall-${cx}`} position={[cx * carHalf, 1.25, 0]} size={[0.1, 2.5, 2]} color="#bdb6a8" />)}
      <Part liftRef={liftRef} role="car-roof" position={[0, 2.55, 0]} size={[carHalf * 2, 0.1, carHalf * 2]} color="#ebdfbd" />
      <Part liftRef={liftRef} role="car-header" position={[0, 2.35, 1]} size={[carHalf * 2, 0.3, 0.1]} color="#e7bc62" />
      {[-1, 1].map(cx => <Part key={cx} liftRef={liftRef} role={`car-front-${cx}`} position={[cx * 0.84, 1.1, 1]} size={[0.42, 2.2, 0.1]} />)}
      <Doors liftRef={liftRef} car z={1.02} />
      <pointLight position={[0, 2.25, 0]} intensity={5} distance={4} color="#fff0cf" />
    </group>
  </group>;
}
