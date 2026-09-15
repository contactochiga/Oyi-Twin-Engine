// Apartment A Full Interior Reality V1 (Part 27) — reads the REAL live
// camera world position every frame and reports it to the host, epsilon-
// filtered so the host only re-renders when the position has genuinely
// moved (never a fixed-interval poll, never a fabricated increment). This
// is the one place camera position becomes available to non-R3F code
// (App.tsx's own map/live-position-dot logic) — building-agnostic, no
// Luna-specific coordinate transform lives here.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const MIN_DELTA_METERS = 0.05;

export function LiveWorldPositionReporter({ controlsRef, onPosition }: { controlsRef: React.RefObject<OrbitControlsImpl | null>; onPosition: (p: { x: number; y: number; z: number }) => void }) {
  const last = useRef<{ x: number; y: number; z: number } | null>(null);

  useFrame(() => {
    const object = controlsRef.current?.object;
    if (!object) return;
    const { x, y, z } = object.position;
    const prev = last.current;
    if (prev && Math.abs(prev.x - x) < MIN_DELTA_METERS && Math.abs(prev.y - y) < MIN_DELTA_METERS && Math.abs(prev.z - z) < MIN_DELTA_METERS) return;
    last.current = { x, y, z };
    onPosition({ x, y, z });
  });

  return null;
}
