import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { CanonicalRef } from "../types";
import type { ExploreMovementIntent } from "../spatial/exploreInput";
import { hasExploreMovement } from "../spatial/exploreInput";

export interface ExploreTarget {
  ref: CanonicalRef;
  distance: number;
}

export interface ExploreBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface ExploreCameraDriverProps {
  active: boolean;
  movement: ExploreMovementIntent;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  bounds: ExploreBounds | null;
  allowStep?: (from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }) => boolean;
  onTargetChange: (target: ExploreTarget | null) => void;
  onMoveSample: (position: { x: number; y: number; z: number }) => void;
}

const WALK_SPEED_METERS_PER_SECOND = 2.15;
const WALK_ACCELERATION = 9.5;
const WALK_DAMPING = 14;
const STOP_EPSILON = 0.015;
const TARGET_INTERVAL_SECONDS = 0.12;
const TARGET_MAX_DISTANCE = 4.5;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

function canonicalRefFor(object: THREE.Object3D | null): CanonicalRef | null {
  let current: THREE.Object3D | null = object;
  while (current) {
    const ref = current.userData?.canonicalRef;
    if (typeof ref === "string") return ref;
    current = current.parent;
  }
  return null;
}

function planarForward(camera: THREE.Camera): THREE.Vector3 {
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() < 0.0001) forward.set(0, 0, -1);
  return forward.normalize();
}

function dampToward(current: THREE.Vector3, target: THREE.Vector3, rate: number, delta: number): THREE.Vector3 {
  const factor = 1 - Math.exp(-rate * delta);
  return current.lerp(target, factor);
}

