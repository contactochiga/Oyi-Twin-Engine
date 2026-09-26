import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

/** A building-agnostic "camera view of one space" contract (Phase 12) —
 * distinct from CameraFlightTarget only in field naming (preferredFov /
 * minimumDistance read better in authored per-room data than the flight
 * mechanism's own fov/minDistance), so a building's own room-preset table
 * doesn't need to know CameraRig's internal field names. */
export interface RoomCameraPreset {
  position: [number, number, number];
  target: [number, number, number];
  preferredFov?: number;
  minimumDistance?: number;
}

export interface CameraFlightTarget {
  position: [number, number, number];
  target: [number, number, number];
  /** Optional per-shot field of view (degrees) — a tight interior room
   * often reads better on a slightly wider lens than the building's own
   * hero FOV. Omit to keep whatever FOV is already set (Phase 12). */
  fov?: number;
  /** Optional per-shot OrbitControls minimum zoom distance — a small room
   * needs a much tighter minDistance than the building-scale default
   * (6m), or the user's very first zoom-in click pulls the camera back
   * out through a wall. Omit to keep the current minDistance (Phase 12). */
  minDistance?: number;
  /** Optional look limit for walking shots; building overview keeps its default. */
  maxPolarAngle?: number;
}

interface CameraRigProps {
  /** When set, the camera smoothly flies to this position/target. Consumer
   * code (e.g. a "Ground Arrival" button) sets this via state; the rig
   * owns the animation so callers never touch three.js internals. */
  flightTarget: CameraFlightTarget | null;
  /** Sample an operational target; this rig remains the sole camera owner. */
  followTarget?: () => CameraFlightTarget | null;
  /** Spatial Transition Engine V1 Part 6 — fires once a FIXED
   * flightTarget (never a followTarget) actually settles, with the exact
   * target that was reached. Additive and optional: existing callers that
   * never fire-and-forget-check settlement are unaffected. A multi-
   * waypoint traversal (cameraTraversal.ts) uses this as its real
   * "arrived at this waypoint, advance to the next" signal instead of a
   * fixed timer. */
  onArrive?: (target: CameraFlightTarget) => void;
  manualLook?: boolean;
}

const DEFAULT_TARGET: [number, number, number] = [0, 26, 0];

/** Drives the camera directly toward a preset every frame. Deliberately a
 * separate, always-mounted component rather than logic inside OrbitControls
 * itself: OrbitControls recomputes camera.position from its own internal
 * spherical (radius/theta/phi) state on every `.update()` call, including
 * an automatic one it runs each frame while mounted via `makeDefault` —
 * that recompute fights a second, independent piece of code also trying to
 * drive camera.position, producing exactly the "camera jammed into the
 * facade" glitch this fix resolves. So OrbitControls is unmounted entirely
 * for the duration of a flight (see CameraRig below) and this component is
 * the only thing touching the camera while that's true. */
