import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Oyi Twin Engine — bridges a world-space AABB to its current on-screen
// (CSS pixel) bounding rect (Phase 16A correction §3). Ordinary DOM UI has
// no access to the Three.js camera, so it can't otherwise know whether a
// floating card actually overlaps the geometry the camera is currently
// framing — this is what lets "smart card relocation" be a real collision
// test against the selected subject instead of a guess from static layout
// constants.

export interface WorldAABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface ScreenRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface SelectionFrameProbeProps {
  box: WorldAABB | null;
  onRectChange: (rect: ScreenRect | null) => void;
}

// Only report a new rect once it's moved more than this many CSS pixels —
// once CameraRig settles (see CameraRig.tsx's own settle threshold) the
// projected rect stops changing entirely, so this makes the probe a
// no-op most of the time rather than a 60fps state-churn source.
const EPSILON_PX = 2;

export function SelectionFrameProbe({ box, onRectChange }: SelectionFrameProbeProps) {
  const { camera, size } = useThree();
  const lastRect = useRef<ScreenRect | null>(null);

  useFrame(() => {
    if (!box) {
      if (lastRect.current !== null) {
        lastRect.current = null;
        onRectChange(null);
      }
      return;
    }

    const corners: Array<[number, number, number]> = [
      [box.minX, box.minY, box.minZ],
      [box.maxX, box.minY, box.minZ],
      [box.minX, box.maxY, box.minZ],
      [box.maxX, box.maxY, box.minZ],
      [box.minX, box.minY, box.maxZ],
      [box.maxX, box.minY, box.maxZ],
      [box.minX, box.maxY, box.maxZ],
      [box.maxX, box.maxY, box.maxZ],
    ];

    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    const v = new THREE.Vector3();
    for (const [x, y, z] of corners) {
      v.set(x, y, z).project(camera);
      const px = ((v.x + 1) / 2) * size.width;
      const py = ((1 - v.y) / 2) * size.height;
      left = Math.min(left, px);
      right = Math.max(right, px);
      top = Math.min(top, py);
      bottom = Math.max(bottom, py);
    }

    const next: ScreenRect = { left, top, right, bottom };
    const prev = lastRect.current;
    const changed =
      !prev ||
      Math.abs(prev.left - next.left) > EPSILON_PX ||
      Math.abs(prev.top - next.top) > EPSILON_PX ||
      Math.abs(prev.right - next.right) > EPSILON_PX ||
      Math.abs(prev.bottom - next.bottom) > EPSILON_PX;

    if (changed) {
      lastRect.current = next;
      onRectChange(next);
    }
  });

  return null;
}
