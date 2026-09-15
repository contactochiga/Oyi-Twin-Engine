import type { CommandName } from "../../engine/twinRuntime";
import { LIFT_STOPS, liftStop, nearestLiftFloor } from "./lunaLift";

export interface LiftState extends Record<string, unknown> {
  schemaVersion: "luna.elevator/2";
  positionY: number;
  positionY_m: number;
  currentFloor: string | null;
  currentFloorRef: string | null;
  passingFloorRef: string;
  lastServedFloorRef: string;
  targetFloor: string | null;
  targetFloorRef: string | null;
  direction: "up" | "down" | "idle";
  speed: number;
  speed_mps: number;
  motionState: "IDLE" | "MOVING_UP" | "MOVING_DOWN" | "ARRIVING";
  doorState: "OPEN" | "OPENING" | "CLOSED" | "CLOSING";
  doorProgress: number;
  serviceState: string;
  faultState: string | null;
  floor: string;
  door: string;
  fault: boolean;
  sequence: number;
  requestIds: string[];
}
export const LIFT_SIMULATION_COMMANDS: CommandName[] = ["callLift", "setPosition", "open", "close"];
export function initialLiftState(): LiftState {
  return project({ schemaVersion: "luna.elevator/2", positionY: 0, positionY_m: 0,
    currentFloor: "LUNA-GROUND", currentFloorRef: "LUNA-GROUND", passingFloorRef: "LUNA-GROUND", lastServedFloorRef: "LUNA-GROUND",
    targetFloor: null, targetFloorRef: null, direction: "idle", speed: 0, speed_mps: 0, motionState: "IDLE", doorState: "CLOSED", doorProgress: 0,
    serviceState: "normal", faultState: null, floor: "LUNA-GROUND", door: "closed", fault: false, sequence: 0, requestIds: [] });
}
function project(s: LiftState): LiftState {
  const door = { state: s.doorState.toLowerCase(), progress: s.doorProgress, locked: s.doorState === "CLOSED" };
  return { ...s, positionY_m: s.positionY, positionQuality: "simulated", currentFloorRef: s.currentFloor, targetFloorRef: s.targetFloor,
    speed_mps: s.speed, floor: s.lastServedFloorRef, door: door.state, fault: Boolean(s.faultState), carDoor: door,
    landingDoors: Object.fromEntries(LIFT_STOPS.map(stop => [stop.ref, stop.ref === s.currentFloor ? door : { state: "closed", progress: 0, locked: true }])),
    allowedStopRefs: LIFT_STOPS.map(stop => stop.ref), passingFloorRef: nearestLiftFloor(s.positionY), quality: "simulated", sequence: s.sequence + 1 };
}
/** Pure provider transition. No meshes, UI clocks, or destination-first arrival. */
export function requestLift(s: LiftState, command: CommandName, args: Record<string, unknown> = {}) {
  const reject = (message: string) => ({ ok: false, message, state: s });
  const id = typeof args.requestId === "string" ? args.requestId : undefined;
  if (id && s.requestIds.includes(id)) return { ok: true, message: "Request already accepted; not repeated.", state: s };
  if (s.faultState || s.serviceState !== "normal") return reject("Lift is unavailable.");
  if (s.motionState !== "IDLE" || s.targetFloor) return reject("Journey in progress; wait for arrival. No in-flight override.");
  let next = { ...s };
  if (command === "setPosition" || command === "callLift") {
    const stop = liftStop(command === "callLift" ? args.originFloorRef ?? args.floor : args.floor);
    if (!stop) return reject("Unknown or unserved stop. PH and Roof are not admitted.");
    if (stop.ref === s.currentFloor) next.doorState = "OPENING";
    else { next.targetFloor = stop.ref; next.doorState = "CLOSING"; }
    next.activeRequest = { id: id ?? `local-${s.sequence}`, kind: command, destination: stop.ref, status: "accepted" };
  } else if (command === "open" || command === "close") {
    if (!s.currentFloor || s.speed !== 0) return reject("Door action requires a stopped, aligned car.");
    next.doorState = command === "open" ? "OPENING" : "CLOSING";
  } else return reject("Unsupported lift command.");
  if (id) next.requestIds = [...s.requestIds.slice(-99), id];
  next = project(next);
  return { ok: true, message: "Simulation request accepted.", state: next };
}
/** Fixed 20ms integration in provider; callers can run the same steps in tests. */
export function advanceLift(s: LiftState, dt: number): LiftState {
  if (s.faultState || s.serviceState !== "normal") return s.speed === 0 ? s : project({ ...s, speed: 0, direction: "idle", motionState: "IDLE" });
  const n = { ...s };
  if (s.doorState === "OPENING" || s.doorState === "CLOSING") {
    n.doorProgress = Math.max(0, Math.min(1, s.doorProgress + (s.doorState === "OPENING" ? 1 : -1) * dt / 1.2));
    if (n.doorProgress >= 1) n.doorState = "OPEN";
    if (n.doorProgress <= 0) n.doorState = "CLOSED";
    return project(n);
  }
  const stop = liftStop(s.targetFloor);
  if (!stop || s.doorState !== "CLOSED") return s;
  const distance = stop.y - s.positionY;
  const sign = Math.sign(distance);
  const speed = Math.min(2.5, s.speed + dt, Math.sqrt(2 * Math.abs(distance)));
  const step = (s.speed + speed) / 2 * dt;
  if (Math.abs(distance) <= Math.max(step, 0.002)) {
    n.positionY = stop.y; n.currentFloor = stop.ref; n.lastServedFloorRef = stop.ref; n.targetFloor = null;
    n.speed = 0; n.direction = "idle"; n.motionState = "IDLE"; n.doorState = "OPENING";
    n.activeRequest = { ...(s.activeRequest as object), status: "arrived" };
  } else {
    n.positionY += sign * step; n.currentFloor = null; n.speed = speed; n.direction = sign > 0 ? "up" : "down";
    n.motionState = speed < s.speed ? "ARRIVING" : sign > 0 ? "MOVING_UP" : "MOVING_DOWN";
  }
  return project(n);
}