function CameraFlight({ flightTarget: fixedTarget, followTarget, onSettle }: { flightTarget: CameraFlightTarget | null; followTarget?: () => CameraFlightTarget | null; onSettle: (finalTarget: [number, number, number]) => void }) {
  // Lazily initialized from the FIRST flightTarget this component ever
  // sees, not a hardcoded default — this component only ever mounts when a
  // flight is already in progress, so starting the look-at anywhere other
  // than that flight's own target produces a spurious swoop (e.g. from a
  // hardcoded y=26 down to an interior's y=1.7) on top of the real,
  // intended camera movement. Confirmed the hard way during Phase 3
  // verification: an interior "enter" shot looked instead toward empty
  // space for the first second because of exactly this.
  const lookAt = useRef<THREE.Vector3 | null>(null);
  if (!lookAt.current) {
    lookAt.current = new THREE.Vector3(...(fixedTarget?.target ?? DEFAULT_TARGET));
  }

  useFrame(({ camera }) => {
    const flightTarget = followTarget ? followTarget() : fixedTarget;
    if (!flightTarget || !lookAt.current) return;
    const current = lookAt.current;
    const targetPos = new THREE.Vector3(...flightTarget.position);
    const targetLookAt = new THREE.Vector3(...flightTarget.target);

    camera.position.lerp(targetPos, 0.11);
    current.lerp(targetLookAt, 0.11);
    camera.lookAt(current);

    const persp = camera as THREE.PerspectiveCamera;
    if (flightTarget.fov !== undefined && "fov" in persp) {
      persp.fov += (flightTarget.fov - persp.fov) * 0.11;
      persp.updateProjectionMatrix();
    }

    const closeEnough = camera.position.distanceTo(targetPos) < 0.05 && current.distanceTo(targetLookAt) < 0.05;
    const fovSettled = flightTarget.fov === undefined || Math.abs(persp.fov - flightTarget.fov) < 0.05;
    if (closeEnough && fovSettled) {
      camera.position.copy(targetPos);
      current.copy(targetLookAt);
      camera.lookAt(current);
      if (flightTarget.fov !== undefined && "fov" in persp) {
        persp.fov = flightTarget.fov;
        persp.updateProjectionMatrix();
      }
      if (!followTarget) onSettle([current.x, current.y, current.z]);
    }
  });

  return null;
}

/** Thin wrapper around drei's OrbitControls that adds one capability on
 * top: fly smoothly to a named camera preset. Generic — Luna's actual
 * preset coordinates live in src/luna, not here. */
export const CameraRig = forwardRef<OrbitControlsImpl, CameraRigProps>(function CameraRig({ flightTarget, followTarget, onArrive, manualLook = false }, ref) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  useImperativeHandle(ref, () => controlsRef.current as OrbitControlsImpl);

  const [flying, setFlying] = useState(flightTarget !== null);
  const [settledTarget, setSettledTarget] = useState<[number, number, number]>(DEFAULT_TARGET);
  const [minDistance, setMinDistance] = useState(6);
  const [maxPolarAngle, setMaxPolarAngle] = useState(Math.PI * 0.495);
  const lastFlightTarget = useRef(flightTarget);

  // A *new* flightTarget (a different preset clicked) restarts the flight
  // even if we'd already settled from a previous one.
  if (flightTarget !== lastFlightTarget.current) {
    lastFlightTarget.current = flightTarget;
    if (flightTarget !== null && !flying) setFlying(true);
    if (flightTarget === null && flying) setFlying(false);
  }

  // Stable array reference so OrbitControls' reactive `target` prop only
  // re-applies when we intend it to (on settle), never on an unrelated
  // re-render — the same class of bug fixed in LevelMassing during Phase 1.
  const targetProp = useMemo(() => settledTarget, [settledTarget]);

  return (
    <>
      {(flying || followTarget) && (
        <CameraFlight
          flightTarget={flightTarget}
          followTarget={followTarget}
          onSettle={(finalTarget) => {
            setSettledTarget(finalTarget);
            setMinDistance(flightTarget?.minDistance ?? 6);
            setMaxPolarAngle(flightTarget?.maxPolarAngle ?? Math.PI * 0.495);
            setFlying(false);
            if (onArrive && flightTarget) onArrive(flightTarget);
          }}
        />
      )}
      {!flying && !followTarget && (
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={minDistance}
          // Phase 15B — raised from 220 so the new geospatial context
          // presets (victoriaIslandContext sits ~490 units out) don't get
          // yanked back inward the instant OrbitControls remounts and
          // clamps distance on its very first update() call, and so a
          // user can manually zoom out into Ring 2/3 from any position.
          maxDistance={900}
          maxPolarAngle={maxPolarAngle}
          enabled={!manualLook}
          enableRotate={!manualLook}
          enablePan={!manualLook}
          enableZoom={!manualLook}
          target={targetProp}
        />
      )}
    </>
  );
});