export function ExploreCameraDriver({ active, movement, controlsRef, bounds, allowStep, onTargetChange, onMoveSample }: ExploreCameraDriverProps) {
  const { camera, scene, size, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const elapsedSinceTarget = useRef(0);
  const lastTargetRef = useRef<CanonicalRef | null>(null);
  const lastMoveSample = useRef<{ x: number; y: number; z: number } | null>(null);
  const velocity = useRef(new THREE.Vector3());
  const walkPlaneY = useRef<number | null>(null);
  const lookDrag = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const lookTarget = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (!active) {
      lastTargetRef.current = null;
      velocity.current.set(0, 0, 0);
      walkPlaneY.current = null;
      lookTarget.current = null;
      document.documentElement.removeAttribute("data-oyi-explore-position");
      document.documentElement.removeAttribute("data-oyi-explore-target");
      onTargetChange(null);
    }
  }, [active, onTargetChange]);

  useEffect(() => {
    if (!active) return;
    const element = gl.domElement;
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || event.target !== element) return;
      lookDrag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      element.setPointerCapture?.(event.pointerId);
    };
    const endLook = (event: PointerEvent) => {
      if (lookDrag.current?.pointerId !== event.pointerId) return;
      lookDrag.current = null;
      if (element.hasPointerCapture?.(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      const drag = lookDrag.current;
      const controls = controlsRef.current;
      if (!drag || drag.pointerId !== event.pointerId || !controls) return;
      event.preventDefault();
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      drag.x = event.clientX;
      drag.y = event.clientY;

      if (!lookTarget.current) lookTarget.current = controls.target.clone();
      const offset = lookTarget.current.clone().sub(camera.position);
      const radius = Math.max(1, offset.length());
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.theta -= dx * 0.004;
      spherical.phi = THREE.MathUtils.clamp(spherical.phi - dy * 0.004, 0.18, Math.PI - 0.18);
      const nextOffset = new THREE.Vector3().setFromSpherical(spherical).setLength(radius);
      lookTarget.current.copy(camera.position).add(nextOffset);
      controls.target.copy(lookTarget.current);
      document.documentElement.setAttribute("data-oyi-explore-target", `${lookTarget.current.x.toFixed(3)},${lookTarget.current.y.toFixed(3)},${lookTarget.current.z.toFixed(3)}`);
      camera.lookAt(lookTarget.current);
    };
    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", endLook);
    element.addEventListener("pointercancel", endLook);
    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", endLook);
      element.removeEventListener("pointercancel", endLook);
      lookDrag.current = null;
    };
  }, [active, camera, controlsRef, gl.domElement]);

  useFrame((_, delta) => {
    if (!active) return;
    const controls = controlsRef.current;
    if (!controls) return;
    if (!lookTarget.current) lookTarget.current = controls.target.clone();
    const target = lookTarget.current;

    if (walkPlaneY.current === null) walkPlaneY.current = camera.position.y;
    const lockedY = walkPlaneY.current;

    const forward = planarForward(camera);
    const right = new THREE.Vector3().crossVectors(forward, WORLD_UP).normalize();
    const desired = new THREE.Vector3();
    if (movement.forward) desired.add(forward);
    if (movement.backward) desired.sub(forward);
    if (movement.right) desired.add(right);
    if (movement.left) desired.sub(right);
    if (desired.lengthSq() > 0.0001) desired.normalize().multiplyScalar(WALK_SPEED_METERS_PER_SECOND);

    if (hasExploreMovement(movement)) dampToward(velocity.current, desired, WALK_ACCELERATION, delta);
    else dampToward(velocity.current, new THREE.Vector3(0, 0, 0), WALK_DAMPING, delta);
    velocity.current.y = 0;
    if (!hasExploreMovement(movement) && velocity.current.length() < STOP_EPSILON) velocity.current.set(0, 0, 0);

    if (target && velocity.current.lengthSq() > 0) {
      const before = camera.position.clone();
      const deltaMove = velocity.current.clone().multiplyScalar(delta);
      camera.position.add(deltaMove);
      camera.position.y = lockedY;

      if (bounds) {
        const clampedX = THREE.MathUtils.clamp(camera.position.x, bounds.minX, bounds.maxX);
        const clampedZ = THREE.MathUtils.clamp(camera.position.z, bounds.minZ, bounds.maxZ);
        camera.position.x = clampedX;
        camera.position.z = clampedZ;
      }

      if (allowStep && !allowStep(before, camera.position)) {
        camera.position.copy(before);
        velocity.current.set(0, 0, 0);
      }
      const applied = camera.position.clone().sub(before);
      applied.y = 0;
      if (applied.lengthSq() > 0) target.add(applied);
      controls.target.copy(target);
      camera.lookAt(target);
    } else {
      camera.position.y = lockedY;
      controls.target.copy(target);
      camera.lookAt(target);
    }

    document.documentElement.setAttribute("data-oyi-explore-target", `${target.x.toFixed(3)},${target.y.toFixed(3)},${target.z.toFixed(3)}`);
    const sample = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    const last = lastMoveSample.current;
    if (!last || Math.abs(last.x - sample.x) > 0.01 || Math.abs(last.y - sample.y) > 0.01 || Math.abs(last.z - sample.z) > 0.01) {
      lastMoveSample.current = sample;
      document.documentElement.setAttribute("data-oyi-explore-position", `${sample.x.toFixed(3)},${sample.y.toFixed(3)},${sample.z.toFixed(3)}`);
      onMoveSample(sample);
    }

    elapsedSinceTarget.current += delta;
    if (elapsedSinceTarget.current < TARGET_INTERVAL_SECONDS || size.width <= 0 || size.height <= 0) return;
    elapsedSinceTarget.current = 0;

    raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.current.far = TARGET_MAX_DISTANCE;
    const hit = raycaster.current.intersectObjects(scene.children, true).find((entry) => Boolean(canonicalRefFor(entry.object)));
    const ref = hit ? canonicalRefFor(hit.object) : null;
    if (ref !== lastTargetRef.current) {
      lastTargetRef.current = ref;
      onTargetChange(ref && hit ? { ref, distance: hit.distance } : null);
    }
  });

  return null;
}
